const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const folder = path.join(root, 'V4/momo-bottom/generated-gold');
const output = path.join(root, 'V4/cartes/MOMO_V4_09_OR_GENERE_INTEGRE.png');
const raw = file => sharp(path.join(folder, file)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

(async () => {
  const before = await raw('before-photoshop.png'), after = await raw('after-photoshop.png'), reopened = await raw('reopened-photoshop.png');
  const integration = JSON.parse(fs.readFileSync(path.join(folder, 'integration.json'), 'utf8'));
  const hidden = new Set(integration.hidden);
  const unexpected = integration.before.filter(old => {
    const current = integration.after.find(l => l.id === old.id);
    const expected = hidden.has(old.id) ? { ...old, visible: false } : old;
    return JSON.stringify(expected) !== JSON.stringify(current);
  }).map(l => l.name);
  const typography = list => list.filter(l => l.kind === 'LayerKind.TEXT');
  const report = {
    width: after.info.width, height: after.info.height, changedPixels: 0, changedOutsideAtkInteriors: 0,
    unexpectedOriginalLayerChanges: unexpected,
    typographyUnchanged: JSON.stringify(typography(integration.before)) === JSON.stringify(typography(integration.after)),
    sixEditableMaskedSmartObjects: integration.objects.length === 6 && integration.objects.every(l => l.vectorMask && l.kind === 'LayerKind.SMARTOBJECT'),
    sixSavedSmartObjects: integration.objects.every(l => integration.saved.some(saved => saved.id === l.id && saved.kind === 'LayerKind.SMARTOBJECT')),
    allTexturesCoverCapsules: integration.objects.every((l, i) => {
      const p = integration.capsules[i], expected = [p.cx - p.radius, p.cy - p.radius, p.cx + p.radius, p.cy + p.radius];
      return l.bounds.every((v, n) => Math.abs(v - expected[n]) <= 1);
    }),
    savedPsdRendersIdentically: after.data.equals(reopened.data),
    sourcePsdUnchanged: hash('V4/templates/MOMO_V4_08_OR_DEGRADE_CENTRAGE.psd') === '76b9a2c7f745c488fbaaa33a56ece7baa429376818f84acba2c920f66da6ba09',
    approvedArtworkUnchanged: hash('V4/propositions/ronds-generatifs-02/ROND_OR_NUANCE_BORD_SIMPLE.png') === '59c8440cd2454d39f83a1dbcd39fa3bf0c7beae8a4d6297cec8e91053448e71a',
  };
  if (before.info.width !== after.info.width || before.info.height !== after.info.height) throw Error('Dimensions changed.');
  for (let y = 0; y < after.info.height; y++) for (let x = 0; x < after.info.width; x++) {
    const index = (y * after.info.width + x) * 3;
    if ([0, 1, 2].every(c => before.data[index + c] === after.data[index + c])) continue;
    report.changedPixels++;
    if (!integration.capsules.some(p => Math.hypot(x + .5 - p.cx, y + .5 - p.cy) <= p.radius + 2)) report.changedOutsideAtkInteriors++;
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
  const details = [];
  const crops = [{ left: 88, top: 306, width: 139, height: 123 }, { left: 106, top: 428, width: 100, height: 99 }, { left: 106, top: 629, width: 100, height: 99 }];
  for (const [row, source] of [before, after].entries()) for (const [col, box] of crops.entries()) {
    const input = await sharp(source.data, { raw: source.info }).extract(box).resize({ height: 280 }).png().toBuffer();
    details.push({ input, left: col * 334, top: row * 296 });
  }
  await sharp({ create: { width: 988, height: 576, channels: 3, background: '#11191b' } }).composite(details).png().toFile(path.join(folder, 'capsules-before-after.png'));
  if (report.width !== 897 || report.height !== 1497 || !report.changedPixels || report.changedOutsideAtkInteriors || unexpected.length || !report.typographyUnchanged || !report.sixEditableMaskedSmartObjects || !report.sixSavedSmartObjects || !report.allTexturesCoverCapsules || !report.savedPsdRendersIdentically || !report.sourcePsdUnchanged || !report.approvedArtworkUnchanged) throw Error('Generated gold integration verification failed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
