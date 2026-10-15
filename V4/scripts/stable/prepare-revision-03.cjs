const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, 'V4/template-stable/revision-03');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
fs.mkdirSync(work, { recursive: true });
const specs = [
  { key: 'momo', oldOutput: 'MOMO_V4_10_FONDS_RECENTRES', output: 'MOMO_V4_11_POSITIONS', id: '30000001' },
  { key: 'taulio', oldOutput: 'TAULIO_V4_01_TEMPLATE_STABLE', output: 'TAULIO_V4_02_POSITIONS', profile: 'V4/template-stable/taulio.json' },
  { key: 'jelly-joe', oldOutput: 'JELLY_JOE_V4_01_TEMPLATE_ELECTRO', output: 'JELLY_JOE_V4_02_VISAGE_POSITIONS', profile: 'V4/template-stable/jelly-joe/card.json' }
];
const roster = read('V3/donnees/cartes.json');
const momoLayers = read('V4/template-stable/jelly-joe/extension.json').before;
for (const spec of specs) {
  const card = spec.profile ? read(spec.profile) : { ...roster.find(c => c.id === spec.id), artwork: 'MOMO' };
  if (spec.key === 'momo') {
    card.title = momoLayers.find(l => l.name === 'TITLE').text;
    card.description = momoLayers.find(l => l.name === 'DESCRIPTION').text.replace(/\r/g, ' ');
  }
  card.schemaVersion = 3;
  card.output = spec.output;
  fs.mkdirSync(path.join(work, spec.key), { recursive: true });
  fs.writeFileSync(path.join(work, spec.key, 'card.json'), JSON.stringify(card, null, 2));
}
const artwork = 'V4/assets/illustrations/32_ELECTRO_JELLY_JOE_V4_02.png';
const generatedSource = 'C:/Users/guill/.codex/generated_images/019e30c1-21b0-7e11-9f9d-2fe692f111d2/exec-67078516-112a-4da3-89e5-65ccc8b00675.png';
const protectedPaths = specs.flatMap(s => [`V4/templates/${s.oldOutput}.psd`, `V4/cartes/${s.oldOutput}.png`]).concat([
  'V4/template-stable/KALISTAR_V4_TEMPLATE_02_ELECTRO.psd', 'V4/template-stable/registry-electro-02.json',
  'V3/donnees/cartes.json', 'V3/templates/32_ELECTRO_JELLY_JOE.psd',
  'V4/assets/illustrations/32_ELECTRO_JELLY_JOE_V4_01.png'
]);
const manifest = { specs, artwork, generatedSource, artworkSha256: hash(artwork), tool: 'built-in image_gen', prompt: 'V4/donnees/prompt-jelly-joe-v4-02.txt', protectedFiles: Object.fromEntries(protectedPaths.map(p => [p, hash(p)])) };
const manifestPath = path.join(work, 'assets.json');
if (fs.existsSync(manifestPath)) {
  const previous = read('V4/template-stable/revision-03/assets.json');
  if (!Object.entries(previous.protectedFiles).every(([p, h]) => hash(p) === h)) throw Error('Protected source changed since first run');
} else fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Revision 03 profiles prepared. Approved files protected.');
