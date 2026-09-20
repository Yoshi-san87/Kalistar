'use strict';
const L = require('../../atelier/lib.cjs');
const {assert, path, fs, ROOT, read, write, hash, crypto} = L;
const local = name => path.join(__dirname, name);
const source = name => path.join(ROOT, name);
async function main() {
  const before = read(local('references-before.json'));
  const published = read(local('published.json'));
  const current = L.baseline();
  const regression = read(source('V4/atelier/data/regression.json'));
  assert.equal(current.id, published.referenceId);
  assert.equal(current.cards.length, before.cards.length + 1);
  assert.deepEqual(current.cards.slice(0, before.cards.length), before.cards);
  let oldCardFiles = 0;
  for (const entry of before.cards) for (const field of ['psd', 'png', 'profile']) {
    assert.equal(await hash(source(entry[field])), before.protectedFiles[entry[field]]);
    oldCardFiles++;
  }
  await L.protectedCheck(current);
  const oldPack = read(local('pack-before.json'));
  const pack = read(source('V4/atelier/designer-assets/manifest.json'));
  assert.equal(pack.referenceId, current.id);
  for (const [file, expected] of Object.entries(oldPack.hashes)) {
    assert.equal(pack.hashes[file], expected);
    assert.equal(await hash(source('V4/atelier/designer-assets/' + file)), expected);
  }
  assert.equal(Object.keys(pack.hashes).length, Object.keys(oldPack.hashes).length + 2);
  assert.equal(regression.passed, true);
  assert.equal(regression.referenceId, current.id);
  assert.equal(regression.rendererHash, await L.rendererHash());
  assert.deepEqual(regression.results.map(r => r.key).sort(), current.cards.map(c => c.key).sort());
  for (const result of regression.results) {
    assert.equal(result.passed, true);
    assert.equal(result.comparison.changed, 0);
    assert.equal(result.roundtrip.changed, 0);
    assert.equal(result.barcode.passed, true);
  }
  const runtime = read(source('V4/atelier/data/runtime.json'));
  const get = async url => {
    const response = await fetch(runtime.url + url);
    assert.equal(response.status, 200, url);
    return response;
  };
  const status = await (await get('/api/status')).json();
  assert.equal(status.integrity.state, 'intact');
  assert.equal(status.gate.passed, true);
  assert.equal(status.gate.count, current.cards.length);
  const catalogue = await (await get('/api/game/catalogue')).json();
  const card = catalogue.cards.find(c => c.id === '30000028');
  const approved = current.cards.find(c => c.key === 'voloden');
  assert.equal(card.origin, 'approved');
  assert.equal(card.edition, 'V4');
  for (const field of ['name','title','race','weapon','element','faction','positions','atk','defense','magic','barriers']) {
    assert.deepEqual(card[field], approved.card[field], field);
  }
  assert.equal(card.role, 2);
  assert.equal(card.sentry, true);
  assert.equal(card.canGuard, false);
  assert.equal(card.canHeal, false);
  const png = Buffer.from(await (await get(card.pngUrl)).arrayBuffer());
  assert.equal(crypto.createHash('sha256').update(png).digest('hex'), await hash(source(approved.png)));
  const boot = await (await get('/api/designer/bootstrap')).json();
  assert.ok(boot.options.weapons.some(v => v.value === 'Faucille'));
  assert.ok(boot.options.races.some(v => v.value === 'CARDEMORTIS'));
  const gallery = fs.readFileSync(source('V4/galerie-elements.html'), 'utf8');
  assert.ok(gallery.includes('"output":"VOLODEN_V4_01_NECRO"'));
  const report = {
    passed: true, referenceId: current.id, canonicalId: card.id,
    approvedCards: current.cards.length, oldCardFilesUnchanged: oldCardFiles,
    oldPackComponentsUnchanged: Object.keys(oldPack.hashes).length,
    packComponents: Object.keys(pack.hashes).length,
    regression: {passed: true, count: regression.results.length, checkedAt: regression.checkedAt},
    liveCatalogue: {approvedCards: catalogue.cards.filter(c => c.origin === 'approved').length,
      voloden: {id: card.id, role: card.role, sentry: card.sentry, pngUrl: card.pngUrl}},
    liveImageHashMatches: true, newDesignerChoicesAvailable: true,
    unitTests: {passed: 54, failed: 0, source: 'Parent executed node --test, six Atelier suites'},
    checkedAt: new Date().toISOString()
  };
  write(local('complete.json'), report);
  console.log(report);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
