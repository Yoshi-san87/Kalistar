const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const folder = path.join(root, 'V4/momo-bottom/attachment-shadow');
const target = path.join(root, 'V4/cartes/MOMO_V4_04_OMBRE_ATTACHE.png');
const raw = file => sharp(path.join(folder, file)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

(async () => {
  const before = await raw('before-photoshop.png'), after = await raw('after-photoshop.png'), reopened = await raw('reopened-photoshop.png');
  const report = {
    width: after.info.width, height: after.info.height, changedPixels: 0, changedOutsideAttachment: 0,
    maximumDarkening: 0, savedPsdRendersIdentically: after.data.equals(reopened.data),
    previousPsdUnchanged: hash('V4/templates/MOMO_V4_03_DRAPEAU_CODE_COULEUR.psd') === 'fcc0b77eee93131d96bac1215ed9b46baf64e92510d8179e2683375a2dc98e08',
    previousPngUnchanged: hash('V4/cartes/MOMO_V4_03_DRAPEAU_CODE_COULEUR.png') === 'cf678e5d4f7961a77b8a2b983f5743e8c393c3478ce5511db4798cdf3709ad85',
  };
  for (let y = 0; y < 1497; y++) for (let x = 0; x < 897; x++) {
    const i = (y * 897 + x) * 3;
    if ([0, 1, 2].every(c => before.data[i + c] === after.data[i + c])) continue;
    report.changedPixels++;
    if (!(x >= 660 && x < 776 && y >= 829 && y < 846)) report.changedOutsideAttachment++;
    for (let c = 0; c < 3; c++) report.maximumDarkening = Math.max(report.maximumDarkening, before.data[i + c] - after.data[i + c]);
  }
  await sharp(after.data, { raw: after.info }).withIccProfile('srgb').withMetadata({ density: 300 }).png().toFile(target);
  const box = { left: 661, top: 800, width: 134, height: 95 };
  await sharp(target).extract(box).resize({ width: 536 }).png().toFile(path.join(folder, 'attachment-detail.png'));
  const a = await sharp(before.data, { raw: before.info }).extract(box).resize({ width: 402 }).png().toBuffer();
  const b = await sharp(target).extract(box).resize({ width: 402 }).png().toBuffer();
  await sharp({ create: { width: 820, height: 285, channels: 3, background: '#141a1b' } }).composite([
    { input: a, left: 0, top: 0 }, { input: b, left: 418, top: 0 },
  ]).png().toFile(path.join(folder, 'comparison.png'));
  await sharp(target).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize({ height: 1200 }).png().toFile(path.join(folder, 'preview.png'));
  fs.writeFileSync(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.width !== 897 || report.height !== 1497 || !report.changedPixels || report.maximumDarkening < 40 || report.changedOutsideAttachment || !report.savedPsdRendersIdentically || !report.previousPsdUnchanged || !report.previousPngUnchanged) throw new Error('Shadow-only verification failed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
