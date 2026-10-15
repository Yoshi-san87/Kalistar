'use strict';
// One reviewed integration delta, before any native preparation. Keep the
// original capture and both source versions; never renew the old lock hashes.
const L = require('../../atelier/lib.cjs');
async function record() {
  const { fs, path, assert, ROOT, read, write } = L, home = __dirname;
  const out = path.join(home, 'dependency-revisions.json'); assert.ok(!fs.existsSync(out));
  const cards = path.join(home, 'cards');
  if (fs.existsSync(cards)) for (const name of fs.readdirSync(cards)) assert.ok(!fs.existsSync(path.join(cards, name, 'preparation.json')), 'Revision interdite apres preparation.');
  const deps = read(path.join(home, 'dependencies.json')), file = 'V4/atelier/game-catalog.cjs';
  const prior = path.join(ROOT, 'paquets-transfert/github-personnel-20260921', file);
  assert.equal(await L.hash(prior), deps[file], 'La copie de depart doit correspondre a la capture exacte.');
  assert.equal(await L.hash(path.join(ROOT, file)), '19c2cabf915cfe1c87ad023358eb0f1af5b415772f26f7a7147e1c0adf1db085');
  const changes = [];
  for (const name of [file, 'V4/site/collaborations.js']) {
    const stem = path.basename(name), beforeCopy = name === file ? 'dependency-revision-01/before-' + stem : null;
    const afterCopy = 'dependency-revision-01/after-' + stem;
    fs.mkdirSync(path.dirname(path.join(home, afterCopy)), { recursive: true });
    if (beforeCopy) fs.copyFileSync(prior, path.join(home, beforeCopy), fs.constants.COPYFILE_EXCL);
    fs.copyFileSync(path.join(ROOT, name), path.join(home, afterCopy), fs.constants.COPYFILE_EXCL);
    changes.push({ file: name, beforeHash: deps[name] || null, afterHash: await L.hash(path.join(ROOT, name)), beforeCopy, afterCopy,
      reason: 'Parent-authorized Replicant UI integration: arena membership follows version faction/collaboration, not shared twin characterId. Reviewed exact diff; 39 tests passed. No gameplay arithmetic or native template changed.', reviewedAt: new Date().toISOString() });
  }
  write(out, changes); return { recorded: changes.map(c => c.file), originalCapturePreserved: true };
}
module.exports = { record };
if (require.main === module) record().then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exitCode = 1; });
