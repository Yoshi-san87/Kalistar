'use strict';
const assert = require('node:assert/strict');
const M = require('./model.cjs');
function createBuilder(options = {}) {
  const L = options.L || require('../../atelier/lib.cjs'), D = options.D || require('../../atelier/designer-core.cjs');
  const R = options.R || require('../../atelier/designer-render.cjs');
  const T = options.typography || require('../nier-pilot-01/typography.cjs');
  const buildCatalog = options.buildCatalog || require('../../atelier/game-catalog.cjs').buildCatalog;
  const createEngine = options.createEngine || require('../../site/engine.js').createEngine;
  const verifyNative = options.verifyNative || require('../nier-pilot-01/build.cjs').verifyNative;
  const { fs, path, read, write, sharp, ROOT, crypto } = L;
  const home = L.inside(ROOT, options.home || __dirname), file = n => L.inside(home, n);
  const guard = require('./preservation.cjs').createGuard(L, D, home);
  const assets = options.assets || require('./assets.cjs').createAssets(L, D);
  const spec = () => M.validateSet(read(file('set.json'))).cards[0];
  const dir = file('cards/simone'), renderDir = path.join(dir, 'render');
  async function hashes(files) {
    const out = {}; for (const f of files) out[guard.relative(f)] = await L.hash(f); return out;
  }
  async function stable() {
    await L.protectedCheck(); await R.verifyAssets(); await assets.verify(); guard.dependencies(); guard.assertExisting();
    return hashes(['references.json', 'regression.json'].map(f => path.join(L.DATA, f)).concat(
      path.join(ROOT, 'V4/atelier/designer-assets/manifest.json')));
  }
  async function locked(action) {
    const lock = path.join(L.DATA, 'render.lock'), owner = crypto.randomUUID(); let fd;
    try {
      fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ id: owner, pid: process.pid, kind: M.SET }));
      return await action();
    } finally {
      if (fd !== undefined) { fs.closeSync(fd); if (fs.existsSync(lock) && read(lock).id === owner) fs.unlinkSync(lock); }
    }
  }
  async function game() {
    const p = M.profile(spec(), D);
    const published = D.catalogue().cards.filter(c => c.kind === 'created' && c.id !== p.id);
    published.push({ id: p.id, profile: p, pngUrl: '/media/created/' + p.id + '.png' });
    const data = await buildCatalog({ published }); M.validateGame(data, read(file('set.json')), createEngine); return data;
  }
  async function check() {
    const c = spec(), ids = new Set(D.catalogue().cards.map(c => c.id));
    const requests = path.join(L.DATA, 'designer/requests');
    if (fs.existsSync(requests)) for (const name of fs.readdirSync(requests).filter(n => n.endsWith('.json'))) ids.add(read(path.join(requests, name)).modelId);
    assert.ok(!ids.has(c.id) && !fs.existsSync(path.join(ROOT, 'V4/creations', c.id)), 'ID deja utilise : ' + c.id);
    guard.dependencies(); guard.assertExisting(); await assets.verify(); await game();
    return { cards: 1, ids: [c.id], fullDeck: false, arenas: [], presets: [],
      missing: [file('art/simone.png')].filter(f => !fs.existsSync(f)) };
  }
  function sources() {
    return ['set.json', 'dependencies.json', 'capture.cjs', 'build.cjs', 'model.cjs', 'assets.cjs', 'preservation.cjs', 'publish.cjs', 'compose.jsx'].map(file).concat(
      Object.keys(read(file('dependencies.json'))).map(f => path.join(ROOT, f)),
      ['V4/atelier/lib.cjs', 'V4/atelier/designer-core.cjs', 'V4/atelier/designer-render.cjs',
        'V4/atelier/game-catalog.cjs', 'V4/site/engine.js'].map(f => path.join(ROOT, f)),
      assets.inputs(read(file('set.json'))), file('art/simone.png'));
  }
  async function prepared() { guard.assertExisting(); return guard.preparation('simone'); }
  async function prepare() {
    return locked(async () => {
      assert.deepEqual((await check()).missing, [], 'Illustration parent manquante : art/simone.png.');
      const snapshot = await stable(), inputs = sources(), inputHashes = await hashes(inputs);
      const c = spec(), p = M.profile(c, D), art = file('art/simone.png'); M.validateProfile(p, c);
      const meta = await sharp(art).metadata(); assert.ok(meta.format === 'png' && meta.width > 0 && meta.height > 0);
      fs.mkdirSync(renderDir, { recursive: true });
      const proof = path.join(dir, 'verification.json');
      if (fs.existsSync(proof)) fs.renameSync(proof, path.join(dir, 'verification.stale-' + crypto.randomUUID() + '.json'));
      write(path.join(dir, 'profile.json'), p); fs.copyFileSync(art, path.join(dir, 'illustration.png'));
      const donor = M.donor(c, D), layers = assets.banner(await R.components(donor, { id: p.id, positionsText: true }));
      layers[0] = { ...layers[0], input: await sharp(art).resize(R.ART.width, R.ART.height, { fit: 'cover' }).png().toBuffer() };
      await sharp(await R.composite(layers)).composite(await T.preview(donor, R)).png().toFile(path.join(dir, 'preview.png'));
      const components = layers.filter(l => !l.name.startsWith('POSITION SLOT '));
      const plan = { textSource: L.baseline().cards.find(c => c.key === 'ruby').psd, layers: [] };
      for (const [i, l] of components.entries()) {
        const filename = 'component-' + String(i).padStart(2, '0') + '.png';
        await sharp(l.input).png().toFile(path.join(renderDir, filename));
        plan.layers.push({ file: filename, name: l.name, left: l.left, top: l.top, width: l.width, height: l.height });
      }
      write(path.join(renderDir, 'composition.json'), plan);
      await sharp(await R.composite(components)).png().toFile(path.join(renderDir, 'expected-components.png'));
      const generated = [guard.snapshotFile, path.join(dir, 'profile.json'), path.join(dir, 'illustration.png'),
        path.join(renderDir, 'composition.json'), path.join(renderDir, 'expected-components.png'), ...plan.layers.map(l => path.join(renderDir, l.file))];
      assert.deepEqual(await hashes(inputs), inputHashes, 'Source modifiee pendant prepare.');
      write(path.join(dir, 'preparation.json'), { referenceId: L.baseline().id, snapshot,
        existingSnapshotHash: guard.digest(guard.snapshotFile), inputs: { ...inputHashes, ...await hashes(generated) } });
      assert.deepEqual(await stable(), snapshot);
      return { prepared: ['simone'], photoshopRun: false };
    });
  }
  async function render() {
    return locked(async () => {
      const snapshot = await stable(); await prepared();
      write(file('render-request.json'), { keys: ['simone'] });
      const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
        path.join(ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', file('compose.jsx')], file('photoshop.log'));
      await prepared(); assert.deepEqual(await stable(), snapshot); return { rendered: ['simone'], output };
    });
  }
  async function verify() {
    return locked(async () => {
      const snapshot = await stable(); await prepared();
      const p = read(path.join(dir, 'profile.json')); M.validateProfile(p, spec());
      const result = await verifyNative(dir, p);
      await prepared(); await game(); assert.deepEqual(await stable(), snapshot);
      write(path.join(dir, 'verification.json'), { ...result, key: 'simone', preparationHash: guard.digest(path.join(dir, 'preparation.json')) });
      return { verified: 1 };
    });
  }
  return { check, prepare, render, verify, prepared, game, sources };
}
async function main(args = process.argv.slice(2), builder) {
  const [action = 'check', key] = args;
  assert.ok(args.length <= 2 && (!key || key === 'simone') && ['check', 'prepare', 'render', 'verify'].includes(action),
    'Usage: node build.cjs [check|prepare|render|verify] [simone]');
  return (builder || createBuilder())[action]();
}
module.exports = { createBuilder, main };
if (require.main === module) main().then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(e => { console.error(e); process.exitCode = 1; });
