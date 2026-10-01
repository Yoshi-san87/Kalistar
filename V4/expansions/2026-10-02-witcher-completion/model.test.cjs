'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.cjs'), set = require('./set.json');
test('Vesemir keeps the previously prepared P1 profile and numeric identity', () => {
  M.validateSet(set);
  const c = set.cards[0];
  assert.equal(c.id, '49900106');
  assert.deepEqual(c.positions, [1]);
  assert.equal(c.element, 'MINERO');
  assert.equal(c.atk[5], 'guard');
  assert.deepEqual(c.defense, [292,216,182,121,65,23]);
});
test('Pending Geralt cards must not silently enter this publication', () => {
  assert.throws(() => M.validateSet({ ...set, cards: require('../2026-10-01-one-piece-witcher/set.json').cards.filter(c => c.key.startsWith('geralt')) }));
});
