'use strict';
const assert = require('node:assert/strict');
const FLAG = Object.freeze({ left: 672, top: 829, width: 98, height: 223 });
function createAssets(L, D) {
  const { path, ROOT, read } = L, pilot = path.join(ROOT, 'V4/collaborations/nier-pilot-01');
  const bank = path.join(ROOT, 'V4/atelier/designer-assets'), flag = path.join(pilot, 'flag-NieR-packed.png');
  async function verify() {
    const faction = read(path.join(pilot, 'faction.json'));
    assert.deepEqual(faction.packedGeometry, FLAG); assert.equal(await L.hash(flag), faction.flagHash);
    const meta = await L.sharp(flag).metadata(); assert.deepEqual([meta.width, meta.height], [98, 223]);
    const extension = D.raceComponents(), approved = read(path.join(pilot, 'race-components.json')).races;
    for (const race of ['ANDROID', 'CYBORG']) {
      assert.ok(extension[race]); assert.equal(extension[race].sha256, approved[race].sha256);
      assert.equal(await L.hash(path.join(bank, extension[race].file)), approved[race].sha256);
    }
  }
  function inputs(set) {
    const manifest = read(path.join(bank, 'manifest.json')), extension = D.raceComponents();
    return [...new Set([flag, path.join(pilot, 'faction.json'), path.join(pilot, 'race-components.json'), path.join(bank, 'race-extensions.json'),
      ...set.cards.flatMap(c => [path.join(bank, (manifest.races[c.race] || extension[c.race]).file), path.join(bank, manifest.weapons[c.weapon].file)])])];
  }
  function banner(layers) {
    const index = layers.findIndex(l => l.name === 'FACTION - Chroma'); assert.ok(index >= 0);
    layers[index] = { ...FLAG, input: flag, name: 'FACTION - NieR' };
    return layers;
  }
  return { verify, inputs, banner, flag };
}
module.exports = { FLAG, createAssets };
