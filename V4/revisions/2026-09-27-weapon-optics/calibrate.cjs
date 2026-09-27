'use strict';
const L = require('../../atelier/lib.cjs');
const { path, ROOT, read, write, sharp, assert, hash } = L;
const W = require('./revise.cjs');
const { CHANGED, REVISION } = require('./proposal.cjs');
function metrics({ data, info }, mix, center = [137, 1163.5]) {
  const bounds = [info.width, info.height, 0, 0], visibleBounds = [...bounds];
  let mass = 0, sx = 0, sy = 0, fullRadius = 0, visible = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4, a = data[i + 3]; if (!a) continue;
    bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
    bounds[2] = Math.max(bounds[2], x + 1); bounds[3] = Math.max(bounds[3], y + 1);
    fullRadius = Math.max(fullRadius, Math.hypot(Math.max(Math.abs(x - center[0]), Math.abs(x + 1 - center[0])), Math.max(Math.abs(y - center[1]), Math.abs(y + 1 - center[1]))));
    if (a < 16) continue;
    visible++; visibleBounds[0] = Math.min(visibleBounds[0], x); visibleBounds[1] = Math.min(visibleBounds[1], y);
    visibleBounds[2] = Math.max(visibleBounds[2], x + 1); visibleBounds[3] = Math.max(visibleBounds[3], y + 1);
    const weight = a / 255 * (.35 + .65 * (data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722) / 255);
    mass += weight; sx += (x + .5) * weight; sy += (y + .5) * weight;
  }
  assert.ok(mass > 0);
  const centroid = [sx / mass, sy / mass], midpoint = [(visibleBounds[0] + visibleBounds[2]) / 2, (visibleBounds[1] + visibleBounds[3]) / 2];
  const optical = midpoint.map((v, i) => v * (1 - mix) + centroid[i] * mix);
  return { bounds, visibleBounds, visible, mass, centroid, midpoint, optical, fullRadius, opticalError: Math.hypot(optical[0] - center[0], optical[1] - center[1]) };
}
async function calibrate() {
  await W.guard(read(W.file('before.json')));
  const layouts = read(path.join(ROOT, 'V4/template-stable/icon-layouts.json'));
  const reports = {};
  for (const name of CHANGED) {
    const source = W.file('inspection/' + name + '-donor.png');
    const mix = name === 'Faucille' ? .08 : .35;
    const stats = metrics(await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), mix);
    const b = stats.bounds, width = name === 'Faucille' ? 66 : 67, height = width * (b[3] - b[1]) / (b[2] - b[0]);
    layouts.weapon[name] = { width, height, center: [137, 1163.5],
      anchor: [(stats.optical[0] - b[0]) / (b[2] - b[0]), (stats.optical[1] - b[1]) / (b[3] - b[1])],
      safeRadius: 44, innerRadius: 47.5, centroidWeight: mix, sourceBounds: b, opticalCentroid: stats.centroid,
      method: 'Individual silhouette balance: weighted visible centroid / visible-bounds midpoint; native full-alpha pixel corners checked separately',
      revision: REVISION, sourceNativeExport: W.rel(source), sourceNativeExportHash: await hash(source) };
    reports[name] = { source: stats, layout: layouts.weapon[name], preliminary: true };
  }
  layouts.revision = REVISION;
  write(W.file('calibration.json'), layouts); write(W.file('calibration-inputs.json'), reports);
  console.log(reports);
}
if (require.main === module) calibrate().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { metrics, calibrate };
