'use strict';
const L = require('../../atelier/lib.cjs'), G = require('./preservation.cjs');
async function main() {
  const attempt = G.local('attempts/05-ornelle-description'), current = G.local('cards/ornelle');
  const revision = L.read(L.path.join(attempt, 'revision.json'));
  for (const hashes of Object.values(revision.unchanged)) await G.unchanged(hashes);
  const before = L.read(L.path.join(attempt, 'card/profile.json')), after = L.read(L.path.join(current, 'profile.json'));
  L.assert.equal(after.description, revision.after.description); L.assert.equal(after.text, after.description);
  before.description = after.description; before.text = after.text; L.assert.deepEqual(before, after);
  const native = L.read(L.path.join(current, 'render/native.json')), desc = native.layers.find(l => l.name === 'DESCRIPTION');
  L.assert.equal(desc.kind, 'LayerKind.TEXT'); L.assert.equal(desc.text.split('\r').length, 4);
  L.assert.ok(desc.ink[1] >= 1264 && desc.ink[3] <= 1373);
  const comparison = await L.diff(L.path.join(attempt, 'card/card.png'), L.path.join(current, 'card.png'), [[150, 1251, 749, 1387]]);
  L.assert.ok(comparison.changed > 0); L.assert.equal(comparison.outside, 0, 'Visual change outside narrative.');
  const beforeNative = L.read(L.path.join(attempt, 'card/render/native.json'));
  L.assert.deepEqual(beforeNative.typography, native.typography);
  L.assert.equal(L.read(L.path.join(current, 'verification.json')).passed, true);
  const files = await G.hashes([L.path.join(attempt, 'revision.json'), L.path.join(attempt, 'card/card.png'), ...['card.png', 'card.psd', 'verification.json', 'preparation.json', 'profile.json', 'render/native.json'].map(f => L.path.join(current, f))]);
  G.exclusive(G.local('evidence/ornelle-description.json'), { passed: true, comparison, lines: 4, ink: desc.ink, unchangedNativeCards: 8, files });
  console.log({ passed: true, comparison, lines: 4, ink: desc.ink });
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
