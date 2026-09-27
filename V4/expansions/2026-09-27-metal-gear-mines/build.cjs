'use strict';
const assert = require('node:assert/strict');
const M = require('./model.cjs');
function createBuilder(options = {}) {
  const L = options.L || require('../../atelier/lib.cjs'), D = options.D || require('../../atelier/designer-core.cjs');
  const R = options.R || require('../../atelier/designer-render.cjs');
  const T = options.typography || require('../../collaborations/nier-pilot-01/typography.cjs');
  const buildCatalog = options.buildCatalog || require('../../atelier/game-catalog.cjs').buildCatalog;
  const createEngine = options.createEngine || require('../../site/engine.js').createEngine;
  const { fs, path, read, write, sharp, ROOT, crypto } = L;
  const home = L.inside(ROOT, options.home || __dirname), file = n => L.inside(home, n);
  const guard = require('./preservation.cjs').createGuard(L, D, home);
  const assets = options.assets || require('./assets.cjs').createAssets(L, home);
  const set = () => M.validateSet(read(file('set.json')));
  const select = key => { const cards = set().cards.filter(c => !key || c.key === key); assert.ok(cards.length, 'Carte inconnue.'); return cards; };
  const allProfiles = () => set().cards.map(s => M.profile(s, D));
  async function hashes(files) {
    const result = {}; for (const f of files) result[guard.relative(f)] = await L.hash(f); return result;
  }
  const snapshots = () => hashes(['V4/atelier/data/references.json', 'V4/atelier/data/regression.json', 'V4/atelier/designer-assets/manifest.json'].map(f => path.join(ROOT, f)));
  async function stable() { await L.protectedCheck(); await R.verifyAssets(); await assets.verify(); guard.dependencies(); return snapshots(); }
  async function locked(action) {
    const lock = path.join(L.DATA, 'render.lock'), id = crypto.randomUUID(); let fd;
    try {
        fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ id, pid: process.pid, kind: M.SET + '-production' }));
      return await action();
    } finally {
      if (fd !== undefined) { fs.closeSync(fd); if (fs.existsSync(lock) && read(lock).id === id) fs.unlinkSync(lock); }
    }
  }
  async function game() {
    const profiles = allProfiles();
    const published = D.catalogue().cards.filter(c => c.kind === 'created' && !profiles.some(p => p.id === c.id));
    published.push(...profiles.map(profile => ({ id: profile.id, profile, pngUrl: '/media/created/' + profile.id + '.png' })));
    const data = await buildCatalog({ published }); M.validateGame(data, set(), createEngine); return data;
  }
  async function check(key) {
    const cards = select(key), ids = new Set(D.catalogue().cards.map(c => c.id));
    const requests = path.join(L.DATA, 'designer/requests');
    if (fs.existsSync(requests)) for (const name of fs.readdirSync(requests).filter(n => n.endsWith('.json'))) ids.add(read(path.join(requests, name)).modelId);
    for (const c of set().cards) assert.ok(!ids.has(c.id) && !fs.existsSync(path.join(ROOT, 'V4/creations', c.id)), 'ID deja utilise : ' + c.id);
    if (fs.existsSync(file('dependencies.json'))) guard.dependencies();
    const data = await game();
    return { cards: cards.length, ids: cards.map(c => c.id), fullDeck: false, arenas: [],
      qaDecks: M.validateGame(data, set(), createEngine),
      pendingDependencyFreeze: !fs.existsSync(file('dependencies.json')),
      missing: [...cards.map(c => L.inside(ROOT, M.artPath(c))), ...assets.inputs()].filter(f => !fs.existsSync(f)) };
  }
  function sources(cards) {
    return ['set.json', 'dependencies.json', 'build.cjs', 'model.cjs', 'assets.cjs', 'preservation.cjs', 'publish.cjs', 'publication-core.cjs', 'compose.jsx', 'compose-one.jsx', 'render.ps1'].map(file).concat(
      ['V4/collaborations/nier-pilot-01/compose-one.jsx', 'V4/collaborations/nier-pilot-01/typography.jsx',
        'V4/collaborations/nier-pilot-01/typography.cjs', 'V4/collaborations/nier-pilot-01/build.cjs',
        'V4/collaborations/ff8-set-01/build.cjs', 'V4/collaborations/ff8-set-01/model.cjs', 'V4/collaborations/ff8-set-01/publish.cjs',
        'V4/atelier/lib.cjs', 'V4/atelier/designer-render.cjs', 'V4/atelier/designer-core.cjs', 'V4/atelier/game-catalog.cjs',
        'V4/site/engine.js', 'V3/donnees/regles_demo.json', 'V3/donnees/armes.json'].map(f => path.join(ROOT, f)),
      assets.inputs(), cards.map(c => L.inside(ROOT, M.artPath(c))));
  }
  async function crop(spec) {
    const input = L.inside(ROOT, M.artPath(spec)), meta = await sharp(input).metadata(), p = spec.crop;
    const scale = Math.max(R.ART.width / meta.width, R.ART.height / meta.height) * p.zoom;
    const width = Math.min(meta.width, Math.round(R.ART.width / scale)), height = Math.min(meta.height, Math.round(R.ART.height / scale));
    const box = { left: Math.round((meta.width-width)*(1-p.x)/2), top: Math.round((meta.height-height)*(1-p.y)/2), width, height };
    return { input: await sharp(input).extract(box).resize(R.ART.width,R.ART.height).png().toBuffer(), box, sourceSize: [meta.width,meta.height], sha256: await L.hash(input) };
  }
  async function draft(key) {
    assert.ok(!fs.existsSync(file('dependencies.json')), 'Apercus exploratoires interdits apres le gel natif.');
    const reviewed = [];
    for (const spec of select(key)) {
      const dir = file('cards/' + spec.key), donor = M.donor(spec,D), art = await crop(spec);
      fs.mkdirSync(dir, { recursive: true });
      write(path.join(dir,'profile.json'), M.profile(spec,D));
      fs.copyFileSync(L.inside(ROOT,M.artPath(spec)), path.join(dir,'illustration.png'));
      const layers = assets.banner(await R.components(donor,{id:spec.id,positionsText:true}),spec,true);
      layers[0] = { ...layers[0], input: art.input };
      await sharp(await R.composite(layers)).composite(await T.preview(donor,R)).png().toFile(path.join(dir,'preview.png'));
      const placeholderFaction = !!spec.collaboration && !fs.existsSync(file('art-flags/flag-' + spec.faction + '-packed.png'));
      const record = { key: spec.key, original: M.artPath(spec), sha256: art.sha256, sourceSize: art.sourceSize, crop: art.box,
        suppliedByUser: true, originalUnmodified: true, resampling: 'isotropic crop to native art window', placeholderFaction, nativeReady: false };
      write(path.join(dir,'art-preparation.json'), record); reviewed.push(record);
    }
    const all = set().cards.map(c => file('cards/' + c.key + '/art-preparation.json')).filter(f => fs.existsSync(f)).map(read);
    write(file('draft-review.json'),{ cards: all, note:'Preview only. No dependency freeze or native approval.' });
    return { draft: reviewed.map(c => c.key), photoshopRun:false, dependencyFreeze:false };
  }
  async function prepare(key) {
    return locked(async () => {
      assert.deepEqual((await check(key)).missing, [], 'Illustrations parent manquantes.');
      const snapshot = await stable(), existing = guard.freeze(), cards = select(key);
      const inputs = sources(cards), sourceHashes = await hashes(inputs);
      for (const spec of cards) {
        const dir = file('cards/' + spec.key), render = path.join(dir, 'render'), p = M.profile(spec, D), art = L.inside(ROOT, M.artPath(spec));
        const meta = await sharp(art).metadata(); assert.ok(meta.format === 'png' && meta.width > 0 && meta.height > 0);
        fs.mkdirSync(render, { recursive: true });
        const proof = path.join(dir, 'verification.json');
        if (fs.existsSync(proof)) fs.renameSync(proof, path.join(dir, 'verification.stale-' + crypto.randomUUID() + '.json'));
        write(path.join(dir, 'profile.json'), p); fs.copyFileSync(art, path.join(dir, 'illustration.png'));
        const donor = M.donor(spec, D), layers = assets.banner(await R.components(donor, { id: p.id, positionsText: true }), spec);
        layers[0] = { ...layers[0], input: (await crop(spec)).input };
        await sharp(await R.composite(layers)).composite(await T.preview(donor, R)).png().toFile(path.join(dir, 'preview.png'));
        const native = layers.filter(l => !l.name.startsWith('POSITION SLOT '));
        const plan = { textSource: L.baseline().cards.find(c => c.key === 'ruby').psd, layers: [] };
        for (const [i, l] of native.entries()) {
          const name = 'component-' + String(i).padStart(2, '0') + '.png'; await sharp(l.input).png().toFile(path.join(render, name));
          plan.layers.push({ file: name, name: l.name, left: l.left, top: l.top, width: l.width, height: l.height });
        }
        write(path.join(render, 'composition.json'), plan);
        await sharp(await R.composite(native)).png().toFile(path.join(render, 'expected-components.png'));
        const generated = [guard.snapshotFile, path.join(dir, 'profile.json'), path.join(dir, 'illustration.png'), path.join(render, 'composition.json'),
          path.join(render, 'expected-components.png'), ...plan.layers.map(l => path.join(render, l.file))];
        assert.deepEqual(await hashes(inputs), sourceHashes, 'Source modifiee pendant prepare.');
        write(path.join(dir, 'preparation.json'), { referenceId: L.baseline().id, snapshot, existingSnapshotHash: guard.digest(guard.snapshotFile),
          inputs: { ...sourceHashes, ...await hashes(generated) } });
      }
      assert.deepEqual(await stable(), snapshot); guard.assertExisting(existing);
      return { prepared: cards.map(c => c.key), photoshopRun: false };
    });
  }
  async function prepared(key) { select(key); guard.assertExisting(); return guard.preparation(key); }
  async function render(key) {
    return locked(async () => {
      const snapshot = await stable(), keys = select(key).map(c => c.key);
      for (const k of keys) await prepared(k);
      write(file('render-request.json'), { keys });
      const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
        file('render.ps1'), '-Script', file('compose.jsx')], file('photoshop.log'));
      for (const k of keys) await prepared(k);
      assert.deepEqual(await stable(), snapshot); return { rendered: keys, output };
    });
  }
  async function verify(key) {
    return locked(async () => {
      const snapshot = await stable(), results = [];
      for (const spec of select(key)) {
        await prepared(spec.key);
        const dir = file('cards/' + spec.key), p = read(path.join(dir, 'profile.json'));
        M.validateProfile(p, spec);
        const result = await require('../../collaborations/nier-pilot-01/build.cjs').verifyNative(dir, p);
        if (p.element === 'NONE') {
          const plan = read(path.join(dir,'render/composition.json'));
          result.none = await require('../../collaborations/ff8-set-01/build.cjs').createBuilder().noneProof(dir,plan,read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json')));
        }
        const native = read(path.join(dir, 'render/native.json'));
        T.verify(native); assert.equal(native.photoshop, '26.11.7');
        const description = native.layers.find(l => l.name === 'DESCRIPTION');
        assert.ok(description.text.split('\r').length <= 4, 'Description depasse quatre lignes : ' + spec.key);
        await prepared(spec.key);
        results.push({ ...result, key: spec.key, preparationHash: guard.digest(path.join(dir, 'preparation.json')) });
      }
      await game(); assert.deepEqual(await stable(), snapshot); guard.assertExisting();
      for (const r of results) write(file('cards/' + r.key + '/verification.json'), r);
      return { verified: results.length };
    });
  }
  return { check, draft, crop, prepare, render, verify, prepared, allProfiles, game, sources };
}
async function main(args = process.argv.slice(2), builder) {
  const [action = 'check', key] = args;
  assert.ok(args.length <= 2 && ['check', 'draft', 'prepare', 'render', 'verify'].includes(action), 'Usage: node build.cjs [check|draft|prepare|render|verify] [key]');
  return (builder || createBuilder())[action](key);
}
module.exports = { createBuilder, main };
if (require.main === module) main().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
