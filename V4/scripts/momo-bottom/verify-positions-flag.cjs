const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const folder = path.join(root, 'V4/momo-bottom/positions-flag');
const output = path.join(root, 'V4/cartes/MOMO_V4_02_POSITIONS_DRAPEAU.png');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const raw = file => sharp(path.join(folder, file)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });

(async () => {
  const before = await raw('before-photoshop.png'), after = await raw('after-photoshop.png'), reopened = await raw('reopened-photoshop.png');
  const report = {
    width: after.info.width, height: after.info.height, changedOutsideRequestedAreas: 0,
    changedBottom: 0, changedBarcode: 0, changedPixels: 0,
    savedPsdRendersIdentically: after.data.equals(reopened.data),
    originalV4Unchanged: hash('V4/templates/MOMO_V4_BASE_V3_BAS_V4.psd') === 'f5f3a30c96e3f34c8e4d23e2911f1be7cb316c81393f0b8fdc6232f066476a14',
    originalV3Unchanged: hash('V3/templates/01_ELECTRO_MOMO.psd') === 'e151fa172b2c2e52ead0e05d6ffca18d40916dd367ef1089237ca87169cf0e3e',
  };
  for (let y = 0; y < 1497; y++) for (let x = 0; x < 897; x++) {
    const i = (y * 897 + x) * 3;
    if (before.data[i] === after.data[i] && before.data[i + 1] === after.data[i + 1] && before.data[i + 2] === after.data[i + 2]) continue;
    report.changedPixels++;
    const leftPositions = x >= 194 && x < 302 && y >= 988 && y < 1060;
    const rightFlagAndPreviousPositions = x >= 670 && x < 805 && y >= 795 && y < 1068;
    if (!leftPositions && !rightFlagAndPreviousPositions) report.changedOutsideRequestedAreas++;
    if (y >= 1068) report.changedBottom++;
    if (x >= 125 && x <= 162 && y >= 835 && y < 1068) report.changedBarcode++;
  }
  await sharp(after.data, { raw: after.info }).withIccProfile('srgb').withMetadata({ density: 300 }).png().toFile(output);
  const scene = { left: 100, top: 805, width: 705, height: 275 };
  await sharp(output).extract(scene).png().toFile(path.join(folder, 'detail.png'));
  await sharp(output).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize({ height: 1200 }).png().toFile(path.join(folder, 'preview.png'));
  const left = await sharp(before.data, { raw: before.info }).extract(scene).png().toBuffer();
  const right = await sharp(output).extract(scene).png().toBuffer();
  await sharp({ create: { width: 1426, height: 275, channels: 3, background: '#171c1e' } }).composite([
    { input: left, left: 0, top: 0 }, { input: right, left: 721, top: 0 },
  ]).png().toFile(path.join(folder, 'comparison.png'));
  fs.writeFileSync(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.width !== 897 || report.height !== 1497 || report.changedOutsideRequestedAreas || report.changedBottom || report.changedBarcode || !report.savedPsdRendersIdentically || !report.originalV4Unchanged || !report.originalV3Unchanged) {
    throw new Error('Le controle de conservation a echoue.');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
