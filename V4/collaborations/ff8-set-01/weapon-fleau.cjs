'use strict';
const assert = require('node:assert/strict');
const GEOMETRY = Object.freeze({ left: 89, top: 1116, width: 96, height: 95 });
const CENTER = [47.5, 47], RADIUS = 39;
function inspectIcon({ data, info }) {
  assert.deepEqual([info.width, info.height, info.channels], [96, 95, 4]);
  let mass = 0, sx = 0, sy = 0, radius = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4, alpha = data[i + 3];
    if (!alpha) continue;
    assert.ok(data[i] >= 254 && data[i + 1] >= 254 && data[i + 2] >= 254, 'Silhouette blanche requise.');
    radius = Math.max(radius, Math.hypot(x - CENTER[0], y - CENTER[1]));
    assert.ok(radius <= RADIUS, 'Pictogramme hors du medaillon.');
    mass += alpha; sx += x * alpha; sy += y * alpha;
  }
  assert.ok(mass / 255 >= 500, 'Pictogramme vide ou trop petit.');
  const centroid = [sx / mass, sy / mass];
  assert.ok(centroid.every((v, i) => Math.abs(v - CENTER[i]) <= 2), 'Pictogramme decentre.');
  return { centroid, radius, visibleArea: mass / 255 };
}
async function composeIcon(sharp, svg, nativeEmail) {
  const icon = await sharp(svg, { density: 288 }).resize(96, 95).png().toBuffer();
  const pixels = await sharp(icon).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const metrics = inspectIcon(pixels);
  // Reuse FF7's native enamel, read-only; never invoke its Photoshop exporter.
  const email = await sharp(nativeEmail).extract(GEOMETRY).png().toBuffer();
  const original = await sharp(email).ensureAlpha().raw().toBuffer();
  const blended = await sharp(email).composite([{ input: icon, left: 0, top: 0 }]).ensureAlpha().raw().toBuffer();
  // Avoid premultiplication rounding on the untouched enamel and antialiased rim.
  for (let i = 0; i < blended.length; i += 4) if (!pixels.data[i + 3]) original.copy(blended, i, i, i + 4);
  const packed = await sharp(blended, { raw: { width: 96, height: 95, channels: 4 } }).png().toBuffer();
  return { icon, email, packed, metrics };
}
async function main() {
  const L = require('../../atelier/lib.cjs'), { fs, path, sharp } = L;
  const result = await composeIcon(sharp, fs.readFileSync(path.join(__dirname, 'weapon-fleau.svg')),
    path.join(__dirname, '../ff7-set-01/weapon-email-native.png'));
  await sharp(result.packed).png().toFile(path.join(__dirname, 'weapon-fleau.png'));
  return result.metrics;
}
module.exports = { GEOMETRY, CENTER, RADIUS, inspectIcon, composeIcon, main };
if (require.main === module) main().then(v => console.log(JSON.stringify(v))).catch(e => { console.error(e); process.exitCode = 1; });
