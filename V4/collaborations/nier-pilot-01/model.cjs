'use strict';
const assert = require('node:assert/strict');
const rules = require('../../../V3/donnees/regles_demo.json');
const { PRINTED } = require('../ff8-set-01/model.cjs');
const KEYS = ['2b', '9s'];
function validateSet(set) {
  assert.equal(set.id, 'nier-pilot-01'); assert.equal(set.faction, 'NieR'); assert.equal(set.officialCollaboration, false);
  assert.deepEqual(set.cards.map(c => c.key), KEYS); assert.deepEqual(set.arenas, []); assert.deepEqual(set.presets, []);
  assert.equal(new Set(set.cards.map(c => c.id)).size, 2);
  for (const c of set.cards) {
    assert.match(c.id, /^4\d{7}$/); assert.equal(c.race, 'ANDROID');
    assert.ok(c.title.length <= 35 && c.description.length >= 190 && c.description.length <= 220);
    assert.ok(c.positions.includes(c.role));
    for (const side of ['atk', 'defense']) {
      assert.equal(c[side].length, 6);
      c[side].forEach((value, i) => {
        if (typeof value === 'number') assert.ok(Number.isInteger(value) && value >= 0 && value <= rules.roleBounds[c.role][side][i], c.key + '.' + side + ' D' + (6 - i));
      });
    }
    if (c.atk.includes('revive')) assert.ok(rules.reraise.allowedRoles.includes(c.role));
  }
  return set;
}
function donor(spec, D) {
  const fields = Object.fromEntries(D.FIELDS.filter(k => k in spec).map(k => [k, spec[k]]));
  return D.validate({ ...fields, race: 'HUMAIN', faction: 'Chroma', weapon: spec.weapon === 'Katana' ? 'Dague' : spec.weapon }, { final: true });
}
function profile(spec, D) {
  return { ...D.profileCard(donor(spec, D), spec.id), race: 'ANDROID', weapon: spec.weapon,
    weapon_index: Object.keys(require('../../../V3/donnees/armes.json')).indexOf(spec.weapon), role: spec.role, faction: 'NieR',
    characterId: spec.key + '-nier', collaboration: 'NieR', officialCollaboration: false,
    advantage: 30, disadvantage: 30, source: 'Kalistar x NieR - fan crossover prive non officiel', visual_revision: 'V4-nier-pilot-01' };
}
function validateProfile(p, spec) {
  assert.equal(p.id, spec.id); assert.equal(p.characterId, spec.key + '-nier');
  assert.equal(p.faction, 'NieR'); assert.equal(p.collaboration, 'NieR'); assert.equal(p.officialCollaboration, false);
  for (const field of [...PRINTED, 'role']) assert.deepEqual(p[field], spec[field], spec.key + '.' + field);
  assert.equal(p.canHeal, p.atk.includes('revive')); assert.equal(p.canGuard, false); assert.equal(p.testOnly, undefined);
}
function validateGame(data, set, createEngine) {
  const engine = createEngine(data), cards = set.cards.map(s => {
    const c = data.cards.find(c => c.id === s.id); assert.ok(c);
    for (const field of [...PRINTED, 'role']) assert.deepEqual(c[field], s[field]);
    assert.equal(c.faction, 'NieR'); assert.equal(c.characterId, s.key + '-nier'); return c;
  });
  assert.notDeepEqual(engine.validatePlayableDeck(cards.map(c => c.id)), [], 'Deux cartes ne forment pas un deck.');
  const board = cards.map(c => ({ cardId: c.id }));
  assert.equal(engine.synergy({ board }, board[0], 'faction'), 10);
  assert.equal(engine.synergy({ board }, board[0], 'race'), 10);
  for (const faction of ['FF7', 'FF8', 'Chroma']) {
    const other = data.cards.find(c => c.faction === faction); if (!other) continue;
    const mixed = [...board, { cardId: other.id }];
    assert.equal(engine.synergy({ board: mixed }, mixed[0], 'faction'), 10);
    assert.equal(engine.synergy({ board: mixed }, mixed[2], 'faction'), 0);
  }
  return [];
}
module.exports = { KEYS, PRINTED, validateSet, donor, profile, validateProfile, validateGame };
