const L = require('../../atelier/lib.cjs');
const { fs, path, ROOT, read, write, sharp, hash, assert } = L;
const HOME = __dirname;
const CENTER = [137, 1163.5];
const INNER_RADIUS = 47.5;

function measure(data, width, height, left = 0, top = 0) {
  let x0 = width, y0 = height, x1 = 0, y1 = 0, area = 0, sx = 0, sy = 0;
  const contour = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    // Audit proxy only: native exports must later prove the complete alpha contour.
    const whiteness = Math.min(data[i], data[i + 1], data[i + 2]);
    if (!data[i + 3] || whiteness <= 48) continue;
    const weight = (whiteness - 48) / 207 * data[i + 3] / 255;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
    area += weight; sx += (x + .5) * weight; sy += (y + .5) * weight;
    contour.push([x + .5 + left, y + .5 + top]);
  }
  assert.ok(contour.length > 20, 'No visible motif');
  const centroid = [sx / area + left, sy / area + top];
  const midpoint = [(x0 + x1) / 2 + left, (y0 + y1) / 2 + top];
  const optical = midpoint.map((v, i) => .5 * v + .5 * centroid[i]);
  const radius = Math.max(...contour.map(p => Math.hypot(p[0] - CENTER[0], p[1] - CENTER[1])));
  return { bounds: [x0 + left, y0 + top, x1 + left, y1 + top], width: x1 - x0, height: y1 - y0,
    area, centroid, midpoint, optical, radius, breathingRoom: INNER_RADIUS - radius, contour };
}

async function audit() {
  const manifest = read(path.join(ROOT, 'V4/atelier/designer-assets/manifest.json'));
  const catalogue = read(path.join(ROOT, 'V4/donnees/catalogue.json'));
  const refs = L.baseline();
  const rows = [], cells = [];
  fs.mkdirSync(path.join(HOME, 'audit'), { recursive: true });
  let n = 0;
  for (const [name, bank] of Object.entries(manifest.weapons)) {
    const source = path.join(ROOT, 'V4/atelier/designer-assets', bank.file);
    const decoded = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const stats = measure(decoded.data, decoded.info.width, decoded.info.height, bank.left, bank.top);
    delete stats.contour;
    const cards = catalogue.cards.filter(c => c.profile.weapon === name).map(c => ({ id: c.id, name: c.name, title: c.title, kind: c.kind }));
    rows.push({ name, source: path.relative(ROOT, source).replaceAll('\\', '/'), sha256: await hash(source), ...stats, cards });
    const tile = await sharp({ create: { width: 224, height: 260, channels: 4, background: '#e8edf0' } }).composite([
      { input: await sharp(source).resize({ width: 192, height: 190 }).png().toBuffer(), left: 16, top: 32 },
      { input: Buffer.from(`<svg width="224" height="260"><text x="12" y="22" font-size="16" font-family="Arial">${name}</text><text x="12" y="246" font-size="13" font-family="Arial">${stats.width} x ${stats.height}; R ${stats.radius.toFixed(1)}; ${cards.length} cards</text></svg>`), left: 0, top: 0 }
    ]).png().toBuffer();
    cells.push({ input: tile, left: n % 5 * 224, top: Math.floor(n / 5) * 260 }); n++;
  }
  await sharp({ create: { width: 1120, height: 1040, channels: 4, background: '#e8edf0' } }).composite(cells).png().toFile(path.join(HOME, 'audit/all-weapons-before.png'));
  const result = { revision: '2026-09-27-weapon-optics', stage: 'read-only proposal audit', referenceId: refs.id,
    catalogueHash: await hash(path.join(ROOT, 'V4/donnees/catalogue.json')), manifestHash: await hash(path.join(ROOT, 'V4/atelier/designer-assets/manifest.json')),
    center: CENTER, innerRadius: INNER_RADIUS, note: 'Whiteness proxy measured against native dark enamel. No shared files changed. Full native alpha export required before approval.',
    cardCount: catalogue.cards.length, referenceCount: refs.cards.length, rows };
  write(path.join(HOME, 'audit/measurements.json'), result);
  console.log(rows.map(r => ({ name: r.name, visible: [r.width, r.height], area: Math.round(r.area), radius: +r.radius.toFixed(2), margin: +r.breathingRoom.toFixed(2), cards: r.cards.length })));
  return result;
}
if (require.main === module) audit().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { audit, measure, CENTER, INNER_RADIUS };
