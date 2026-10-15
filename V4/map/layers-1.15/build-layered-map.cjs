const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const psdApi = require('./tooling/node_modules/ag-psd');
const root = __dirname;
const config = JSON.parse(fs.readFileSync(path.join(root, 'layout.json'), 'utf8'));
psdApi.initializeCanvas(() => { throw new Error('Canvas not required'); },
  (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }));

async function pixels(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
}

async function icon(file, height) {
  const raw = await pixels(file);
  let left = raw.width, top = raw.height, right = 0, bottom = 0, clear = 0;
  for (let y = 0; y < raw.height; y++) for (let x = 0; x < raw.width; x++) {
    const alpha = raw.data[(y * raw.width + x) * 4 + 3];
    if (alpha === 0) clear++;
    if (alpha > 8) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  }
  assert(clear > raw.width * raw.height * 0.1, 'Icon must have real transparent margins');
  return sharp(file).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize({ height }).png().toBuffer();
}

async function main() {
  const baseFile = path.resolve(root, config.base);
  const base = await pixels(baseFile);
  const children = [{ name: '01 - Fond sans villes (verrouille)', imageData: base,
    protected: { transparency: true, composite: true, position: true } }];
  const composite = [];
  for (const city of config.cities) {
    const rendered = await icon(path.join(root, 'icons', city.id + '.png'), city.height);
    const imageData = await pixels(rendered);
    const left = Math.round(city.centerX - imageData.width / 2), top = city.bottomY - imageData.height;
    const landmark = { name: city.name + ' - Monument', left, top, imageData };
    composite.push({ input: rendered, left, top });
    const width = 160, height = 26;
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="80" y="18" text-anchor="middle" font-family="Times New Roman" font-size="${config.labelSize}" font-weight="bold" font-style="italic" fill="${config.labelColor}" stroke="#dfbf8b" stroke-width="1.8" stroke-linejoin="round" paint-order="stroke fill">${city.name}</text></svg>`);
    const label = await sharp(svg).png().toBuffer();
    const textLeft = city.centerX - width / 2, textTop = city.labelY - 18;
    const nameLayer = { name: city.name + ' - Nom editable', left: textLeft, top: textTop,
      imageData: await pixels(label), text: {
        text: city.name, transform: [1, 0, 0, 1, city.centerX, city.labelY],
        shapeType: 'point', antiAlias: 'smooth',
        style: { font: { name: config.labelFont }, fontSize: config.labelSize,
          fillColor: { r: 57, g: 38, b: 18 }, fillFlag: true, strokeFlag: true,
          strokeColor: { r: 223, g: 191, b: 139 }, outlineWidth: 1.8, fillFirst: false },
        paragraphStyle: { justification: 'center' }
      } };
    children.push({ name: city.name, opened: true, children: [landmark, nameLayer] });
    composite.push({ input: label, left: textLeft, top: textTop });
  }
  const preview = await sharp(baseFile).composite(composite).png().toBuffer();
  fs.writeFileSync(path.join(root, 'kalistar-map-1.15-preview.png'), preview);
  const document = { width: base.width, height: base.height, children, imageData: await pixels(preview) };
  const psdFile = path.join(root, 'kalistar-map-1.15.psd');
  fs.writeFileSync(psdFile, psdApi.writePsdBuffer(document, { generateThumbnail: false }));
  // Read back all layers and their pixels, not just the merged thumbnail.
  const check = psdApi.readPsd(fs.readFileSync(psdFile), { useImageData: true, skipThumbnail: true });
  assert.equal(check.width, base.width); assert.equal(check.height, base.height);
  assert.equal(check.children.length, 4);
  assert(check.children[0].protected.position);
  for (let i = 0; i < config.cities.length; i++) {
    const group = check.children[i + 1];
    assert.equal(group.name, config.cities[i].name);
    assert.equal(group.children.length, 2);
    assert.equal(group.children[1].text.text.trim(), config.cities[i].name);
    assert(group.children[0].imageData.data.some((value, index) => index % 4 === 3 && value === 0));
  }
  assert.deepEqual(Buffer.from(check.imageData.data), Buffer.from(document.imageData.data));
  console.log(JSON.stringify({ width: check.width, height: check.height,
    groups: check.children.map(layer => layer.name), file: psdFile, verified: true }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
