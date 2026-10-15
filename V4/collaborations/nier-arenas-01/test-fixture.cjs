'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { createPublisher } = require('./publish.cjs');
const manifest = require('./manifest.json');
const references = require('../../atelier/data/references.json');
const ROOT = path.resolve(__dirname, '../../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const registry = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'V4/donnees/arenes-collaborations.json'), 'utf8')).filter(a => !a.id.startsWith('nier-'));
const entries = () => clone(manifest.arenas.map(a => a.entry));
function published(characterId, index = 0, element = 'NONE') {
  const id = String(49998000 + index);
  return { kind: 'created', id, png: 'V4/creations/' + id + '/card.png', pngUrl: '/media/created/' + id + '.png',
    profile: { ...references.cards[0].card, id, characterId, faction: 'NieR', element,
      positions: [1, 2, 3, 4, 5], role: 2, atk: [200, 180, 160, 140, 120, 100],
      defense: [150, 130, 110, 90, 70, 50], magic: [], barriers: [] } };
}
const homes = () => ['2b-nier', '9s-nier', 'anemone-nier', 'simone-nier'].map((id, i) => published(id, i));

// Redirect the supplemental registry only; test identities never reach the live catalogue.
function catalogWith(entriesProvider) {
  const source = path.join(ROOT, 'V4/atelier/game-catalog.cjs'), ownRequire = createRequire(source);
  const supplemental = path.join(ROOT, 'V4/donnees/arenes-collaborations.json'), module = { exports: {} };
  const readFile = async (file, ...args) => path.resolve(file) === supplemental ? JSON.stringify(entriesProvider()) : fs.promises.readFile(file, ...args);
  vm.runInThisContext('(function(require,module,__dirname){' + fs.readFileSync(source, 'utf8') + '\n})')(
    name => name === 'node:fs/promises' ? { readFile } : ownRequire(name), module, path.dirname(source));
  return module.exports.buildCatalog;
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kalistar-nier-arenas-'));
  t.after(() => {
    if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('kalistar-nier-arenas-')) throw Error('Unsafe fixture cleanup');
    fs.rmSync(root, { recursive: true, force: true });
  });
  const file = relative => path.join(root, relative);
  const write = (relative, bytes) => { fs.mkdirSync(path.dirname(file(relative)), { recursive: true }); fs.writeFileSync(file(relative), bytes); };
  const put = (relative, value) => write(relative, JSON.stringify(value, null, 2) + '\n');
  const read = relative => JSON.parse(fs.readFileSync(file(relative), 'utf8'));
  const home = 'V4/collaborations/nier-arenas-01/';
  const registryPath = 'V4/donnees/arenes-collaborations.json', catalogue = 'V4/donnees/catalogue.json';
  const review = { reviewed: true, assets: {} };
  put(home + 'manifest.json', manifest); put(registryPath, registry()); put(catalogue, { cards: homes() });
  fs.mkdirSync(file('V4/atelier/data'), { recursive: true });
  for (const a of manifest.arenas) {
    const bytes = Buffer.from('fixture-image-' + a.key);
    write(a.source, bytes); review.assets[a.key] = { sha256: sha(bytes) };
  }
  put(home + 'art-review.json', review);
  const buildCatalog = catalogWith(() => read(registryPath));
  const options = { root, buildCatalog, decodeImage: async () => ({ format: 'png', width: 1536, height: 1024 }) };
  return { root, file, write, read, put, home, registryPath, catalogue, options, buildCatalog,
    publisher: createPublisher(options), target: key => 'V4/site/assets/arenes/nier-' + key + '.png' };
}
module.exports = { ROOT, manifest, sha, registry, entries, published, homes, catalogWith, fixture };
