'use strict';
const assert = require('node:assert/strict');
const UUID = '[a-f0-9-]{36}';
function evidenceFile(L, home, relative) {
  const file = L.inside(home, relative);
  let cursor = file;
  while (cursor !== L.ROOT) {
    if (L.fs.existsSync(cursor)) assert.ok(!L.fs.lstatSync(cursor).isSymbolicLink(), 'Lien interdit dans une preuve.');
    const parent = L.path.dirname(cursor); assert.notEqual(parent, cursor); cursor = parent;
  }
  return file;
}
function archiveOldReport(L, home, job, source) {
  assert.match(job, new RegExp('^' + UUID + '$'));
  const bytes = L.fs.readFileSync(source), report = JSON.parse(bytes.toString('utf8'));
  const relative = 'evidence/old-regression/' + job + '/verification.json', file = evidenceFile(L, home, relative);
  L.fs.mkdirSync(L.path.dirname(file), { recursive: true });
  // Capture the exact report, including a failed regression, without reserializing
  // it or overwriting a report from an earlier attempt.
  try { L.fs.writeFileSync(file, bytes, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; assert.deepEqual(L.fs.readFileSync(file), bytes, 'Archive de preuve deja presente et differente.'); }
  assert.deepEqual(L.fs.readFileSync(file), bytes);
  return { report, oldReportFile: L.path.relative(L.ROOT, file).replace(/\\/g, '/'),
    oldReportHash: L.crypto.createHash('sha256').update(bytes).digest('hex') };
}
async function inspectRegression(L, home, report, plan) {
  const prefix = L.path.relative(L.ROOT, home).replace(/\\/g, '/') + '/';
  assert.ok(typeof report.oldReportFile === 'string' && report.oldReportFile.startsWith(prefix), 'Rapport ancien hors du lot suivi.');
  const relative = report.oldReportFile.slice(prefix.length);
  assert.match(relative, new RegExp('^evidence/old-regression/' + UUID + '/verification\\.json$'), 'Rapport ancien non portable.');
  const observed = new Map();
  async function check(relative, expected) {
    assert.match(expected || '', /^[a-f0-9]{64}$/, 'Empreinte de preuve manquante.');
    const file = evidenceFile(L, home, relative);
    assert.equal(await L.hash(file), expected, 'Preuve modifiee : ' + relative); observed.set(file, expected); return file;
  }
  const oldFile = await check(relative, report.oldReportHash), old = L.read(oldFile);
  assert.equal(old.passed, true); assert.equal(old.referenceId, plan.before.id); assert.equal(old.rendererHash, report.rendererHash);
  assert.deepEqual(old.results.map(r => r.key).sort(), plan.before.cards.map(c => c.key).sort());
  const oldKeys = new Set(plan.before.cards.map(c => c.key));
  assert.deepEqual(report.results.filter(r => oldKeys.has(r.key)), old.results, 'Resultats anciens modifies apres archivage.');
  for (const entry of plan.newEntries) {
    const result = report.results.find(r => r.key === entry.key); assert.ok(result, entry.key);
    await check('canonical-regression/' + entry.key + '/native.json', result.nativeHash);
    for (const name of ['card.png', 'reopened.png']) await check('canonical-regression/' + entry.key + '/' + name, result.hashes?.[name]);
  }
  return observed;
}
module.exports = { archiveOldReport, inspectRegression };
