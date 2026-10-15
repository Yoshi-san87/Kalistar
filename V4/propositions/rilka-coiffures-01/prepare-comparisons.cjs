const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const read = name => JSON.parse(fs.readFileSync(path.resolve(__dirname, name), 'utf8'));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bg = '#11181c', margin = 12;
function label(item, width) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="44"><rect width="${width}" height="44" fill="${bg}"/><text x="10" y="28" font-family="Arial, sans-serif" font-size="18" fill="#e7ede9">${item.n}. ${item.title}</text></svg>`);
}
async function main() {
  const specs = read('specs.json'), sources = read('sources.json'), previous = read('../rilka-01/manifest.json');
  if (hash(path.join(root, specs.source)) !== specs.sourceSha256) throw Error('Museum reference changed');
  const protectedCardsUnchanged = Object.entries(previous.protectedFiles).every(([p, sha]) => hash(path.join(root, p)) === sha);
  const previousProposalsUnchanged = previous.items.every(i => hash(path.join(__dirname, '../rilka-01', i.file)) === i.sha256);
  if (!protectedCardsUnchanged || !previousProposalsUnchanged) throw Error('Protected files changed');
  const full = [], faces = [], records = [];
  for (const [i, item] of specs.items.entries()) {
    const source = sources.find(s => s.n === item.n).source, sha = hash(source), dest = path.join(__dirname, item.file);
    if (fs.existsSync(dest) && hash(dest) !== sha) throw Error('Refusing to overwrite ' + item.file);
    if (!fs.existsSync(dest)) fs.copyFileSync(source, dest);
    const meta = await sharp(dest).metadata();
    const x = margin + i * (240 + margin);
    full.push({ input: await sharp(dest).toColourspace('srgb').resize(240, 300, { fit: 'contain', background: bg }).png().toBuffer(), left: x, top: margin });
    full.push({ input: label(item, 240), left: x, top: 312 });
    const fx = margin + i % 3 * 396, fy = margin + Math.floor(i / 3) * 432;
    faces.push({ input: await sharp(dest).toColourspace('srgb').extract({ left: 445, top: 15, width: 395, height: 385 }).resize(384, 376, { fit: 'contain', background: bg }).png().toBuffer(), left: fx, top: fy });
    faces.push({ input: label(item, 384), left: fx, top: fy + 376 });
    records.push({ n: item.n, title: item.title, file: item.file, source, width: meta.width, height: meta.height, sha256: sha, exactCopy: hash(dest) === sha, prompt: item.promptFile, promptSha256: hash(path.join(__dirname, item.promptFile)) });
  }
  await sharp({ create: { width: 1524, height: 368, channels: 3, background: bg } }).composite(full).png().toFile(path.join(__dirname, 'comparatif-illustrations.png'));
  await sharp({ create: { width: 1200, height: 876, channels: 3, background: bg } }).composite(faces).png().toFile(path.join(__dirname, 'comparatif-coiffures.png'));
  const manifest = { status: 'six-coiffures-a-valider', tool: 'built-in image_gen', editTarget: specs.source, editTargetSha256: specs.sourceSha256, editScope: 'Coiffure uniquement ; scene et personnage conserves visuellement, sans garantie de pixels identiques apres generation.', fullIllustrationsUnmodifiedAfterGeneration: records.every(r => r.exactCopy), protectedCardsUnchanged, previousProposalsUnchanged, items: records };
  fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ count: records.length, protectedCardsUnchanged, previousProposalsUnchanged, exactCopies: manifest.fullIllustrationsUnmodifiedAfterGeneration, dimensions: records.map(i => [i.width, i.height]) }, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
