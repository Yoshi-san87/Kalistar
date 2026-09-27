'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
const B = require('../../collaborations/nier-pilot-01/build.cjs');
const M = require('./model.cjs');
const { unchangedLayers } = require('../2026-09-27-artwork-refresh/revise.cjs');
const { transactionIO } = require('../2026-09-23-nier-art-refinement/transaction.cjs');
const cropper = require('../../expansions/2026-09-27-metal-gear-mines/build.cjs').createBuilder();
const flags = require('../../expansions/2026-09-27-metal-gear-mines/assets.cjs').createAssets(L, __dirname);
const { fs, path, assert, read, write, hash, ROOT, sharp, crypto } = L;
const file = n => L.inside(__dirname, n), root = n => L.inside(ROOT, n);
const rel = f => path.relative(ROOT, f).replaceAll('\\', '/');
const catalogue = root('V4/donnees/catalogue.json');
const creation = c => root('V4/creations/' + c.id), work = c => file('work/' + c.key);
const shared = ['card.psd', 'card.png', 'verification.json'];
const select = key => { const cards = M.specs().filter(c => !key || c.key === key); assert.ok(cards.length, 'Carte inconnue.'); return cards; };
const outputs = c => [...shared, ...(c.crop ? ['profile.json'] : []), 'creation.json'];
const targets = () => M.specs().flatMap(c => outputs(c).map(n => path.join(creation(c), n))).concat(catalogue);
const original = f => file('originals/' + rel(f)), stage = f => file('staging/' + rel(f));
const tx = transactionIO(L, file('transaction.json'));
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    assert.ok(!e.isSymbolicLink(), 'Lien interdit.');
    const f = path.join(dir, e.name); return e.isDirectory() ? files(f) : [f];
  }).sort();
}
function copy(from, to) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL); }
async function stable() { await L.protectedCheck(); await R.verifyAssets(); await flags.verify(); }
async function guard(b, mode = 'original', after = {}) {
  assert.equal(b.revision, M.REVISION); assert.equal(b.referenceId, L.baseline().id);
  assert.deepEqual(b.cards, M.specs()); assert.deepEqual(b.changes.map(c => c.target), targets());
  for (const c of b.changes) {
    assert.equal(c.backup, original(c.target)); assert.equal(c.stage, stage(c.target));
    assert.equal(c.beforeHash, b.observed[c.target]);
  }
  for (const [f, expected] of Object.entries(b.observed)) {
    if (mode === 'mixed' && targets().includes(f)) continue;
    assert.equal(await hash(f), mode === 'published' && targets().includes(f) ? after[f] : expected, 'Source modifiee : ' + f);
  }
  for (const [f, expected] of Object.entries(b.backups)) assert.equal(await hash(f), expected, 'Sauvegarde modifiee : ' + f);
}
function revisedCatalogue(before, revisions) {
  const next = structuredClone(before);
  assert.deepEqual(Object.keys(revisions).sort(), M.specs().map(c => c.id).sort());
  for (const c of M.specs()) {
    const matches = next.cards.filter(v => v.id === c.id);
    assert.equal(matches.length, 1); assert.equal(matches[0].kind, 'created');
    matches[0].nativeRevision = revisions[c.id];
    matches[0].profile = M.profile(matches[0].profile, c);
  }
  return next;
}
const game = cat => require('../../atelier/game-catalog.cjs').buildCatalog({ published: cat.cards.filter(c => c.kind === 'created') });
async function check() {
  await flags.verify(); const cat = read(catalogue), cards = [];
  for (const c of M.specs()) {
    const p = read(path.join(creation(c), 'profile.json')), row = cat.cards.find(v => v.id === c.id);
    assert.equal(p.id, c.id); assert.equal(row.kind, 'created'); assert.deepEqual(row.profile, p);
    if (c.faction) assert.equal(p.faction, c.faction);
    if (c.crop) assert.equal(await hash(root('V4/Illustrations/' + c.art)), await hash(path.join(creation(c), 'illustration.png')));
    const evidence = root(c.evidence), plan = read(path.join(evidence, 'render/composition.json'));
    for (const name of M.names(c)) {
      const item = plan.layers.find(l => l.name === name); assert.ok(item, 'Objet absent : ' + name);
      assert.deepEqual([item.left, item.top, item.width, item.height], name === M.ART ? [80, 156, 737, 921] : [672, 829, 98, 223]);
    }
    for (const name of ['card.png', 'card.psd', 'profile.json']) assert.equal(await hash(path.join(evidence, name)), await hash(path.join(creation(c), name)), 'Preuve native obsolete : ' + c.key + '/' + name);
    cards.push({ key: c.key, id: c.id, replacements: M.names(c), crop: c.crop || null });
  }
  return { revision: M.REVISION, cards, referenceId: L.baseline().id, prepared: fs.existsSync(file('before.json')), productionChanged: false };
}
async function prepare({ goPrepare = false } = {}) {
  assert.equal(goPrepare, true, 'GO preparation requis; ne lance pas Photoshop.');
  assert.ok(!fs.existsSync(file('before.json')) && !fs.existsSync(file('originals')), 'Instantane deja present.');
  await stable(); await check();
  const cat = read(catalogue), b = { revision: M.REVISION, referenceId: L.baseline().id,
    cards: M.specs(), catalogueCount: cat.cards.length, observed: {}, backups: {}, changes: [] };
  const observe = async f => { b.observed[f] = await hash(f); };
  for (const c of M.specs()) {
    const meta = read(path.join(creation(c), 'creation.json'));
    for (const [name, expected] of Object.entries(meta.hashes)) assert.equal(await hash(path.join(creation(c), name)), expected);
    const evidence = root(c.evidence);
    for (const f of files(creation(c)).concat(files(evidence))) await observe(f);
    const baseline = await B.verifyNative(evidence, read(path.join(creation(c), 'profile.json')));
    assert.equal(baseline.passed, true); write(file('baseline/' + c.key + '.json'), baseline);
  }
  const control = ['V4/atelier/data/references.json', 'V4/atelier/data/regression.json',
    'V4/atelier/designer-assets/manifest.json', 'V4/atelier/designer-assets/manifest.raw.json'].map(root);
  const deps = Object.keys(require.cache).filter(f => f.startsWith(ROOT + path.sep));
  deps.push(root('V4/scripts/stable/common.jsx'), root('V4/collaborations/nier-pilot-01/typography.jsx'));
  for (const f of new Set([catalogue, ...Object.keys(L.baseline().protectedFiles).map(root), ...control, ...deps,
    ...['model.cjs', 'revise.cjs', 'replace.jsx', 'render.ps1', 'revision.test.cjs'].map(file), ...flags.inputs(),
    ...M.specs().filter(c => c.art).map(c => root('V4/Illustrations/' + c.art))])) await observe(f);
  for (const target of targets()) b.changes.push({ target, backup: original(target), beforeHash: b.observed[target], stage: stage(target) });
  const backupFiles = [...targets(), ...control];
  for (const c of M.specs()) backupFiles.push(path.join(creation(c), 'profile.json'), path.join(creation(c), 'illustration.png'),
    root(c.evidence + '/render/native.json'), root(c.evidence + '/render/composition.json'));
  for (const f of new Set(backupFiles)) {
    copy(f, original(f)); b.backups[original(f)] = await hash(original(f)); assert.equal(b.backups[original(f)], b.observed[f]);
  }
  await guard(b); write(file('baseline-game.json'), await game(cat)); write(file('before.json'), b);
  return { prepared: M.specs().map(c => c.id), referenceId: b.referenceId, photoshopRun: false, productionChanged: false };
}
async function render({ goNative = false, key } = {}) {
  assert.equal(goNative, true, 'GO natif requis apres revue des cadrages.'); assert.ok(key, 'Un rendu serialise par carte requis.');
  const c = select(key)[0], b = read(file('before.json')); await stable(); await guard(b);
  if (key !== 'liquid-snake') {
    const gate = read(file('liquid-gate.json'));
    assert.equal(gate.passed, true); assert.equal(gate.beforeHash, await hash(file('before.json')));
    assert.deepEqual(await B.hashes(Object.keys(gate.evidence)), gate.evidence);
  }
  assert.ok(!fs.existsSync(work(c)), 'Rendu deja present; ne pas ecraser une preuve.');
  const input = file('inputs/' + c.key + '.json'), out = work(c), evidence = root(c.evidence);
  const oldProfile = read(original(path.join(creation(c), 'profile.json')));
  if (c.crop) write(path.join(out, 'profile.json'), M.profile(oldProfile, c));
  else copy(original(path.join(creation(c), 'profile.json')), path.join(out, 'profile.json'));
  copy(original(path.join(creation(c), 'illustration.png')), path.join(out, 'illustration.png'));
  copy(original(path.join(evidence, 'render/composition.json')), path.join(out, 'render/composition.json'));
  const plan = read(path.join(out, 'render/composition.json')), replacements = [];
  for (const layer of plan.layers) {
    const dest = path.join(out, 'render', layer.file);
    if (c.crop && layer.name === M.ART) await sharp((await cropper.crop(c)).input).toFile(dest);
    else if (c.faction && layer.name === 'FACTION - ' + c.faction) {
      const flag = file('art-flags/flag-' + c.faction + '-packed.png');
      // The imported raster was converted into a 300-ppi PSB by the original native composer.
      await sharp(flag).withMetadata({ density: 300 }).png().toFile(dest);
      assert.deepEqual(await sharp(dest).raw().toBuffer(), await sharp(flag).raw().toBuffer(), 'Flag pixels changed while setting embedded resolution.');
    }
    else copy(path.join(evidence, 'render', layer.file), dest);
    if (M.names(c).includes(layer.name)) replacements.push({ name: layer.name, file: dest });
  }
  await sharp(await R.composite(plan.layers.map(l => ({ ...l, input: path.join(out, 'render', l.file) })))).png().toFile(path.join(out, 'render/expected-components.png'));
  const request = { revision: M.REVISION, goNative: true, key, work: out, replacements,
    original: original(path.join(creation(c), 'card.psd')), native: original(path.join(evidence, 'render/native.json')) };
  write(file('render-request.json'), request); write(file('inputs/' + c.key + '-request.json'), request);
  write(input, await B.hashes(files(out).concat(file('inputs/' + c.key + '-request.json'))));
  const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
    file('render.ps1'), '-Script', file('replace.jsx')], file(key + '-photoshop.log'));
  assert.deepEqual(await B.hashes(Object.keys(read(input))), read(input)); await guard(b);
  return { rendered: c.id, output, productionChanged: false };
}
async function verifyCard(c, b) {
    const out = work(c), old = read(original(root(c.evidence + '/render/native.json')));
    const inputs = read(file('inputs/' + c.key + '.json')); assert.deepEqual(await B.hashes(Object.keys(inputs)), inputs);
    const a = read(path.join(out, 'audit.json')), n = read(path.join(out, 'render/native.json'));
    for (const state of [a.before, a.after, a.reopened]) assert.deepEqual(unchangedLayers(state), unchangedLayers(old.layers));
    assert.deepEqual(a.textsBefore, a.textsAfter); assert.deepEqual(a.textsBefore, a.textsReopened);
    for (const geometry of [a.geometryAfter, a.geometryReopened]) {
      assert.equal(geometry.length, a.geometryBefore.length);
      for (let i = 0; i < geometry.length; i++) {
        assert.equal(geometry[i].name, a.geometryBefore[i].name);
        assert.deepEqual(geometry[i].bounds, a.geometryBefore[i].bounds);
        assert.deepEqual(geometry[i].size, a.geometryBefore[i].size);
        assert.ok(Math.abs(geometry[i].resolution - a.geometryBefore[i].resolution) <= 0.001);
        assert.ok(geometry[i].transform.every((value, j) => Math.abs(value - a.geometryBefore[i].transform[j]) <= 0.000001));
      }
    }
    assert.deepEqual(n.expected, old.expected); assert.deepEqual(n.layers, a.reopened);
    if (old.typography) assert.deepEqual(n.typography, old.typography);
    const plan = read(path.join(out, 'render/composition.json'));
    assert.deepEqual(a.replaced, M.names(c));
    assert.deepEqual(a.embedded, Object.fromEntries(plan.layers.map(l => [l.name, true])));
    M.profileGuard(read(original(path.join(creation(c), 'profile.json'))), read(path.join(out, 'profile.json')), c);
    assert.equal(await hash(path.join(out, 'illustration.png')), b.observed[path.join(creation(c), 'illustration.png')]);
    if (!c.crop) assert.equal(await hash(path.join(out, 'profile.json')), b.observed[path.join(creation(c), 'profile.json')]);
    const originalPixels = await L.diff(original(path.join(creation(c), 'card.png')), path.join(out, 'before-card.png'));
    const masked = await L.diff(path.join(out, 'before-without-replaced.png'), path.join(out, 'after-without-replaced.png'));
    const outside = await L.diff(original(path.join(creation(c), 'card.png')), path.join(out, 'card.png'), M.windows(c));
    assert.equal(originalPixels.changed, 0); assert.equal(masked.changed, 0); assert.equal(outside.outside, 0); assert.ok(outside.changed > 0);
    const v = { ...await B.verifyNative(out, read(path.join(out, 'profile.json'))), revision: M.REVISION,
      scope: { originalPixels, masked, outside, nativeTextUnchanged: true, nativeStyleRunsUnchanged: true,
        geometryUnchanged: true, embeddedObjects: true, originalArtworkBytesPreserved: true, changedProfileFields: c.crop ? ['crop'] : [] } };
    assert.equal(v.passed, true); return v;
}
async function gate() {
  assert.ok(!fs.existsSync(file('liquid-gate.json')), 'Gate already exists.');
  const b = read(file('before.json')); await stable(); await guard(b);
  const c = select('liquid-snake')[0], proof = await verifyCard(c, b);
  const result = { passed: true, beforeHash: await hash(file('before.json')), proof,
    evidence: await B.hashes(files(work(c)).concat(file('inputs/liquid-snake.json'), file('inputs/liquid-snake-request.json'))) };
  write(file('liquid-gate.json'), result); await guard(b);
  return { passed: true, outside: proof.scope.outside.outside, masked: proof.scope.masked.changed,
    roundtrip: proof.roundtrip.changed, barcode: proof.barcode.passed, productionChanged: false };
}
async function verify() {
  assert.ok(!fs.existsSync(file('verified.json')) && !fs.existsSync(file('staging')), 'Preuve deja presente.');
  const b = read(file('before.json')); await stable(); await guard(b); const revisions = {}, checks = [];
  for (const c of M.specs()) {
    const out = work(c), v = await verifyCard(c, b);
    write(path.join(out, 'verification.json'), v); checks.push({ key: c.key, ...v });
    const revision = { id: M.REVISION, proof: rel(file('verified.json')), key: c.key,
      previousCreationHash: b.observed[path.join(creation(c), 'creation.json')] };
    revisions[c.id] = revision; const meta = read(original(path.join(creation(c), 'creation.json')));
    for (const name of outputs(c).filter(n => n !== 'creation.json')) {
      meta.hashes[name] = await hash(path.join(out, name)); copy(path.join(out, name), stage(path.join(creation(c), name)));
    }
    meta.nativeRevision = revision; write(stage(path.join(creation(c), 'creation.json')), meta);
    await sharp(path.join(out, 'card.png')).extract({ left: 50, top: 50, width: 797, height: 1388 })
      .resize({ width: 320 }).png().toFile(path.join(out, 'proof-small.png'));
  }
  const next = revisedCatalogue(read(original(catalogue)), revisions);
  assert.deepEqual(await game(next), read(file('baseline-game.json')), 'Catalogue jouable modifie.'); write(stage(catalogue), next);
  const staged = []; for (const c of b.changes) staged.push({ ...c, afterHash: await hash(c.stage) });
  const proof = { revision: M.REVISION, beforeHash: await hash(file('before.json')), staged, checks,
    evidence: await B.hashes([...files(file('work')), ...files(file('inputs'))]) };
  await guard(b); write(file('verified.json'), proof);
  return { verified: checks.map(v => ({ id: v.modelId, outside: v.scope.outside.outside, roundtrip: v.roundtrip.changed, barcode: v.barcode.passed })), productionChanged: false };
}
async function integrity(proof) {
  assert.equal(proof.revision, M.REVISION); assert.equal(proof.beforeHash, await hash(file('before.json')));
  assert.deepEqual(proof.staged.map(({ afterHash, ...c }) => c), read(file('before.json')).changes);
  assert.deepEqual(await B.hashes(Object.keys(proof.evidence)), proof.evidence);
  for (const c of proof.staged) assert.equal(await hash(c.stage), c.afterHash);
}
async function preflight() {
  const b = read(file('before.json')), proof = read(file('verified.json')); await stable(); await integrity(proof);
  const published = fs.existsSync(file('transaction.json')) && read(file('transaction.json')).state === 'published';
  await guard(b, published ? 'published' : 'original', Object.fromEntries(proof.staged.map(c => [c.target, c.afterHash])));
  for (const c of proof.staged) assert.equal(await hash(published ? c.target : c.stage), c.afterHash);
  assert.deepEqual(await game(read(published ? catalogue : stage(catalogue))), read(file('baseline-game.json')));
  return { state: published ? 'published' : 'staged', targets: targets().length, gameplayUnchanged: true, sharedReferencesUnchanged: true };
}
async function publish({ goPublish = false } = {}) {
  assert.equal(goPublish, true, 'GO publication explicite requis apres revue native.');
  const b = read(file('before.json')), proof = read(file('verified.json'));
  return tx.commit({ revision: M.REVISION, beforeHash: proof.beforeHash, changes: proof.staged }, {
    before: preflight, guard: () => guard(b, 'mixed'),
    after: async () => { await guard(b, 'published', Object.fromEntries(proof.staged.map(c => [c.target, c.afterHash]))); await stable(); await integrity(proof); },
    afterRollback: async () => { await guard(b); await stable(); }
  });
}
async function locked(action) {
  const lock = file('operation.lock'), fd = fs.openSync(lock, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, revision: M.REVISION })); return await action(); }
  finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}
async function nativeLock(action) {
  const lock = path.join(L.DATA, 'render.lock'), id = crypto.randomUUID(), fd = fs.openSync(lock, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, id, kind: M.REVISION })); return await action(); }
  finally { fs.closeSync(fd); if (read(lock).id === id) fs.unlinkSync(lock); }
}
module.exports = { targets, revisedCatalogue, check, prepare, render, gate, verify, preflight, publish };
if (require.main === module) {
  const [action = 'check', ...args] = process.argv.slice(2);
  assert.ok(['check', 'prepare', 'render', 'gate', 'verify', 'preflight', 'publish'].includes(action));
  assert.ok(args.every(a => ['--go-prepare', '--go-native', '--go-publish'].includes(a) || a.startsWith('--key=')));
  const run = () => module.exports[action]({ goPrepare: args.includes('--go-prepare'), goNative: args.includes('--go-native'),
    goPublish: args.includes('--go-publish'), key: args.find(a => a.startsWith('--key='))?.slice(6) });
  locked(() => action === 'render' || action === 'publish' ? nativeLock(run) : run())
    .then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
