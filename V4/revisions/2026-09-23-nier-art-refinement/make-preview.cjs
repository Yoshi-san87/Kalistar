'use strict';
const L = require('../../atelier/lib.cjs');
async function main() {
  const cards = require('./revised-set.json').cards, layers = [];
  const width = 336, height = 561, gap = 18;
  for (const [i, card] of cards.entries()) {
    const file = L.path.join(L.ROOT, 'V4/creations', card.id, 'card.png');
    layers.push({ input: await L.sharp(file).resize(width, height).png().toBuffer(),
      left: gap + i % 3 * (width + gap), top: gap + Math.floor(i / 3) * (height + gap) });
  }
  const out = L.path.join(__dirname, 'set-preview.jpg');
  await L.sharp({ create: { width: 3 * width + 4 * gap, height: 2 * height + 3 * gap, channels: 3, background: '#0a100e' } })
    .composite(layers).jpeg({ quality: 93 }).toFile(out);
  console.log(out);
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
