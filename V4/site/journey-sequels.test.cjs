'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Definitions = require('./journey-definitions.js');
const Combat = require('./journey-combat.js');
const Composition = require('./team-composition.js');
const Engine = require('./engine.js');
const Equipment = require('./equipment.js');
const legacy = require('../deploy/journey-legacy-4.6.85.json');
const {buildCatalog} = require('../atelier/game-catalog.cjs');
const published = require('../donnees/catalogue.json').cards.filter(card => card.kind === 'created');
const source = fs.readFileSync(path.join(__dirname, 'journey-definitions.js'), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rewards = {
  'momo-petits-bonheurs': ['little-joys-flute', 'kalistar-chroma-harness', 'little-joys-box'],
  'balmhyr-retour': ['mythic-iron-gauntlet', 'durane-rampart', 'exiled-king-seal'],
  'kaylis-prochain-pas': ['white-oath-rapier', 'kaylis-next-step-boots', 'kaylis-colours-ribbon']
};
// Recorded before adding sequels, using the frozen 4.6.85 catalogue and fixture below.
const initialHashes = {
  'momo-petits-bonheurs': [
    '7199249eaf11586373028456649d1ddb1b4709f91776b696697ad1734587f7b1',
    'bb1e07eb41952a6bfb144cfe4d901c4760e26b68aed9cc318beabac636deb98f',
    '0df873a360e99b681272115b84285c9f31d1777fa523288bbbe1354df06d1688',
    '889cffbdf85f75dfd0a48cc55ed959fb24ef31b8b78e327cadc1241e902c2b69'
  ],
  'balmhyr-retour': [
    'bd55bc5f490a013c8bdbccb060205b4419a46c388ca96beb7e6143154c87ce0f',
    '0709b625a1103b05a529c9ffc6f5f419a1d7ffa9d355ad7c21d769722f5da228',
    '5581d5ddf13c769ef7e1076d58d6b37b4238c2c120207905459d10eedac956d3',
    '17738094949fb95495f3871d82e7565dfdbb0ba4d5965212933439d9bf621687'
  ],
  'kaylis-prochain-pas': [
    'ac22902454b4ecba3e119338d92a4e5547b7b9904f940799ab6fbed15806153d',
    '5dffaa0e0fc5f22e1badb2edb24b154e38fba3c207958777a49419851d5aacea',
    'd74539153a731c4852ddc426e66e96949d59dedb40eae26ac8da5093d69ac391',
    'ddd8cf80c1b5c0d43caba558ee7073438b8af9a1fe6f5f59e12df8fbd89e80e2'
  ]
};

function validate(data, definitions = Definitions) {
  const engine = Engine.createEngine(data);
  return definitions.validate(data, engine, Composition.create(engine));
}

function withEquipment(equipment) {
  const context = {module: {exports: {}}, require: name => {
    assert.equal(name, './equipment.js');
    return equipment;
  }};
  vm.runInNewContext(source, context);
  return context.module.exports;
}

function attempt(runtime, data, book, stage) {
  const deck = Composition.create(runtime.engine).fromPreset({name: 'Legacy sequel fixture', cards: data.decks.player});
  return {id: '00000000-0000-4000-8000-000000000001', bookId: book.id, revision: 'journeys-1', stage,
    seed: 'legacy-sequels:' + book.id + ':' + stage, localProfile: 'user-sequel-test', deck,
    cards: deck.cards.map((modelId, i) => ({modelId, id: 'KC-' + String(i + 1).padStart(32, '0')}))};
}

function commandFor(engine, state) {
  if (engine.equipmentChoice(state)) return {method: 'grantEquipment', args: [engine.aiEquipmentChoice(state)]};
  const methods = {initiative: 'rollInitiative', attack: 'rollAttack', defense: 'rollDefense', result: 'next'};
  if (methods[state.phase]) return {method: methods[state.phase]};
  if (state.phase === 'choose') return {method: 'lock', args: engine.aiChoice(state)};
  if (state.phase === 'kalistel') return {method: engine.aiUseKalistel(state) ? 'useKalistel' : 'acceptAttack'};
  if (state.phase === 'replace') return {method: 'autoDeploy', args: [state.replacing]};
  const support = {clover: ['grantClover', 'aiCloverChoice'], potion: ['grantPotion', 'aiPotionChoice'],
    physical: ['grantPhysical', 'aiPhysicalChoice'], heart: ['grantReraise', 'aiReraiseChoice'], guard: ['grantGuard', 'aiGuardChoice']};
  const choice = support[state.phase];
  assert(choice, 'Unexpected phase: ' + state.phase);
  return {method: choice[0], args: [engine[choice[1]](state)]};
}

test('catalogue keeps all twelve journeys-1 stages and their card rewards exactly intact', () => {
  const books = Definitions.catalogue(legacy);
  assert.equal(Definitions.revision, 'journeys-1');
  assert.deepEqual(books.map(book => book.id), Object.keys(rewards));
  for (const book of books) {
    assert.equal(book.revision, 'journeys-1');
    assert.equal(book.stages.length, 4);
    assert(book.stages.every(stage => !Object.hasOwn(stage, 'rewardEquipmentId')));
  }
  const original = books.map(({bonusStages, bonusReveal, ...book}) => book);
  assert.equal(digest(original), '31ecc0473402a59f47491f8ed8ae23415046f135eadf6b186e049a68f5eae733');
});

test('each book has three separate bonus chapters, ordered weapon, shield, relic', () => {
  for (const book of Definitions.catalogue(legacy)) {
    assert.equal(book.bonusStages.length, 3);
    assert.deepEqual(book.bonusStages.map(stage => stage.rewardEquipmentId), rewards[book.id]);
    assert.deepEqual(book.bonusStages.map(stage => stage.rewardKind), ['weapon', 'shield', 'relic']);
    const all = Definitions.combatStages(book);
    assert.equal(all.length, 7);
    assert.equal(new Set(all.map(stage => stage.id)).size, 7);
    assert.deepEqual(all.slice(0, 4), book.stages);
    assert.deepEqual(all.slice(4), book.bonusStages);
    all.pop();
    assert.equal(book.stages.length, 4);
    assert.equal(book.bonusStages.length, 3);
    assert.equal(typeof book.bonusReveal.title, 'string');
    assert(book.bonusReveal.paragraphs.every(paragraph => typeof paragraph === 'string' && paragraph.trim()));
  }
});

test('eighteen French scenes are distinct, paragraph-based, and 150 to 250 words long', () => {
  const paragraphs = [];
  let scenes = 0;
  for (const book of Definitions.catalogue(legacy)) for (const stage of book.bonusStages) {
    for (const kind of ['intro', 'outro']) {
      assert(stage[kind].length >= 3, book.id + '/' + stage.id + '/' + kind);
      assert(stage[kind].every(paragraph => typeof paragraph === 'string' && paragraph.trim() === paragraph && paragraph.length));
      const text = stage[kind].join(' '), words = text.split(/\s+/).length;
      assert(words >= 150 && words <= 250, stage.id + '/' + kind + ': ' + words + ' words');
      assert(!/TODO|TBD|placeholder|\+\d+|\bD6\b|\bSQL\b|\bUI\b/i.test(text));
      assert(!/[<>]/.test(text), 'Narrative paragraphs are plain text');
      paragraphs.push(...stage[kind]);
      scenes++;
    }
  }
  assert.equal(scenes, 18);
  assert.equal(new Set(paragraphs).size, paragraphs.length);
});

test('all nine opponents are distinct legal teams available in the frozen 4.6.85 catalogue', () => {
  const engine = Engine.createEngine(legacy), Team = Composition.create(engine), signatures = [];
  for (const book of Definitions.catalogue(legacy)) for (const stage of book.bonusStages) {
    const team = Team.fromPreset({name: book.subtitle, cards: stage.deck});
    assert.deepEqual(engine.validateComposition(team), []);
    assert.equal(stage.deck.length, 10);
    assert.equal(new Set(stage.deck.map(id => engine.byId[id].characterId)).size, 10);
    assert(team.formation.includes(stage.captain));
    assert(engine.byId[stage.imageModelId]);
    assert(legacy.arenas.some(arena => arena.id === stage.arenaId));
    assert(stage.deck.every(id => engine.byId[id].characterId !== book.characterId));
    for (let position = 1; position <= 5; position++)
      assert(stage.deck.filter(id => engine.byId[id].positions.includes(position)).length >= 2);
    for (const original of book.stages)
      assert(stage.deck.filter(id => !original.deck.includes(id)).length >= 5, 'Not a reshuffled original team');
    signatures.push(stage.deck.slice().sort().join(','));
  }
  assert.equal(new Set(signatures).size, 9);
});

test('every reward exists with the right kind and fits the exact rewarded model', () => {
  for (const book of Definitions.catalogue(legacy)) for (const stage of book.bonusStages) {
    const reward = Equipment.catalogue.weapons.find(item => item.id === stage.rewardEquipmentId);
    assert(reward, 'Missing real equipment: ' + stage.rewardEquipmentId);
    assert.equal(Equipment.catalogue.kind(reward), stage.rewardKind);
    assert.equal(Equipment.compatible(reward, legacy.cards.find(card => card.id === book.rewardModelId)), true);
  }
});

test('validate alone exposes seven runtime stages for both current and legacy catalogues', async () => {
  const current = await buildCatalog({published});
  for (const data of [legacy, current]) {
    const before = digest(data), books = Definitions.catalogue(data), runtimeBooks = validate(data);
    for (let index = 0; index < books.length; index++) {
      assert.deepEqual(runtimeBooks[index], {...books[index], stages: Definitions.combatStages(books[index])});
      assert.equal(runtimeBooks[index].stages.length, 7);
      assert.equal(books[index].stages.length, 4);
    }
    assert.equal(digest(data), before);
    runtimeBooks[0].stages[4].intro[0] = 'Caller edit';
    runtimeBooks[0].stages[4].deck[0] = 'invalid';
    books[0].bonusReveal.paragraphs[0] = 'Another caller edit';
    assert.notEqual(Definitions.catalogue(data)[0].bonusStages[0].intro[0], 'Caller edit');
    assert.notEqual(Definitions.catalogue(data)[0].bonusStages[0].deck[0], 'invalid');
    assert.notEqual(Definitions.catalogue(data)[0].bonusReveal.paragraphs[0], 'Another caller edit');
    assert.doesNotThrow(() => validate(data));
  }
});

test('the browser export matches CommonJS, including a catalogue-only page without equipment runtime', () => {
  const browser = {KalistarEquipment: Equipment};
  vm.runInNewContext(source, browser);
  assert.deepEqual(copy(browser.KalistarJourneyDefinitions.catalogue(legacy)), Definitions.catalogue(legacy));
  assert.deepEqual(copy(validate(legacy, browser.KalistarJourneyDefinitions)), validate(legacy));
  const reader = {};
  vm.runInNewContext(source, reader);
  assert.deepEqual(copy(reader.KalistarJourneyDefinitions.catalogue({cards: []})), Definitions.catalogue({cards: []}));
});

test('validation rejects missing, mistyped or incompatible rewards without inventing a fallback', () => {
  assert.doesNotThrow(() => validate(legacy));
  for (const id of Object.values(rewards).flat()) {
    const check = weapons => withEquipment({...Equipment, catalogue: {...Equipment.catalogue, weapons}});
    const all = Equipment.catalogue.weapons;
    assert.throws(() => validate(legacy, check(all.filter(item => item.id !== id))), /Equipement de parcours inconnu/);
    const wrongKind = all.map(item => item.id === id ? {...item, slot: item.slot === 'shield' ? 'weapon' : 'shield',
      kind: item.slot === 'shield' ? 'weapon' : 'shield'} : item);
    assert.throws(() => validate(legacy, check(wrongKind)), /type incorrect/);
    const wrongBearer = all.map(item => item.id === id ? {...item, restrictions: {characterIds: ['not-the-hero']}} : item);
    assert.throws(() => validate(legacy, check(wrongBearer)), /Equipement de parcours incompatible/);
  }
});

test('validation still rejects unknown models, arenas and impossible bonus formations', () => {
  assert.doesNotThrow(() => validate(legacy));
  const noModel = copy(legacy);
  noModel.cards = noModel.cards.filter(card => card.id !== '49902610');
  assert.throws(() => validate(noModel));
  const noArena = {...legacy, arenas: legacy.arenas.filter(arena => arena.id !== 'geo')};
  assert.throws(() => validate(noArena), /arene de parcours inconnue/);
  const invalid = copy(legacy), ids = Definitions.catalogue(legacy)[0].bonusStages[0].deck;
  for (const card of invalid.cards) if (ids.includes(card.id)) card.positions = [1];
  assert.throws(() => validate(invalid));
});

test('the twelve historical initial snapshots stay byte-identical with unchanged journey-combat', () => {
  const runtime = Combat.create(legacy);
  for (const book of runtime.books) for (let stage = 0; stage < 4; stage++) {
    const state = runtime.initial(attempt(runtime, legacy, book, stage));
    assert.equal(digest(state), initialHashes[book.id][stage], book.id + '/' + stage);
    assert.deepEqual(copy(runtime.engine.restoreGame(copy(state))), state);
  }
});

test('the unchanged runtime starts, restores and completes all nine bonus fights at indices 4..6', async t => {
  const runtime = Combat.create(legacy), before = digest(legacy);
  for (const book of runtime.books) for (let stage = 4; stage < 7; stage++) await t.test(book.id + '/' + stage, () => {
    const fixture = attempt(runtime, legacy, book, stage), beforeAttempt = digest(fixture);
    let state = runtime.initial(fixture), commands = 0;
    const snapshot = copy(state.journey.snapshot), expected = book.stages[stage];
    assert.equal(state.journey.stage, stage);
    assert.equal(state.journey.revision, 'journeys-1');
    assert.equal(state.arenaId, expected.arenaId);
    assert.deepEqual(state.composition.teams[1].cards, expected.deck);
    assert.equal(state.composition.teams[1].captain, expected.captain);
    assert.equal(state.equipment.definitions.length, 1, 'Rewards are not automatic combat loadouts');
    while (state.phase !== 'over' && commands < 4000) {
      const engine = Combat.engineFor(legacy, state);
      if (commands % 29 === 0) {
        const restored = copy(engine.restoreGame(copy(state)));
        assert.deepEqual(restored, state);
        state = restored;
      }
      state = runtime.apply(state, [commandFor(engine, state)]);
      commands++;
    }
    assert.equal(state.phase, 'over');
    assert([0, 1, 'draw'].includes(state.winner));
    assert(commands > 10);
    assert.equal(state.journey.sequence, commands + 1);
    assert.equal(state.journey.stage, stage);
    assert.deepEqual(state.journey.snapshot, snapshot);
    assert.equal(digest(fixture), beforeAttempt);
    t.diagnostic(book.id + '/' + stage + ': ' + commands + ' commands, winner ' + state.winner);
  });
  const fixture = attempt(runtime, legacy, runtime.books[0], 4);
  for (const stage of [-1, 7, 4.5]) assert.throws(() => runtime.initial({...fixture, stage}), /Edition de parcours indisponible/);
  assert.equal(digest(legacy), before);
});
