'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
async function main() {
  const { fs, path, assert } = L, home = __dirname, old = path.join(home, 'attempts/02-before-description-leading'), now = path.join(home, 'cards/julienne');
  const source = path.join(old, 'cards/julienne'), guard = require('./preservation.cjs').createGuard(L, D, home);
  guard.preparation('julienne');
  const before = L.read(path.join(old, 'set.json')), after = L.read(path.join(home, 'set.json')), changed = [];
  for (let i = 0; i < before.cards.length; i++) {
    const a = { ...before.cards[i] }, b = { ...after.cards[i] };
    if (a.description !== b.description) changed.push(a.key);
    delete a.description; delete b.description; assert.deepEqual(a, b, 'Modification non narrative.');
  }
  assert.deepEqual(changed.sort(), ['commander', 'kaine', 'popola-replicant']);
  const oldPrep = L.read(path.join(source, 'preparation.json'));
  for (const code of require('./build.cjs').CODE) assert.equal(await L.hash(path.join(home, code)), oldPrep.inputs[path.relative(L.ROOT, path.join(home, code)).replace(/\\/g, '/')]);
  const plan = L.read(path.join(now, 'render/composition.json'));
  const identical = ['profile.json', 'illustration.png', 'render/composition.json', 'render/expected-components.png',
    ...[...plan.layers, ...plan.hiddenLayers].map(l => 'render/' + l.file)];
  for (const name of identical) assert.equal(await L.hash(path.join(now, name)), await L.hash(path.join(source, name)), name);
  const proof = L.read(path.join(source, 'verification.json')); assert.equal(proof.passed, true);
  const copied = {};
  for (const name of ['card.psd', 'card.png', 'render/native.json', 'render/reopened.png', 'render/without-text.png']) {
    const hash = await L.hash(path.join(source, name));
    if (name === 'card.psd' || name === 'card.png') assert.equal(hash, proof.hashes[name]);
    fs.copyFileSync(path.join(source, name), path.join(now, name), fs.constants.COPYFILE_EXCL); copied[name] = hash;
  }
  const result = { reusedAt: new Date().toISOString(), key: 'julienne', from: 'attempts/02-before-description-leading/cards/julienne',
    identicalInputs: identical, hashes: copied, previousVerificationHash: await L.hash(path.join(source, 'verification.json')),
    preparationHash: await L.hash(path.join(now, 'preparation.json')), freshVerificationRequired: true };
  L.write(path.join(home, 'evidence/julienne-carried-forward-attempt-03.json'), result);
  console.log(JSON.stringify({ reusedNative: 'julienne', identicalInputs: identical.length, freshVerificationRequired: true }));
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
