'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const M = require('./model.cjs'), set = require('./set.json'), D = require('../../atelier/designer-core.cjs');
test('Raiden MGS2 human Gun P4, one dodge and one defensive clover', () => {
  M.validateSet(set); const p = M.profile(set.cards[0], D); M.validateProfile(p, set.cards[0]);
  assert.deepEqual(p.positions, [4]); assert.equal(p.race, 'HUMAIN');
  assert.deepEqual(p.defense, [156,128,'dodge',72,'retry',20]);
  assert.equal(p.canHeal, false); assert.equal(p.canGuard, false);
});
for (const [name, change] of [
  ['P4 attack ceiling', c => c.atk[0] = 301],
  ['P4 defense ceiling', c => c.defense[0] = 181],
  ['extra dodge', c => c.defense[1] = 'dodge'],
  ['missing clover', c => c.defense[4] = 40],
  ['barrier on dodge', c => c.barriers = [4]],
  ['wrong Raiden era', c => c.race = 'CYBORG'],
  ['unrequested role', c => c.positions = [2,4]],
  ['support effect in P4', c => c.atk[5] = 'revive']
]) test('Reject ' + name, () => { const draft = structuredClone(set); change(draft.cards[0]); assert.throws(() => M.validateSet(draft)); });
test('Card remains legal inside a mixed ten-card deck', async () => {
  await require('./build.cjs').game();
});
test('Big Shell adds only Raiden affinity; prior arena definitions stay intact', () => {
  const before = structuredClone(require('./release-before.json').arenas);
  before.find(a => a.id === 'mgs2-big-shell').homeCharacters.push('raiden-mgs');
  assert.deepEqual(require('../../donnees/arenes-collaborations.json'), before);
});
