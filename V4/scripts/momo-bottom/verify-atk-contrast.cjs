const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const folder = path.join(root, 'V4/momo-bottom/atk-contrast');
const output = path.join(root, 'V4/cartes/MOMO_V4_06_CONTRASTE_ATK.png');
const raw = file => sharp(path.join(folder, file)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

(async () => {
  const before = await raw('before-photoshop.png'), after = await raw('after-photoshop.png'), reopened = await raw('reopened-photoshop.png');
  const contrast = JSON.parse(fs.readFileSync(path.join(folder, 'contrast.json'), 'utf8'));
  const report = {
    width: after.info.width, height: after.info.height,
    changedOutsideAtkTextEffects: 0, changedPixels: 0,
    valuesPreserved: contrast.numbers.map(n => n.saved.value).join(',') === '202,167,84,29',
    typographyAndPlacementUnchanged: contrast.numbers.every(n => JSON.stringify(n.before) === JSON.stringify(n.after) && JSON.stringify(n.before) === JSON.stringify(n.saved)),
    savedPsdRendersIdentically: after.data.equals(reopened.data),
    sourcePsdUnchanged: hash('V4/templates/MOMO_V4_05_CHIFFRES_LISIBLES.psd') === '4343dc3534e3736ee423502d69f55c7b442803df6322e31c7992b57fe85e5936',
    sourcePngUnchanged: hash('V4/cartes/MOMO_V4_05_CHIFFRES_LISIBLES.png') === '89afb160f642c4fd0c5b660339026e8e7e769c50d36ddefc88c2a77a26fa3917',
  };
  const boxes = contrast.numbers.map(n => {
    const b = n.before.inkBounds;
    return [b[0] - 8, b[1] - 8, b[2] + 8, b[3] + 10];
  });
  if (before.info.width !== after.info.width || before.info.height !== after.info.height) throw Error('Dimensions changed.');
  for (let y = 0; y < after.info.height; y++) for (let x = 0; x < after.info.width; x++) {
    const index = (y * after.info.width + x) * 3;
    if ([0, 1, 2].every(c => before.data[index + c] === after.data[index + c])) continue;
    report.changedPixels++;
    if (!boxes.some(b => x >= b[0] && x < b[2] && y >= b[1] && y < b[3])) report.changedOutsideAtkTextEffects++;
  }
  fs.writeFileSync(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.width !== 897 || report.height !== 1497 || !report.changedPixels || report.changedOutsideAtkTextEffects || !report.valuesPreserved || !report.typographyAndPlacementUnchanged || !report.savedPsdRendersIdentically || !report.sourcePsdUnchanged || !report.sourcePngUnchanged) throw Error('ATK contrast verification failed.');
  await sharp(after.data, { raw: after.info }).withIccProfile('srgb').withMetadata({ density: 300 }).png().toFile(output);
  const artBox = { left: 48, top: 48, width: 800, height: 1400 };
  await sharp(output).extract(artBox).resize({ height: 1200 }).png().toFile(path.join(folder, 'preview.png'));
  const images = []; let offset = 0;
  for (const width of [180, 240]) for (const source of [before, after]) {
    const input = await sharp(source.data, { raw: source.info }).extract(artBox).resize({ width }).png().toBuffer();
    images.push({ input, left: offset, top: 0 }); offset += width + 16;
  }
  await sharp({ create: { width: offset - 16, height: 420, channels: 3, background: '#11191b' } }).composite(images).png().toFile(path.join(folder, 'game-size-comparison.png'));
  const closeups = [];
  for (const [i, source] of [before, after].entries()) {
    const input = await sharp(source.data, { raw: source.info }).extract({ left: 89, top: 315, width: 135, height: 310 }).resize({ width: 270 }).png().toBuffer();
    closeups.push({ input, left: i * 286, top: 0 });
  }
  await sharp({ create: { width: 556, height: 620, channels: 3, background: '#11191b' } }).composite(closeups).png().toFile(path.join(folder, 'atk-comparison.png'));
})().catch(error => { console.error(error); process.exitCode = 1; });
