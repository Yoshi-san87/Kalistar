'use strict';
const L = require('../../atelier/lib.cjs');
async function main() {
  const { fs, path, assert } = L, home = __dirname, art = path.join(home, 'art-c');
  const args = process.argv.slice(2); assert.ok(!args.length || (args.length === 1 && args[0] === '--framing'));
  const framing = args[0] === '--framing', revision = path.join(art, 'revisions/kaine-20260924' + (framing ? '-framing' : ''));
  const receipt = path.join(home, 'evidence/kaine-art-revision-20260924' + (framing ? '-framing' : '') + '.json');
  assert.ok(!fs.existsSync(receipt), 'Revision deja activee.');
  const previous = path.join(revision, 'previous'), source = path.join(revision, 'illustration.png');
  assert.ok(!fs.existsSync(previous), 'Archive deja presente : examiner la tentative precedente.');
  const request = L.read(path.join(revision, 'request.json')), hash = await L.hash(source);
  assert.equal(hash, await L.hash(request.original));
  const meta = await L.sharp(source).metadata(); assert.deepEqual([meta.width, meta.height, meta.format], [1122, 1402, 'png']);
  const unchanged = {};
  for (const name of ['set.json', 'profiles-a.json', 'profiles-b.json', 'profiles-c.json']) unchanged[name] = await L.hash(path.join(home, name));
  fs.mkdirSync(previous, { recursive: true }); const archived = {};
  for (const name of ['kaine.png', 'kaine.request.json', 'verification.json']) {
    const from = path.join(art, name), to = path.join(previous, name);
    fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL); archived[name] = await L.hash(to); assert.equal(await L.hash(from), archived[name]);
  }
  const active = structuredClone(request);
  // Keep the issued prompt and reference paths exact; provenance readers use
  // this snapshot for the input whose active path is being replaced.
  active.issuedRequestFile = path.relative(L.ROOT, path.join(revision, 'request.json')).replace(/\\/g, '/');
  if (!framing) active.referenceSnapshots = [{ originalPath: request.request.referenced_image_paths[0],
    file: path.relative(L.ROOT, path.join(previous, 'kaine.png')).replace(/\\/g, '/'), sha256: archived['kaine.png'] }];
  active.selected = path.relative(L.ROOT, path.join(art, 'kaine.png')).replace(/\\/g, '/');
  try {
    fs.copyFileSync(source, path.join(art, 'kaine.png')); L.write(path.join(art, 'kaine.request.json'), active);
    for (const [name, before] of Object.entries(unchanged)) assert.equal(await L.hash(path.join(home, name)), before);
    assert.equal(await L.hash(path.join(art, 'kaine.png')), hash);
    const report = { activatedAt: new Date().toISOString(), key: 'kaine', newHash: hash, previous: archived, unchanged,
      issuedRequestHash: await L.hash(path.join(revision, 'request.json')), activeRequestHash: await L.hash(path.join(art, 'kaine.request.json')),
      previousNativeAttempt: (framing ? 'attempts/03-before-native-glyph-validation' : 'attempts/02-before-description-leading') + '/cards/kaine', nativeRenderPending: true };
    L.write(receipt, report); console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    for (const name of ['kaine.png', 'kaine.request.json']) fs.copyFileSync(path.join(previous, name), path.join(art, name));
    throw error;
  }
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
