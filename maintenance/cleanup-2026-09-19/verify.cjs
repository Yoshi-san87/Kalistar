'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../..');
const file = name => path.join(ROOT, name);
const read = name => JSON.parse(fs.readFileSync(file(name), 'utf8').replace(/^\uFEFF/, ''));
const HOME = path.relative(ROOT, __dirname).replaceAll('\\', '/');
async function hash(name) { const h = crypto.createHash('sha256'); for await (const chunk of fs.createReadStream(file(name))) h.update(chunk); return h.digest('hex'); }
async function main() {
  const plan = read(HOME + '/plan.json'), journal = read(HOME + '/cleanup-journal.json');
  const inventory = read(HOME + '/inventory-before.json');
  assert.equal(journal.state, 'complete');
  assert.deepEqual(journal.deleted, plan.duplicates);
  assert.deepEqual(journal.moved, plan.moves);
  const removed = new Set(journal.deleted.map(row => row.path));
  const moves = new Map(journal.moved.map(row => [row.from, row.to]));
  let unchanged = 0; const localStateChanged = [];
  for (const row of inventory) {
    if (removed.has(row.path)) { assert.ok(!fs.existsSync(file(row.path)), row.path); continue; }
    const current = moves.get(row.path) || row.path;
    const actual = fs.existsSync(file(current)) ? await hash(current) : null;
    if (actual !== row.sha256 && /^V4\/atelier\/data\/(runtime\.json|active\.json|server\.lock|.*\.log)$/.test(row.path)) {
      localStateChanged.push(row.path); continue;
    }
    assert.equal(actual, row.sha256, 'Unexpected change: ' + row.path); unchanged++;
  }
  for (const row of journal.deleted) assert.equal(await hash(row.retained), row.sha256);
  const refs = read('V4/atelier/data/references.json');
  assert.equal(refs.id, plan.referenceId);
  assert.deepEqual(refs.protectedFiles, plan.protectedFiles);
  for (const [name, expected] of Object.entries(refs.protectedFiles)) assert.equal(await hash(name), expected, name);
  for (const [name, expected] of Object.entries(plan.packHashes)) assert.equal(await hash('V4/atelier/designer-assets/' + name), expected, name);
  const library = require('../../V4/atelier/lib.cjs');
  const regression = read('V4/atelier/data/regression.json');
  assert.equal(regression.passed, true); assert.equal(regression.referenceId, refs.id);
  assert.equal(regression.rendererHash, await library.rendererHash());
  let directory = ROOT; const gitInAncestors = [];
  while (true) { if (fs.existsSync(path.join(directory, '.git'))) gitInAncestors.push(directory); const parent = path.dirname(directory); if (parent === directory) break; directory = parent; }
  assert.equal(gitInAncestors.length, 0);
  // Keep HTTP verification independent of the desktop service's lifetime.
  const app = require('../../V4/atelier/server.cjs').makeServer();
  app.setOrigin('http://127.0.0.1:0');
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + app.server.address().port;
  app.setOrigin(origin);
  try {
  await app.check();
  async function get(url) { const response = await fetch(origin + url); assert.equal(response.status, 200, url); return response; }
  const status = await (await get('/api/status')).json();
  assert.equal(status.integrity.state, 'intact'); assert.equal(status.gate.passed, true);
  const catalogue = await (await get('/api/game/catalogue')).json();
  assert.deepEqual(catalogue.cards.filter(c => c.origin === 'approved').map(c => c.id).sort(), refs.cards.map(c => c.card.id).sort());
  for (const card of refs.cards) {
    const bytes = Buffer.from(await (await get('/media/reference/' + card.key + '.png')).arrayBuffer());
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), await hash(card.png), card.key);
  }
  for (const url of ['/jeu/', '/jeu/engine.js', '/jeu/local-db.js', '/api/designer/bootstrap', '/legacy']) await get(url);
  const report = {passed: true, checkedAt: new Date().toISOString(),
    unchangedOrMovedFiles: unchanged, removedIdenticalCopies: removed.size,
    bytesFreed: plan.bytesRecoverable, originalReadableBytes: plan.inventoryBytes,
    retainedOriginalBytes: plan.inventoryBytes - plan.bytesRecoverable,
    localStateChanged, protectedFiles: Object.keys(refs.protectedFiles).length,
    componentHashesVerified: Object.keys(plan.packHashes).length,
    approvedCardsServed: refs.cards.length, referenceIdUnchanged: refs.id,
    httpVerificationMode: 'isolated test server using the unchanged production makeServer',
    rendererHashUnchanged: regression.rendererHash, priorNativeRegressionStillValid: true,
    newNativeRenderPerformed: false, gitCommandsExecuted: false, gitInAncestors};
  fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(report);
  } finally { await new Promise(resolve => app.server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
