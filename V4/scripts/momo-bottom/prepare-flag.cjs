const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const output = path.join(root, 'V4/momo-bottom/positions-flag');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const source = path.join(root, 'V3/assets/factions/Chroma.png');
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const outline = [[31, 55], [133, 55], [133, 175], [144, 193], [144, 244], [82, 326], [20, 244], [20, 193], [31, 175]];
  function inside(x, y) {
    let hit = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const a = outline[i], b = outline[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  }
  const visited = new Uint8Array(width * height), queue = [150 * width + 82];
  visited[queue[0]] = 1;
  // The hanging fabric is disconnected from the outer chains below the rod.
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor], x = index % width, y = Math.floor(index / width);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= width || ny < 55 || ny >= height || !inside(nx + .5, ny + .5)) continue;
      const neighbor = ny * width + nx;
      if (visited[neighbor] || !data[neighbor * 4 + 3]) continue;
      visited[neighbor] = 1; queue.push(neighbor);
    }
  }
  const rgba = Buffer.alloc(data.length);
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (const index of queue) {
    const x = index % width, y = Math.floor(index / width);
    data.copy(rgba, index * 4, index * 4, index * 4 + 4);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
  }
  const crop = { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  await sharp(rgba, { raw: info }).extract(crop).png().toFile(path.join(output, 'chroma-fabric-source.png'));
  fs.writeFileSync(path.join(output, 'fabric-geometry.json'), JSON.stringify({ source, sourceSize: [width, height], crop, resampled: false, componentPixels: queue.length }, null, 2));
  console.log(JSON.stringify(crop));
})().catch(error => { console.error(error); process.exitCode = 1; });
