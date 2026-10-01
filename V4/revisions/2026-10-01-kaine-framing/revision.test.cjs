'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const W = require('./revise.cjs'), L = require('../../atelier/lib.cjs');
test('catalogue merge changes only Kaine and preserves concurrent additions', () => {
  const kaine = { id: W.ID, kind: 'created', profile: { atk: [294], crop: { zoom: 1.12 } } };
  const other = { id: 'other', nativeRevision: { id: 'concurrent-stat-revision' } };
  const current = { schemaVersion: 1, cards: [other, kaine, { id: 'new-concurrent-card' }] };
  const result = W.mergeCatalogue(current, structuredClone(kaine), { id: W.REV });
  assert.deepEqual(result.cards[0], other); assert.deepEqual(result.cards[2], current.cards[2]);
  assert.deepEqual(result.cards[1].profile, kaine.profile); assert.equal(result.cards[1].nativeRevision.id, W.REV);
  assert.equal(current.cards[1].nativeRevision, undefined);
  assert.throws(() => W.mergeCatalogue({ cards: [{ ...kaine, name: 'changed' }] }, kaine, {}));
  assert.throws(() => W.mergeCatalogue({ cards: [kaine, kaine] }, kaine, {}));
});
test('native runner holds and always releases the shared mutex', () => {
  const script = L.fs.readFileSync(L.path.join(__dirname, 'render.ps1'), 'utf8');
  assert.match(script, /Local\\KalistarV4AtelierRender/); assert.match(script, /finally/); assert.match(script, /ReleaseMutex/);
  assert.match(script, /26\.11\.7/);
});
test('native proof preserves full artwork and typography with exact canvas clip', async () => {
  if (!L.fs.existsSync(L.path.join(__dirname, 'verified.json'))) return;
  const { verification: v } = await W.integrity();
  assert(v.passed && v.profileBytesUnchanged && v.fullEmbeddedArtworkBytesUnchanged);
  assert.equal(v.unchangedOutsideArt.outside, 0); assert.equal(v.withoutArt.changed, 0);
  assert.equal(v.roundtrip.changed, 0); assert(v.barcode.passed && v.editableTextsAndStyleRunsUnchanged);
  assert.equal(v.framing.relativeZoom, 1.12); assert.deepEqual(v.framing.canvas, [737, 921]);
  assert.equal(Object.keys(v.barcode.cases).length, 4);
});
