'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const api = require('../layers-1.15/tooling/node_modules/ag-psd');
const dir = __dirname, root = path.resolve(dir, '../../..');
const zone = JSON.parse(fs.readFileSync(path.join(dir, 'zone.json'), 'utf8'));
const {crop, polygon, feather, city} = zone;
const names = new Set(['Kalistopolis', 'Durane', 'Arborium', 'Velane', 'WoodLand', 'Vulkar', 'Cryptown']);
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const saveJson = (file, value) => fs.writeFileSync(path.join(dir, file), JSON.stringify(value, null, 2) + '\n');
api.initializeCanvas(() => { throw Error('Canvas is not used'); }, (width, height) => ({width, height, data: new Uint8ClampedArray(width * height * 4)}));
async function pixels(input) {
  const {data, info} = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  return {width: info.width, height: info.height, data: new Uint8ClampedArray(data)};
}
const raster = image => sharp(Buffer.from(image.data), {raw: {width: image.width, height: image.height, channels: 4}});
function inside(x, y) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [a, b] = polygon[i], [c, d] = polygon[j];
    if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) hit = !hit;
  }
  return hit;
}
function distance(x, y) {
  let result = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i], [bx, by] = polygon[(i + 1) % polygon.length];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    result = Math.min(result, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return result;
}
const changed = (a, b, i) => [0, 1, 2, 3].some(c => a.data[i + c] !== b.data[i + c]);
async function overlays(groups) {
  const items = [];
  for (const group of groups) for (const layer of group.children) {
    items.push({input: await raster(layer.imageData).png().toBuffer(), left: layer.left, top: layer.top});
  }
  return items;
}
async function makeCity() {
  const iconFile = path.join(dir, 'thalassea-icon.png');
  await sharp(path.join(dir, 'thalassea-source.png')).trim().png().toFile(iconFile);
  const source = await pixels(iconFile);
  let transparent = 0, opaque = 0, visibleRed = 0;
  for (let i = 0; i < source.data.length; i += 4) {
    if (source.data[i + 3] === 0) transparent++;
    if (source.data[i + 3] > 200) opaque++;
    if (source.data[i + 3] > 80 && source.data[i] > 150 && source.data[i + 1] < 90 && source.data[i + 2] < 90) visibleRed++;
  }
  assert(transparent > source.width * source.height * .1, 'Icon must have transparent exterior');
  assert(opaque > source.width * source.height * .15, 'Icon must contain visible architecture');
  assert.equal(visibleRed, 0, 'Visible red matte is not acceptable');
  await sharp(iconFile).resize({height: 128}).webp({lossless: true}).toFile(path.join(dir, 'thalassea-v1.webp'));
  await sharp(iconFile).resize({height: 192}).webp({lossless: true}).toFile(path.join(dir, 'thalassea-v2.webp'));
  const icon = await pixels(await sharp(iconFile).resize({height: city.symbolSize}).png().toBuffer());
  const left = Math.round(city.x - icon.width / 2), top = Math.round(city.y - icon.height / 2);
  const underprint = await pixels(await raster(icon).extend({top: 4, bottom: 4, left: 4, right: 4, background: '#00000000'}).png().toBuffer());
  for (let i = 0; i < underprint.data.length; i += 4) {
    underprint.data[i] = 236; underprint.data[i + 1] = 214; underprint.data[i + 2] = 174;
  }
  const edge = {...underprint, data: new Uint8ClampedArray(underprint.data)};
  const edgeAlpha = await raster(underprint).extractChannel(3).dilate(1).raw().toBuffer();
  for (let i = 0; i < edgeAlpha.length; i++) edge.data[i * 4 + 3] = edgeAlpha[i];
  const dark = {...underprint, data: new Uint8ClampedArray(underprint.data)};
  for (let i = 0; i < dark.data.length; i += 4) {
    dark.data[i] = 37; dark.data[i + 1] = 24; dark.data[i + 2] = 14;
    dark.data[i + 3] = Math.round(dark.data[i + 3] * .85);
  }
  const shadow = await pixels(await raster(dark).blur(1.3).png().toBuffer());
  const labelTop = top + icon.height + 4;
  const label = await pixels(await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="150" height="28"><text x="75" y="19" text-anchor="middle" font-family="Georgia" font-size="17" font-weight="bold" font-style="italic" fill="#28170e" stroke="#f2dbad" stroke-width="2" paint-order="stroke fill">' + city.name + '</text></svg>')).png().toBuffer());
  const group = {name: city.name, opened: true, children: [
    {name: city.name + ' - Ombre', left: left - 4, top: top - 2, imageData: shadow},
    {name: city.name + ' - Filet parchemin', left: left - 4, top: top - 4, imageData: edge},
    {name: city.name + ' - Embleme', left, top, imageData: icon},
    {name: city.name + ' - Nom editable', left: city.x - 75, top: labelTop, imageData: label,
      text: {text: city.name, transform: [1, 0, 0, 1, city.x, labelTop + 19], shapeType: 'point', antiAlias: 'smooth',
        style: {font: {name: 'Georgia-BoldItalic'}, fontSize: 17, fillColor: {r: 40, g: 23, b: 14}, fillFlag: true, strokeFlag: true,
          strokeColor: {r: 242, g: 219, b: 173}, outlineWidth: 2, fillFirst: false}, paragraphStyle: {justification: 'center'}}}
  ]};
  return {group, alpha: {width: source.width, height: source.height, transparent, opaque, visibleRed}};
}
async function main() {
  const baseFile = path.join(root, zone.parentBase), psdFile = path.join(root, zone.parentPsd);
  const protectedFiles = [baseFile, psdFile, path.join(root, 'V4/map/versions.json'), path.join(root, 'V4/site/map-view.js'),
    path.join(root, 'V4/site/assets/ui/kalistar-atlas-1.30.webp'), path.join(root, 'V4/deploy/runtime-media.json'),
    path.join(root, 'V4/map/layers-1.32/island-barrier-detail.png'), path.join(root, 'V4/site/assets/map/arborium-v2.webp')];
  const protectedSources = protectedFiles.map(file => ({file: path.relative(root, file).replaceAll('\\', '/'), sha256: sha(file)}));
  const base = await pixels(baseFile), before = await pixels(await raster(base).extract(crop).png().toBuffer());
  const parent = api.readPsd(fs.readFileSync(psdFile), {useImageData: true, skipThumbnail: true});
  const originals = structuredClone(parent.children), groups = parent.children.filter(child => names.has(child.name));
  assert.equal(groups.length, 7); assert(!parent.children.some(child => child.name === city.name));
  const oldOverlays = await overlays(groups);
  const rebuilt = await pixels(await raster(base).composite(oldOverlays).png().toBuffer());
  assert.deepEqual(rebuilt.data, parent.imageData.data, 'Parent city layers must reproduce the parent composite');
  const generated = path.join(dir, 'zone-generated.png'), meta = await sharp(generated).metadata();
  assert(Math.abs(meta.width / meta.height - crop.width / crop.height) < .02, 'Generated framing must match context');
  const patch = await pixels(await sharp(generated).resize(crop.width, crop.height).png().toBuffer());
  // Match unchanged ocean paper only; the center is deliberately deeper and darker.
  const differences = [[], [], []];
  for (let y = 22; y < 48; y++) for (let x = 42; x < 240; x++) {
    const i = (y * crop.width + x) * 4;
    for (let c = 0; c < 3; c++) differences[c].push(before.data[i + c] - patch.data[i + c]);
  }
  const colorOffsets = differences.map(values => Math.max(-10, Math.min(10, values.sort((a, b) => a - b)[Math.floor(values.length / 2)])));
  for (let i = 0; i < patch.data.length; i += 4) for (let c = 0; c < 3; c++) patch.data[i + c] = Math.max(0, Math.min(255, patch.data[i + c] + colorOffsets[c]));
  // Register the generated ink ribbon across the lower join; no new stroke is drawn.
  const join = zone.navigationJoin, unregistered = new Uint8ClampedArray(patch.data);
  assert.equal(join.sourceCenters.length, join.bottom - join.top + 1);
  for (let y = join.top; y <= join.bottom; y++) {
    const t = (y - join.top) / (join.bottom - join.top);
    const targetX = join.targetTopX + t * (join.targetBottomX - join.targetTopX);
    const shift = join.sourceCenters[y - join.top] - targetX;
    for (let x = Math.ceil(targetX - join.halfWidth); x <= Math.floor(targetX + join.halfWidth); x++) {
      const d = Math.abs(x - targetX), falloff = d < 3 ? 1 : Math.max(0, (join.halfWidth - d) / (join.halfWidth - 3));
      const sourceX = x + shift * falloff, a = Math.floor(sourceX), f = sourceX - a;
      for (let c = 0; c < 3; c++) patch.data[(y * crop.width + x) * 4 + c] = Math.round(
        unregistered[(y * crop.width + a) * 4 + c] * (1 - f) + unregistered[(y * crop.width + a + 1) * 4 + c] * f);
    }
  }
  const mask = {width: crop.width, height: crop.height, data: new Uint8ClampedArray(patch.data.length)};
  const terrain = {...base, data: new Uint8ClampedArray(base.data)};
  for (let y = 0; y < crop.height; y++) for (let x = 0; x < crop.width; x++) {
    const t = inside(x, y) ? Math.min(1, distance(x, y) / feather) : 0;
    const a = Math.round(255 * t * t * (3 - 2 * t)), from = (y * crop.width + x) * 4;
    const to = ((y + crop.top) * base.width + x + crop.left) * 4;
    mask.data[from] = mask.data[from + 1] = mask.data[from + 2] = a; mask.data[from + 3] = 255;
    if (a) for (let c = 0; c < 3; c++) terrain.data[to + c] = Math.round((patch.data[from + c] * a + base.data[to + c] * (255 - a)) / 255);
  }
  function active(x, y) {
    const a = x - crop.left, b = y - crop.top;
    return a >= 0 && b >= 0 && a < crop.width && b < crop.height && mask.data[(b * crop.width + a) * 4] > 0;
  }
  const {group, alpha} = await makeCity();
  const finalImage = await pixels(await raster(terrain).composite([...oldOverlays, ...await overlays([group])]).png().toBuffer());
  let terrainChangedInside = 0, terrainChangedOutside = 0, compositeChangedOutsideAllowed = 0, northernWallChangedPixels = 0;
  let cityChangedPixels = 0;
  for (let y = 0; y < base.height; y++) for (let x = 0; x < base.width; x++) {
    const i = (y * base.width + x) * 4, inMask = active(x, y);
    if (changed(base, terrain, i)) { if (inMask) terrainChangedInside++; else terrainChangedOutside++; }
    const inCity = group.children.some(item => x >= item.left && y >= item.top && x < item.left + item.imageData.width && y < item.top + item.imageData.height);
    if (changed(parent.imageData, finalImage, i) && !inMask && !inCity) compositeChangedOutsideAllowed++;
    if (inCity && changed(terrain, finalImage, i)) cityChangedPixels++;
    if (x >= 199 && x < 460 && y >= 63 && y < 228 && changed(parent.imageData, finalImage, i)) northernWallChangedPixels++;
  }
  assert(terrainChangedInside > 10000); assert(cityChangedPixels > 1000);
  assert.equal(terrainChangedOutside, 0); assert.equal(compositeChangedOutsideAllowed, 0); assert.equal(northernWallChangedPixels, 0);
  assert(active(city.x, city.y), 'Underwater city must sit within the edited basin');
  await raster(terrain).png().toFile(path.join(dir, 'kalistar-map-1.33-base.png'));
  await raster(finalImage).png().toFile(path.join(dir, 'kalistar-map-1.33-preview.png'));
  await raster(terrain).extract(crop).png().toFile(path.join(dir, 'zone-after.png'));
  await raster(finalImage).extract(crop).resize({width: 1100}).png().toFile(path.join(dir, 'thalassea-detail.png'));
  for (const [name, image] of [['zone-before.png', before], ['zone-fitted.png', patch], ['zone-mask.png', mask]]) await raster(image).png().toFile(path.join(dir, name));
  const index = parent.children.findIndex(child => names.has(child.name));
  parent.children.splice(index, 0, {name: zone.layerName, left: crop.left, top: crop.top, imageData: patch,
    mask: {left: crop.left, top: crop.top, defaultColor: 0, positionRelativeToLayer: false, imageData: mask}});
  parent.children.push(group); parent.imageData = finalImage;
  const psdOutput = path.join(dir, 'kalistar-map-1.33.psd');
  fs.writeFileSync(psdOutput, api.writePsdBuffer(parent, {generateThumbnail: false}));
  const reopened = api.readPsd(fs.readFileSync(psdOutput), {useImageData: true, skipThumbnail: true});
  assert.deepEqual(reopened.imageData.data, finalImage.data);
  assert.deepEqual(reopened.children[index].mask.imageData.data, mask.data);
  for (let i = 0; i < originals.length; i++) assert.deepEqual(reopened.children[i + (i >= index ? 1 : 0)], originals[i]);
  const reopenedCity = reopened.children.at(-1);
  assert.equal(reopenedCity.name, 'Thalassea'); assert.equal(reopenedCity.children.length, 4);
  assert.equal(reopenedCity.children.at(-1).text.text, 'Thalassea');
  assert.equal(reopenedCity.children.at(-1).text.paragraphStyle.justification, 'center');
  for (let i = 0; i < group.children.length; i++) assert.deepEqual(reopenedCity.children[i].imageData.data, group.children[i].imageData.data);
  for (const item of protectedSources) assert.equal(sha(path.join(root, item.file)), item.sha256, item.file + ' changed');
  const report = {version: zone.version, parentVersion: zone.parentVersion, status: 'proposal', runtimePublished: false, date: zone.date,
    crop, terrainChangedInside, terrainChangedOutside, compositeChangedOutsideAllowed, northernWallChangedPixels, cityChangedPixels,
    colorOffsets, navigationJoin: join, oldCityCount: 7, cityCount: 8, originalLayersUnchanged: true, cityGroupsUnchanged: true,
    editableMaskRoundTrip: true, compositeRoundTrip: true, independentCityAndName: true, city, icon: alpha,
    nativePhotoshopTested: false, protectedSources};
  saveJson('verification.json', report);
  saveJson('provenance.json', {version: zone.version, parentVersion: zone.parentVersion, status: 'proposal', runtimePublished: false,
    generator: 'built-in image_gen; deterministic masked compositing; independent city emblem and native editable text',
    generationIds: zone.generationIds, parentFiles: protectedSources,
    files: fs.readdirSync(dir).filter(file => file !== 'provenance.json').map(file => ({file, sha256: sha(path.join(dir, file))}))});
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
