'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs'), P = require('./revise.cjs');
const { fs, path, read } = L;
const source = path.resolve(__dirname, '../../collaborations/nier-set-02/cards/pascal');

test('publication scope is exactly Pascal artwork and its native proofs, never profile or catalogue', () => {
  const targets = P.targets(); assert.ok(targets.length >= 14); assert.equal(new Set(targets).size, targets.length);
  for (const f of targets) {
    assert.ok(f.startsWith(source + path.sep) || f.startsWith(path.resolve(__dirname, '../../creations/42650442') + path.sep));
    assert.ok(!['profile.json', 'preparation.json', 'composition.json', 'catalogue.json'].includes(path.basename(f)));
    assert.ok(!f.includes('nier-art-refinement'));
  }
});
test('layer audit preserves every native property including illustration geometry; only Photoshop IDs may differ', () => {
  const layers = read(path.join(source, 'render/native.json')).layers;
  const changedIds = layers.map(l => ({ ...l, id: 999 }));
  assert.deepEqual(P.unchangedLayers(layers), P.unchangedLayers(changedIds));
  for (const name of ['ILLUSTRATION - cadrage', 'NOM', 'TITLE']) {
    const altered = structuredClone(layers), l = altered.find(l => l.name === name); assert.ok(l);
    l.bounds[0]++;
    assert.notDeepEqual(P.unchangedLayers(layers), P.unchangedLayers(altered));
  }
  const altered = structuredClone(layers); altered.find(l => l.name === 'NOM').text = 'WRONG';
  assert.notDeepEqual(P.unchangedLayers(layers), P.unchangedLayers(altered));
});
test('native script replaces just one embedded object and does not recreate or flatten layers', () => {
  const jsx = fs.readFileSync(path.join(__dirname, 'replace.jsx'), 'utf8');
  assert.equal((jsx.match(/placedLayerReplaceContents/g) || []).length, 1);
  assert.match(jsx, /ILLUSTRATION - cadrage/); assert.match(jsx, /component-00\.png/);
  assert.doesNotMatch(jsx, /\b(?:var\s+|,\s*)native\s*=/);
  assert.doesNotMatch(jsx, /\.flatten\(|\.rasterize\(|\.textItem\s*=/);
});
test('current Pascal profiles and original prepared composition are byte-identical to published source contracts', () => {
  const published = path.resolve(__dirname, '../../creations/42650442');
  assert.ok(fs.readFileSync(path.join(source, 'profile.json')).equals(fs.readFileSync(path.join(published, 'profile.json'))));
  const layers = read(path.join(source, 'render/composition.json')).layers;
  assert.deepEqual(layers.find(l => l.name === 'ILLUSTRATION - cadrage'), {
    file: 'component-00.png', name: 'ILLUSTRATION - cadrage', left: 80, top: 156, width: 737, height: 921
  });
});
test('readiness check never renders or publishes', async () => {
  const result = await P.check(); assert.equal(result.modelId, '42650442');
  assert.equal(result.photoshopRun, false); assert.equal(result.profileAndCatalogueChanges, false);
});
