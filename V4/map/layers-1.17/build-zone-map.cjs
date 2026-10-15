const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const api = require('../layers-1.15/tooling/node_modules/ag-psd');
const root = __dirname;
const zone = JSON.parse(fs.readFileSync(path.join(root, 'zone.json'), 'utf8'));
api.initializeCanvas(() => { throw new Error('Canvas not used'); },
  (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }));
async function pixels(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
}
function pointInside(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [a, b] = polygon[i], [c, d] = polygon[j];
    if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) inside = !inside;
  }
  return inside;
}
function edgeDistance(x, y, polygon) {
  let distance = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i], [bx, by] = polygon[(i + 1) % polygon.length];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    distance = Math.min(distance, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return distance;
}
function blend(parent, patch, alpha) {
  const result = { ...parent, data: new Uint8ClampedArray(parent.data) };
  for (let y = 0; y < patch.height; y++) for (let x = 0; x < patch.width; x++) {
    const a = alpha[y * patch.width + x];
    if (!a) continue;
    const source = (y * patch.width + x) * 4;
    const target = ((y + zone.crop.top) * parent.width + x + zone.crop.left) * 4;
    for (let c = 0; c < 3; c++) result.data[target + c] = Math.round((patch.data[source + c] * a + parent.data[target + c] * (255 - a)) / 255);
  }
  return result;
}
function rawImage(data) { return sharp(Buffer.from(data.data), { raw: { width: data.width, height: data.height, channels: 4 } }); }
async function main() {
  const previous = api.readPsd(fs.readFileSync(path.resolve(root, zone.parentPsd)), { useImageData: true, skipThumbnail: true });
  const base = await pixels(path.resolve(root, zone.parentBase));
  const resized = await sharp(path.join(root, 'zone-generated.png')).resize(zone.crop.width, zone.crop.height, { fit: 'fill' }).png().toBuffer();
  fs.writeFileSync(path.join(root, 'zone-fitted.png'), resized);
  const patch = await pixels(resized), alpha = new Uint8Array(patch.width * patch.height);
  const mask = { width: patch.width, height: patch.height, data: new Uint8ClampedArray(patch.data.length) };
  for (let y = 0; y < patch.height; y++) for (let x = 0; x < patch.width; x++) {
    const t = pointInside(x, y, zone.polygon) ? Math.min(1, edgeDistance(x, y, zone.polygon) / zone.feather) : 0;
    const a = Math.round(255 * t * t * (3 - 2 * t));
    alpha[y * patch.width + x] = a;
    const i = (y * patch.width + x) * 4;
    mask.data[i] = mask.data[i + 1] = mask.data[i + 2] = a; mask.data[i + 3] = 255;
  }
  await rawImage(mask).png().toFile(path.join(root, 'zone-mask.png'));
  const updatedBase = blend(base, patch, alpha);
  const composite = blend(previous.imageData, patch, alpha);
  const cityGroups = structuredClone(previous.children.slice(2));
  const arborium = previous.children.find(layer => layer.name === 'Arborium');
  const halo = { width: 92, height: 62, data: new Uint8ClampedArray(92 * 62 * 4) };
  for (let y = 0; y < halo.height; y++) for (let x = 0; x < halo.width; x++) {
    const r = Math.hypot((x - 46) / 46, (y - 31) / 31);
    const t = Math.max(0, 1 - r), i = (y * halo.width + x) * 4;
    halo.data[i] = 222; halo.data[i + 1] = 187; halo.data[i + 2] = 134;
    halo.data[i + 3] = Math.round(205 * t * t * (3 - 2 * t));
  }
  const haloLayer = { name: 'Arborium - Voile parchemin de lisibilite', left: 345, top: 518, imageData: halo };
  arborium.children.unshift(haloLayer);
  // Recompose the city above the new terrain; never bake it into the base export.
  for (const child of arborium.children) {
    const image = child.imageData;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const a = image.data[(y * image.width + x) * 4 + 3];
      if (!a) continue;
      const gx = child.left + x, gy = child.top + y;
      const lx = gx - zone.crop.left, ly = gy - zone.crop.top;
      assert(lx >= 0 && ly >= 0 && lx < patch.width && ly < patch.height && alpha[ly * patch.width + lx] > 0,
        'City readability overlay must remain inside the authorized mask');
      const target = (gy * base.width + gx) * 4, source = (y * image.width + x) * 4;
      for (let c = 0; c < 3; c++) composite.data[target + c] = Math.round((image.data[source + c] * a + composite.data[target + c] * (255 - a)) / 255);
    }
  }
  await rawImage(halo).png().toFile(path.join(root, 'arborium-halo.png'));
  let changedInside = 0, outsidePixels = 0, changedOutside = 0;
  for (let y = 0; y < base.height; y++) for (let x = 0; x < base.width; x++) {
    const lx = x - zone.crop.left, ly = y - zone.crop.top;
    const active = lx >= 0 && ly >= 0 && lx < patch.width && ly < patch.height && alpha[ly * patch.width + lx] > 0;
    const i = (y * base.width + x) * 4;
    const changed = [0, 1, 2, 3].some(c => updatedBase.data[i + c] !== base.data[i + c]);
    if (active && changed) changedInside++;
    if (!active) { outsidePixels++; if (changed) changedOutside++; }
    if (!active) for (let c = 0; c < 4; c++) assert.equal(composite.data[i + c], previous.imageData.data[i + c]);
  }
  assert.equal(changedOutside, 0); assert(changedInside > 1000);
  await rawImage(updatedBase).png().toFile(path.join(root, '../kalistar-map-1.17-base.png'));
  await rawImage(composite).png().toFile(path.join(root, 'kalistar-map-1.17-preview.png'));
  await rawImage(updatedBase).extract(zone.crop).png().toFile(path.join(root, 'zone-after.png'));
  const layer = { name: zone.layerName, left: zone.crop.left, top: zone.crop.top,
    imageData: patch, mask: { left: zone.crop.left, top: zone.crop.top,
      defaultColor: 0, positionRelativeToLayer: false, imageData: mask } };
  previous.children.splice(2, 0, layer);
  previous.imageData = composite;
  const output = path.join(root, 'kalistar-map-1.17.psd');
  fs.writeFileSync(output, api.writePsdBuffer(previous, { generateThumbnail: false }));
  const check = api.readPsd(fs.readFileSync(output), { useImageData: true, skipThumbnail: true });
  assert.equal(check.children.length, 6);
  assert.deepEqual(check.children[0].imageData, previous.children[0].imageData);
  assert.deepEqual(check.children[1].imageData.data, previous.children[1].imageData.data);
  assert.deepEqual(check.children[2].mask.imageData.data, mask.data);
  assert.deepEqual(check.imageData.data, composite.data);
  for (let j = 0; j < cityGroups.length; j++) {
    const group = check.children[j + 3], original = cityGroups[j];
    const offset = group.name === 'Arborium' ? 1 : 0;
    assert.equal(group.name, original.name);
    for (let k = 0; k < 2; k++) {
      assert.equal(group.children[k + offset].left, original.children[k].left);
      assert.equal(group.children[k + offset].top, original.children[k].top);
      assert.deepEqual(group.children[k + offset].imageData.data, original.children[k].imageData.data);
    }
    assert.equal(group.children[1 + offset].text.text, original.children[1].text.text);
  }
  const report = { changedInside, outsidePixels, changedOutside, cityMonumentsAndNamesUnchanged: true,
    arboriumReadabilityHaloAdded: true, snowLayerUnchanged: true,
    originalBackgroundLayerUnchanged: true, editableMaskRoundTrip: true, compositeRoundTrip: true,
    width: base.width, height: base.height, nativePhotoshopTested: false };
  fs.writeFileSync(path.join(root, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
