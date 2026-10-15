'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const M = require('./model.cjs'), set = require('./set.json'), D = require('../../atelier/designer-core.cjs');
test('Fortune MGS2 Human Gun Electro P1/P2 with exact requested effects', () => {
  M.validateSet(set); const p = M.profile(set.cards[0], D); M.validateProfile(p, set.cards[0]);
  assert.deepEqual(p.positions, [1,2]); assert.equal(p.race, 'HUMAIN');
  assert.deepEqual(p.atk, [202,166,130,94,'retry',28]);
  assert.deepEqual(p.defense, [264,218,'dodge',124,'retry',36]);
  assert.equal(p.canHeal, false); assert.equal(p.canGuard, false);
});
for (const [name, change] of [
  ['P1 attack ceiling', c => c.atk[0] = 211],
  ['P1 defense ceiling', c => c.defense[0] = 301],
  ['extra dodge', c => c.defense[1] = 'dodge'],
  ['missing attack clover', c => c.atk[4] = 40],
  ['missing defense clover', c => c.defense[4] = 40],
  ['barrier on dodge', c => c.barriers = [4]],
  ['magic on clover', c => c.magic = [2]],
  ['wrong role', c => c.role = 2],
  ['unrequested position', c => c.positions = [1,2,5]],
  ['Reraise outside P5', c => c.atk[5] = 'revive']
]) test('Reject ' + name, () => { const draft = structuredClone(set); change(draft.cards[0]); assert.throws(() => M.validateSet(draft)); });
test('Card is legal inside a mixed ten-card deck', async () => { await require('./build.cjs').game(); });
test('Big Shell adds only Fortune affinity', () => {
  const before = structuredClone(require('./release-before.json').arenas);
  before.find(a => a.id === 'mgs2-big-shell').homeCharacters.push('fortune-mgs');
  assert.deepEqual(require('../../donnees/arenes-collaborations.json'), before);
});
