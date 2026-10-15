const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, 'V4/template-stable/jelly-joe-encre');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
fs.mkdirSync(work, { recursive: true });
const artwork = 'V4/assets/illustrations/32_ELECTRO_JELLY_JOE_V4_03_ENCRE.png';
const approvedArtwork = 'V4/propositions/jelly-joe-dandy-02/08b-encre-visage-affine.png';
if (hash(artwork) !== hash(approvedArtwork)) throw Error('Approved illustration mismatch');
const card = read('V4/template-stable/revision-03/jelly-joe/card.json');
card.output = 'JELLY_JOE_V4_03_ENCRE';
card.positions = [3, 5];
card.positionSource = 'Demande utilisateur : positions 3 et 5 pour Jelly-Joe V4 Encre.';
card.artworkSource = artwork;
const registry = read('V4/template-stable/registry-electro-03.json');
registry.template = 'V4/template-stable/KALISTAR_V4_TEMPLATE_03B_ELECTRO_ENCRE.psd';
registry.artworkRevision = 'JELLY-JOE ENCRE 08B';
registry.artworkAssets = { 'JELLY-JOE': { source: artwork, approvedProposal: approvedArtwork, sha256: hash(artwork), placement: { width: 737, height: 921, centerX: 432, top: 156 } } };
const protectedPaths = [
  'V4/templates/JELLY_JOE_V4_02_VISAGE_POSITIONS.psd', 'V4/cartes/JELLY_JOE_V4_02_VISAGE_POSITIONS.png',
  'V4/template-stable/KALISTAR_V4_TEMPLATE_03_ELECTRO.psd', 'V4/template-stable/registry-electro-03.json',
  'V4/templates/MOMO_V4_11_POSITIONS.psd', 'V4/templates/TAULIO_V4_02_POSITIONS.psd',
  'V4/cartes/MOMO_V4_11_POSITIONS.png', 'V4/cartes/TAULIO_V4_02_POSITIONS.png',
  'V3/donnees/cartes.json', approvedArtwork
];
const assets = { artwork, approvedArtwork, sha256: hash(artwork), protectedFiles: Object.fromEntries(protectedPaths.map(p => [p, hash(p)])) };
const manifestPath = path.join(work, 'assets.json');
if (fs.existsSync(manifestPath)) {
  const prior = read('V4/template-stable/jelly-joe-encre/assets.json');
  if (!Object.entries(prior.protectedFiles).every(([p, h]) => hash(p) === h)) throw Error('Protected source changed');
} else fs.writeFileSync(manifestPath, JSON.stringify(assets, null, 2));
fs.writeFileSync(path.join(work, 'card.json'), JSON.stringify(card, null, 2));
fs.writeFileSync(path.join(root, 'V4/template-stable/registry-electro-03b.json'), JSON.stringify(registry, null, 2));
console.log('Encre profile and registry prepared; original files protected.');
