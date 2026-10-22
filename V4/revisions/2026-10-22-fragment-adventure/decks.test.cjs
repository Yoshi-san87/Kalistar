'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {plan} = require('../../deploy/build.cjs');
const Definitions = require('../../site/journey-definitions.js');
const Combat = require('../../site/journey-combat.js');
const Composition = require('../../site/team-composition.js');
const Engine = require('../../site/engine.js');
const Equipment = require('../../site/equipment.js');
const copy = value => structuredClone(value);
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const planned = plan().then(({catalogue}) => catalogue);
const stages = {
  'momo-petits-bonheurs': ['rebuts', 'passage', 'carillons', 'rester', 'souffle', 'coutures', 'boite'],
  'balmhyr-retour': ['horizon', 'durane', 'guide', 'portes', 'serment', 'rempart', 'empreinte'],
  'kaylis-prochain-pas': ['breche', 'couleurs', 'ligne', 'seuil', 'promesse', 'appuis', 'ruban']
};
const baselines = [
  {id: 'starting-native', name: 'Native starting cast', cards: ['30000007','30000002','30000021','30000001','30000012','30000013','30000018','30000008','30000023','30000006']},
  {id: 'cryo-watch', name: 'Northern watch', cards: ['49902204','49902202','49902203','49900907','49902101','49902201','49900902','49902205','49900707','49900904']},
  {id: 'city-watch', name: 'City watch', cards: ['49900301','49900302','49900304','49900706','49900303','49902609','49900305','30000009','30000020','49900713']}
];

function commandFor(engine, state) {
  if (engine.equipmentChoice(state)) return {method: 'grantEquipment', args: [engine.aiEquipmentChoice(state)]};
  const plain = {initiative: 'rollInitiative', attack: 'rollAttack', defense: 'rollDefense', result: 'next'};
  if (plain[state.phase]) return {method: plain[state.phase], args: []};
  if (state.phase === 'choose') return {method: 'lock', args: engine.aiChoice(state)};
  if (state.phase === 'kalistel') return {method: engine.aiUseKalistel(state) ? 'useKalistel' : 'acceptAttack', args: []};
  if (state.phase === 'replace') return {method: 'autoDeploy', args: [state.replacing]};
  const support = {clover: ['grantClover', 'aiCloverChoice'], potion: ['grantPotion', 'aiPotionChoice'],
    physical: ['grantPhysical', 'aiPhysicalChoice'], heart: ['grantReraise', 'aiReraiseChoice'], guard: ['grantGuard', 'aiGuardChoice']};
  const pair = support[state.phase];
  assert(pair, 'Unknown real phase: ' + state.phase);
  return {method: pair[0], args: [engine[pair[1]](state)]};
}

test('all 21 current episodes use published native casts, legal double coverage and an active captain', async () => {
  const data = await planned, before = digest(data), engine = Engine.createEngine(data), Team = Composition.create(engine);
  const books = Definitions.validate(data, engine, Team), signatures = [], models = new Set(), characters = new Set();
  assert(data.cards.some(c => c.collaboration), 'Use the full published catalogue, including excluded candidates');
  assert(data.cards.some(c => c.origin === 'published'), 'Not only approved starting references');
  assert.equal(Definitions.revision, 'journeys-1');
  assert.deepEqual(books.map(b => b.id), Object.keys(stages));
  for (const book of books) {
    assert.deepEqual(book.stages.map(s => s.id), stages[book.id]);
    for (const stage of book.stages) {
      const team = Team.fromPreset({name: book.subtitle, cards: stage.deck});
      team.captain = stage.captain;
      assert.equal(stage.deck.length, 10);
      assert.equal(new Set(stage.deck.map(id => engine.byId[id].characterId)).size, 10);
      assert.deepEqual(team.formation, stage.deck.slice(0, 5), book.id + '/' + stage.id);
      assert(team.formation.includes(stage.captain));
      assert.deepEqual(engine.validateComposition(team), []);
      assert(Object.values(engine.deckCoverage(stage.deck)).every(count => count >= 2));
      assert(stage.deck.every(id => engine.byId[id] && !engine.byId[id].collaboration));
      assert(data.arenas.some(arena => arena.id === stage.arenaId && !arena.collaboration));
      assert(engine.byId[stage.imageModelId] && !engine.byId[stage.imageModelId].collaboration);
      assert.deepEqual(team.equipment, Equipment.emptyLoadout(), 'The story must not silently equip rewards');
      for (const id of stage.deck) {models.add(id); characters.add(engine.byId[id].characterId);}
      signatures.push(stage.deck.slice().sort().join(','));
      assert.deepEqual(Object.keys(stage).sort(), ['arenaId', 'captain', 'deck', 'id', 'imageModelId', 'intro', 'outro', 'title',
        ...(stage.rewardKind ? ['rewardEquipmentId', 'rewardKind'] : [])].sort(), 'No hidden stat, die or difficulty bonuses');
    }
    const final = book.stages[3];
    assert.equal(final.captain, book.rewardModelId, 'Fourth fight centers the exact rewarded version');
    assert(final.deck.slice(0, 5).includes(book.rewardModelId));
  }
  assert.equal(new Set(signatures).size, 21, 'No reskinned identical deck');
  assert(models.size >= 40);
  assert(characters.size >= 35);
  assert.equal(digest(data), before);
});

test('Momo follows the specified version, friendship, remembered flute and gradual creator clue', async () => {
  const data = await planned, book = Definitions.catalogue(data)[0], all = Definitions.combatStages(book);
  assert.equal(book.rewardModelId, '30000014');
  assert.equal(book.stages[0].captain, '30000001');
  assert.equal(book.stages[0].deck[2], '30000001');
  assert.equal(book.stages[1].captain, '30000013');
  assert.equal(book.stages[1].deck[0], '30000013');
  const stories = all.map(stage => stage.intro.concat(stage.outro).join(' '));
  assert.match(stories[0], /maison/);
  assert.match(stories[0], /défectueux/);
  assert.match(stories[1], /Taulio/);
  assert.match(stories[2], /flûte traversière/);
  assert(!stories.slice(0, 6).join(' ').includes('Gezinho'), 'Do not reveal creator identity on the opening screen');
  assert.match(stories[6], /Gezinho/);
  assert.match(stories[6], /Kaylis/);
  assert(!/incorpor|transform.*Kalistel|Kalistel.*circuits/i.test(stories.join(' ')), 'The author secret remains gradual, not an explanatory dump');
  const byId = new Map(data.cards.map(c => [c.id, c]));
  const chroma = book.stages.map(stage => stage.deck.filter(id => byId.get(id).faction === 'Chroma').length);
  assert.deepEqual(chroma, [4, 7, 8, 9]);
  assert.equal(book.stages[3].deck.filter(id => byId.get(id).element === 'ELECTRO').length, 7);
});

test('all 42 narrative scenes are complete, concise and separate from mechanics; Kaylis boots are black', async () => {
  const data = await planned, scenes = [];
  for (const book of Definitions.catalogue(data)) for (const stage of Definitions.combatStages(book)) for (const kind of ['intro', 'outro']) {
    const scene = stage[kind].join(' '), words = scene.split(/\s+/).length;
    assert(stage[kind].length >= 2);
    assert(words >= 80 && words <= 140, book.id + '/' + stage.id + '/' + kind + ': ' + words);
    assert(stage[kind].every(p => p && p.trim() === p));
    assert(!/[<>]|\bTODO\b|\bTBD\b|\bD6\b|\bSQL\b|\+\d+/.test(scene));
    scenes.push(scene);
  }
  assert.equal(scenes.length, 42);
  assert.equal(new Set(scenes).size, 42);
  const kaylis = Definitions.catalogue(data)[2], text = JSON.stringify(kaylis);
  assert.match(text, /bottes noires/);
  assert(!/bottes brunes|botte brune|cuir brun/.test(text));
});

test('validation refuses a collaboration substituted into an otherwise legal narrative cast', async () => {
  const data = copy(await planned), original = data.cards.find(c => c.id === '30000001');
  original.collaboration = {id: 'injected-crossover'};
  const engine = Engine.createEngine(data);
  assert.throws(() => Definitions.validate(data, engine, Composition.create(engine)), /Carte native publiee requise/);
});

test('21 real encounters start, retain model stats, restore and finish without fixed dice or free equipment', async t => {
  const data = await planned, runtime = Combat.create(data), Team = Composition.create(runtime.engine);
  const own = Team.fromPreset(baselines[0]);
  for (const book of runtime.books) for (let index = 0; index < 7; index++) await t.test(book.id + '/' + index, () => {
    const attempt = {id: '00000000-0000-4000-8000-000000000001', bookId: book.id, revision: book.revision, stage: index,
      seed: 'fragment-adventure:' + book.id + ':' + index, localProfile: 'isolated-adventure-test', deck: own,
      cards: own.cards.map((modelId, i) => ({modelId, id: 'KC-' + String(i + 1).padStart(32, '0')}))};
    let state = runtime.initial(attempt), actions = 0;
    const stage = book.stages[index], snapshot = copy(state.journey.snapshot), engine = Combat.engineFor(data, state);
    assert.deepEqual(state.composition.teams[1].cards, stage.deck);
    assert.equal(state.composition.teams[1].captain, stage.captain);
    assert(state.players[1].board.some(u => u && u.cardId === stage.captain));
    assert.deepEqual(state.equipment.loadouts[1], Equipment.emptyLoadout());
    for (const model of snapshot.cards) assert.deepEqual(model, data.cards.find(c => c.id === model.id));
    while (state.phase !== 'over' && actions < 4000) {
      const command = commandFor(engine, state);
      state = runtime.apply(state, [command]);
      if (++actions % 37 === 0) state = copy(engine.restoreGame(copy(state)));
    }
    assert.equal(state.phase, 'over');
    assert([0, 1].includes(state.winner), 'No pathological drawn or unfinished encounter');
    assert.deepEqual(state.journey.snapshot, snapshot);
  });
});

test('optional paired comparison samples every episode against three native baselines', {skip: !process.env.KALISTAR_JOURNEY_BALANCE}, async t => {
  const data = await planned, engine = Engine.createEngine(data), Team = Composition.create(engine);
  const seeds = 24;
  const rows = [];
  for (const book of Definitions.validate(data, engine, Team)) for (const stage of book.stages) {
    const enemy = Team.fromPreset({name: book.subtitle, cards: stage.deck}); enemy.captain = stage.captain;
    const row = {book: book.id, stage: stage.id, games: 0, wins: 0, draws: 0, maxTurns: 0, byBaseline: {}};
    for (const baseline of baselines) {
      const own = Team.fromPreset(baseline), result = {wins: 0, games: 0};
      assert(own.cards.every(id => !engine.byId[id].collaboration));
      for (let seed = 0; seed < seeds; seed++) for (const side of [0, 1]) {
        const state = engine.newGame(...(side ? [own, enemy] : [enemy, own]),
          {mode: 'ai', seed: 'adventure-confirmation:' + baseline.id + ':' + seed, arenaId: stage.arenaId, turnOrder: 'ABBA', deckCoverage: 2});
        let actions = 0;
        while (state.phase !== 'over' && actions++ < 4000) {
          const command = commandFor(engine, state); engine[command.method](state, ...(command.args || []));
        }
        assert.equal(state.phase, 'over', book.id + '/' + stage.id);
        engine.assertState(state);
        row.games++; result.games++;
        if (state.winner === side) {row.wins++; result.wins++;}
        if (state.winner === 'draw') row.draws++;
        row.maxTurns = Math.max(row.maxTurns, state.round);
      }
      row.byBaseline[baseline.id] = result;
    }
    rows.push(row);
    t.diagnostic(book.id + '/' + stage.id + ': ' + row.wins + '/' + row.games + ' opponent wins');
  }
  const target = path.resolve(__dirname, '../../../work/qa/fragment-adventure-decks.json');
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, JSON.stringify({catalogue: digest(data.cards), definitions: digest(Definitions.catalogue(data)),
    seeds, games: rows.reduce((sum, r) => sum + r.games, 0), rules: 'Unmodified AI, ABBA, paired seat swaps, no equipment', rows}, null, 2) + '\n');
});
