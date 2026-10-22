'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Combat = require('./journey-combat.js');
const Definitions = require('./journey-definitions.js');
const Composition = require('./team-composition.js');
const Equipment = require('./equipment.js');
const {buildCatalog} = require('../atelier/game-catalog.cjs');
const published = require('../donnees/catalogue.json').cards.filter(card => card.kind === 'created');
const copy = value => JSON.parse(JSON.stringify(value));
const expectedMethods = ['rollInitiative', 'lock', 'rollAttack', 'rollDefense', 'useKalistel', 'acceptAttack',
  'grantClover', 'grantPotion', 'grantPhysical', 'grantReraise', 'grantGuard', 'grantEquipment', 'deploy', 'autoDeploy', 'next'];
const support = {clover: ['grantClover', 'aiCloverChoice'], potion: ['grantPotion', 'aiPotionChoice'],
  physical: ['grantPhysical', 'aiPhysicalChoice'], heart: ['grantReraise', 'aiReraiseChoice'], guard: ['grantGuard', 'aiGuardChoice']};

function commandFor(runtime, state, step = 0, focusCharacter, preserveEnemyFace) {
  const E = runtime.engine;
  if (E.equipmentChoice(state)) return {method: 'grantEquipment', args: [E.aiEquipmentChoice(state)]};
  if (state.phase === 'initiative') return {method: 'rollInitiative'};
  if (state.phase === 'choose') {
    const pair = E.aiChoice(state);
    if (state.turn === 0 && focusCharacter) {
      const slot = state.players[0].board.findIndex(unit => unit && E.card(unit).characterId === focusCharacter);
      if (slot >= 0) pair[0] = slot;
    }
    if (state.turn === 0 && preserveEnemyFace) {
      const targets = state.players[1].board.flatMap((unit, slot) => unit ? [{unit, slot}] : []);
      const ordinary = targets.filter(({unit}) => !E.card(unit).atk.includes(preserveEnemyFace));
      const candidates = ordinary.length ? ordinary : targets;
      candidates.sort((a, b) => E.mean(E.card(b.unit).atk) - E.mean(E.card(a.unit).atk));
      pair[1] = candidates[0].slot;
      if (!ordinary.length) {
        const attackers = state.players[0].board.flatMap((unit, slot) => unit ? [{unit, slot}] : []);
        attackers.sort((a, b) => E.mean(E.card(a.unit).atk) - E.mean(E.card(b.unit).atk));
        pair[0] = attackers[0].slot;
      }
    }
    return {method: 'lock', args: pair};
  }
  if (state.phase === 'attack') return {method: 'rollAttack'};
  if (state.phase === 'defense') return {method: 'rollDefense'};
  if (state.phase === 'kalistel') return {method: E.aiUseKalistel(state) ? 'useKalistel' : 'acceptAttack'};
  if (state.phase === 'result') return {method: 'next'};
  if (state.phase === 'replace') {
    if (state.replacing === 0 && step % 2 === 0) {
      const player = state.players[0];
      const slot = player.board.findIndex((unit, index) => !unit && player.reserve.some(candidate => E.card(candidate).positions.includes(index + 1)));
      const unit = player.reserve.find(candidate => E.card(candidate).positions.includes(slot + 1));
      assert(unit, 'A genuine replacement phase must have a compatible reserve');
      return {method: 'deploy', args: [0, unit.uid, slot]};
    }
    return {method: 'autoDeploy', args: [state.replacing]};
  }
  const choice = support[state.phase];
  assert(choice, 'Unhandled real phase: ' + state.phase);
  return {method: choice[0], args: [E[choice[1]](state)]};
}

test('pure JourneyCombat: twenty-one initial states, protected AI and twelve complete historical matches', async t => {
  const data = await buildCatalog({published});
  const catalogueBefore = JSON.stringify(data);
  const runtime = Combat.create(data), E = runtime.engine, Team = Composition.create(E);
  const team = Team.fromPreset({name: 'Journey runtime fixture', cards: data.decks.player});
  let identity = 0;
  const attempt = (book = runtime.books[0], stage = 0, deck = team, seed) => {
    const id = '00000000-0000-4000-8000-' + String(++identity).padStart(12, '0');
    return {id, actorId: '11111111-1111-4111-8111-111111111111', localProfile: 'user-runtime-fixture',
      bookId: book.id, revision: book.revision, stage, seed: seed || 'journey-runtime-fixture:' + book.id + ':' + stage,
      deck: copy(deck), cards: deck.cards.map((modelId, i) => ({modelId,
        id: 'KC-' + '0'.repeat(28) + String(i + 1).padStart(4, '0')}))};
  };
  const samples = new Map(), accepted = new Set(), results = [];
  const remember = state => {
    const equipment = E.equipmentChoice(state);
    const key = (equipment ? 'equipment' : state.phase) + ':' + (runtime.automatic(state) ? 'ai' : 'human');
    const previous = samples.get(key);
    if (!previous || runtime.automatic(state) && support[state.phase] &&
      state.players[1].board.filter(Boolean).length > previous.players[1].board.filter(Boolean).length)
      samples.set(key, copy(state));
  };
  const sample = (phase, automatic) => {
    const result = samples.get(phase + ':' + (automatic ? 'ai' : 'human'));
    assert(result, 'Missing naturally reached phase: ' + phase + '/' + (automatic ? 'ai' : 'human') + '; captured: ' + [...samples.keys()].join(', '));
    return copy(result);
  };
  const refuses = (state, commands, message) => {
    const before = JSON.stringify(state);
    assert.throws(() => runtime.apply(state, commands), message);
    assert.equal(JSON.stringify(state), before, 'A rejected batch must not alter its input state');
  };
  let firstInitial, firstCommands;
  const play = (fixture, focusCharacter, preserveEnemyFace) => {
    const fixtureBefore = JSON.stringify(fixture);
    let state = runtime.initial(fixture), actions = 0;
    const bindings = copy(state.collection.bindings), commands = [];
    const initial = copy(state);
    assert.equal(state.journey.sequence, 1);
    while (state.phase !== 'over' && actions < 4000) {
      remember(state);
      const command = commandFor(runtime, state, actions, focusCharacter, preserveEnemyFace);
      const prior = state, before = actions % 43 === 0 ? JSON.stringify(prior) : null;
      state = runtime.apply(prior, [command]);
      actions++;
      commands.push(command);
      accepted.add(command.method);
      assert.equal(state.journey.sequence, actions + 1, 'Each accepted batch advances exactly one sequence');
      assert.equal(prior.journey.sequence, actions);
      assert(state.round === prior.round || state.round === prior.round + 1);
      if (before !== null) assert.equal(JSON.stringify(prior), before, 'apply must return a new state');
      if (actions % 79 === 0) {
        const restored = E.restoreGame(copy(state));
        assert.deepEqual(copy(restored), state, 'A mid-match reload cannot replay any command');
        state = restored;
      }
    }
    assert.equal(state.phase, 'over', fixture.bookId + '/' + fixture.stage + ' did not terminate within the action budget');
    assert([0, 1, 'draw'].includes(state.winner));
    assert(actions > 10);
    assert(state.match.events.length > 0);
    assert.equal(state.matchId, 'match-' + fixture.id);
    assert.deepEqual(state.collection.bindings, bindings);
    assert.deepEqual(state.journey, {version: 1, attemptId: fixture.id, bookId: fixture.bookId,
      stage: fixture.stage, revision: fixture.revision, sequence: actions + 1,snapshot:initial.journey.snapshot});
    assert.deepEqual(copy(E.restoreGame(copy(state))), state);
    assert.equal(JSON.stringify(fixture), fixtureBefore);
    remember(state);
    if (!firstInitial) { firstInitial = initial; firstCommands = commands.slice(0, 8); }
    return {state, actions, commands};
  };

  await t.test('three books keep four historical stages and expose seven valid runtime compositions each', () => {
    assert.deepEqual(runtime.books.map(book => book.id).sort(), ['balmhyr-retour', 'kaylis-prochain-pas', 'momo-petits-bonheurs']);
    assert.equal(runtime.books.length, 3);
    assert.deepEqual(Combat.methods.slice().sort(), expectedMethods.slice().sort());
    assert.deepEqual(Definitions.validate(data, E, Team), runtime.books);
    const catalogue = Definitions.catalogue(data);
    for (const book of runtime.books) {
      const original = catalogue.find(value => value.id === book.id);
      assert.equal(original.stages.length, 4);
      assert.equal(original.bonusStages.length, 3);
      assert.equal(book.revision, 'journeys-1');
      assert.equal(book.stages.length, 7);
      assert.equal(new Set(book.stages.map(stage => stage.id)).size, 7);
      assert.deepEqual(book.stages.slice(0, 4), original.stages);
      assert.deepEqual(book.stages.slice(4), original.bonusStages);
      assert.equal(E.byId[book.rewardModelId].characterId, book.characterId);
      for (const stage of book.stages) {
        const opponent = Team.fromPreset({name: book.subtitle, cards: stage.deck});
        assert.deepEqual(E.validateComposition(opponent), []);
        assert.equal(stage.deck.length, 10);
        assert.equal(new Set(stage.deck.map(id => E.byId[id].characterId)).size, 10);
        assert(opponent.formation.includes(stage.captain));
        assert(data.arenas.some(arena => arena.id === stage.arenaId));
        assert(E.byId[stage.imageModelId]);
      }
    }
  });

  await t.test('initial freezes the correct stage, opponent, seed and ten distinct specimen bindings without mutating input', () => {
    const fixture = attempt(), before = JSON.stringify(fixture);
    const state = runtime.initial(fixture);
    assert.equal(JSON.stringify(fixture), before);
    assert.deepEqual(state, runtime.initial(copy(fixture)));
    assert.equal(state.phase, 'initiative');
    assert.equal(state.winner, null);
    assert.equal(state.mode, 'ai');
    assert.equal(state.equipment.definitions.length,1,'Unequipped catalogue data must not inflate every live server state');
    assert.equal(state.seed, fixture.seed);
    assert.equal(state.arenaId, runtime.books[0].stages[0].arenaId);
    assert.equal(state.composition.teams[1].captain, runtime.books[0].stages[0].captain);
    assert.equal(state.collection.userId, fixture.localProfile);
    assert.equal(state.collection.opponent, 'virtual');
    assert.equal(Object.keys(state.collection.bindings).length, 10);
    assert.equal(new Set(Object.values(state.collection.bindings)).size, 10);
    for (const unit of state.players[0].board.filter(Boolean).concat(state.players[0].reserve))
      assert.equal(state.collection.bindings[unit.instanceId], fixture.cards.find(card => card.modelId === unit.cardId).id);
    for (const patch of [{bookId: 'not-a-book'}, {revision: 'obsolete'}, {stage: -1}, {stage: 7}, {stage: 1.5}])
      assert.throws(() => runtime.initial({...fixture, ...patch}), /Edition de parcours indisponible/);
    assert.throws(() => runtime.initial({...fixture, cards: fixture.cards.slice(1)}), /Exemplaire de parcours absent/);
    assert.throws(() => runtime.initial({...fixture, deck: {...fixture.deck, cards: []}}));
  });

  await t.test('all twenty-one initial states use the exact stage and survive snapshot restoration', () => {
    let checked = 0;
    for (const book of runtime.books) for (let index = 0; index < 7; index++) {
      const fixture = attempt(book, index), before = JSON.stringify(fixture), stage = book.stages[index];
      const state = runtime.initial(fixture);
      assert.equal(JSON.stringify(fixture), before);
      assert.deepEqual(state, runtime.initial(copy(fixture)));
      assert.equal(state.phase, 'initiative');
      assert.equal(state.journey.bookId, book.id);
      assert.equal(state.journey.stage, index);
      assert.equal(state.journey.revision, 'journeys-1');
      assert.equal(state.journey.sequence, 1);
      assert.equal(state.arenaId, stage.arenaId);
      assert.deepEqual(state.composition.teams[1].cards, stage.deck);
      assert.equal(state.composition.teams[1].captain, stage.captain);
      assert.deepEqual(state.journey.snapshot.arenas.map(arena => arena.id), [stage.arenaId]);
      const participants = new Set(state.players.flatMap(player =>
        [...player.board.filter(Boolean), ...player.reserve].map(unit => unit.cardId)));
      assert.deepEqual(state.journey.snapshot.cards.map(card => card.id).sort(), [...participants].sort());
      assert.equal(Object.keys(state.collection.bindings).length, 10);
      assert.deepEqual(copy(E.restoreGame(copy(state))), state);
      assert.deepEqual(copy(Combat.engineFor(data, state).restoreGame(copy(state))), state);
      checked++;
    }
    assert.equal(checked, 21);
  });

  await t.test('definitions reject missing rewards, wrong character identities, missing arenas and nonplayable compositions', () => {
    const missingReward = copy(data);
    missingReward.cards = missingReward.cards.filter(card => card.id !== '49055457');
    assert.throws(() => Combat.create(missingReward));
    const wrongCharacter = copy(data);
    wrongCharacter.cards.find(card => card.id === runtime.books[0].rewardModelId).characterId = 'not-momo';
    assert.throws(() => Combat.create(wrongCharacter), /Recompense de parcours inconnue/);
    assert.throws(() => Combat.create({...data, arenas: data.arenas.filter(arena => arena.id !== 'trone-fer')}));
    const impossible = copy(data);
    for (const card of impossible.cards) if (runtime.books[0].stages[0].deck.includes(card.id)) card.positions = [1];
    assert.throws(() => Combat.create(impossible));
  });

  for (const book of runtime.books) for (let stage = 0; stage < 4; stage++) await t.test(
    'complete historical runtime.apply-only combat: ' + book.id + '/' + (stage + 1), () => {
      const fixture = attempt(book, stage), result = play(fixture);
      results.push({bookId: book.id, stage, actions: result.actions, winner: result.state.winner});
    });

  await t.test('all AI support phases are reached by legal player choices, without forced faces or synthetic states', () => {
    const faces = {clover: 'retry', potion: 'mana', physical: 'buff_atk', heart: 'revive', guard: 'guard'};
    for (const [phase, face] of Object.entries(faces)) {
      for (let seed = 0; seed < 8 && !samples.has(phase + ':ai'); seed++) play(
        attempt(runtime.books[0], 0, team, 'journey-ai-support:' + phase + ':' + seed), undefined, face);
      sample(phase, true);
    }
  });

  await t.test('a real equipped carrier reaches and resolves relic choices through apply only', () => {
    const cardId = '49901503', relicId = 'gotham-riddle-box';
    const relic = Equipment.catalogue.weapons.find(item => item.id === relicId);
    assert(Equipment.compatible(relic, E.byId[cardId]));
    let equipped;
    for (let index = 0; index < team.cards.length && !equipped; index++) {
      const ids = team.cards.map((id, i) => i === index ? cardId : id);
      if (E.validatePlayableDeck(ids).length) continue;
      const candidate = Team.fromPreset({name: 'Real equipped journey', cards: ids});
      if (candidate.formation.includes(cardId)) equipped = Team.equip(candidate, cardId, relicId);
    }
    assert(equipped, 'A real legal formation must include the compatible carrier');
    for (let seed = 0; seed < 4 && !samples.has('equipment:human'); seed++) play(
      attempt(runtime.books[0], 0, equipped, 'journey-relic-choice:' + seed), E.byId[cardId].characterId);
    const pending = sample('equipment', false), choice = E.equipmentChoice(pending);
    assert.deepEqual(pending.equipment.definitions.map(item=>item.id),[relicId],'The actual equipped relic remains frozen and self-contained');
    assert.equal(choice.weaponId, relicId);
    assert.equal(String(choice.sourceUid).startsWith('0-'), true);
    assert.equal(runtime.automatic(pending), false);
    refuses(pending, [{method: 'grantEquipment', args: ['not-an-option']}]);
    const selected = runtime.apply(pending, [{method: 'grantEquipment', args: [E.aiEquipmentChoice(pending)]}]);
    assert.equal(selected.journey.sequence, pending.journey.sequence + 1);
  });

  await t.test('every exposed command succeeds and the four historical combats per book all terminate', () => {
    assert.equal(results.length, 12);
    for (const book of runtime.books) assert.deepEqual(results.filter(result => result.bookId === book.id).map(result => result.stage), [0, 1, 2, 3]);
    assert.deepEqual([...accepted].sort(), expectedMethods.slice().sort());
  });

  await t.test('valid batches of one to eight commands are deterministic and increment sequence once per batch', () => {
    assert.equal(firstCommands.length, 8);
    for (let count = 1; count <= 8; count++) {
      const commands = copy(firstCommands.slice(0, count)), input = copy(firstInitial);
      const before = JSON.stringify({input, commands});
      const batch = runtime.apply(input, commands);
      assert.deepEqual(batch, runtime.apply(copy(input), copy(commands)));
      assert.equal(batch.journey.sequence, input.journey.sequence + 1);
      let single = copy(input);
      for (const command of commands) single = runtime.apply(single, [command]);
      assert.equal(single.journey.sequence, input.journey.sequence + count);
      const withoutSequence = state => { const result = copy(state); delete result.journey.sequence; return result; };
      assert.deepEqual(withoutSequence(batch), withoutSequence(single));
      assert.equal(JSON.stringify({input, commands}), before);
    }
  });

  await t.test('invalid command shapes, forbidden engine methods and failed batches are atomic', () => {
    const initial = copy(firstInitial);
    for (const commands of [undefined, null, {}, 'rollInitiative', [], Array(9).fill({method: 'rollInitiative'})])
      refuses(initial, commands, /Commande de parcours refusee/);
    for (const command of [null, false, {}, {method: 'setWinner', args: [0]}, {method: 'setArena', args: ['electro']},
      {method: 'newGame'}, {method: 'start'}, {method: 'recall'}, {method: 'constructor'}, {method: '__proto__'}, {method: 'toString'},
      {method: 'rollInitiative', args: null}, {method: 'rollInitiative', args: {}}, {method: 'rollInitiative', args: '6'},
      {method: 'rollInitiative', args: [0, 1, 2, 3]}]) refuses(initial, [command], /Commande de parcours refusee/);
    for (const value of [true, null, undefined, {}, [], NaN, Infinity, 1.5])
      refuses(initial, [{method: 'lock', args: [value]}], /Commande de parcours refusee/);
    refuses(initial, [{method: 'rollInitiative'}, {method: 'next'}]);
    const acceptedState = runtime.apply(initial, [{method: 'rollInitiative', winner: 0, phase: 'over',
      state: {phase: 'over', winner: 0}, source: {winner: 0}}]);
    assert.deepEqual(acceptedState, runtime.apply(initial, [{method: 'rollInitiative'}]));
    assert.notEqual(acceptedState.phase, 'over');
    assert.equal(acceptedState.winner, null);
    const withoutJourney = copy(initial);
    delete withoutJourney.journey;
    refuses(withoutJourney, [{method: 'rollInitiative'}], /Commande de parcours refusee/);
  });

  await t.test('all dice are runtime-owned: forced initiative, ATK and DEF values are rejected on real legal phases', () => {
    const phases = [['rollInitiative', sample('initiative', false)],
      ['rollAttack', sample('attack', false)], ['rollAttack', sample('attack', true)],
      ['rollDefense', sample('defense', false)], ['rollDefense', sample('defense', true)]];
    for (const [method, state] of phases) {
      for (const forced of [0, 1, 2, 3, 4, 5, 6, 7, '6'])
        refuses(state, [{method, args: [forced]}], /Commande de parcours refusee/);
      refuses(state, [{method, args: [{forced: 6}]}], /Commande de parcours refusee/);
      const a = runtime.apply(state, [{method}]), b = runtime.apply(copy(state), [{method}]);
      assert.deepEqual(a, b, 'Identical saved RNG and legal commands must reproduce the same roll');
    }
    for (const [method, phase] of [['useKalistel', 'kalistel'], ['acceptAttack', 'kalistel'], ['next', 'result']])
      refuses(sample(phase, false), [{method, args: [6]}], /Commande de parcours refusee/);
  });

  await t.test('human phase permissions and replacement ownership are enforced without changing the opponent', () => {
    const initiative = sample('initiative', false);
    for (const method of expectedMethods.filter(method => method !== 'rollInitiative')) refuses(initiative, [{method}]);
    for (const [phase, method] of [['choose', 'rollAttack'], ['attack', 'lock'], ['defense', 'next'],
      ['kalistel', 'deploy'], ['result', 'rollInitiative'], ['replace', 'rollDefense']])
      refuses(sample(phase, false), [{method}]);
    const replacement = sample('replace', false);
    refuses(replacement, [{method: 'autoDeploy', args: [1]}], /Commande de parcours refusee/);
    refuses(replacement, [{method: 'deploy', args: [1, '1-0', 0]}], /Commande de parcours refusee/);
    assert.equal(runtime.apply(replacement, [{method: 'autoDeploy', args: [0]}]).journey.sequence, replacement.journey.sequence + 1);
  });

  await t.test('AI target pairs and Kalistel decision cannot be overridden by a legal-looking client command', () => {
    const choose = sample('choose', true), expected = E.aiChoice(choose);
    const alternatives = choose.players[1].board.flatMap((unit, attacker) => unit ?
      choose.players[0].board.flatMap((target, defender) => target ? [[attacker, defender]] : []) : []);
    const other = alternatives.find(pair => JSON.stringify(pair) !== JSON.stringify(expected));
    assert(other, 'The captured AI choice must expose a genuine alternative');
    assert.equal(runtime.automatic(choose), true);
    refuses(choose, [{method: 'lock', args: other}], /Commande de parcours refusee/);
    refuses(choose, [{method: 'lock', args: [...expected, 6]}], /Commande de parcours refusee/);
    assert.equal(runtime.apply(choose, [{method: 'lock', args: expected}]).journey.sequence, choose.journey.sequence + 1);
    const kalistel = sample('kalistel', true), use = E.aiUseKalistel(kalistel);
    refuses(kalistel, [{method: use ? 'acceptAttack' : 'useKalistel'}], /Commande de parcours refusee/);
    assert.equal(runtime.apply(kalistel, [{method: use ? 'useKalistel' : 'acceptAttack'}]).journey.sequence, kalistel.journey.sequence + 1);
  });

  await t.test('AI support recipients and reserve deployment are fixed by the server policy', () => {
    for (const [phase, [method, aiMethod]] of Object.entries(support)) {
      const state = sample(phase, true), expected = E[aiMethod](state);
      const other = state.players[1].board.filter(Boolean).find(unit => unit.uid !== expected);
      assert(other, phase + ' must have a real alternative ally');
      refuses(state, [{method, args: [other.uid]}], /Commande de parcours refusee/);
      refuses(state, [{method, args: ['0-0']}], /Commande de parcours refusee/);
      assert.equal(runtime.apply(state, [{method, args: [expected]}]).journey.sequence, state.journey.sequence + 1);
    }
    const replace = sample('replace', true);
    refuses(replace, [{method: 'autoDeploy', args: [0]}], /Commande de parcours refusee/);
    refuses(replace, [{method: 'deploy', args: [1, replace.players[1].reserve[0].uid, 0]}], /Commande de parcours refusee/);
    assert.equal(runtime.apply(replace, [{method: 'autoDeploy', args: [1]}]).journey.sequence, replace.journey.sequence + 1);
  });

  await t.test('terminal games cannot accept another command, replay a result or mutate canonical catalogue data', () => {
    const terminal = sample('over', false);
    for (const method of expectedMethods) refuses(terminal, [{method}], /Commande de parcours refusee/);
    assert.equal(JSON.stringify(data), catalogueBefore);
  });

  await t.test('snapshots contain only participants and their arena, detached from later catalogue edits', () => {
    const state = copy(firstInitial), snapshot = state.journey.snapshot;
    const ids = new Set(state.players.flatMap(p => [...p.board.filter(Boolean), ...p.reserve, ...p.dead].map(u => u.cardId)));
    assert.deepEqual(snapshot.cards.map(c => c.id).sort(), [...ids].sort());
    assert.deepEqual(snapshot.arenas.map(a => a.id), [state.arenaId]);
    const published = copy(data), frozen = Combat.freeze(published, state);
    published.cards[0].name = 'Changed after freezing';
    published.elements.ELECTRO.strong_against = 'ELECTRO';
    published.demo.barrier = 0;
    assert.deepEqual(frozen, snapshot);
    const E = Combat.engineFor(data, state);
    assert.equal(E, Combat.engineFor(data, state), 'Reuse the engine for this snapshot and catalogue');
    E.byId[snapshot.cards[0].id].name = 'Only the cached engine copy';
    assert.deepEqual(state.journey.snapshot, snapshot);
    assert.notEqual(snapshot.cards[0].name, E.byId[snapshot.cards[0].id].name);
  });

  await t.test('cosmetic titles and unrelated cards or arenas do not change a running fight', () => {
    const published = copy(data);
    for (const c of published.cards) { c.title = 'New printed title'; c.name = 'Updated name'; }
    published.cards.push({...copy(published.cards[0]), id: '49999998', characterId: 'unrelated-fixture'});
    published.arenas.push({...copy(published.arenas[0]), id: 'unrelated-fixture'});
    const updated = Combat.create(published);
    assert.deepEqual(updated.apply(copy(firstInitial), firstCommands), runtime.apply(copy(firstInitial), firstCommands));
  });

  await t.test('all saved phases keep stats, matrices, rules, AI and summaries after a publication', () => {
    const published = copy(data);
    for (const c of published.cards) {
      c.atk = c.atk.map(v => typeof v === 'number' ? v + 17 : v);
      c.defense = c.defense.map(v => typeof v === 'number' ? v + 11 : v);
    }
    for (const row of Object.values(published.weapons)) for (const key of Object.keys(row)) row[key] += 13;
    for (const e of Object.values(published.elements)) [e.strong_against, e.weak_against] = [e.weak_against, e.strong_against];
    for (const arena of published.arenas) { arena.elementBonus = 0; arena.homeAttack = 0; arena.homeDefense = 0; }
    published.rules = {...published.rules, barrier: 0};
    published.demo = {...published.demo, barrier: 0, synergy: [0, 0, 0, 0, 0, 0], max_turns: 1};
    // Resume mode must still honor each state's snapshot, not the constructor's data.
    const updated = Combat.create(published, {resume: true});
    for (const saved of samples.values()) {
      const state = copy(saved), before = JSON.stringify(state);
      const frozen = Combat.engineFor(published, state), old = Combat.engineFor(data, state);
      assert.deepEqual(frozen.matchStats(state), old.matchStats(state));
      assert.deepEqual(frozen.restoreGame(copy(state)), state);
      assert.equal(updated.automatic(state), runtime.automatic(state));
      if (state.phase !== 'over') {
        const command = commandFor({engine: old}, state);
        assert.deepEqual(updated.apply(state, [command]), runtime.apply(state, [command]), state.phase);
      }
      assert.equal(JSON.stringify(state), before);
    }
    const state = copy(firstInitial), element = state.journey.snapshot.cards.find(c => c.element !== 'NONE').element;
    delete published.elements[element];
    assert.doesNotThrow(() => Combat.engineFor(published, state).assertState(state), 'Historical matrices validate historical cards');
  });

  await t.test('snapshot caching never bypasses catalogue identity checks or accepts invalid profiles', () => {
    const state = copy(firstInitial);
    Combat.engineFor(data, state);
    const changed = copy(data);
    changed.cards.find(c => c.id === state.journey.snapshot.cards[0].id).characterId = 'different-character';
    assert.throws(() => Combat.engineFor(changed, state), /Profils historiques/);
    const malformed = copy(state);
    malformed.journey.snapshot.cards[0].atk = [99999];
    assert.throws(() => Combat.engineFor(data, malformed));
  });

  await t.test('adding the migration snapshot preserves every naturally reached legacy phase', () => {
    const withoutSnapshot = value => { const next = copy(value); delete next.journey.snapshot; return next; };
    for (const state of samples.values()) {
      const legacy = withoutSnapshot(state);
      assert.deepEqual(E.matchStats(legacy), Combat.engineFor(data, state).matchStats(state));
      if (state.phase === 'over') continue;
      const command = commandFor(runtime, legacy);
      assert.deepEqual(withoutSnapshot(runtime.apply(state, [command])), runtime.apply(legacy, [command]), state.phase);
    }
  });
});
