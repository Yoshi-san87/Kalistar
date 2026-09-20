const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex').toUpperCase();
const planPath = path.join(__dirname, 'plan.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8').replace(/^\uFEFF/, ''));
const administrative = ['V4/README.md', 'V4/template-stable/README.md', 'V4/AGENTS.md', 'V1/NETTOYAGE.md', 'V2/NETTOYAGE.md'];
const updates = [];
for (const p of administrative) {
  const entry = plan.Protected.find(v => v.Path === p); assert.ok(entry, p);
  const after = hash(p);
  if (entry.SHA256 !== after) updates.push({ path: p, before: entry.SHA256, after, reason: 'Documentation corrected to state pending approval; no cleanup executed.' });
  entry.SHA256 = after; entry.Bytes = fs.statSync(path.join(root, p)).size;
}
for (const item of plan.Deletions) assert.equal(fs.statSync(path.join(root, item.Path)).size, item.Bytes, item.Path);
assert.equal(fs.existsSync(path.join(__dirname, 'deleted-files.json')), false, 'Unexpected deletion log');
plan.Status = 'AWAITING_EXACT_BATCH_USER_CONFIRMATION';
fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
fs.writeFileSync(path.join(__dirname, 'administrative-document-updates.json'), JSON.stringify(updates, null, 2));
const active = read('V4/template-stable/current.json');
assert.ok(fs.existsSync(path.join(root, active.template)));
for (const c of active.cards) {
  const profile = read(c.profile); assert.equal(profile.output, c.output);
  for (const [dir, ext] of [['templates', 'psd'], ['cartes', 'png']]) {
    const p = `V4/${dir}/${c.output}.${ext}`;
    assert.ok(fs.existsSync(path.join(root, p))); assert.ok(!plan.Deletions.some(d => d.Path === p));
  }
}
const cards = read('V3/donnees/cartes.json'); assert.equal(cards.length, 41);
for (const c of cards) for (const p of [`V3/templates/${c.slug}.psd`, `V3/cartes/${c.slug}.png`, `V3/impression/${c.slug}.tif`, `V3/site/assets/cards/${c.slug}-full.png`, `V3/site/assets/cards/${c.slug}-art.webp`]) {
  assert.ok(fs.existsSync(path.join(root, p)), p); assert.ok(!plan.Deletions.some(d => d.Path === p));
}
const types = {}, groups = {};
for (const d of plan.Deletions) {
  const ext = path.extname(d.Path); types[ext] = (types[ext] || 0) + 1;
  groups[d.Reason] ||= { files: 0, bytes: 0 }; groups[d.Reason].files++; groups[d.Reason].bytes += d.Bytes;
}
const q = x => '"' + String(x).replaceAll('"', '""') + '"';
fs.writeFileSync(path.join(__dirname, 'selection.csv'), '\uFEFF' + ['Chemin;Octets;Motif;SHA256', ...plan.Deletions.map(d => [d.Path, d.Bytes, d.Reason, d.SHA256].map(q).join(';'))].join('\r\n'));
const gb = n => (n / 1e9).toFixed(2).replace('.', ',');
const report = `# Nettoyage Kalistar : confirmation requise\n\n**Statut : aucun fichier supprime.** La revue de securite a bloque la suppression definitive de ce lot et demande une confirmation de sa selection exacte.\n\n- Dossier analyse : ${gb(plan.BeforeBytes)} Go.\n- Selection : ${plan.Deletions.length} fichiers, ${gb(plan.DeleteBytes)} Go.\n- Taille visee apres suppression : environ ${gb(plan.BeforeBytes - plan.DeleteBytes)} Go.\n- ${plan.Protected.length} fichiers conserves avec empreintes SHA-256.\n\n## Selection\n\n| Categorie | Fichiers | Go |\n|---|---:|---:|\n${Object.entries(groups).map(([name, g]) => `| ${name} | ${g.files} | ${gb(g.bytes)} |`).join('\n')}\n\nListe exacte : [selection.csv](selection.csv). Manifeste avec tailles, motifs et empreintes : [plan.json](plan.json).\n\n## Exclus de la suppression\n\n- Les 41 cartes V3 : PSD, PNG, TIFF, illustrations et ressources du jeu.\n- Les cinq cartes V4 actuelles (Momo, Taulio, Jelly-Joe, Momo Bal et Rikka) : PSD et PNG.\n- Le maitre V4 03F, son registre et les profils actuels.\n- L'histoire, les fichiers Word et Excel, la BDD, les scripts et les sites.\n- Les illustrations, propositions artistiques, cartes PNG historiques et sources graphiques.\n- Les masters V1/V2, les deux references PSD V1, le PSD Momo V2 encore reference et les templates originaux.\n- La sauvegarde Momo recuperee de 135,7 Mio, conservee par prudence.\n\n## Consequences\n\nLa suppression proposee est **definitive**, sans nouvelle copie de plusieurs Go dans le projet. Les anciens PSD exportes V1/V2 peuvent etre reconstruits depuis les sources conservees ; les anciens essais V4 ne seraient plus disponibles en PSD. Les scripts et rapports historiques peuvent referencer ces etapes retirees : utiliser le maitre 03F et les profils recenses dans [current.json](../../V4/template-stable/current.json) pour la production courante. Les verifications des anciens exports demanderaient leur regeneration.\n\n## Confirmation\n\nConfirmer : **Oui, supprime les 742 fichiers du plan pour liberer 5,23 Go.**\n\nAucune nouvelle tentative de suppression ne sera lancee avant cet accord.\n`;
fs.writeFileSync(path.join(__dirname, 'PROPOSITION.md'), report);
fs.writeFileSync(path.join(__dirname, 'status.json'), JSON.stringify({ status: plan.Status, deletedFiles: 0, all742CandidatesStillPresent: true, activeV4CardsChecked: active.cards.length, activeV3CardsChecked: cards.length, protectedFiles: plan.Protected.length, types, planSHA256: crypto.createHash('sha256').update(fs.readFileSync(planPath)).digest('hex'), needsUserConfirmation: true }, null, 2));
console.log(JSON.stringify({ status: plan.Status, deletedFiles: 0, candidateFiles: plan.Deletions.length, deleteGB: gb(plan.DeleteBytes), beforeGB: gb(plan.BeforeBytes), afterGB: gb(plan.BeforeBytes - plan.DeleteBytes), types, protectedV4Cards: active.cards.length, protectedV3Cards: cards.length }, null, 2));
