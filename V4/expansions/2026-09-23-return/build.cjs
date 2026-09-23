'use strict';
const assert = require('node:assert/strict');
const M = require('./model.cjs');
const CODE = ['assemble.cjs', 'model.cjs', 'assets.cjs', 'preservation.cjs', 'capture.cjs', 'catalogue.cjs', 'build.cjs', 'compose.jsx', 'canonical.cjs', 'regression.cjs', 'regression.jsx', 'evidence.cjs', 'publish.cjs', 'typography.cjs', 'calibrate-typography.cjs', 'calibrate-typography.jsx'];
function createBuilder(options = {}) {
  const L = options.L || require('../../atelier/lib.cjs'), D = options.D || require('../../atelier/designer-core.cjs');
  const R = options.R || require('../../atelier/designer-render.cjs'), T = options.typography || require('./typography.cjs');
  const { fs, path, ROOT, read, write, sharp, crypto } = L, home = options.home || __dirname, file = n => L.inside(home, n);
  const guard = require('./preservation.cjs').createGuard(L, D, home), assets = options.assets || require('./assets.cjs').createAssets(L, D, home);
  const set = () => {
    const value = M.validateSet(read(file('set.json')));
    assert.deepEqual(value.cards, Object.keys(M.INPUTS).flatMap(n => read(file(n)).map(M.normalize)), 'Profils modifies apres assemble.');
    return value;
  }, dir = key => file('cards/' + key);
  const select = key => { const cards = set().cards.filter(c => !key || c.key === key); assert.ok(cards.length, 'Carte inconnue : ' + key); return cards; };
  async function hashes(files) { const out = {}; for (const f of [...new Set(files)]) out[guard.relative(f)] = await L.hash(f); return out; }
  async function stable() {
    guard.dependencies(); guard.assertExisting(); await L.protectedCheck(); await R.verifyAssets(); await assets.verify(set());
    return hashes([path.join(L.DATA, 'references.json'), path.join(ROOT, 'V4/atelier/designer-assets/manifest.json')]);
  }
  async function locked(action) {
    const lock = path.join(L.DATA, 'render.lock'), id = crypto.randomUUID(); let fd;
    try { fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ id, pid: process.pid, kind: M.SET })); return await action(); }
    finally { if (fd !== undefined) { fs.closeSync(fd); if (fs.existsSync(lock) && read(lock).id === id) fs.unlinkSync(lock); } }
  }
  async function game() {
    const s = set(), own = new Set(s.cards.map(c => c.id)), ref = structuredClone(L.baseline());
    const published = D.catalogue().cards.filter(c => c.kind === 'created' && !own.has(c.id));
    for (const c of s.cards) {
      const profile = M.profile(c, D);
      if (c.edition === 'canonical') ref.cards.push({ key: c.key, card: profile });
      else published.push({ id: c.id, profile, pngUrl: '/media/created/' + c.id + '.png' });
    }
    const data = await (options.prospective || require('./catalogue.cjs').prospective)(L, ref, published);
    M.validateGame(data, s, options.createEngine || require('../../site/engine.js').createEngine); return data;
  }
  async function check(key) {
    const cards = select(key), ids = new Set(D.catalogue().cards.map(c => c.id));
    for (const c of cards) {
      assert.ok(!ids.has(c.id), 'ID deja publie : ' + c.id);
      assert.ok(!fs.existsSync(path.join(ROOT, 'V4/creations', c.id)), 'Creation deja presente.');
      M.profile(c, D);
    }
    guard.dependencies(); guard.assertExisting(); await game();
    const required = [...assets.inputs(set()), ...cards.map(c => file(c.art))];
    return { cards: cards.length, canonical: cards.filter(c => c.edition === 'canonical').length, ids: cards.map(c => c.id),
      missing: required.filter(f => !fs.existsSync(f)), photoshopRun: false };
  }
  function sources(c) {
    const revisions = fs.existsSync(file('dependency-revisions.json')) ? read(file('dependency-revisions.json')) : [];
    return [...CODE, 'typography-calibration.json', 'typography-calibration-native.json', 'typography-calibration-request.json', 'set.json', 'dependencies.json', ...Object.keys(M.INPUTS)].map(file).concat(
      Object.keys(read(file('dependencies.json'))).map(f => path.join(ROOT, f)), assets.inputs(set()), file(c.art),
      revisions.length ? [file('dependency-revisions.json'), ...revisions.flatMap(r => [path.join(ROOT, r.file), file(r.afterCopy), ...(r.beforeCopy ? [file(r.beforeCopy)] : [])])] : []);
  }
  async function crop(c) {
    const art = file(c.art), meta = await sharp(art).metadata(); assert.equal(meta.format, 'png');
    const { zoom = 1, x = 0, y = 0 } = c.crop || {}, scale = Math.max(R.ART.width / meta.width, R.ART.height / meta.height) * zoom;
    const width = Math.min(meta.width, Math.round(R.ART.width / scale)), height = Math.min(meta.height, Math.round(R.ART.height / scale));
    return sharp(art).extract({ left: Math.round((meta.width - width) * (1 - x) / 2), top: Math.round((meta.height - height) * (1 - y) / 2), width, height }).resize(R.ART.width, R.ART.height).png().toBuffer();
  }
  async function hiddenComponents(c, active) {
    if (c.edition !== 'canonical') return [];
    const m = assets.manifest(), result = [], names = new Set(active.map(l => l.name));
    const empty = await sharp({ create: { width: 1, height: 1, channels: 4, background: '#00000000' } }).png().toBuffer();
    function add(spec, name) {
      if (names.has(name)) return;
      result.push(spec ? { ...spec, input: path.join(R.ASSETS, spec.file), name } : { input: empty, left: 0, top: 0, width: 1, height: 1, name, empty: true });
    }
    for (let d = 1; d <= 6; d++) {
      add(m.stats.atk[c.element][d].magic, 'ATK D' + d + ' - HALO MAGIQUE');
      add(m.stats.def[d].barrier, 'DEF D' + d + ' - BARRIERE');
      if (c.element === 'MINERO') add(m.stats.atk[c.element][d].physical, 'ATK D' + d + ' - OR GENERE - objet dynamique partage');
    }
    add(m.stats.def[4].effectBackground, 'DEF D4 - fond effet'); add(null, 'DEF D4 - fond physique');
    for (let slot = 1; slot <= 5; slot++) add(m.position.supports[slot], 'SUPPORT SLOT ' + slot);
    return result;
  }
  async function prepare(key) {
    return locked(async () => {
      assert.deepEqual((await check(key)).missing, [], 'Assets manquants.'); const snapshot = await stable(), prepared = [];
      for (const c of select(key)) {
        const folder = dir(c.key), render = path.join(folder, 'render');
        assert.ok(!fs.existsSync(path.join(folder, 'preparation.json')), 'Preparation deja presente : conserver les preuves et utiliser une revision explicite.');
        const inputs = sources(c), sourceHashes = await hashes(inputs), p = M.profile(c, D), donor = M.donor(c, D);
        fs.mkdirSync(render, { recursive: true }); write(path.join(folder, 'profile.json'), p);
        fs.copyFileSync(file(c.art), path.join(folder, 'illustration.png'), fs.constants.COPYFILE_EXCL);
        const layers = assets.apply(await R.components(donor, { id: p.id, positionsText: true }), c);
        layers[0] = { ...layers[0], input: await crop(c) };
        await sharp(await R.composite(layers)).composite(await T.preview({ ...donor, race: p.race }, R)).png().toFile(path.join(folder, 'preview.png'));
        const components = layers.filter(l => !l.name.startsWith('POSITION SLOT '));
        if (c.edition === 'canonical' && c.element === 'MINERO') for (const l of components) l.name = l.name.replace(/^(ATK D[1-6]) - fond physique$/, '$1 - OR GENERE - objet dynamique partage');
        const plan = { textSource: L.baseline().cards.find(c => c.key === 'ruby').psd, layers: [], hiddenLayers: [] };
        const hidden = await hiddenComponents(c, components);
        for (const [group, list] of [['layers', components], ['hiddenLayers', hidden]]) for (const [i, l] of list.entries()) {
          const name = (group === 'layers' ? 'component-' : 'hidden-') + String(i).padStart(2, '0') + '.png';
          await sharp(l.input).png().toFile(path.join(render, name));
          plan[group].push({ file: name, name: l.name, left: l.left, top: l.top, width: l.width, height: l.height, ...(l.empty ? { empty: true } : {}) });
        }
        write(path.join(render, 'composition.json'), plan);
        await sharp(await R.composite(components)).png().toFile(path.join(render, 'expected-components.png'));
        const generated = [guard.snapshotFile, path.join(folder, 'profile.json'), path.join(folder, 'illustration.png'), path.join(render, 'composition.json'),
          path.join(render, 'expected-components.png'), ...[...plan.layers, ...plan.hiddenLayers].map(l => path.join(render, l.file))];
        assert.deepEqual(await hashes(inputs), sourceHashes);
        write(path.join(folder, 'preparation.json'), { referenceId: L.baseline().id, snapshot, existingSnapshotHash: guard.digest(guard.snapshotFile), inputs: { ...sourceHashes, ...await hashes(generated) } });
        prepared.push(c.key);
      }
      assert.deepEqual(await stable(), snapshot); return { prepared, photoshopRun: false };
    });
  }
  async function render(key) {
    return locked(async () => {
      const snapshot = await stable(), cards = select(key);
      cards.forEach(c => guard.preparation(c.key)); write(file('render-request.json'), { keys: cards.map(c => c.key) });
      const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
        path.join(ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', file('compose.jsx')], file('photoshop.log'));
      cards.forEach(c => guard.preparation(c.key)); assert.deepEqual(await stable(), snapshot); return { rendered: cards.map(c => c.key), output };
    });
  }
  async function verify(key) {
    return locked(async () => {
      const snapshot = await stable(), results = [];
      for (const c of select(key)) {
        guard.preparation(c.key); const folder = dir(c.key), p = read(path.join(folder, 'profile.json')); M.validateProfile(p, c);
        const native = read(path.join(folder, 'render/native.json')); T.verify(native);
        const report = await (options.verifyNative || require('../../collaborations/nier-pilot-01/build.cjs').verifyNative)(folder, p);
        const none = p.element === 'NONE' ? await require('../../collaborations/ff8-set-01/build.cjs').createBuilder().noneProof(folder, read(path.join(folder, 'render/composition.json')), assets.manifest()) : null;
        guard.preparation(c.key);
        const result = { ...report, key: c.key, typography: native.typography, ...(none ? { none } : {}), preparationHash: guard.digest(path.join(folder, 'preparation.json')) };
        write(path.join(folder, 'verification.json'), result); results.push(result);
      }
      await game(); assert.deepEqual(await stable(), snapshot);
      return { verified: results.length, keys: results.map(r => r.key) };
    });
  }
  return { check, prepare, render, verify, game, stable, sources, hiddenComponents, locked, guard, assets };
}
async function main(args = process.argv.slice(2), builder) {
  const [action = 'check', key] = args; assert.ok(args.length <= 2 && ['check', 'prepare', 'render', 'verify'].includes(action));
  return (builder || createBuilder())[action](key);
}
module.exports = { CODE, createBuilder, main };
if (require.main === module) main().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
