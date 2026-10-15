const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, 'V4/template-stable/momo-bal');
const read = p => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
async function main() {
  fs.mkdirSync(work, { recursive: true });
  const v3 = read('V3/donnees/cartes.json').find(c => c.id === '30000014');
  if (!v3 || v3.title !== 'LE BAL DES OBJETS PERDUS') throw Error('Unexpected source card');
  const card = { schemaVersion: 3 };
  for (const k of ['id', 'name', 'title', 'job', 'race', 'element', 'faction', 'weapon', 'positions', 'atk', 'defense', 'magic', 'barriers']) card[k] = v3[k];
  card.artwork = 'MOMO-BAL';
  card.description = v3.text;
  card.output = 'MOMO_BAL_V4_01_TEMPLATE_ELECTRO';
  card.artworkSource = 'V3/assets/illustrations/14_electro_momo_carillon.png';
  card.sourcePSD = 'V3/templates/14_ELECTRO_MOMO_CARILLON.psd';
  const registry = read('V4/template-stable/registry-electro-03b.json');
  const baseTemplate = registry.template;
  registry.template = 'V4/template-stable/KALISTAR_V4_TEMPLATE_03C_ELECTRO_MOMO_BAL.psd';
  registry.artworkRevision = 'MOMO LE BAL DES OBJETS PERDUS - illustration V3 conservee';
  registry.banks.find(b => b.field === 'artwork').variants['MOMO-BAL'] = ['ART - MOMO BAL'];
  registry.banks.find(b => b.field === 'id').variants[card.id] = ['ID CODE128 - ' + card.id];
  registry.artworkAssets['MOMO-BAL'] = { source: card.artworkSource, sha256: hash(card.artworkSource), sourcePSD: card.sourcePSD, placement: 'Cadrage natif du PSD V3, sans transformation' };
  const protectedPaths = [baseTemplate, 'V4/template-stable/registry-electro-03b.json', card.artworkSource, card.sourcePSD, 'V3/donnees/cartes.json', 'V3/cartes/14_ELECTRO_MOMO_CARILLON.png'];
  for (const name of ['MOMO_V4_11_POSITIONS', 'TAULIO_V4_02_POSITIONS', 'JELLY_JOE_V4_03_ENCRE']) {
    protectedPaths.push('V4/templates/' + name + '.psd', 'V4/cartes/' + name + '.png');
  }
  const assets = { baseTemplate, artwork: card.artworkSource, artworkSha256: hash(card.artworkSource), sourcePSD: card.sourcePSD, protectedFiles: Object.fromEntries(protectedPaths.map(p => [p, hash(p)])) };
  const assetPath = path.join(work, 'assets.json');
  if (fs.existsSync(assetPath)) {
    const previous = read(assetPath);
    if (!Object.entries(previous.protectedFiles).every(([p, h]) => hash(p) === h)) throw Error('Protected source changed');
  } else fs.writeFileSync(assetPath, JSON.stringify(assets, null, 2));
  fs.writeFileSync(path.join(work, 'card.json'), JSON.stringify(card, null, 2));
  fs.writeFileSync(path.join(root, 'V4/template-stable/registry-electro-03c.json'), JSON.stringify(registry, null, 2));
  await sharp(path.join(root, 'V3/cartes/14_ELECTRO_MOMO_CARILLON.png')).toColourspace('srgb').resize({ height: 1100 }).png().toFile(path.join(work, 'reference-v3.png'));
  await sharp(path.join(root, card.artworkSource)).toColourspace('srgb').resize({ height: 900 }).png().toFile(path.join(work, 'illustration-source-preview.png'));
  console.log(JSON.stringify({ card, baseTemplate, artworkSha256: assets.artworkSha256 }, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
