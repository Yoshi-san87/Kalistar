'use strict';
const assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
const R = require('../../atelier/designer-render.cjs'), T = require('../../collaborations/nier-pilot-01/typography.cjs');
const M = require('./model.cjs');
const { fs, path, ROOT, read, write, sharp } = L;
const home = __dirname, file = name => path.join(home, name), dir = file('cards/raiden'), render = path.join(dir, 'render');
const guard = require('../2026-09-27-metal-gear-mines/preservation.cjs').createGuard(L, D, home);
const flagRoot = path.join(ROOT, 'V4/revisions/2026-09-27-mgs-banner-refinement/art-flags');
const flag = path.join(flagRoot, 'flag-MGS2-packed.png');
const spec = () => M.validateSet(read(file('set.json'))).cards[0];
const digest = files => Object.fromEntries(files.map(f => [guard.relative(f), guard.digest(f)]));
const locks = ['V4/atelier/data/references.json','V4/atelier/data/regression.json','V4/atelier/designer-assets/manifest.json'].map(f => path.join(ROOT, f));
const sources = () => ['set.json','prompt.json','model.cjs','build.cjs','compose.jsx','render.ps1'].map(file).concat(path.join(ROOT, M.artPath(spec())));
async function stable() {
  await L.protectedCheck(); await R.verifyAssets(); guard.assertExisting();
  return digest(locks);
}
async function locked(action) {
  const lock = path.join(L.DATA, 'render.lock'), owner = L.crypto.randomUUID(); let fd;
  try { fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ id: owner, pid: process.pid, kind: M.SET })); return await action(); }
  finally { if (fd !== undefined) { fs.closeSync(fd); if (read(lock).id === owner) fs.unlinkSync(lock); } }
}
async function game() {
  const p = M.profile(spec(), D), published = D.catalogue().cards.filter(c => c.kind === 'created' && c.id !== p.id);
  published.push({ id: p.id, profile: p, pngUrl: '/media/created/' + p.id + '.png' });
  const data = await require('../../atelier/game-catalog.cjs').buildCatalog({ published });
  M.validateGame(data, read(file('set.json')), require('../../site/engine.js').createEngine);
  return data;
}
async function freeze() {
  spec(); await L.protectedCheck(); await R.verifyAssets(); await game();
  assert.ok(!D.catalogue().cards.some(c => c.id === spec().id));
  assert.ok(!fs.existsSync(path.join(ROOT, 'V4/creations', spec().id)));
  const requests = path.join(L.DATA, 'designer/requests');
  if (fs.existsSync(requests)) for (const n of fs.readdirSync(requests).filter(n => n.endsWith('.json'))) assert.notEqual(read(path.join(requests, n)).modelId, spec().id);
  const deps = require('../2026-09-27-metal-gear-mines/freeze.cjs').files.concat([
    'V4/expansions/2026-09-27-metal-gear-mines/model.cjs',
    'V4/expansions/2026-09-27-metal-gear-mines/preservation.cjs',
    'V4/expansions/2026-09-27-metal-gear-mines/publication-core.cjs',
    'V4/expansions/2026-09-27-metal-gear-mines/compose-one.jsx'
  ]).map(f => path.join(ROOT, f)).concat(flag, path.join(flagRoot, 'factions.json'));
  if (!fs.existsSync(file('dependencies.json'))) write(file('dependencies.json'), digest(deps));
  const snapshot = guard.freeze();
  return { preservedCreations: snapshot.entries.length, referenceId: L.baseline().id };
}
async function prepare() {
  return locked(async () => {
    const snapshot = await stable(), c = spec(), p = M.profile(c, D), inputs = digest(sources());
    const donor = M.donor(c, D), layers = await R.components(donor, { id: p.id, positionsText: true });
    fs.mkdirSync(render, { recursive: true });
    const art = path.join(ROOT, M.artPath(c));
    layers[0] = { ...layers[0], input: await sharp(art).resize(R.ART.width, R.ART.height, { fit: 'cover' }).png().toBuffer() };
    const definition = read(path.join(flagRoot, 'factions.json')).factions.find(f => f.id === 'MGS2');
    assert.equal(guard.digest(path.join(flagRoot, definition.flag)), definition.flagHash);
    layers[layers.findIndex(l => l.name === 'FACTION - Chroma')] = { ...definition.packedGeometry, name: 'FACTION - MGS2', input: flag };
    write(path.join(dir, 'profile.json'), p); fs.copyFileSync(art, path.join(dir, 'illustration.png'));
    await sharp(await R.composite(layers)).composite(await T.preview(donor, R)).png().toFile(path.join(dir, 'preview.png'));
    const native = layers.filter(l => !l.name.startsWith('POSITION SLOT '));
    const plan = { textSource: L.baseline().cards.find(c => c.key === 'ruby').psd, layers: [] };
    for (const [i, l] of native.entries()) {
      const name = 'component-' + String(i).padStart(2, '0') + '.png';
      await sharp(l.input).png().toFile(path.join(render, name));
      plan.layers.push({ file: name, name: l.name, left: l.left, top: l.top, width: l.width, height: l.height });
    }
    write(path.join(render, 'composition.json'), plan);
    await sharp(await R.composite(native)).png().toFile(path.join(render, 'expected-components.png'));
    assert.deepEqual(digest(sources()), inputs);
    const generated = ['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(f => path.join(dir, f)).concat(plan.layers.map(l => path.join(render, l.file)));
    write(path.join(dir, 'preparation.json'), { referenceId: L.baseline().id, snapshot, existingSnapshotHash: guard.digest(guard.snapshotFile), inputs: { ...inputs, ...digest(generated) } });
    assert.deepEqual(await stable(), snapshot); return { prepared: p.id };
  });
}
async function native() {
  return locked(async () => {
    const snapshot = await stable(); guard.preparation('raiden');
    const output = await R.command('powershell.exe', ['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')], file('photoshop.log'));
    guard.preparation('raiden'); assert.deepEqual(await stable(), snapshot); return { rendered: spec().id, output };
  });
}
async function verify() {
  return locked(async () => {
    const snapshot = await stable(); guard.preparation('raiden');
    const p = read(path.join(dir, 'profile.json')); M.validateProfile(p, spec());
    const proof = await require('../../collaborations/nier-pilot-01/build.cjs').verifyNative(dir, p);
    const n = read(path.join(render, 'native.json')); T.verify(n); assert.equal(n.photoshop, '26.11.7');
    assert.ok(n.layers.find(l => l.name === 'DESCRIPTION').text.split('\r').length <= 4);
    assert.deepEqual(n.layers.find(l => l.name === 'FACTION - MGS2').bounds, [672,829,770,1052]);
    await game(); guard.preparation('raiden'); assert.deepEqual(await stable(), snapshot);
    write(path.join(dir, 'verification.json'), { ...proof, preparationHash: guard.digest(path.join(dir, 'preparation.json')), typography: true });
    return { verified: p.id, ...proof };
  });
}
async function publish() {
  guard.publication();
  const guardedL = { ...L, write(f, value) { if (path.resolve(f) === path.resolve(D.CATALOGUE)) { guard.publication(); guard.assertExisting(undefined, value); } return write(f, value); } };
  const pub = require('../2026-09-27-metal-gear-mines/publication-core.cjs').createPublisher({ L: guardedL, D, home, model: M });
  await pub.preflight(); const result = await pub.publish(); guard.publication();
  return result;
}
const actions = { freeze, prepare, render: native, verify, publish, game };
module.exports = { ...actions, guard };
if (require.main === module) {
  const action = process.argv[2]; assert.ok(Object.hasOwn(actions, action));
  actions[action]().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
