'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildCatalog } = require('./game-catalog.cjs');
const { createEngine } = require('../site/engine.js');
const references = require('./data/references.json');
const legacyArenas = require('../../V3/donnees/arenes.json');
const collaborations = require('../donnees/arenes-collaborations.json').filter(a => a.collaboration === 'ff7');
const homeMidgar = ['cloud-ff7', 'barret-ff7', 'tifa-ff7', 'aeris-ff7'];
const homeCosmo = ['red-xiii-ff7', 'cait-sith-ff7', 'cid-ff7'];
const published = (characterId = 'cloud-ff7', index = 0, element = 'ELECTRO') => ({
  id: String(49999000 + index),
  profile: { ...references.cards[0].card, characterId, faction: 'FF7', element,
    positions: [1, 2, 3, 4, 5], role: 2, atk: [200, 180, 160, 140, 120, 100],
    defense: [150, 130, 110, 90, 70, 50], magic: [], barriers: [] },
  pngUrl: '/media/created/' + (49999000 + index) + '.png'
});
const additions = data => data.arenas.filter(a => a.id.startsWith('ff7-'));
const expectedLegacy = data => {
  const ids = new Set(data.cards.map(c => c.characterId));
  return legacyArenas.map(a => ({
    id: a.id, name: a.name, subtitle: a.subtitle, image: '/jeu/' + a.image,
    element: a.element, elementBonus: a.elementBonus, homeCharacters: a.homeCharacters.filter(id => ids.has(id)),
    homeAttack: a.homeAttack, homeDefense: a.homeDefense, source: a.source
  }));
};

// Replace only the supplemental JSON read; never write fixtures into the project.
function withArenas(value) {
  const module = { exports: {} }, file = path.resolve(__dirname, '../donnees/arenes-collaborations.json');
  const readFile = async (target, ...args) => path.resolve(target) === file ? JSON.stringify(value) : fs.promises.readFile(target, ...args);
  const code = fs.readFileSync(path.join(__dirname, 'game-catalog.cjs'), 'utf8');
  vm.runInThisContext('(function(require,module,__dirname){' + code + '\n})')(
    name => name === 'node:fs/promises' ? { readFile } : require(name), module, __dirname);
  return module.exports.buildCatalog;
}

test('unpublished FF7 arenas stay absent; V3 arena output is unchanged', async () => {
  const unrelated = id => { const card = published(id); card.profile.faction = 'Chroma'; return card; };
  for (const publishedCards of [[], [unrelated('unrelated')], [unrelated('cloud')], [unrelated('cloud-ff7')], [unrelated('cloud-ff7-extra')]]) {
    const data = await buildCatalog({ published: publishedCards });
    assert.deepEqual(data.arenas, expectedLegacy(data));
  }
});

test('arena availability follows version faction, not a shared NieR character suffix', async () => {
  const entries = [
    { ...collaborations[0], id: 'replicant-test', collaboration: 'replicant', homeCharacters: ['devola-nier', 'popola-nier'] },
    { ...collaborations[0], id: 'nier-test', collaboration: 'nier', homeCharacters: ['devola-nier', 'popola-nier'] }
  ];
  const replicant = published('devola-nier');
  replicant.profile.faction = 'Replicant';
  replicant.profile.collaboration = 'Replicant';
  const build = withArenas(entries), onlyReplicant = await build({ published: [replicant] });
  assert.deepEqual(onlyReplicant.arenas.slice(legacyArenas.length).map(a => a.id), ['replicant-test']);
  assert.deepEqual(onlyReplicant.arenas.at(-1).homeCharacters, ['devola-nier']);
  assert.equal(onlyReplicant.cards.find(c => c.id === replicant.id).collaboration, 'Replicant');
  const automata = published('devola-nier', 1);
  automata.profile.faction = 'NieR'; automata.profile.collaboration = 'NieR';
  const both = await build({ published: [replicant, automata] });
  assert.deepEqual(both.arenas.slice(legacyArenas.length).map(a => a.id), ['replicant-test', 'nier-test']);
  assert.deepEqual(both.cards.filter(c => [replicant.id, automata.id].includes(c.id)).map(c => c.characterId), ['devola-nier', 'devola-nier']);
});

test('arena availability accepts explicit collaboration without changing a character identity', async () => {
  const card = published('shared-character'); card.profile.faction = 'Chroma'; card.profile.collaboration = 'FF7';
  assert.equal(additions(await buildCatalog({ published: [card] })).length, 2);
  for (const value of ['', '<NieR>', 42, 'a'.repeat(81)]) {
    await assert.rejects(buildCatalog({ published: [{ ...card, profile: { ...card.profile, collaboration: value } }] }), /Collaboration.*invalide/);
  }
});

test('Cloud alone unlocks both arenas with exact FF7 metadata and filtered affinities', async () => {
  const data = await buildCatalog({ published: [published()] });
  assert.deepEqual(data.arenas.slice(0, legacyArenas.length), expectedLegacy(data));
  assert.equal(data.arenas.length, legacyArenas.length + 2);
  assert.deepEqual(additions(data), collaborations.map(({ collaboration, ...arena }) => ({
    ...arena, homeCharacters: arena.homeCharacters.filter(id => id === 'cloud-ff7')
  })));
  assert.deepEqual(additions(data).map(a => [a.id, a.name, a.subtitle, a.element, a.image]), [
    ['ff7-midgar', 'MIDGAR', 'Sous les plaques', 'ELECTRO', '/jeu/assets/arenes/ff7-midgar.png'],
    ['ff7-cosmo-canyon', 'COSMO CANYON', 'La memoire de la planete', 'GEO', '/jeu/assets/arenes/ff7-cosmo-canyon.png']
  ]);
  for (const a of additions(data)) {
    assert.equal(a.elementBonus, 15); assert.equal(a.homeAttack, 10); assert.equal(a.homeDefense, 10);
    assert.match(a.source, /FF7.*collaboration privee non officielle/);
  }
  assert.equal(additions(await buildCatalog()).length, 0);
});

test('any published FF7 character unlocks both arenas without requiring Cloud or a home affinity', async () => {
  for (const characterId of ['red-xiii-ff7', 'vincent-ff7']) {
    const data = await buildCatalog({ published: [published(characterId)] });
    assert.equal(additions(data).length, 2);
    assert.deepEqual(additions(data)[0].homeCharacters, []);
    assert.deepEqual(additions(data)[1].homeCharacters, characterId === 'red-xiii-ff7' ? [characterId] : []);
  }
});

test('home bonuses stay specific to the seven requested characters, not the whole FF7 set', async () => {
  const characters = [...homeMidgar, ...homeCosmo, 'yuffie-ff7', 'vincent-ff7', 'sephiroth-ff7'];
  const data = await buildCatalog({ published: characters.map((id, index) => published(id, index, 'NONE')) });
  const [midgar, cosmo] = additions(data), engine = createEngine(data);
  assert.deepEqual(midgar.homeCharacters, homeMidgar); assert.deepEqual(cosmo.homeCharacters, homeCosmo);
  for (const a of [midgar, cosmo]) {
    for (const [index, characterId] of characters.entries()) {
      const bonus = engine.arenaBonuses({ arenaId: a.id }, { cardId: String(49999000 + index) });
      const home = a.homeCharacters.includes(characterId) ? 10 : 0;
      assert.deepEqual(bonus, { attack: home, defense: home, element: 0, homeAttack: home, homeDefense: home });
    }
  }
});

test('both arenas are playable and restorable with bounded, version-independent bonuses', async () => {
  const base = await buildCatalog(), originalEngine = createEngine(base);
  const original = originalEngine.newGame(base.decks.player, base.decks.enemy, { deckCoverage: 2, seed: 'BEFORE-FF7' });
  originalEngine.autoDeploy(original, 0); originalEngine.autoDeploy(original, 1); originalEngine.start(original);
  const data = await buildCatalog({ published: [published(), published('cloud-ff7', 1), published('red-xiii-ff7', 2, 'GEO')] });
  const engine = createEngine(data);
  assert.deepEqual(engine.restoreGame(original), original);
  for (const [arenaId, cardId] of [['ff7-midgar', '49999000'], ['ff7-midgar', '49999001'], ['ff7-cosmo-canyon', '49999002']]) {
    const deck = [...base.decks.player]; deck[0] = cardId;
    const state = engine.newGame(deck, deck, { arenaId, deckCoverage: 2, seed: 'FF7-ARENAS' });
    assert.equal(state.arenaId, arenaId);
    for (const player of state.players) {
      assert.deepEqual(engine.arenaBonuses(state, player.reserve.find(u => u.cardId === cardId)),
        { attack: 25, defense: 10, element: 15, homeAttack: 10, homeDefense: 10 });
    }
    engine.autoDeploy(state, 0); engine.autoDeploy(state, 1); engine.start(state);
    engine.lock(state, ...engine.aiChoice(state)); engine.rollAttack(state);
    assert.deepEqual(engine.restoreGame(state), state);
    assert.throws(() => engine.setArena(state, arenaId), /verrouill/);
  }
  const away = published('vincent-ff7', 3);
  const awayEngine = createEngine(await buildCatalog({ published: [away] }));
  assert.deepEqual(awayEngine.arenaBonuses({ arenaId: 'ff7-midgar' }, { cardId: away.id }),
    { attack: 15, defense: 0, element: 15, homeAttack: 0, homeDefense: 0 });
  assert.deepEqual(awayEngine.arenaBonuses({ arenaId: 'ff7-cosmo-canyon' }, { cardId: away.id }),
    { attack: 0, defense: 0, element: 0, homeAttack: 0, homeDefense: 0 });
});

test('supplemental JSON rejects malformed metadata, paths, affinities and colliding IDs', async () => {
  const entry = collaborations[0];
  const invalid = [null, {}, [null], [{ ...entry, id: 'bad/id' }], [{ ...entry, collaboration: '' }],
    [{ ...entry, name: '<img>' }], [{ ...entry, name: 'bad"name' }], [{ ...entry, subtitle: '' }], [{ ...entry, source: null }],
    [{ ...entry, element: 'UNKNOWN' }], [{ ...entry, homeCharacters: 'cloud-ff7' }],
    [{ ...entry, homeCharacters: ['cloud-ff7', null] }], [{ ...entry, homeCharacters: ['cloud-ff7', 'cloud-ff7'] }],
    [entry, entry], [{ ...entry, id: legacyArenas[0].id }],
    ...['https://example.invalid/a.png', '//example.invalid/a.png', '/jeu/assets/arenes/../a.png', '/jeu/assets/arenes/%2e%2e/a.png', '/jeu/assets/arenes/a.svg'].map(image => [{ ...entry, image }])];
  for (const entries of invalid) {
    await assert.rejects(withArenas(entries)({ published: [published()] }), /arene|Affinites/);
  }
  await assert.rejects(withArenas([{ ...entry, homeCharacters: null }])(), /Affinites/);
  assert.deepEqual((await withArenas([])()).arenas, (await buildCatalog()).arenas);
});

test('supplemental bonus bounds reject overflow, negatives and non-integers without clamping', async () => {
  for (const [field, max] of [['elementBonus', 15], ['homeAttack', 10], ['homeDefense', 10]]) {
    for (const value of [-1, max + 1, 0.5, String(max), null]) {
      await assert.rejects(withArenas([{ ...collaborations[0], [field]: value }])({ published: [published()] }), /Bonus.*invalide/);
    }
  }
  const data = await withArenas([{ ...collaborations[0], elementBonus: 0, homeAttack: 0, homeDefense: 0 }])({ published: [published()] });
  const engine = createEngine(data);
  assert.deepEqual(engine.arenaBonuses({ arenaId: 'ff7-midgar' }, { cardId: '49999000' }),
    { attack: 0, defense: 0, element: 0, homeAttack: 0, homeDefense: 0 });
});
