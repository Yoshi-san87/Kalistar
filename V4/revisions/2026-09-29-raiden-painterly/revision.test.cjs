'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs'), P = require('./revise.cjs');
test('only Raiden artwork and revision metadata are mutable', () => {
  assert.deepEqual(P.specs().map(c => c.id), ['49382016']);
  assert.equal(P.targets().length, 6);
  assert.ok(P.targets().every(f => !f.endsWith('profile.json')));
});
test('explicit native and publication gates', async () => {
  await assert.rejects(P.prepare(), /GO natif/); await assert.rejects(P.render(), /GO natif/);
  await assert.rejects(P.publish(), /GO publication/);
});
test('only Raiden revision metadata changes in catalogue', () => {
  const old = L.read(L.path.join(L.ROOT, 'V4/donnees/catalogue.json'));
  const next = P.revisedCatalogue(old, { '49382016': { id: 'test' } });
  assert.equal(next.cards.length, old.cards.length);
  next.cards.forEach((c,i) => assert.deepEqual(c, c.id === '49382016' ? { ...old.cards[i], nativeRevision: { id:'test' } } : old.cards[i]));
  assert.throws(() => P.revisedCatalogue(old, {}));
});
test('layer audit catches geometry and text changes', () => {
  const layers = L.read(L.path.join(L.ROOT, 'V4/expansions/2026-09-28-raiden/cards/raiden/render/native.json')).layers;
  assert.deepEqual(P.unchangedLayers(layers), P.unchangedLayers(layers.map(l => ({ ...l,id:1 }))));
  const changed = structuredClone(layers); changed.find(l => l.name === 'NOM').text = 'Wrong';
  assert.notDeepEqual(P.unchangedLayers(layers), P.unchangedLayers(changed));
});
test('one embedded artwork replacement, no flattening or text changes', () => {
  const code = L.fs.readFileSync(L.path.join(__dirname,'replace.jsx'),'utf8');
  assert.equal((code.match(/placedLayerReplaceContents/g) || []).length, 1);
  assert.doesNotMatch(code, /\.(?:flatten|rasterize|resize|translate)\(|\.textItem\s*=|\.contents\s*=|KT\.apply\(/);
});
