const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function main() {
  const root = path.resolve(__dirname, '../../..');
  const previous = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
  const source = 'C:/Users/guill/.codex/generated_images/019e30c1-21b0-7e11-9f9d-2fe692f111d2/exec-175d8040-4688-491d-bf71-ed8b1ca93af5.png';
  const file = '08b-encre-visage-affine.png', saved = path.join(__dirname, file);
  const before = path.join(__dirname, '08-encre.png');
  const sources = [before, saved], layers = [], meta = await sharp(saved).metadata();
  const bg = '#11181c';
  for (const [i, p] of sources.entries()) {
    const title = i ? '08B - Visage legerement allonge' : '08 - Encre original';
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="460" height="46"><rect width="460" height="46" fill="${bg}"/><text x="12" y="29" font-family="Arial, sans-serif" font-size="20" fill="#eee8da">${title}</text></svg>`);
    layers.push({ input: await sharp(p).extract({ left: 500, top: 105, width: 230, height: 270 }).resize(460, 540).png().toBuffer(), left: 12 + i * 472, top: 12 });
    layers.push({ input: label, left: 12 + i * 472, top: 552 });
  }
  await sharp({ create: { width: 956, height: 610, channels: 3, background: bg } }).composite(layers).png().toFile(path.join(__dirname, 'comparatif-08-08b.png'));
  const report = {
    status: 'facial-refinement-awaiting-user-feedback', tool: 'built-in image_gen',
    input: '08-encre.png', output: file, prompt: 'prompt-08b.txt', generatedSource: source,
    dimensions: [meta.width, meta.height], outputSha256: hash(saved), generatedCopyExact: hash(source) === hash(saved),
    original08Unchanged: hash(before) === previous.items.find(i => i.n === 8).sha256,
    cardAndTemplateUnchanged: Object.entries(previous.protectedFiles).every(([p, sha]) => hash(path.join(root, p)) === sha),
    note: 'Generative local refinement requested. Composition visually preserved; no pixel-identity guarantee outside the face. Card PSD not modified.'
  };
  fs.writeFileSync(path.join(__dirname, 'revision-08b.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.generatedCopyExact || !report.original08Unchanged || !report.cardAndTemplateUnchanged) throw Error('Source verification failed');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
