'use strict';
const L = require('../../atelier/lib.cjs'), G = require('./preservation.cjs');
async function main() {
  const target = G.local('evidence/preflight.json'); L.assert.ok(!L.fs.existsSync(target));
  const result = await require('./publish.cjs').main([]);
  L.assert.equal(result.published, false); L.assert.equal(result.files.length, 80);
  L.assert.deepEqual([result.cards, result.revised, result.catalogue, result.canonical, result.created, result.arenas], [9, 7, 89, 38, 51, 23]);
  const cards = L.read(G.local('set.json')).cards.map(c => 'cards/' + c.key + '/verification.json');
  const revisions = require('./reference-plan.cjs').KEYS.map(k => 'revisions/' + k + '/verification.json');
  const files = [...cards, ...revisions, 'evidence/native-regression/report.json', 'evidence/ornelle-description.json'];
  for (const file of files) L.assert.equal(L.read(G.local(file)).passed, true);
  const proofs = await G.hashes(files.map(G.local));
  G.exclusive(target, { ...result, checkedAt: new Date().toISOString(), proofs, publicationRequiresParentGo: true, gitPerformed: false });
  console.log({ ready: true, cards: 9, revisions: 7, regression: 38, published: false, targets: result.files.length,
    referenceId: result.referenceId, report: G.relative(target), sha256: G.digest(target) });
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
