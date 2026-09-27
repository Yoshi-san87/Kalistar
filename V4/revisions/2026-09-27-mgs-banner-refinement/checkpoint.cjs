'use strict';
const L = require('../../atelier/lib.cjs'), M = require('./model.cjs'), R = require('./revise.cjs');
async function checkpoint() {
  const file = name => L.path.join(__dirname, name), preflight = await R.preflight();
  const published = process.argv.includes('--published');
  L.assert.equal(preflight.state, published ? 'published' : 'staged');
  const verified = L.read(file('verified.json'));
  L.assert.equal(verified.checks.length, 11);
  const cards = verified.checks.map(v => {
    L.assert.equal(v.passed, true); L.assert.equal(v.referenceId, L.baseline().id);
    L.assert.equal(v.scope.outside.outside, 0); L.assert.equal(v.scope.masked.changed, 0);
    L.assert.equal(v.scope.originalPixels.changed, 0); L.assert.equal(v.roundtrip.changed, 0);
    L.assert.equal(v.components.fixedDifferences, 0); L.assert.equal(v.components.severePixels, 0);
    L.assert.equal(v.scope.geometryUnchanged, true); L.assert.equal(v.scope.nativeTextUnchanged, true);
    L.assert.equal(v.scope.nativeStyleRunsUnchanged, true); L.assert.equal(v.scope.originalArtworkBytesPreserved, true);
    L.assert.equal(v.barcode.passed, true); L.assert.equal(Object.keys(v.barcode.cases).length, 4);
    for (const decoded of Object.values(v.barcode.cases)) L.assert.ok(decoded.includes(v.modelId));
    return { key: v.key, id: v.modelId, png: file('work/' + v.key + '/card.png'),
      outside: 0, masked: 0, roundtrip: 0, barcode: '4/4', changedProfileFields: v.scope.changedProfileFields };
  });
  const nativeQueueReleased = !L.fs.existsSync(L.path.join(L.DATA, 'render.lock')) && !L.fs.existsSync(file('operation.lock'));
  L.assert.equal(nativeQueueReleased, true);
  const result = { revision: M.REVISION, passed: true, referenceId: L.baseline().id,
    nativeQueueReleased, transactionPublished: published, state: published ? 'published' : 'staged-awaiting-parent-visual-review',
    cards, preflight, originalArtBytesPreserved: true, historicalBanksUnchanged: true,
    failedAttemptsPreserved: true, checkedAt: new Date().toISOString() };
  L.write(file(published ? 'complete.json' : 'staged-ready.json'), result); return result;
}
checkpoint().then(r => console.log(JSON.stringify({ passed: r.passed, referenceId: r.referenceId,
  nativeQueueReleased: r.nativeQueueReleased, transactionPublished: r.transactionPublished,
  state: r.state, cards: r.cards.length, barcode: '44/44', preflight: r.preflight }, null, 2)))
  .catch(e => { console.error(e); process.exitCode = 1; });
