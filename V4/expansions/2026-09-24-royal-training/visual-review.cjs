'use strict';
const L = require('../../atelier/lib.cjs'), G = require('./preservation.cjs');
async function main(mode = process.argv[2] || 'native') {
  L.assert.ok(['native', 'revisions'].includes(mode));
  const keys = mode === 'native' ? L.read(G.local('set.json')).cards.map(c => c.key) : require('./reference-plan.cjs').KEYS;
  const out = G.local('visual-review/' + mode); L.assert.ok(!L.fs.existsSync(out), 'Review already exists.');
  const inputs = keys.map(key => {
    const folder = (mode === 'native' ? 'cards/' : 'revisions/') + key;
    const proof = G.local(folder + '/verification.json'), file = G.local(folder + '/card.png');
    L.assert.equal(L.read(proof).passed, true);
    return { key, file: G.relative(file), sha256: G.digest(file), proof: G.relative(proof), proofHash: G.digest(proof) };
  });
  L.fs.mkdirSync(out, { recursive: true }); const sheets = [];
  for (let start = 0; start < inputs.length; start += 3) {
    const group = inputs.slice(start, start + 3), layers = [];
    for (const [i, item] of group.entries()) {
      layers.push({ input: await L.sharp(L.inside(L.ROOT, item.file)).resize(350, 584, { fit: 'contain' }).png().toBuffer(), left: i * 360 + 5, top: 0 });
      const svg = '<svg width="360" height="34"><text x="180" y="22" fill="#eeeeee" font-family="Arial" text-anchor="middle" font-size="13">' + item.key + '</text></svg>';
      layers.push({ input: Buffer.from(svg), left: i * 360, top: 584 });
    }
    const file = L.path.join(out, String(start / 3 + 1) + '.png');
    await L.sharp({ create: { width: 1080, height: 620, channels: 4, background: '#171717' } }).composite(layers).png().toFile(file);
    sheets.push({ file: G.relative(file), sha256: G.digest(file), keys: group.map(c => c.key) });
  }
  G.exclusive(L.path.join(out, 'index.json'), { purpose: 'Review only, never production artwork.', inputs, sheets });
  console.log({ mode, sheets: sheets.map(s => s.file) });
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
