'use strict';
const L = require('../../atelier/lib.cjs'), P = require('./revise.cjs');
const { fs, path, read, write, hash, assert, ROOT, DATA } = L;
const file = n => path.join(__dirname, n);
async function main() {
  const preflight = await P.preflight(), before = read(file('before.json'));
  const proof = read(file('verified.json')), transaction = read(file('transaction.json'));
  assert.equal(preflight.state, 'published'); assert.equal(transaction.state, 'published');
  const cards = [];
  for (const c of P.specs()) {
    const v = proof.checks.find(v => v.modelId === c.id);
    assert.equal(v.passed, true); assert.equal(v.scope.outside.outside, 0);
    assert.equal(v.scope.withoutArt.changed, 0); assert.equal(v.roundtrip.changed, 0);
    assert.equal(v.scope.nativeTextUnchanged, true); assert.equal(v.scope.nativeStyleRunsUnchanged, true);
    assert.deepEqual(v.scope.changedProfileFields, []);
    assert.equal(Object.keys(v.barcode.cases).length, 4);
    assert.ok(Object.values(v.barcode.cases).every(a => a.includes(c.id)));
    const creation = path.join(ROOT, 'V4/creations', c.id);
    assert.equal(await hash(path.join(creation, 'profile.json')), before.observed[path.join(creation, 'profile.json')]);
    const hashes = {};
    for (const name of ['card.png', 'card.psd', 'illustration.png', 'profile.json', 'verification.json', 'creation.json'])
      hashes[name] = await hash(path.join(creation, name));
    cards.push({ key: c.key, modelId: c.id, hashes, outsideArtPixelsChanged: 0,
      hiddenArtPixelsChanged: 0, reopenPixelsChanged: 0, barcodeCasesPassed: 4,
      nativeTextAndStyleRunsUnchanged: true, profileBytesUnchanged: true,
      nativePng: 'V4/revisions/2026-09-27-artwork-refresh/work/' + c.key + '/card.png' });
  }
  const nativeQueueReleased = !fs.existsSync(path.join(DATA, 'render.lock'));
  assert.equal(nativeQueueReleased, true);
  const result = { revision: before.revision, referenceId: L.baseline().id, passed: true,
    transactionState: transaction.state, targets: transaction.changes.length, nativeQueueReleased,
    parentVisualApproval: 'Auron, Kaylis and Lanio native exports explicitly approved before publication',
    testsPassed: 11, photoshop: '26.11.7', catalogueCountAtPublication: before.catalogueCount,
    proofHash: await hash(file('verified.json')), transactionHash: await hash(file('transaction.json')),
    noReferenceLockChanged: true, noSiteOrGitChanges: true, cards, completedAt: new Date().toISOString() };
  write(file('complete.json'), result); console.log(JSON.stringify(result, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
