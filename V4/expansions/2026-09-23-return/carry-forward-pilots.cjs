'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
async function main() {
  const { fs, path, assert } = L, home = __dirname, old = path.join(home, 'attempts/03-before-native-glyph-validation');
  const guard = require('./preservation.cjs').createGuard(L, D, home), results = [];
  assert.deepEqual(L.read(path.join(old, 'set.json')), L.read(path.join(home, 'set.json')));
  assert.equal(await L.hash(path.join(old, 'compose.jsx')), await L.hash(path.join(home, 'compose.jsx')));
  for (const key of ['julienne', 'commander']) {
    const from = path.join(old, 'cards', key), to = path.join(home, 'cards', key); guard.preparation(key);
    const plan = L.read(path.join(to, 'render/composition.json'));
    const identical = ['profile.json', 'illustration.png', 'render/composition.json', 'render/expected-components.png',
      ...[...plan.layers, ...plan.hiddenLayers].map(l => 'render/' + l.file)];
    for (const name of identical) assert.equal(await L.hash(path.join(from, name)), await L.hash(path.join(to, name)), name);
    const proof = L.read(path.join(from, 'verification.json')); assert.equal(proof.passed, true);
    const hashes = {};
    for (const name of ['card.psd', 'card.png', 'render/native.json', 'render/reopened.png', 'render/without-text.png']) {
      const hash = await L.hash(path.join(from, name));
      if (name === 'card.png' || name === 'card.psd') assert.equal(hash, proof.hashes[name]);
      fs.copyFileSync(path.join(from, name), path.join(to, name), fs.constants.COPYFILE_EXCL); hashes[name] = hash;
    }
    results.push({ key, identicalInputs: identical, hashes, oldProofHash: await L.hash(path.join(from, 'verification.json')),
      newPreparationHash: await L.hash(path.join(to, 'preparation.json')), freshVerificationRequired: true });
  }
  L.write(path.join(home, 'evidence/pilots-carried-forward-attempt-04.json'), { checkedAt: new Date().toISOString(), results });
  console.log(JSON.stringify({ reused: results.map(r => r.key), freshVerificationRequired: true }));
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
