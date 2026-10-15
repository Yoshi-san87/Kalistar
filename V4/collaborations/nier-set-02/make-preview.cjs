'use strict';
const L = require('../../atelier/lib.cjs');
const set = require('./set.json');
async function main() {
  const width = 336, height = 561, gap = 18;
  const layers = [];
  for (const [i, c] of set.cards.entries()) {
    const home = L.path.join(__dirname, 'cards', c.key);
    const native = L.path.join(home, 'card.png');
    const source = L.fs.existsSync(native) ? native : L.path.join(home, 'preview.png');
    layers.push({ input: await L.sharp(source).resize(width, height).png().toBuffer(),
      left: gap + i % 3 * (width + gap), top: gap + Math.floor(i / 3) * (height + gap) });
  }
  const output = L.path.join(__dirname, 'set-preview.jpg');
  await L.sharp({ create: { width: 3 * width + 4 * gap, height: 2 * height + 3 * gap, channels: 3, background: '#0a100e' } })
    .composite(layers).jpeg({ quality: 93 }).toFile(output);
  console.log(output);
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { main };
