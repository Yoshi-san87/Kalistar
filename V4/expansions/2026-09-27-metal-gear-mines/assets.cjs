'use strict';
const assert = require('node:assert/strict');
const GEOMETRY = { left: 672, top: 829, width: 98, height: 223 };
const FACTIONS = ['MGS1','MGS2','MGS4'];
function createAssets(L, home) {
  const file = name => L.path.join(home, 'art-flags', name);
  const inputs = () => ['factions.json', ...FACTIONS.flatMap(k => ['flag-' + k + '.png','flag-' + k + '-packed.png'])].map(file);
  async function verify() {
    const manifest = L.read(file('factions.json'));
    assert.deepEqual(manifest.factions.map(f => f.id), FACTIONS);
    const outline = L.path.join(L.ROOT, 'V4/collaborations/ff8-set-01/flag-FF8-packed.png');
    const alpha = f => L.sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
    const expectedAlpha = await alpha(outline);
    for (const key of FACTIONS) {
      const spec = manifest.factions.find(f => f.id === key);
      assert.deepEqual(spec.packedGeometry, GEOMETRY);
      const flag = file('flag-' + key + '-packed.png'), m = await L.sharp(flag).metadata();
      assert.equal(await L.hash(file('flag-' + key + '.png')), spec.flagHash, 'Empreinte du fanion incoherente : ' + key);
      assert.deepEqual([m.width,m.height,m.format], [98,223,'png']);
      assert.deepEqual(await alpha(flag), expectedAlpha, 'Empreinte du fanion modifiee : ' + key);
    }
  }
  function banner(layers, spec, draft = false) {
    if (!spec.collaboration) return layers;
    assert.ok(FACTIONS.includes(spec.faction));
    const flag = file('flag-' + spec.faction + '-packed.png');
    if (draft && !L.fs.existsSync(flag)) return layers;
    const i = layers.findIndex(l => l.name === 'FACTION - Chroma'); assert.ok(i >= 0);
    layers[i] = { ...GEOMETRY, name: 'FACTION - ' + spec.faction, input: flag }; return layers;
  }
  return { inputs, verify, banner };
}
module.exports = { createAssets, GEOMETRY, FACTIONS };
