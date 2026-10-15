const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, 'V4/template-stable/jelly-joe-encre');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
const raw = p => sharp(path.resolve(work, p)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
function difference(a, b, zones = []) {
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw Error('Different canvases');
  let changed = 0, outside = 0;
  for (let i = 0; i < a.data.length; i += 3) {
    if (a.data[i] === b.data[i] && a.data[i + 1] === b.data[i + 1] && a.data[i + 2] === b.data[i + 2]) continue;
    changed++;
    const x = i / 3 % a.info.width, y = Math.floor(i / 3 / a.info.width);
    if (!zones.some(([l, t, r, b]) => x >= l && x < r && y >= t && y < b)) outside++;
  }
  return { changed, outside };
}
async function main() {
  const card = read(path.join(work, 'card.json')), assets = read(path.join(work, 'assets.json')), render = read(path.join(work, 'render.json'));
  const v3 = read(path.join(root, 'V3/donnees/cartes.json')).find(c => c.id === card.id);
  const before = await raw('previous.png'), after = await raw('render.png'), reopened = await raw('reopened.png');
  const templateBefore = await raw('template-previous.png'), templateAfter = await raw('template-new.png'), templateSaved = await raw('template-reopened.png');
  const fixedA = await raw('fixed-previous.png'), fixedB = await raw('fixed-new.png');
  const find = name => render.after.find(l => l.name === name);
  const art = find('ART - JELLY-JOE');
  const changedLeaves = render.after.filter(l => l.kind && l.name !== 'ART - JELLY-JOE' && !/^(SUPPORT|POSITION) SLOT [12]$/.test(l.name)).filter(l => {
    const previous = render.previous.find(p => p.name === l.name && p.path === l.path);
    if (!previous) return true;
    const clean = v => { const { id, ...other } = v; return other; };
    return JSON.stringify(clean(previous)) !== JSON.stringify(clean(l));
  }).map(l => l.name);
  const numbers = render.slots.filter(s => typeof s.value === 'number').every(s => {
    const l = find(`${s.side} D${s.die} - valeur`);
    return l.kind === 'LayerKind.TEXT' && l.text === String(s.value) && l.visible && l.font === 'Bahnschrift-BoldSemiCondensed';
  });
  const positions = [1, 2, 3, 4, 5].every(n => {
    const t = find(`POSITION SLOT ${n}`), s = find(`SUPPORT SLOT ${n}`), visible = n <= 2;
    return t.visible === visible && s.visible === visible && t.kind === 'LayerKind.TEXT' && s.kind === 'LayerKind.SMARTOBJECT' && (!visible || t.text === String([3, 5][n - 1]));
  });
  const report = {
    canvas: [after.info.width, after.info.height], resolution: render.resolution, photoshop: render.photoshop,
    approvedFilesUnchanged: Object.entries(assets.protectedFiles).every(([p, sha]) => hash(p) === sha),
    approvedArtworkExact: hash(assets.artwork) === assets.sha256 && hash(assets.approvedArtwork) === assets.sha256,
    templateMomoUnchanged: difference(templateBefore, templateAfter), templateSaved: difference(templateAfter, templateSaved),
    changes: difference(before, after, [[79, 155, 818, 1078], [185, 972, 324, 1068]]),
    fixedFrame: difference(fixedA, fixedB), savedPSD: difference(after, reopened),
    unrequestedLayerChanges: changedLeaves,
    statsAndEffectsPreserved: ['atk', 'defense', 'magic', 'barriers', 'weapon', 'race', 'element', 'faction'].every(k => JSON.stringify(card[k]) === JSON.stringify(v3[k])),
    positionOverride: { requested: [3, 5], actual: card.positions, nativeFieldsCorrect: positions },
    numbersCorrect: numbers,
    artwork: { bounds: art.bounds, editable: art.kind === 'LayerKind.SMARTOBJECT' && art.visible && art.grouped }
  };
  report.passed = report.approvedFilesUnchanged && report.approvedArtworkExact && !report.templateMomoUnchanged.changed && !report.templateSaved.changed && !report.changes.outside && !report.fixedFrame.changed && !report.savedPSD.changed && !changedLeaves.length && report.statsAndEffectsPreserved && positions && JSON.stringify(card.positions) === '[3,5]' && numbers && report.artwork.editable && after.info.width === 897 && after.info.height === 1497 && render.resolution === 300;
  fs.writeFileSync(path.join(work, 'verification.json'), JSON.stringify(report, null, 2));
  await sharp(after.data, { raw: after.info }).withIccProfile('srgb').withMetadata({ density: 300 }).png().toFile(path.join(root, 'V4/cartes', card.output + '.png'));
  for (const [name, width] of [['preview', 686], ['small-240', 240]]) await sharp(after.data, { raw: after.info }).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize(width).png().toFile(path.join(work, name + '.png'));
  await sharp(after.data, { raw: after.info }).extract({ left: 172, top: 978, width: 164, height: 90 }).resize(656).png().toFile(path.join(work, 'positions.png'));
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) throw Error('Encre verification failed');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
