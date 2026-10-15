'use strict';
const assert = require('node:assert/strict');
function createGuard(L, D, home) {
  const { fs, path, ROOT, read, write, crypto } = L;
  const snapshotFile = path.join(home, 'existing-created.snapshot.json');
  const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const absolute = relative => L.inside(ROOT, relative);
  const relative = file => path.relative(ROOT, file).replace(/\\/g, '/');
  function tree(dir) {
    return fs.readdirSync(dir).sort().flatMap(name => {
      const file = path.join(dir, name), stat = fs.lstatSync(file);
      assert.ok(!stat.isSymbolicLink(), 'Lien interdit : ' + file);
      return stat.isDirectory() ? tree(file) : [file];
    });
  }
  function dependencies() {
    for (const [file, hash] of Object.entries(read(path.join(home, 'dependencies.json')))) {
      assert.equal(digest(absolute(file)), hash, 'Dependance approuvee modifiee : ' + file);
    }
  }
  function capture() {
    dependencies();
    const entries = D.catalogue().cards.filter(c => c.kind === 'created');
    const own = new Set(read(path.join(home, 'set.json')).cards.map(c => c.id));
    assert.ok(entries.every(c => !own.has(c.id)), 'Ne pas figer apres publication du lot.');
    const files = {};
    for (const entry of entries) {
      const dir = absolute('V4/creations/' + entry.id);
      for (const name of ['profile.json', 'card.png', 'card.psd', 'verification.json', 'creation.json']) assert.ok(fs.existsSync(path.join(dir, name)));
      for (const file of tree(dir)) files[relative(file)] = digest(file);
    }
    return { schemaVersion: 1, referenceId: L.baseline().id, entries, files };
  }
  function assertExisting(snapshot = read(snapshotFile), catalogue = D.catalogue()) {
    assert.equal(snapshot.schemaVersion, 1); assert.equal(snapshot.referenceId, L.baseline().id);
    dependencies();
    const oldIds = new Set(snapshot.entries.map(c => c.id)), own = new Set(read(path.join(home, 'set.json')).cards.map(c => c.id));
    assert.deepEqual(catalogue.cards.filter(c => c.kind === 'created' && !own.has(c.id)), snapshot.entries, 'Catalogue existant modifie depuis prepare.');
    assert.ok([...oldIds].every(id => !own.has(id)));
    const inventory = snapshot.entries.flatMap(c => tree(absolute('V4/creations/' + c.id)).map(relative)).sort();
    assert.deepEqual(inventory, Object.keys(snapshot.files).sort(), 'Inventaire des creations modifie.');
    for (const [file, hash] of Object.entries(snapshot.files)) assert.equal(digest(absolute(file)), hash, 'Creation existante modifiee : ' + file);
    return snapshot;
  }
  function freeze() {
    if (fs.existsSync(snapshotFile)) return assertExisting();
    const snapshot = capture(); write(snapshotFile, snapshot); assertExisting(snapshot); return snapshot;
  }
  function preparation(key, requireProof = false) {
    const dir = path.join(home, 'cards', key), file = path.join(dir, 'preparation.json'), prep = read(file);
    assert.equal(prep.referenceId, L.baseline().id);
    assert.equal(prep.existingSnapshotHash, digest(snapshotFile), 'Snapshot remplace.');
    for (const hashes of [prep.snapshot, prep.inputs]) {
      assert.ok(hashes && Object.keys(hashes).length);
      for (const [file, hash] of Object.entries(hashes)) assert.equal(digest(absolute(file)), hash, 'Preparation obsolete : ' + file);
    }
    if (requireProof) assert.equal(read(path.join(dir, 'verification.json')).preparationHash, digest(file), 'Preuve de preparation obsolete.');
    return prep;
  }
  function publication() {
    assertExisting();
    for (const spec of read(path.join(home, 'set.json')).cards) preparation(spec.key, true);
  }
  return { snapshotFile, digest, relative, dependencies, capture, freeze, assertExisting, preparation, publication };
}
module.exports = { createGuard };
