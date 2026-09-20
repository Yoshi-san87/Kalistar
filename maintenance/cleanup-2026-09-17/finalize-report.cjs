const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, ''));
const audit = name => read(`maintenance/cleanup-2026-09-17/${name}`);
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
async function hash(file) {
  const h = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) h.update(chunk);
  return h.digest('hex').toUpperCase();
}
async function main() {
  const plan = audit('plan.json');
  const result = audit('verification.json');
  const deleted = audit('deleted-files.json');
  const priorStatus = audit('status.json');
  const planHash = (await hash(path.join(__dirname, 'plan.json'))).toLowerCase();
  assert.equal(planHash, priorStatus.planSHA256, 'Approved manifest changed');
  assert.equal(result.Passed, true);
  assert.equal(deleted.length, 742);
  assert.equal(deleted.length, plan.Deletions.length);
  assert.deepEqual(deleted.map(d => d.Path).sort(), plan.Deletions.map(d => d.Path).sort());
  for (const d of deleted) assert.equal(fs.existsSync(path.join(root, d.Path)), false, d.Path);
  const administrative = new Set(['V4/README.md', 'V4/template-stable/README.md', 'V4/AGENTS.md', 'V1/NETTOYAGE.md', 'V2/NETTOYAGE.md']);
  const updates = [];
  for (const p of plan.Protected) {
    const full = path.join(root, p.Path);
    const after = await hash(full);
    if (administrative.has(p.Path)) {
      updates.push({ path: p.Path, before: p.SHA256, after, bytes: fs.statSync(full).size, reason: 'Post-verification documentation updated from pending to completed cleanup.' });
    } else {
      assert.equal(after, p.SHA256, p.Path);
      assert.equal(fs.statSync(full).size, p.Bytes, p.Path);
    }
  }
  assert.equal(updates.length, 5);
  const active = read('V4/template-stable/current.json');
  const assets = [active.template, active.registry, ...active.renderer];
  for (const c of active.cards) {
    assert.equal(read(c.profile).output, c.output);
    assets.push(c.profile, `V4/templates/${c.output}.psd`, `V4/cartes/${c.output}.png`);
  }
  const cards = read('V3/donnees/cartes.json');
  assert.equal(cards.length, 41);
  for (const c of cards) assets.push(`V3/templates/${c.slug}.psd`, `V3/cartes/${c.slug}.png`, `V3/impression/${c.slug}.tif`, `V3/site/assets/cards/${c.slug}-full.png`, `V3/site/assets/cards/${c.slug}-art.webp`);
  for (const p of assets) {
    assert.ok(fs.existsSync(path.join(root, p)), p);
    assert.ok(plan.Protected.some(e => e.Path === p), p);
  }
  const freed = deleted.reduce((sum, d) => sum + d.Bytes, 0);
  assert.equal(freed, result.DeletedBytes);
  write('post-cleanup-document-updates.json', updates);
  const status = {
    status: 'COMPLETED_AND_VERIFIED', completedAt: result.VerifiedAt,
    finalVerifiedAt: new Date().toISOString(), deletedFiles: deleted.length,
    deletedBytes: freed, beforeBytes: result.BeforeBytes, afterBytesAtVerification: result.AfterBytes,
    protectedFiles: plan.Protected.length, unchangedProtectedFilesAfterDocumentation: plan.Protected.length - updates.length,
    administrativeDocumentsUpdated: updates.length, activeV4CardsChecked: active.cards.length,
    activeV3CardsChecked: cards.length, currentResourcePathsChecked: assets.length,
    remainingCandidates: 0, planSHA256: planHash, needsUserConfirmation: false
  };
  write('status.json', status);
  const gb = n => (n / 1e9).toFixed(2).replace('.', ',');
  fs.writeFileSync(path.join(__dirname, 'RAPPORT.md'), `# Nettoyage Kalistar termine\n\nLot exact confirme par l'utilisateur, execute le 17 septembre 2026.\n\n- **${gb(freed)} Go liberes** : ${deleted.length} fichiers supprimes definitivement.\n- Dossier passe de **${gb(result.BeforeBytes)} Go a ${gb(result.AfterBytes)} Go**, hors petits fichiers de cet audit.\n- ${plan.Protected.length} fichiers conserves verifies par SHA-256 apres suppression : aucune modification detectee.\n- Controle final : ${plan.Protected.length - updates.length} fichiers toujours identiques ; seuls les cinq documents administratifs ont ensuite ete mis a jour pour indiquer que le nettoyage est termine.\n\n## Conserves\n\nLes 41 cartes V3 avec leurs PSD, PNG, TIFF et ressources du jeu ; les cinq cartes V4 actuelles avec leurs PSD et PNG ; le maitre V4 03F, son registre et les profils ; les illustrations, sources graphiques et propositions ; les donnees, scripts, sites, fichiers Word et Excel. Les ${assets.length} chemins de ressources courantes controles sont tous presents.\n\n## Supprimes\n\nAnciens PSD de cartes exportes V1/V2, PSD intermediaires V4 remplaces, anciens exports d'impression et rendus de verification selectionnes. Types : 69 PSD, 466 PNG, 167 JPG, 36 TIF et 4 PDF. Les anciennes cartes PNG sont conservees.\n\nLes rapports historiques peuvent citer des fichiers retires. Pour les prochaines cartes, utiliser [current.json](../../V4/template-stable/current.json) et le maitre 03F ; ne pas relancer la chaine des migrations historiques. Les anciens exports V1/V2 necessitent leur regeneration pour leurs controles historiques.\n\n## Tracabilite\n\n- [Selection approuvee](selection.csv) et [manifeste original](plan.json), inchanges.\n- [Journal des suppressions](deleted-files.json).\n- [Verification apres suppression](verification.json).\n- [Mises a jour documentaires posteriores](post-cleanup-document-updates.json).\n- [Statut final et controle des ressources](status.json).\n\nAucun test de gameplay ni nouveau rendu Photoshop n'a ete execute : le controle porte sur la presence et l'integrite des fichiers conserves.\n`);
  console.log(JSON.stringify(status, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
