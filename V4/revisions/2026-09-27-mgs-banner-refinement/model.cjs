'use strict';
const assert = require('node:assert/strict');
const REVISION = '2026-09-27-mgs-banner-refinement';
const ART = 'ILLUSTRATION - cadrage';
const MGS = 'V4/expansions/2026-09-27-metal-gear-mines/cards/';
const cards = [
  ['solid-snake-mgs1', '45297565', 'MGS1'],
  ['solid-snake-mgs2', '48683979', 'MGS2'],
  ['solid-snake-mgs4', '46676157', 'MGS4'],
  ['revolver-ocelot', '48312725', 'MGS1'],
  ['sniper-wolf', '47200643', 'MGS1'],
  ['vulcan-raven', '40651224', 'MGS1'],
  ['ninja', '47702575', 'MGS1'],
  ['meryl', '45960834', 'MGS1'],
  ['liquid-snake', '41396996', 'MGS1'],
  ['psycho-mantis', '44001617', 'MGS1']
].map(([key, id, faction]) => ({ key, id, faction, evidence: MGS + key }));
Object.assign(cards.find(c => c.key === 'liquid-snake'), {
  art: 'Liquid_Snake_MGS1.png', crop: { zoom: 1.1, x: 1, y: 1 }
});
cards.push({ key: 'kaylis', id: '49055457',
  evidence: 'V4/revisions/2026-09-27-artwork-refresh/work/kaylis',
  art: 'Kaylis_Lelan_Des_Couleurs.png', crop: { zoom: 1.1, x: -1, y: 0.3 } });
const specs = () => structuredClone(cards);
const names = c => [...(c.crop ? [ART] : []), ...(c.faction ? ['FACTION - ' + c.faction] : [])];
const windows = c => c.crop ? [[80, 156, 817, 1077]] : [[672, 829, 770, 1052]];
function profile(before, c) {
  assert.equal(before.id, c.id);
  const after = structuredClone(before);
  if (c.crop) after.crop = structuredClone(c.crop);
  return after;
}
function profileGuard(before, after, c) {
  assert.deepEqual(after, profile(before, c), 'Only the approved crop metadata may change.');
}
module.exports = { REVISION, ART, specs, names, windows, profile, profileGuard };
