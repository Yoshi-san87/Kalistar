'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {pathToFileURL} = require('node:url');
const {createRequire} = require('node:module');
const requireRuntime = createRequire(path.join(process.env.KALISTAR_CLOUD_MODULES ||
  path.resolve(__dirname, '../../../work/supabase-runtime/node_modules'), '_journeys_test.cjs'));
const {PGlite} = requireRuntime('@electric-sql/pglite');
const {pgcrypto} = requireRuntime('@electric-sql/pglite/contrib/pgcrypto');
const Combat = require('../../site/journey-combat.js');
const Composition = require('../../site/team-composition.js');
const {buildCatalog} = require('../../atelier/game-catalog.cjs');
const published = require('../../donnees/catalogue.json').cards.filter(card => card.kind === 'created');
const ids = Array.from({length: 4}, (_, i) => '00000000-0000-4000-8000-' + String(i + 101).padStart(12, '0'));
const devices = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
const profiles = ['user-paris', 'user-tokyo'];
// Disposable fixture key, never read from an environment variable or live service.
const TEST_KEY = 'journey-test-only-HMAC-key-not-a-production-secret-20261016';
const expectedBooks = {
  'momo-petits-bonheurs': '30000001',
  'balmhyr-retour': '49900802',
  'kaylis-prochain-pas': '49055457'
};
const sql = {
  library: 'select public.kalistar_journey_library()',
  start: 'select public.kalistar_journey_start($1,$2,$3,$4)',
  context: 'select public.kalistar_journey_context($1,$2)',
  commit: 'select public.kalistar_journey_commit($1,$2,$3)',
  abandon: 'select public.kalistar_journey_abandon($1,$2)',
  claim: 'select public.kalistar_journey_claim($1)',
  ack: 'select public.kalistar_journey_ack($1)'
};
const tables = ['kalistar_private.journey_config', 'kalistar_private.journeys',
  'kalistar_private.journey_progress', 'kalistar_private.journey_attempts', 'kalistar_private.journey_claims',
  'public.kalistar_collectibles', 'public.kalistar_transfers', 'kalistar_private.activations', 'kalistar_private.events'];
const copy = value => JSON.parse(JSON.stringify(value));
const errorCode = (code, constraint) => error => {
  assert.equal(error.code, code);
  if (constraint) assert.equal(error.constraint, constraint);
  return true;
};

function commandFor(E, state, policy = 0, step = 0) {
  if (E.equipmentChoice(state)) return {method: 'grantEquipment', args: [E.aiEquipmentChoice(state)]};
  if (state.phase === 'initiative') return {method: 'rollInitiative'};
  if (state.phase === 'choose') {
    let pair = E.aiChoice(state);
    if (state.turn === 0 && policy) {
      const pairs = state.players[0].board.flatMap((unit, a) => unit ?
        state.players[1].board.flatMap((target, b) => target ? [[a, b]] : []) : []);
      if (policy === 1) pairs.sort((a, b) => {
        const score = p => E.mean(E.card(state.players[0].board[p[0]]).atk) - E.mean(E.card(state.players[1].board[p[1]]).defense);
        return score(a) - score(b);
      });
      pair = pairs[policy === 1 ? 0 : (step * (policy + 1) + policy * 7) % pairs.length];
    }
    return {method: 'lock', args: pair};
  }
  if (state.phase === 'attack') return {method: 'rollAttack'};
  if (state.phase === 'defense') return {method: 'rollDefense'};
  if (state.phase === 'kalistel') return {method: E.aiUseKalistel(state) ? 'useKalistel' : 'acceptAttack'};
  if (state.phase === 'replace') return {method: 'autoDeploy', args: [state.replacing]};
  if (state.phase === 'result') return {method: 'next'};
  const kind = {clover: 'Clover', potion: 'Potion', physical: 'Physical', heart: 'Reraise', guard: 'Guard'}[state.phase];
  assert(kind, 'Unhandled real engine phase: ' + state.phase);
  return {method: 'grant' + kind, args: [E['ai' + kind + 'Choice'](state)]};
}

function realTerminal(runtime, initial, wantedWinner) {
  // Explore legal player choices against the actual seeded opponent, without
  // changing cards, RNG, health, winner or match rules. Only the final engine
  // transition is a JourneyCombat batch; intermediate engine turns are local
  // fixture computation, not claims of a full HTTP command-transcript test.
  const E = runtime.engine;
  const policies = wantedWinner === 0 ? [0, ...Array.from({length: 24}, (_, i) => i + 1)] :
    [1, 0, ...Array.from({length: 23}, (_, i) => i + 2)];
  for (const policy of policies) {
    let state = E.restoreGame(copy(initial));
    for (let step = 0; step < 4000 && state.phase !== 'over'; step++) {
      const command = commandFor(E, state, policy, step);
      const before = ['next', 'autoDeploy', 'deploy'].includes(command.method) ? E.clone(state) : null;
      E[command.method](state, ...(command.args || []));
      E.assertState(state);
      if (state.phase === 'over' && state.winner === wantedWinner) {
        assert(before, 'A terminal transition must come from the real replacement/next logic');
        state = runtime.apply(before, [command]);
        assert.equal(state.phase, 'over');
        assert.equal(state.winner, wantedWinner);
        assert.equal(state.journey.sequence, initial.journey.sequence + 1);
        assert(state.match.events.length > 0);
        return state;
      }
    }
  }
  assert.fail('No real engine outcome for winner ' + wantedWinner + ' in bounded fixture search: ' + initial.journey.bookId);
}

test('journeys: real migrations 001-009, signed engine outcomes, Worker and account isolation', async t => {
  const data = await buildCatalog({published});
  const runtime = Combat.create(data);
  const team = Composition.create(runtime.engine).fromPreset({name: 'Journey fixture', cards: data.decks.player});
  // Approved, unmodified catalogue cards, not inflated fixture statistics.
  const winningTeam = Composition.create(runtime.engine).fromPreset({name: 'Journey victories', cards: [
    '49700117', '49902826', '49902821', '49902804', '49902007',
    '49800305', '49900601', '49901009', '49901021', '49901101'
  ]});
  const runtimeHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../../site/journey-combat.js')))
    .update(JSON.stringify(data)).digest('hex');
  const {signFrame, entropyState, journeyRequest} = await import(pathToFileURL(path.join(__dirname, '../journey-worker.mjs')).href);
  const db = new PGlite({extensions: {pgcrypto}});
  t.after(() => db.close());
  const query = (statement, args = []) => db.query(statement, args);
  const value = async (statement, args = []) => Object.values((await query(statement, args)).rows[0])[0];
  const root = () => db.exec('reset role');
  const as = async (index, role = 'authenticated') => {
    await root();
    await query("select set_config('request.jwt.claim.sub',$1,false)", [index === null ? '' : ids[index]]);
    await query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({
      sub: index === null ? null : ids[index], role, user_metadata: {isAdmin: true, localProfile: 'user-paris'}
    })]);
    assert(['authenticated', 'anon'].includes(role));
    await db.exec('set role ' + role);
  };
  const denied = (statement, args = [], code = '42501', constraint) =>
    assert.rejects(query(statement, args), errorCode(code, constraint));
  const snapshot = async () => {
    await root();
    const result = {};
    for (const table of tables) result[table] = await value(
      "select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from " + table + ' r');
    return result;
  };
  const library = async actor => { await as(actor); return value(sql.library); };
  const bookView = async (actor, bookId) => (await library(actor)).books.find(book => book.id === bookId);
  const owned = async (actor, modelId) => {
    await root();
    return value("select count(*)::int from public.kalistar_collectibles where owner_id=$1 and model_id=$2 and status='owned'", [ids[actor], modelId]);
  };
  const frameFor = (attempt, state) => JSON.stringify({attemptId: attempt.id, actorId: attempt.actorId,
    runtimeHash: attempt.runtimeHash, sequence: state.journey.sequence, state});
  const commit = async (actor, attempt, state) => {
    const frame = frameFor(attempt, state), signature = await signFrame(frame, TEST_KEY);
    await as(actor);
    return value(sql.commit, [frame, signature, devices[actor]]);
  };
  const enableLease = async actor => {
    await as(actor);
    const current = await value('select public.kalistar_sync_read()');
    assert.equal((await value('select public.kalistar_sync_claim($1,$2,true)', [devices[actor], current.revision])).ok, true);
    const payload = {schema: 1, edition: 'V4', localProfile: profiles[actor], preferences: {},
      deckLibrary: {schema: 2, edition: 'V4', decks: []}, equipment: {id: profiles[actor]},
      matches: [], activeMatchId: null, releasedMatches: []};
    assert.equal((await value('select public.kalistar_sync_write($1,$2,$3)',
      [devices[actor], current.revision, JSON.stringify(payload)])).ok, true);
  };

  await db.exec(`create schema auth; create schema extensions; create role anon; create role authenticated;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,email text,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`);
  for (let i = 0; i < ids.length; i++) await query('insert into auth.users values($1,$2,$3,$4)',
    [ids[i], i === 3 ? null : new Date().toISOString(), 'journey-fixture-' + i + '@example.invalid',
      JSON.stringify({isAdmin: true, localProfile: 'user-paris'})]);
  const migrations = fs.readdirSync(path.join(__dirname, 'migrations')).filter(name => /^20261016000[1-9]_.*\.sql$/.test(name)).sort();
  assert.equal(migrations.length, 9);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'migrations', '202610160008_journeys.sql')))
    .digest('hex'), '2ef9544a90aaf06654d1fda39b1cdb2475763061b591e98302b82f0b04675318');
  for (const migration of migrations) await db.exec(fs.readFileSync(path.join(__dirname, 'migrations', migration), 'utf8'));
  for (const i of [0, 1, 3]) await query(`insert into kalistar_private.players(user_id,email_sha256,local_profile,label)
    values($1,extensions.digest($2,'sha256'),$3,$4)`, [ids[i], 'journey-fixture-' + i + '@example.invalid',
    profiles[i] || 'user-unconfirmed', ['Paris', 'Tokyo', '', 'Unconfirmed'][i]]);
  for (const actor of [0, 1]) {
    await as(actor);
    await value('select public.kalistar_set_profile($1,$2,false)', ['journey_fixture_' + actor, 'Fixture ' + actor]);
  }
  await root();
  const metadata = data.cards.map(card => ({id: card.id, character_id: card.characterId, name: card.name,
    title: card.title, positions: card.positions, element: card.element}));
  await query(`insert into public.kalistar_models(id,character_id,name,title,positions,element)
    select * from jsonb_to_recordset($1) as m(id text,character_id text,name text,title text,positions smallint[],element text)
    on conflict(id) do update set positions=excluded.positions,element=excluded.element`, [JSON.stringify(metadata)]);
  for (const actor of [0, 1]) for (const modelId of new Set([...team.cards, ...winningTeam.cards])) await query(`
    insert into public.kalistar_collectibles(model_id,owner_id,status,pilot,activated_at)
    values($1,$2,'owned',false,clock_timestamp())`, [modelId, ids[actor]]);
  // Root-only, test database only: neither HTTP metadata nor a browser RPC can install these.
  await query('insert into kalistar_private.journey_config(id,signing_key) values(true,$1)', [TEST_KEY]);
  await query('insert into kalistar_private.admins(user_id) values($1)', [ids[0]]);

  const calls = [];
  const argumentsFor = {
    library: () => [], start: a => [a.p_book_id, JSON.stringify(a.p_deck), a.p_device_id, a.p_runtime_hash],
    context: a => [a.p_attempt_id, a.p_device_id], commit: a => [a.p_frame, a.p_signature, a.p_device_id],
    abandon: a => [a.p_attempt_id, a.p_device_id], claim: a => [a.p_book_id], ack: a => [a.p_book_id]
  };
  const fetcher = async (input, init) => {
    const url = new URL(input);
    assert.equal(init.method, 'POST');
    const match = /^\/rest\/v1\/rpc\/kalistar_journey_([a-z]+)$/.exec(url.pathname);
    assert(match && Object.hasOwn(argumentsFor, match[1]), 'Unexpected fetch: ' + url.pathname);
    const token = new Headers(init.headers).get('Authorization');
    const actor = ['Bearer test-only-paris', 'Bearer test-only-tokyo'].indexOf(token);
    if (actor < 0) return new Response(JSON.stringify({message: 'Fixture Auth refused'}), {status: 401});
    const action = match[1], args = JSON.parse(init.body);
    calls.push({actor, action, args});
    await as(actor);
    try {
      let result = await value(sql[action], argumentsFor[action](args));
      if (action === 'start' && result.state === null) {
        // Controlled entropy belongs only to this root-owned disposable fixture.
        // The Worker still initializes and signs the actual engine's state.
        const seed = 'test-only-journey:' + actor + ':' + result.bookId + ':' + result.stage;
        await root();
        await query('update kalistar_private.journey_attempts set seed=$2 where id=$1 and state is null', [result.id, seed]);
        await as(actor);
        result = await value(sql.context, [result.id, devices[actor]]);
      }
      return new Response(JSON.stringify(result), {status: 200});
    }
    catch (error) { return new Response(JSON.stringify({message: error.message, code: error.code}), {status: error.code === '42501' ? 403 : 409}); }
  };
  const env = {KALISTAR_JOURNEY_KEY: TEST_KEY, ASSETS: {fetch: async request => {
    assert.equal(new URL(request.url).pathname, '/jeu/catalogue.json');
    return new Response(JSON.stringify(data));
  }}};
  const worker = async (actor, action, input = {}, options = {}) => {
    const method = options.method || 'POST';
    const headers = {'Content-Type': 'application/json', Origin: options.origin || 'https://journey-fixture.invalid',
      Authorization: options.token || ['Bearer test-only-paris', 'Bearer test-only-tokyo'][actor]};
    const request = new Request('https://journey-fixture.invalid/api/journeys/' + action,
      {method, headers, ...(method === 'GET' ? {} : {body: JSON.stringify(input)})});
    const response = await journeyRequest(request, env, fetcher, {Combat, Composition, hash: runtimeHash});
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    return {status: response.status, body: await response.json()};
  };
  const start = async (actor, bookId, extra = {}) => {
    const result = await worker(actor, 'start', {bookId, deck: team, deviceId: devices[actor], ...extra});
    assert.equal(result.status, 200, JSON.stringify(result.body));
    return result.body.attempt;
  };

  await t.test('historical schema keeps its four stages and original receipts within the extended runtime', async () => {
    await root();
    assert.equal(await value('select version from kalistar_private.registry_version'), 8);
    const books = (await query('select id,revision,reward_model_id,stage_count,enabled from kalistar_private.journeys order by id')).rows;
    assert.equal(books.length, 3);
    assert.equal(runtime.books.length, 3);
    for (const book of books) {
      assert.equal(book.stage_count, 4);
      assert.equal(book.enabled, true);
      assert.equal(book.reward_model_id, expectedBooks[book.id]);
      const definition = runtime.books.find(item => item.id === book.id);
      assert.equal(definition.revision, book.revision);
      assert.equal(definition.stages.length, 7);
      const originalStages=definition.stages.slice(0,book.stage_count);
      assert.equal(new Set(originalStages.map(stage => stage.id)).size, 4);
      assert(originalStages.every(stage=>!stage.rewardEquipmentId));
      // Schema 8 receipts stay exact; current definitions use the author-approved prints.
      if(book.id==='momo-petits-bonheurs')assert.equal(definition.rewardModelId,'30000014');
      else if(book.id==='balmhyr-retour')assert.equal(definition.rewardModelId,'30000007');
      else assert.equal(definition.rewardModelId,book.reward_model_id);
    }
    for (const actor of [0, 1]) assert((await library(actor)).books.every(book => book.cleared === 0 && !book.completed && !book.claimed));
  });

  await t.test('Paris admin is a DB grant, Tokyo is not admin despite forged Auth metadata', async () => {
    await as(0);
    assert.equal(await value('select current_user'), 'authenticated');
    assert.equal((await value('select public.kalistar_me()')).isAdmin, true);
    assert.equal((await library(0)).isAdmin, true);
    assert.equal((await library(1)).isAdmin, false);
    assert.equal((await value('select public.kalistar_me()')).isAdmin, false);
    await denied('insert into kalistar_private.admins(user_id) values($1)', [ids[1]]);
    await root();
    await query('delete from kalistar_private.admins where user_id=$1', [ids[0]]);
    assert.equal((await library(0)).isAdmin, false);
    await root();
    await query('insert into kalistar_private.admins(user_id) values($1)', [ids[0]]);
  });

  await t.test('anonymous, outsider and unconfirmed accounts cannot call any journey RPC; no private/direct writes', async () => {
    const state = await snapshot();
    const examples = {library: [], start: ['momo-petits-bonheurs', JSON.stringify(team), devices[0], runtimeHash],
      context: [ids[0], devices[0]], commit: ['{}', '0'.repeat(64), devices[0]], abandon: [ids[0], devices[0]],
      claim: ['momo-petits-bonheurs'], ack: ['momo-petits-bonheurs']};
    for (const [actor, role] of [[null, 'anon'], [0, 'anon'], [null, 'authenticated'], [2, 'authenticated'], [3, 'authenticated']]) {
      await as(actor, role);
      for (const [action, args] of Object.entries(examples)) await denied(sql[action], args);
    }
    for (const role of ['anon', 'authenticated']) {
      await as(role === 'anon' ? null : 1, role);
      for (const table of tables) {
        if (table.startsWith('kalistar_private.')) await denied('select * from ' + table);
        await denied('insert into ' + table + ' default values');
        await denied('delete from ' + table);
      }
      await denied('update kalistar_private.journey_progress set cleared=4');
      await denied('update public.kalistar_collectibles set owner_id=$1', [ids[1]]);
      await denied('select kalistar_private.journey_view($1,$2)', [ids[0], ids[0]]);
    }
    assert.deepEqual(await snapshot(), state);
  });

  await t.test('start/context/commit require the actual sync writer lease, with expiry and wrong-device refusal', async () => {
    await as(0);
    await denied(sql.start, ['momo-petits-bonheurs', JSON.stringify(team), devices[0], runtimeHash]);
    await enableLease(0);
    await enableLease(1);
    await as(0);
    await denied(sql.start, ['momo-petits-bonheurs', JSON.stringify(team), devices[1], runtimeHash]);
    await denied(sql.start, ['momo-petits-bonheurs', JSON.stringify(team), null, runtimeHash]);
    await denied(sql.context, [ids[0], devices[1]]);
    await denied(sql.commit, ['{}', '0'.repeat(64), devices[1]]);
    await root();
    await query("update kalistar_private.player_saves set lease_until=clock_timestamp()-interval '1 second' where user_id=$1", [ids[0]]);
    await as(0);
    await denied(sql.start, ['momo-petits-bonheurs', JSON.stringify(team), devices[0], runtimeHash]);
    await enableLease(0);
    await root();
    assert.equal(await value('select count(*)::int from kalistar_private.journey_attempts'), 0);
    assert.equal(await value('select count(*)::int from kalistar_private.player_saves where payload is not null and lease_until>clock_timestamp()'), 2);
  });

  await t.test('no claim before four wins, no unknown book, invalid hash or unowned deck', async () => {
    for (const actor of [0, 1]) {
      await as(actor);
      for (const bookId of Object.keys(expectedBooks)) await denied(sql.claim, [bookId]);
      await denied(sql.start, ['missing-book', JSON.stringify(team), devices[actor], runtimeHash], '22023');
      await denied(sql.start, ['momo-petits-bonheurs', JSON.stringify(team), devices[actor], 'bad-hash'], '22023');
      await denied(sql.start, ['momo-petits-bonheurs', JSON.stringify({...team, cards: []}), devices[actor], runtimeHash], '22023');
    }
    const unavailable = Composition.create(runtime.engine).fromPreset({name: 'Unowned fixture', cards: runtime.books[1].stages[3].deck});
    await as(1);
    await denied(sql.start, ['balmhyr-retour', JSON.stringify(unavailable), devices[1], runtimeHash]);
  });

  await t.test('009 bounds direct RPC decks: 2 MiB, unexpected keys, missing fields and malformed nested values never get stored', async () => {
    const invalid = [null, [], 'not-an-object', {...team, ignoredClientField: 'x'.repeat(2 * 1024 * 1024)},
      {...team, name: 'x'.repeat(2 * 1024 * 1024)}, {...team, winner: 0}, {...team, state: {winner: 0}},
      {...team, name: 'bad\nname'}, {...team, name: 'x'.repeat(51)}, {...team, name: null},
      {...team, cards: {}}, {...team, cards: [...team.cards, team.cards[0]]},
      {...team, cards: team.cards.map((id, i) => i ? id : null)},
      {...team, cards: team.cards.map((id, i) => i ? id : 'not-a-model')},
      {...team, cards: team.cards.map((id, i) => i ? id : team.cards[1])},
      {...team, formation: {}}, {...team, formation: team.formation.slice(1)},
      {...team, formation: team.formation.map((id, i) => i ? id : '39999999')},
      {...team, formation: team.formation.map((id, i) => i ? id : team.formation[1])},
      {...team, captain: null}, {...team, captain: '39999999'}, {...team, equipment: []},
      {...team, equipment: {...team.equipment, other: {}}},
      {...team, equipment: {...team.equipment, weapon: []}},
      {...team, equipment: {...team.equipment, weapon: {'outside-deck': 'some-weapon'}}},
      {...team, equipment: {...team.equipment, weapon: {'invalid key': 'some-weapon'}}}];
    const member = runtime.engine.byId[team.cards[0]].characterId;
    for (const bad of [null, 42, {}, ['some-weapon'], 'bad weapon', 'x'.repeat(81)]) invalid.push(
      {...team, equipment: {...team.equipment, weapon: {[member]: bad}}});
    for (const key of ['name', 'cards', 'formation', 'captain', 'equipment']) {
      const missing = copy(team); delete missing[key]; invalid.push(missing);
    }
    const state = await snapshot();
    await as(1);
    await denied(sql.start, ['momo-petits-bonheurs', null, devices[1], runtimeHash], '22023');
    for (const deck of invalid) await denied(sql.start, ['momo-petits-bonheurs', JSON.stringify(deck), devices[1], runtimeHash], '22023');
    assert.deepEqual(await snapshot(), state);
    assert.equal(await value('select count(*)::int from kalistar_private.journey_attempts'), 0);
  });

  await t.test('009 accepts actual normalized teams and stable equipment IDs without dropping the 008 start contract', async () => {
    const tidus = team.cards.find(id => runtime.engine.byId[id].characterId === 'tidus-ff10');
    assert(tidus);
    const equipped = Composition.create(runtime.engine).equip(team, tidus, 'zanarkand-abes-pendant');
    for (const deck of [team, winningTeam, {...equipped, name: 'Equipe de test'}]) {
      await as(1);
      const attempt = await value(sql.start, ['momo-petits-bonheurs', JSON.stringify(deck), devices[1], runtimeHash]);
      assert.deepEqual(attempt.deck, deck);
      assert.equal(attempt.stage, 0);
      assert.equal(attempt.status, 'active');
      await value(sql.abandon, [attempt.id, devices[1]]);
    }
    assert.equal((await bookView(1, 'momo-petits-bonheurs')).cleared, 0);
  });

  await t.test('009 blocks both KC and barcode offers while bound, retaining 004/007 guards and ordinary barcode transfers', async () => {
    const id = '30000007', E = runtime.engine, Team = Composition.create(E);
    assert(!team.cards.includes(id) && !winningTeam.cards.includes(id));
    const cards = team.cards.map((_, index) => team.cards.map((card, i) => i === index ? id : card))
      .find(ids => !E.validatePlayableDeck(ids).length);
    assert(cards);
    const deck = Team.fromPreset({name: 'Barcode guard fixture', cards});
    await root();
    const card = (await query(`insert into public.kalistar_collectibles(model_id,owner_id,status,pilot,activated_at)
      values($1,$2,'owned',false,clock_timestamp()) returning id,lpad(serial::text,8,'0') barcode`, [id, ids[0]])).rows[0];
    const kc = 'KC-' + card.id.replaceAll('-', '');
    await as(0);
    const attempt = await value(sql.start, ['momo-petits-bonheurs', JSON.stringify(deck), devices[0], runtimeHash]);
    const state = await snapshot();
    await as(0);
    for (const identifier of [kc, card.barcode]) await denied('select public.kalistar_offer($1,$2)',
      [identifier, 'journey_fixture_1'], '22023');
    assert.deepEqual(await snapshot(), state);
    await as(0);
    await value(sql.abandon, [attempt.id, devices[0]]);

    // A synchronized ordinary match must keep its 004 guard through the new wrapper.
    await root();
    const payload = await value('select payload from kalistar_private.player_saves where user_id=$1', [ids[0]]);
    const bound = {activeMatchId: 'test-bound-match', matches: [{id: 'test-bound-match', state: {
      phase: 'formation', collection: {bindings: {slot: kc}}}}]};
    await query('update kalistar_private.player_saves set payload=$2 where user_id=$1', [ids[0], JSON.stringify(bound)]);
    try {
      await as(0);
      await denied('select public.kalistar_offer($1,$2)', [card.barcode, 'journey_fixture_1']);
    } finally {
      await root();
      await query('update kalistar_private.player_saves set payload=$2 where user_id=$1', [ids[0], JSON.stringify(payload)]);
    }
    await as(0);
    const transfer = await value('select public.kalistar_offer($1,$2)', [card.barcode, 'journey_fixture_1']);
    assert.equal((await value('select public.kalistar_settle($1,$2)', [transfer, 'cancelled'])).id, kc);
    await root();
    assert.equal(await value('select owner_id from public.kalistar_collectibles where id=$1', [card.id]), ids[0]);
    const shared = await value("select lpad(serial::text,8,'0') from public.kalistar_collectibles where owner_id=$1 and model_id=$2 and status='owned'", [ids[0], team.cards[0]]);
    await as(0);
    await denied('select public.kalistar_offer($1,$2)', [shared, 'journey_fixture_1'], '23505', 'kalistar_one_owned_model');
  });

  let resumed;
  await t.test('real Worker initializes and signs its own state; supplied client winner/state are ignored', async () => {
    const count = calls.length;
    assert.equal((await worker(0, 'library', {}, {method: 'GET'})).status, 405);
    assert.equal((await worker(0, 'library', {}, {origin: 'https://outsider.invalid'})).status, 403);
    assert.equal(calls.length, count);
    assert.equal((await worker(0, 'library', {}, {token: 'Bearer unknown-fixture'})).status, 403);
    resumed = await start(0, 'momo-petits-bonheurs', {winner: 0, phase: 'over', state: {phase: 'over', winner: 0},
      source: {winner: 0}, actorId: ids[1], runtimeHash: 'f'.repeat(64)});
    assert.equal(resumed.actorId, ids[0]);
    assert.equal(resumed.runtimeHash, runtimeHash);
    assert.equal(resumed.stage, 0);
    assert.equal(resumed.sequence, 1);
    assert.equal(resumed.status, 'active');
    assert.notEqual(resumed.state.phase, 'over');
    assert.equal(resumed.state.winner, null);
    assert.deepEqual(resumed.state, copy(runtime.initial(resumed)));
    assert.equal(Object.keys(resumed.state.collection.bindings).length, 10);
    assert.equal(new Set(Object.values(resumed.state.collection.bindings)).size, 10);
    const saved = calls.findLast(call => call.action === 'commit').args;
    assert.equal(saved.p_signature, crypto.createHmac('sha256', Buffer.from(TEST_KEY, 'utf8'))
      .update('kalistar-journey-v1:' + saved.p_frame, 'utf8').digest('hex'));
    assert.equal((await bookView(0, resumed.bookId)).cleared, 0);
    await as(0);
    await denied(sql.start, ['balmhyr-retour', JSON.stringify(team), devices[0], runtimeHash], '22023');
  });

  await t.test('fresh Worker entropy is not fixed by a public seed, even when the identical sequence is retried', () => {
    const original = copy(resumed.state), before = JSON.stringify(original), outcomes = [];
    for (let i = 0; i < 16; i++) {
      const result = entropyState(original);
      runtime.engine.assertState(result);
      assert.equal(result.seed, original.seed);
      assert.equal(result.journey.sequence, original.journey.sequence);
      for (const rng of [result.rng, result.initiative.rng]) assert(Number.isInteger(rng) && rng > 0 && rng <= 0xffffffff);
      const unchanged = copy(result);
      unchanged.rng = original.rng; unchanged.initiative.rng = original.initiative.rng;
      assert.deepEqual(unchanged, original);
      outcomes.push([result.rng, result.initiative.rng]);
    }
    assert(new Set(outcomes.map(pair => pair[0])).size > 1);
    assert(new Set(outcomes.map(pair => pair[1])).size > 1);
    assert.equal(JSON.stringify(original), before);
    const poisoned = {...copy(original), rng: 0, seed: original.seed};
    poisoned.initiative.rng = 0;
    const result = entropyState(poisoned);
    assert(result.rng > 0 && result.initiative.rng > 0);
    assert.equal(poisoned.rng, 0);
    assert.equal(poisoned.initiative.rng, 0);
  });

  await t.test('fresh entropy rejects zero U32 draws rather than persisting a zero RNG', entropyTest => {
    const original = copy(resumed.state), before = JSON.stringify(original);
    const pairs = [[0, 7], [9, 0], [11, 13]];
    const mock = entropyTest.mock.method(globalThis.crypto, 'getRandomValues', values => {
      assert(values instanceof Uint32Array);
      assert.equal(values.length, 2);
      assert(pairs.length);
      values.set(pairs.shift());
      return values;
    });
    try {
      const result = entropyState(original);
      assert.equal(result.rng, 11);
      assert.equal(result.initiative.rng, 13);
      assert.equal(mock.mock.callCount(), 3);
      assert.equal(result.seed, original.seed);
      assert.equal(JSON.stringify(original), before);
    } finally { mock.mock.restore(); }
  });

  await t.test('legal Worker moves ignore client results, reject unsupported commands and stale sequence, and reload the persisted attempt', async () => {
    const before = copy(resumed);
    const bad = await worker(0, 'move', {attemptId: resumed.id, deviceId: devices[0], sequence: resumed.sequence,
      commands: [{method: 'setWinner', args: [0]}], winner: 0});
    assert.equal(bad.status, 400);
    const command = commandFor(runtime.engine, resumed.state);
    const response = await worker(0, 'move', {attemptId: resumed.id, deviceId: devices[0], sequence: resumed.sequence,
      commands: [command], state: {phase: 'over', winner: 0}, winner: 0, phase: 'over'});
    assert.equal(response.status, 200, JSON.stringify(response.body));
    resumed = response.body.attempt;
    runtime.engine.assertState(resumed.state);
    assert.deepEqual(resumed.state.collection, before.state.collection);
    assert.deepEqual(resumed.state.composition, before.state.composition);
    assert.equal(resumed.state.matchId, before.state.matchId);
    assert.equal(resumed.state.seed, before.state.seed);
    assert.equal(resumed.state.initiative.rolls.length, before.state.initiative.rolls.length + 1);
    assert(resumed.state.initiative.rolls.at(-1).every(die => Number.isInteger(die) && die >= 1 && die <= 6));
    const signed = JSON.parse(calls.findLast(call => call.action === 'commit').args.p_frame);
    assert.deepEqual(signed.state, resumed.state);
    assert.equal(resumed.sequence, before.sequence + 1);
    assert.notEqual(resumed.state.phase, 'over');
    assert.equal((await bookView(0, resumed.bookId)).cleared, 0);
    const stale = await worker(0, 'move', {attemptId: resumed.id, deviceId: devices[0], sequence: before.sequence, commands: [command]});
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, 'conflict');
    const reloaded = await worker(0, 'context', {attemptId: resumed.id, deviceId: devices[0]});
    assert.equal(reloaded.status, 200);
    assert.deepEqual(reloaded.body.attempt, resumed);
    assert.deepEqual(copy(Combat.create(data).engine.restoreGame(reloaded.body.attempt.state)), resumed.state);
    const restarted = await start(0, resumed.bookId);
    assert.deepEqual(restarted, resumed);
  });

  await t.test('unsigned, wrong-key, wrong-domain, tampered and replayed frames cannot advance progression', async () => {
    const candidate = runtime.apply(resumed.state, [commandFor(runtime.engine, resumed.state)]);
    const frame = frameFor(resumed, candidate), signature = await signFrame(frame, TEST_KEY);
    assert.equal(signature, crypto.createHmac('sha256', TEST_KEY).update('kalistar-journey-v1:' + frame).digest('hex'));
    await root();
    assert.equal(await value("select encode(extensions.hmac(convert_to('kalistar-journey-v1:'||$1,'UTF8'),convert_to($2,'UTF8'),'sha256'),'hex')", [frame, TEST_KEY]), signature);
    const state = await snapshot();
    await as(0);
    for (const invalid of [null, '0'.repeat(64), await signFrame(frame, TEST_KEY + '-wrong'),
      crypto.createHmac('sha256', TEST_KEY).update(frame).digest('hex')]) await denied(sql.commit, [frame, invalid, devices[0]]);
    const forged = JSON.parse(frame);
    forged.state.winner = 0;
    forged.state.phase = 'over';
    await denied(sql.commit, [JSON.stringify(forged), signature, devices[0]]);
    const replay = frameFor(resumed, resumed.state);
    await denied(sql.commit, [replay, await signFrame(replay, TEST_KEY), devices[0]], '22023');
    for (const patch of [{sequence: candidate.journey.sequence + 1}, {runtimeHash: '0'.repeat(64)}]) {
      const altered = JSON.stringify({...JSON.parse(frame), ...patch});
      await denied(sql.commit, [altered, await signFrame(altered, TEST_KEY), devices[0]], '22023');
    }
    assert.deepEqual(await snapshot(), state);
    await assert.rejects(signFrame(frame, 'short-key'));
  });

  await t.test('other accounts cannot resume, abandon or commit an attempt, even with a fixture-signed frame', async () => {
    const state = await snapshot();
    const candidate = runtime.apply(resumed.state, [commandFor(runtime.engine, resumed.state)]);
    const frame = frameFor(resumed, candidate);
    await as(1);
    await denied(sql.context, [resumed.id, devices[1]]);
    await denied(sql.commit, [frame, await signFrame(frame, TEST_KEY), devices[1]]);
    const claimedIdentity = JSON.stringify({...JSON.parse(frame), actorId: ids[1]});
    await denied(sql.commit, [claimedIdentity, await signFrame(claimedIdentity, TEST_KEY), devices[1]], '22023');
    await value(sql.abandon, [resumed.id, devices[1]]);
    assert.equal((await worker(1, 'context', {attemptId: resumed.id, deviceId: devices[1]})).status, 403);
    assert.deepEqual(await snapshot(), state);
  });

  await t.test('a real engine defeat is stored as lost, never advances, and retries resume the same uncleared stage', async () => {
    const lost = realTerminal(runtime, resumed.state, 1);
    const result = await commit(0, resumed, lost);
    assert.equal(result.state.phase, 'over');
    assert.equal(result.state.winner, 1);
    assert.equal(result.status, 'lost');
    assert.equal(result.sequence, resumed.sequence + 1);
    assert.equal((await bookView(0, resumed.bookId)).cleared, 0);
    await as(0);
    await denied(sql.claim, [resumed.bookId]);
    const retry = await start(0, resumed.bookId);
    assert.notEqual(retry.id, resumed.id);
    assert.equal(retry.stage, 0);
    await as(0);
    await value(sql.abandon, [retry.id, devices[0]]);
    assert.equal((await bookView(0, retry.bookId)).cleared, 0);
    assert.equal((await bookView(0, retry.bookId)).activeAttempt, null);
  });

  const rewards = new Map();
  const finishBook = async (actor, bookId) => {
    const rewardModelId = expectedBooks[bookId], ownedBefore = await owned(actor, rewardModelId);
    let collectibleCount;
    await root();
    collectibleCount = await value('select count(*)::int from public.kalistar_collectibles');
    for (let stage = 0; stage < 4; stage++) {
      assert.equal((await bookView(actor, bookId)).cleared, stage);
      await as(actor);
      await denied(sql.claim, [bookId]);
      const attempt = await start(actor, bookId, {deck: winningTeam});
      assert.equal(attempt.stage, stage);
      assert.equal(attempt.sequence, 1);
      assert.equal(attempt.status, 'active');
      assert.equal(attempt.state.journey.bookId, bookId);
      const won = realTerminal(runtime, attempt.state, 0);
      const saved = await commit(actor, attempt, won);
      assert.equal(saved.status, 'won');
      assert.equal(saved.state.phase, 'over');
      assert.equal(saved.state.winner, 0);
      assert.equal(saved.sequence, attempt.sequence + 1);
      const view = await bookView(actor, bookId);
      assert.equal(view.cleared, stage + 1, 'One win must advance exactly one stage');
      assert.equal(view.completed, stage === 3);
      assert.equal(view.claimed, false, 'A victory must not silently mint the reward');
      const state = await snapshot();
      await as(actor);
      const replay = frameFor(attempt, won);
      await denied(sql.commit, [replay, await signFrame(replay, TEST_KEY), devices[actor]], '22023');
      assert.deepEqual(await snapshot(), state);
      assert.equal(await value('select count(*)::int from public.kalistar_collectibles'), collectibleCount);
    }
    await as(actor);
    await denied(sql.start, [bookId, JSON.stringify(team), devices[actor], runtimeHash], '22023');
    const claim = await value(sql.claim, [bookId]);
    assert.equal(claim.card.modelId, rewardModelId);
    assert.equal(claim.card.status, 'owned');
    assert.equal(claim.alreadyOwned, ownedBefore === 1);
    assert.equal(claim.replayed, false);
    assert.equal(await owned(actor, rewardModelId), 1);
    assert.equal(await value('select count(*)::int from public.kalistar_collectibles'), collectibleCount + (ownedBefore ? 0 : 1));
    const state = await snapshot();
    await as(actor);
    for (let i = 0; i < 3; i++) {
      const replay = await value(sql.claim, [bookId]);
      assert.equal(replay.card.id, claim.card.id);
      assert.equal(replay.card.barcode, claim.card.barcode);
      assert.equal(replay.replayed, true);
      assert.equal(replay.alreadyOwned, claim.alreadyOwned);
    }
    assert.deepEqual(await snapshot(), state);
    if (!ownedBefore) {
      assert.equal(claim.card.pilot, false);
      const activation = (await query(`select used_at,octet_length(secret_hash)::int bytes from kalistar_private.activations
        where collectible_id=$1`, [claim.card.id.slice(3)])).rows[0];
      assert(activation.used_at);
      assert.equal(activation.bytes, 32);
      assert.deepEqual((await query('select kind from kalistar_private.events where collectible_id=$1 order by id',
        [claim.card.id.slice(3)])).rows.map(row => row.kind), ['issued', 'activated']);
    }
    assert(!Object.hasOwn(claim, 'secret'));
    assert(!Object.hasOwn(claim.card, 'secret'));
    await as(actor);
    const acknowledged = await value(sql.ack, [bookId]);
    assert.equal(acknowledged.books.find(book => book.id === bookId).acknowledged, true);
    const reloaded = await library(actor);
    const complete = reloaded.books.find(book => book.id === bookId);
    assert.equal(complete.cleared, 4);
    assert.equal(complete.claimed, true);
    assert.equal(complete.acknowledged, true);
    rewards.set(actor + ':' + bookId, claim);
    return claim;
  };

  for (const bookId of Object.keys(expectedBooks)) await t.test('four genuine victories, one reward and idempotent claim: ' + bookId,
    () => finishBook(0, bookId));

  await t.test('claim remains idempotent after transfer; Tokyo completes four stages but reuses its existing reward', async () => {
    const bookId = 'balmhyr-retour', reward = rewards.get('0:' + bookId);
    assert(reward);
    await as(0);
    const transfer = await value('select public.kalistar_offer($1,$2)', [reward.card.id, 'journey_fixture_1']);
    await as(1);
    const accepted = await value('select public.kalistar_settle($1,$2)', [transfer, 'accepted']);
    assert.equal(accepted.id, reward.card.id);
    const state = await snapshot();
    await as(0);
    const replay = await value(sql.claim, [bookId]);
    assert.equal(replay.card.id, reward.card.id);
    assert.equal(replay.replayed, true);
    assert.deepEqual(await snapshot(), state);
    assert.equal(await owned(0, expectedBooks[bookId]), 0);
    assert.equal(await owned(1, expectedBooks[bookId]), 1);
    await as(1);
    await denied(sql.claim, [bookId]);
    const tokyo = await finishBook(1, bookId);
    assert.equal(tokyo.alreadyOwned, true);
    assert.equal(tokyo.card.id, reward.card.id);
    assert.equal((await library(1)).isAdmin, false);
    assert((await library(0)).books.every(book => book.cleared === 4));
    assert.equal((await bookView(1, 'momo-petits-bonheurs')).cleared, 0);
    assert.equal((await bookView(1, 'kaylis-prochain-pas')).cleared, 0);
  });

  await t.test('real unique indexes reject duplicate rewards and active attempts; progress cannot exceed four', async () => {
    const attempt = await start(1, 'kaylis-prochain-pas');
    const state = await snapshot();
    await denied(`insert into public.kalistar_collectibles(model_id,owner_id,status,activated_at)
      values($1,$2,'owned',clock_timestamp())`, [expectedBooks['balmhyr-retour'], ids[1]], '23505', 'kalistar_one_owned_model');
    await denied(`insert into kalistar_private.journey_attempts(user_id,book_id,revision,stage,seed,deck,cards,runtime_hash)
      select user_id,book_id,revision,stage,seed,deck,cards,runtime_hash from kalistar_private.journey_attempts where id=$1`,
    [attempt.id], '23505', 'kalistar_journey_one_active');
    await denied('update kalistar_private.journey_progress set cleared=5 where user_id=$1', [ids[0]], '23514');
    assert.deepEqual(await snapshot(), state);
    assert.equal(await value(`select count(*)::int from (select owner_id,model_id from public.kalistar_collectibles
      where status='owned' group by owner_id,model_id having count(*)>1) duplicates`), 0);
    assert.equal(await value(`select count(*)::int from (select user_id,reward_model_id from kalistar_private.journey_claims
      group by user_id,reward_model_id having count(*)>1) duplicates`), 0);
    const indexes = (await query(`select indexrelid::regclass::text name,indisunique,indisvalid from pg_index
      where indexrelid in('public.kalistar_one_owned_model'::regclass,'kalistar_private.kalistar_journey_one_active'::regclass)`)).rows;
    assert.equal(indexes.length, 2);
    assert(indexes.every(index => index.indisunique && index.indisvalid));
    await as(1);
    await value(sql.abandon, [attempt.id, devices[1]]);
  });

  await t.test('all private function privileges remain closed after 009, including HMAC, old start and transfer wrappers', async () => {
    await root();
    assert.equal(await value(`select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace,
      lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='kalistar_private'
      and a.grantee in (0,'anon'::regrole,'authenticated'::regrole)`), 0);
    for (const role of ['anon', 'authenticated']) {
      assert.equal(await value("select has_schema_privilege($1,'kalistar_private','USAGE')", [role]), false);
      await as(role === 'anon' ? null : 0, role);
      await denied('select signing_key from kalistar_private.journey_config');
      await denied('update kalistar_private.journey_config set signing_key=$1', [TEST_KEY + '-client']);
      await denied('select kalistar_private.kalistar_journey_start_before_bounds($1,$2,$3,$4)',
        ['momo-petits-bonheurs', JSON.stringify(team), devices[0], runtimeHash]);
      await denied('select kalistar_private.kalistar_offer_before_bounds($1,$2)', ['00000001', 'journey_fixture_1']);
    }
    await root();
    assert.equal(await value("select to_regprocedure('public.kalistar_journey_start_before_bounds(text,jsonb,uuid,text)')"), null);
    assert.equal(await value("select to_regprocedure('public.kalistar_offer_before_bounds(text,text)')"), null);
  });
});
