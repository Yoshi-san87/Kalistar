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
  // The generator letterboxes this very wide crop; remove only the black margins.
  const trimmed = await sharp(path.join(root, 'zone-generated.png')).trim({background:'#000000',threshold:10}).png().toBuffer();
  const resized = await sharp(trimmed).resize(zone.crop.width, zone.crop.height, { fit: 'fill' }).png().toBuffer();
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
  await rawImage(updatedBase).png().toFile(path.join(root, '../kalistar-map-1.21-base.png'));
  await rawImage(composite).png().toFile(path.join(root, 'kalistar-map-1.21-preview.png'));
  await rawImage(updatedBase).extract(zone.crop).png().toFile(path.join(root, 'zone-after.png'));
  const layer = { name: zone.layerName, left: zone.crop.left, top: zone.crop.top,
    imageData: patch, mask: { left: zone.crop.left, top: zone.crop.top,
      defaultColor: 0, positionRelativeToLayer: false, imageData: mask } };
  const originals = structuredClone(previous.children);
  previous.children.push(layer);
  previous.imageData = composite;
  const output = path.join(root, 'kalistar-map-1.21.psd');
  fs.writeFileSync(output, api.writePsdBuffer(previous, { generateThumbnail: false }));
  const check = api.readPsd(fs.readFileSync(output), { useImageData: true, skipThumbnail: true });
  assert.equal(check.children.length, originals.length+1);
  assert.deepEqual(check.children[0].imageData, previous.children[0].imageData);
  assert.deepEqual(check.children.at(-1).mask.imageData.data, mask.data);
  assert.deepEqual(check.imageData.data, composite.data);
  for (let j=0;j<originals.length;j++) assert.deepEqual(check.children[j], originals[j]);
  const report = { changedInside, outsidePixels, changedOutside, cityGroupsUnchanged: true,
    originalBackgroundLayerUnchanged: true, editableMaskRoundTrip: true, compositeRoundTrip: true,
    width: base.width, height: base.height, nativePhotoshopTested: false };
  fs.writeFileSync(path.join(root, 'verification.json'), JSON.stringify(report, null, 2));
  const crypto=require('node:crypto');
  const files=['../kalistar-map-1.21-base.png','kalistar-map-1.21-preview.png','kalistar-map-1.21.psd','zone.json','zone.prompt.txt','refinement.prompt.txt','style-reference.png','user-zone-reference.png','zone-generated.png','zone-before.png','zone-fitted.png','zone-mask.png','zone-after.png','verification.json'];
  const provenance={version:'1.21',parentVersion:'1.20',generator:'built-in image_gen',generationId:'exec-c2dd3a43-db0e-415a-8eba-4bc9339aac88',files:files.map(file=>({file:path.relative(path.resolve(root,'..'),path.resolve(root,file)).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root,file))).digest('hex')}))};
  fs.writeFileSync(path.join(root,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
