'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs'), R = require('../../atelier/designer-render.cjs');
const T = require('../../collaborations/nier-pilot-01/typography.cjs'), M = require('./model.cjs');
const {fs, path, ROOT, read, write, sharp, assert} = L;
const home = __dirname, file = n => path.join(home, n);
const guard = require('../2026-09-27-metal-gear-mines/preservation.cjs').createGuard(L, D, home);
const set = () => M.validateSet(read(file('set.json')));
const digest = files => Object.fromEntries(files.map(f => [guard.relative(f), guard.digest(f)]));
const own = ['set.json','model.cjs','build.cjs','compose.jsx','render.ps1','publish.cjs'].map(file);
const dependencies = [
  'V4/expansions/2026-10-05-cryptown-sentinel/runtime-26118.inputs.json',
  'V4/expansions/2026-10-05-cryptown-sentinel/runtime-26118.calibration.json',
  'V4/atelier/data/references.json','V4/atelier/designer-assets/manifest.json',
  'V4/atelier/designer-assets/race-extensions.json','V4/template-stable/icon-layouts.json',
  'V4/atelier/designer-core.cjs','V4/atelier/designer-render.cjs',
  'V4/collaborations/nier-pilot-01/typography.jsx','V4/collaborations/nier-pilot-01/typography.cjs',
  'V4/collaborations/nier-pilot-01/assets.cjs','V4/collaborations/nier-pilot-01/faction.json',
  'V4/collaborations/nier-pilot-01/flag-NieR-packed.png',
  'V4/expansions/2026-10-04-city-guards/compose-one.jsx',
  'V4/expansions/2026-09-27-metal-gear-mines/model.cjs',
  'V4/expansions/2026-09-27-metal-gear-mines/preservation.cjs',
  'V4/expansions/2026-09-27-metal-gear-mines/publication-core.cjs'
].map(f => path.join(ROOT, f));
async function calibration() {
  const prior = path.join(ROOT, 'V4/expansions/2026-10-05-cryptown-sentinel');
  const inputs = read(path.join(prior, 'runtime-26118.inputs.json'));
  const proof = read(path.join(prior, 'runtime-26118.calibration.json'));
  assert.equal(inputs.photoshop, '26.11.8'); assert.equal(proof.photoshop, inputs.photoshop);
  assert.equal(proof.passed, true); assert.equal(proof.results.length, 3);
  assert(proof.results.every(r => r.comparison.changed === 0));
  for (const [relative, hash] of Object.entries(inputs.hashes)) assert.equal(guard.digest(path.join(ROOT,relative)), hash, 'Runtime calibration source changed: ' + relative);
}
async function stable() { await calibration(); await L.protectedCheck(); await R.verifyAssets(); guard.assertExisting(); }
async function locked(fn) {
  const lock = path.join(L.DATA, 'render.lock'), id = L.crypto.randomUUID();
  let fd;
  try { fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({id, pid: process.pid, kind: M.SET})); return await fn(); }
  finally { if (fd !== undefined) { fs.closeSync(fd); if (read(lock).id === id) fs.unlinkSync(lock); } }
}
async function freeze() {
  assert(!fs.existsSync(file('dependencies.json')), 'Never replace a frozen dependency manifest');
  set(); await calibration(); await L.protectedCheck(); await R.verifyAssets();
  for (const c of set().cards) {
    assert(!D.catalogue().cards.some(p => p.id === c.id), 'Model ID already exists');
    assert(D.catalogue().cards.some(p => p.id === c.lineage), 'Missing original edition');
    assert(!fs.existsSync(path.join(ROOT, 'V4/creations', c.id)));
  }
  write(file('dependencies.json'), digest(own.concat(dependencies)));
  return {existing: guard.freeze().entries.length};
}
async function game() {
  const profiles = set().cards.map(c => M.profile(c, D));
  const published = D.catalogue().cards.filter(c => c.kind === 'created' && !profiles.some(p => p.id === c.id));
  published.push(...profiles.map(profile => ({id: profile.id, profile, pngUrl: '/media/created/' + profile.id + '.png'})));
  const data = await require('../../atelier/game-catalog.cjs').buildCatalog({published});
  return M.validateGame(data, set(), require('../../site/engine.js').createEngine);
}
async function prepare() { return locked(async () => {
  await stable();
  const snapshot = digest([path.join(ROOT, 'V4/atelier/data/references.json'), path.join(ROOT, 'V4/atelier/designer-assets/manifest.json')]);
  for (const c of set().cards) {
    const out = file('cards/' + c.key), render = path.join(out, 'render'), p = M.profile(c, D);
    const donor = M.donor(c, D), art = path.join(ROOT, M.artPath(c));
    fs.mkdirSync(render, {recursive: true});
    const layers = await R.components(donor, {id: p.id, positionsText: true});
    layers[0] = {...layers[0], input: await sharp(art).resize(R.ART.width, R.ART.height, {fit: 'cover'}).png().toBuffer()};
    if(c.collaboration==='NieR') {
      const index=layers.findIndex(l=>l.name==='FACTION - Chroma');
      assert(index>=0);
      layers[index]={...require('../../collaborations/nier-pilot-01/assets.cjs').FLAG,
        name:'FACTION - NieR',input:path.join(ROOT,'V4/collaborations/nier-pilot-01/flag-NieR-packed.png')};
    }
    write(path.join(out, 'profile.json'), p);
    fs.copyFileSync(art, path.join(out, 'illustration.png'));
    await sharp(await R.composite(layers)).composite(await T.preview(donor, R)).png().toFile(path.join(out, 'preview.png'));
    const native = layers.filter(l => !l.name.startsWith('POSITION SLOT '));
    const plan = {textSource: L.baseline().cards.find(c => c.key === 'ruby').psd, layers: []};
    for (const [i, l] of native.entries()) {
      const name = 'component-' + String(i).padStart(2, '0') + '.png';
      await sharp(l.input).png().toFile(path.join(render, name));
      plan.layers.push({file: name, name: l.name, left: l.left, top: l.top, width: l.width, height: l.height});
    }
    write(path.join(render, 'composition.json'), plan);
    await sharp(await R.composite(native)).png().toFile(path.join(render, 'expected-components.png'));
    const generated = ['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(f => path.join(out, f))
      .concat(plan.layers.map(l => path.join(render, l.file)));
    write(path.join(out, 'preparation.json'), {referenceId: L.baseline().id, snapshot, existingSnapshotHash: guard.digest(guard.snapshotFile), inputs: digest(own.concat(art, generated))});
  }
  await stable();
  return {prepared: set().cards.map(c => c.id)};
}); }
async function render() {
  assert.equal(process.env.KALISTAR_VARIANTS_PS, '2026-10-06', 'Explicit Photoshop handshake required');
  return locked(async () => {
    await stable(); set().cards.forEach(c => guard.preparation(c.key));
    const output = await R.command('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
      ['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')], file('photoshop.log'));
    set().cards.forEach(c => guard.preparation(c.key)); await stable();
    return {rendered: set().cards.map(c => c.id), output};
  });
}
async function verify() { return locked(async () => {
  await stable(); const checks = [];
  for (const c of set().cards) {
    guard.preparation(c.key);
    const out = file('cards/' + c.key), p = read(path.join(out, 'profile.json'));
    M.validateProfile(p, c);
    const proof = await require('../../collaborations/nier-pilot-01/build.cjs').verifyNative(out, p);
    const n = read(path.join(out, 'render/native.json'));
    T.verify(n);
    assert.equal(n.photoshop, '26.11.8');
    assert(n.layers.find(l => l.name === 'DESCRIPTION').text.split('\r').length <= 4);
    write(path.join(out, 'verification.json'), {...proof, preparationHash: guard.digest(path.join(out, 'preparation.json')), typography: true});
    await sharp(path.join(out, 'card.png')).resize({width: 300}).png().toFile(path.join(out, 'small.png'));
    checks.push({id:c.id, fixed:proof.components.fixedDifferences, reopened:proof.roundtrip.changed, barcode:proof.barcode.passed});
  }
  await game(); await stable(); write(file('native-checks.json'), checks); return checks;
}); }
module.exports = {freeze, prepare, render, verify, game, guard};
if (require.main === module) {
  const [action] = process.argv.slice(2); assert(Object.hasOwn(module.exports, action));
  module.exports[action]().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => {console.error(e); process.exitCode = 1;});
}
