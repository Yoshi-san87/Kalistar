const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bg = '#11181c', margin = 12, tile = 312, width = margin * 6 + tile * 5;
const crops = [[580, 65, 295, 330], [505, 35, 300, 350], [555, 90, 300, 350], [470, 25, 280, 335], [475, 25, 285, 340]];
function label(item) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="312" height="46"><rect width="312" height="46" fill="${bg}"/><text x="10" y="28" font-family="Arial, sans-serif" font-size="17" fill="#e7ede9">${item.n}. ${item.title}</text></svg>`);
}
async function main() {
  const specs = read('specs.json'), sources = read('sources.json'), protectedFiles = read('protected.json');
  const originalsUnchanged = Object.entries(protectedFiles).every(([p, sha]) => hash(path.join(root, p)) === sha);
  if (!originalsUnchanged) throw Error('A protected source has changed');
  const full = [], faces = [], records = [];
  for (const [i, item] of specs.items.entries()) {
    const source = sources.find(s => s.n === item.n).source;
    const dest = path.join(__dirname, item.file), sha = hash(source);
    if (fs.existsSync(dest) && hash(dest) !== sha) throw Error('Refusing to overwrite different artwork: ' + item.file);
    if (!fs.existsSync(dest)) fs.copyFileSync(source, dest);
    const meta = await sharp(dest).metadata(), left = margin + i * (tile + margin);
    full.push({ input: await sharp(dest).toColourspace('srgb').resize(tile, 410, { fit: 'contain', background: bg }).png().toBuffer(), left, top: margin });
    full.push({ input: label(item), left, top: 422 });
    const [x, y, w, h] = crops[i];
    faces.push({ input: await sharp(dest).toColourspace('srgb').extract({ left: x, top: y, width: w, height: h }).resize(tile, 366, { fit: 'contain', background: bg }).png().toBuffer(), left, top: margin });
    faces.push({ input: label(item), left, top: 378 });
    await sharp(dest).toColourspace('srgb').resize({ height: 1000 }).jpeg({ quality: 90 }).toFile(path.join(__dirname, 'apercu-' + item.n + '.jpg'));
    records.push({ n: item.n, title: item.title, file: item.file, source, width: meta.width, height: meta.height, sha256: sha, exactCopy: hash(dest) === sha, prompt: item.promptFile, promptSha256: hash(path.join(__dirname, item.promptFile)) });
  }
  await sharp({ create: { width, height: 480, channels: 3, background: bg } }).composite(full).png().toFile(path.join(__dirname, 'comparatif-illustrations.png'));
  await sharp({ create: { width, height: 436, channels: 3, background: bg } }).composite(faces).png().toFile(path.join(__dirname, 'comparatif-visages.png'));
  const manifest = { status: 'propositions-a-valider', tool: 'built-in image_gen', references: specs.references, styleRule: 'V4/DIRECTION_ARTISTIQUE.md', fullIllustrationsUnmodified: records.every(r => r.exactCopy), originalsUnchanged, protectedFiles, items: records };
  fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ count: records.length, dimensions: records.map(r => [r.width, r.height]), originalsUnchanged, exactCopies: manifest.fullIllustrationsUnmodified }, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
