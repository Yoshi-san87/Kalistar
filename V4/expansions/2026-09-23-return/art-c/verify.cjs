'use strict';
const L = require('../../../atelier/lib.cjs');
const M = require('../model.cjs');
async function main() {
  const cards = L.read(L.path.join(__dirname, '../profiles-c.json')), results = [];
  for (const input of cards) {
    M.normalize(input);
    const request = L.read(L.path.join(__dirname, input.key + '.request.json'));
    const file = L.path.join(L.ROOT, input.art), originalHash = await L.hash(request.original), hash = await L.hash(file);
    L.assert.equal(hash, originalHash);
    const meta = await L.sharp(file).metadata(), pixels = await L.sharp(file).stats();
    L.assert.deepEqual([meta.width, meta.height, meta.format], [1122, 1402, 'png']);
    L.assert.ok(pixels.channels.some(c => c.stdev > 10));
    const references = [], snapshots = request.referenceSnapshots || [];
    L.assert.equal(new Set(snapshots.map(s => s.originalPath)).size, snapshots.length);
    for (const snapshot of snapshots) {
      L.assert.ok(request.request.referenced_image_paths.includes(snapshot.originalPath));
      L.assert.match(snapshot.sha256, /^[a-f0-9]{64}$/);
    }
    for (const ref of request.request.referenced_image_paths) {
      const snapshot = snapshots.find(s => s.originalPath === ref);
      const source = snapshot ? L.inside(L.ROOT, snapshot.file) : ref;
      await L.sharp(source).metadata();
      const sha256 = await L.hash(source);
      if (snapshot) L.assert.equal(sha256, snapshot.sha256);
      references.push({ path: ref, ...(snapshot ? { snapshot: snapshot.file } : {}), sha256 });
    }
    results.push({ key: input.key, sha256: hash, originalHash, width: meta.width, height: meta.height, references, reviewed: request.review, artisticApproval: 'pending-user' });
  }
  const report = { passed: true, tool: 'built-in image_gen.imagegen', count: results.length, results };
  L.write(L.path.join(__dirname, 'verification.json'), report); console.log(JSON.stringify({ passed: true, count: results.length }));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
