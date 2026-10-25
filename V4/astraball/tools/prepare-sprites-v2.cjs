'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const sharp = require(process.env.KALISTAR_NODE_MODULES ? path.join(process.env.KALISTAR_NODE_MODULES, 'sharp') : 'sharp');
const { silhouettes } = require('./prepare-sprites.cjs');
const root = path.resolve(__dirname, '..'), repo = path.resolve(root, '../..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const CELL = 96, FOOT = 90;

async function pack(character) {
  const source = path.join(root, character.source);
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== info.height) throw Error(character.id + ': non-square source');
  const { parts, labels } = silhouettes(data, info.width, info.height);
  const scale = Math.min(80 / Math.max(...parts.map(p => p.height)), 74 / Math.max(...parts.map(p => p.width)));
  const frames = [], placements = [];
  for (const [index, p] of parts.entries()) {
    const pixels = Buffer.alloc(p.width * p.height * 4), columns = new Uint32Array(p.width);
    for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
      const i = (p.top + y) * info.width + p.left + x, j = (y * p.width + x) * 4;
      if (labels[i] !== p.label) continue;
      data.copy(pixels, j, i * 4, i * 4 + 3); pixels[j + 3] = 255;
      if (y > p.height * .4 && y < p.height * .75) columns[x]++;
    }
    const mass = columns.reduce((a, b) => a + b, 0);
    let accumulated = 0, anchor = p.width / 2;
    for (let x = 0; x < columns.length; x++) {
      accumulated += columns[x];
      if (accumulated >= mass / 2) { anchor = x; break; }
    }
    const width = Math.round(p.width * scale), height = Math.round(p.height * scale);
    const left = Math.max(3, Math.min(CELL - width - 3, Math.round(CELL / 2 - anchor * scale))), top = FOOT - height;
    const input = await sharp(pixels, { raw: { width: p.width, height: p.height, channels: 4 } })
      .resize(width, height, { kernel: 'nearest' }).png().toBuffer();
    frames.push({ input, left: index % 4 * CELL + left, top: Math.floor(index / 4) * CELL + top });
    placements.push({ index, sourceBounds: p, left, top, width, height, foot: FOOT });
  }
  const file = 'assets/sprites-v2/' + character.id + '.png', target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const packed = await sharp({ create: { width: CELL * 4, height: CELL * 4, channels: 4, background: '#00000000' } })
    .composite(frames).png().toBuffer();
  await sharp(packed).png({ palette: true, colours: 128, dither: 0, effort: 10 }).toFile(target);
  return { id: character.id, characterId: character.characterId, modelId: character.modelId,
    file, source: character.source, sourceSha256: hash(source),
    reference: character.reference, referenceSha256: hash(path.join(repo, character.reference)),
    sha256: hash(target), bytes: fs.statSync(target).size, cell: CELL, foot: FOOT, frames: placements };
}

async function main() {
  const spec = JSON.parse(fs.readFileSync(path.join(root, 'sources/sprites-v2/prompts.json'), 'utf8'));
  const selected = process.argv.slice(2);
  const oldFile = path.join(root, 'sources/sprites-v2/atlas-report.json');
  const old = fs.existsSync(oldFile) ? JSON.parse(fs.readFileSync(oldFile, 'utf8')).characters : [];
  const report = new Map(old.map(c => [c.id, c]));
  for (const character of spec.characters) {
    if (selected.length && !selected.includes(character.id)) continue;
    const result = await pack(character);
    report.set(character.id, result);
    console.log(character.id + ': 16 poses, ' + result.bytes + ' bytes');
  }
  fs.writeFileSync(oldFile, JSON.stringify({ version: 2,
    tool: 'Built-in image_gen; v1 alpha segmentation and nearest-neighbour packing',
    characters: spec.characters.filter(c => report.has(c.id)).map(c => report.get(c.id))
  }, null, 2) + '\n');
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { pack };
