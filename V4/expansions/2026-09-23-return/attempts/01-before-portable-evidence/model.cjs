'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const rules = require('../../../V3/donnees/regles_demo.json');
const weapons = require('../../../V3/donnees/armes.json');
const legacy = require('../../../V3/donnees/cartes.json');
const SET = '2026-09-23-return';
const INPUTS = Object.freeze({ 'profiles-a.json': 7, 'profiles-b.json': 8, 'profiles-c.json': 7 });
const PRINTED = ['name', 'title', 'job', 'description', 'element', 'race', 'faction', 'weapon', 'positions', 'atk', 'defense', 'magic', 'barriers'];
const WEAPON_DONORS = Object.freeze({ Katana: 'Dague', Projectile: 'Dague', 'Fl\u00e9au': 'Fouet', 'Ep\u00e9e courte': 'Ep\u00e9e longue' });
const COLLAB = Object.freeze({ NieR: 'NieR', Replicant: 'Replicant' });
const EDITIONS = Object.freeze({ 'zviri-tueuse': 'canonical', 'zviri-chasse': 'variant', julienne: 'canonical',
  'verminia-bureau': 'canonical', 'verminia-portail': 'variant', polux: 'canonical', nazar: 'canonical',
  'capitaine-skully': 'canonical', xiaomi: 'canonical', 'gen-reparation': 'canonical', 'gen-electro': 'variant',
  'lanio-astraball': 'canonical', 'lanio-mines': 'variant', reevus: 'canonical', kognus: 'canonical' });
const idFor = key => '4' + String(crypto.createHash('sha256').update(SET + ':' + key).digest().readUInt32BE(0) % 10000000).padStart(7, '0');

function normalize(card) {
  assert.ok(card && !Array.isArray(card));
  if (card.text !== undefined && card.description !== undefined) assert.equal(card.text, card.description, 'text/description differents.');
  const edition = card.edition ?? (card.legacyId ? EDITIONS[card.key] : undefined);
  const c = { ...card, ...(edition ? { edition } : {}), id: edition === 'canonical' ? card.legacyId : idFor(card.key),
    art: card.art?.replace(/^V4\/expansions\/2026-09-23-return\//, ''), description: card.text ?? card.description };
  delete c.text;
  if (card.id !== undefined) assert.equal(card.id, c.id, 'Laisser assemble.cjs attribuer les IDs.');
  return validateCard(c);
}
function validateCard(c) {
  assert.match(c.key, /^[a-z][a-z0-9-]{0,63}$/);
  assert.equal(c.id, c.edition === 'canonical' ? c.legacyId : idFor(c.key));
  assert.match(c.characterId, /^[a-z0-9][a-z0-9-]{0,79}$/);
  assert.match(c.art, /^art-[abc]\/[a-zA-Z0-9/_-]+\.png$/);
  for (const [field, max] of [['name', 30], ['title', 40], ['job', 22], ['description', 240], ['faction', 40], ['race', 30]]) {
    assert.ok(typeof c[field] === 'string' && c[field].trim() === c[field] && c[field].length > 0 && c[field].length <= max, c.key + '.' + field);
    assert.ok(!/[<>\x00-\x1f\x7f\u2028\u2029]/.test(c[field]), 'Texte invalide.');
  }
  assert.ok(Object.hasOwn(weapons, c.weapon), 'Arme hors matrice : ' + c.weapon);
  assert.ok(Array.isArray(c.positions) && c.positions.length > 0 && c.positions.length <= 5 && new Set(c.positions).size === c.positions.length);
  assert.ok(c.positions.every(n => Number.isInteger(n) && n >= 1 && n <= 5) && c.positions.includes(c.role));
  for (const side of ['atk', 'defense']) {
    assert.equal(c[side]?.length, 6);
    c[side].forEach((v, i) => {
      if (typeof v === 'number') assert.ok(Number.isInteger(v) && v >= 0 && v <= rules.roleBounds[c.role][side][i], c.key + '.' + side + ' D' + (6 - i) + ' hors plafond P' + c.role);
      else assert.ok((side === 'atk' ? ['retry', 'mana', 'guard', 'revive', 'buff_atk', 'death'] : ['retry', 'dodge']).includes(v), 'Effet illegal : ' + v);
    });
  }
  if (c.atk.includes('guard')) assert.ok(rules.guard.allowedRoles.includes(c.role), 'Garde reservee au role P1/P5.');
  if (c.atk.includes('revive')) assert.ok(rules.reraise.allowedRoles.includes(c.role), 'Reraise reserve au role P5.');
  for (const [field, side] of [['magic', 'atk'], ['barriers', 'defense']]) {
    assert.ok(Array.isArray(c[field]) && new Set(c[field]).size === c[field].length);
    assert.ok(c[field].every(d => Number.isInteger(d) && d >= 1 && d <= 6 && typeof c[side][6 - d] === 'number'));
  }
  if (c.element === 'NONE') { assert.deepEqual(c.magic, []); assert.deepEqual(c.barriers, []); }
  if (c.sentry !== undefined) assert.equal(typeof c.sentry, 'boolean');
  if (c.legacyId) {
    assert.ok(['canonical', 'variant'].includes(c.edition), 'Choisir edition canonical ou variant : ' + c.key);
    assert.equal(c.edition, EDITIONS[c.key], 'Edition differente de la decision de publication : ' + c.key);
    const old = legacy.find(p => p.id === c.legacyId); assert.ok(old, 'Legacy ID inconnu.');
    assert.equal(c.characterId, old.characterId, 'Une variante conserve son personnage.');
    assert.equal(c.name, old.name, 'Ne pas convertir silencieusement un autre personnage.');
    if (c.edition === 'canonical') {
      assert.deepEqual(c.positions, [...c.positions].sort(), 'La reference native range les positions de gauche a droite.');
      for (const f of ['element', 'race', 'faction', 'weapon', 'role', 'positions', 'atk', 'defense', 'magic', 'barriers']) assert.deepEqual(c[f], old[f], 'Mecanique canonique V3 modifiee : ' + c.key + '.' + f);
      if (c.sentry !== undefined) assert.equal(c.sentry, old.sentry);
    }
  } else assert.ok(c.edition === undefined || c.edition === 'new', 'Une edition canonique exige legacyId.');
  return c;
}
function validateSet(set) {
  assert.equal(set.id, SET); assert.equal(set.schemaVersion, 1); assert.equal(set.cards.length, 22);
  assert.deepEqual(set.arenas, []); assert.deepEqual(set.presets, []);
  assert.equal(new Set(set.cards.map(c => c.id)).size, set.cards.length);
  assert.equal(new Set(set.cards.map(c => c.key)).size, set.cards.length);
  set.cards.forEach(validateCard);
  assert.equal(set.cards.filter(c => COLLAB[c.faction]).length, 7);
  assert.equal(set.cards.filter(c => !COLLAB[c.faction]).length, 15);
  return set;
}
function donor(spec, D) {
  const fields = Object.fromEntries(D.FIELDS.filter(k => k in spec).map(k => [k, spec[k]]));
  const p = D.validate({ ...fields, faction: COLLAB[spec.faction] ? 'Chroma' : spec.faction, weapon: WEAPON_DONORS[spec.weapon] || spec.weapon }, { final: true });
  p.positions = [...spec.positions]; p.magic = [...spec.magic]; p.barriers = [...spec.barriers];
  return p;
}
function profile(spec, D) {
  const p = { ...D.profileCard(donor(spec, D), spec.id), role: spec.role, characterId: spec.characterId,
    faction: spec.faction, weapon: spec.weapon, weapon_index: Object.keys(weapons).indexOf(spec.weapon),
    sentry: spec.sentry ?? (spec.element !== 'NONE'), source: 'Kalistar V4 - expansion ' + SET,
    visual_revision: 'V4-' + SET, edition: spec.edition || 'new',
    artwork: spec.key, output: 'KALISTAR_V4_' + spec.id,
    ...(spec.legacyId ? { legacyId: spec.legacyId, legacySource: 'V3/donnees/cartes.json', replacesModel: false } : {}),
    ...(COLLAB[spec.faction] ? { collaboration: COLLAB[spec.faction], officialCollaboration: false } : {}) };
  validateProfile(p, spec); return p;
}
function validateProfile(p, spec) {
  for (const f of [...PRINTED, 'role', 'id', 'characterId']) assert.deepEqual(p[f], spec[f], spec.key + '.' + f);
  assert.equal(p.text, spec.description); assert.equal(p.weapon_index, Object.keys(weapons).indexOf(spec.weapon));
  assert.equal(p.canHeal, p.atk.includes('revive')); assert.equal(p.canGuard, p.atk.includes('guard'));
  assert.equal(p.sentry, spec.sentry ?? (spec.element !== 'NONE')); assert.equal(p.testOnly, undefined);
  assert.equal(p.edition, spec.edition || 'new'); assert.equal(p.visual_revision, 'V4-' + SET);
  assert.equal(p.legacyId, spec.legacyId); if (spec.legacyId) assert.equal(p.replacesModel, false);
  assert.equal(p.collaboration, COLLAB[spec.faction]);
  if (p.collaboration) assert.equal(p.officialCollaboration, false);
}
function validateGame(data, set, createEngine) {
  const engine = createEngine(data), cards = set.cards.map(spec => {
    const p = data.cards.find(p => p.id === spec.id); assert.ok(p, spec.key + ' absent du catalogue');
    for (const f of [...PRINTED, 'role', 'characterId']) assert.deepEqual(p[f], spec[f], 'Profil moteur : ' + spec.key + '.' + f);
    return p;
  });
  for (const c of cards) for (const other of cards) {
    if (c.id === other.id) continue;
    const unit = { cardId: c.id }, board = [unit, { cardId: other.id }];
    assert.equal(engine.synergy({ board }, unit, 'faction'), c.faction === other.faction ? 10 : 0);
    assert.equal(engine.synergy({ board }, unit, 'race'), c.race === other.race ? 10 : 0);
    if (c.characterId === other.characterId) assert.ok(engine.validateDeck([c.id, other.id]).some(e => /personnage/i.test(e)), 'Variantes cumulables.');
  }
  return [];
}
module.exports = { SET, INPUTS, PRINTED, COLLAB, EDITIONS, WEAPON_DONORS, idFor, normalize, validateCard, validateSet, donor, profile, validateProfile, validateGame };
