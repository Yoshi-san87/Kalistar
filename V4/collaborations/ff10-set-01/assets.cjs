'use strict';
const assert = require('node:assert/strict');
const GEOMETRY = { left: 672, top: 829, width: 98, height: 223 };
function createAssets(L, home) {
  const file = name => L.path.join(home, name);
  const inputs = () => ['flag-FF10-packed.png', 'faction.json'].map(file);
  async function verify() {
    assert.deepEqual(L.read(file('faction.json')).packedGeometry, GEOMETRY);
    const m = await L.sharp(file('flag-FF10-packed.png')).metadata();
    assert.deepEqual([m.width,m.height,m.format], [98,223,'png']);
    const outline = L.path.join(L.ROOT, 'V4/collaborations/ff8-set-01/flag-FF8-packed.png');
    const alpha = f => L.sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
    assert.deepEqual(await alpha(file('flag-FF10-packed.png')), await alpha(outline), 'Empreinte du fanion modifiee.');
  }
  function banner(layers) {
    const i = layers.findIndex(l => l.name === 'FACTION - Chroma'); assert.ok(i >= 0);
    layers[i] = { ...GEOMETRY, name: 'FACTION - FF10', input: file('flag-FF10-packed.png') }; return layers;
  }
  return { inputs, verify, banner };
}
module.exports = { createAssets, GEOMETRY };
