'use strict';
const L = require('../../atelier/lib.cjs');
const { fs, path, assert, crypto } = L;
const { SET } = require('./model.cjs');
const local = n => L.inside(__dirname, n), relative = f => path.relative(L.ROOT, f).replaceAll('\\', '/');
const digest = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function exclusive(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
function tree(dir) {
  return fs.readdirSync(dir).sort().flatMap(n => {
    const p = path.join(dir, n), stat = fs.lstatSync(p); assert.ok(!stat.isSymbolicLink());
    return stat.isDirectory() ? tree(p) : [p];
  });
}
async function hashes(files) {
  const result = {}; for (const f of [...new Set(files)]) result[relative(f)] = await L.hash(f); return result;
}
async function unchanged(map) { for (const [f, h] of Object.entries(map)) assert.equal(await L.hash(L.inside(L.ROOT, f)), h, 'Source modifiee : ' + f); }
function dependencyInputs() {
  const file = local('dependency-revisions.json');
  if (!fs.existsSync(file)) return [];
  return [file, ...L.read(file).flatMap(r => [local(r.beforeCopy), local(r.afterCopy)])];
}
async function dependencies(capture) {
  const file = local('dependency-revisions.json'), revisions = fs.existsSync(file) ? L.read(file) : [], current = { ...capture.dependencies };
  assert.equal(new Set(revisions.map(r => r.file)).size, revisions.length);
  for (const r of revisions) {
    assert.equal(r.file, 'V4/site/collaborations.js', 'Revision de dependance non autorisee.');
    assert.equal(r.beforeHash, capture.dependencies[r.file]); assert.ok(r.reason && r.authorizedBy);
    assert.equal(await L.hash(local(r.beforeCopy)), r.beforeHash); assert.equal(await L.hash(local(r.afterCopy)), r.afterHash);
    current[r.file] = r.afterHash;
  }
  await unchanged(current);
}
async function stable() {
  const capture = L.read(local('capture.json'));
  await unchanged(capture.snapshots);
  await dependencies(capture); await L.protectedCheck(L.read(local('baseline/references.json')));
  await require('../../atelier/designer-render.cjs').verifyAssets();
  assert.equal(L.baseline().id, capture.referenceId);
  await unchanged(capture.createdFiles);
  const current = require('../../atelier/designer-core.cjs').catalogue();
  assert.deepEqual(current, L.read(local('baseline/catalogue.json')), 'Catalogue modifie depuis la capture.');
  const inventory = current.cards.filter(c => c.kind === 'created').flatMap(c => tree(path.join(L.ROOT, 'V4/creations', c.id)).map(relative)).sort();
  assert.deepEqual(inventory, Object.keys(capture.createdFiles).sort());
  return capture;
}
async function preparation(key) {
  assert.match(key, /^[a-z][a-z0-9-]{0,63}$/);
  const target = local('cards/' + key + '/preparation.json'), p = L.read(target);
  assert.equal(p.referenceId, L.baseline().id); assert.equal(p.captureHash, digest(local('capture.json')));
  await unchanged(p.inputs); await unchanged(p.generated); return p;
}
async function locked(action) {
  const lock = path.join(L.DATA, 'render.lock'), id = crypto.randomUUID(); let fd;
  try { fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ id, pid: process.pid, kind: SET })); return await action(); }
  finally { if (fd !== undefined) { fs.closeSync(fd); if (fs.existsSync(lock) && L.read(lock).id === id) fs.unlinkSync(lock); } }
}
module.exports = { local, relative, digest, exclusive, tree, hashes, unchanged, dependencies, dependencyInputs, stable, preparation, locked };
