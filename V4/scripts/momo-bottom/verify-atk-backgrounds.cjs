const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const folder = path.join(root, 'V4/momo-bottom/atk-backgrounds');
const output = path.join(root, 'V4/cartes/MOMO_V4_07_FONDS_ATK_LISIBLES.png');
const raw = file => sharp(path.join(folder, file)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

(async () => {
  const before = await raw('before-photoshop.png'), after = await raw('after-photoshop.png'), reopened = await raw('reopened-photoshop.png');
  const data = JSON.parse(fs.readFileSync(path.join(folder, 'backgrounds.json'), 'utf8'));
  const changedLayers = data.before.filter(old => {
    const current = data.after.find(layer => layer.id === old.id);
    return JSON.stringify(old) !== JSON.stringify(current);
  }).map(layer => layer.name);
  const report = {
    width: after.info.width, height: after.info.height,
    changedOutsideCapsuleInteriors: 0, changedPixels: 0, changedOriginalLayers: changedLayers,
    editableVectorGradients: data.added.length === 4 && data.added.every(l => l.vectorMask && l.kind === 'LayerKind.GRADIENTFILL'),
    savedPsdRendersIdentically: after.data.equals(reopened.data),
    sourcePsdUnchanged: hash('V4/templates/MOMO_V4_06_CONTRASTE_ATK.psd') === '828e580af65bdb7524c34b5fe830255ec36714b064bd2271de6883b2e7ac66f4',
    includesUserUnsavedChanges: data.sourceHadUnsavedChanges,
  };
  if (before.info.width !== after.info.width || before.info.height !== after.info.height) throw Error('Dimensions changed.');
  for (let y = 0; y < after.info.height; y++) for (let x = 0; x < after.info.width; x++) {
    const index = (y * after.info.width + x) * 3;
    if ([0, 1, 2].every(c => before.data[index + c] === after.data[index + c])) continue;
    report.changedPixels++;
    if (!data.capsules.some(p => Math.hypot(x + .5 - p.cx, y + .5 - p.cy) <= p.radius + 2)) report.changedOutsideCapsuleInteriors++;
  }
  fs.writeFileSync(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
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
  if (report.width !== 897 || report.height !== 1497 || !report.changedPixels || report.changedOutsideCapsuleInteriors || changedLayers.length || !report.editableVectorGradients || !report.savedPsdRendersIdentically || !report.sourcePsdUnchanged) throw Error('ATK backgrounds verification failed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
