'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const M = require('./model.cjs'), set = require('./set.json');
test('Geralt preserves his prepared gameplay and Ssilas uses calibrated native components',() => {
  M.validateSet(set);
  const D = require('../../atelier/designer-core.cjs');
  for (const c of set.cards) M.validateProfile(M.profile(c,D),c);
  assert.deepEqual(set.cards[1].atk,[225,187,148,108,67,'buff_atk']);
  assert.deepEqual(set.cards[1].defense,[218,177,137,94,'dodge',27]);
});
test('Illegal role limits and support effects cannot enter production',() => {
  for (const change of [
    c => { c.atk[0]=241; },
    c => { c.atk[5]='revive'; },
    c => { c.barriers=[2]; },
    c => { c.positions=[2]; },
    c => { c.race='HUMAIN'; }
  ]) {
    const bad = structuredClone(set); change(bad.cards[1]);
    assert.throws(() => M.validateSet(bad));
  }
});
