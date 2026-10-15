'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { createEngine } = require('../../site/engine.js');
const { createPublisher } = require('./publish.cjs');
const F = require('./test-fixture.cjs');
const select = data => data.arenas.filter(a => a.id.startsWith('nier-'));
const beforeBuilder = F.catalogWith(F.registry);
const candidateBuilder = F.catalogWith(() => [...F.registry(), ...F.entries()]);

test('NieR arena entries remain gated by published character identities', async () => {
  for (const published of [[], [F.published('unrelated')], [F.published('2b')], [F.published('2b-nier-extra')]]) {
    const before = await beforeBuilder({ published }), after = await candidateBuilder({ published });
    assert.deepEqual(after, before);
  }
  for (const id of ['2b-nier', 'emil-nier']) {
    const data = await candidateBuilder({ published: [F.published(id)] });
    assert.equal(select(data).length, 2);
    assert.deepEqual(select(data).map(a => a.homeCharacters), [id === '2b-nier' ? [id] : [], []]);
  }
});

test('metadata is exact; existing arenas, cards, rules and decks are unchanged', async () => {
  const published = [...F.homes(), F.published('cloud-ff7', 8, 'ELECTRO'), F.published('squall-ff8', 9, 'AERO')];
  const before = await beforeBuilder({ published }), after = await candidateBuilder({ published });
  assert.deepEqual(select(after), F.entries().map(({ collaboration, ...arena }) => arena));
  assert.deepEqual(select(after).map(a => [a.id, a.element]), [['nier-city-ruins', 'HERBO'], ['nier-amusement-park', 'HEMATO']]);
  assert.deepEqual({ ...after, arenas: after.arenas.filter(a => !a.id.startsWith('nier-')) }, before);
});

test('home affinity follows characterId across versions, never the whole faction', async () => {
  const published = [F.published('2b-nier', 0, 'HERBO'), F.published('2b-nier', 1, 'NONE'),
    F.published('9s-nier', 2, 'ELECTRO'), F.published('anemone-nier', 3, 'GEO'),
    F.published('simone-nier', 4, 'HEMATO'), F.published('emil-nier', 5, 'HEMATO')];
  const data = await candidateBuilder({ published }), engine = createEngine(data);
  for (const arena of select(data)) for (const card of published) {
    const element = card.profile.element === arena.element ? 15 : 0;
    const home = arena.homeCharacters.includes(card.profile.characterId) ? 10 : 0;
    assert.deepEqual(engine.arenaBonuses({ arenaId: arena.id }, { cardId: card.id }),
      { attack: element + home, defense: home, element, homeAttack: home, homeDefense: home });
  }
});

test('both arenas work for both players and preserve old saved matches', async () => {
  const base = await beforeBuilder(), priorEngine = createEngine(base);
  const prior = priorEngine.newGame(base.decks.player, base.decks.enemy, { seed: 'BEFORE-NIER', deckCoverage: 2 });
  priorEngine.autoDeploy(prior, 0); priorEngine.autoDeploy(prior, 1); priorEngine.start(prior);
  const published = [F.published('2b-nier', 0, 'HERBO'), F.published('simone-nier', 1, 'HEMATO')];
  const data = await candidateBuilder({ published }), engine = createEngine(data);
  assert.deepEqual(engine.restoreGame(prior), prior);
  for (const [index, arena] of select(data).entries()) {
    const deck = [...base.decks.player]; deck[0] = published[index].id;
    const state = engine.newGame(deck, deck, { arenaId: arena.id, seed: arena.id, deckCoverage: 2 });
    for (const player of state.players) assert.deepEqual(engine.arenaBonuses(state, player.reserve.find(u => u.cardId === published[index].id)),
      { attack: 25, defense: 10, element: 15, homeAttack: 10, homeDefense: 10 });
    engine.autoDeploy(state, 0); engine.autoDeploy(state, 1); engine.start(state);
    engine.lock(state, ...engine.aiChoice(state)); engine.rollAttack(state);
    assert.deepEqual(engine.restoreGame(state), state);
    assert.throws(() => engine.setArena(state, arena.id), /verrouill/);
  }
});

test('preflight is read-only and publication commits both decors with immutable before/after proofs', async t => {
  const f = F.fixture(t), initial = fs.readFileSync(f.file(f.registryPath)), cards = fs.readFileSync(f.file(f.catalogue));
  const result = await f.publisher.preflight();
  assert.equal(result.mode, 'preflight'); assert.equal(result.assets.length, 2);
  assert.ok(!fs.existsSync(f.file(f.target('city-ruins'))));
  assert.ok(!fs.existsSync(f.file(f.home + 'publication')));
  const published = await f.publisher.publish();
  assert.equal(published.mode, 'published');
  assert.deepEqual(f.read(f.registryPath), [...JSON.parse(initial), ...F.entries()]);
  assert.deepEqual(fs.readFileSync(f.file(f.catalogue)), cards);
  const folder = f.home + 'publication/' + published.transaction + '/';
  assert.deepEqual(fs.readFileSync(f.file(folder + 'arenes.before.json')), initial);
  assert.equal(F.sha(fs.readFileSync(f.file(f.registryPath))), published.registryAfter);
  assert.equal(f.read(folder + 'published.json').mode, 'published');
  for (const asset of published.assets) assert.equal(F.sha(fs.readFileSync(f.file(asset.target))), asset.sha256);
  const repeated = await f.publisher.publish(); assert.equal(repeated.mode, 'unchanged');
  assert.equal(fs.readdirSync(f.file(f.home + 'publication')).length, 1);
  assert.ok(!fs.existsSync(f.file('V4/atelier/data/render.lock')));
});

test('missing home identities block publication without inventing a Simone model ID', async t => {
  const f = F.fixture(t);
  f.put(f.catalogue, { cards: F.homes().filter(c => c.profile.characterId !== 'simone-nier') });
  await assert.rejects(f.publisher.preflight(), /Affinite non publiee.*simone-nier/);
  assert.deepEqual(f.read(f.registryPath), F.registry());
});

test('missing, changed or portrait art and conflicting media cannot be published', async t => {
  for (const change of [
    f => fs.unlinkSync(f.file(F.manifest.arenas[0].source)),
    f => f.write(f.target('city-ruins'), 'different-existing-asset'),
    f => { f.options.decodeImage = async () => ({ format: 'png', width: 1024, height: 1536 }); },
    f => { f.options.decodeImage = async () => ({ format: 'jpeg', width: 1536, height: 1024 }); },
    f => { const m = f.read(f.home + 'manifest.json'); m.arenas[0].source = '../outside.png'; f.put(f.home + 'manifest.json', m); }
  ]) {
    const f = F.fixture(t); change(f);
    await assert.rejects(createPublisher(f.options).preflight());
    assert.deepEqual(f.read(f.registryPath), F.registry());
  }
});

test('visual review is hash-bound and never inferred from the technical preflight', async t => {
  for (const change of [
    f => fs.unlinkSync(f.file(f.home + 'art-review.json')),
    f => f.put(f.home + 'art-review.json', { reviewed: false }),
    f => f.put(f.home + 'art-review.json', { reviewed: true, assets: {} }),
    f => f.write(F.manifest.arenas[0].source, 'changed-after-review')
  ]) {
    const f = F.fixture(t); change(f);
    await f.publisher.preflight();
    await assert.rejects(f.publisher.publish());
    assert.deepEqual(f.read(f.registryPath), F.registry());
    assert.ok(!fs.existsSync(f.file(f.target('city-ruins'))));
    assert.ok(!fs.existsSync(f.file('V4/atelier/data/render.lock')));
  }
});

test('existing arena metadata cannot be replaced and occupied render locks stay intact', async t => {
  const f = F.fixture(t);
  f.put(f.registryPath, [...F.registry(), { ...F.entries()[0], subtitle: 'Different' }]);
  await assert.rejects(f.publisher.preflight(), /Arene existante differente/);
  f.put(f.registryPath, F.registry()); f.write('V4/atelier/data/render.lock', 'another-owner');
  await assert.rejects(f.publisher.preflight(), /occupe/);
  await assert.rejects(f.publisher.publish(), /EEXIST/);
  assert.equal(fs.readFileSync(f.file('V4/atelier/data/render.lock'), 'utf8'), 'another-owner');
});

test('a catalogue change during decoding stops before copying or committing', async t => {
  const f = F.fixture(t); let changed = false;
  f.options.decodeImage = async () => {
    if (!changed) { changed = true; f.put(f.catalogue, { cards: [...F.homes(), F.published('emil-nier', 10)] }); }
    return { format: 'png', width: 1536, height: 1024 };
  };
  await assert.rejects(createPublisher(f.options).publish(), /Source modifiee depuis le preflight/);
  assert.deepEqual(f.read(f.registryPath), F.registry());
  assert.ok(!fs.existsSync(f.file(f.target('city-ruins'))));
});

test('static deployment automatically includes both installed arena images and LFS paths', async () => {
  const source = path.join(F.ROOT, 'V4/deploy/build.cjs'), ownRequire = createRequire(source), module = { exports: {} };
  const arenaFolder = path.join(F.ROOT, 'V4/site/assets/arenes');
  const readdir = async (folder, options) => {
    const result = await fs.promises.readdir(folder, options);
    if (path.resolve(folder) !== arenaFolder) return result;
    return [...result.filter(d => !d.name.startsWith('nier-')), ...F.entries().map(a => ({ name: a.id + '.png', isSymbolicLink: () => false, isDirectory: () => false, isFile: () => true }))];
  };
  const readFile = async (file, ...args) => path.resolve(file) === path.join(F.ROOT, 'V4/donnees/catalogue.json') ? JSON.stringify({ cards: F.homes() }) : fs.promises.readFile(file, ...args);
  vm.runInThisContext('(function(require,module,__dirname){' + fs.readFileSync(source, 'utf8') + '\n})')(
    name => name === 'node:fs/promises' ? { ...fs.promises, readdir, readFile } : name === '../atelier/game-catalog.cjs' ? { buildCatalog: candidateBuilder } : ownRequire(name), module, path.dirname(source));
  const plan = await module.exports.plan();
  assert.equal(select(plan.catalogue).length, 2);
  for (const a of F.entries()) assert.ok(plan.files.some(f => f.source === 'V4/site/assets/arenes/' + a.id + '.png' && '/' + f.target === a.image));
  assert.ok(plan.files.every(f => !f.source.includes('/nier-arenas-01/')));
});
