'use strict';
const path = require('node:path');
const { fixture, digest } = require('../ff8-set-01/test-fixture.cjs');
const D = require('../../atelier/designer-core.cjs'), M = require('./model.cjs'), set = require('./set.json');
const { buildCatalog } = require('../../atelier/game-catalog.cjs');
function publicationFixture() {
  const f = fixture([]), home = path.join(f.L.ROOT, 'V4/collaborations/nier-simone-03');
  const old = D.catalogue().cards.filter(c => c.kind === 'created' && c.id !== M.ID);
  f.put(f.D.CATALOGUE, { ...f.D.catalogue(), cards: [...f.D.catalogue().cards.filter(c => c.kind === 'approved'), ...old] });
  const lstat = f.mem.lstatSync;
  f.mem.lstatSync = file => ({ ...lstat(file), isDirectory: () => f.dirs.has(path.resolve(file)), isSymbolicLink: () => false });
  f.mem.readdirSync = dir => [...new Set([...f.files.keys(), ...f.dirs].filter(p => path.dirname(p) === path.resolve(dir)).map(p => path.basename(p)))];
  f.put(path.join(home, 'set.json'), set);
  for (const entry of old) {
    const dir = path.join(f.L.ROOT, 'V4/creations', entry.id);
    f.put(path.join(dir, 'profile.json'), entry.profile);
    f.put(path.join(dir, 'creation.json'), { job: entry.creationJob });
    f.put(path.join(dir, 'verification.json'), { passed: true });
    for (const name of ['card.png', 'card.psd', 'illustration.png']) f.seed(path.join(dir, name), 'MEMORY ONLY OLD ' + entry.id + '/' + name);
  }
  const dependencies = {};
  for (const file of Object.keys(require('./dependencies.json'))) {
    const absolute = path.join(f.L.ROOT, file);
    f.seed(absolute, 'MEMORY ONLY DEPENDENCY ' + file); dependencies[file] = digest(f.mem.readFileSync(absolute));
  }
  f.put(path.join(home, 'dependencies.json'), dependencies);
  const guard = require('./preservation.cjs').createGuard(f.L, f.D, home); guard.freeze();
  const source = () => path.join(home, 'cards/simone'), dir = source(), profile = M.profile(set.cards[0], D);
  f.put(path.join(dir, 'profile.json'), profile);
  f.put(path.join(dir, 'card.png'), { format: 'png', width: 897, height: 1497 });
  f.seed(path.join(dir, 'card.psd'), 'MEMORY ONLY SIMONE PSD');
  f.put(path.join(dir, 'illustration.png'), { format: 'png', width: 1474, height: 1842 });
  const input = path.join(home, 'art/simone.png'); f.put(input, { format: 'png', width: 1474, height: 1842 });
  f.put(path.join(dir, 'preparation.json'), { referenceId: f.L.baseline().id,
    existingSnapshotHash: guard.digest(guard.snapshotFile),
    snapshot: { 'V4/collaborations/nier-simone-03/dependencies.json': guard.digest(path.join(home, 'dependencies.json')) },
    inputs: Object.fromEntries([input, path.join(home, 'set.json'), path.join(dir, 'profile.json')].map(p => [guard.relative(p), guard.digest(p)])) });
  f.put(path.join(dir, 'verification.json'), { passed: true, modelId: M.ID, referenceId: f.L.baseline().id,
    profileHash: guard.digest(path.join(dir, 'profile.json')), preparationHash: guard.digest(path.join(dir, 'preparation.json')),
    hashes: Object.fromEntries(['card.png', 'card.psd'].map(n => [n, guard.digest(path.join(dir, n))])),
    components: { fixedDifferences: 0, severePixels: 0 }, roundtrip: { changed: 0 }, barcode: { passed: true, expected: M.ID } });
  const publisher = require('./publish.cjs').createPublisher({ L: f.L, D: f.D, home, buildCatalog });
  return { ...f, home, source, publisher, guard, old };
}
function builderFixture() {
  const f = publicationFixture();
  for (const name of ['references.json', 'regression.json']) f.put(path.join(f.L.DATA, name), name.startsWith('references') ? f.L.baseline() : { passed: true });
  f.L.protectedCheck = async () => {};
  f.L.sharp = input => {
    let data = Buffer.isBuffer(input) ? JSON.parse(input.toString()) : f.read(input);
    const chain = { metadata: async () => data, png: () => chain, composite: () => chain,
      resize(width, height) { data = { ...data, width, height }; return chain; },
      toBuffer: async () => f.encode(data), toFile: async file => f.mem.writeFileSync(file, f.encode(data)) };
    return chain;
  };
  const commands = [], R = {
    ART: { width: 737, height: 921 }, verifyAssets: async () => {},
    composite: async () => f.encode({ format: 'png', width: 897, height: 1497 }),
    command: async (...args) => { commands.push(args); throw Error('NO PHOTOSHOP IN UNIT TESTS'); },
    components: async () => ['ILLUSTRATION - cadrage', 'CADRE V4 - structure validee', 'FACTION - Chroma', 'POSITION SLOT 1']
      .map(name => ({ name, input: f.encode({ format: 'png', width: 897, height: 1497 }), left: 0, top: 0, width: 897, height: 1497 }))
  };
  const assets = { verify: async () => {}, inputs: () => [], banner: layers => layers };
  const builder = require('./build.cjs').createBuilder({ L: f.L, D: f.D, R, home: f.home, assets, typography: { preview: async () => [] },
    buildCatalog, verifyNative: async () => { throw Error('NO NATIVE PROOFS IN UNIT TESTS'); } });
  for (const file of builder.sources()) if (!f.mem.existsSync(file)) f.seed(file, 'MEMORY ONLY SOURCE ' + file);
  return { ...f, builder, commands };
}
module.exports = { publicationFixture, builderFixture };
