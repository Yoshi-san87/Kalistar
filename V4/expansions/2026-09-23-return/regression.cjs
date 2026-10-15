'use strict';
const assert = require('node:assert/strict');
async function run() {
  const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs'), R = require('../../atelier/designer-render.cjs');
  const { fs, path, read, write } = L, home = __dirname, local = n => L.inside(home, n);
  const builder = require('./build.cjs').createBuilder(), canonical = require('./canonical.cjs');
  const plan = await canonical.createPlan(L, D, home), rendererHash = await L.rendererHash();
  // The existing runner performs the unchanged reference set through its normal
  // registered renderer. New canonical cards follow the same renderRegistered.
  const runner = require('../../atelier/runner.cjs'), job = await runner.createJob('regression'), status = await runner.execute(job);
  const sourceReport = path.join(L.jobDir(job), 'verification.json');
  const archived = fs.existsSync(sourceReport) ? require('./evidence.cjs').archiveOldReport(L, home, job, sourceReport) : null;
  assert.equal(status.state, 'verified', 'Regression des anciennes references echouee. Rapport conserve : ' + (archived?.oldReportFile || 'aucun rapport produit'));
  assert.ok(archived, 'Rapport de regression absent.'); const oldReport = archived.report;
  assert.equal(oldReport.passed, true); assert.equal(oldReport.referenceId, plan.before.id); assert.equal(oldReport.rendererHash, rendererHash);
  assert.deepEqual(oldReport.results.map(r => r.key).sort(), plan.before.cards.map(c => c.key).sort());
  return builder.locked(async () => {
    assert.equal((await canonical.createPlan(L, D, home)).digest, plan.digest); await builder.stable();
    fs.mkdirSync(local('canonical-regression'), { recursive: true });
    write(local('canonical-regression-request.json'), { items: plan.newEntries });
    await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
      path.join(L.ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', local('regression.jsx')], local('canonical-regression.log'));
    const results = [];
    for (const entry of plan.newEntries) {
      const folder = local('canonical-regression/' + entry.key), source = local('cards/' + entry.key);
      const comparison = await L.diff(path.join(source, 'card.png'), path.join(folder, 'card.png'));
      const roundtrip = await L.diff(path.join(folder, 'card.png'), path.join(folder, 'reopened.png'));
      assert.equal(comparison.changed, 0, entry.key + ' regression pixels'); assert.equal(roundtrip.changed, 0);
      const native = read(path.join(folder, 'native.json')); assert.deepEqual([native.width, native.height, native.resolution], [897, 1497, 300]);
      const barcode = JSON.parse(await R.command(L.PYTHON, [path.join(L.ROOT, 'V4/atelier/barcode.py'), path.join(folder, 'card.png'), entry.card.id]));
      assert.equal(barcode.passed, true);
      const get = name => { const layer = native.layers.find(l => l.name === name); assert.ok(layer, name); return layer; };
      for (const [side, values, modes] of [['ATK', entry.card.atk, entry.card.magic], ['DEF', entry.card.defense, entry.card.barriers]]) for (let d = 1; d <= 6; d++) {
        const value = values[6 - d], numeric = typeof value === 'number', number = get(side + ' D' + d + ' - valeur');
        assert.equal(number.visible, numeric); if (numeric) assert.equal(number.text, String(value));
        else assert.equal(get(side + ' D' + d + ' - effet ' + value).visible, true);
        assert.equal(get(side + ' D' + d + (side === 'ATK' ? ' - HALO MAGIQUE' : ' - BARRIERE')).visible, numeric && modes.includes(d));
      }
      for (let i = 1; i <= 5; i++) assert.equal(get('POSITION SLOT ' + i).visible, i <= entry.card.positions.length);
      results.push({ key: entry.key, passed: true, comparison, roundtrip, barcode, nativeHash: await L.hash(path.join(folder, 'native.json')),
        hashes: { 'card.png': await L.hash(path.join(folder, 'card.png')), 'reopened.png': await L.hash(path.join(folder, 'reopened.png')) } });
    }
    await builder.stable(); assert.equal(await L.rendererHash(), rendererHash);
    assert.equal((await canonical.createPlan(L, D, home)).digest, plan.digest);
    const report = { passed: true, referenceId: plan.next.id, previousReferenceId: plan.before.id, rendererHash, planDigest: plan.digest,
      oldReportFile: archived.oldReportFile, oldReportHash: archived.oldReportHash,
      checkedAt: new Date().toISOString(), results: [...oldReport.results, ...results] };
    await require('./evidence.cjs').inspectRegression(L, home, report, plan);
    write(local('canonical-regression.json'), report);
    const scratch = local('canonical-regression/roundtrip.psd'); if (fs.existsSync(scratch)) fs.unlinkSync(scratch);
    return { passed: true, references: report.results.length, originalSourcesPreserved: true };
  });
}
module.exports = { run };
if (require.main === module) run().then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exitCode = 1; });
