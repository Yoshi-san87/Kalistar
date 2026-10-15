'use strict';
const assert = require('node:assert/strict');
function createGuard(L, D, home = __dirname) {
  const { fs, path, ROOT, read, write, crypto } = L;
  const local = n => L.inside(home, n), snapshotFile = local('existing-created.snapshot.json');
  const relative = f => path.relative(ROOT, f).replace(/\\/g, '/');
  const digest = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  function tree(dir) {
    return fs.readdirSync(dir).sort().flatMap(n => {
      const f = path.join(dir, n), stat = fs.lstatSync(f); assert.ok(!stat.isSymbolicLink());
      return stat.isDirectory() ? tree(f) : [f];
    });
  }
  function dependencies() {
    const revisionFile = local('dependency-revisions.json');
    const revisions = fs.existsSync(revisionFile) ? read(revisionFile) : [];
    assert.ok(Array.isArray(revisions)); assert.equal(new Set(revisions.map(r => r.file)).size, revisions.length);
    const original = read(local('dependencies.json'));
    for (const revision of revisions) {
      assert.ok(['V4/atelier/game-catalog.cjs', 'V4/site/collaborations.js'].includes(revision.file), 'Revision de dependance hors perimetre.');
      assert.equal(revision.beforeHash, original[revision.file] || null);
      assert.ok(revision.reason && revision.reviewedAt);
      if (revision.beforeHash) assert.equal(digest(local(revision.beforeCopy)), revision.beforeHash);
      assert.equal(digest(local(revision.afterCopy)), revision.afterHash);
      assert.equal(digest(L.inside(ROOT, revision.file)), revision.afterHash, 'Dependance revisee modifiee : ' + revision.file);
    }
    for (const [f, h] of Object.entries(original)) if (!revisions.some(r => r.file === f)) assert.equal(digest(L.inside(ROOT, f)), h, 'Dependance modifiee : ' + f);
  }
  function ownIds() { return new Set(fs.existsSync(local('set.json')) ? read(local('set.json')).cards.map(c => c.id) : []); }
  function assertExisting(snapshot = read(snapshotFile), catalogue = D.catalogue()) {
    assert.equal(snapshot.referenceId, L.baseline().id); dependencies();
    const own = ownIds(); assert.ok(snapshot.entries.every(c => !own.has(c.id)), 'ID deja utilise avant le lot.');
    assert.deepEqual(catalogue.cards.filter(c => c.kind === 'created' && !own.has(c.id)), snapshot.entries);
    const inventory = snapshot.entries.flatMap(c => tree(path.join(ROOT, 'V4/creations', c.id)).map(relative)).sort();
    assert.deepEqual(inventory, Object.keys(snapshot.files).sort());
    for (const [f, h] of Object.entries(snapshot.files)) assert.equal(digest(L.inside(ROOT, f)), h, 'Creation existante modifiee : ' + f);
    return snapshot;
  }
  function freeze() {
    if (fs.existsSync(snapshotFile)) return assertExisting();
    dependencies(); const entries = D.catalogue().cards.filter(c => c.kind === 'created'), files = {};
    for (const c of entries) for (const f of tree(path.join(ROOT, 'V4/creations', c.id))) files[relative(f)] = digest(f);
    const snapshot = { schemaVersion: 1, referenceId: L.baseline().id, capturedAt: new Date().toISOString(), entries, files };
    write(snapshotFile, snapshot); return assertExisting(snapshot);
  }
  function preparation(key, proof = false) {
    const dir = local('cards/' + key), f = path.join(dir, 'preparation.json'), p = read(f);
    assert.equal(p.referenceId, L.baseline().id); assert.equal(p.existingSnapshotHash, digest(snapshotFile));
    for (const hashes of [p.snapshot, p.inputs]) {
      assert.ok(hashes && Object.keys(hashes).length);
      for (const [f, h] of Object.entries(hashes)) assert.equal(digest(L.inside(ROOT, f)), h, 'Preparation obsolete : ' + f);
    }
    if (proof) assert.equal(read(path.join(dir, 'verification.json')).preparationHash, digest(f));
    return p;
  }
  function publication() { assertExisting(); read(local('set.json')).cards.forEach(c => preparation(c.key, true)); }
  return { snapshotFile, relative, digest, dependencies, assertExisting, freeze, preparation, publication };
}
module.exports = { createGuard };
