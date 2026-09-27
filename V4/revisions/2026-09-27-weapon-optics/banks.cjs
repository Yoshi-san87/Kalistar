'use strict';
const L = require('../../atelier/lib.cjs'), W = require('./revise.cjs');
const { fs, path, ROOT, read, write, sharp, assert, hash } = L;
async function banks() {
  const baseline = read(W.file('before.json')); await W.guard(baseline);
  const proof = read(W.file('pilot-verification.json'));
  assert.equal(proof.phase, 'pilot-awaiting-parent-visual-review');
  const final = read(path.join(ROOT, 'V4/atelier/designer-assets/manifest.json'));
  const raw = read(path.join(ROOT, 'V4/atelier/designer-assets/manifest.raw.json'));
  const report = { revision: baseline.revision, banks: {}, onlyWeapons: ['Faucille', 'Tome'] };
  fs.mkdirSync(W.file('staged/banks'), { recursive: true });
  for (const [name, key] of [['Faucille', 'voloden'], ['Tome', 'iliane']]) {
    const source = W.file('staged/' + key + '/bank.png');
    const result = proof.results.find(r => r.key === key);
    assert.equal(result.comparison.outside, 0); assert.equal(result.roundtrip.changed, 0);
    assert.equal(await hash(W.file('staged/' + key + '/card.png')), result.pngHash);
    const outputs = {};
    for (const [type, spec] of [['packed', final.weapons[name]], ['raw', raw.weapons[name]]]) {
      const output = W.file('staged/banks/weapon-' + name + '-' + type + '.png');
      await sharp(source).extract({ left: spec.left, top: spec.top, width: spec.width, height: spec.height }).png().toFile(output);
      outputs[type] = { from: W.rel(output), to: 'V4/atelier/designer-assets/' + spec.file, beforeHash: await hash(path.join(ROOT, 'V4/atelier/designer-assets', spec.file)), afterHash: await hash(output), geometry: { left: spec.left, top: spec.top, width: spec.width, height: spec.height } };
    }
    report.banks[name] = { key, source: W.rel(source), sourceHash: await hash(source), outputs };
  }
  write(W.file('banks.json'), report); console.log(report);
}
if (require.main === module) banks().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { banks };
