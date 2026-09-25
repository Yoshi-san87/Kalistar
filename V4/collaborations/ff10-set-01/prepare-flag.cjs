'use strict';
const L = require('../../atelier/lib.cjs');
const R = require('../../atelier/designer-render.cjs');
const { fs, path, sharp, assert, write } = L;
async function main() {
  await L.protectedCheck();
  const manifest = await R.verifyAssets();
  const f = manifest.factions.Chroma;
  const file = name => path.join(__dirname, name);
  const source = file('arenas/flag-source.png');
  assert.ok(fs.existsSync(source), 'Generated FF10 flag missing.');
  const flag = await sharp(source).flatten({ background: '#000000' }).resize(f.width, f.height, { fit: 'fill' }).png().toBuffer();
  // Retain the exact approved pennant footprint, including its fine edge alpha.
  const outline = path.join(L.ROOT, 'V4/collaborations/ff8-set-01/flag-FF8.png');
  const clipped = await sharp(flag).composite([{ input: outline, blend: 'dest-in' }]).png().toBuffer();
  const { data, info } = await sharp(clipped).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = [info.width, info.height, -1, -1];
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (!data[(y * info.width + x) * 4 + 3]) continue;
    b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y);
    b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y);
  }
  const packedGeometry = { left: f.left + b[0], top: f.top + b[1], width: b[2] - b[0] + 1, height: b[3] - b[1] + 1 };
  assert.deepEqual(packedGeometry, { left: 672, top: 829, width: 98, height: 223 });
  await sharp(clipped).toFile(file('flag-FF10.png'));
  await sharp(clipped).extract({ left: b[0], top: b[1], width: packedGeometry.width, height: packedGeometry.height }).png().toFile(file('flag-FF10-packed.png'));
  write(file('faction.json'), { id: 'FF10', label: 'Final Fantasy X', flag: 'flag-FF10.png', packedFlag: 'flag-FF10-packed.png', packedGeometry, sourceHash: await L.hash(source), bonusField: 'faction', bonusStat: 'ATK', membersScope: 'living-board-only', isolatedFrom: ['FF7', 'FF8', 'NieR', 'Replicant', 'Chroma'] });
  console.log(JSON.stringify({ packedGeometry, sourceHash: await L.hash(source) }));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
