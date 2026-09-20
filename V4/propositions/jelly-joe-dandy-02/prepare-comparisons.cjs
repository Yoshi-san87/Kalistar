const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const generated = 'C:/Users/guill/.codex/generated_images/019e30c1-21b0-7e11-9f9d-2fe692f111d2';
const items = [
  {
    "n": 6,
    "title": "Ambre",
    "file": "06-ambre.png",
    "source": "exec-099ec253-3ae8-4826-be72-761189033064.png",
    "crop": [
      475,
      10,
      400,
      450
    ]
  },
  {
    "n": 7,
    "title": "Opale",
    "file": "07-opale.png",
    "source": "exec-cd1394a4-bff9-4687-bde9-e14b370ac6b7.png",
    "crop": [
      450,
      0,
      415,
      465
    ]
  },
  {
    "n": 8,
    "title": "Encre",
    "file": "08-encre.png",
    "source": "exec-9e870984-c4ec-4250-b916-b67fc594c29a.png",
    "crop": [
      435,
      15,
      400,
      450
    ]
  },
  {
    "n": 9,
    "title": "Corail",
    "file": "09-corail.png",
    "source": "exec-311b2fa3-63a8-468c-8d37-214ea6bc4058.png",
    "crop": [
      435,
      15,
      405,
      455
    ]
  },
  {
    "n": 10,
    "title": "Jade",
    "file": "10-jade.png",
    "source": "exec-a8cf2e81-73c3-4343-bc6b-ad535b3cc41e.png",
    "crop": [
      400,
      15,
      410,
      460
    ]
  }
];
const protectedFiles = {
  'V4/templates/JELLY_JOE_V4_02_VISAGE_POSITIONS.psd': '8d8432a6df5bd4f1ed062a978fb817e62c82db770d879c916bfd1686bdf04b8a',
  'V4/cartes/JELLY_JOE_V4_02_VISAGE_POSITIONS.png': 'dc234c9c610a0c02db6ccd128ac427be9b40d2d7a17eb52f2007ee9405888ca8',
  'V4/template-stable/KALISTAR_V4_TEMPLATE_03_ELECTRO.psd': '876109e21d285c16e363e9feb35de7867c67349c9dce2f73eee15600f89a92c2'
};
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bg = '#11181c', width = 1632, tileWidth = 312, margin = 12;
function label(item) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="312" height="46"><rect width="312" height="46" fill="${bg}"/><text x="10" y="29" font-family="Arial, sans-serif" font-size="18" fill="#eee8da">${item.n}. ${item.title}</text></svg>`);
}
async function main() {
  const portraits = [], full = [], records = [];
  for (const [i, item] of items.entries()) {
    const p = path.join(__dirname, item.file), meta = await sharp(p).metadata();
    const [left, top, w, h] = item.crop, x = margin + i * (tileWidth + margin);
    portraits.push({ input: await sharp(p).extract({ left, top, width: w, height: h }).resize(tileWidth, 356, { fit: 'contain', background: bg }).png().toBuffer(), left: x, top: margin });
    portraits.push({ input: label(item), left: x, top: 368 });
    full.push({ input: await sharp(p).resize(tileWidth, 438, { fit: 'contain', background: bg }).png().toBuffer(), left: x, top: margin });
    full.push({ input: label(item), left: x, top: 450 });
    const sourcePath = path.join(generated, item.source), sha = hash(p);
    records.push({ ...item, source: sourcePath, width: meta.width, height: meta.height, sha256: sha, exactCopy: sha === hash(sourcePath), prompt: `prompt-${String(item.n).padStart(2, '0')}.txt`, promptSha256: hash(path.join(__dirname, `prompt-${String(item.n).padStart(2, '0')}.txt`)) });
  }
  await sharp({ create: { width, height: 426, channels: 3, background: bg } }).composite(portraits).png().toFile(path.join(__dirname, 'comparatif-visages.png'));
  await sharp({ create: { width, height: 508, channels: 3, background: bg } }).composite(full).png().toFile(path.join(__dirname, 'comparatif-illustrations.png'));
  const originalsUnchanged = Object.entries(protectedFiles).every(([p, sha]) => hash(path.join(root, p)) === sha);
  const report = { status: 'proposals-awaiting-user-choice', tool: 'built-in image_gen', fullIllustrationsUnmodified: records.every(r => r.exactCopy), originalsUnchanged, protectedFiles, items: records };
  fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ count: records.length, fullIllustrationsUnmodified: report.fullIllustrationsUnmodified, originalsUnchanged }, null, 2));
  if (!originalsUnchanged || !report.fullIllustrationsUnmodified) throw Error('Asset verification failed');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
