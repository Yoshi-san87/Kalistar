const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
async function measureRim(file, origin = [734, 773.5], range = [33, 50], radii = [40, 42]) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const points = [];
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 32) {
    for (let r = range[0]; r <= range[1]; r += .25) {
      const x = Math.round(origin[0] + Math.cos(a) * r), y = Math.round(origin[1] + Math.sin(a) * r);
      const i = (y * info.width + x) * 4, [red, green, blue] = data.subarray(i, i + 3);
      if (red > green + 12 && blue > green * .8 && red > 85) { points.push([x + .5, y + .5]); break; }
    }
  }
  const score = v => points.reduce((sum, [x, y]) => sum + (((x - v[0]) / v[2]) ** 2 + ((y - v[1]) / v[3]) ** 2 - 1) ** 2, 0);
  let v = [...origin, ...radii];
  for (const step of [1, .25, .05]) for (let pass = 0; pass < 40; pass++) {
    let changed = false;
    for (let i = 0; i < 4; i++) for (const sign of [-1, 1]) {
      const n = [...v]; n[i] += sign * step;
      if (score(n) < score(v)) { v = n; changed = true; }
    }
    if (!changed) break;
  }
  return { pinkInnerRimFit: v, points: points.length, error: score(v) / points.length };
}
module.exports = measureRim;
if (require.main === module) (async () => {
  const file = 'V4/cartes/RIKKA_V4_02_VITRINE_ICONES.png';
  console.log(JSON.stringify({ clover: await measureRim(file), dodge: await measureRim(file, [756, 150], [52, 70], [54, 57]) }, null, 2));
})();
