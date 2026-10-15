const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const folder = path.join(root, 'V4/momo-bottom/flag-barcode');
const output = path.join(root, 'V4/cartes/MOMO_V4_03_DRAPEAU_CODE_COULEUR.png');
const raw = file => sharp(file).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

(async () => {
  const before = await raw(path.join(folder, 'before-photoshop.png'));
  const after = await raw(path.join(folder, 'after-photoshop.png'));
  const reopened = await raw(path.join(folder, 'reopened-photoshop.png'));
  const cleanFrame = await raw(path.join(root, 'V4/cartes/MOMO_V4_BASE_V3_BAS_V4.png'));
  const report = {
    width: after.info.width, height: after.info.height, changedOutsideRequestedAreas: 0,
    changedBottom: 0, changedPositions: 0, rightBorderDifferencesFromCleanFrame: 0,
    savedPsdRendersIdentically: after.data.equals(reopened.data),
    previousPsdUnchanged: hash('V4/templates/MOMO_V4_02_POSITIONS_DRAPEAU.psd') === '3df41f4eaec5568b7135739c72bc206afd9b36cfd3e760e535d8eb2add50d5c3',
    previousPngUnchanged: hash('V4/cartes/MOMO_V4_02_POSITIONS_DRAPEAU.png') === 'd4fae0d6320e7521452ea9a54b08f47225a3f93304dfde1b1df1dfc2204b8f19',
  };
  for (let y = 0; y < 1497; y++) for (let x = 0; x < 897; x++) {
    const i = (y * 897 + x) * 3;
    const changed = [0, 1, 2].some(c => before.data[i + c] !== after.data[i + c]);
    if (changed) {
      const flag = x >= 665 && x < 805 && y >= 790 && y < 1068;
      const barcode = x >= 132 && x < 154 && y >= 848 && y < 1058;
      if (!flag && !barcode) report.changedOutsideRequestedAreas++;
      if (y >= 1068) report.changedBottom++;
      if (x >= 194 && x < 302 && y >= 988 && y < 1060) report.changedPositions++;
    }
    if (x >= 780 && x < 830 && y >= 860 && y < 1068 && [0, 1, 2].some(c => cleanFrame.data[i + c] !== after.data[i + c])) report.rightBorderDifferencesFromCleanFrame++;
  }
  await sharp(after.data, { raw: after.info }).withIccProfile('srgb').withMetadata({ density: 300 }).png().toFile(output);
  await sharp(output).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize({ height: 1200 }).png().toFile(path.join(folder, 'preview.png'));
  await sharp(output).extract({ left: 670, top: 795, width: 145, height: 273 }).resize({ width: 435 }).png().toFile(path.join(folder, 'flag-detail.png'));
  await sharp(output).extract({ left: 125, top: 838, width: 60, height: 229 }).resize({ width: 180 }).png().toFile(path.join(folder, 'barcode-detail.png'));
  await sharp(output).extract({ left: 110, top: 797, width: 700, height: 271 }).png().toFile(path.join(folder, 'details.png'));
  fs.writeFileSync(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.width !== 897 || report.height !== 1497 || report.changedOutsideRequestedAreas || report.changedBottom || report.changedPositions || report.rightBorderDifferencesFromCleanFrame || !report.savedPsdRendersIdentically || !report.previousPsdUnchanged || !report.previousPngUnchanged) {
    throw new Error('Preservation check failed.');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
