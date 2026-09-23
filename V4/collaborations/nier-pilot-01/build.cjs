'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs'), R = require('../../atelier/designer-render.cjs');
const M = require('./model.cjs'), { GEOMETRY, FLAG } = require('./assets.cjs');
const { fs, path, assert, read, write, sharp, ROOT, hash, crypto } = L;
const home = __dirname, file = name => L.inside(home, name), set = () => M.validateSet(read(file('set.json')));
const select = key => { const cards = set().cards.filter(c => !key || c.key === key); assert.ok(cards.length, 'Carte inconnue.'); return cards; };
const allProfiles = () => set().cards.map(s => M.profile(s, D));
async function hashes(files) { const h = {}; for (const f of files) h[f] = await hash(f); return h; }
const snapshots = () => hashes(['V4/atelier/data/references.json', 'V4/atelier/data/regression.json', 'V4/atelier/designer-assets/manifest.json'].map(f => path.join(ROOT, f)));
async function stable() { await L.protectedCheck(); await R.verifyAssets(); return snapshots(); }
async function locked(action) {
  const lock = path.join(L.DATA, 'render.lock'), owner = crypto.randomUUID(); let fd;
  try { fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ id: owner, pid: process.pid, kind: 'nier-pilot' })); return await action(); }
  finally { if (fd !== undefined) { fs.closeSync(fd); if (fs.existsSync(lock) && read(lock).id === owner) fs.unlinkSync(lock); } }
}
async function game() {
  const profiles = allProfiles(), published = D.catalogue().cards.filter(c => c.kind === 'created' && !profiles.some(p => p.id === c.id));
  published.push(...profiles.map(profile => ({ id: profile.id, profile, pngUrl: '/media/created/' + profile.id + '.png' })));
  const data = await require('../../atelier/game-catalog.cjs').buildCatalog({ published });
  M.validateGame(data, set(), require('../../site/engine.js').createEngine); return data;
}
async function check(key) {
  const cards = select(key), ids = new Set(D.catalogue().cards.map(c => c.id));
  for (const c of cards) assert.ok(!ids.has(c.id) && !fs.existsSync(path.join(ROOT, 'V4/creations', c.id)), 'ID deja utilise : ' + c.id);
  await game();
  return { cards: cards.length, ids: cards.map(c => c.id), fullDeck: false, arenas: [], missing: ['flag-NieR-packed.png', 'faction.json', 'race-components.json', 'components/race-ANDROID.png', 'components/weapon-Katana.png', 'weapon-katana.json', ...cards.map(c => 'art/' + c.key + '.png')].filter(n => !fs.existsSync(file(n))) };
}
async function prepare(key) {
  assert.deepEqual((await check(key)).missing, [], 'Assets manquants.');
  return locked(async () => {
    const snapshot = await stable(), race = read(file('race-components.json')).races.ANDROID;
    assert.equal(await hash(file('components/race-ANDROID.png')), race.sha256);
    assert.deepEqual(read(file('faction.json')).packedGeometry, FLAG);
    for (const spec of select(key)) {
      const dir = file('cards/' + spec.key), render = path.join(dir, 'render'), p = M.profile(spec, D), art = file('art/' + spec.key + '.png');
      fs.mkdirSync(render, { recursive: true });
      if (fs.existsSync(path.join(dir, 'verification.json'))) fs.renameSync(path.join(dir, 'verification.json'), path.join(dir, 'verification.stale-' + crypto.randomUUID() + '.json'));
      write(path.join(dir, 'profile.json'), p); fs.copyFileSync(art, path.join(dir, 'illustration.png'));
      const donor = M.donor(spec, D), layers = await R.components(donor, { id: p.id, positionsText: true });
      layers[0] = { ...layers[0], input: await sharp(art).resize(R.ART.width, R.ART.height, { fit: 'cover' }).png().toBuffer() };
      layers[layers.findIndex(l => l.name === 'FACTION - Chroma')] = { ...FLAG, name: 'FACTION - NieR', input: file('flag-NieR-packed.png') };
      layers[layers.findIndex(l => l.name === 'RACE - HUMAIN')] = { ...GEOMETRY, name: 'RACE - ANDROID', input: file('components/race-ANDROID.png') };
      if (spec.weapon === 'Katana') layers[layers.findIndex(l => l.name === 'ARME - Dague')] = { ...GEOMETRY, left: 89, name: 'ARME - Katana', input: file('components/weapon-Katana.png') };
      await sharp(await R.composite(layers)).composite(await require('./typography.cjs').preview({ ...donor, race: p.race }, R)).png().toFile(path.join(dir, 'preview.png'));
      const native = layers.filter(l => !l.name.startsWith('POSITION SLOT ')), plan = { textSource: L.baseline().cards.find(c => c.key === 'ruby').psd, layers: [] };
      for (const [i, l] of native.entries()) {
        const name = 'component-' + String(i).padStart(2, '0') + '.png'; await sharp(l.input).png().toFile(path.join(render, name));
        plan.layers.push({ file: name, name: l.name, left: l.left, top: l.top, width: l.width, height: l.height });
      }
      write(path.join(render, 'composition.json'), plan); await sharp(await R.composite(native)).png().toFile(path.join(render, 'expected-components.png'));
      const inputs = ['set.json', 'build.cjs', 'model.cjs', 'assets.cjs', 'compose.jsx', 'compose-one.jsx', 'typography.cjs', 'typography.jsx', 'race-components.json', 'components/race-ANDROID.png', 'components/weapon-Katana.png', 'weapon-katana.json', 'flag-NieR-packed.png', 'faction.json'].map(file);
      inputs.push(art, path.join(dir, 'profile.json'), path.join(dir, 'illustration.png'), path.join(render, 'composition.json'), path.join(render, 'expected-components.png'), ...plan.layers.map(l => path.join(render, l.file)));
      write(path.join(dir, 'preparation.json'), { referenceId: L.baseline().id, snapshot, inputs: await hashes(inputs) });
    }
    assert.deepEqual(await stable(), snapshot); return { prepared: select(key).map(c => c.key), photoshopRun: false };
  });
}
async function prepared(key) {
  const prep = read(file('cards/' + key + '/preparation.json'));
  assert.equal(prep.referenceId, L.baseline().id); assert.deepEqual(await snapshots(), prep.snapshot);
  assert.deepEqual(await hashes(Object.keys(prep.inputs)), prep.inputs, 'Preparation obsolete.'); return prep;
}
async function render(key) {
  return locked(async () => {
    const keys = select(key).map(c => c.key), snapshot = await stable();
    for (const k of keys) await prepared(k);
    write(file('render-request.json'), { keys });
    const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File', path.join(ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', file('compose.jsx')], file('photoshop.log'));
    for (const k of keys) await prepared(k); assert.deepEqual(await stable(), snapshot); return { rendered: keys, output };
  });
}
async function verifyNative(dir, p) {
  const folder = path.join(dir, 'render'), n = read(path.join(folder, 'native.json')), plan = read(path.join(folder, 'composition.json'));
  assert.deepEqual([n.width, n.height, n.resolution], [897, 1497, 300]);
  if (p.collaboration === 'NieR') require('./typography.cjs').verify(n);
  const expected = { NOM: p.name, TITLE: p.title, JOB: p.job, RACE: p.race };
  for (const [side, faces] of [['ATK', p.atk], ['DEF', p.defense]]) faces.forEach((v, i) => { if (typeof v === 'number') expected[side + ' D' + (6 - i) + ' - valeur'] = String(v); });
  p.positions.forEach((v, i) => { expected['POSITION SLOT ' + (i + 1)] = String(v); });
  assert.deepEqual(Object.fromEntries(n.expected.map(e => [e.name, e.value])), expected);
  for (const e of n.expected) {
    const l = n.layers.find(l => l.name === e.name); assert.equal(l?.kind, 'LayerKind.TEXT'); assert.equal(l.text, e.value);
    assert.ok(Math.abs((l.ink[0] + l.ink[2]) / 2 - e.center[0]) <= 1 && Math.abs((l.ink[1] + l.ink[3]) / 2 - e.center[1]) <= 1 && l.ink[2] - l.ink[0] <= e.maxWidth + 1);
  }
  for (const spec of plan.layers) { const l = n.layers.find(l => l.name === spec.name); assert.equal(l?.kind, 'LayerKind.SMARTOBJECT'); assert.equal(l.visible, true); }
  const desc = n.layers.find(l => l.name === 'DESCRIPTION'); assert.equal(desc?.kind, 'LayerKind.TEXT');
  assert.equal(desc.text.replace(/\r/g, ' '), p.description); assert.ok(desc.ink[1] >= 1251 && desc.ink[3] <= 1387);
  const components = await require('../ff8-set-01/build.cjs').createBuilder().components(dir, plan);
  const roundtrip = await L.diff(path.join(dir, 'card.png'), path.join(folder, 'reopened.png')); assert.equal(roundtrip.changed, 0);
  const barcode = JSON.parse(await R.command(L.PYTHON, [path.join(ROOT, 'V4/atelier/barcode.py'), path.join(dir, 'card.png'), p.id])); assert.equal(barcode.passed, true);
  return { passed: true, modelId: p.id, referenceId: L.baseline().id, profileHash: await hash(path.join(dir, 'profile.json')), hashes: Object.fromEntries(await Promise.all(['card.png', 'card.psd'].map(async f => [f, await hash(path.join(dir, f))]))), components, roundtrip, barcode, checkedAt: new Date().toISOString() };
}
async function verify(key) {
  return locked(async () => {
    const snapshot = await stable(), results = [];
    for (const spec of select(key)) { await prepared(spec.key); const dir = file('cards/' + spec.key), p = read(path.join(dir, 'profile.json')); M.validateProfile(p, spec); results.push({ ...await verifyNative(dir, p), key: spec.key }); await prepared(spec.key); }
    await game(); assert.deepEqual(await stable(), snapshot);
    for (const r of results) write(file('cards/' + r.key + '/verification.json'), r);
    return { verified: results.length };
  });
}
module.exports = { check, prepare, render, verify, prepared, verifyNative, allProfiles, game, hashes, snapshots, locked };
if (require.main === module) {
  const [action = 'check', key] = process.argv.slice(2); assert.ok(['check', 'prepare', 'render', 'verify'].includes(action));
  module.exports[action](key).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
