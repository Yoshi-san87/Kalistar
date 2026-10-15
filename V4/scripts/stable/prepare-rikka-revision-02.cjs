const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, 'V4/template-stable/rikka-revision-02');
const read = p => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
const write = (p, data) => fs.writeFileSync(path.resolve(root, p), JSON.stringify(data, null, 2));
const oldRegistry = read('V4/template-stable/registry-electro-03d.json');
const card = read('V4/template-stable/rikka/card.json');
const oldOutput = card.output;
card.output = 'RIKKA_V4_02_VITRINE_ICONES';
card.artworkSource = 'V4/assets/illustrations/42_ELECTRO_RIKKA_V4_02_VITRINE_FRONTALE.png';
card.revisionNote = 'Vitrine accessible de face, dodge inscrit dans le cercle, trefle centre optiquement. Statistiques inchangees.';
write(path.join(work, 'card.json'), card);
const registry = structuredClone(oldRegistry);
registry.template = 'V4/template-stable/KALISTAR_V4_TEMPLATE_03E_ELECTRO_RIKKA.psd';
registry.artworkRevision = 'RIKKA revision 02 - vitrine frontale relevee';
Object.assign(registry.artworkAssets.RIKKA, {
  renderSource: card.artworkSource,
  generatedSource: 'C:/Users/guill/.codex/generated_images/019e30c1-21b0-7e11-9f9d-2fe692f111d2/exec-d2b9c337-ab04-415d-8483-bbf9330e788a.png',
  renderSha256: hash(card.artworkSource),
  prompt: 'V4/template-stable/rikka-revision-02/prompt-vitrine-relevee.txt',
  reason: 'Vitrine de taille humaine avec ouverture frontale relevee, sans porte laterale contradictoire.'
});
registry.effectLayouts = [
  { layer: 'DEF D6 - effet dodge', width: 72, height: 72, anchor: [50 / 99, 46 / 99], center: [754, 151], innerRadius: 53, safeRadius: 49, measuredInnerRim: { center: [753.65, 151.15], radii: [57, 59.65] }, measurement: 'Visible contour alpha >=32; optical anchor balances figure and diagonal motion trail on the actual painted rim.' },
  { layer: 'DEF D1 - effet retry', width: 58, height: 55, anchor: [(735.7969808995687 - 707) / 58, (774.846888478127 - 747) / 55], center: [737, 773], innerRadius: 38.5, safeRadius: 32, measuredInnerRim: { center: [736.85, 772.95], radii: [38.85, 38.7] }, measurement: 'Green leaf mass centroid aligned to the ACTUAL painted inner rim, not to support bounds or numeric field coordinates.' }
];
write('V4/template-stable/registry-electro-03e.json', registry);
const paths = [oldRegistry.template, 'V4/template-stable/registry-electro-03d.json', 'V3/donnees/cartes.json', 'V3/site/engine.js'];
for (const name of ['MOMO_V4_11_POSITIONS', 'TAULIO_V4_02_POSITIONS', 'JELLY_JOE_V4_03_ENCRE', 'MOMO_BAL_V4_01_TEMPLATE_ELECTRO', oldOutput]) paths.push('V4/templates/' + name + '.psd', 'V4/cartes/' + name + '.png');
const proofPath = path.join(work, 'sources.json');
if (fs.existsSync(proofPath)) {
  for (const [p, h] of Object.entries(read(proofPath).protectedFiles)) if (hash(p) !== h) throw Error('Protected file changed: ' + p);
} else write(proofPath, { baseTemplate: oldRegistry.template, baseCard: 'V4/templates/' + oldOutput + '.psd', protectedFiles: Object.fromEntries(paths.map(p => [p, hash(p)])) });
console.log(JSON.stringify({ card: card.output, registry: registry.template, protectedFiles: paths.length }));
