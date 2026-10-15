'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const M = require('./model.cjs'), set = require('./set.json'), D = require('../../atelier/designer-core.cjs');
test('Vamp MGS2, blood crystal, dagger and requested position order', () => {
  M.validateSet(set); const p = M.profile(set.cards[0], D); M.validateProfile(p, set.cards[0]);
  assert.deepEqual(p.positions, [3,2,4]); assert.equal(p.race, 'VAMP');
  assert.equal(p.element, 'HEMATO'); assert.equal(p.weapon, 'Dague');
  assert.equal(p.canHeal, false); assert.equal(p.canGuard, false);
});
for (const [name, change] of [
  ['P3 attack ceiling', c => c.atk[0] = 241],
  ['P3 defense ceiling', c => c.defense[0] = 241],
  ['extra dodge', c => c.defense[1] = 'dodge'],
  ['barrier on dodge', c => c.barriers = [4]],
  ['wrong race', c => c.race = 'HUMAIN'],
  ['unrequested position', c => c.positions = [2,3,5]],
  ['support effect outside P5', c => c.atk[5] = 'revive']
]) test('Reject ' + name, () => { const draft = structuredClone(set); change(draft.cards[0]); assert.throws(() => M.validateSet(draft)); });
test('Card remains legal inside a mixed ten-card deck', async () => {
  await require('./build.cjs').game();
});
test('Big Shell adds only Vamp affinity; prior arena definitions stay intact', () => {
  const before = structuredClone(require('./release-before.json').arenas);
  before.find(a => a.id === 'mgs2-big-shell').homeCharacters.push('vamp-mgs');
  assert.deepEqual(require('../../donnees/arenes-collaborations.json'), before);
});
