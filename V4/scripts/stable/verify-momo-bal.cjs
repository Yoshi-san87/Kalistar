const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, 'V4/template-stable/momo-bal');
const read = p => JSON.parse(fs.readFileSync(path.resolve(work, p), 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
const raw = p => sharp(path.resolve(work, p)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
function diff(a, b) {
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw Error('Canvas mismatch');
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 3) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) changed++;
  return changed;
}
async function main() {
  const card = read('card.json'), assets = read('assets.json'), render = read('render.json');
  const v3 = read(path.join(root, 'V3/donnees/cartes.json')).find(c => c.id === card.id);
  const result = await raw('render.png');
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const find = name => render.after.find(l => l.name === name);
  const allowed = new Set(render.allowedLayerIds), before = new Map(render.before.map(l => [l.id, l]));
  const unexpected = render.after.filter(l => l.kind && !allowed.has(l.id) && !same(before.get(l.id), l)).map(l => l.name);
  const numbers = render.slots.filter(s => typeof s.value === 'number').every(s => {
    const l = find(`${s.side} D${s.die} - valeur`);
    return l.kind === 'LayerKind.TEXT' && l.visible && l.text === String(s.value) && l.font === 'Bahnschrift-BoldSemiCondensed';
  });
  const active = pattern => render.after.filter(l => l.visible && pattern.test(l.name)).map(l => l.name).sort();
  const halos = active(/^ATK D\d - HALO MAGIQUE$/).map(n => Number(n.match(/D(\d)/)[1])).sort();
  const barriers = active(/^DEF D\d - BARRIERE$/).map(n => Number(n.match(/D(\d)/)[1])).sort();
  const positions = [1, 2, 3, 4, 5].every(n => {
    const t = find(`POSITION SLOT ${n}`), s = find(`SUPPORT SLOT ${n}`), visible = n <= card.positions.length;
    return t.visible === visible && s.visible === visible && t.kind === 'LayerKind.TEXT' && s.kind === 'LayerKind.SMARTOBJECT' && (!visible || t.text === String(card.positions[n - 1]));
  });
  const art = find('ART - MOMO BAL'), donorArt = render.donor.find(l => l.name === 'ILLUSTRATION - remplacer le contenu');
  const regression = {};
  for (const name of ['momo', 'taulio', 'jelly-joe']) regression[name] = diff(await raw(name + '-regression.png'), await raw(name + '-approved.png'));
  const report = {
    canvas: [result.info.width, result.info.height], resolution: render.resolution, photoshop: render.photoshop,
    protectedSourcesUnchanged: Object.entries(assets.protectedFiles).every(([p, h]) => hash(p) === h),
    originalIllustrationUnchanged: hash(assets.artwork) === assets.artworkSha256,
    templateDefaultPixelDifference: diff(await raw('template-previous.png'), await raw('template-new.png')),
    reopenedTemplatePixelDifference: diff(await raw('template-new.png'), await raw('template-reopened.png')),
    reopenedCardPixelDifference: diff(result, await raw('reopened.png')),
    fixedFramePixelDifference: diff(await raw('fixed-template.png'), await raw('fixed-card.png')),
    previousCardsPixelDifference: regression,
    v3MechanicsPreserved: ['atk', 'defense', 'positions', 'magic', 'barriers', 'weapon', 'race', 'element', 'faction'].every(k => same(card[k], v3[k])),
    unexpectedLayerChanges: unexpected,
    numbersCorrect: numbers, positionsCorrect: positions,
    magicCorrect: same(halos, card.magic.slice().sort()), barriersCorrect: same(barriers, card.barriers.slice().sort()),
    effectsCorrect: same(active(/^(ATK|DEF) D\d - effet /), ['ATK D1 - effet mana', 'ATK D3 - effet retry']),
    labelsCorrect: [['NOM', card.name], ['TITLE', card.title], ['JOB', card.job], ['RACE', card.race]].every(([name, text]) => find(name).text === text && find(name).kind === 'LayerKind.TEXT'),
    descriptionCorrect: find('DESCRIPTION').text.replace(/\r/g, ' ') === v3.text,
    illustration: { bounds: art.bounds, sameFramingAsV3: same(art.bounds, donorArt.bounds), editable: art.kind === 'LayerKind.SMARTOBJECT' && art.visible && art.grouped },
    barcodeEditable: find('ID CODE128 - ' + card.id).kind === 'LayerKind.SMARTOBJECT' && find('ID CODE128 - ' + card.id).visible
  };
  const booleans = ['protectedSourcesUnchanged', 'originalIllustrationUnchanged', 'v3MechanicsPreserved', 'numbersCorrect', 'positionsCorrect', 'magicCorrect', 'barriersCorrect', 'effectsCorrect', 'labelsCorrect', 'descriptionCorrect', 'barcodeEditable'];
  report.passed = booleans.every(k => report[k]) && !unexpected.length && report.illustration.editable && report.illustration.sameFramingAsV3 && !report.templateDefaultPixelDifference && !report.reopenedTemplatePixelDifference && !report.reopenedCardPixelDifference && !report.fixedFramePixelDifference && Object.values(regression).every(n => n === 0) && same(report.canvas, [897, 1497]) && report.resolution === 300;
  fs.writeFileSync(path.join(work, 'verification.json'), JSON.stringify(report, null, 2));
  for (const [name, width] of [['preview', 686], ['small-240', 240]]) await sharp(result.data, { raw: result.info }).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize(width).png().toFile(path.join(work, name + '.png'));
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) throw Error('Momo Bal verification failed');
  await sharp(result.data, { raw: result.info }).withIccProfile('srgb').withMetadata({ density: 300 }).png().toFile(path.join(root, 'V4/cartes', card.output + '.png'));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
