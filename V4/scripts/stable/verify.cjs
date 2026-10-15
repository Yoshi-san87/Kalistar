const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const folder = path.join(root, 'V4/template-stable');
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8').replace(/^\uFEFF/, ''));
const hash = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
const raw = name => sharp(path.join(folder, name)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
function diff(a, b, allowed = () => false) {
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw Error('Dimensions differ');
  let changed = 0, outside = 0;
  for (let i = 0; i < a.data.length; i += 3) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) {
    changed++; if (!allowed((i / 3) % a.info.width, Math.floor(i / 3 / a.info.width))) outside++;
  }
  return { changed, outside };
}
async function main() {
  const build = read('build.json'), render = read('render.json'), card = read('taulio.json');
  const source = await raw('reference-photoshop.png'), template = await raw('template-photoshop.png');
  const taulio = await raw('taulio-photoshop.png'), reopened = await raw('taulio-reopened.png');
  const fixedA = await raw('fixed-template.png'), fixedB = await raw('fixed-taulio.png');
  const variant = await raw('test-number-295.png');
  const approved = new Set(render.allowedLayerIds);
  const before = new Map(render.before.map(l => [l.id, l]));
  const unexpected = render.after.filter(l => l.kind && !approved.has(l.id) && JSON.stringify(before.get(l.id)) !== JSON.stringify(l)).map(l => l.name);
  const layer = name => render.after.find(l => l.name === name);
  const v3 = JSON.parse(fs.readFileSync(path.join(root, 'V3/donnees/cartes.json'), 'utf8').replace(/^\uFEFF/, '')).find(c => c.id === card.id);
  const mechanicsPreserved = ['atk', 'defense', 'positions', 'magic', 'barriers', 'weapon', 'race', 'element', 'faction'].every(k => JSON.stringify(card[k]) === JSON.stringify(v3[k]));
  const numbers = render.slots.filter(s => typeof s.value === 'number').map(s => {
    const l = layer(`${s.side} D${s.die} - valeur`);
    return { slot: `${s.side}${s.die}`, correct: l.kind === 'LayerKind.TEXT' && l.visible && l.text === String(s.value) && l.font === 'Bahnschrift-BoldSemiCondensed' };
  });
  const stats = { sourceToTemplate: diff(source, template), savedToReopened: diff(taulio, reopened), fixedFrame: diff(fixedA, fixedB), singleNumberChange: diff(taulio, variant, (x, y) => x >= 695 && x <= 817 && y >= 110 && y <= 193) };
  const report = {
    size: [taulio.info.width, taulio.info.height], ppi: build.ppi,
    approvedMomoPreservedExactly: stats.sourceToTemplate.changed === 0,
    fixedFrameIdentical: stats.fixedFrame.changed === 0,
    savedPsdRendersIdentically: stats.savedToReopened.changed === 0,
    numberEditingLocalized: stats.singleNumberChange.changed > 0 && stats.singleNumberChange.outside === 0,
    unexpectedLayerChanges: unexpected, numbers,
    sixGoldSmartObjects: [6, 5, 4, 3, 2, 1].every(d => layer(`ATK D${d} - OR GENERE - objet dynamique partage`).kind === 'LayerKind.SMARTOBJECT'),
    activeAttackHalos: render.after.filter(l => l.name.endsWith(' - HALO MAGIQUE') && l.visible).map(l => l.name),
    activeDefenseBarriers: render.after.filter(l => l.name.endsWith(' - BARRIERE') && l.visible).map(l => l.name),
    artworkSmartObject: layer('ART - TAULIO').kind === 'LayerKind.SMARTOBJECT' && layer('ART - TAULIO').visible,
    barcodeSmartObject: layer('ID CODE128 - 30000013').kind === 'LayerKind.SMARTOBJECT' && layer('ID CODE128 - 30000013').visible,
    sourceHashesUnchanged: hash('V4/templates/MOMO_V4_10_FONDS_RECENTRES.psd') === 'b7107dab8e58e291badff32c39e94a6fda9d90ef94aeba6c9d0cd80727d3c861' && hash('V3/templates/13_ELECTRO_TAULIO.psd') === 'fbad8a7852fd9b9b592e70e2ba8d5bce1f757d2d4a82ae9458df60b865dce13b',
    v3MechanicsPreserved: mechanicsPreserved,
    diffs: stats
  };
  fs.writeFileSync(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2));
  await sharp(taulio.data, { raw: taulio.info }).withIccProfile('srgb').withMetadata({ density: 300 }).png().toFile(path.join(root, 'V4/cartes', card.output + '.png'));
  for (const [name, image] of [['TAULIO', taulio], ['MOMO', template]]) {
    await sharp(image.data, { raw: image.info }).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize({ height: 1200 }).png().toFile(path.join(folder, name + '-preview.png'));
  }
  const previews = [];
  for (const [n, image] of [['MOMO', template], ['TAULIO', taulio]]) {
    for (const w of [180, 240]) {
      const png = await sharp(image.data, { raw: image.info }).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize(w).png().toBuffer();
      previews.push({ input: png, left: n === 'MOMO' ? (w === 180 ? 12 : 205) : (w === 180 ? 460 : 653), top: 12 });
    }
  }
  await sharp({ create: { width: 906, height: 444, channels: 3, background: '#11181a' } }).composite(previews).png().toFile(path.join(folder, 'small-size-comparison.png'));
  for (const [name, crop] of Object.entries({ lower: { left: 65, top: 1068, width: 765, height: 365 }, right: { left: 665, top: 67, width: 165, height: 1000 }, barcode: { left: 121, top: 837, width: 66, height: 231 } })) {
    await sharp(taulio.data, { raw: taulio.info }).extract(crop).resize({ width: name === 'right' ? 240 : name === 'barcode' ? 198 : 1000 }).png().toFile(path.join(folder, 'TAULIO-' + name + '.png'));
  }
  await sharp(path.join(folder, 'test-five-positions.png')).toColourspace('srgb').extract({ left: 186, top: 985, width: 271, height: 77 }).resize(813).png().toFile(path.join(folder, 'five-positions-preview.png'));
  console.log(JSON.stringify(report, null, 2));
  if (!report.approvedMomoPreservedExactly || !report.fixedFrameIdentical || !report.savedPsdRendersIdentically || !report.numberEditingLocalized || !report.sourceHashesUnchanged || !mechanicsPreserved || unexpected.length || numbers.some(n => !n.correct)) throw Error('Verification failed');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
