'use strict';
const L = require('../../atelier/lib.cjs');
const { fs, path, read, write, hash, assert, ROOT } = L;
const batch = path.join(ROOT, 'V4/expansions/2026-10-02-witcher-completion');
const revision = path.join(ROOT, 'V4/revisions/2026-10-02-sanji-legs');
async function main() {
  await L.protectedCheck();
  const snapshot = read(path.join(batch, 'existing-created.snapshot.json'));
  const catalogue = read(path.join(ROOT, 'V4/donnees/catalogue.json'));
  let preserved = 0;
  for (const [f, expected] of Object.entries(snapshot.files)) {
    if (f.startsWith('V4/creations/49800301/')) continue;
    assert.equal(await hash(path.join(ROOT, f)), expected, 'Unrelated creation changed: ' + f);
    preserved++;
  }
  for (const old of snapshot.entries) {
    const current = catalogue.cards.find(c => c.id === old.id);
    assert(current);
    if (old.id === '49800301') {
      const { nativeRevision: revised, ...currentRest } = current;
      const { nativeRevision: previous, ...oldRest } = old;
      assert.deepEqual(currentRest, oldRest);
      assert.equal(revised.id, '2026-10-02-sanji-legs');
      assert.equal(revised.artworkSource, 'V4/Illustrations/OP_sanji_black_02.png');
    } else assert.deepEqual(current, old);
  }
  const sanjiOriginal = read(path.join(revision, 'originals/V4/creations/49800301/profile.json'));
  assert.deepEqual(read(path.join(ROOT, 'V4/creations/49800301/profile.json')), sanjiOriginal);
  const proof = read(path.join(revision, 'work/sanji/verification.json'));
  assert(proof.passed && proof.scope.outside.outside === 0);
  for (const id of ['49800301', '49900106']) {
    const folder = path.join(ROOT, 'V4/creations', id), meta = read(path.join(folder, 'creation.json'));
    for (const [name, expected] of Object.entries(meta.hashes)) assert.equal(await hash(path.join(folder, name)), expected);
    const entry = catalogue.cards.find(c => c.id === id);
    assert.deepEqual(entry.profile, read(path.join(folder, 'profile.json')));
  }
  const G = require('../../atelier/game-catalog.cjs');
  const game = await G.buildCatalog({ published: catalogue.cards.filter(c => c.kind === 'created') });
  assert.equal(game.cards.length, 190);
  assert.equal(game.arenas.length, 28);
  assert(!game.cards.some(c => ['49900101', '49900102'].includes(c.id)));
  require('../../expansions/2026-10-02-witcher-completion/model.cjs')
    .validateGame(game, read(path.join(batch, 'set.json')), require('../../site/engine.js').createEngine);
  const result = { passed: true, cards: 190, arenas: 28, preservedFiles: preserved,
    protectedSourcesUnchanged: true, sanjiGameplayUnchanged: true,
    sanjiOutsideArtChanged: 0, geraltPending: ['49900101', '49900102'] };
  write(path.join(__dirname, 'audit.json'), result);
  return result;
}
if (require.main === module) main().then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { main };
