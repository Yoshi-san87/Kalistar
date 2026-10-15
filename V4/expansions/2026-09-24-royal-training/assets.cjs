'use strict';
const L = require('../../atelier/lib.cjs'), G = require('./preservation.cjs');
const { BANK } = require('./scope.cjs');
const { fs, path, assert, sharp } = L;
const SOLARIA = Object.freeze({ left: 667, top: 829, width: 109, height: 168 });
const manifest = () => L.read(path.join(L.ROOT, BANK, 'manifest.json'));
async function prepareSolaria() {
  const audit = L.read(G.local('audit/solaria.json')), record = audit.results.find(r => r.name === 'packed');
  assert.equal(record.sourceHash, await L.hash(L.inside(L.ROOT, record.file)));
  assert.equal(record.output.sha256, await L.hash(L.inside(L.ROOT, record.output.file)));
  assert.deepEqual([record.width, record.height, record.cutoff], [109, 203, 168]);
  const output = G.local('components/faction-Solaria.png');
  assert.ok(!fs.existsSync(output), 'Composant deja prepare.'); fs.mkdirSync(path.dirname(output), { recursive: true });
  await sharp(L.inside(L.ROOT, record.output.file)).extract({ left: 0, top: 0, width: 109, height: 168 }).png().toFile(output);
  G.exclusive(G.local('components/solaria.json'), { geometry: SOLARIA, file: G.relative(output), sha256: await L.hash(output),
    auditFile: G.relative(G.local('audit/solaria.json')), auditHash: await L.hash(G.local('audit/solaria.json')),
    reason: 'Retrait de la zone transparente basse uniquement, aucune mise a echelle du tissu.', nativePending: true });
}
function inputs(card) {
  const m = manifest(), sources = [path.join(L.ROOT, BANK, 'manifest.json')];
  const race = m.races[card.race] || require('../../atelier/designer-core.cjs').raceComponents()[card.race];
  assert.ok(race, 'Race non calibree : ' + card.race);
  const specs = [race, m.weapons[card.weapon], m.factions[card.faction], m.elements[card.element].branch, m.elements[card.element].crystal];
  for (const spec of specs) { assert.ok(spec?.file, 'Composant manquant.'); sources.push(path.join(L.ROOT, BANK, spec.file)); }
  if (card.faction === 'Solaria') sources.push(G.local('components/faction-Solaria.png'), G.local('components/solaria.json'));
  return sources;
}
async function verify(card) {
  inputs(card).forEach(f => assert.ok(fs.existsSync(f), 'Asset absent : ' + f));
  if (card.faction === 'Solaria') {
    const proof = L.read(G.local('components/solaria.json'));
    assert.deepEqual(proof.geometry, SOLARIA); assert.equal(proof.sha256, await L.hash(G.local('components/faction-Solaria.png')));
    assert.equal(proof.auditHash, await L.hash(L.inside(L.ROOT, proof.auditFile)));
    const meta = await sharp(G.local('components/faction-Solaria.png')).metadata(); assert.deepEqual([meta.width, meta.height], [109, 168]);
  }
}
function apply(layers, card) {
  const m = manifest();
  const weapon = layers.findIndex(l => l.name.startsWith('ARME - ')); assert.ok(weapon >= 0);
  layers[weapon] = { ...m.weapons[card.weapon], input: path.join(L.ROOT, BANK, m.weapons[card.weapon].file), name: 'ARME - ' + card.weapon };
  if (card.faction === 'Solaria') {
    const index = layers.findIndex(l => l.name === 'FACTION - Solaria'); assert.ok(index >= 0);
    layers[index] = { ...SOLARIA, input: G.local('components/faction-Solaria.png'), name: 'FACTION - Solaria' };
  }
  return layers;
}
module.exports = { SOLARIA, manifest, inputs, verify, apply, prepareSolaria };
if (require.main === module) {
  assert.deepEqual(process.argv.slice(2), ['prepare-solaria']);
  prepareSolaria().then(() => console.log({ prepared: 'Solaria', nativePending: true })).catch(e => { console.error(e); process.exitCode = 1; });
}
