const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, 'V4/template-stable/rikka-revision-03');
const read = p => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
async function diff(a, b) {
  const aa = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bb = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual(aa.info, bb.info); let changed = 0;
  for (let i = 0; i < aa.data.length; i += 4) if (!aa.data.subarray(i, i + 4).equals(bb.data.subarray(i, i + 4))) changed++;
  return changed;
}
async function main() {
  const report = read(path.join(work, 'render.json')), card = read(path.join(work, 'card.json'));
  const previous = read('V4/template-stable/rikka-revision-02/card.json'), sources = read(path.join(work, 'sources.json'));
  for (const key of Object.keys(previous)) if (!['output', 'revisionNote'].includes(key)) assert.deepEqual(card[key], previous[key], key);
  for (const [p, h] of Object.entries(sources.protectedFiles)) assert.equal(hash(p), h, p);
  function unchanged(before, after) {
    assert.equal(before.length, after.length); let checked = 0;
    for (const layer of before) if (layer.kind && layer.name !== 'ART - RIKKA') {
      assert.deepEqual(after.find(v => v.id === layer.id), layer, layer.name); checked++;
    }
    return checked;
  }
  const leaves = { master: unchanged(report.masterBefore, report.masterAfter), card: unchanged(report.cardBefore, report.render.after) };
  assert.deepEqual(report.reopened, report.render.after);
  const before = report.artworkBefore, after = report.artworkAfter;
  assert.deepEqual(after.map((v, i) => v - before[i]), [55, 0, 55, 0]);
  assert.equal(report.resolution, 300);
  const checks = {};
  for (const [label, a, b] of [
    ['fixedFrameAndIcons', 'fixed-before.png', 'fixed-after.png'],
    ['defaultMaster', 'master-before.png', 'master-after.png'],
    ['reopenedMaster', 'master-after.png', 'master-reopened.png'],
    ['reopenedCard', 'render.png', 'reopened.png'],
    ['previewMatchesProduction', 'preview.png', 'render.png']
  ]) { checks[label] = await diff(path.join(work, a), path.join(work, b)); assert.equal(checks[label], 0, label); }
  const encoded = await sharp(path.join(work, 'render.png')).withIccProfile('srgb').withMetadata({ density: 300 }).png().toBuffer();
  checks.profiledExport = await diff(encoded, path.join(work, 'render.png')); assert.equal(checks.profiledExport, 0);
  const output = path.join(root, 'V4/cartes/' + card.output + '.png'); fs.writeFileSync(output, encoded);
  const metadata = await sharp(output).metadata(); assert.deepEqual([metadata.width, metadata.height, metadata.density], [897, 1497, 300]); assert.equal(metadata.hasProfile, true);
  await sharp(output).resize({ width: 240 }).toFile(path.join(work, 'small-240.png'));
  await sharp(output).extract({ left: 176, top: 518, width: 195, height: 365 }).resize(390, 730).toFile(path.join(work, 'whip-detail.png'));
  await sharp(output).extract({ left: 620, top: 403, width: 99, height: 123 }).resize(396, 492).toFile(path.join(work, 'kalistel-detail.png'));
  const result = { passed: true, canvas: [897, 1497], density: 300, nativeTranslation: [55, 0], resized: false, regenerated: false, unchangedLeaves: leaves, pixelDifferences: checks, preservedFiles: Object.keys(sources.protectedFiles).length, artworkSha256: hash(card.artworkSource), outputSha256: hash(output), visualApprovalPending: true };
  fs.writeFileSync(path.join(work, 'verification.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
