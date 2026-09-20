const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const folder = path.join(root, 'V4/momo-bottom/gold-optical');
const output = path.join(root, 'V4/cartes/MOMO_V4_08_OR_DEGRADE_CENTRAGE.png');
const raw = file => sharp(path.join(folder, file)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

(async () => {
  const before = await raw('before-photoshop.png'), after = await raw('after-photoshop.png'), reopened = await raw('reopened-photoshop.png');
  const changes = JSON.parse(fs.readFileSync(path.join(folder, 'changes.json'), 'utf8'));
  const allowed = new Set([...changes.fills, ...changes.icons].map(l => l.id));
  const unexpectedLayers = changes.before.filter(old => !allowed.has(old.id) && JSON.stringify(old) !== JSON.stringify(changes.after.find(l => l.id === old.id))).map(l => l.name);
  const typography = list => list.filter(l => l.kind === 'LayerKind.TEXT');
  const report = {
    width: after.info.width, height: after.info.height, changedPixels: 0, changedOutsideRequestedAreas: 0,
    unexpectedLayerChanges: unexpectedLayers,
    typographyUnchanged: JSON.stringify(typography(changes.before)) === JSON.stringify(typography(changes.after)),
    allIconsTranslatedWithoutResizing: changes.icons.every(i => i.afterBounds.every((v, n) => v === i.beforeBounds[n] + (n % 2 ? i.dy : i.dx))),
    allGradientsRemainEditable: changes.fills.every(l => l.vectorMask && l.kind === 'LayerKind.GRADIENTFILL'),
    savedPsdRendersIdentically: after.data.equals(reopened.data),
    sourcePsdUnchanged: hash('V4/templates/MOMO_V4_07_FONDS_ATK_LISIBLES.psd') === 'fa5f6565e720ad54f90f1f8db0a3b537d238069f8a9d668bb111659ca451cdc8',
  };
  const iconBoxes = changes.icons.flatMap(i => [i.beforeBounds, i.afterBounds]).map(b => [b[0] - 1, b[1] - 1, b[2] + 1, b[3] + 1]);
  if (before.info.width !== after.info.width || before.info.height !== after.info.height) throw Error('Dimensions changed.');
  for (let y = 0; y < after.info.height; y++) for (let x = 0; x < after.info.width; x++) {
    const index = (y * after.info.width + x) * 3;
    if ([0, 1, 2].every(c => before.data[index + c] === after.data[index + c])) continue;
    report.changedPixels++;
    const inside = changes.capsules.some(p => Math.hypot(x + .5 - p.cx, y + .5 - p.cy) <= p.radius + 2) || iconBoxes.some(b => x >= b[0] && x < b[2] && y >= b[1] && y < b[3]);
    if (!inside) report.changedOutsideRequestedAreas++;
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
  const iconImages = [];
  const iconCrops = [{ left: 105, top: 428, width: 102, height: 99 }, { left: 684, top: 428, width: 102, height: 99 }, { left: 105, top: 629, width: 102, height: 99 }];
  for (const [row, source] of [before, after].entries()) for (const [col, box] of iconCrops.entries()) {
    const input = await sharp(source.data, { raw: source.info }).extract(box).resize({ width: 306 }).png().toBuffer();
    iconImages.push({ input, left: col * 322, top: row * 313 });
  }
  await sharp({ create: { width: 950, height: 610, channels: 3, background: '#11191b' } }).composite(iconImages).png().toFile(path.join(folder, 'icons-before-after.png'));
  if (report.width !== 897 || report.height !== 1497 || !report.changedPixels || report.changedOutsideRequestedAreas || unexpectedLayers.length || !report.typographyUnchanged || !report.allIconsTranslatedWithoutResizing || !report.allGradientsRemainEditable || !report.savedPsdRendersIdentically || !report.sourcePsdUnchanged) throw Error('Gold and optical centering verification failed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
