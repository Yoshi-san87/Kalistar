'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const runtime = createRequire(path.join(process.env.KALISTAR_CLOUD_MODULES ||
  path.resolve(__dirname, '../../../work/supabase-runtime/node_modules'), '_unique_models_test.cjs'));
const {PGlite} = runtime('@electric-sql/pglite');
const {pgcrypto} = runtime('@electric-sql/pglite/contrib/pgcrypto');
const migrationDir = path.join(__dirname, 'migrations');
const immutable = {
  '202610160001_registry.sql': '9e718a09d910f3370e366cf1db5acda05e1e547f67c87779e31316387399bc1e',
  '202610160002_print_identity.sql': 'cbc6fdcd5c77d507aeeed8705bc52bf169f70f1d31887d327fb61f94f03bb7af',
  '202610160003_private_access.sql': '606c02e89c1525e63b1b67e58560fb540afd586863e054d2c4a16e391ae31b50',
  '202610160004_player_sync.sql': '9a5d2ab4ca4c218bc84a6f9bc017a902e4ca3107fdeef8a8e1bce2eb7d181007',
  '202610160005_sync_lease_guard.sql': 'e0d9352ad22bb17186481babe9d8fc3a1150aac12c054cafb96dd5e7e78ca1c3',
  '202610160006_sync_compact_responses.sql': 'b769b03e5c470de5c45f5eaa72f8a469ab8fba7090626fc84d6a97e7f50f90f9'
};
const migration = fs.readFileSync(path.join(migrationDir, '202610160007_unique_models.sql'), 'utf8');
const ids = Array.from({length: 5}, (_, i) => '00000000-0000-4000-8000-' + String(i + 1).padStart(12, '0'));
const coreTables = ['public.kalistar_collectibles', 'public.kalistar_transfers',
  'kalistar_private.activations', 'kalistar_private.events', 'kalistar_private.starter_grants'];
const allTables = [...coreTables, 'public.kalistar_models', 'public.kalistar_profiles', 'auth.users',
  'kalistar_private.players', 'kalistar_private.admins', 'kalistar_private.attempts',
  'kalistar_private.player_saves', 'kalistar_private.registry_version'];
const activateSQL = 'select public.kalistar_activate($1,$2)';
const offerSQL = 'select public.kalistar_offer($1,$2)';
const settleSQL = 'select public.kalistar_settle($1,$2)';
const uniqueName = 'kalistar_one_owned_model';

function sqlError(code, message, constraint) {
  return error => {
    assert.equal(error.code, code);
    if (message !== undefined) assert.equal(error.message, message);
    if (constraint !== undefined) assert.equal(error.constraint, constraint);
    return true;
  };
}

async function fixture(t) {
  // Only disposable in-memory Auth identities, privileges and test secrets.
  const db = new PGlite({extensions: {pgcrypto}});
  t.after(() => db.close());
  const query = (sql, args = []) => db.query(sql, args);
  const value = async (sql, args = []) => Object.values((await query(sql, args)).rows[0])[0];
  const root = () => db.exec('reset role');
  const as = async (index, role = 'authenticated') => {
    await root();
    await query("select set_config('request.jwt.claim.sub',$1,false)", [index === null ? '' : ids[index]]);
    assert(['authenticated', 'anon'].includes(role));
    await db.exec('set role ' + role);
  };
  const rejected = (sql, args, code, message, constraint) =>
    assert.rejects(query(sql, args), sqlError(code, message, constraint));
  const duplicate = (sql, args) => rejected(sql, args, '23505', 'already_owned', uniqueName);
  const snapshot = async (tables = coreTables) => {
    await root();
    const result = {};
    for (const table of tables) result[table] = await value(
      "select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from " + table + ' r');
    return result;
  };
  const model = async (id, character = id) => {
    await root();
    await query('insert into public.kalistar_models(id,character_id,name,title) values($1,$2,$2,$2)', [id, character]);
    return id;
  };
  const mint = async (modelId, owner = null, status = owner === null ? 'unclaimed' : 'owned') => {
    await root();
    const row = (await query(`insert into public.kalistar_collectibles(model_id,owner_id,status,activated_at)
      values($1,$2,$3,case when $2::uuid is null then null else clock_timestamp() end) returning *`,
    [modelId, owner === null ? null : ids[owner], status])).rows[0];
    const secret = crypto.createHash('sha256').update('test-only-specimen-' + row.id).digest('hex');
    await query(`insert into kalistar_private.activations(collectible_id,secret_hash,used_at)
      values($1,extensions.digest($2,'sha256'),case when $3 then clock_timestamp() else null end)`,
    [row.id, secret, status !== 'unclaimed']);
    await query("insert into kalistar_private.events(collectible_id,actor_id,kind) values($1,$2,'issued')", [row.id, ids[0]]);
    return {...row, publicId: 'KC-' + row.id.replaceAll('-', ''), barcode: String(row.serial).padStart(8, '0'), secret};
  };
  await db.exec(`create schema auth; create schema extensions; create role anon; create role authenticated;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`);
  for (let i = 0; i < ids.length; i++) await query('insert into auth.users values($1,$2,$3)',
    [ids[i], i === 4 ? null : new Date().toISOString(), 'unique-fixture-' + i + '@example.invalid']);
  for (const file of Object.keys(immutable)) await db.exec(fs.readFileSync(path.join(migrationDir, file), 'utf8'));
  for (const i of [0, 1, 2, 4]) await query(`insert into kalistar_private.players(user_id,email_sha256,local_profile,label)
    values($1,extensions.digest($2,'sha256'),$3,$4)`, [ids[i], 'unique-fixture-' + i + '@example.invalid',
    ['user-paris', 'user-tokyo', 'user-fixture', '', 'user-unconfirmed'][i], ['Paris', 'Tokyo', 'Fixture', '', 'Unconfirmed'][i]]);
  for (let i = 0; i < 3; i++) await query('insert into public.kalistar_profiles(user_id,handle,display_name) values($1,$2,$3)',
    [ids[i], 'fixture_' + i, 'Fixture ' + i]);
  await query('insert into kalistar_private.admins values($1)', [ids[0]]);
  return {db, query, value, root, as, rejected, duplicate, snapshot, model, mint};
}

test('migrations 001-006 remain byte-identical', () => {
  for (const [file, hash] of Object.entries(immutable)) assert.equal(
    crypto.createHash('sha256').update(fs.readFileSync(path.join(migrationDir, file))).digest('hex'), hash, file);
});

test('007 refuses existing owned duplicates, rolls back and never cleans up specimens', async t => {
  const f = await fixture(t);
  let specimen;
  for (const owner of [0, 1]) {
    const card = await f.mint('30000001', owner);
    if (owner === 0) specimen = card;
    await f.mint('30000001', owner);
  }
  await f.mint('30000001');
  await f.as(0);
  await f.value(offerSQL, [specimen.publicId, 'fixture_1']);
  await f.root();
  await f.query(`insert into kalistar_private.starter_grants(user_id,grant_key,model_id,collectible_id)
    values($1,'test-only-legacy-grant','30000001',$2)`, [ids[0], specimen.id]);
  const before = await f.snapshot(allTables);
  const offerBefore = await f.value("select pg_get_functiondef('public.kalistar_offer(text,text)'::regprocedure)");
  await assert.rejects(f.db.exec(migration), sqlError('23505', 'duplicate_owned_models', uniqueName));
  await f.db.exec('rollback');
  assert.deepEqual(await f.snapshot(allTables), before);
  assert.equal(await f.value("select to_regclass('public.kalistar_one_owned_model')"), null);
  assert.equal(await f.value("select to_regprocedure('kalistar_private.kalistar_offer_before_unique(text,text)')"), null);
  assert.equal(await f.value("select to_regprocedure('kalistar_private.kalistar_settle_before_unique(uuid,text)')"), null);
  assert.equal(await f.value("select pg_get_functiondef('public.kalistar_offer(text,text)'::regprocedure)"), offerBefore);
});

test('real PostgreSQL unique ownership, RPC contracts, rollback and closed permissions', async t => {
  const f = await fixture(t);
  const {db, query, value, root, as, rejected, duplicate, snapshot, model, mint} = f;
  const paris = await mint('30000001', 0);
  await mint('30000001', 1);
  await mint('30000001', 0, 'revoked');
  const spare = await mint('30000001');
  await mint('30000001');
  await as(0);
  const legacyTransfer = await value(offerSQL, [paris.publicId, 'fixture_1']);
  await root();
  await query(`insert into kalistar_private.starter_grants(user_id,grant_key,model_id,collectible_id)
    values($1,'test-only-legacy-grant','30000001',$2)`, [ids[0], paris.id]);
  const offerBefore = await value("select pg_get_functiondef('public.kalistar_offer(text,text)'::regprocedure)");
  const originalOffer = await value("select prosrc from pg_proc where oid='kalistar_private.kalistar_offer(text,text)'::regprocedure");
  const originalSettle = await value("select prosrc from pg_proc where oid='public.kalistar_settle(uuid,text)'::regprocedure");
  const before = await snapshot(allTables.filter(name => name !== 'kalistar_private.registry_version'));
  await db.exec(migration);

  await t.test('clean install changes no data and preserves 004 active-match wrapper and historical callees', async () => {
    assert.deepEqual(await snapshot(allTables.filter(name => name !== 'kalistar_private.registry_version')), before);
    assert.equal(await value('select version from kalistar_private.registry_version'), 6);
    assert.equal(await value("select pg_get_functiondef('public.kalistar_offer(text,text)'::regprocedure)"), offerBefore);
    assert.equal(await value("select prosrc from pg_proc where oid='kalistar_private.kalistar_offer_before_unique(text,text)'::regprocedure"), originalOffer);
    assert.equal(await value("select prosrc from pg_proc where oid='kalistar_private.kalistar_settle_before_unique(uuid,text)'::regprocedure"), originalSettle);
    assert.equal(await value("select to_regprocedure('public.kalistar_offer_before_unique(text,text)')"), null);
    assert.equal(await value("select to_regprocedure('public.kalistar_settle_before_unique(uuid,text)')"), null);
    const wrappers = (await query(`select prosecdef,proconfig from pg_proc where oid in (
      'public.kalistar_activate(text,text)'::regprocedure,'kalistar_private.kalistar_offer(text,text)'::regprocedure,
      'public.kalistar_settle(uuid,text)'::regprocedure)`)).rows;
    assert.equal(wrappers.length, 3);
    for (const wrapper of wrappers) assert.deepEqual(wrapper, {prosecdef: true, proconfig: ['search_path=""']});
    const index = (await query(`select i.indisunique,i.indisvalid,i.indnkeyatts,pg_get_expr(i.indpred,i.indrelid) predicate,
      pg_get_indexdef(i.indexrelid,1,true) first_key,pg_get_indexdef(i.indexrelid,2,true) second_key
      from pg_index i where i.indexrelid='public.kalistar_one_owned_model'::regclass`)).rows[0];
    assert.deepEqual(index, {indisunique: true, indisvalid: true, indnkeyatts: 2,
      predicate: "(status = 'owned'::text)", first_key: 'owner_id', second_key: 'model_id'});
  });

  await t.test('anonymous, missing Auth, outsider and unconfirmed users cannot use ownership RPCs', async () => {
    const state = await snapshot();
    for (const [index, role] of [[null, 'anon'], [0, 'anon'], [null, 'authenticated'], [3, 'authenticated'], [4, 'authenticated']]) {
      await as(index, role);
      await rejected(activateSQL, [spare.publicId, spare.secret], '42501');
      await rejected(offerSQL, [paris.publicId, 'fixture_1'], '42501');
      await rejected(settleSQL, [ids[0], 'accepted'], '42501');
    }
    assert.deepEqual(await snapshot(), state);
  });

  await t.test('private functions, tables, sequences and schema have no browser or PUBLIC grants', async () => {
    await root();
    assert.equal(await value(`select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace,
      lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      where n.nspname='kalistar_private' and a.grantee in (0,'anon'::regrole,'authenticated'::regrole)`), 0);
    for (const role of ['anon', 'authenticated']) {
      assert.equal(await value("select has_schema_privilege($1,'kalistar_private','USAGE')", [role]), false);
      assert.equal(await value("select has_schema_privilege($1,'kalistar_private','CREATE')", [role]), false);
      for (const sig of ['public.kalistar_activate(text,text)', 'public.kalistar_offer(text,text)', 'public.kalistar_settle(uuid,text)'])
        assert.equal(await value("select has_function_privilege($1,$2,'EXECUTE')", [role, sig]), role === 'authenticated');
      await as(role === 'anon' ? null : 0, role);
      for (const table of allTables.filter(name => name.startsWith('kalistar_private.')))
        await rejected('select * from ' + table, [], '42501');
      for (const sql of ["select kalistar_private.kalistar_offer($1,'fixture_1')",
        "select kalistar_private.kalistar_offer_before_unique($1,'fixture_1')"])
        await rejected(sql, [paris.publicId], '42501');
      await rejected("select kalistar_private.kalistar_settle_before_unique($1,'accepted')", [ids[0]], '42501');
      await rejected("select nextval('kalistar_private.events_id_seq')", [], '42501');
    }
    await as(0);
    for (const table of ['kalistar_models', 'kalistar_profiles', 'kalistar_collectibles', 'kalistar_transfers']) {
      await rejected('delete from public.' + table, [], '42501');
      await rejected('insert into public.' + table + ' default values', [], '42501');
    }
    await rejected('update public.kalistar_collectibles set owner_id=$1', [ids[1]], '42501');
    await rejected("select nextval('public.kalistar_collectibles_serial_seq')", [], '42501');
    await as(1);
    const owners = (await query('select distinct owner_id from public.kalistar_collectibles')).rows;
    assert.deepEqual(owners, [{owner_id: ids[1]}]);
    await as(3);
    await rejected('select * from public.kalistar_models', [], '42501');
  });

  await t.test('valid duplicate activation returns already_owned, keeps secret, UUIDs and all events untouched', async () => {
    const state = await snapshot();
    await as(0);
    assert.deepEqual(await value(activateSQL, [spare.publicId, '0'.repeat(64)]), {ok: false, code: 'activation_refused'});
    assert.deepEqual(await value(activateSQL, [spare.barcode, spare.secret]), {ok: false, code: 'already_owned'});
    assert.deepEqual(await snapshot(), state);
    assert.equal(await value('select attempts from kalistar_private.attempts where user_id=$1', [ids[0]]), 2);
    await as(2);
    const result = await value(activateSQL, [spare.publicId, spare.secret]);
    assert.equal(result.ok, true);
    assert.equal(result.card.id, spare.publicId);
    await root();
    assert(await value('select used_at from kalistar_private.activations where collectible_id=$1', [spare.id]));
    await as(0);
    assert.deepEqual(await value(activateSQL, [spare.publicId, spare.secret]), {ok: false, code: 'activation_refused'});
  });

  await t.test('same character in another model/version is allowed, even for the fake administrator', async () => {
    await model('40000001', 'momo');
    const variant = await mint('40000001');
    await as(0);
    assert.equal((await value('select public.kalistar_me()')).isAdmin, true);
    assert.equal((await value(activateSQL, [variant.publicId, variant.secret])).ok, true);
    await root();
    assert.equal(await value(`select count(*)::int from public.kalistar_collectibles c join public.kalistar_models m on m.id=c.model_id
      where c.owner_id=$1 and c.status='owned' and m.character_id='momo'`, [ids[0]]), 2);
    await as(0);
    const transfer = await value(offerSQL, [variant.publicId, 'fixture_1']);
    await as(1);
    assert.equal((await value(settleSQL, [transfer, 'accepted'])).id, variant.publicId);
  });

  await t.test('already_owned attempts remain committed and obey the five-per-minute limit for Tokyo too', async () => {
    const card = await mint('30000001');
    const state = await snapshot();
    await as(1);
    for (let i = 0; i < 5; i++) assert.deepEqual(await value(activateSQL, [card.publicId, card.secret]), {ok: false, code: 'already_owned'});
    assert.deepEqual(await value(activateSQL, [card.publicId, card.secret]), {ok: false, code: 'rate_limited'});
    assert.deepEqual(await snapshot(), state);
    assert.equal(await value('select attempts from kalistar_private.attempts where user_id=$1', [ids[1]]), 5);
  });

  await t.test('offer refuses an already-owned recipient before creating an offer or audit event', async () => {
    const state = await snapshot();
    await as(0);
    await duplicate(offerSQL, [paris.publicId, 'fixture_1']);
    await as(1);
    const tokyo = (await value('select public.kalistar_my_cards()')).find(card => card.modelId === '30000001');
    await duplicate(offerSQL, [tokyo.id, 'fixture_0']);
    await as(2);
    await rejected(offerSQL, [paris.publicId, 'fixture_1'], '42501');
    await as(0);
    await rejected(offerSQL, [paris.publicId, 'fixture_0'], '22023');
    await rejected(offerSQL, [paris.publicId, 'missing_fixture'], '22023');
    assert.deepEqual(await snapshot(), state);
  });

  await t.test('a pending offer from 006 survives migration but cannot deliver a duplicate and remains cancellable', async () => {
    const state = await snapshot();
    await as(1);
    await duplicate(settleSQL, [legacyTransfer, 'accepted']);
    assert.deepEqual(await snapshot(), state);
    assert.equal(await value('select status from public.kalistar_transfers where id=$1', [legacyTransfer]), 'pending');
    await as(0);
    assert.equal((await value(settleSQL, [legacyTransfer, 'cancelled'])).id, paris.publicId);
  });

  await t.test('acceptance rechecks after a later grant, retains pending offer, and succeeds after recipient transfers its copy away', async () => {
    const id = await model('30009001');
    const incoming = await mint(id, 0);
    await as(0);
    const transfer = await value(offerSQL, [incoming.publicId, 'fixture_1']);
    const receivedMeanwhile = await mint(id, 1);
    const state = await snapshot();
    await as(0);
    await duplicate(offerSQL, [incoming.publicId, 'fixture_1']);
    await rejected(settleSQL, [transfer, 'accepted'], '42501');
    await as(2);
    await rejected(settleSQL, [transfer, 'accepted'], '42501');
    await as(1);
    await duplicate(settleSQL, [transfer, 'accepted']);
    assert.deepEqual(await snapshot(), state);
    assert.equal(await value('select status from public.kalistar_transfers where id=$1', [transfer]), 'pending');
    await as(1);
    const outgoing = await value(offerSQL, [receivedMeanwhile.publicId, 'fixture_2']);
    await as(2);
    assert.equal((await value(settleSQL, [outgoing, 'accepted'])).id, receivedMeanwhile.publicId);
    await as(1);
    const accepted = await value(settleSQL, [transfer, 'accepted']);
    assert.equal(accepted.id, incoming.publicId);
    assert.equal(accepted.barcode, incoming.barcode);
    assert.equal(accepted.modelId, id);
    await rejected(settleSQL, [transfer, 'accepted'], '22023');
    await root();
    assert.deepEqual((await snapshot())['kalistar_private.activations'], state['kalistar_private.activations']);
    assert.equal(await value('select owner_id from public.kalistar_collectibles where id=$1', [incoming.id]), ids[1]);
  });

  await t.test('cancel and reject remain usable when the recipient now owns that version', async () => {
    for (const [action, actor, id] of [['cancelled', 0, '30009002'], ['rejected', 1, '30009003']]) {
      await model(id);
      const card = await mint(id, 0);
      await as(0);
      const transfer = await value(offerSQL, [card.publicId, 'fixture_1']);
      await mint(id, 1);
      await as(actor);
      assert.equal((await value(settleSQL, [transfer, action])).id, card.publicId);
      await root();
      assert.equal(await value('select status from public.kalistar_transfers where id=$1', [transfer]), action);
      assert.equal(await value('select owner_id from public.kalistar_collectibles where id=$1', [card.id]), ids[0]);
    }
  });

  await t.test('004 still blocks a specimen engaged in an active match, then allows it once released', async () => {
    const id = await model('30009004');
    const card = await mint(id, 0);
    const payload = {activeMatchId: 'test-match', matches: [{id: 'test-match', state: {
      phase: 'formation', collection: {bindings: {slot: card.publicId}}}}]};
    await query('insert into kalistar_private.player_saves(user_id,payload) values($1,$2)', [ids[0], JSON.stringify(payload)]);
    const state = await snapshot();
    await as(0);
    await rejected(offerSQL, [card.publicId, 'fixture_1'], '42501', 'Cet exemplaire participe a une partie active.');
    assert.deepEqual(await snapshot(), state);
    await query("update kalistar_private.player_saves set payload=jsonb_set(payload,'{activeMatchId}','null') where user_id=$1", [ids[0]]);
    await as(0);
    assert.match(await value(offerSQL, [card.publicId, 'fixture_1']), /^[a-f0-9-]{36}$/);
  });

  await t.test('SQL index blocks privileged/future grants, owner/model/status updates and multi-row inserts with no Paris/Tokyo exemption', async () => {
    for (const owner of [0, 1]) {
      const card = await mint('30000001');
      const state = await snapshot();
      await rejected(`insert into public.kalistar_collectibles(model_id,owner_id,status,activated_at)
        values('30000001',$1,'owned',clock_timestamp())`, [ids[owner]], '23505', undefined, uniqueName);
      await rejected("update public.kalistar_collectibles set owner_id=$1,status='owned',activated_at=clock_timestamp() where id=$2",
        [ids[owner], card.id], '23505', undefined, uniqueName);
      assert.deepEqual(await snapshot(), state);
    }
    const id = await model('30009005');
    const first = await mint(id, 0);
    await mint(id, 1);
    const revoked = await mint(id, 0, 'revoked');
    const state = await snapshot();
    await rejected('update public.kalistar_collectibles set owner_id=$1 where id=$2', [ids[1], first.id], '23505', undefined, uniqueName);
    await rejected("update public.kalistar_collectibles set status='owned' where id=$1", [revoked.id], '23505', undefined, uniqueName);
    await rejected("update public.kalistar_collectibles set model_id='30000001' where id=$1", [first.id], '23505', undefined, uniqueName);
    assert.deepEqual(await snapshot(), state);
    const batch = await model('30009006');
    const batchState = await snapshot();
    await rejected(`insert into public.kalistar_collectibles(model_id,owner_id,status,activated_at)
      select $1,$2,'owned',clock_timestamp() from generate_series(1,2)`, [batch, ids[0]], '23505', undefined, uniqueName);
    assert.deepEqual(await snapshot(), batchState);
  });

  // PGlite serializes queries. Inject a competing SQL grant AFTER the UX check
  // via a test-only trigger to exercise the real index and RPC rollback paths;
  // this is deliberately not a multiconnection concurrency claim.
  await root();
  await db.exec(`create temporary table qa_unique_probe(id boolean);
    create function pg_temp.qa_unique_after_precheck() returns trigger language plpgsql set search_path='' as $$
    begin
      if new.id::text=tg_argv[0] then
        if tg_argv[1]='other_unique' then
          raise exception 'unrelated_unique' using errcode='23505',constraint='qa_other_unique';
        end if;
        insert into public.kalistar_collectibles(model_id,owner_id,status,activated_at)
          values(new.model_id,new.owner_id,'owned',new.activated_at);
      end if;
      return new;
    end $$;`);
  const withRace = async (card, run, mode = 'competing_grant') => {
    await root();
    assert.match(card.id, /^[a-f0-9-]{36}$/);
    assert(['competing_grant', 'other_unique'].includes(mode));
    await db.exec(`create trigger qa_unique_after_precheck before update of owner_id,status on public.kalistar_collectibles
      for each row execute function pg_temp.qa_unique_after_precheck('${card.id}','${mode}')`);
    try { await run(); } finally { await root(); await db.exec('drop trigger qa_unique_after_precheck on public.kalistar_collectibles'); }
  };

  await t.test('post-precheck SQL collision in activation returns already_owned and rolls back grant/claim/secret/events, not the attempt', async () => {
    const id = await model('30009007');
    const card = await mint(id);
    const state = await snapshot();
    await withRace(card, async () => {
      assert.equal(await value("select count(*)::int from public.kalistar_collectibles where model_id=$1 and status='owned'", [id]), 0);
      await rejected("update public.kalistar_collectibles set owner_id=$1,status='owned',activated_at=clock_timestamp() where id=$2",
        [ids[0], card.id], '23505', undefined, uniqueName);
      const attempts = await value('select attempts from kalistar_private.attempts where user_id=$1', [ids[0]]);
      await as(0);
      assert.deepEqual(await value(activateSQL, [card.publicId, card.secret]), {ok: false, code: 'already_owned'});
      assert.deepEqual(await snapshot(), state);
      assert.equal(await value('select attempts from kalistar_private.attempts where user_id=$1', [ids[0]]), attempts + 1);
    });
    await as(0);
    assert.equal((await value(activateSQL, [card.publicId, card.secret])).ok, true);
  });

  await t.test('post-precheck SQL collision in acceptance raises already_owned and preserves the pending offer and secret', async () => {
    const id = await model('30009008');
    const card = await mint(id, 0);
    await as(0);
    const transfer = await value(offerSQL, [card.publicId, 'fixture_2']);
    const state = await snapshot();
    await withRace(card, async () => {
      await as(2);
      await duplicate(settleSQL, [transfer, 'accepted']);
      assert.deepEqual(await snapshot(), state);
    });
    await as(2);
    assert.equal((await value(settleSQL, [transfer, 'accepted'])).id, card.publicId);
  });

  await t.test('RPC handlers do not mislabel unrelated unique violations as already_owned', async () => {
    const card = await mint(await model('30009009'));
    await withRace(card, async () => {
      await as(0);
      await rejected(activateSQL, [card.publicId, card.secret], '23505', 'unrelated_unique', 'qa_other_unique');
    }, 'other_unique');
    const owned = await mint(await model('30009010'), 0);
    await as(0);
    const transfer = await value(offerSQL, [owned.publicId, 'fixture_2']);
    const state = await snapshot();
    await withRace(owned, async () => {
      await as(2);
      await rejected(settleSQL, [transfer, 'accepted'], '23505', 'unrelated_unique', 'qa_other_unique');
      assert.deepEqual(await snapshot(), state);
    }, 'other_unique');
  });
});
