'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs');
const A = require('./audit.cjs');
const P = require('./proposal.cjs');

test('audit measures a white motif, not the opaque enamel rectangle', () => {
  const data = Buffer.alloc(100 * 100 * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = 11; data[i + 1] = 26; data[i + 2] = 35; data[i + 3] = 255; }
  for (let y = 40; y < 60; y++) for (let x = 35; x < 65; x++) data.fill(255, (y * 100 + x) * 4, (y * 100 + x) * 4 + 4);
  const result = A.measure(data, 100, 100);
  assert.deepEqual(result.bounds, [35, 40, 65, 60]); assert.equal(result.area, 600);
});
test('empty motifs fail instead of producing a guessed optical anchor', () => {
  assert.throws(() => A.measure(Buffer.alloc(20 * 20 * 4), 20, 20), /No visible motif/);
});
test('the 18 weapons outside the two concrete outliers are not rescaled', () => {
  assert.equal(P.UNCHANGED.length, 18);
  for (const name of P.UNCHANGED) assert.equal(P.proposalFor({ name, bounds: [1, 2, 3, 4], width: 2, height: 2 }, []).changed, false);
});
test('current proposal is an audit, never native approval or publication', () => {
  const proposal = L.read(L.path.join(__dirname, 'proposal.json'));
  assert.equal(proposal.status, 'awaiting-parent-GO'); assert.equal(proposal.productionModified, false); assert.equal(proposal.photoshopStarted, false);
  assert.equal(proposal.nativeInspectionRequired, true); assert.equal(proposal.preliminaryNumbersOnly, true);
  assert.equal(proposal.rows.length, 20); assert.equal(proposal.affectedWeapons, 2);
  const changed = proposal.rows.filter(r => r.proposed.changed);
  assert.equal(new Set(changed.flatMap(r => r.cards.map(c => c.id))).size, proposal.affectedCards);
  assert.equal(proposal.affectedCards, proposal.approvedCards + proposal.createdCards);
  assert.equal(proposal.affectedCards, 6);
  assert.deepEqual(proposal.overlapWithArtworkRevision, []);
  assert.deepEqual(changed.map(r => r.name).sort(), ['Faucille', 'Tome']);
  assert.ok(changed.every(r => r.proposed.finalFullAlphaRadiusLimit <= 44));
});
