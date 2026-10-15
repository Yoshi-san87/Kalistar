'use strict';
const {test} = require('node:test'),assert = require('node:assert/strict');
const M = require('./model.cjs'),set = require('./set.json');
test('Mirelle uses native Serpes components and a bounded P5 support profile',() => {
  M.validateSet(set);
  const D = require('../../atelier/designer-core.cjs'),c = set.cards[0];
  const p = M.profile(c,D); M.validateProfile(p,c);
  assert.equal(p.canHeal,true); assert.equal(p.canGuard,false);
  assert.deepEqual(c.atk,[166,126,104,73,'mana','revive']);
  assert.deepEqual(c.defense,[193,158,117,84,53,'retry']);
});
test('Invalid support limits, positions and special-face overlays are rejected',() => {
  for (const change of [
    c => { c.atk[0]=181; },
    c => { c.defense[0]=211; },
    c => { c.role=3; },
    c => { c.magic=[2]; },
    c => { c.barriers=[1]; },
    c => { c.positions=[3,5,5]; },
    c => { c.race='HUMAIN'; }
  ]) {
    const bad = structuredClone(set); change(bad.cards[0]);
    assert.throws(() => M.validateSet(bad));
  }
});
