const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const folder = path.join(root, 'V4/momo-bottom/number-type');
const output = path.join(root, 'V4/cartes/MOMO_V4_05_CHIFFRES_LISIBLES.png');
const raw = file => sharp(path.join(folder, file)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

(async () => {
  const before = await raw('before-photoshop.png'), after = await raw('after-photoshop.png'), reopened = await raw('reopened-photoshop.png');
  const typography = JSON.parse(fs.readFileSync(path.join(folder, 'typography.json'), 'utf8'));
  const expected = ['202', '167', '84', '29', '200', '167', '100', '59', '11'];
  const report = {
    width: after.info.width, height: after.info.height, changedOutsideNumberFootprints: 0, changedPixels: 0,
    allValuesPreserved: typography.numbers.map(n => n.value).join(',') === expected.join(','),
    allSavedFontsMatch: typography.numbers.every(n => n.savedFont === typography.font),
    allCentersWithinHalfPixel: typography.numbers.every(n => Math.abs((n.inkBounds[0] + n.inkBounds[2]) / 2 - n.targetCenter[0]) <= .5 && Math.abs((n.inkBounds[1] + n.inkBounds[3]) / 2 - n.targetCenter[1]) <= .5),
    allNumberHeightsIncreased: typography.numbers.every(n => n.inkBounds[3] - n.inkBounds[1] > n.oldInkBounds[3] - n.oldInkBounds[1]),
    savedPsdRendersIdentically: after.data.equals(reopened.data),
    previousPsdUnchanged: hash('V4/templates/MOMO_V4_04_OMBRE_ATTACHE.psd') === 'f4ca6a646d874998eb25629a2a7aa9b432b40249bc369006414a2d373181783e',
    previousPngUnchanged: hash('V4/cartes/MOMO_V4_04_OMBRE_ATTACHE.png') === '8fc2e570b64661b50e8575966157d97293cde22ee128f8313c80ad2069490246',
  };
  const boxes = typography.numbers.flatMap(n => [
    [n.oldInkBounds[0] - 14, n.oldInkBounds[1] - 14, n.oldInkBounds[2] + 14, n.oldInkBounds[3] + 17],
    [n.inkBounds[0] - 5, n.inkBounds[1] - 5, n.inkBounds[2] + 5, n.inkBounds[3] + 6],
  ]);
  for (let y = 0; y < 1497; y++) for (let x = 0; x < 897; x++) {
    const index = (y * 897 + x) * 3;
    if ([0, 1, 2].every(c => before.data[index + c] === after.data[index + c])) continue;
    report.changedPixels++;
    if (!boxes.some(b => x >= b[0] && x < b[2] && y >= b[1] && y < b[3])) report.changedOutsideNumberFootprints++;
  }
  await sharp(after.data, { raw: after.info }).withIccProfile('srgb').withMetadata({ density: 300 }).png().toFile(output);
  const artBox = { left: 48, top: 48, width: 800, height: 1400 };
  await sharp(output).extract(artBox).resize({ height: 1200 }).png().toFile(path.join(folder, 'preview.png'));
  const images = []; let offset = 0;
  for (const width of [180, 240]) for (const source of [before, after]) {
    const input = await sharp(source.data, { raw: source.info }).extract(artBox).resize({ width }).png().toBuffer();
    images.push({ input, left: offset, top: 0 }); offset += width + 16;
  }
  await sharp({ create: { width: offset - 16, height: 420, channels: 3, background: '#11191b' } }).composite(images).png().toFile(path.join(folder, 'game-size-comparison.png'));
  const statBox = { left: 692, top: 320, width: 85, height: 304 };
  const oldStats = await sharp(before.data, { raw: before.info }).extract(statBox).resize({ width: 170 }).png().toBuffer();
  const newStats = await sharp(after.data, { raw: after.info }).extract(statBox).resize({ width: 170 }).png().toBuffer();
  await sharp({ create: { width: 356, height: 608, channels: 3, background: '#11191b' } }).composite([{ input: oldStats, left: 0, top: 0 }, { input: newStats, left: 186, top: 0 }]).png().toFile(path.join(folder, 'stats-comparison.png'));
  fs.writeFileSync(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.width !== 897 || report.height !== 1497 || report.changedOutsideNumberFootprints || !report.allValuesPreserved || !report.allSavedFontsMatch || !report.allCentersWithinHalfPixel || !report.allNumberHeightsIncreased || !report.savedPsdRendersIdentically || !report.previousPsdUnchanged || !report.previousPngUnchanged) throw new Error('Numeric typography verification failed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
