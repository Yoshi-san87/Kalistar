'use strict';
const assert = require('node:assert/strict');
const base = require('../2026-09-27-metal-gear-mines/model.cjs');
const rules = require('../../../V3/donnees/regles_demo.json');
const SET = '2026-09-28-raiden';
function validateSet(set) {
  assert.equal(set.id, SET); assert.equal(set.officialCollaboration, false);
  assert.deepEqual(set.arenas, []); assert.deepEqual(set.presets, []);
  assert.equal(set.cards.length, 1);
  const c = set.cards[0];
  assert.equal(c.key, 'raiden'); assert.match(c.id, /^4\d{7}$/);
  assert.equal(c.characterId, 'raiden-mgs'); assert.equal(c.race, 'HUMAIN');
  assert.equal(c.faction, 'MGS2'); assert.equal(c.collaboration, 'MGS2');
  assert.equal(c.weapon, 'Gun'); assert.equal(c.element, 'ELECTRO');
  assert.equal(c.role, 4); assert.deepEqual(c.positions, [4]);
  assert.ok(c.name.length <= 30 && c.title.length <= 35 && c.description.length >= 170 && c.description.length <= 220);
  for (const side of ['atk', 'defense']) {
    assert.equal(c[side].length, 6);
    c[side].forEach((v, i) => {
      if (typeof v === 'number') assert.ok(Number.isInteger(v) && v >= 0 && v <= rules.roleBounds[4][side][i]);
      else assert.ok(side === 'defense' && ['dodge', 'retry'].includes(v));
    });
  }
  for (const effect of ['dodge', 'retry']) assert.equal(c.defense.filter(v => v === effect).length, 1);
  for (const [mode, side] of [['magic', 'atk'], ['barriers', 'defense']]) {
    assert.equal(new Set(c[mode]).size, c[mode].length);
    assert.ok(c[mode].every(d => Number.isInteger(d) && d >= 1 && d <= 6 && typeof c[side][6-d] === 'number'));
  }
  return set;
}
function profile(spec, D) { return { ...base.profile(spec, D), visual_revision: 'V4-' + SET }; }
function validateGame(data, set, createEngine) {
  validateSet(set);
  const spec = set.cards[0], p = data.cards.find(c => c.id === spec.id);
  assert.ok(p);
  for (const field of base.PRINTED) assert.deepEqual(p[field], spec[field]);
  assert.equal(p.characterId, spec.characterId); assert.equal(p.role, 4); assert.equal(p.collaboration, 'MGS2');
  const engine = createEngine(data);
  const others = ['45297565','48312725','47200643','40651224','47702575','45960834','41396996','44001617','40243854'];
  assert.deepEqual(engine.validatePlayableDeck([p.id, ...others]), []);
  return [{ purpose: 'QA deck only', cards: [p.id, ...others] }];
}
module.exports = { ...base, SET, validateSet, profile, validateGame };
