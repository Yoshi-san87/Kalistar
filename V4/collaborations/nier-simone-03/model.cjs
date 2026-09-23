'use strict';
const assert = require('node:assert/strict');
const shared = require('../nier-set-02/model.cjs');
const rules = require('../../../V3/donnees/regles_demo.json');
const ID = '45862715', SET = 'nier-simone-03';
function validateSet(set) {
  assert.equal(set.id, SET); assert.equal(set.faction, 'NieR'); assert.equal(set.officialCollaboration, false);
  assert.deepEqual(set.arenas, []); assert.deepEqual(set.presets, []);
  assert.equal(set.cards.length, 1);
  const c = set.cards[0];
  assert.deepEqual([c.key, c.id, c.name, c.race, c.weapon, c.element, c.positions, c.role],
    ['simone', ID, 'SIMONE', 'ROBOT', 'Instrument', 'HEMATO', [4], 4]);
  assert.equal(c.job, 'CANTATRICE');
  assert.ok(c.title.length > 0 && c.title.length <= 35);
  assert.ok(c.description.length >= 190 && c.description.length <= 220);
  for (const side of ['atk', 'defense']) {
    assert.equal(c[side].length, 6);
    c[side].forEach((value, index) => {
      if (typeof value === 'number') assert.ok(Number.isInteger(value) && value >= 0 && value <= rules.roleBounds[4][side][index]);
      else assert.ok(side === 'atk' && ['mana', 'retry'].includes(value), 'Effet hors profil P4 de Simone.');
    });
  }
  assert.equal(c.atk.filter(v => typeof v === 'string').length, 1);
  for (const [field, side] of [['magic', 'atk'], ['barriers', 'defense']]) {
    assert.ok(Array.isArray(c[field])); assert.equal(new Set(c[field]).size, c[field].length);
    assert.ok(c[field].every(d => Number.isInteger(d) && d >= 1 && d <= 6 && typeof c[side][6 - d] === 'number'));
  }
  assert.ok(c.magic.length >= 3 && c.magic.length <= 4, 'DPS majoritairement magique.');
  assert.ok(c.barriers.length >= 1 && c.barriers.length <= 2);
  assert.ok(c.atk.filter(Number.isFinite).reduce((sum, n) => sum + n, 0) <= 800);
  assert.ok(c.defense.reduce((sum, n) => sum + n, 0) <= 540);
  return set;
}
function profile(spec, D) {
  return { ...shared.profile(spec, D), visual_revision: 'V4-' + SET };
}
function validateProfile(p, spec) {
  shared.validateProfile(p, spec);
  assert.equal(p.visual_revision, 'V4-' + SET);
  assert.equal(p.text, spec.description); assert.equal(p.canHeal, false); assert.equal(p.canGuard, false);
}
function validateGame(data, set, createEngine) {
  validateSet(set);
  const spec = set.cards[0], p = data.cards.find(c => c.id === spec.id);
  assert.ok(p, 'Simone absente du catalogue de test.');
  for (const field of [...shared.PRINTED, 'role']) assert.deepEqual(p[field], spec[field]);
  assert.equal(p.characterId, 'simone-nier'); assert.equal(p.faction, 'NieR');
  assert.equal(p.canHeal, false); assert.equal(p.canGuard, false);
  const pilot = data.cards.find(c => c.id === '45911726'), robot = data.cards.find(c => c.id === '42650442');
  assert.ok(pilot && robot, 'Les cartes NieR existantes doivent rester presentes.');
  const e = createEngine(data), unit = { cardId: p.id }, board = [unit, { cardId: pilot.id }, { cardId: robot.id }];
  assert.equal(e.synergy({ board }, unit, 'faction'), 20);
  assert.equal(e.synergy({ board }, unit, 'race'), 10);
  // Arenas are parent-owned: this one-card lot neither registers nor forbids them.
  assert.ok(!data.decks.presets.some(preset => preset.id === SET));
  return [];
}
module.exports = { ID, SET, KEYS: ['simone'], PRINTED: shared.PRINTED, donor: shared.donor,
  validateSet, profile, validateProfile, validateGame };
