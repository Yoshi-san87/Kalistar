'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
const B = require('../../collaborations/nier-pilot-01/build.cjs');
const T = require('../../expansions/2026-09-24-royal-training/typography.cjs');
const { transactionIO } = require('../2026-09-23-nier-art-refinement/transaction.cjs');
const { fs, path, assert, read, write, hash, ROOT, sharp } = L;
const ID = '49055457', REVISION = '2026-09-25-kaylis-training', ART = 'ILLUSTRATION - cadrage';
const REFERENCE = '02f0808cbd56d2b0d4103450e7943db69b95ac120a0df349f4374c82f7f712e5';
const file = n => L.inside(__dirname, n), rel = f => path.relative(ROOT, f).replaceAll('\\', '/');
const creation = path.join(ROOT, 'V4/creations', ID), catalogue = path.join(ROOT, 'V4/donnees/catalogue.json');
const source = path.join(ROOT, 'V4/expansions/2026-09-24-royal-training/cards/kaylis-entrainement');
const work = file('work/kaylis'), shared = ['card.psd', 'card.png', 'illustration.png', 'verification.json'];
const tx = transactionIO(L, file('transaction.json'));
const targets = () => [...shared, 'creation.json'].map(n => path.join(creation, n)).concat(catalogue);
const unchangedLayers = layers => layers.map(({ id, ...layer }) => layer);
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    assert.ok(!e.isSymbolicLink(), 'Lien interdit : ' + e.name);
    const f = path.join(dir, e.name); return e.isDirectory() ? files(f) : [f];
  }).sort();
}
function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
}
function original(f) { return file('originals/' + rel(f)); }
function stage(f) { return file('staging/' + rel(f)); }
function validateBefore(b) {
  assert.equal(b.revision, REVISION); assert.equal(b.referenceId, REFERENCE); assert.equal(b.catalogueCount, 89);
  assert.deepEqual(b.changes.map(c => c.target), targets());
  for (const c of b.changes) {
    assert.equal(c.backup, original(c.target)); assert.equal(c.stage, stage(c.target));
    assert.equal(c.beforeHash, b.observed[c.target]);
  }
}
async function guard(b, state = 'original', after = {}) {
  validateBefore(b); assert.equal(L.baseline().id, REFERENCE);
  for (const [dir, inventory] of Object.entries(b.inventory)) assert.deepEqual(files(dir), inventory, 'Inventaire modifie : ' + dir);
  for (const [f, expected] of Object.entries(b.observed)) {
    if (state === 'mixed' && targets().includes(f)) continue;
    assert.equal(await hash(f), state === 'published' && targets().includes(f) ? after[f] : expected, 'Source modifiee : ' + f);
  }
  for (const [f, expected] of Object.entries(b.backups)) assert.equal(await hash(f), expected, 'Sauvegarde modifiee : ' + f);
}
async function stable() { await L.protectedCheck(); await R.verifyAssets(); }
async function game(cat) {
  const data = await require('../../atelier/game-catalog.cjs').buildCatalog({ published: cat.cards.filter(c => c.kind === 'created') });
  assert.equal(data.cards.length, 89); assert.equal(new Set(data.cards.map(c => c.id)).size, 89); return data;
}
function revisedCatalogue(before, revision) {
  const next = structuredClone(before), matches = next.cards.filter(c => c.id === ID);
  assert.equal(next.cards.length, 89); assert.equal(matches.length, 1); assert.equal(matches[0].kind, 'created');
  matches[0].nativeRevision = revision;
  return next;
}
async function prepare() {
  if (fs.existsSync(file('before.json'))) return baseline(read(file('before.json')));
  assert.equal(L.baseline().id, REFERENCE); await stable();
  const cat = read(catalogue), profile = read(path.join(creation, 'profile.json'));
  assert.equal(cat.cards.length, 89); assert.equal(cat.referenceId, REFERENCE);
  assert.deepEqual(cat.cards.find(c => c.id === ID).profile, profile);
  assert.deepEqual(profile.crop, { zoom: 1, x: 0, y: 0 }); assert.equal(profile.id, ID);
  const old = read(path.join(creation, 'creation.json'));
  for (const [name, expected] of Object.entries(old.hashes)) assert.equal(await hash(path.join(creation, name)), expected);
  for (const name of [...shared, 'profile.json']) assert.equal(await hash(path.join(source, name)), await hash(path.join(creation, name)));
  const b = { revision: REVISION, referenceId: REFERENCE, catalogueCount: cat.cards.length,
    observed: {}, inventory: {}, backups: {}, changes: [], checkedAt: new Date().toISOString() };
  const observe = async f => { b.observed[f] = await hash(f); };
  for (const dir of [path.join(ROOT, 'V4/creations'), source]) {
    b.inventory[dir] = files(dir); for (const f of b.inventory[dir]) await observe(f);
  }
  const protectedFiles = Object.keys(L.baseline().protectedFiles).map(n => L.inside(ROOT, n));
  const control = ['V4/atelier/data/references.json', 'V4/atelier/data/regression.json',
    'V4/atelier/designer-assets/manifest.json', 'V4/atelier/designer-assets/manifest.raw.json'].map(n => path.join(ROOT, n));
  const dependencies = Object.keys(require.cache).filter(f => f.startsWith(ROOT + path.sep) && !f.startsWith(__dirname + path.sep));
  dependencies.push(...['../../scripts/stable/common.jsx', '../../collaborations/nier-pilot-01/typography.jsx',
    '../../collaborations/ff8-set-01/build.cjs', '../../atelier/game-catalog.cjs', '../../site/engine.js',
    '../../site/collaborations.js', '../../atelier/barcode.py', '../2026-09-18-branches/bridge.ps1'].map(n => path.resolve(__dirname, n)));
  for (const f of new Set([catalogue, ...protectedFiles, ...control, ...dependencies])) await observe(f);
  for (const target of targets()) b.changes.push({ target, backup: original(target), beforeHash: b.observed[target], stage: stage(target) });
  for (const f of new Set([...targets(), path.join(creation, 'profile.json'), ...control,
    path.join(source, 'render/native.json'), path.join(source, 'render/composition.json')])) {
    if (!fs.existsSync(original(f))) copy(f, original(f));
    b.backups[original(f)] = await hash(original(f)); assert.equal(b.backups[original(f)], b.observed[f]);
  }
  const plan = read(path.join(source, 'render/composition.json'));
  assert.deepEqual(plan.layers.find(l => l.name === ART), { file: 'component-00.png', name: ART, ...R.ART });
  assert.deepEqual(files(file('originals')), Object.keys(b.backups).sort());
  await guard(b); write(file('before.json'), b);
  return baseline(b);
}
async function baseline(b) {
  await guard(b);
  const result = await B.verifyNative(source, read(path.join(creation, 'profile.json')));
  T.verify(read(path.join(source, 'render/native.json'))); await guard(b);
  write(file('baseline-verification.json'), result); write(file('baseline-game.json'), await game(read(catalogue)));
  return { prepared: ID, catalogue: 89, protectedFiles: Object.keys(L.baseline().protectedFiles).length,
    observed: Object.keys(b.observed).length, backups: Object.keys(b.backups).length,
    barcode: result.barcode, photoshopRun: false, productionChanged: false };
}
async function check() {
  const snapshot = fs.existsSync(file('before.json'));
  const prepared = snapshot && fs.existsSync(file('baseline-verification.json')) && fs.existsSync(file('baseline-game.json'));
  if (snapshot) {
    const published = fs.existsSync(file('transaction.json')) && read(file('transaction.json')).state === 'published';
    const after = published ? Object.fromEntries(read(file('verified.json')).staged.map(c => [c.target, c.afterHash])) : {};
    await guard(read(file('before.json')), published ? 'published' : 'original', after);
  }
  return { revision: REVISION, modelId: ID, prepared, artFiles: fs.existsSync(file('art')) ? files(file('art')).map(rel) : [],
    nativeStarted: fs.existsSync(file('render-inputs.json')), verified: fs.existsSync(file('verified.json')),
    transaction: fs.existsSync(file('transaction.json')) ? read(file('transaction.json')).state : null,
    next: 'Explicit parent GO and final art path are required for native rendering; separate GO for publication.' };
}
async function preview({ art } = {}) {
  assert.ok(typeof art === 'string' && /^art\/[a-z0-9-]+\.png$/.test(art), 'PNG QA sous art/ requis.');
  const artFile = L.inside(file('art'), art.slice(4)), out = file('qa/' + path.basename(art, '.png'));
  assert.ok(!fs.existsSync(out), 'Apercu deja present : ne pas ecraser une preuve.');
  const plan = read(path.join(source, 'render/composition.json')), profile = read(path.join(creation, 'profile.json'));
  const input = await sharp(artFile).resize(737, 921, { fit: 'cover', position: 'centre' }).png().toBuffer();
  const layers = plan.layers.map(l => ({ ...l, input: l.name === ART ? input : path.join(source, 'render', l.file) }));
  fs.mkdirSync(out, { recursive: true });
  await sharp(input).toFile(path.join(out, 'art-window.png'));
  await sharp(await R.composite(layers)).composite(await T.preview(profile, R)).png().toFile(path.join(out, 'frame-preview.png'));
  await sharp(path.join(out, 'frame-preview.png')).resize({ width: 320 }).png().toFile(path.join(out, 'small-preview.png'));
  const report = { qaOnly: true, native: false, publishable: false, art: rel(artFile), artHash: await hash(artFile),
    window: R.ART, cropUnchanged: profile.crop, sourceCompositionHash: await hash(path.join(source, 'render/composition.json')),
    note: 'Existing frame components; approximate preview typography, not a Photoshop export.' };
  write(path.join(out, 'report.json'), report);
  return { ...report, preview: rel(path.join(out, 'frame-preview.png')) };
}
async function render({ goNative = false, art } = {}) {
  assert.equal(goNative, true, 'GO natif explicite requis.');
  assert.ok(typeof art === 'string' && art.startsWith('art/'), 'Art finale requise sous art/.');
  const artFile = L.inside(file('art'), art.slice(4));
  assert.equal(read(file('baseline-verification.json')).passed, true, 'Controle initial incomplet.');
  const b = read(file('before.json')); await stable(); await guard(b);
  assert.ok(!fs.existsSync(file('render-inputs.json')) && !fs.existsSync(work), 'Rendu deja prepare : conserver les essais.');
  const meta = await sharp(artFile).metadata(); assert.equal(meta.format, 'png');
  assert.ok(meta.width >= 737 && meta.height >= 921, 'Illustration trop petite.');
  assert.notEqual(await hash(artFile), b.observed[path.join(creation, 'illustration.png')]);
  assert.ok(!fs.existsSync(path.join(L.DATA, 'render.lock')), 'Autre rendu Atelier en cours.');
  copy(original(path.join(creation, 'profile.json')), path.join(work, 'profile.json'));
  copy(artFile, path.join(work, 'illustration.png'));
  copy(original(path.join(source, 'render/composition.json')), path.join(work, 'render/composition.json'));
  const plan = read(path.join(work, 'render/composition.json'));
  for (const l of plan.layers) if (l.name !== ART) copy(path.join(source, 'render', l.file), path.join(work, 'render', l.file));
  await sharp(artFile).resize(737, 921, { fit: 'cover', position: 'centre' }).png().toFile(path.join(work, 'render/component-00.png'));
  await sharp(await R.composite(plan.layers.map(l => ({ ...l, input: path.join(work, 'render', l.file) })))).png().toFile(path.join(work, 'render/expected-components.png'));
  write(file('render-request.json'), { revision: REVISION, goNative: true, work,
    original: original(path.join(creation, 'card.psd')), native: original(path.join(source, 'render/native.json')) });
  const inputs = await B.hashes([file('before.json'), file('baseline-game.json'), file('render-request.json'), file('revise.cjs'),
    file('replace.jsx'), file('render.ps1'), file('revision.test.cjs'), artFile, ...files(work)]);
  write(file('render-inputs.json'), inputs);
  const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
    file('render.ps1'), '-Script', file('replace.jsx')], file('photoshop.log'));
  assert.deepEqual(await B.hashes(Object.keys(inputs)), inputs); await guard(b);
  return { rendered: ID, output, productionChanged: false };
}
async function verify() {
  const b = read(file('before.json')), inputs = read(file('render-inputs.json'));
  assert.ok(!fs.existsSync(file('verified.json')) && !fs.existsSync(file('staging')), 'Verification deja preparee.');
  await stable(); await guard(b); assert.deepEqual(await B.hashes(Object.keys(inputs)), inputs);
  const old = read(original(path.join(source, 'render/native.json'))), n = read(path.join(work, 'render/native.json'));
  const a = read(path.join(work, 'audit.json')), plan = read(path.join(work, 'render/composition.json'));
  for (const state of [a.before, a.after, a.reopened]) assert.deepEqual(unchangedLayers(state), unchangedLayers(old.layers));
  assert.deepEqual(a.textsBefore, a.textsAfter); assert.deepEqual(a.textsBefore, a.textsReopened);
  assert.deepEqual(n.layers, a.reopened); assert.deepEqual(n.expected, old.expected); assert.deepEqual(n.typography, old.typography);
  assert.deepEqual(a.embedded, Object.fromEntries(plan.layers.map(l => [l.name, true]))); T.verify(n);
  assert.equal(await hash(path.join(work, 'profile.json')), b.observed[path.join(creation, 'profile.json')]);
  const originalPixels = await L.diff(original(path.join(creation, 'card.png')), path.join(work, 'before-card.png'));
  const withoutArt = await L.diff(path.join(work, 'before-without-art.png'), path.join(work, 'after-without-art.png'));
  const outside = await L.diff(original(path.join(creation, 'card.png')), path.join(work, 'card.png'), [[80, 156, 817, 1077]]);
  assert.equal(originalPixels.changed, 0); assert.equal(withoutArt.changed, 0); assert.equal(outside.outside, 0); assert.ok(outside.changed > 0);
  const v = { ...await B.verifyNative(work, read(path.join(work, 'profile.json'))), revision: REVISION,
    scope: { originalPixels, withoutArt, outside, nativeTextUnchanged: true, nativeStyleRunsUnchanged: true,
      geometryUnchanged: true, embeddedObjects: true, changedProfileFields: [] },
    nativeFiles: Object.fromEntries(await Promise.all(['native.json', 'reopened.png', 'without-text.png'].map(async name => {
      const f = path.join(work, 'render', name); return [rel(f), await hash(f)];
    }))) };
  write(path.join(work, 'verification.json'), v);
  const revision = { id: REVISION, proof: rel(file('verified.json')), previousCreationHash: b.observed[path.join(creation, 'creation.json')] };
  const meta = read(original(path.join(creation, 'creation.json')));
  for (const name of shared) meta.hashes[name] = await hash(path.join(work, name));
  meta.nativeRevision = revision;
  const next = revisedCatalogue(read(original(catalogue)), revision);
  assert.deepEqual(await game(next), read(file('baseline-game.json')), 'Catalogue jouable modifie.');
  const staged = [];
  for (const c of b.changes) {
    if (c.target === catalogue) write(c.stage, next);
    else if (path.basename(c.target) === 'creation.json') write(c.stage, meta);
    else copy(path.join(work, path.basename(c.target)), c.stage);
    staged.push({ ...c, afterHash: await hash(c.stage) });
  }
  await sharp(path.join(work, 'card.png')).extract({ left: 50, top: 50, width: 797, height: 1388 })
    .resize({ width: 320 }).png().toFile(file('proof-small.png'));
  const proof = { revision: REVISION, beforeHash: await hash(file('before.json')), inputs, staged, verification: v,
    evidence: await B.hashes([...files(work), file('render-inputs.json'), file('proof-small.png')]) };
  await guard(b); await current(proof, true); write(file('verified.json'), proof);
  return { verified: ID, outside: outside.outside, roundtrip: v.roundtrip.changed, barcode: v.barcode,
    nativeTextUnchanged: true, productionChanged: false };
}
async function current(proof, staging = false) {
  const resolve = f => staging && targets().includes(f) ? stage(f) : f;
  for (const c of proof.staged) assert.equal(await hash(resolve(c.target)), c.afterHash);
  const meta = read(resolve(path.join(creation, 'creation.json'))), v = read(resolve(path.join(creation, 'verification.json')));
  assert.equal(meta.nativeRevision.id, REVISION); assert.equal(v.passed, true); assert.deepEqual(v, proof.verification);
  for (const [name, expected] of Object.entries(meta.hashes)) assert.equal(await hash(resolve(path.join(creation, name))), expected);
  for (const [name, expected] of Object.entries(v.hashes)) assert.equal(await hash(resolve(path.join(creation, name))), expected);
  const cat = read(resolve(catalogue));
  assert.deepEqual(cat, revisedCatalogue(read(original(catalogue)), meta.nativeRevision));
  assert.deepEqual(await game(cat), read(file('baseline-game.json')));
}
async function integrity(b, proof) {
  assert.equal(proof.revision, REVISION); assert.equal(proof.beforeHash, await hash(file('before.json')));
  assert.deepEqual(proof.staged.map(({ afterHash, ...c }) => c), b.changes);
  assert.deepEqual(await B.hashes(Object.keys(proof.inputs)), proof.inputs);
  assert.deepEqual(await B.hashes(Object.keys(proof.evidence)), proof.evidence);
  for (const c of proof.staged) assert.equal(await hash(c.stage), c.afterHash);
}
async function preflight() {
  const b = read(file('before.json')), proof = read(file('verified.json'));
  const published = fs.existsSync(file('transaction.json')) && read(file('transaction.json')).state === 'published';
  await stable(); await integrity(b, proof);
  await guard(b, published ? 'published' : 'original', Object.fromEntries(proof.staged.map(c => [c.target, c.afterHash])));
  await current(proof, !published);
  return { revision: REVISION, state: published ? 'published' : 'staged', targets: 6, catalogue: 89, profileUnchanged: true };
}
async function publish({ goPublish = false } = {}) {
  assert.equal(goPublish, true, 'GO publication explicite requis.');
  assert.ok(!fs.existsSync(path.join(L.DATA, 'render.lock')), 'Autre rendu Atelier en cours.');
  const b = read(file('before.json')), proof = read(file('verified.json'));
  return tx.commit({ revision: REVISION, beforeHash: proof.beforeHash, changes: proof.staged }, {
    before: preflight, guard: () => guard(b, 'mixed'),
    after: async () => {
      await guard(b, 'published', Object.fromEntries(proof.staged.map(c => [c.target, c.afterHash])));
      await stable(); await integrity(b, proof); await current(proof);
    },
    afterRollback: async () => { await guard(b); await stable(); }
  });
}
async function rollback({ goRollback = false } = {}) {
  assert.equal(goRollback, true, 'GO restauration explicite requis.');
  const b = read(file('before.json')), proof = read(file('verified.json')), journal = read(file('transaction.json'));
  assert.equal(journal.revision, REVISION); assert.equal(journal.beforeHash, proof.beforeHash);
  assert.deepEqual(journal.changes, proof.staged); await integrity(b, proof);
  return tx.rollback(journal, { guard: () => guard(b, 'mixed'), afterRollback: async () => { await guard(b); await stable(); } });
}
async function locked(action) {
  const lock = file('operation.lock'); const fd = fs.openSync(lock, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, revision: REVISION })); return await action(); }
  finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}
module.exports = { prepare, check, preview, render, verify, preflight, publish, rollback, targets, unchangedLayers, revisedCatalogue };
if (require.main === module) {
  const [action = 'check', ...args] = process.argv.slice(2);
  assert.ok(['prepare', 'check', 'preview', 'render', 'verify', 'preflight', 'publish', 'rollback'].includes(action));
  assert.ok(args.every(a => ['--go-native', '--go-publish', '--go-rollback'].includes(a) || a.startsWith('--art=')), 'Option inconnue.');
  locked(() => module.exports[action]({ goNative: args.includes('--go-native'), goPublish: args.includes('--go-publish'),
    goRollback: args.includes('--go-rollback'), art: args.find(a => a.startsWith('--art='))?.slice(6) }))
    .then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
