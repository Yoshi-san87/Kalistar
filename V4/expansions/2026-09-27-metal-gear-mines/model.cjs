'use strict';
const assert = require('node:assert/strict');
const rules = require('../../../V3/donnees/regles_demo.json');
const weapons = require('../../../V3/donnees/armes.json');
const SET = '2026-09-27-metal-gear-mines';
const KEYS = ['solid-snake-mgs1','solid-snake-mgs2','solid-snake-mgs4','revolver-ocelot','sniper-wolf','vulcan-raven','ninja','meryl','liquid-snake','psycho-mantis','malaba-mine','voloden-mine','momo-silence'];
const PRINTED = ['name','title','job','description','element','race','weapon','faction','positions','atk','defense','magic','barriers'];
const characterId = spec => spec.characterId;
const artPath = spec => 'V4/Illustrations/' + spec.art;
function validateSet(set) {
  assert.equal(set.id, SET); assert.equal(set.officialCollaboration, false);
  assert.deepEqual(set.cards.map(c => c.key), KEYS); assert.equal(new Set(set.cards.map(c => c.id)).size, 13);
  assert.equal(new Set(set.cards.map(characterId)).size, 11);
  assert.deepEqual(set.arenas, []); assert.deepEqual(set.presets, []);
  for (const c of set.cards) {
    assert.match(c.id, /^4\d{7}$/); assert.match(c.characterId, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(c.positions.includes(c.role)); assert.equal(new Set(c.positions).size, c.positions.length);
    assert.ok(c.positions.every(p => Number.isInteger(p) && p >= 1 && p <= 5));
    assert.ok(c.name.length <= 30 && c.title.length <= 35 && c.description.length >= 170 && c.description.length <= 220, 'Texte hors budget : ' + c.key + ' ' + c.description.length);
    assert.ok(Object.hasOwn(weapons, c.weapon), 'Arme inconnue.');
    assert.match(c.art, /^[A-Za-z0-9_]+\.png$/);
    assert.ok(!/naked/i.test(c.art));
    if (c.collaboration) assert.ok(['MGS1','MGS2','MGS4'].includes(c.faction) && c.collaboration === c.faction);
    for (const side of ['atk', 'defense']) {
      assert.equal(c[side].length, 6);
      c[side].forEach((v,i) => {
        if (typeof v === 'number') assert.ok(Number.isInteger(v) && v >= 0 && v <= rules.roleBounds[c.role][side][i], 'Plafond de role : ' + c.key + '.' + side + '.D' + (6-i));
        else assert.ok((side === 'atk' ? ['guard','revive','retry','mana','buff_atk','death'] : ['retry','dodge']).includes(v));
      });
    }
    if (c.atk.includes('guard')) assert.ok([1,5].includes(c.role));
    if (c.atk.includes('revive')) assert.equal(c.role, 5);
    for (const [field, side] of [['magic','atk'],['barriers','defense']]) {
      assert.equal(new Set(c[field]).size, c[field].length);
      assert.ok(c[field].every(d => Number.isInteger(d) && d >= 1 && d <= 6 && typeof c[side][6-d] === 'number'));
    }
    if (c.element === 'NONE') assert.equal(c.magic.length + c.barriers.length, 0);
  }
  assert.deepEqual(set.cards.slice(0,3).map(c => c.characterId), Array(3).fill('solid-snake-mgs'));
  assert.deepEqual(set.cards.slice(0,3).map(c => [c.faction,c.element,c.weapon,c.positions]), [
    ['MGS1','CRYO','Gun',[1,2,3]], ['MGS2','HYDRO','Gun',[1,2,3]], ['MGS4','GEO','Gun',[1,2,3]]
  ]);
  assert.equal(set.cards.find(c => c.key === 'ninja').defense.filter(v => v === 'dodge').length, 1);
  return set;
}
function donor(spec, D) {
  const input = Object.fromEntries(D.FIELDS.filter(k => k in spec).map(k => [k, spec[k]]));
  const p = D.validate({ ...input, faction: spec.collaboration ? 'Chroma' : spec.faction }, { final: true });
  p.positions = [...spec.positions]; return p;
}
function profile(spec, D) {
  return { ...D.profileCard(donor(spec, D), spec.id), role: spec.role, characterId: characterId(spec), faction: spec.faction,
    ...(spec.collaboration ? { collaboration: spec.collaboration, officialCollaboration: false } : {}),
    canGuard: spec.atk.includes('guard'), canHeal: spec.atk.includes('revive'), sentry: spec.element !== 'NONE',
    advantage: 30, disadvantage: 30, source: spec.collaboration ? 'Kalistar x Metal Gear - fan crossover non officiel' : 'Variante narrative Kalistar, demande du 27 septembre 2026',
    ...(spec.lineage ? { previous_model: spec.lineage } : {}),
    artworkSource: artPath(spec), visual_revision: 'V4-' + SET };
}
function validateProfile(p, spec) {
  assert.equal(p.id, spec.id); assert.equal(p.characterId, characterId(spec)); assert.equal(p.role, spec.role);
  for (const f of PRINTED) assert.deepEqual(p[f], spec[f], spec.key + '.' + f);
  assert.equal(p.collaboration, spec.collaboration);
  if (spec.collaboration) assert.equal(p.officialCollaboration, false);
  assert.notEqual(p.testOnly, true); assert.equal(p.sentry, spec.element !== 'NONE');
  assert.equal(p.canGuard, p.atk.includes('guard')); assert.equal(p.canHeal, p.atk.includes('revive'));
  assert.equal(p.artworkSource, artPath(spec));
}
function validateGame(data, set, createEngine) {
  const engine = createEngine(data);
  for (const spec of set.cards) {
    const p = data.cards.find(c => c.id === spec.id); assert.ok(p);
    for (const f of PRINTED) assert.deepEqual(p[f], spec[f]);
    assert.equal(p.characterId, characterId(spec)); assert.equal(p.role, spec.role); assert.equal(p.collaboration, spec.collaboration);
    if (spec.lineage) assert.equal(data.cards.find(c => c.id === spec.lineage)?.characterId, spec.characterId, 'Identite de variante incoherente.');
  }
  // Ten printed MGS models contain only eight characters. Do not create an illegal all-MGS preset.
  assert.equal(new Set(set.cards.filter(c => c.collaboration).map(characterId)).size, 8);
  const mixed = ['solid-snake-mgs1','revolver-ocelot','sniper-wolf','vulcan-raven','ninja','meryl','liquid-snake','psycho-mantis','voloden-mine','momo-silence'];
  const cards = mixed.map(k => set.cards.find(c => c.key === k).id);
  assert.deepEqual(engine.validatePlayableDeck(cards), []);
  return [{ purpose: 'QA mixed deck only, not installed', cards, coverage: engine.deckCoverage(cards) }];
}
module.exports = { SET, KEYS, PRINTED, characterId, artPath, validateSet, donor, profile, validateProfile, validateGame };
