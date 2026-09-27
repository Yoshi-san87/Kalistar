'use strict';
const L = require('../../atelier/lib.cjs'), P = require('./publish.cjs'), W = require('./revise.cjs');
const { fs, path, DATA, read, write, assert, hash } = L;
async function complete() {
  const publication = read(W.file('published.json')), plan = read(W.file('publication-plan.json'));
  await P.guardPublished(plan);
  const runner = require('../../atelier/runner.cjs'), job = await runner.createJob('regression');
  write(W.file('regression-active.json'), { job, referenceId: publication.referenceId, startedAt: new Date().toISOString() });
  console.log('Actual native regression started: ' + job);
  const status = await runner.execute(job);
  assert.equal(status.state, 'verified', status.message);
  const reportPath = path.join(L.jobDir(job), 'verification.json'), report = read(reportPath);
  assert.equal(report.passed, true); assert.equal(report.referenceId, publication.referenceId);
  assert.equal(report.rendererHash, await L.rendererHash());
  assert.deepEqual(report.results.map(r => r.key).sort(), L.baseline().cards.map(c => c.key).sort());
  assert.equal(report.results.length, plan.referenceCount);
  for (const r of report.results) { assert.equal(r.passed, true); assert.equal(r.comparison.changed, 0); assert.equal(r.roundtrip.changed, 0); assert.equal(r.barcode.passed, true); }
  assert.equal(await hash(reportPath), await hash(path.join(DATA, 'regression.json')));
  fs.copyFileSync(reportPath, W.file('native-regression.json'));
  await P.guardPublished(plan, { allowRegressionResult: true });
  const oldCat = read(W.file('originals/V4/donnees/catalogue.json')), currentCat = read(path.join(L.ROOT, 'V4/donnees/catalogue.json'));
  assert.deepEqual(currentCat.cards.map(c => ({ id: c.id, profile: c.profile })), oldCat.cards.map(c => ({ id: c.id, profile: c.profile })));
  const final = { revision: publication.revision, referenceId: publication.referenceId, previousReferenceId: publication.previousReferenceId,
    passed: true, affectedCards: plan.changedCards, nativeReferencesReproduced: report.results.length,
    regressionJob: job, regressionReport: W.rel(reportPath), regressionHash: await hash(reportPath),
    manifestHash: await hash(path.join(L.ROOT, 'V4/atelier/designer-assets/manifest.json')),
    iconLayoutsHash: await hash(path.join(L.ROOT, 'V4/template-stable/icon-layouts.json')),
    changedFiles: publication.changedFiles.map(c => c.file), allOutsideWeaponPixelsUnchanged: true,
    gameplayUnchanged: true, other18WeaponBanksUnchanged: true, nativeQueueReleased: !fs.existsSync(path.join(DATA, 'render.lock')),
    noSiteOrGitChanges: true, completedAt: new Date().toISOString() };
  assert.equal(final.nativeQueueReleased, true); write(W.file('complete.json'), final); console.log(JSON.stringify(final, null, 2));
  return final;
}
if (require.main === module) complete().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { complete };
