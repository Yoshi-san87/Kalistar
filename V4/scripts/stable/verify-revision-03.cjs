const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, 'V4/template-stable/revision-03');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
const raw = p => sharp(p).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
function diff(a, b, allowed = []) {
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw Error('Canvas mismatch');
  let changed = 0, outside = 0;
  let bounds = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < a.data.length; i += 3) {
    if (a.data[i] === b.data[i] && a.data[i + 1] === b.data[i + 1] && a.data[i + 2] === b.data[i + 2]) continue;
    const pixel = i / 3, x = pixel % a.info.width, y = Math.floor(pixel / a.info.width);
    changed++;
    if (!allowed.some(([l, t, r, b]) => x >= l && x < r && y >= t && y < b)) outside++;
    bounds = [Math.min(x, bounds[0]), Math.min(y, bounds[1]), Math.max(x, bounds[2]), Math.max(y, bounds[3])];
  }
  return { changed, outside, bounds: changed ? bounds : null };
}
async function main() {
  const assets = read(path.join(work, 'assets.json'));
  const registry = read(path.join(root, 'V4/template-stable/registry-electro-03.json'));
  const extension = read(path.join(work, 'extension.json'));
  const roster = read(path.join(root, 'V3/donnees/cartes.json'));
  const all = {
    photoshop: extension.photoshop,
    approvedFilesUnchanged: Object.entries(assets.protectedFiles).every(([p, h]) => hash(p) === h),
    generatedAssetExactCopy: hash(assets.generatedSource) === hash(assets.artwork) && hash(assets.artwork) === assets.artworkSha256,
    cards: []
  };
  const collage = [], badgeViews = [];
  for (const [index, spec] of assets.specs.entries()) {
    const dir = path.join(work, spec.key), card = read(path.join(dir, 'card.json'));
    const report = read(path.join(dir, 'render.json')), v3 = roster.find(c => c.id === card.id);
    const find = name => report.after.find(l => l.name === name);
    const before = await raw(path.join(dir, 'previous.png')), after = await raw(path.join(dir, 'render.png'));
    const restored = await raw(path.join(dir, 'reopened.png'));
    const fixedA = await raw(path.join(dir, 'fixed-previous.png')), fixedB = await raw(path.join(dir, 'fixed-new.png'));
    const zones = [[186, 972, 498, 1068]];
    if (spec.key === 'jelly-joe') zones.push([79, 155, 818, 1078]);
    const numbers = report.slots.filter(s => typeof s.value === 'number').every(s => {
      const l = find(`${s.side} D${s.die} - valeur`);
      return l.kind === 'LayerKind.TEXT' && l.visible && l.font === 'Bahnschrift-BoldSemiCondensed' && l.text === String(s.value);
    });
    const badges = [1, 2, 3, 4, 5].map(n => {
      const support = find(`SUPPORT SLOT ${n}`), t = find(`POSITION SLOT ${n}`), show = n <= card.positions.length;
      const cx = (t.ink[0] + t.ink[2]) / 2, cy = (t.ink[1] + t.ink[3]) / 2;
      return { slot: n, support: support.bounds, textInk: t.ink, correct: support.visible === show && t.visible === show && support.kind === 'LayerKind.SMARTOBJECT' && t.kind === 'LayerKind.TEXT' && t.font === 'MyriadPro-Regular' && Math.abs(t.sizePt - registry.positionLayout.sizePt) < 0.01 && (!show || (t.text === String(card.positions[n - 1]) && Math.abs(cx - (224 + (n - 1) * 58)) <= 0.6 && Math.abs(cy - 1020.5) <= 0.6)) };
    });
    const mechanics = ['atk', 'defense', 'positions', 'magic', 'barriers', 'weapon', 'race', 'element', 'faction'].every(k => JSON.stringify(card[k]) === JSON.stringify(v3[k]));
    const halos = report.after.filter(l => l.visible && /HALO MAGIQUE$/.test(l.name)).map(l => Number(l.name.match(/D(\d)/)[1])).sort();
    const barriers = report.after.filter(l => l.visible && /BARRIERE$/.test(l.name)).map(l => Number(l.name.match(/D(\d)/)[1])).sort();
    const effects = report.after.filter(l => l.visible && /^(ATK|DEF) D\d - effet /.test(l.name)).map(l => l.name).sort();
    const expectedEffects = ['ATK', 'DEF'].flatMap(side => (side === 'ATK' ? card.atk : card.defense).flatMap((v, i) => typeof v === 'number' ? [] : [`${side} D${6 - i} - effet ${v}`])).sort();
    const item = {
      name: card.name, output: card.output, canvas: [after.info.width, after.info.height],
      changes: diff(before, after, zones), fixedFrame: diff(fixedA, fixedB), reopenedPSD: diff(after, restored),
      mechanicsPreserved: mechanics, numbersCorrect: numbers, badges,
      effectsCorrect: JSON.stringify(effects) === JSON.stringify(expectedEffects),
      halosCorrect: JSON.stringify(halos) === JSON.stringify(card.magic.slice().sort()),
      barriersCorrect: JSON.stringify(barriers) === JSON.stringify(card.barriers.slice().sort()),
      artworkEditable: find(`ART - ${card.artwork}`).kind === 'LayerKind.SMARTOBJECT'
    };
    item.passed = item.changes.outside === 0 && item.fixedFrame.changed === 0 && item.reopenedPSD.changed === 0 && mechanics && numbers && badges.every(b => b.correct) && item.effectsCorrect && item.halosCorrect && item.barriersCorrect && item.artworkEditable && after.info.width === 897 && after.info.height === 1497;
    all.cards.push(item);
    await sharp(after.data, { raw: after.info }).withIccProfile('srgb').withMetadata({ density: 300 }).png().toFile(path.join(root, 'V4/cartes', `${card.output}.png`));
    const preview = await sharp(after.data, { raw: after.info }).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize(360).png().toBuffer();
    fs.writeFileSync(path.join(dir, 'preview.png'), preview);
    collage.push({ input: preview, left: 12 + index * 372, top: 12 });
    const badgeCrop = { left: 184, top: 975, width: 320, height: 93 };
    for (const [j, source] of [before, after].entries()) badgeViews.push({ input: await sharp(source.data, { raw: source.info }).extract(badgeCrop).resize(640).png().toBuffer(), left: j * 640, top: index * 186 });
    await sharp(after.data, { raw: after.info }).extract({ left: 48, top: 48, width: 800, height: 1400 }).resize(180).png().toFile(path.join(dir, 'small-180.png'));
  }
  const five = read(path.join(work, 'five-positions.json'));
  all.fivePositionsFit = [1, 2, 3, 4, 5].every(n => {
    const t = five.find(l => l.name === `POSITION SLOT ${n}`), s = five.find(l => l.name === `SUPPORT SLOT ${n}`);
    return t.visible && s.visible && t.text === String(n) && s.bounds[0] > 174 && s.bounds[2] < 505 && s.bounds[3] < 1068;
  });
  await sharp(path.join(work, 'five-positions.png')).extract({ left: 180, top: 970, width: 330, height: 105 }).resize(990).toColourspace('srgb').png().toFile(path.join(work, 'five-positions-preview.png'));
  await sharp({ create: { width: 1128, height: 654, channels: 3, background: '#11181a' } }).composite(collage).png().toFile(path.join(work, 'family-comparison.png'));
  await sharp({ create: { width: 1280, height: 558, channels: 3, background: '#11181a' } }).composite(badgeViews).png().toFile(path.join(work, 'badges-before-after.png'));
  all.passed = all.approvedFilesUnchanged && all.generatedAssetExactCopy && all.cards.every(c => c.passed) && all.fivePositionsFit;
  fs.writeFileSync(path.join(work, 'verification.json'), JSON.stringify(all, null, 2));
  console.log(JSON.stringify(all, null, 2));
  if (!all.passed) throw Error('Revision 03 verification failed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
