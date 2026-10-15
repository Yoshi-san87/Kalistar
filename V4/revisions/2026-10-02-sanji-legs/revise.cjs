'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
const B = require('../../collaborations/nier-pilot-01/build.cjs');
const T = require('../../expansions/2026-09-24-royal-training/typography.cjs');
const { transactionIO } = require('../2026-09-23-nier-art-refinement/transaction.cjs');
const { fs, path, assert, read, write, hash, ROOT, sharp, crypto } = L;
const REVISION = '2026-10-02-sanji-legs', ART = 'ILLUSTRATION - cadrage';
const file = n => L.inside(__dirname, n), root = n => L.inside(ROOT, n);
const rel = f => path.relative(ROOT, f).replaceAll('\\', '/');
const catalogue = root('V4/donnees/catalogue.json');
const creation = c => root('V4/creations/' + c.id), work = c => file('work/' + c.key);
const shared = ['card.psd', 'card.png', 'illustration.png', 'verification.json'];
const tx = transactionIO(L, file('transaction.json'));
const unchangedLayers = layers => layers.map(({ id, ...layer }) => layer);
function specs() {
  const set = read(file('set.json'));
  assert.equal(set.revision, REVISION);
  assert.deepEqual(set.cards.map(c => [c.key, c.id]), [['sanji', '49800301']]);
  const overrides = fs.existsSync(file('evidence-overrides.json')) ? read(file('evidence-overrides.json')) : {};
  assert.ok(Object.keys(overrides).every(k => set.cards.some(c => c.key === k)));
  return set.cards.map(c => ({ ...c, evidence: overrides[c.key] || c.evidence }));
}
const select = key => { const cards = specs().filter(c => !key || c.key === key); assert.ok(cards.length, 'Carte inconnue.'); return cards; };
const targets = () => specs().flatMap(c => [...shared, 'creation.json'].map(n => path.join(creation(c), n))).concat(catalogue);
const original = f => file('originals/' + rel(f));
const stage = f => file('staging/' + rel(f));
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    assert.ok(!e.isSymbolicLink(), 'Lien interdit.');
    const f = path.join(dir, e.name); return e.isDirectory() ? files(f) : [f];
  }).sort();
}
function copy(from, to) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL); }
async function stable() { await L.protectedCheck(); await R.verifyAssets(); }
async function guard(b, mode = 'original', after = {}) {
  assert.equal(b.revision, REVISION); assert.equal(b.referenceId, L.baseline().id);
  assert.deepEqual(b.cards, specs()); assert.deepEqual(b.changes.map(c => c.target), targets());
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
  assert.deepEqual(Object.keys(revisions).sort(), specs().map(c => c.id).sort());
  for (const c of specs()) {
    const matches = next.cards.filter(v => v.id === c.id);
    assert.equal(matches.length, 1); assert.equal(matches[0].kind, 'created');
    matches[0].nativeRevision = revisions[c.id];
  }
  return next;
}
async function game(cat) {
  return require('../../atelier/game-catalog.cjs').buildCatalog({ published: cat.cards.filter(c => c.kind === 'created') });
}
async function check() {
  const cat = read(catalogue), entries = [];
  for (const c of specs()) {
    const p = read(path.join(creation(c), 'profile.json')), card = cat.cards.find(v => v.id === c.id);
    assert.equal(p.title, c.title); assert.equal(p.id, c.id); assert.deepEqual(card.profile, p);
    assert.deepEqual(p.crop, { zoom: 1, x: 0, y: 0 });
    const art = file(c.art), m = await sharp(art).metadata();
    assert.equal(m.format, 'png'); assert.ok(m.width >= 737 && m.height >= 921);
    if (c.supplied) assert.equal(await hash(art), await hash(root(c.supplied)), 'Image utilisateur modifiee.');
    entries.push({ key: c.key, id: c.id, title: p.title, art: rel(art), sha256: await hash(art),
      width: m.width, height: m.height, evidence: c.evidence,
      evidenceMatchesCurrentPng: await hash(root(c.evidence + '/card.png')) === await hash(path.join(creation(c), 'card.png')) });
  }
  return { revision: REVISION, cards: entries, currentCount: cat.cards.length,
    prepared: fs.existsSync(file('before.json')), photoshopRun: false, productionChanged: false };
}
async function prepare({ goNative = false } = {}) {
  assert.equal(goNative, true, 'GO natif explicite requis apres gel des icones.');
  assert.ok(!fs.existsSync(file('before.json')) && !fs.existsSync(file('originals')), 'Instantane deja present.');
  await stable(); const preflight = await check(); assert.ok(preflight.cards.every(c => c.evidenceMatchesCurrentPng), 'Preuve native obsolete; renseigner evidence-overrides.json.');
  const cat = read(catalogue), b = { revision: REVISION, referenceId: L.baseline().id,
    cards: specs(), catalogueCount: cat.cards.length, observed: {}, backups: {}, changes: [] };
  const observe = async f => { b.observed[f] = await hash(f); };
  for (const c of specs()) {
    const meta = read(path.join(creation(c), 'creation.json'));
    for (const [name, expected] of Object.entries(meta.hashes)) assert.equal(await hash(path.join(creation(c), name)), expected);
    const evidence = root(c.evidence);
    for (const f of files(creation(c)).concat(files(evidence))) await observe(f);
    const plan = read(path.join(evidence, 'render/composition.json'));
    assert.deepEqual(plan.layers.find(l => l.name === ART), { file: 'component-00.png', name: ART, ...R.ART });
    const baseline = await B.verifyNative(evidence, read(path.join(creation(c), 'profile.json')));
    assert.equal(baseline.passed, true);
    write(file('baseline/' + c.key + '.json'), baseline);
  }
  const control = ['V4/atelier/data/references.json', 'V4/atelier/data/regression.json',
    'V4/atelier/designer-assets/manifest.json', 'V4/atelier/designer-assets/manifest.raw.json'].map(root);
  const deps = Object.keys(require.cache).filter(f => f.startsWith(ROOT + path.sep) && !f.startsWith(__dirname + path.sep));
  deps.push(root('V4/scripts/stable/common.jsx'), root('V4/collaborations/nier-pilot-01/typography.jsx'));
  for (const f of new Set([catalogue, ...Object.keys(L.baseline().protectedFiles).map(root), ...control, ...deps,
    ...['set.json', 'revise.cjs', 'replace.jsx', 'render.ps1', 'revision.test.cjs', 'art/provenance.json'].map(file),
    ...specs().map(c => file(c.art))])) await observe(f);
  if (fs.existsSync(file('evidence-overrides.json'))) await observe(file('evidence-overrides.json'));
  for (const target of targets()) b.changes.push({ target, backup: original(target), beforeHash: b.observed[target], stage: stage(target) });
  const backupFiles = [...targets(), ...control];
  for (const c of specs()) backupFiles.push(path.join(creation(c), 'profile.json'),
    root(c.evidence + '/render/native.json'), root(c.evidence + '/render/composition.json'));
  for (const f of new Set(backupFiles)) {
    copy(f, original(f)); b.backups[original(f)] = await hash(original(f)); assert.equal(b.backups[original(f)], b.observed[f]);
  }
  await guard(b); write(file('baseline-game.json'), await game(cat)); write(file('before.json'), b);
  return { prepared: specs().map(c => c.id), productionChanged: false };
}
async function preview({ key } = {}) {
  const results = [];
  for (const c of select(key)) {
    const evidence = root(c.evidence), plan = read(path.join(evidence, 'render/composition.json'));
    const out = file('qa/' + c.key); assert.ok(!fs.existsSync(out), 'Apercu deja present.');
    const input = await sharp(file(c.art)).resize(737, 921, { fit: 'cover', position: 'centre' }).png().toBuffer();
    const layers = plan.layers.map(l => ({ ...l, input: l.name === ART ? input : path.join(evidence, 'render', l.file) }));
    fs.mkdirSync(out, { recursive: true }); await sharp(input).toFile(path.join(out, 'art-window.png'));
    await sharp(await R.composite(layers)).composite(await T.preview(read(path.join(creation(c), 'profile.json')), R)).png().toFile(path.join(out, 'frame-preview.png'));
    await sharp(path.join(out, 'frame-preview.png')).resize({ width: 320 }).png().toFile(path.join(out, 'small-preview.png'));
    const report = { qaOnly: true, native: false, publishable: false, key: c.key, artHash: await hash(file(c.art)),
      note: 'Approximate text preview. Final PSD render is required after shared icon freeze.' };
    write(path.join(out, 'report.json'), report); results.push(report);
  }
  return results;
}
async function render({ goNative = false, key } = {}) {
  assert.equal(goNative, true, 'GO natif explicite requis.');
  assert.ok(key, 'Un rendu serialise par carte requis.');
  const c = select(key)[0], b = read(file('before.json')); await stable(); await guard(b);
  assert.ok(!fs.existsSync(work(c)), 'Rendu deja present; ne pas ecraser une preuve.');
  const input = file('inputs/' + c.key + '.json'), out = work(c), evidence = root(c.evidence);
  copy(original(path.join(creation(c), 'profile.json')), path.join(out, 'profile.json'));
  copy(file(c.art), path.join(out, 'illustration.png'));
  copy(original(path.join(evidence, 'render/composition.json')), path.join(out, 'render/composition.json'));
  const plan = read(path.join(out, 'render/composition.json'));
  for (const l of plan.layers) if (l.name !== ART) copy(path.join(evidence, 'render', l.file), path.join(out, 'render', l.file));
  await sharp(file(c.art)).resize(737, 921, { fit: 'cover', position: 'centre' }).png().toFile(path.join(out, 'render/component-00.png'));
  await sharp(await R.composite(plan.layers.map(l => ({ ...l, input: path.join(out, 'render', l.file) })))).png().toFile(path.join(out, 'render/expected-components.png'));
  const request = { revision: REVISION, goNative: true, key, work: out,
    original: original(path.join(creation(c), 'card.psd')), native: original(path.join(evidence, 'render/native.json')) };
  write(file('render-request.json'), request); write(file('inputs/' + c.key + '-request.json'), request);
  write(input, await B.hashes(files(out).concat(file('inputs/' + c.key + '-request.json'))));
  const output = await R.command('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
    file('render.ps1'), '-Script', file('replace.jsx')], file(key + '-photoshop.log'));
  assert.deepEqual(await B.hashes(Object.keys(read(input))), read(input)); await guard(b);
  return { rendered: c.id, output, productionChanged: false };
}
async function verify() {
  assert.ok(!fs.existsSync(file('verified.json')) && !fs.existsSync(file('staging')), 'Preuve deja presente.');
  const b = read(file('before.json')); await stable(); await guard(b);
  const revisions = {}, checks = [];
  for (const c of specs()) {
    const out = work(c), old = read(original(root(c.evidence + '/render/native.json')));
    const inputs = read(file('inputs/' + c.key + '.json'));
    assert.deepEqual(await B.hashes(Object.keys(inputs)), inputs);
    const a = read(path.join(out, 'audit.json')), n = read(path.join(out, 'render/native.json'));
    for (const state of [a.before, a.after, a.reopened]) assert.deepEqual(unchangedLayers(state), unchangedLayers(old.layers));
    assert.deepEqual(a.textsBefore, a.textsAfter); assert.deepEqual(a.textsBefore, a.textsReopened);
    assert.deepEqual(n.expected, old.expected); assert.deepEqual(n.layers, a.reopened);
    if (old.typography) assert.deepEqual(n.typography, old.typography);
    const plan = read(path.join(out, 'render/composition.json'));
    assert.deepEqual(a.embedded, Object.fromEntries(plan.layers.map(l => [l.name, true])));
    assert.equal(await hash(path.join(out, 'profile.json')), b.observed[path.join(creation(c), 'profile.json')]);
    const originalPixels = await L.diff(original(path.join(creation(c), 'card.png')), path.join(out, 'before-card.png'));
    const withoutArt = await L.diff(path.join(out, 'before-without-art.png'), path.join(out, 'after-without-art.png'));
    const outside = await L.diff(original(path.join(creation(c), 'card.png')), path.join(out, 'card.png'), [[80, 156, 817, 1077]]);
    assert.equal(originalPixels.changed, 0); assert.equal(withoutArt.changed, 0); assert.equal(outside.outside, 0); assert.ok(outside.changed > 0);
    const v = { ...await B.verifyNative(out, read(path.join(out, 'profile.json'))), revision: REVISION,
      scope: { originalPixels, withoutArt, outside, nativeTextUnchanged: true, nativeStyleRunsUnchanged: true,
        geometryUnchanged: true, embeddedObjects: true, changedProfileFields: [] } };
    write(path.join(out, 'verification.json'), v); checks.push({ key: c.key, ...v });
    const revision = { id: REVISION, proof: rel(path.join(out, 'verification.json')), key: c.key,
      artworkSource: 'V4/Illustrations/OP_sanji_black_02.png',
      previousCreationHash: b.observed[path.join(creation(c), 'creation.json')] };
    revisions[c.id] = revision;
    const meta = read(original(path.join(creation(c), 'creation.json')));
    for (const name of shared) { meta.hashes[name] = await hash(path.join(out, name)); copy(path.join(out, name), stage(path.join(creation(c), name))); }
    meta.nativeRevision = revision; write(stage(path.join(creation(c), 'creation.json')), meta);
    await sharp(path.join(out, 'card.png')).extract({ left: 50, top: 50, width: 797, height: 1388 })
      .resize({ width: 320 }).png().toFile(path.join(out, 'proof-small.png'));
  }
  const next = revisedCatalogue(read(original(catalogue)), revisions);
  assert.deepEqual(await game(next), read(file('baseline-game.json')), 'Catalogue jouable modifie.'); write(stage(catalogue), next);
  const staged = [];
  for (const c of b.changes) staged.push({ ...c, afterHash: await hash(c.stage) });
  const proof = { revision: REVISION, beforeHash: await hash(file('before.json')), staged, checks,
    evidence: await B.hashes([...files(file('work')), ...files(file('inputs'))]) };
  await guard(b); write(file('verified.json'), proof);
  return { verified: checks.map(v => ({ id: v.modelId, outside: v.scope.outside.outside, roundtrip: v.roundtrip.changed, barcode: v.barcode.passed })), productionChanged: false };
}
async function integrity(proof) {
  assert.equal(proof.revision, REVISION); assert.equal(proof.beforeHash, await hash(file('before.json')));
  assert.deepEqual(proof.staged.map(({ afterHash, ...c }) => c), read(file('before.json')).changes);
  assert.deepEqual(await B.hashes(Object.keys(proof.evidence)), proof.evidence);
  for (const c of proof.staged) assert.equal(await hash(c.stage), c.afterHash);
}
async function preflight() {
  const b = read(file('before.json')), proof = read(file('verified.json'));
  await stable(); await integrity(proof);
  const published = fs.existsSync(file('transaction.json')) && read(file('transaction.json')).state === 'published';
  await guard(b, published ? 'published' : 'original', Object.fromEntries(proof.staged.map(c => [c.target, c.afterHash])));
  for (const c of proof.staged) assert.equal(await hash(published ? c.target : c.stage), c.afterHash);
  assert.deepEqual(await game(read(published ? catalogue : stage(catalogue))), read(file('baseline-game.json')));
  return { state: published ? 'published' : 'staged', targets: targets().length, profileUnchanged: true };
}
async function publish({ goPublish = false } = {}) {
  assert.equal(goPublish, true, 'GO publication explicite requis.');
  const b = read(file('before.json')), proof = read(file('verified.json'));
  return tx.commit({ revision: REVISION, beforeHash: proof.beforeHash, changes: proof.staged }, {
    before: preflight, guard: () => guard(b, 'mixed'),
    after: async () => { await guard(b, 'published', Object.fromEntries(proof.staged.map(c => [c.target, c.afterHash]))); await stable(); await integrity(proof); },
    afterRollback: async () => { await guard(b); await stable(); }
  });
}
async function locked(action) {
  const lock = file('operation.lock'), fd = fs.openSync(lock, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, revision: REVISION })); return await action(); }
  finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}
async function nativeLock(action) {
  const lock = path.join(L.DATA, 'render.lock'), id = crypto.randomUUID(), fd = fs.openSync(lock, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, id, kind: REVISION })); return await action(); }
  finally { fs.closeSync(fd); if (read(lock).id === id) fs.unlinkSync(lock); }
}
module.exports = { specs, targets, unchangedLayers, revisedCatalogue, check, prepare, preview, render, verify, preflight, publish };
if (require.main === module) {
  const [action = 'check', ...args] = process.argv.slice(2);
  assert.ok(['check', 'prepare', 'preview', 'render', 'verify', 'preflight', 'publish'].includes(action));
  assert.ok(args.every(a => ['--go-native', '--go-publish'].includes(a) || a.startsWith('--key=')));
  const run = () => module.exports[action]({ goNative: args.includes('--go-native'), goPublish: args.includes('--go-publish'), key: args.find(a => a.startsWith('--key='))?.slice(6) });
  locked(() => action === 'render' || action === 'publish' ? nativeLock(run) : run())
    .then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
