const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const folder = path.join(root, 'V4/template-stable/jelly-joe');
const read = p => JSON.parse(fs.readFileSync(path.join(folder, p), 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
const raw = p => sharp(path.resolve(folder, p)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
function difference(a, b) {
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw Error('Different canvases');
  let n = 0;
  for (let i = 0; i < a.data.length; i += 3) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) n++;
  return n;
}
async function main() {
  const extension = read('extension.json'), render = read('render.json'), card = read('card.json'), assets = read('assets.json');
  const ref = await raw('reference-photoshop.png'), template = await raw('template-photoshop.png');
  const result = await raw('render-photoshop.png'), saved = await raw('reopened-photoshop.png');
  const fixedA = await raw('fixed-template.png'), fixedB = await raw('fixed-card.png');
  const taulio = await raw('taulio-regression.png');
  const approvedTaulio = await raw('taulio-approved-current-engine.png');
  const historicalTaulio = await raw(path.join(root, 'V4/cartes/TAULIO_V4_01_TEMPLATE_STABLE.png'));
  const v3 = JSON.parse(fs.readFileSync(path.join(root, 'V3/donnees/cartes.json'), 'utf8').replace(/^\uFEFF/, '')).find(c => c.id === card.id);
  const mechanics = ['atk', 'defense', 'positions', 'magic', 'barriers', 'weapon', 'race', 'element', 'faction'].every(k => JSON.stringify(card[k]) === JSON.stringify(v3[k]));
  const byName = name => render.after.find(l => l.name === name);
  const allowed = new Set(render.allowedLayerIds), before = new Map(render.before.map(l => [l.id, l]));
  const unexpected = render.after.filter(l => l.kind && !allowed.has(l.id) && JSON.stringify(before.get(l.id)) !== JSON.stringify(l)).map(l => l.name);
  const numbers = render.slots.filter(s => typeof s.value === 'number').map(s => {
    const l = byName(`${s.side} D${s.die} - valeur`);
    return { slot: `${s.side}${s.die}`, value: s.value, correct: l.kind === 'LayerKind.TEXT' && l.visible && l.text === String(s.value) && l.font === 'Bahnschrift-BoldSemiCondensed' };
  });
  const activeHalos = render.after.filter(l => l.visible && /HALO MAGIQUE$/.test(l.name)).map(l => Number(l.name.match(/D(\d)/)[1])).sort();
  const activeBarriers = render.after.filter(l => l.visible && /BARRIERE$/.test(l.name)).map(l => Number(l.name.match(/D(\d)/)[1])).sort();
  const activeEffects = render.after.filter(l => l.visible && /^(ATK|DEF) D\d - effet /.test(l.name)).map(l => l.name).sort();
  const cloth = byName('FACTION - Crabazar - tissu source');
  const diffs = { extendedTemplate: difference(ref, template), savedPSD: difference(result, saved), fixedFrame: difference(fixedA, fixedB), taulioRegressionSameEngine: difference(taulio, approvedTaulio), taulioHistoricalExport: difference(approvedTaulio, historicalTaulio) };
  const report = {
    canvas: [result.info.width, result.info.height],
    templateMomoUnchanged: diffs.extendedTemplate === 0,
    fixedFrameIdentical: diffs.fixedFrame === 0,
    savedPsdRendersIdentically: diffs.savedPSD === 0,
    taulioReproducedExactly: diffs.taulioRegressionSameEngine === 0,
    photoshop: read('engine.json').version,
    v3MechanicsPreserved: mechanics,
    originalFilesUnchanged: Object.entries(assets.protectedFiles).every(([p, sha]) => hash(p) === sha),
    generatedArtworkUnmodified: hash(assets.artwork) === assets.artworkSha256 && hash(assets.generatedSource) === assets.artworkSha256,
    unexpectedLayerChanges: unexpected,
    numbers,
    activeHalos, activeBarriers, activeEffects,
    effectsCorrect: JSON.stringify(activeEffects) === JSON.stringify(['ATK D1 - effet guard', 'ATK D3 - effet buff_atk', 'ATK D5 - effet mana']),
    magicCorrect: JSON.stringify(activeHalos) === JSON.stringify(card.magic.slice().sort()),
    barriersCorrect: JSON.stringify(activeBarriers) === JSON.stringify(card.barriers.slice().sort()),
    artworkEditable: byName('ART - JELLY-JOE').kind === 'LayerKind.SMARTOBJECT' && byName('ART - JELLY-JOE').visible,
    flagBounds: cloth.bounds,
    flagWithinEnvelope: cloth.bounds[0] >= 665 && cloth.bounds[2] <= 776 && cloth.bounds[1] >= 824 && cloth.bounds[3] <= 1053,
    nativePosition: byName('POSITION SLOT 1').kind === 'LayerKind.TEXT' && byName('POSITION SLOT 1').text === '5' && [2, 3, 4, 5].every(n => !byName(`SUPPORT SLOT ${n}`).visible),
    diffs
  };
  fs.writeFileSync(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2));
  await sharp(result.data, { raw: result.info }).withIccProfile('srgb').withMetadata({ density: 300 }).png().toFile(path.join(root, 'V4/cartes', card.output + '.png'));
  await sharp(result.data, { raw: result.info }).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize({ height: 1200 }).png().toFile(path.join(folder, 'preview.png'));
  const crops = {
    lower: { left: 65, top: 1068, width: 765, height: 365 },
    left: { left: 75, top: 67, width: 165, height: 990 },
    right: { left: 665, top: 67, width: 165, height: 990 },
    flag: { left: 657, top: 807, width: 130, height: 255 }
  };
  for (const [name, crop] of Object.entries(crops)) await sharp(result.data, { raw: result.info }).extract(crop).resize({ width: name === 'lower' ? 1000 : 260 }).png().toFile(path.join(folder, name + '.png'));
  const row = [];
  for (const [i, image] of [template, taulio, result].entries()) row.push({ input: await sharp(image.data, { raw: image.info }).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize(240).png().toBuffer(), left: 12 + i * 252, top: 12 });
  await sharp({ create: { width: 768, height: 444, channels: 3, background: '#11181a' } }).composite(row).png().toFile(path.join(folder, 'family-comparison.png'));
  await sharp(result.data, { raw: result.info }).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize(180).png().toFile(path.join(folder, 'small-180.png'));
  console.log(JSON.stringify(report, null, 2));
  const checks = ['templateMomoUnchanged', 'fixedFrameIdentical', 'savedPsdRendersIdentically', 'taulioReproducedExactly', 'v3MechanicsPreserved', 'originalFilesUnchanged', 'generatedArtworkUnmodified', 'effectsCorrect', 'magicCorrect', 'barriersCorrect', 'artworkEditable', 'flagWithinEnvelope', 'nativePosition'];
  if (checks.some(k => !report[k]) || unexpected.length || numbers.some(n => !n.correct)) throw Error('Verification failed');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
