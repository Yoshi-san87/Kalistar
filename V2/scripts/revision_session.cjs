const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const archive = path.join(root, 'archives', 'avant-ajustements-2026-09-14');
async function main() {
  fs.mkdirSync(archive, { recursive: true });
  for (const dir of ['cartes', 'donnees', 'assets/illustrations']) {
    const dest = path.join(archive, dir);
    if (!fs.existsSync(dest)) fs.cpSync(path.join(root, dir), dest, { recursive: true });
  }
  fs.mkdirSync(path.join(archive, 'scripts'), { recursive: true });
  for (const file of ['build_cards.jsx', 'finalize.py', 'finish_templates.jsx']) {
    const dest = path.join(archive, 'scripts', file);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(root, 'scripts', file), dest);
  }
  fs.mkdirSync(path.join(root, 'verification/revision'), { recursive: true });
  const cards = JSON.parse(fs.readFileSync(path.join(root, 'donnees/cartes.json')));
  for (const c of cards) {
    await sharp(c.art).resize(700).jpeg({ quality: 92 }).toFile(path.join(root, 'verification/revision', c.element + '_source.jpg'));
  }
  await sharp(path.join(root, 'cartes/01_ELECTRO_MOMO.png')).jpeg({ quality: 95 }).toFile(path.join(root, 'verification/revision/momo_source.jpg'));
  console.log('V2 snapshot and readable reference previews ready.');
}
main().catch(e => { console.error(e); process.exit(1); });
