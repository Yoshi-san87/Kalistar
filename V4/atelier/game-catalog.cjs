'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createEngine } = require('../site/engine.js');
const ROOT = path.resolve(__dirname, '../..');
const CROP = Object.freeze({ left: 50, top: 50, width: 797, height: 1388 });
const read = async file => JSON.parse((await fs.readFile(path.join(ROOT, file), 'utf8')).replace(/^\uFEFF/, ''));
const safeUrl = value => typeof value === 'string' && /^\/(?!\/)[a-zA-Z0-9_./%?=&-]+$/.test(value) && !value.split('/').includes('..');

function profileCard(profile, base, { id, key, pngUrl, psdUrl, origin }, elements, weapons) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw Error('Profil publie invalide.');
  id = String(id ?? profile.id);
  if (!/^[34]\d{7}$/.test(id) || !safeUrl(pngUrl) || psdUrl != null && !safeUrl(psdUrl)) throw Error('Identifiant ou URL de carte V4 invalide.');
  if (origin === 'published' && !/^4\d{7}$/.test(id)) throw Error('Une publication doit avoir un nouvel identifiant V4 (4xxxxxxx).');
  const p = { ...base, ...profile }, element = elements[p.element];
  const positions = Array.isArray(p.positions) ? [...p.positions] : [];
  const role = positions.includes(p.role) ? p.role : positions[0];
  const characterId = String(p.characterId || key || ('published-' + id));
  for (const field of ['name', 'title', 'job', 'race', 'faction', 'weapon']) {
    if (typeof p[field] !== 'string' || !p[field].trim() || p[field].length > 200 || /[<>\x00-\x1f]/.test(p[field])) throw Error('Champ de carte invalide : ' + field);
  }
  if (!Object.hasOwn(weapons, p.weapon)) throw Error('Arme inconnue : ' + p.weapon);
  if (p.element === 'NONE' && (p.magic?.length || p.barriers?.length)) throw Error('Sans cristal : ni magie ni barriere.');
  const canGuard = p.atk?.includes('guard') || false, canHeal = p.atk?.includes('revive') || false;
  if (canGuard && ![1, 5].includes(role)) throw Error('Garde (guard) reservee aux roles P1/P5 : ' + id + '. Aucune face ne sera supprimee.');
  if (canHeal && role !== 5) throw Error('Reraise (revive) reserve au role P5 : ' + id + '. Aucune face ne sera supprimee.');
  return {
    id, edition: 'V4', referenceKey: key || null, origin,
    slug: 'v4-' + id, characterId, name: p.name, title: p.title, job: p.job,
    race: p.race, faction: p.faction, weapon: p.weapon,
    weapon_index: Object.keys(weapons).indexOf(p.weapon), element: p.element,
    positions, role, sentry: p.sentry ?? true,
    canGuard, canHeal,
    atk: p.atk, defense: p.defense, magic: p.magic, barriers: p.barriers,
    advantage: p.advantage ?? base?.advantage ?? 30, disadvantage: p.disadvantage ?? base?.disadvantage ?? 30,
    color: p.color || element?.color || '93AAA5', hue: p.hue ?? element?.hue ?? 160,
    text: String(p.description ?? p.text ?? ''), description: String(p.description ?? p.text ?? ''),
    pngUrl, psdUrl: psdUrl || null, imageWidth: 897, imageHeight: 1497
  };
}

function makeDeck(engine, preference) {
  const byId = engine.byId, candidates = [...new Set([...preference, ...Object.keys(byId)])].filter(id => byId[id]);
  const selected = [], coverage = [0, 0, 0, 0, 0];
  while (selected.length < 10) {
    const available = candidates.filter(id => !selected.includes(id) && (byId[id].element !== 'RAINBOW' || !selected.some(other => byId[other].element === 'RAINBOW')));
    available.sort((a, b) => {
      const gain = id => byId[id].positions.reduce((n, p) => n + Math.max(0, 2 - coverage[p - 1]), 0);
      return gain(b) - gain(a) || candidates.indexOf(a) - candidates.indexOf(b);
    });
    if (!available.length) throw Error('Catalogue insuffisant pour former un deck.');
    const id = available[0]; selected.push(id);
    for (const p of byId[id].positions) coverage[p - 1]++;
  }
  const errors = engine.validatePlayableDeck(selected);
  if (errors.length) throw Error('Deck V4 invalide : ' + errors.join(' '));
  return selected;
}

// Pure catalogue builder: callers own publication persistence and HTTP media routes.
async function buildCatalog({ published = [] } = {}) {
  if (!Array.isArray(published)) throw Error('La liste des publications est invalide.');
  const references = await read('V4/atelier/data/references.json');
  const legacy = await read('V3/donnees/cartes.json');
  const elements = await read('V3/donnees/elements.json'), weapons = await read('V3/donnees/armes.json');
  const cards = references.cards.map(ref => profileCard(ref.card, legacy.find(c => c.id === ref.card.id), {
    id: ref.card.id, key: ref.key, origin: 'approved', pngUrl: '/media/reference/' + ref.key + '.png'
  }, elements, weapons));
  for (const item of published) {
    if (!item || typeof item !== 'object') throw Error('Publication invalide.');
    const base = references.cards.find(ref => ref.key === item.referenceKey || ref.key === item.key || ref.card.id === item.profile?.id)?.card;
    cards.push(profileCard(item.profile, base, { ...item, origin: 'published' }, elements, weapons));
  }
  const characterIds = new Set(cards.map(c => c.characterId));
  const arenas = (await read('V3/donnees/arenes.json')).map(a => ({
    id: a.id, name: a.name, subtitle: a.subtitle, image: '/jeu/' + a.image,
    element: a.element, elementBonus: a.elementBonus, homeCharacters: a.homeCharacters.filter(id => characterIds.has(id)),
    homeAttack: a.homeAttack, homeDefense: a.homeDefense, source: a.source
  }));
  const data = { version: 4, edition: 'V4', referenceId: references.id, crop: { ...CROP },
    imageSize: { width: 897, height: 1497 }, cards, elements, weapons, arenas,
    rules: await read('V3/donnees/regles.json'), demo: await read('V3/donnees/regles_demo.json') };
  data.demo.version = 'V4';
  const engine = createEngine(data), previous = await read('V3/donnees/decks_demo.json');
  data.decks = { player: makeDeck(engine, previous.player), enemy: makeDeck(engine, previous.enemy),
    presets: previous.presets.map(p => ({ id: p.id, name: p.name + ' - V4', cards: makeDeck(engine, p.cards) })) };
  return JSON.parse(JSON.stringify(data));
}

module.exports = { buildCatalog, CROP };
