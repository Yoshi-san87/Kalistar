'use strict';
const assert = require('node:assert/strict');
const original = require('../2026-10-01-one-piece-witcher/model.cjs');
const historical = require('../2026-10-01-one-piece-witcher/set.json');
const base = require('../2026-09-27-metal-gear-mines/model.cjs');
const SET = '2026-10-02-witcher-completion';
function validateSet(set) {
  original.validateSet(historical);
  assert.equal(set.id, SET);
  assert.equal(set.officialCollaboration, false);
  assert.deepEqual(set.arenas, []);
  assert.deepEqual(set.presets, []);
  assert.deepEqual(set.cards, historical.cards.filter(c => c.key === 'vesemir'));
  return set;
}
function validateGame(data, set, createEngine) {
  validateSet(set);
  for (const c of set.cards) {
    const p = data.cards.find(p => p.id === c.id);
    assert(p);
    for (const f of base.PRINTED) assert.deepEqual(p[f], c[f], c.key + '.' + f);
    assert.equal(p.characterId, c.characterId);
    assert.equal(p.role, 1);
    assert.equal(p.canGuard, true);
    assert.equal(p.canHeal, false);
    assert.equal(p.sentry, true);
    assert.equal(p.collaboration, 'WITCHER');
  }
  const engine = createEngine(data);
  assert(!engine.validateDeck([set.cards[0].id]).some(e => /inconnue/.test(e)));
  return { cards: 1, characters: 1, gameplayPreserved: true };
}
module.exports = { ...original, SET, validateSet, validateGame };
