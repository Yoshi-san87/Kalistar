const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const folder = path.join(root, 'V4/momo-bottom/gold-alignment');
const output = path.join(root, 'V4/cartes/MOMO_V4_10_FONDS_RECENTRES.png');
const raw = file => sharp(path.join(folder, file)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

(async () => {
  const before = await raw('before-photoshop.png'), after = await raw('after-photoshop.png'), reopened = await raw('reopened-photoshop.png');
  const data = JSON.parse(fs.readFileSync(path.join(folder, 'alignment.json'), 'utf8'));
  const editable = new Set(data.objects.map(l => l.id));
  const unexpected = data.before.filter(l => !editable.has(l.id) && JSON.stringify(l) !== JSON.stringify(data.after.find(a => a.id === l.id))).map(l => l.name);
  const report = {
    width: after.info.width, height: after.info.height, changedPixels: 0, changedOutsideAtkInteriors: 0,
    unexpectedLayerChanges: unexpected,
    sixEditableSmartObjects: data.objects.length === 6 && data.objects.every(l => l.kind === 'LayerKind.SMARTOBJECT' && l.vectorMask),
    masksAligned: data.objects.every((l, i) => {
      const p = data.capsules[i], expected = [p.cx - p.radius, p.cy - p.radius, p.cx + p.radius, p.cy + p.radius];
      return l.bounds.every((v, n) => Math.abs(v - expected[n]) <= 1);
    }),
    masksCircular: data.capsules.filter(p => p.die !== 6).every(p => Math.abs(p.maskArea / (Math.PI * p.radius ** 2) - 1) < .02),
    savedPsdRendersIdentically: after.data.equals(reopened.data),
    sourcePsdUnchanged: hash('V4/templates/MOMO_V4_09_OR_GENERE_INTEGRE.psd') === '00746994c0518c309e7689036a4af0bad03d322684e497df55bb0b8a05b6bd0b',
  };
  if (before.info.width !== after.info.width || before.info.height !== after.info.height) throw Error('Dimensions changed.');
  for (let y = 0; y < after.info.height; y++) for (let x = 0; x < after.info.width; x++) {
    const index = (y * after.info.width + x) * 3;
    if ([0, 1, 2].every(c => before.data[index + c] === after.data[index + c])) continue;
    report.changedPixels++;
    if (!data.capsules.some(p => Math.hypot(x + .5 - p.oldCx, y + .5 - p.oldCy) <= p.oldRadius + 2 || Math.hypot(x + .5 - p.cx, y + .5 - p.cy) <= p.radius + 2)) report.changedOutsideAtkInteriors++;
  }
  fs.writeFileSync(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  await sharp(after.data, { raw: after.info }).withIccProfile('srgb').withMetadata({ density: 300 }).png().toFile(output);
  const art = { left: 48, top: 48, width: 800, height: 1400 };
  await sharp(output).extract(art).resize({ height: 1200 }).png().toFile(path.join(folder, 'preview.png'));
  const images = []; let offset = 0;
  for (const width of [180, 240]) for (const source of [before, after]) {
    const input = await sharp(source.data, { raw: source.info }).extract(art).resize({ width }).png().toBuffer();
    images.push({ input, left: offset, top: 0 }); offset += width + 16;
  }
  await sharp({ create: { width: offset - 16, height: 420, channels: 3, background: '#11191b' } }).composite(images).png().toFile(path.join(folder, 'game-size-comparison.png'));
  const close = [];
  for (const [i, source] of [before, after].entries()) {
    const input = await sharp(source.data, { raw: source.info }).extract({ left: 103, top: 625, width: 107, height: 104 }).resize({ width: 428 }).png().toBuffer();
    close.push({ input, left: i * 444, top: 0 });
  }
  await sharp({ create: { width: 872, height: 416, channels: 3, background: '#11191b' } }).composite(close).png().toFile(path.join(folder, 'potion-before-after.png'));
  if (report.width !== 897 || report.height !== 1497 || !report.changedPixels || report.changedOutsideAtkInteriors || unexpected.length || !report.sixEditableSmartObjects || !report.masksAligned || !report.masksCircular || !report.savedPsdRendersIdentically || !report.sourcePsdUnchanged) throw Error('Gold alignment verification failed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
