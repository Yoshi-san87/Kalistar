'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs'), P = require('./revise.cjs');
const { transactionIO } = require('../2026-09-23-nier-art-refinement/transaction.cjs');
const { fs, path, read, write, hash } = L;
const source = path.join(L.ROOT, 'V4/expansions/2026-09-24-royal-training/cards/kaylis-entrainement');

test('publication has exactly six targets, never protected expansion, source art or profile', () => {
  const targets = P.targets(); assert.equal(targets.length, 6); assert.equal(new Set(targets).size, 6);
  assert.deepEqual(targets.map(f => path.relative(L.ROOT, f).replaceAll('\\', '/')), [
    'V4/creations/49055457/card.psd', 'V4/creations/49055457/card.png',
    'V4/creations/49055457/illustration.png', 'V4/creations/49055457/verification.json',
    'V4/creations/49055457/creation.json', 'V4/donnees/catalogue.json'
  ]);
  for (const f of targets) assert.ok(!Object.hasOwn(L.baseline().protectedFiles, path.relative(L.ROOT, f).replaceAll('\\', '/')));
});
test('native and publication routes reject missing explicit GO before reading or writing anything', async () => {
  await assert.rejects(P.render(), /GO natif/); await assert.rejects(P.publish(), /GO publication/);
  await assert.rejects(P.rollback(), /GO restauration/);
  await assert.rejects(P.render({ goNative: true, art: '../other.png' }), /Art finale/);
  await assert.rejects(P.render({ goNative: true, art: 'art/../other.png' }), /Chemin interdit/);
});
test('preview is separate and non-publishable, rejects path escapes', async () => {
  await assert.rejects(P.preview({ art: 'art/../../source.png' }), /PNG QA/);
  const code = fs.readFileSync(path.join(__dirname, 'revise.cjs'), 'utf8');
  assert.match(code, /qaOnly: true, native: false, publishable: false/);
});
test('layer audit catches native geometry and text changes; only transient IDs are ignored', () => {
  const layers = read(path.join(source, 'render/native.json')).layers;
  assert.deepEqual(P.unchangedLayers(layers), P.unchangedLayers(layers.map(l => ({ ...l, id: 999 }))));
  for (const name of ['ILLUSTRATION - cadrage', 'NOM', 'TITLE', 'DESCRIPTION']) {
    const changed = structuredClone(layers); changed.find(l => l.name === name).bounds[0]++;
    assert.notDeepEqual(P.unchangedLayers(layers), P.unchangedLayers(changed));
  }
  const changed = structuredClone(layers); changed.find(l => l.name === 'NOM').text = 'WRONG';
  assert.notDeepEqual(P.unchangedLayers(layers), P.unchangedLayers(changed));
});
test('native script replaces exactly one embedded object, with no transforms, flattening or text writes', () => {
  const code = fs.readFileSync(path.join(__dirname, 'replace.jsx'), 'utf8');
  assert.equal((code.match(/placedLayerReplaceContents/g) || []).length, 1);
  assert.match(code, /component-00\.png/); assert.match(code, /nativeStyleRuns/);
  assert.match(code, /request.goNative !== true/);
  assert.doesNotMatch(code, /\.(?:flatten|rasterize|resize|translate)\(|\.textItem\s*=|\.contents\s*=|KT\.apply\(/);
});
test('local bridge attaches to inspected Photoshop only and retains the shared native mutex', () => {
  const code = fs.readFileSync(path.join(__dirname, 'render.ps1'), 'utf8');
  assert.match(code, /GetActiveObject\('Photoshop.Application.200'\)/);
  assert.match(code, /Local\\KalistarV4AtelierRender/);
  assert.match(code, /27\.10\.0/);
  assert.doesNotMatch(code, /New-Object -ComObject|Start-Process|Stop-Process|\.Quit\(/);
});
test('source and creation profiles agree, including unchanged crop and exact art window', () => {
  const published = path.join(L.ROOT, 'V4/creations/49055457/profile.json');
  assert.ok(fs.readFileSync(published).equals(fs.readFileSync(path.join(source, 'profile.json'))));
  assert.deepEqual(read(published).crop, { zoom: 1, x: 0, y: 0 });
  assert.deepEqual(read(path.join(source, 'render/composition.json')).layers.find(l => l.name === 'ILLUSTRATION - cadrage'),
    { file: 'component-00.png', name: 'ILLUSTRATION - cadrage', left: 80, top: 156, width: 737, height: 921 });
});
test('89-card catalogue changes only Kaylis native evidence metadata; input is never mutated', () => {
  const old = read(path.join(L.ROOT, 'V4/donnees/catalogue.json')), baseline = structuredClone(old);
  const revision = { id: 'test' }, next = P.revisedCatalogue(old, revision);
  assert.deepEqual(old, baseline); assert.equal(next.cards.length, 89);
  next.cards.forEach((c, i) => assert.deepEqual(c, c.id === '49055457' ? { ...old.cards[i], nativeRevision: revision } : old.cards[i]));
});
async function fixture() {
  const root = path.join(__dirname, 'tests'); fs.mkdirSync(root, { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, 'transaction-')), changes = [];
  for (let i = 0; i < 6; i++) {
    const target = path.join(dir, i + '.json'), backup = path.join(dir, i + '.backup.json'), stage = path.join(dir, i + '.stage.json');
    write(target, { old: i }); fs.copyFileSync(target, backup); write(stage, { next: i });
    changes.push({ target, backup, stage, beforeHash: await hash(target), afterHash: await hash(stage) });
  }
  const journalFile = path.join(dir, 'transaction.json');
  return { changes, journalFile, tx: transactionIO(L, journalFile), journal: { revision: 'fixture', changes } };
}
test('existing atomic transaction publishes all six files and can restore exact original bytes', async () => {
  const f = await fixture(); assert.deepEqual(await f.tx.commit(f.journal), { published: true, files: 6 });
  await f.tx.rollback(read(f.journalFile));
  for (const c of f.changes) assert.equal(await hash(c.target), c.beforeHash);
});
test('CAS rejects an external edit before publication without changing any other file', async () => {
  const f = await fixture(); write(f.changes[2].target, { external: true });
  await assert.rejects(f.tx.commit(f.journal), /Source modifiee/);
  assert.equal(fs.existsSync(f.journalFile), false);
  for (const [i, c] of f.changes.entries()) if (i !== 2) assert.equal(await hash(c.target), c.beforeHash);
});
test('failure mid-publication restores all originals, preserving a recovery journal', async () => {
  const f = await fixture();
  await assert.rejects(f.tx.commit(f.journal, { afterWrite: (c, i) => { if (i === 2) throw Error('injected failure'); } }), /injected failure/);
  assert.equal(read(f.journalFile).state, 'rolled-back');
  for (const c of f.changes) assert.equal(await hash(c.target), c.beforeHash);
});
test('rollback refuses to overwrite a concurrent external change', async () => {
  const f = await fixture();
  await assert.rejects(f.tx.commit(f.journal, { afterWrite: (c, i) => {
    if (i === 2) { write(f.changes[0].target, { external: 'preserve' }); throw Error('interrupted'); }
  } }), /restauration bloquee/);
  assert.equal(read(f.journalFile).state, 'rollback-blocked');
  assert.deepEqual(read(f.changes[0].target), { external: 'preserve' });
});
