'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const Engine = require('./engine.js'), Combat = require('./journey-combat.js'), Composition = require('./team-composition.js');
const oldData = require('../deploy/journey-legacy-4.6.85.json');
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const copy = value => structuredClone(value);

function fixture() {
  const runtime = Combat.create(oldData), team = Composition.create(runtime.engine).fromPreset({name: 'Frozen UI', cards: oldData.decks.player});
  const state = runtime.initial({id: '00000000-0000-4000-8000-000000000001', localProfile: 'user-ui-test',
    bookId: runtime.books[0].id, revision: runtime.books[0].revision, stage: 0, seed: 'frozen-ui', deck: team,
    cards: team.cards.map((modelId, i) => ({modelId, id: 'KC-' + String(i + 1).padStart(32, '0')}))});
  runtime.engine.rollInitiative(state, [6, 1]);
  assert.equal(state.phase, 'choose');
  return state;
}

function changedCatalogue() {
  const data = copy(oldData);
  for (const c of data.cards) {
    c.name = 'Published name ' + c.id; c.title = 'Published title ' + c.id;
    c.atk = c.atk.map(v => typeof v === 'number' ? v + 37 : v);
    c.defense = c.defense.map(v => typeof v === 'number' ? v + 19 : v);
    c.faction = 'New faction ' + c.id; c.race = 'New race ' + c.id;
    c.positions = [1, 2, 3, 4, 5]; c.pngUrl = 'published-' + c.id + '.png';
  }
  for (const row of Object.values(data.weapons)) for (const key of Object.keys(row)) row[key] += 23;
  for (const e of Object.values(data.elements)) { e.strong_against = e.id; e.weak_against = e.id; e.color = 'A1B2C3'; e.label = 'Published crystal ' + e.id; }
  for (const a of data.arenas) { a.name = 'Published arena ' + a.id; a.image = 'published-arena.png'; a.elementBonus = 0; a.homeAttack = 0; a.homeDefense = 0; }
  data.demo = {...data.demo, barrier: 11, synergy: [0, 0, 17, 31, 47, 59]};
  data.cards.push({...copy(data.cards.find(c => c.id === data.decks.player[0])), id: '49999998', characterId: 'new-ui-character'});
  data.arenas.push({...copy(data.arenas[0]), id: 'new-ui-arena', name: 'New arena'});
  return data;
}

// Exercise actual app render functions without opening personal storage or Auth.
function functionSource(name) {
  const start = app.search(new RegExp('^  (?:async )?function ' + name + '\\(', 'm'));
  assert(start >= 0, name);
  const lineEnd = app.indexOf('\n', start), first = app.slice(start, lineEnd);
  return first.endsWith('}') ? first : app.slice(start, app.indexOf('\n  }', lineEnd) + 4);
}

function contextFor(data) {
  const nodes = new Map(), modals = [], properties = {};
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {open: false, innerHTML: '', dataset: {}, classList: {add() {}, remove() {}},
      style: {setProperty: (key, value) => { properties[key] = value; }}, querySelector: () => null, querySelectorAll: () => [], close() {}});
    return nodes.get(selector);
  };
  const ctx = vm.createContext({structuredClone, clearTimeout, console, addEventListener() {},
    KALISTAR_DATA: data, KalistarEngine: Engine, KalistarJourneyCombat: Combat,
    KalistarCatalogue: {versionStrip: () => 'catalogue-versions', career: () => ''},
    KalistarCatalogueUpdates: {create: () => ({})}, updateCatalogueNotice() {},
    KalistarCollaborations: {asset: (group, name) => group + '/' + name},
    KalistarSite: {url: value => value}, KalistarCardMedia: {image: (c, kind) => (kind === 'art' ? 'art/' : '') + c.pngUrl},
    KalistarPositions: require('./positions.js'), KalistarAI: require('./ai-strategies.js'),
    KalistarPerformanceIndex: require('./performance-index.js'), KalistarMatchMetrics: require('./match-metrics.js'),
    KalistarTrophies: require('./trophies.js'), KalistarBattleReport: require('./battle-report.js'),
    KalistarUltimateUI: {canTarget: () => false, modifiers: () => [], total: () => 0},
    KalistarEquipment: require('./equipment.js'), KalistarWeapons: require('./weapons.js'),
    KalistarEquipmentFX: {art: w => w.art, mountDetail() {}},
    KalistarWeaponCards: {markup: w => w.name, effectLabel: w => w.condition},
    KalistarFinale: require('./arena-finale.js'),
    ui: {view: 'arena', attacker: 0, target: 1, detail: null, replacementSlot: null},
    document: {querySelector: node, createElement: () => ({innerHTML: '', querySelectorAll: () => []})},
    matchMedia: () => ({matches: false}), innerWidth: 1440, innerHeight: 1000,
    modal: (id, html) => { node('#' + id).innerHTML = html; modals.push(html); }, head: title => '<h1>' + title + '</h1>',
    phoneLayout: () => false, presentationOpening: false, boardScale: 100, icons() {},
    ownershipBanner: () => '', collectionDB: () => null, favorites: new Set(),
    teamDraft: null, pendingLineup: null, enemyPresetId: 'enemy', accountId: 'user-ui-test',
    save() {}, persist() {}, cancelLineup() {}, load: (key, fallback) => fallback,
    KalistarLocalDB: {validateGame: state => state}
  });
  ctx.window = ctx;
  const start = app.indexOf('  const data=window.KALISTAR_DATA');
  const end = app.indexOf('  if(connectedAccess){cloudPlayer=');
  vm.runInContext(app.slice(start, end), ctx, {filename: 'app.js:combat-context'});
  for (const name of ['bonusDetails', 'showDetail', 'arenaRule', 'matchArenaSummary', 'buffs', 'traitBadge', 'reserveTrait',
    'canDeployReserve', 'arenaCardPrompt', 'board', 'sideHeading', 'dice', 'consoleParticipants', 'syncConsole', 'recapRow',
    'equipmentRows', 'detailEquipment', 'syncDetailEquipment', 'equippedCard', 'scoreTotals', 'previewRecap', 'duelRecap',
    'duelAction', 'consoleBody', 'reserveZone', 'replacementSlot', 'weaponMatchupGrid', 'showCombatReference', 'arena', 'showArchive', 'createGame'])
    vm.runInContext(functionSource(name), ctx, {filename: 'app.js:' + name});
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'match-report.js'), 'utf8'), ctx, {filename: 'match-report.js'});
  return {ctx, modals, properties, node,
    setGame: state => { ctx.inputState = copy(state); vm.runInContext('game=inputState', ctx); },
    engine: vm.runInContext('E', ctx), game: () => vm.runInContext('game', ctx),
    run: code => vm.runInContext(code, ctx)};
}

test('combat cards, synergies, dice, arena and weapon/element matrices render the saved edition', () => {
  const state = fixture(), current = contextFor(changedCatalogue()), baseline = contextFor(copy(oldData));
  current.setGame(state); baseline.setGame(state);
  const before = JSON.stringify(current.game());
  for (const expression of ['board(0)', 'board(1)', 'dice(0)', 'dice(1)', 'previewRecap(game)', 'consoleBody(game)',
    'reserveZone(0)', 'arena()', 'arenaRule(matchArena(game),matchData(game))', 'weaponMatchupGrid(matchEngine(game).card(game.players[0].board[0]).weapon)'])
    assert.equal(current.run(expression), baseline.run(expression), expression);
  for (const kind of ['elements', 'weapons']) {
    current.ctx.showCombatReference(kind); baseline.ctx.showCombatReference(kind);
    assert.equal(current.modals.at(-1), baseline.modals.at(-1), kind);
  }
  current.ctx.syncConsole(current.game()); baseline.ctx.syncConsole(baseline.game());
  assert.deepEqual(current.properties, baseline.properties);
  assert.equal(JSON.stringify(current.game()), before, 'Rendering cannot mutate state or RNG');
  assert(app.includes('requestTimeoutMs:60000'));
});

test('pending numerical duel and explicit non-active state use their own frozen calculations', () => {
  const state = fixture(), E = Combat.engineFor(oldData, state);
  const attacker = state.players[state.turn].board.findIndex(u => E.card(u).atk.some(Number.isFinite));
  E.lock(state, attacker, 1);
  const die = 6 - E.card(state.players[state.turn].board[attacker]).atk.findIndex(Number.isFinite);
  E.rollAttack(state, die);
  assert.equal(typeof state.duel.attackValue, 'number');
  const a = contextFor(changedCatalogue()), b = contextFor(copy(oldData));
  a.setGame(fixture()); b.setGame(fixture());
  assert.equal(a.ctx.duelRecap(state), b.ctx.duelRecap(state));
  const other = copy(state);
  other.journey.snapshot.weapons[E.card(state.players[state.turn].board[attacker]).weapon][E.card(state.players[1-state.turn].board[1]).weapon] = 999;
  assert.notEqual(a.ctx.duelRecap(other), a.ctx.duelRecap(state), 'Use the supplied state, not the active game');
});

test('arena and reserve detail keep frozen faces and affinities; Collection and Deck details stay current', () => {
  const state = fixture(), published = changedCatalogue(), a = contextFor(published), b = contextFor(copy(oldData));
  a.setGame(state); b.setGame(state);
  for (const unit of [state.players[0].board[0], state.players[0].reserve[0]]) {
    const context = {side: 0, uid: unit.uid};
    a.ctx.showDetail(unit.cardId, false, context); b.ctx.showDetail(unit.cardId, false, context);
    assert.equal(a.modals.at(-1), b.modals.at(-1));
    assert(!a.modals.at(-1).includes('Published title'));
    a.ctx.showDetail(unit.cardId, false, {source: 'arena'}); b.ctx.showDetail(unit.cardId, false, {source: 'arena'});
    assert.equal(a.modals.at(-1), b.modals.at(-1), 'Reserve preview callback');
    a.ctx.showDetail(unit.cardId);
    assert(a.modals.at(-1).includes('Published title ' + unit.cardId));
    a.ctx.ui.view = 'decks'; a.ctx.teamDraft = {equipment: require('./equipment.js').emptyLoadout()};
    a.ctx.showDetail(unit.cardId, false, {source: 'deck'});
    assert(a.modals.at(-1).includes('Published title ' + unit.cardId));
    a.ctx.ui.view = 'arena';
  }
  a.ctx.showArchive(0, 'reserve');
  const reserve = state.players[0].reserve[0];
  assert(a.modals.at(-1).includes('data-id="' + reserve.cardId + '" data-side="0" data-uid="' + reserve.uid + '"'));
});

test('reserve eligibility uses saved positions, not newly broadened catalogue positions', () => {
  const state = fixture(), a = contextFor(changedCatalogue()), E = Combat.engineFor(oldData, state);
  state.phase = 'replace'; state.replacing = 0;
  const unit = state.players[0].reserve.find(u => E.card(u).positions.length < 5);
  const slot = [1, 2, 3, 4, 5].find(p => !E.card(unit).positions.includes(p)) - 1;
  state.players[0].board[slot] = null;
  a.setGame(state);
  assert(a.engine.card(unit).positions.includes(slot + 1));
  assert.equal(a.ctx.canDeployReserve(0, unit.uid, slot), false);
});

test('detail without an instance never borrows equipment from an ambiguous matching model', () => {
  const a = contextFor(changedCatalogue()), state = fixture(), unit = state.players[0].reserve[0];
  const opponent = state.players[1].board[0]; opponent.cardId = unit.cardId;
  a.setGame(state);
  const seen = [], engine = {equipmentViews: (s, u) => { seen.push(u.uid); return [u.uid]; }};
  a.ctx.KalistarJourneyCombat = {engineFor: () => engine};
  const card = {id: unit.cardId};
  assert.equal(a.ctx.detailEquipment(card, {source: 'arena'}).length, 0);
  assert.deepEqual(seen, []);
  for (const u of [unit, opponent]) {
    assert.equal(a.ctx.detailEquipment(card, {source: 'arena', uid: u.uid})[0], u.uid);
    assert.equal(seen.at(-1), u.uid);
  }
});

test('reports and their detail use engineFor even when supplied archive profiles are newer or incomplete', () => {
  const state = fixture(), published = changedCatalogue(), a = contextFor(published), b = contextFor(copy(oldData));
  a.setGame(fixture()); b.setGame(fixture());
  for (const tab of ['lineup', 'battle', 'teams', 'awards', 'definitions']) {
    const stale = {tab, profiles: [], arenas: [], rules: {version: 'wrong'}};
    assert.equal(a.ctx.KalistarMatchReport.render(state, stale), b.ctx.KalistarMatchReport.render(state, {tab}), tab);
  }
  const unit = state.players[0].board[0], context = {matchState: state, instanceId: unit.instanceId, profile: published.cards.find(c => c.id === unit.cardId)};
  a.ctx.showDetail(unit.cardId, false, context); b.ctx.showDetail(unit.cardId, false, context);
  assert.equal(a.modals.at(-1), b.modals.at(-1));
  assert(!a.modals.at(-1).includes('Published title'));
  const ordinary = copy(state); delete ordinary.journey;
  const archive = {profiles: state.journey.snapshot.cards, arenas: state.journey.snapshot.arenas, rules: state.journey.snapshot.demo};
  const html = a.ctx.KalistarMatchReport.render(ordinary, archive);
  assert(html.includes(oldData.cards.find(c => c.id === unit.cardId).title), 'Non-Journey archive fallback retained');
});

test('catalogue lookups and createGame still accept unrelated published cards/arenas while a frozen game is open', async () => {
  const published = changedCatalogue(), a = contextFor(published), state = fixture();
  state.journey.preview = true;
  a.setGame(state);
  assert.equal(a.engine.byId['49999998'].characterId, 'new-ui-character');
  assert.equal(a.run('matchEngine(game).byId["49999998"]'), undefined);
  const Team = Composition.create(a.engine), ids = published.decks.player.slice(); ids[0] = '49999998';
  const team = Team.fromPreset({name: 'New published deck', cards: ids});
  assert.deepEqual(a.engine.validateComposition(team), []);
  a.ctx.Team = Team; a.ctx.deckErrors = t => a.engine.validateComposition(t); a.ctx.matchOpponentByChoice = () => team;
  const saved = [];
  a.ctx.testDB = {idle: async () => {}, saveGame: async state => saved.push(state), registry: {bindGame: (id, state) => state, releaseGame: async () => {}}};
  a.run('db=testDB');
  await a.ctx.createGame('local', 'current-catalogue', 'new-ui-arena', 'enemy', team);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].arenaId, 'new-ui-arena');
  assert(saved[0].players[0].board.concat(saved[0].players[0].reserve).some(u => u.cardId === '49999998'));
  assert.equal(saved[0].journey, undefined);
  assert(a.ctx.matchArenaSummary('new-ui-arena').includes('New arena'));
  // The existing state-first wrapper must still record mutating Journey commands.
  a.ctx.commands = []; a.run('journeyCommands=commands');
  const initial = Combat.create(oldData).engine.clone(state); initial.phase = 'choose'; delete initial.journey.preview;
  a.engine.lock(initial, 0, 1);
  assert.equal(a.ctx.commands.length, 1);
  assert.equal(a.ctx.commands[0].method, 'lock');
});
