const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../..');
const out = path.join(root, 'V4/template-stable/jelly-joe');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, ''));
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const v3 = read('V3/donnees/cartes.json').find(c => c.id === '30000032');
  if (!v3) throw Error('Jelly-Joe V3 absent');
  const card = { schemaVersion: 2 };
  for (const k of ['id', 'name', 'title', 'job', 'race', 'element', 'faction', 'weapon', 'positions', 'atk', 'defense', 'magic', 'barriers']) card[k] = v3[k];
  card.artwork = 'JELLY-JOE'; card.description = v3.text;
  card.output = 'JELLY_JOE_V4_01_TEMPLATE_ELECTRO';
  fs.writeFileSync(path.join(out, 'card.json'), JSON.stringify(card, null, 2));
  // Extract only the hanging cloth, without the source's independent oversized pole.
  const crop = { left: 124, top: 280, width: 720, height: 1309 };
  await sharp(path.join(root, 'V3/assets/factions/Crabazar.png')).extract(crop).png().toFile(path.join(out, 'crabazar-fabric.png'));
  const artwork = 'V4/assets/illustrations/32_ELECTRO_JELLY_JOE_V4_01.png';
  const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
  const report = {
    artwork, engine: 'built-in image_gen',
    generatedSource: 'C:/Users/guill/.codex/generated_images/019e30c1-21b0-7e11-9f9d-2fe692f111d2/exec-670cffd9-55c6-4110-9ad5-a93febb476db.png',
    artworkSha256: sha(artwork), prompt: 'V4/donnees/prompt-jelly-joe-v4-01.txt',
    styleRule: 'V4/DIRECTION_ARTISTIQUE.md',
    references: ['V3/assets/illustrations/01_ELECTRO_MOMO.png', 'V3/assets/illustrations/34_NECRO_VALAZAR.png'],
    flag: { source: 'V3/assets/factions/Crabazar.png', crop, resampled: false },
    protectedFiles: {}
  };
  for (const p of ['V4/template-stable/KALISTAR_V4_TEMPLATE_01.psd', 'V4/templates/TAULIO_V4_01_TEMPLATE_STABLE.psd', 'V4/templates/MOMO_V4_10_FONDS_RECENTRES.psd', 'V3/templates/32_ELECTRO_JELLY_JOE.psd']) report.protectedFiles[p] = sha(p);
  fs.writeFileSync(path.join(out, 'assets.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ card: card.name, output: out, artworkSha256: report.artworkSha256 }));
})().catch(e => { console.error(e); process.exitCode = 1; });
