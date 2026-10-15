'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const api = require('../layers-1.15/tooling/node_modules/ag-psd');
const dir = __dirname;
const root = path.resolve(dir, '../../..');
const zone = JSON.parse(fs.readFileSync(path.join(dir, 'zone.json'), 'utf8'));
const cityNames = new Set(['Kalistopolis', 'Durane', 'Arborium', 'Velane', 'WoodLand', 'Vulkar', 'Cryptown', 'Thalassea']);
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const clamp = value => Math.max(0, Math.min(1, value));
const raster = image => sharp(Buffer.from(image.data), {
  raw: { width: image.width, height: image.height, channels: 4 }
});

api.initializeCanvas(() => { throw Error('Canvas is not used'); },
  (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }));

async function pixels(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
}

function inside(x, y, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [a, b] = polygon[i], [c, d] = polygon[j];
    if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) hit = !hit;
  }
  return hit;
}

function edgeDistance(x, y, polygon) {
  let result = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i], [bx, by] = polygon[(i + 1) % polygon.length];
    const dx = bx - ax, dy = by - ay;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy));
    result = Math.min(result, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return result;
}

function opacity(x, y, edit) {
  if (!inside(x, y, edit.polygon)) return 0;
  let t = clamp(edgeDistance(x, y, edit.polygon) / edit.feather);
  const abyss = edit.preserveAbyss;
  if (abyss) {
    const distance = (Math.hypot((x - abyss.x) / abyss.rx, (y - abyss.y) / abyss.ry) - 1) * Math.min(abyss.rx, abyss.ry);
    t = Math.min(t, clamp(distance / 5));
  }
  const neighbor = edit.preserveNeighbors;
  if (neighbor) t = Math.min(t, clamp(Math.hypot(Math.max(neighbor.left - x, 0), Math.max(neighbor.top - y, 0)) / neighbor.feather));
  for (const hub of edit.preserveHubs || []) t = Math.min(t, clamp((Math.hypot(x - hub.x, y - hub.y) - hub.radius) / hub.feather));
  return Math.round(255 * t * t * (3 - 2 * t));
}

function differs(a, b, index) {
  return [0, 1, 2, 3].some(channel => a.data[index + channel] !== b.data[index + channel]);
}

function inRect(x, y, rect) {
  return x >= rect.left && y >= rect.top && x < rect.left + rect.width && y < rect.top + rect.height;
}

function maskAt(x, y, edit, mask) {
  if (!inRect(x, y, edit.crop)) return 0;
  return mask.data[((y - edit.crop.top) * edit.crop.width + x - edit.crop.left) * 4];
}

async function main() {
  const baseFile = path.join(root, zone.parentBase), psdFile = path.join(root, zone.parentPsd);
  const protectedSources = [baseFile, psdFile, path.join(root, 'V4/map/kalistar-map-1.0.png'),
    path.join(root, 'V4/site/map-view.js'), path.join(root, 'V4/site/assets/ui/kalistar-atlas-1.33.webp')]
    .map(file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: sha(file) }));
  const base = await pixels(baseFile);
  const terrain = { ...base, data: new Uint8ClampedArray(base.data) };
  const parent = api.readPsd(fs.readFileSync(psdFile), { useImageData: true, skipThumbnail: true });
  const originals = structuredClone(parent.children);
  const groups = parent.children.filter(child => cityNames.has(child.name));
  assert.equal(groups.length, 8);
  const overlays = [];
  for (const group of groups) for (const layer of group.children) overlays.push({
    input: await raster(layer.imageData).png().toBuffer(), left: layer.left, top: layer.top
  });
  const rebuilt = await pixels(await raster(base).composite(overlays).png().toBuffer());
  assert.deepEqual(rebuilt.data, parent.imageData.data);

  const patches = [], editsReport = [];
  for (const edit of zone.edits) {
    const { crop } = edit;
    const before = await pixels(await raster(base).extract(crop).png().toBuffer());
    const generated = path.join(dir, `${edit.id}-generated.png`);
    const metadata = await sharp(generated).metadata();
    assert(Math.abs(metadata.width / metadata.height - crop.width / crop.height) < 0.02);
    const patch = await pixels(await sharp(generated).resize(crop.width, crop.height).png().toBuffer());
    const differences = [[], [], []], anchor = edit.colorAnchor;
    for (let y = anchor.top; y < anchor.top + anchor.height; y++) for (let x = anchor.left; x < anchor.left + anchor.width; x++) {
      const from = (y * crop.width + x) * 4;
      for (let c = 0; c < 3; c++) differences[c].push(before.data[from + c] - patch.data[from + c]);
    }
    const colorOffsets = differences.map(values => Math.max(-edit.colorLimit, Math.min(edit.colorLimit,
      values.sort((a, b) => a - b)[Math.floor(values.length / 2)])));
    for (let i = 0; i < patch.data.length; i += 4) for (let c = 0; c < 3; c++) {
      patch.data[i + c] = Math.max(0, Math.min(255, patch.data[i + c] + colorOffsets[c]));
    }
    if (edit.kind === 'atmosphere') await raster(terrain).png().toFile(path.join(dir, `kalistar-map-${zone.version}-geometry.png`));
    const mask = { width: crop.width, height: crop.height, data: new Uint8ClampedArray(patch.data.length) };
    let changedInside = 0;
    for (let y = 0; y < crop.height; y++) for (let x = 0; x < crop.width; x++) {
      const a = opacity(x, y, edit), from = (y * crop.width + x) * 4;
      const to = ((y + crop.top) * base.width + x + crop.left) * 4;
      mask.data[from] = mask.data[from + 1] = mask.data[from + 2] = a;
      mask.data[from + 3] = 255;
      if (a) for (let c = 0; c < 3; c++) terrain.data[to + c] = Math.round((patch.data[from + c] * a + terrain.data[to + c] * (255 - a)) / 255);
      if (differs(base, terrain, to)) changedInside++;
    }
    assert(changedInside > 500, edit.id);
    for (const [suffix, image] of [['before', before], ['fitted', patch], ['mask', mask]]) {
      await raster(image).png().toFile(path.join(dir, `${edit.id}-${suffix}.png`));
    }
    await raster(terrain).extract(crop).png().toFile(path.join(dir, `${edit.id}-after.png`));
    patches.push({ edit, mask, patch });
    editsReport.push({ id: edit.id, crop, generationId: edit.generationId, colorOffsets, changedInside });
  }
  const active = (x, y) => patches.some(({ edit, mask }) => maskAt(x, y, edit, mask) > 0);
  const protectedRegions = Object.fromEntries(Object.keys(zone.protectedRegions).map(name => [name, 0]));
  const fog = patches.find(({ edit }) => edit.id === 'fog');
  const geometry = await pixels(path.join(dir, `kalistar-map-${zone.version}-geometry.png`));
  let changedInside = 0, changedOutside = 0, abyssChangedPixels = 0, fogNeighborChangedPixels = 0, navigationHubChangedPixels = 0, geometryFogRegionChanges = 0;
  for (let y = 0; y < base.height; y++) for (let x = 0; x < base.width; x++) {
    const i = (y * base.width + x) * 4;
    if (inRect(x, y, fog.edit.crop)) {
      if (differs(base, geometry, i)) geometryFogRegionChanges++;
      const lx = x - fog.edit.crop.left, ly = y - fog.edit.crop.top, abyss = fog.edit.preserveAbyss;
      if (differs(base, terrain, i)) {
        if (Math.hypot((lx - abyss.x) / abyss.rx, (ly - abyss.y) / abyss.ry) <= 1) abyssChangedPixels++;
        if (lx >= fog.edit.preserveNeighbors.left && ly >= fog.edit.preserveNeighbors.top) fogNeighborChangedPixels++;
        if (fog.edit.preserveHubs.some(hub => Math.hypot(lx - hub.x, ly - hub.y) <= hub.radius)) navigationHubChangedPixels++;
      }
    }
    if (!differs(base, terrain, i)) continue;
    if (active(x, y)) changedInside++; else changedOutside++;
    for (const [name, rect] of Object.entries(zone.protectedRegions)) if (inRect(x, y, rect)) protectedRegions[name]++;
  }
  assert.equal(changedOutside, 0);
  for (const count of Object.values(protectedRegions)) assert.equal(count, 0);
  for (const count of [abyssChangedPixels, fogNeighborChangedPixels, navigationHubChangedPixels, geometryFogRegionChanges]) assert.equal(count, 0);

  const preview = await raster(terrain).composite(overlays).png().toBuffer();
  const finalImage = await pixels(preview);
  let compositeChangedOutside = 0;
  for (let y = 0; y < base.height; y++) for (let x = 0; x < base.width; x++) {
    if (!active(x, y) && differs(parent.imageData, finalImage, (y * base.width + x) * 4)) compositeChangedOutside++;
  }
  assert.equal(compositeChangedOutside, 0);
  await raster(terrain).png().toFile(path.join(dir, `kalistar-map-${zone.version}-base.png`));
  fs.writeFileSync(path.join(dir, `kalistar-map-${zone.version}-preview.png`), preview);
  for (const { edit } of patches) {
    const name = { wall: 'wall', crater: 'durane', fog: 'cryptown' }[edit.id];
    await raster(finalImage).extract(edit.crop).resize({ width: 1100 }).png().toFile(path.join(dir, `${name}-detail.png`));
  }
  const index = parent.children.findIndex(child => cityNames.has(child.name));
  parent.children.splice(index, 0, ...patches.map(({ edit, mask, patch }) => ({
    name: edit.name, left: edit.crop.left, top: edit.crop.top, imageData: patch,
    mask: { left: edit.crop.left, top: edit.crop.top, defaultColor: 0, positionRelativeToLayer: false, imageData: mask }
  })));
  parent.imageData = finalImage;
  const psdFileOut = path.join(dir, `kalistar-map-${zone.version}.psd`);
  fs.writeFileSync(psdFileOut, api.writePsdBuffer(parent, { generateThumbnail: false }));
  const reopened = api.readPsd(fs.readFileSync(psdFileOut), { useImageData: true, skipThumbnail: true });
  assert.deepEqual(reopened.imageData.data, finalImage.data);
  for (let i = 0; i < originals.length; i++) assert.deepEqual(reopened.children[i + (i >= index ? patches.length : 0)], originals[i]);
  for (let p = 0; p < patches.length; p++) {
    assert.deepEqual(reopened.children[index + p].mask.imageData.data, patches[p].mask.data);
    assert.deepEqual(reopened.children[index + p].imageData.data, patches[p].patch.data);
  }
  for (const item of protectedSources) assert.equal(sha(path.join(root, item.file)), item.sha256);
  const report = {
    version: zone.version, parentVersion: zone.parentVersion, status: zone.status, runtimePublished: false,
    width: base.width, height: base.height, changedInside, changedOutside, compositeChangedOutside,
    edits: editsReport, protectedRegions, abyssChangedPixels, fogNeighborChangedPixels, navigationHubChangedPixels,
    geometryFogRegionChanges, atmosphereIndependent: true, cityCount: groups.length, cityGroupsUnchanged: true,
    duraneAnchor: zone.edits.find(edit => edit.id === 'crater').duraneAnchor,
    originalLayersUnchanged: true, editableMasksRoundTrip: true, compositeRoundTrip: true,
    nativePhotoshopTested: false, protectedSources
  };
  fs.writeFileSync(path.join(dir, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'provenance.json'), JSON.stringify({
    version: zone.version, parentVersion: zone.parentVersion, status: zone.status, runtimePublished: false,
    generator: 'built-in image_gen; deterministic masked terrain and atmosphere compositing',
    generations: zone.edits.map(edit => ({ id: edit.id, generationId: edit.generationId, prompt: `${edit.id}.prompt.txt`, output: `${edit.id}-generated.png` })),
    parentFiles: protectedSources,
    files: fs.readdirSync(dir).filter(file => file !== 'provenance.json').map(file => ({ file, sha256: sha(path.join(dir, file)) }))
  }, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
