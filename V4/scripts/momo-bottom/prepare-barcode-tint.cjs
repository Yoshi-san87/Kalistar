const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const folder = path.join(root, 'V4/momo-bottom/flag-barcode');
const stops = [[0, [160, 230, 237]], [.28, [173, 185, 234]], [.55, [217, 164, 218]], [.78, [240, 182, 198]], [1, [234, 213, 120]]];

(async () => {
  fs.mkdirSync(folder, { recursive: true });
  const width = 22, height = 210, data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    const phase = y / (height - 1);
    let i = 0; while (i < stops.length - 2 && phase > stops[i + 1][0]) i++;
    const a = stops[i], b = stops[i + 1], mix = (phase - a[0]) / (b[0] - a[0]);
    for (let x = 0; x < width; x++) for (let c = 0; c < 3; c++) data[(y * width + x) * 3 + c] = Math.round(a[1][c] * (1 - mix) + b[1][c] * mix);
  }
  await sharp(data, { raw: { width, height, channels: 3 } }).png().toFile(path.join(folder, 'barcode-spectrum.png'));
  fs.writeFileSync(path.join(folder, 'barcode-palette.json'), JSON.stringify({ box: [132, 848, 154, 1058], mode: 'multiply', stops, identity: '30000001', geometryChanged: false }, null, 2));
  console.log('Gradient RGB 22 x 210, without changing barcode modules.');
})().catch(error => { console.error(error); process.exitCode = 1; });
