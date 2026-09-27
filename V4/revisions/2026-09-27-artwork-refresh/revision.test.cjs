'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs'), P = require('./revise.cjs');
const { transactionIO } = require('../2026-09-23-nier-art-refinement/transaction.cjs');
const { fs, path, read, write, hash, ROOT } = L;
const local = n => path.join(__dirname, n);

test('only the three specifically requested existing variants are eligible', () => {
  assert.deepEqual(P.specs().map(c => [c.key, c.id]), [['auron', '41124231'], ['kaylis', '49055457'], ['lanio', '47414613']]);
  assert.equal(P.specs().find(c => c.key === 'lanio').title, 'LE VERTIGE POUR RIRE');
});
test('publication is exactly fifteen creation artifacts and the catalogue, never profile or source', () => {
  const t = P.targets(); assert.equal(t.length, 16); assert.equal(new Set(t).size, 16);
  assert.ok(t.every(f => !f.endsWith('profile.json')));
  assert.ok(t.every(f => !Object.hasOwn(L.baseline().protectedFiles, path.relative(ROOT, f).replaceAll('\\', '/'))));
  assert.equal(t.filter(f => f.endsWith('catalogue.json')).length, 1);
});
test('prepare, native render and publication reject absent explicit GO before any writes', async () => {
  await assert.rejects(P.prepare(), /GO natif/); await assert.rejects(P.render(), /GO natif/);
  await assert.rejects(P.publish(), /GO publication/);
  await assert.rejects(P.render({ goNative: true }), /serialise/);
});
test('supplied Kaylis and Lanio assets remain byte identical', async () => {
  for (const c of P.specs().filter(c => c.supplied)) assert.equal(await hash(local(c.art)), await hash(path.join(ROOT, c.supplied)));
});
test('catalogue update only changes the three native revision metadata records', () => {
  const old = read(path.join(ROOT, 'V4/donnees/catalogue.json')), copy = structuredClone(old);
  const revisions = Object.fromEntries(P.specs().map(c => [c.id, { id: 'test', key: c.key }]));
  const next = P.revisedCatalogue(old, revisions);
  assert.deepEqual(old, copy); assert.equal(next.cards.length, old.cards.length);
  next.cards.forEach((c, i) => assert.deepEqual(c, revisions[c.id] ? { ...old.cards[i], nativeRevision: revisions[c.id] } : old.cards[i]));
  assert.throws(() => P.revisedCatalogue(old, { wrong: { id: 'test' } }));
});
test('native audit ignores transient layer IDs only, catches text and geometry drift', () => {
  const layers = read(path.join(ROOT, 'V4/collaborations/ff10-set-01/cards/auron/render/native.json')).layers;
  assert.deepEqual(P.unchangedLayers(layers), P.unchangedLayers(layers.map(l => ({ ...l, id: 999 }))));
  for (const name of ['ILLUSTRATION - cadrage', 'NOM', 'TITLE', 'DESCRIPTION']) {
    const changed = structuredClone(layers); changed.find(l => l.name === name).bounds[0]++;
    assert.notDeepEqual(P.unchangedLayers(layers), P.unchangedLayers(changed));
  }
  const changed = structuredClone(layers); changed.find(l => l.name === 'NOM').text = 'Wrong';
  assert.notDeepEqual(P.unchangedLayers(layers), P.unchangedLayers(changed));
});
test('native script replaces one embedded object without flattening, transforms or text writes', () => {
  const code = fs.readFileSync(local('replace.jsx'), 'utf8');
  assert.equal((code.match(/placedLayerReplaceContents/g) || []).length, 1);
  assert.match(code, /component-00\.png/); assert.match(code, /nativeStyleRuns/);
  assert.match(code, /request.goNative !== true/);
  assert.doesNotMatch(code, /\.(?:flatten|rasterize|resize|translate)\(|\.textItem\s*=|\.contents\s*=|KT\.apply\(/);
});
test('Photoshop bridge retains exclusive mutex and exact approved Photoshop version', () => {
  const code = fs.readFileSync(local('render.ps1'), 'utf8');
  assert.match(code, /GetActiveObject\('Photoshop.Application.190'\)/);
  assert.match(code, /Local\\KalistarV4AtelierRender/); assert.match(code, /26\.11\.7/);
  assert.doesNotMatch(code, /New-Object -ComObject|Start-Process|Stop-Process|\.Quit\(/);
});
async function fixture() {
  fs.mkdirSync(local('tests'), { recursive: true });
  const dir = fs.mkdtempSync(local('tests/transaction-')), changes = [];
  for (let i = 0; i < 16; i++) {
    const target = path.join(dir, i + '.json'), backup = path.join(dir, i + '.backup.json'), stage = path.join(dir, i + '.stage.json');
    write(target, { old: i }); fs.copyFileSync(target, backup); write(stage, { next: i });
    changes.push({ target, backup, stage, beforeHash: await hash(target), afterHash: await hash(stage) });
  }
  const journalFile = path.join(dir, 'transaction.json');
  return { changes, journalFile, tx: transactionIO(L, journalFile), journal: { revision: 'fixture', changes } };
}
test('sixteen-file transaction publishes atomically and restores original bytes', async () => {
  const f = await fixture(); assert.deepEqual(await f.tx.commit(f.journal), { published: true, files: 16 });
  await f.tx.rollback(read(f.journalFile));
  for (const c of f.changes) assert.equal(await hash(c.target), c.beforeHash);
});
test('concurrent source edit is rejected without overwriting it', async () => {
  const f = await fixture(); write(f.changes[2].target, { external: true });
  await assert.rejects(f.tx.commit(f.journal), /Source modifiee/);
  assert.equal(fs.existsSync(f.journalFile), false);
  assert.deepEqual(read(f.changes[2].target), { external: true });
});
test('mid-publication failure restores every source', async () => {
  const f = await fixture();
  await assert.rejects(f.tx.commit(f.journal, { afterWrite: (c, i) => { if (i === 8) throw Error('injected failure'); } }), /injected failure/);
  for (const c of f.changes) assert.equal(await hash(c.target), c.beforeHash);
});
