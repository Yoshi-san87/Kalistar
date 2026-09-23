'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
const B = require('../../collaborations/nier-pilot-01/build.cjs');
const { transactionIO } = require('../2026-09-23-nier-art-refinement/transaction.cjs');
const { fs, path, assert, read, write, hash, ROOT, sharp } = L;
const REVISION = '2026-09-23-pascal-book-02', PRIOR = '2026-09-23-nier-art-refinement';
const ART = 'ILLUSTRATION - cadrage', ID = '42650442';
const file = n => L.inside(__dirname, n);
const previous = path.resolve(__dirname, '../' + PRIOR);
const source = path.join(ROOT, 'V4/collaborations/nier-set-02/cards/pascal');
const published = path.join(ROOT, 'V4/creations', ID), work = file('work/pascal');
const catalogue = path.join(ROOT, 'V4/donnees/catalogue.json');
const shared = ['card.png', 'card.psd', 'illustration.png', 'verification.json'];
const renderFiles = ['native.json', 'reopened.png', 'without-text.png', 'expected-components.png', 'component-00.png'];
const tx = transactionIO(L, file('transaction.json'));
const code = ['revise.cjs', 'replace.jsx'].map(file).concat([
  '../2026-09-23-nier-art-refinement/transaction.cjs', '../../scripts/stable/common.jsx',
  '../../collaborations/nier-pilot-01/typography.jsx', '../../collaborations/nier-pilot-01/typography.cjs',
  '../../collaborations/nier-pilot-01/build.cjs', '../../collaborations/ff8-set-01/build.cjs',
  '../../atelier/lib.cjs', '../../atelier/designer-render.cjs', '../../atelier/barcode.py',
  '../2026-09-18-branches/bridge.ps1'
].map(n => path.resolve(__dirname, n)));

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    assert.ok(!e.isSymbolicLink(), 'Lien inattendu : ' + e.name);
    const f = path.join(dir, e.name); return e.isDirectory() ? files(f) : [f];
  }).sort();
}
function unchangedLayers(layers) { return layers.map(({ id, ...l }) => l); }
function targets() {
  return [...[source, published].flatMap(d => shared.map(n => path.join(d, n))),
    path.join(published, 'creation.json'), ...renderFiles.map(n => path.join(source, 'render', n)),
    ...['preview.png', 'small-preview.png'].filter(n => fs.existsSync(path.join(source, n))).map(n => path.join(source, n))];
}
function backup(before, target) { const c = before.changes.find(c => c.target === target); assert.ok(c); return c.backup; }
async function stable() { await L.protectedCheck(); await R.verifyAssets(); }
async function guard(before, state = 'original', after = {}) {
  assert.equal(before.revision, REVISION); assert.equal(before.referenceId, L.baseline().id);
  for (const [f, h] of Object.entries(before.observed)) {
    const mutable = before.changes.some(c => c.target === f);
    if (state === 'mixed' && mutable) continue;
    assert.equal(await hash(f), state === 'published' && mutable ? after[f] : h, 'Modification inattendue : ' + f);
  }
  for (const [dir, inventory] of Object.entries(before.inventory)) assert.deepEqual(files(dir), inventory, 'Inventaire modifie : ' + dir);
  for (const c of before.changes) {
    assert.equal(c.backup, file('originals/' + path.relative(ROOT, c.target)));
    assert.equal(c.stage, file('staging/' + path.relative(ROOT, c.target)));
    assert.equal(await hash(c.backup), c.beforeHash, 'Sauvegarde alteree : ' + c.target);
  }
}
// Preserve the previous proof as-is. Its published bytes remain available either
// live or in this revision's exact backups; no historical hash is refreshed.
async function lineage(before) {
  const proof = read(path.join(previous, 'verified.json')), journal = read(path.join(previous, 'transaction.json'));
  assert.equal(journal.state, 'published'); assert.equal(proof.revision, PRIOR);
  assert.equal(await hash(path.join(previous, 'verified.json')), before.previousProofHash);
  assert.deepEqual(journal.changes, proof.staged);
  for (const c of proof.staged) {
    const current = before.changes.find(n => n.target === c.target);
    assert.equal(await hash(current ? current.backup : c.target), c.afterHash, 'Rupture de filiation : ' + c.target);
  }
}
async function check() {
  return { revision: REVISION, modelId: ID, prepared: fs.existsSync(file('before.json')),
    artReady: fs.existsSync(file('art/pascal.png')), provenanceReady: fs.existsSync(file('art-provenance.json')),
    photoshopRun: false, profileAndCatalogueChanges: false };
}
async function prepare() {
  return B.locked(async () => {
    assert.ok(!fs.existsSync(file('before.json')) && !fs.existsSync(file('originals')), 'Revision deja preparee.');
    const art = file('art/pascal.png'), meta = await sharp(art).metadata();
    assert.equal(meta.format, 'png'); assert.ok(meta.width >= R.ART.width && meta.height >= R.ART.height, 'Illustration trop petite.');
    assert.notEqual(await hash(art), await hash(path.join(source, 'illustration.png')), 'Illustration non corrigee.');
    const provenance = read(file('art-provenance.json')); assert.ok(provenance && typeof provenance === 'object');
    await stable(); assert.equal((await require('../2026-09-23-nier-art-refinement/revise.cjs').preflight()).state, 'published');
    const p = read(path.join(source, 'profile.json')); assert.equal(p.id, ID);
    for (const n of [...shared, 'profile.json']) assert.equal(await hash(path.join(source, n)), await hash(path.join(published, n)));
    const before = { revision: REVISION, referenceId: L.baseline().id,
      previousProofHash: await hash(path.join(previous, 'verified.json')), observed: {}, inventory: {}, changes: [] };
    const observe = async f => { before.observed[f] = await hash(f); };
    for (const dir of [previous, path.join(ROOT, 'V4/creations'), path.dirname(source)]) {
      before.inventory[dir] = files(dir); for (const f of before.inventory[dir]) await observe(f);
    }
    for (const f of [catalogue, art, file('art-provenance.json'), ...code]) await observe(f);
    for (const target of targets()) {
      const b = file('originals/' + path.relative(ROOT, target)); fs.mkdirSync(path.dirname(b), { recursive: true });
      fs.copyFileSync(target, b, fs.constants.COPYFILE_EXCL);
      before.changes.push({ target, backup: b, beforeHash: before.observed[target], stage: file('staging/' + path.relative(ROOT, target)) });
    }
    fs.mkdirSync(path.join(work, 'render'), { recursive: true });
    for (const n of ['profile.json', 'render/composition.json']) fs.copyFileSync(path.join(source, n), path.join(work, n));
    fs.copyFileSync(art, path.join(work, 'illustration.png'));
    const plan = read(path.join(work, 'render/composition.json')), layer = plan.layers.find(l => l.name === ART);
    assert.deepEqual({ left: layer.left, top: layer.top, width: layer.width, height: layer.height }, R.ART);
    assert.equal(layer.file, 'component-00.png');
    for (const l of plan.layers) fs.copyFileSync(path.join(source, 'render', l.file), path.join(work, 'render', l.file));
    await sharp(art).resize(R.ART.width, R.ART.height, { fit: 'cover' }).png().toFile(path.join(work, 'render', layer.file));
    await sharp(await R.composite(plan.layers.map(l => ({ ...l, input: path.join(work, 'render', l.file) })))).png().toFile(path.join(work, 'render/expected-components.png'));
    for (const f of files(work)) await observe(f);
    await guard(before); await lineage(before); write(file('before.json'), before);
    return { prepared: 'pascal', backups: before.changes.length, frozenFiles: Object.keys(before.observed).length, photoshopRun: false };
  });
}
async function render() {
  return B.locked(async () => {
    const before = read(file('before.json')); await stable(); await guard(before); await lineage(before);
    assert.ok(!fs.existsSync(file('verified.json')), 'Rendu deja certifie.');
    write(file('render-request.json'), { revision: REVISION, work,
      original: backup(before, path.join(source, 'card.psd')), native: backup(before, path.join(source, 'render/native.json')) });
    const inputs = await B.hashes([...code, file('before.json'), file('render-request.json'), ...Object.keys(before.observed)]);
    write(file('render-inputs.json'), inputs);
    const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
      path.join(ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', file('replace.jsx')], file('photoshop.log'));
    assert.deepEqual(await B.hashes(Object.keys(inputs)), inputs); await guard(before);
    return { rendered: 'pascal', output };
  });
}
async function verify() {
  return B.locked(async () => {
    const before = read(file('before.json')), inputs = read(file('render-inputs.json'));
    await stable(); await guard(before); await lineage(before); assert.deepEqual(await B.hashes(Object.keys(inputs)), inputs);
    const p = read(path.join(work, 'profile.json')), a = read(path.join(work, 'audit.json'));
    assert.equal(await hash(path.join(work, 'profile.json')), await hash(path.join(source, 'profile.json')));
    const n = read(path.join(work, 'render/native.json')), old = read(path.join(source, 'render/native.json'));
    for (const layers of [a.before, a.after, a.reopened]) assert.deepEqual(unchangedLayers(layers), unchangedLayers(old.layers), 'Calque, texte ou geometrie modifie.');
    assert.deepEqual(n.layers, a.reopened); assert.deepEqual(n.expected, old.expected); assert.deepEqual(n.typography, old.typography);
    const plan = read(path.join(work, 'render/composition.json'));
    assert.deepEqual(a.embedded, Object.fromEntries(plan.layers.map(l => [l.name, true])));
    const originalPixels = await L.diff(path.join(source, 'card.png'), path.join(work, 'before-card.png'));
    const withoutArt = await L.diff(path.join(work, 'before-without-art.png'), path.join(work, 'after-without-art.png'));
    const { left, top, width, height } = R.ART;
    const outside = await L.diff(path.join(source, 'card.png'), path.join(work, 'card.png'), [[left, top, left + width, top + height]]);
    assert.equal(originalPixels.changed, 0); assert.equal(withoutArt.changed, 0); assert.equal(outside.outside, 0); assert.ok(outside.changed > 0);
    const v = { ...await B.verifyNative(work, p), key: 'pascal', revision: REVISION,
      lineage: { previousRevision: PRIOR, previousProofHash: before.previousProofHash,
        previousVerificationHash: before.observed[path.join(source, 'verification.json')], previousPsdHash: before.observed[path.join(source, 'card.psd')],
        originalPreparationHash: before.observed[path.join(source, 'preparation.json')], selectedArtHash: before.observed[file('art/pascal.png')] },
      scope: { originalPixels, withoutArt, outside, changedFields: [], nativeTextUnchanged: true, geometryUnchanged: true, embeddedObjects: true } };
    write(path.join(work, 'verification.json'), v);
    const staged = [];
    for (const c of before.changes) {
      const name = path.basename(c.target); fs.mkdirSync(path.dirname(c.stage), { recursive: true });
      if (name === 'creation.json') {
        const creation = read(c.target);
        for (const name of shared) creation.hashes[name] = await hash(path.join(work, name));
        creation.nativeRevision = { id: REVISION, proof: 'V4/revisions/' + REVISION + '/verified.json',
          previousRevision: PRIOR, previousCreationHash: c.beforeHash };
        write(c.stage, creation);
      } else if (name === 'small-preview.png') {
        await sharp(path.join(work, 'card.png')).extract({ left: 50, top: 50, width: 797, height: 1388 }).resize({ width: 320 }).png().toFile(c.stage);
      } else {
        const relative = c.target.startsWith(path.join(source, 'render') + path.sep) ? 'render/' + name : name === 'preview.png' ? 'card.png' : name;
        fs.copyFileSync(path.join(work, relative), c.stage);
      }
      staged.push({ ...c, afterHash: await hash(c.stage) });
    }
    const proof = { revision: REVISION, beforeHash: await hash(file('before.json')), inputs, staged, verification: v,
      evidence: await B.hashes(['audit.json', 'before-card.png', 'before-without-art.png', 'after-without-art.png', 'verification.json'].map(n => path.join(work, n))) };
    await guard(before); await current(proof, true); write(file('verified.json'), proof);
    return { verified: 'pascal', profileAndCatalogueUnchanged: true, productionUnchanged: true };
  });
}
async function current(proof, staging = false) {
  const map = new Map(proof.staged.map(c => [c.target, staging ? c.stage : c.target]));
  const resolve = f => map.get(f) || f;
  for (const c of proof.staged) assert.equal(await hash(resolve(c.target)), c.afterHash);
  for (const name of [...shared, 'profile.json']) assert.equal(await hash(resolve(path.join(source, name))), await hash(resolve(path.join(published, name))));
  const creation = read(resolve(path.join(published, 'creation.json'))), v = read(resolve(path.join(source, 'verification.json')));
  assert.equal(creation.nativeRevision.id, REVISION); assert.deepEqual(v, proof.verification); assert.equal(v.passed, true);
  assert.equal(v.profileHash, await hash(path.join(source, 'profile.json')));
  for (const [name, h] of Object.entries(creation.hashes)) assert.equal(await hash(resolve(path.join(published, name))), h);
  for (const [name, h] of Object.entries(v.hashes)) assert.equal(await hash(resolve(path.join(source, name))), h);
}
async function integrity(before, proof) {
  assert.equal(proof.revision, REVISION); assert.equal(proof.beforeHash, await hash(file('before.json')));
  assert.deepEqual(proof.staged.map(({ afterHash, ...c }) => c), before.changes);
  for (const c of proof.staged) assert.equal(await hash(c.stage), c.afterHash);
  for (const [f, h] of Object.entries(proof.inputs)) {
    const c = before.changes.find(c => c.target === f); assert.equal(await hash(c ? c.backup : f), h, 'Entree modifiee : ' + f);
  }
  assert.deepEqual(await B.hashes(Object.keys(proof.evidence)), proof.evidence); await lineage(before);
}
async function preflight() {
  const before = read(file('before.json')), proof = read(file('verified.json'));
  const done = fs.existsSync(file('transaction.json')) && read(file('transaction.json')).state === 'published';
  await stable(); await integrity(before, proof);
  await guard(before, done ? 'published' : 'original', Object.fromEntries(proof.staged.map(c => [c.target, c.afterHash])));
  await current(proof, !done);
  return { revision: REVISION, state: done ? 'published' : 'staged', verified: 'pascal', profileAndCatalogueUnchanged: true, historicalLineageVerified: true };
}
async function publish() {
  return B.locked(async () => {
    const before = read(file('before.json')), proof = read(file('verified.json'));
    return tx.commit({ revision: REVISION, beforeHash: proof.beforeHash, changes: proof.staged }, {
      before: preflight, guard: () => guard(before, 'mixed'),
      after: async () => { await guard(before, 'published', Object.fromEntries(proof.staged.map(c => [c.target, c.afterHash]))); await stable(); await integrity(before, proof); await current(proof); },
      afterRollback: async () => { await guard(before); await stable(); await lineage(before); }
    });
  });
}
async function rollback() {
  return B.locked(async () => {
    const before = read(file('before.json')), proof = read(file('verified.json')), journal = read(file('transaction.json'));
    assert.equal(journal.revision, REVISION); assert.equal(journal.beforeHash, await hash(file('before.json')));
    assert.deepEqual(journal.changes, proof.staged); await integrity(before, proof);
    return tx.rollback(journal, { guard: () => guard(before, 'mixed'), afterRollback: async () => { await guard(before); await stable(); await lineage(before); } });
  });
}
module.exports = { check, prepare, render, verify, preflight, publish, rollback, unchangedLayers, targets };
if (require.main === module) {
  const action = process.argv[2] || 'check'; assert.ok(['check', 'prepare', 'render', 'verify', 'preflight', 'publish', 'rollback'].includes(action));
  module.exports[action]().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
