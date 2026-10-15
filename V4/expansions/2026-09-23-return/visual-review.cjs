'use strict';
const L = require('../../atelier/lib.cjs');
async function main(mode = process.argv[2] || 'native') {
  L.assert.ok(['native', 'preview'].includes(mode));
  const cards = L.read(L.path.join(__dirname, 'set.json')).cards, out = L.path.join(__dirname, 'visual-review');
  L.fs.mkdirSync(out, { recursive: true });
  const sheets = [];
  for (let start = 0; start < cards.length; start += 8) {
    const group = cards.slice(start, start + 8), columns = 4, cellWidth = 310, cellHeight = 545;
    const layers = [];
    for (const [i, c] of group.entries()) {
      const left = i % columns * cellWidth, top = Math.floor(i / columns) * cellHeight;
      const file = L.path.join(__dirname, 'cards', c.key, mode === 'native' ? 'card.png' : 'preview.png');
      layers.push({ input: await L.sharp(file).resize(300, 501, { fit: 'contain' }).png().toBuffer(), left: left + 5, top });
      const label = '<svg width="310" height="40"><text x="155" y="25" fill="#f1e4c2" font-family="Arial" text-anchor="middle" font-size="13">' + c.key + '</text></svg>';
      layers.push({ input: Buffer.from(label), left, top: top + 501 });
    }
    const file = mode + '-' + (start / 8 + 1) + '.png';
    await L.sharp({ create: { width: columns * cellWidth, height: Math.ceil(group.length / columns) * cellHeight, channels: 4, background: '#111818' } }).composite(layers).png().toFile(L.path.join(out, file));
    sheets.push({ file, mode, keys: group.map(c => c.key) });
  }
  L.write(L.path.join(out, mode + '.json'), { sheets, purpose: 'Review-only contact sheets, never production card assets.' });
  console.log(JSON.stringify({ mode, sheets: sheets.map(s => s.file) }));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
