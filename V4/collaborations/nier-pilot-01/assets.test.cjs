'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs'), A = require('./assets.cjs');
const file = n => L.path.join(__dirname, n);
test('65/35 optical anchor ignores invisible fringe for centering but contains every alpha pixel', () => {
  const data = Buffer.alloc(80 * 80 * 4);
  for (let y = 20; y < 60; y++) for (let x = 25; x < 65; x++) { const i = (y * 80 + x) * 4; data.fill(220, i, i + 3); data[i + 3] = 255; }
  data[3] = 1;
  const m = A.opticalMetrics({ data, info: { width: 80, height: 80, channels: 4 } }, [45, 40]);
  assert.deepEqual(m.visibleBounds, [25, 20, 65, 60]); assert.deepEqual(m.fullBounds, [0, 0, 65, 60]);
  assert.ok(Math.abs(m.optical[0] - 45) < 1e-8 && Math.abs(m.optical[1] - 40) < 1e-8);
  assert.ok(m.fullAlphaRadius > 60, 'The faint pixel must remain in the contour test.');
});
test('generated Android, Cyborg and Katana measure within optical and contour tolerances', async () => {
  const races = L.read(file('race-components.json')).races, katana = L.read(file('weapon-katana.json'));
  for (const [name, spec] of [...Object.entries(races), ['Katana', katana]]) {
    const motif = L.path.join(L.ROOT, spec.motif), metrics = A.opticalMetrics(await L.sharp(motif).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
    assert.deepEqual(metrics, spec.metrics, name); assert.ok(metrics.opticalError <= .75, name); assert.ok(metrics.fullAlphaRadius <= 39, name);
    const midpoint = [(metrics.visibleBounds[0] + metrics.visibleBounds[2]) / 2, (metrics.visibleBounds[1] + metrics.visibleBounds[3]) / 2];
    assert.deepEqual(metrics.optical, midpoint.map((v, i) => .35 * v + .65 * metrics.centroid[i]));
    assert.equal(await L.hash(motif), spec.motifHash); assert.equal(await L.hash(L.path.join(L.ROOT, spec.source)), spec.sourceHash);
    const packed = file('components/' + (name === 'Katana' ? 'weapon-' : 'race-') + name + '.png');
    assert.equal(await L.hash(packed), spec.sha256);
    const email = await L.sharp(L.path.join(L.ROOT, spec.nativeEmail)).extract({ left: 89, top: 1116, width: 96, height: 95 }).ensureAlpha().raw().toBuffer();
    const icon = await L.sharp(motif).ensureAlpha().raw().toBuffer(), actual = await L.sharp(packed).ensureAlpha().raw().toBuffer();
    for (let i = 0; i < actual.length; i += 4) if (!icon[i + 3]) assert.deepEqual(actual.subarray(i, i + 4), email.subarray(i, i + 4));
  }
  assert.deepEqual([katana.left, katana.top, ...katana.opticalTarget], [89, 1116, 137, 1163.5]);
  assert.ok(races.ANDROID.sourceMetrics.visibleBounds[0] > races.ANDROID.sourceMetrics.fullBounds[0]);
});
test('NieR uses the exact approved packed pennant alpha footprint', async () => {
  const a = await L.sharp(file('flag-NieR-packed.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await L.sharp(L.path.join(__dirname, '../ff8-set-01/flag-FF8-packed.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual(a.info, b.info);
  for (let i = 3; i < a.data.length; i += 4) assert.equal(a.data[i], b.data[i]);
});
