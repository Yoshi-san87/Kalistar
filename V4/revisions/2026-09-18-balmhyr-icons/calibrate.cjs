const L = require('../../atelier/lib.cjs');
const { path, sharp, read, write } = L;
(async () => {
  const layouts = { schemaVersion: 1, revision: 'balmhyr-icons-2026-09-18', weapon: {}, race: {} };
  for (const [kind, name, file, center] of [
    ['weapon', 'Hache', 'hache', [137, 1163.5]],
    ['race', 'NAIN', 'lok-race', [759, 1163.5]]
  ]) {
    const { data, info } = await sharp(path.join(__dirname, 'inspection', file + '.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0, weight = 0, sx = 0, sy = 0;
    const contour = [];
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4, alpha = data[i + 3] / 255;
      if (!alpha) continue;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
      const w = alpha * (.35 + .65 * (data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722) / 255);
      weight += w; sx += (x + .5) * w; sy += (y + .5) * w;
      contour.push([x + .5, y + .5]);
    }
    const midpoint = [(x0 + x1) / 2, (y0 + y1) / 2], centroid = [sx / weight, sy / weight];
    const optical = midpoint.map((v, i) => v * .35 + centroid[i] * .65);
    const radius = Math.max(...contour.map(([x, y]) => Math.hypot(x - optical[0], y - optical[1])));
    const safeRadius = 44, scale = Math.min(1, (safeRadius - 1) / radius);
    layouts[kind][name] = { width: (x1 - x0) * scale, height: (y1 - y0) * scale,
      center, anchor: [(optical[0] - x0) / (x1 - x0), (optical[1] - y0) / (y1 - y0)],
      safeRadius, innerRadius: 47.5, sourceBounds: [x0, y0, x1, y1], opticalCentroid: centroid,
      method: '65% visible luminance-alpha centroid / 35% visible bounds centre; full alpha contour contained' };
  }
  write(path.join(__dirname, 'calibration.json'), layouts);
  console.log(layouts);
})().catch(e => { console.error(e); process.exitCode = 1; });
