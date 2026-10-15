'use strict';
const L = require('../../atelier/lib.cjs');
async function main() {
  const { sharp, path } = L, items = [];
  for (const [i, key] of ['2b', '9s'].entries()) {
    const input = await sharp(path.join(__dirname, 'cards', key, 'card.png'))
      .extract({ left: 50, top: 50, width: 797, height: 1388 }).resize({ width: 398 }).png().toBuffer();
    items.push({ input, left: 20 + i * 418, top: 20 });
  }
  await sharp({ create: { width: 856, height: 734, channels: 3, background: '#090e0c' } })
    .composite(items).jpeg({ quality: 92 }).toFile(path.join(__dirname, 'pilot-preview.jpg'));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
