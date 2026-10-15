'use strict';
const { path, sharp } = require('../../atelier/lib.cjs');
const set = require('./set.json');
async function main() {
  const width = 320, height = 557, gap = 16;
  const layers = [];
  for (const [i, card] of set.cards.entries()) {
    const input = await sharp(path.join(__dirname, 'cards', card.key, 'card.png'))
      .extract({ left: 50, top: 50, width: 797, height: 1388 })
      .resize(width, height).png().toBuffer();
    layers.push({ input, left: gap + (i % 4) * (width + gap), top: gap + Math.floor(i / 4) * (height + gap) });
  }
  const output = path.join(__dirname, 'set-preview.jpg');
  await sharp({ create: { width: width * 4 + gap * 5, height: height * 3 + gap * 4, channels: 3, background: '#111716' } })
    .composite(layers).jpeg({ quality: 94 }).toFile(output);
  console.log(output);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
