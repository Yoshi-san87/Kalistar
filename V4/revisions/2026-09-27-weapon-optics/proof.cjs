'use strict';
const L = require('../../atelier/lib.cjs');
const W = require('./revise.cjs');
const { metrics } = require('./calibrate.cjs');
const { fs, path, ROOT, read, write, sharp, assert, hash } = L;
const RECT = { left: 74, top: 1100, width: 128, height: 128 };
async function circularDiff(before, after) {
  const a = await sharp(before).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(after).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual(a.info, b.info);
  let changed = 0, outside = 0, maximumChangedRadius = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))) continue;
    changed++;
    const x = i / 4 % a.info.width, y = Math.floor(i / 4 / a.info.width);
    const radius = Math.hypot(Math.max(Math.abs(x - 137), Math.abs(x + 1 - 137)), Math.max(Math.abs(y - 1163.5), Math.abs(y + 1 - 1163.5)));
    maximumChangedRadius = Math.max(maximumChangedRadius, radius);
    if (radius > 47.5) outside++;
  }
  return { changed, outside, maximumChangedRadius, permittedRadius: 47.5, pixelCornersChecked: true };
}
function nativeLayers(native, layerName) {
  assert.equal(native.before.length, native.reopened.length);
  for (let i = 0; i < native.before.length; i++) {
    const a = structuredClone(native.before[i]), b = structuredClone(native.reopened[i]);
    if (a.name === layerName) {
      assert.equal(a.kind, 'LayerKind.SMARTOBJECT'); assert.equal(b.kind, 'LayerKind.SMARTOBJECT');
      delete a.id; delete b.id; delete a.bounds; delete b.bounds;
    } else if (!a.kind) { delete a.bounds; delete b.bounds; }
    assert.deepEqual(b, a, 'Unexpected native change: ' + a.path);
  }
  return { unchangedExcept: layerName, editableTextsPreserved: true, embeddedWeapon: true };
}
async function review(pilot = false) {
  const baseline = read(W.file('before.json')); await W.guard(baseline);
  const calibration = read(W.file('calibration.json'));
  const items = baseline.items.filter(i => !pilot || ['voloden', 'iliane'].includes(i.key));
  const results = [], panels = [];
  fs.mkdirSync(W.file('proof'), { recursive: true });
  for (const [index, item] of items.entries()) {
    const dir = W.file('staged/' + item.key), native = read(path.join(dir, 'native.json'));
    const comparison = await circularDiff(path.join(ROOT, item.png), path.join(dir, 'card.png'));
    assert.equal(comparison.outside, 0); assert.ok(comparison.changed > 0);
    const roundtrip = await L.diff(path.join(dir, 'card.png'), path.join(dir, 'reopened.png')); assert.equal(roundtrip.changed, 0);
    const layers = nativeLayers(native, item.layer);
    let contour = null, repeat = null;
    if (item.kind === 'approved') {
      contour = metrics(await sharp(path.join(dir, 'motif.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), calibration.weapon[item.weapon].centroidWeight);
      assert.ok(contour.fullRadius <= 44, 'Full alpha contour touches rim');
      assert.ok(contour.opticalError <= .8, 'Optical anchor not centred');
      repeat = await L.diff(path.join(dir, 'card.png'), path.join(dir, 'repeat.png')); assert.equal(repeat.changed, 0);
    }
    let barcode = null;
    if (!pilot) {
      const R = require('../../atelier/designer-render.cjs');
      barcode = JSON.parse(await R.command(L.PYTHON, [path.join(ROOT, 'V4/atelier/barcode.py'), path.join(dir, 'card.png'), item.id]));
      assert.equal(barcode.passed, true);
    }
    results.push({ key: item.key, id: item.id, weapon: item.weapon, comparison, roundtrip, repeat, contour, layers, barcode,
      psdHash: await hash(path.join(dir, 'card.psd')), pngHash: await hash(path.join(dir, 'card.png')), nativeHash: await hash(path.join(dir, 'native.json')) });
    const tiles = [];
    for (const [side, source] of [[0, path.join(ROOT, item.png)], [1, path.join(dir, 'card.png')]]) {
      tiles.push({ input: await sharp(source).extract(RECT).resize(384, 384).png().toBuffer(), left: side * 408, top: 36 });
      tiles.push({ input: await sharp(source).extract(RECT).png().toBuffer(), left: side * 408 + 112, top: 440 });
    }
    tiles.push({ input: Buffer.from(`<svg width="816" height="600"><text x="16" y="26" font-size="20" font-family="Arial">${item.name} / ${item.weapon} - AVANT</text><text x="424" y="26" font-size="20" font-family="Arial">APRES - rendu Photoshop</text></svg>`), left: 0, top: 0 });
    const tile = await sharp({ create: { width: 816, height: 600, channels: 4, background: '#e4e9ed' } }).composite(tiles).png().toBuffer();
    panels.push({ input: tile, left: 0, top: index * 600 });
    await sharp(path.join(dir, 'card.png')).resize({ width: 300 }).png().toFile(W.file('proof/' + item.key + '-small.png'));
  }
  const image = W.file('proof/' + (pilot ? 'pilot-before-after' : 'six-cards-before-after') + '.png');
  await sharp({ create: { width: 816, height: 600 * panels.length, channels: 4, background: '#e4e9ed' } }).composite(panels).png().toFile(image);
  const future = [];
  if (!pilot) for (const key of ['voloden', 'iliane']) {
    const dir = W.file('staged/' + key), report = read(path.join(dir, 'bind-native.json'));
    assert.equal(report.actualProductionBind, true); assert.equal(report.layoutRead, true);
    const motif = await L.diff(path.join(dir, 'motif.png'), path.join(dir, 'bind-motif.png'));
    const bank = await L.diff(path.join(dir, 'bank.png'), path.join(dir, 'bind-bank.png'));
    assert.equal(motif.changed, 0); assert.equal(bank.changed, 0);
    future.push({ key, actualProductionBind: true, motif, bank, nativeHash: await hash(path.join(dir, 'bind-native.json')) });
  }
  const output = { revision: baseline.revision, passed: true, phase: pilot ? 'pilot-awaiting-parent-visual-review' : 'native-verified-awaiting-publication',
    referenceId: baseline.referenceId, productionModified: false, photoshop: '26.11.7', results, future, image: W.rel(image),
    calibrationHash: await hash(W.file('calibration.json')),
    nativeAlphaVerifiedOnlyFor: ['Faucille', 'Tome'], otherWeaponAuditIsProxyOnly: true, checkedAt: new Date().toISOString() };
  write(W.file(pilot ? 'pilot-verification.json' : 'verification.json'), output);
  console.log({ cards: results.length, outside: 0, roundtrip: 0, image: W.rel(image) });
  return output;
}
if (require.main === module) review(process.argv[2] === '--pilot').catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { circularDiff, nativeLayers, review };
