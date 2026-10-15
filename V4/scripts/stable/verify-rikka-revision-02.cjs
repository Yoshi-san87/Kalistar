const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const measureRim = require('./inspect-rikka-rim.cjs');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, 'V4/template-stable/rikka-revision-02');
const read = p => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
async function pixels(a, b) {
  const aa = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bb = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual(aa.info, bb.info);
  let count = 0;
  for (let i = 0; i < aa.data.length; i += 4) if (!aa.data.subarray(i, i + 4).equals(bb.data.subarray(i, i + 4))) count++;
  return count;
}
async function icon(name, layout) {
  const { data, info } = await sharp(path.join(work, name + '-after.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let maxRadius = 0, outside = 0, green = 0, gx = 0, gy = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4, [r, g, b, a] = data.subarray(i, i + 4);
    if (a >= 32) {
      const radius = Math.hypot(x + .5 - layout.center[0], y + .5 - layout.center[1]);
      maxRadius = Math.max(maxRadius, radius); if (radius > layout.innerRadius) outside++;
    }
    if (a >= 128 && g > r * 1.15 && g > b * 1.2) { green++; gx += x + .5; gy += y + .5; }
  }
  const result = { maxRadius, outside, clearance: layout.innerRadius - maxRadius };
  assert.equal(outside, 0, name + ' outside circle');
  assert.ok(maxRadius <= layout.safeRadius + 1, name + ' lacks breathing room');
  if (name === 'clover') {
    result.greenCentroid = [gx / green, gy / green];
    result.opticalError = Math.hypot(gx / green - layout.center[0], gy / green - layout.center[1]);
    assert.ok(result.opticalError < 1, 'Clover body not optically centred');
  }
  return result;
}
async function main() {
  const report = read(path.join(work, 'render.json')), card = read(path.join(work, 'card.json'));
  const oldCard = read('V4/template-stable/rikka/card.json');
  for (const key of ['atk', 'defense', 'magic', 'barriers', 'positions', 'description', 'id']) assert.deepEqual(card[key], oldCard[key], key);
  const sources = read(path.join(work, 'sources.json'));
  for (const [p, h] of Object.entries(sources.protectedFiles)) assert.equal(hash(p), h, p);
  const changed = new Set(report.changedLayers);
  function unchanged(a, b) {
    assert.equal(a.length, b.length, 'Layer count changed');
    let checked = 0;
    for (const layer of a) {
      if (!layer.kind || changed.has(layer.name)) continue;
      const next = b.find(v => v.id === layer.id);
      assert.deepEqual(next, layer, 'Unexpected change: ' + layer.name); checked++;
    }
    return checked;
  }
  const leavesMaster = unchanged(report.masterBefore, report.masterAfter);
  const leavesCard = unchanged(report.cardBefore, report.render.after);
  assert.deepEqual(report.reopened, report.render.after, 'Reopened PSD differs');
  assert.equal(report.resolution, 300);
  const diffs = {};
  for (const [label, a, b] of [
    ['fixedFrame', 'fixed-before.png', 'fixed-after.png'],
    ['masterDefault', 'master-before.png', 'master-after.png'],
    ['reopenedMaster', 'master-after.png', 'master-reopened.png'],
    ['freshRegisteredRender', 'render.png', 'fresh-render.png'],
    ['reopenedPSD', 'render.png', 'reopened.png'],
    ['repeatCalibration', 'render.png', 'repeat.png']
  ]) { diffs[label] = await pixels(path.join(work, a), path.join(work, b)); assert.equal(diffs[label], 0, label); }
  const icons = {};
  for (const [i, name] of ['dodge', 'clover'].entries()) icons[name] = await icon(name, report.registry.effectLayouts[i]);
  const output = path.join(root, 'V4/cartes/' + card.output + '.png');
  const encoded = await sharp(path.join(work, 'render.png')).withIccProfile('srgb').withMetadata({ density: 300 }).png().toBuffer();
  diffs.profiledExport = await pixels(path.join(work, 'render.png'), encoded);
  assert.equal(diffs.profiledExport, 0, 'ICC export must not change pixels');
  fs.writeFileSync(output, encoded);
  const metadata = await sharp(output).metadata();
  assert.deepEqual([metadata.width, metadata.height], [897, 1497]);
  assert.equal(metadata.density, 300); assert.equal(metadata.hasProfile, true);
  const actualRim = await measureRim(output);
  const motif = icons.clover.greenCentroid, rim = actualRim.pinkInnerRimFit;
  icons.clover.actualPaintedRim = actualRim;
  icons.clover.errorFromActualRim = Math.hypot(motif[0] - rim[0], motif[1] - rim[1]);
  assert.ok(icons.clover.errorFromActualRim < 1, 'Clover must centre on actual painted rim, not just declared target');
  icons.dodge.actualPaintedRim = await measureRim(output, [756, 150], [52, 70], [54, 57]);
  const dodgeRim = icons.dodge.actualPaintedRim.pinkInnerRimFit, dodgeCenter = report.registry.effectLayouts[0].center;
  assert.ok(Math.hypot(dodgeRim[0] - dodgeCenter[0], dodgeRim[1] - dodgeCenter[1]) < 1, 'Dodge target must follow painted rim');
  await sharp(output).resize({ width: 240 }).toFile(path.join(work, 'small-240.png'));
  await sharp(output).extract({ left: 682, top: 78, width: 145, height: 145 }).resize(580, 580).toFile(path.join(work, 'dodge-final-detail.png'));
  await sharp(output).extract({ left: 682, top: 724, width: 108, height: 108 }).resize(432, 432).toFile(path.join(work, 'clover-final-detail.png'));
  await sharp(output).extract({ left: 185, top: 174, width: 490, height: 600 }).toFile(path.join(work, 'museum-final-detail.png'));
  const result = { passed: true, canvas: [metadata.width, metadata.height], ppi: report.resolution, unchangedLeaves: { master: leavesMaster, card: leavesCard }, protectedFiles: Object.keys(sources.protectedFiles).length, pixelDifferences: diffs, icons, sourceArtworkSha256: hash(card.artworkSource), outputSha256: hash(output), note: 'Only the three registered layers changed. Old-card assets remain byte-identical. Technical checks do not replace artistic approval.' };
  fs.writeFileSync(path.join(work, 'verification.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
