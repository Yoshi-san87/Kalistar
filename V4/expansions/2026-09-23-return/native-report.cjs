'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
async function main() {
  const { fs, path, assert } = L, home = __dirname, output = path.join(home, 'native-batch.json');
  assert.ok(!fs.existsSync(output), 'Rapport existant : conserver cette preuve.');
  const guard = require('./preservation.cjs').createGuard(L, D, home), set = L.read(path.join(home, 'set.json'));
  guard.publication(); await L.protectedCheck(); const results = [];
  for (const c of set.cards) {
    const folder = path.join(home, 'cards', c.key), p = L.read(path.join(folder, 'profile.json')), v = L.read(path.join(folder, 'verification.json'));
    require('./model.cjs').validateProfile(p, c); assert.equal(v.passed, true); assert.equal(v.modelId, c.id);
    assert.equal(v.components.fixedDifferences, 0); assert.equal(v.components.severePixels, 0); assert.equal(v.roundtrip.changed, 0);
    assert.equal(v.barcode.passed, true); assert.equal(v.barcode.expected, c.id);
    const hashes = {};
    for (const name of ['card.png', 'card.psd', 'profile.json', 'verification.json', 'preparation.json', 'render/native.json', 'render/reopened.png']) hashes[name] = await L.hash(path.join(folder, name));
    for (const name of ['card.png', 'card.psd']) assert.equal(hashes[name], v.hashes[name]);
    assert.equal(hashes['profile.json'], v.profileHash); assert.equal(hashes['preparation.json'], v.preparationHash);
    results.push({ key: c.key, id: c.id, edition: c.edition, passed: true, hashes,
      fixedDifferences: 0, severePixels: 0, reopenedDifferences: 0, barcode: v.barcode });
  }
  const report = { schemaVersion: 1, passed: true, phase: 'native-cards-only', checkedAt: new Date().toISOString(),
    referenceId: L.baseline().id, count: results.length, canonical: results.filter(r => r.edition === 'canonical').length,
    previousCreatedPreserved: L.read(guard.snapshotFile).entries.length, published: false,
    referenceRegression: 'canonical-regression.json (separate required gate)', results };
  fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ nativeCardsVerified: report.count, canonical: report.canonical, previousCreatedPreserved: report.previousCreatedPreserved, published: false }));
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
