const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../..');
const folder = path.join(root, 'momo-bottom');
const output = path.join(root, 'cartes/MOMO_V4_BASE_V3_BAS_V4.png');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function pixels(file) {
  return sharp(file).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

(async () => {
  const source = await pixels(path.join(folder, 'source-v3.png'));
  const result = await pixels(path.join(folder, 'render-photoshop.png'));
  const reopened = await pixels(path.join(folder, 'reopened-photoshop.png'));
  if (source.info.width !== 897 || source.info.height !== 1497 || result.info.width !== 897 || result.info.height !== 1497) {
    throw new Error('Dimensions V3 non conservees.');
  }
  let changedAboveSeam = 0, maximumDeltaAboveSeam = 0, changedBelowSeam = 0;
  for (let y = 0; y < 1497; y++) {
    for (let x = 0; x < 897; x++) {
      let changed = false;
      for (let c = 0; c < 3; c++) {
        const index = (y * 897 + x) * 3 + c;
        const difference = Math.abs(source.data[index] - result.data[index]);
        if (difference) changed = true;
        if (y < 1068) maximumDeltaAboveSeam = Math.max(maximumDeltaAboveSeam, difference);
      }
      if (changed) { if (y < 1068) changedAboveSeam++; else changedBelowSeam++; }
    }
  }
  const sourceHash = sha256(path.join(root, '../V3/templates/01_ELECTRO_MOMO.psd'));
  const approvedHash = sha256(path.join(root, 'cartes/MOMO_ELECTRO_V4_04-typographie.png'));
  const report = {
    width: result.info.width, height: result.info.height, seam: 1068,
    changedAboveSeam, maximumDeltaAboveSeam, changedBelowSeam,
    savedPsdRendersIdentically: result.data.equals(reopened.data),
    sourceUnchanged: sourceHash === 'e151fa172b2c2e52ead0e05d6ffca18d40916dd367ef1089237ca87169cf0e3e',
    approvedReferenceUnchanged: approvedHash === 'b2b0211565dacdcdb902866ee94dfdc41648d5ee7d51c7a652ad72ae0740ba11',
    sourceHash, approvedHash,
  };
  // Re-encode the Photoshop PNG for browser compatibility without resampling.
  await sharp(result.data, { raw: result.info }).withIccProfile('srgb').withMetadata({ density: 300 }).png().toFile(output);
  await sharp(output).extract({ left: 45, top: 1030, width: 805, height: 430 }).png().toFile(path.join(folder, 'bottom-detail.png'));
  await sharp(output).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize({ height: 1200 }).png().toFile(path.join(folder, 'card-preview.png'));
  const oldBottom = await sharp(source.data, { raw: source.info }).extract({ left: 60, top: 1040, width: 780, height: 405 }).png().toBuffer();
  const newBottom = await sharp(output).extract({ left: 60, top: 1040, width: 780, height: 405 }).png().toBuffer();
  await sharp({ create: { width: 1576, height: 405, channels: 3, background: '#161a1b' } }).composite([
    { input: oldBottom, left: 0, top: 0 }, { input: newBottom, left: 796, top: 0 },
  ]).png().toFile(path.join(folder, 'comparison-bottom.png'));
  report.outputHash = sha256(output);
  fs.writeFileSync(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (changedAboveSeam || !report.savedPsdRendersIdentically || !report.sourceUnchanged || !report.approvedReferenceUnchanged) {
    throw new Error('Verification de conservation V3 echouee.');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
