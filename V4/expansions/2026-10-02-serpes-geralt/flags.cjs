'use strict';
const L = require('../../atelier/lib.cjs');
const witcher = require('../2026-10-01-one-piece-witcher/flags.cjs');
function inputs(c) {
  if (c.faction === 'WITCHER') return witcher.inputs(c);
  L.assert.equal(c.faction, 'Arborium');
  return ['manifest.json','packed/banks/faction-Arborium.png','race-extensions.json','extensions/race-SERPES.png']
    .map(f => L.path.join(L.ROOT,'V4/atelier/designer-assets',f));
}
async function replace(layers,c) {
  if (c.faction === 'WITCHER') return witcher.replace(layers,c);
  L.assert.equal(c.faction,'Arborium');
  L.assert.equal(layers.filter(l => l.name === 'FACTION - Arborium').length,1);
  return layers;
}
module.exports = { inputs, replace };
