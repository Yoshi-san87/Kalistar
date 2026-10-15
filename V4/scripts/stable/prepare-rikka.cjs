const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, 'V4/template-stable/rikka');
const read = p => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
async function main() {
  const card = read(path.join(work, 'card.json'));
  const previous = 'V4/template-stable/registry-electro-03c.json';
  const registry = read(previous), baseTemplate = registry.template;
  const protectedPaths = [previous, baseTemplate, card.approvedProposal, 'V3/donnees/cartes.json', 'V3/site/engine.js', 'V3/templates/10_NECRO_ZVIRI.psd', 'V3/templates/31_PYRO_POLUX.psd'];
  for (const name of ['MOMO_V4_11_POSITIONS', 'TAULIO_V4_02_POSITIONS', 'JELLY_JOE_V4_03_ENCRE', 'MOMO_BAL_V4_01_TEMPLATE_ELECTRO']) protectedPaths.push('V4/templates/' + name + '.psd', 'V4/cartes/' + name + '.png');
  const assetsPath = path.join(work, 'assets.json');
  const assets = { baseTemplate, artwork: card.artworkSource, approvedProposal: card.approvedProposal, artworkSha256: hash(card.approvedProposal), protectedFiles: Object.fromEntries(protectedPaths.map(p => [p, hash(p)])) };
  if (fs.existsSync(assetsPath)) {
    if (!Object.entries(read(assetsPath).protectedFiles).every(([p, h]) => hash(p) === h)) throw Error('Protected source changed');
  } else fs.writeFileSync(assetsPath, JSON.stringify(assets, null, 2));
  fs.copyFileSync(path.join(root, card.approvedProposal), path.join(root, card.artworkSource));
  registry.template = 'V4/template-stable/KALISTAR_V4_TEMPLATE_03D_ELECTRO_RIKKA.psd';
  registry.artworkRevision = 'RIKKA - Kalistel Luxo 04D approuve';
  const bank = (field, key, names) => registry.banks.find(b => b.field === field).variants[key] = names;
  bank('artwork', 'RIKKA', ['ART - RIKKA']);
  bank('id', card.id, ['ID CODE128 - ' + card.id]);
  bank('weapon', 'Fouet', ['ARME Fouet - pictogramme', 'ARME Fouet - email interieur']);
  bank('race', 'FELINEUS', ['RACE FELINEUS - pictogramme', 'RACE FELINEUS - email interieur']);
  registry.effectSupports = [{ side: 'DEF', die: 1, layers: ['DEF D1 - fond effet'] }];
  registry.artworkAssets.RIKKA = { source: card.artworkSource, approvedProposal: card.approvedProposal, sha256: assets.artworkSha256, placement: { width: 737, height: 921, centerX: 448.5, top: 156 } };
  const framingPath = path.join(work, 'framing.json');
  if (fs.existsSync(framingPath)) {
    const framing = read(framingPath);
    Object.assign(registry.artworkAssets.RIKKA, framing, { renderSha256: hash(framing.renderSource) });
  }
  fs.writeFileSync(path.join(root, 'V4/template-stable/registry-electro-03d.json'), JSON.stringify(registry, null, 2));
  const cards = read('V3/donnees/cartes.json'), peers = cards.filter(c => c.positions.includes(2));
  const mean = a => a.reduce((s, n) => s + n, 0) / a.length;
  const numericPeers = peers.filter(c => c.atk.every(Number.isFinite));
  const report = { diceOrder: 'D6 to D1', baseCaps: { atk: [300,250,200,150,100,50], defense: [180,150,120,90,60,30] }, attackMean: mean(card.atk), pureNumericP2AttackMean: mean(numericPeers.map(c => mean(c.atk))), magicDice: card.magic, physicalDice: [6,4,3,2,1], dodgeDie: 6, retryDie: 1, barriers: 0, defenseDodgeProbabilityAfterRetries: 0.2, numericDefenseMeanAfterRetries: mean(card.defense.filter(Number.isFinite)), note: 'DEF retry relance le de, sans attribuer un buff. Le dodge remplace la meilleure DEF. Aucun reraise, mort ou buff offensif. Comparaison de budget de faces uniquement, pas une preuve de balance en match.', peers: peers.map(c => ({ name: c.name, atk: c.atk, defense: c.defense, magic: c.magic, barriers: c.barriers })) };
  if (cards.some(c => c.id === card.id) || card.magic.length !== 1 || card.positions.join() !== '2' || card.defense.filter(v => v === 'dodge').length !== 1 || card.defense.filter(v => v === 'retry').length !== 1 || card.atk.some((v, i) => !Number.isInteger(v) || v > report.baseCaps.atk[i]) || card.defense.some((v, i) => typeof v === 'number' && v > report.baseCaps.defense[i])) throw Error('Invalid Rikka profile');
  fs.writeFileSync(path.join(work, 'balance.json'), JSON.stringify(report, null, 2));
  await sharp(path.join(work, 'barcode.svg')).png().toFile(path.join(work, 'barcode.png'));
  console.log(JSON.stringify({ output: card.output, attackMean: report.attackMean, pureNumericP2AttackMean: report.pureNumericP2AttackMean, originalArtworkCopiedExactly: hash(card.artworkSource) === assets.artworkSha256 }));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
