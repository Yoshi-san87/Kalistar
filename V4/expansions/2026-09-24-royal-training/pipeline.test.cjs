'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const M = require('./model.cjs'), G = require('./geometry.cjs'), B = require('./build.cjs'), V = require('./revisions.cjs');
const input = require('./profiles-a.json'), a = input.map(M.normalize);
const byKey = key => structuredClone(a.find(c => c.key === key));
test('four agent A profiles validate and IDs are stable', () => {
  assert.deepEqual(a.map(c => c.id), ['49055457', '42746644', '46167301', '48428173']);
  a.forEach(c => assert.deepEqual(M.normalize(c), c));
});
test('Aelis is a V4 support with no legacy exception', () => {
  const c = byKey('aelis-veille'); assert.equal(c.role, 5); assert.deepEqual(c.positions, [3, 5]);
  assert.ok(c.atk.includes('revive')); c.atk[0] = 999; assert.throws(() => M.validateCard(c), /plafond/);
});
test('Reraise cannot use P3 principal role', () => {
  const c = byKey('aelis-veille'); c.role = 3; assert.throws(() => M.validateCard(c));
});
test('guard needs principal P1 or P5', () => {
  const c = byKey('baptiste'); c.atk[5] = 'guard'; assert.throws(() => M.validateCard(c));
});
test('effects cannot carry magic/barrier numeric modes', () => {
  const c = byKey('baptiste'); c.magic.push(1); assert.throws(() => M.validateCard(c));
});
test('crop bounds and finiteness are strict', () => {
  for (const crop of [{ zoom: .99, x: 0, y: 0 }, { zoom: 1, x: 2, y: 0 }, { zoom: NaN, x: 0, y: 0 }, { zoom: 1, x: 0, y: 0, extra: true }])
    assert.throws(() => M.validateCrop(crop));
});
test('art is confined; only exact batch prefix is accepted', () => {
  const c = byKey('baptiste'); c.art = 'V4/expansions/' + M.SET + '/art-a/baptiste.png'; assert.equal(M.normalize(c).art, 'art-a/baptiste.png');
  for (const art of ['../art-a/baptiste.png', 'art-a/../baptiste.png', 'C:/image.png', 'V3/assets/a.png']) assert.throws(() => M.normalize({ ...c, art }));
});
test('unknown fields, manual IDs and unsorted positions fail', () => {
  assert.throws(() => M.normalize({ ...input[0], typo: 1 })); assert.throws(() => M.normalize({ ...input[0], id: '40000000' }));
  assert.throws(() => M.normalize({ ...input[0], positions: [3, 2, 1] }));
});
function fixtureSet() {
  const b = ['AURELION', 'CARNIVERT', 'CERELF', 'FELINEUS', 'KORBOW'].map((race, i) => {
    const c = byKey('baptiste'); delete c.id; return M.normalize({ ...c, key: 'new-' + i, characterId: 'new-' + i, race, art: 'art-b/new-' + i + '.png' });
  });
  return { schemaVersion: 1, id: M.SET, cards: [...a, ...b], arenas: [] };
}
test('nine-card set validates independently of live catalogue', () => { M.validateSet(fixtureSet(), []); });
test('published ID collisions are never filtered away', () => {
  const s = fixtureSet(); assert.throws(() => M.validateSet(s, [s.cards[0].id]), /deja publie/);
});
test('duplicate cards are rejected', () => {
  const s = fixtureSet(); s.cards[1] = structuredClone(s.cards[0]); assert.throws(() => M.validateSet(s));
});
test('crop always remains in original image', () => {
  for (const [w, h] of [[1122, 1402], [1024, 1536], [1, 1], [8000, 3]]) for (const zoom of [1, 1.12, 3]) for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) {
    const r = G.cropRect(w, h, { zoom, x, y }); assert.ok(r.left >= 0 && r.top >= 0 && r.left + r.width <= w && r.top + r.height <= h);
  }
});
test('Solaria alpha edit preserves RGB and every row above cut', () => {
  const before = Buffer.from(Array.from({ length: 4 * 4 * 4 }, (_, i) => i + 1));
  const { data, changed } = G.clearAlphaBelow(before, { channels: 4, width: 4, height: 4 }, 2);
  assert.equal(changed, 8); assert.ok(data.subarray(0, 32).equals(before.subarray(0, 32)));
  for (let i = 0; i < data.length; i++) if (i % 4 !== 3) assert.equal(data[i], before[i]);
});
test('gameplay projection excludes only visual revision metadata', () => {
  const c = byKey('baptiste'); assert.deepEqual(M.gameplay(c), M.gameplay({ ...c, crop: { zoom: 1.12, x: 0, y: 0 } }));
  assert.notDeepEqual(M.gameplay(c), M.gameplay({ ...c, atk: [0, ...c.atk.slice(1)] }));
});
test('unchanged native layers are exact; only target bounds may move', () => {
  const before = [{ id: 1, name: 'ART', path: 'GROUP/ART', bounds: [1, 2, 3, 4], opacity: 100 }, { id: 2, name: 'NOM', path: 'NOM', text: 'TEST', font: 'A' }];
  const after = structuredClone(before); after[0].bounds = [0, 0, 4, 4]; V.invariantLayers(before, after, ['ART']);
  after[1].font = 'B'; assert.throws(() => V.invariantLayers(before, after, ['ART']));
});
test('missing/duplicate editable targets fail', () => {
  assert.throws(() => V.invariantLayers([], [], ['ART']));
});
test('native methods fail before invoking Photoshop without explicit go', async () => {
  await assert.rejects(B.render('baptiste'), /Feu vert/); await assert.rejects(V.render('ruby'), /Feu vert/);
});
test('tests and publication code are not render dependencies', () => {
  for (const file of [...B.CODE, ...V.CODE]) assert.ok(!/test|publish|transaction|audit/.test(file));
});
