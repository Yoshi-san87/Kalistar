'use strict';
const assert = require('node:assert/strict');
const M = require('./model.cjs');
const { GEOMETRY: WEAPON_GEOMETRY } = require('./weapon-fleau.cjs');
const GEOMETRY = { left: 672, top: 829, width: 98, height: 223 };
function createBuilder(options = {}) {
  const L = options.L || require('../../atelier/lib.cjs'), D = options.D || require('../../atelier/designer-core.cjs');
  const R = options.R || require('../../atelier/designer-render.cjs');
  const buildCatalog = options.buildCatalog || require('../../atelier/game-catalog.cjs').buildCatalog;
  const createEngine = options.createEngine || require('../../site/engine.js').createEngine;
  const { fs, path, read, write, sharp, ROOT, crypto } = L;
  const home = L.inside(ROOT, options.home || __dirname), file = name => L.inside(home, name);
  const bank = path.join(ROOT, 'V4/atelier/designer-assets');
  const projectile = path.join(ROOT, 'V4/collaborations/ff7-set-01/weapon-projectile.png');
  const weaponOverrides = { Projectile: projectile, 'Fl\u00e9au': file('weapon-fleau.png') };
  const weaponInputs = [...Object.values(weaponOverrides), file('weapon-fleau.svg'), file('weapon-fleau.cjs')];
  const set = () => M.validateSet(read(file('set.json')));
  const select = key => { const cards = set().cards.filter(c => !key || c.key === key); assert.ok(cards.length, 'Personnage inconnu.'); return cards; };
  const allProfiles = () => set().cards.map(c => M.profile(c, D, read(path.join(ROOT, 'V3/donnees/armes.json'))));
  async function hashes(files) { const result = {}; for (const f of files) result[f] = await L.hash(f); return result; }
  const snapshots = () => hashes(['V4/atelier/data/references.json', 'V4/atelier/data/regression.json', 'V4/atelier/designer-assets/manifest.json'].map(p => path.join(ROOT, p)));
  async function stable() {
    await L.protectedCheck(); await R.verifyAssets();
    return snapshots();
  }
  async function png(f, dimensions) {
    const m = await sharp(f).metadata(); assert.ok(m.format === 'png' && m.width > 0 && m.height > 0, 'PNG requis : ' + f);
    if (dimensions) assert.deepEqual([m.width, m.height], dimensions, 'Dimensions incorrectes : ' + f);
  }
  async function game() {
    const profiles = allProfiles(), cat = D.catalogue();
    const published = [...cat.cards.filter(c => c.kind === 'created' && !profiles.some(p => p.id === c.id)),
      ...profiles.map(profile => ({ id: profile.id, profile, pngUrl: '/media/created/' + profile.id + '.png' }))];
    return M.validateGame(await buildCatalog({ published }), set(), createEngine);
  }
  async function check(key) {
    const specs = select(key), taken = new Set(D.catalogue().cards.map(c => c.id));
    for (const p of allProfiles()) assert.ok(!taken.has(p.id) && !fs.existsSync(path.join(ROOT, 'V4/creations', p.id)), 'ID deja utilise : ' + p.id);
    const required = [file('flag-FF8-packed.png'), file('faction.json'), ...weaponInputs, ...specs.map(s => file('illustrations/' + s.key + '.png'))];
    return { missing: required.filter(f => !fs.existsSync(f)), presets: await game(), cards: specs.length };
  }
  async function locked(action) {
    const lock = path.join(L.DATA, 'render.lock'), id = crypto.randomUUID(); let fd;
    try {
      fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, id, kind: 'ff8-production' }));
      return await action();
    } finally { if (fd !== undefined) { fs.closeSync(fd); if (fs.existsSync(lock) && read(lock).id === id) fs.unlinkSync(lock); } }
  }
  async function prepare(key) {
    const status = await check(key); assert.deepEqual(status.missing, [], 'Images ou drapeau encore absents.');
    return locked(async () => {
      const snapshot = await stable(), manifest = read(path.join(bank, 'manifest.json'));
      assert.deepEqual(read(file('faction.json')).packedGeometry, GEOMETRY, 'Geometrie du drapeau FF8 incorrecte.');
      await png(file('flag-FF8-packed.png'), [98, 223]);
      for (const icon of Object.values(weaponOverrides)) await png(icon, [96, 95]);
      const profiles = allProfiles();
      for (const spec of select(key)) {
        const dir = file('cards/' + spec.key), render = path.join(dir, 'render'), p = profiles.find(c => c.id === spec.id);
        const art = file('illustrations/' + spec.key + '.png'); await png(art);
        fs.mkdirSync(render, { recursive: true });
        // Keep stale proofs for inspection, but never let them authorize a newly prepared image.
        const proof = path.join(dir, 'verification.json');
        if (fs.existsSync(proof)) fs.renameSync(proof, path.join(dir, 'verification.stale-' + crypto.randomUUID() + '.json'));
        write(path.join(dir, 'profile.json'), p); fs.copyFileSync(art, path.join(dir, 'illustration.png'));
        const donor = M.donor(spec, D), layers = await R.components(donor, { id: p.id, positionsText: true });
        layers[0] = { ...layers[0], input: await sharp(art).resize(R.ART.width, R.ART.height, { fit: 'cover' }).png().toBuffer() };
        const fi = layers.findIndex(l => l.name === 'FACTION - Chroma'); assert.ok(fi >= 0);
        layers[fi] = { ...GEOMETRY, input: file('flag-FF8-packed.png'), name: 'FACTION - FF8' };
        if (weaponOverrides[spec.weapon]) {
          const wi = layers.findIndex(l => l.name === 'ARME - ' + M.WEAPON_DONORS[spec.weapon]); assert.ok(wi >= 0);
          layers[wi] = { input: weaponOverrides[spec.weapon], ...WEAPON_GEOMETRY, name: 'ARME - ' + spec.weapon };
        }
        await sharp(await R.composite(layers)).composite(await R.previewText(donor)).png().toFile(path.join(dir, 'preview.png'));
        const nativeLayers = layers.filter(l => !l.name.startsWith('POSITION SLOT '));
        const plan = { textSource: L.baseline().cards.find(c => c.key === 'ruby').psd, layers: [] };
        for (const [i, l] of nativeLayers.entries()) {
          const name = 'component-' + String(i).padStart(2, '0') + '.png'; await sharp(l.input).png().toFile(path.join(render, name));
          plan.layers.push({ file: name, name: l.name, left: l.left, top: l.top, width: l.width, height: l.height });
        }
        write(path.join(render, 'composition.json'), plan);
        await sharp(await R.composite(nativeLayers)).png().toFile(path.join(render, 'expected-components.png'));
        const inputs = [file('set.json'), file('faction.json'), file('flag-FF8-packed.png'), ...weaponInputs, art,
          file('build.cjs'), file('model.cjs'), file('compose.jsx'), file('compose-one.jsx'),
          path.join(dir, 'profile.json'), path.join(dir, 'illustration.png'), path.join(render, 'composition.json'), path.join(render, 'expected-components.png'),
          ...plan.layers.map(l => path.join(render, l.file))];
        const none = spec.element === 'NONE' ? await noneProof(dir, plan, manifest) : null;
        write(path.join(dir, 'preparation.json'), { referenceId: L.baseline().id, snapshot, inputs: await hashes(inputs), none });
      }
      assert.deepEqual(await stable(), snapshot, 'Sources protegees modifiees.');
      write(file('decks.json'), status.presets); return { prepared: status.cards, presets: status.presets };
    });
  }
  async function prepared(key) {
    const dir = file('cards/' + key), prep = read(path.join(dir, 'preparation.json'));
    assert.equal(prep.referenceId, L.baseline().id);
    assert.deepEqual(await hashes(Object.keys(prep.inputs)), prep.inputs, 'Preparation modifiee ; relancer prepare.');
    assert.deepEqual(await snapshots(), prep.snapshot, 'References modifiees.'); return prep;
  }
  async function render(key) {
    return locked(async () => {
      const snapshot = await stable();
      const keys = select(key).map(c => c.key);
      for (const k of keys) await prepared(k);
      write(file('render-request.json'), { keys });
      const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
        path.join(ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', file('compose.jsx')], file('photoshop.log'));
      for (const k of keys) await prepared(k);
      assert.deepEqual(await stable(), snapshot); return { rendered: keys, output };
    });
  }
  async function noneProof(dir, plan, manifest) {
    const none = { unlit: true };
    for (const [kind, name] of [['crystal', 'CRISTAL NONE'], ['branch', 'BRANCHES NONE - couleur du cristal']]) {
      const layer = plan.layers.find(l => l.name === name); assert.ok(layer, 'Composant NONE eteint manquant.');
      const source = L.inside(bank, manifest.elements.NONE[kind].file);
      assert.equal((await L.diff(path.join(dir, 'render', layer.file), source)).changed, 0, 'Composant NONE non identique.');
      none[kind + 'Hash'] = await L.hash(source);
    }
    assert.ok(!plan.layers.some(l => /HALO MAGIQUE|BARRIERE/.test(l.name)), 'Lumiere elementaire sur NONE.'); return none;
  }
  async function components(dir, plan) {
    const pixels = f => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const folder = path.join(dir, 'render'), a = await pixels(path.join(folder, 'expected-components.png')),
      b = await pixels(path.join(folder, 'without-text.png')), frame = await pixels(path.join(folder, plan.layers[1].file));
    assert.deepEqual(a.info, b.info); assert.equal(a.info.width, 897); assert.equal(a.info.height, 1497);
    const fixed = new Uint8Array(897 * 1497);
    for (let i = 0; i < fixed.length; i++) fixed[i] = frame.data[i * 4 + 3] === 255 ? 1 : 0;
    for (const l of plan.layers.slice(2)) {
      const v = await pixels(path.join(folder, l.file));
      for (let y = 0; y < v.info.height; y++) for (let x = 0; x < v.info.width; x++) if (v.data[(y * v.info.width + x) * 4 + 3]) fixed[(y + l.top) * 897 + x + l.left] = 0;
    }
    const result = { fixedDifferences: 0, severePixels: 0, changed: 0 };
    for (let i = 0; i < fixed.length; i++) {
      let d = 0; for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(a.data[i * 4 + c] - b.data[i * 4 + c]));
      if (d) { result.changed++; if (d > 2) result.severePixels++; if (fixed[i]) result.fixedDifferences++; }
    }
    assert.equal(result.fixedDifferences, 0); assert.equal(result.severePixels, 0); return result;
  }
  async function verify(key) {
    return locked(async () => {
      const snapshot = await stable();
      const results = [], manifest = read(path.join(bank, 'manifest.json'));
      for (const spec of select(key)) {
        await prepared(spec.key);
        const dir = file('cards/' + spec.key), p = read(path.join(dir, 'profile.json')), folder = path.join(dir, 'render');
        M.validateProfile(p, spec); await png(path.join(dir, 'card.png'), [897, 1497]);
        const native = read(path.join(folder, 'native.json')), plan = read(path.join(folder, 'composition.json'));
        assert.deepEqual([native.width, native.height, native.resolution], [897, 1497, 300]);
        const expected = { NOM: p.name, TITLE: p.title, JOB: p.job, RACE: p.race };
        for (const [side, faces] of [['ATK', p.atk], ['DEF', p.defense]]) faces.forEach((v, i) => { if (typeof v === 'number') expected[side + ' D' + (6 - i) + ' - valeur'] = String(v); });
        p.positions.forEach((v, i) => { expected['POSITION SLOT ' + (i + 1)] = String(v); });
        assert.deepEqual(Object.fromEntries(native.expected.map(e => [e.name, e.value])), expected, 'Champs natifs incomplets.');
        for (const e of native.expected) {
          const layer = native.layers.find(l => l.name === e.name);
          assert.equal(layer?.kind, 'LayerKind.TEXT'); assert.equal(layer.text, e.value);
          assert.ok(Math.abs((layer.ink[0] + layer.ink[2]) / 2 - e.center[0]) <= 1 && Math.abs((layer.ink[1] + layer.ink[3]) / 2 - e.center[1]) <= 1);
          assert.ok(layer.ink[2] - layer.ink[0] <= e.maxWidth + 1);
        }
        for (const l of plan.layers) { const layer = native.layers.find(n => n.name === l.name); assert.equal(layer?.kind, 'LayerKind.SMARTOBJECT'); assert.ok(layer.visible); }
        const desc = native.layers.find(l => l.name === 'DESCRIPTION'); assert.equal(desc?.kind, 'LayerKind.TEXT');
        assert.equal(desc.text.replace(/\r/g, ' '), p.description); assert.ok(desc.ink[1] >= 1251 && desc.ink[3] <= 1387);
        const fixed = await components(dir, plan), roundtrip = await L.diff(path.join(dir, 'card.png'), path.join(folder, 'reopened.png'));
        assert.equal(roundtrip.changed, 0);
        const barcode = JSON.parse(await R.command(L.PYTHON, [path.join(ROOT, 'V4/atelier/barcode.py'), path.join(dir, 'card.png'), p.id]));
        assert.equal(barcode.passed, true);
        const none = p.element === 'NONE' ? await noneProof(dir, plan, manifest) : null;
        await prepared(spec.key);
        results.push({ passed: true, key: spec.key, modelId: p.id, referenceId: L.baseline().id, profileHash: await L.hash(path.join(dir, 'profile.json')),
          hashes: { 'card.png': await L.hash(path.join(dir, 'card.png')), 'card.psd': await L.hash(path.join(dir, 'card.psd')) },
          components: fixed, roundtrip, barcode, ...(none ? { none } : {}), checkedAt: new Date().toISOString() });
      }
      await game(); assert.deepEqual(await stable(), snapshot);
      for (const result of results) write(file('cards/' + result.key + '/verification.json'), result);
      if (!key) write(file('verification.json'), { passed: true, cards: results.length, results });
      return { verified: results.length };
    });
  }
  return { check, prepare, render, verify, allProfiles, noneProof, components };
}
async function main(args = process.argv.slice(2), builder) {
  const [action = 'check', key] = args;
  assert.ok(args.length <= 2 && ['check', 'prepare', 'render', 'verify'].includes(action), 'Usage: node build.cjs [check|prepare|render|verify] [key]');
  builder ||= createBuilder(); return builder[action](key);
}
module.exports = { createBuilder, main, GEOMETRY };
if (require.main === module) main().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
