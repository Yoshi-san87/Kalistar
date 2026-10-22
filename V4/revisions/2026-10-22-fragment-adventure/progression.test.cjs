'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../..'),sqlRoot=path.join(root,'V4/deploy/supabase');
const runtimeRequire=createRequire(path.join(process.env.KALISTAR_CLOUD_MODULES||path.join(root,'work/supabase-runtime/node_modules'),'_adventure_test.cjs'));
const {PGlite}=runtimeRequire('@electric-sql/pglite'),{pgcrypto}=runtimeRequire('@electric-sql/pglite/contrib/pgcrypto');
const Combat=require('../../site/journey-combat.js'),Composition=require('../../site/team-composition.js'),Engine=require('../../site/engine.js');
const legacyData=require('../../deploy/journey-legacy-4.6.85.json'),Hash=require('../../deploy/journey-hash.cjs');
const migrationName='202610220013_journey_momo_reward.sql',migration=fs.readFileSync(path.join(sqlRoot,'migrations',migrationName),'utf8');
const BOOK='momo-petits-bonheurs',OLD='30000001',NEXT='30000014';
const KEY='isolated-fragment-adventure-fixture-signing-key-not-production';
const ids=Array.from({length:7},(_,i)=>'00000000-0000-4000-8000-'+String(801+i).padStart(12,'0'));
const device='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const copy=value=>structuredClone(value);

async function fixture(t){
  const db=new PGlite({extensions:{pgcrypto}});t.after(()=>db.close());
  const value=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
  const as=async(index,role='authenticated')=>{
    await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[index===null?'':ids[index]]);
    assert(['anon','authenticated'].includes(role));await db.exec('set role '+role);
  };
  const rpc=async(index,name,args=[])=>{await as(index,index===null?'anon':'authenticated');try{return await value('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+')',args);}finally{await db.exec('reset role');}};
  await db.exec(`create schema auth;create schema extensions;create role anon;create role authenticated;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  for(const file of fs.readdirSync(path.join(sqlRoot,'migrations')).filter(file=>file.endsWith('.sql')&&file<migrationName).sort())await db.exec(fs.readFileSync(path.join(sqlRoot,'migrations',file),'utf8'));
  const metadata=legacyData.cards.map(c=>({id:c.id,character_id:c.characterId,name:c.name,title:c.title,positions:c.positions,element:c.element}));
  await db.query(`insert into public.kalistar_models(id,character_id,name,title,positions,element)
    select * from jsonb_to_recordset($1) as m(id text,character_id text,name text,title text,positions smallint[],element text)
    on conflict(id) do update set positions=excluded.positions,element=excluded.element`,[JSON.stringify(metadata)]);
  for(let i=0;i<ids.length;i++){
    await db.query('insert into auth.users values($1,now(),$2)',[ids[i],'adventure-'+i+'@example.invalid']);
    await db.query("insert into kalistar_private.players(user_id,email_sha256,local_profile,label) values($1,extensions.digest($2,'sha256'),$3,$4)",[ids[i],'adventure-'+i+'@example.invalid','user-adventure-'+i,'Fixture '+i]);
    await rpc(i,'kalistar_set_profile',['adventure_'+i,'Fixture '+i,false]);
  }
  await db.query('insert into kalistar_private.journey_config(id,signing_key) values(true,$1)',[KEY]);
  const owned=async(i,modelId)=>value("select count(*)::int from public.kalistar_collectibles where owner_id=$1 and model_id=$2 and status='owned'",[ids[i],modelId]);
  const issue=async(i,modelId)=>value("insert into public.kalistar_collectibles(model_id,owner_id,status,pilot,activated_at) values($1,$2,'owned',false,clock_timestamp()) returning kalistar_private.public_id(id)",[modelId,ids[i]]);
  const progress=async(i,cleared)=>db.query('insert into kalistar_private.journey_progress(user_id,book_id,cleared) values($1,$2,$3) on conflict(user_id,book_id) do update set cleared=excluded.cleared',[ids[i],BOOK,cleared]);
  const library=async i=>(await rpc(i,'kalistar_journey_library')).books.find(book=>book.id===BOOK);
  const snap=async()=>{
    await db.exec('reset role');const result={};
    for(const table of ['journey_progress','journey_attempts','journey_claims','journey_equipment_claims','equipment_grants','events','activations','player_saves'])result[table]=await value("select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from kalistar_private."+table+' r');
    result.collectibles=await value("select coalesce(jsonb_agg(to_jsonb(r) order by id),'[]'::jsonb) from public.kalistar_collectibles r");return result;
  };
  return {db,value,as,rpc,owned,issue,progress,library,snap};
}

test('Momo reward migration preserves earned progress, actual receipts and frozen fights in PostgreSQL',async t=>{
  const f=await fixture(t),{db,value,rpc,progress,library,owned,issue}=f,hash=await Hash.hash(root);
  await progress(0,4);const oldReceipt=await rpc(0,'kalistar_journey_claim',[BOOK]);
  await rpc(0,'kalistar_journey_ack',[BOOK]);
  await progress(1,4);const oldUnacked=await rpc(1,'kalistar_journey_claim',[BOOK]);
  await progress(2,4);await progress(3,3);await progress(4,1);await progress(5,4);
  const alreadyOwnedNew=await issue(5,NEXT);
  const E=Engine.createEngine(legacyData),team=Composition.create(E).fromPreset({name:'Previously committed team',cards:legacyData.decks.player});
  for(const modelId of team.cards)await issue(4,modelId);
  await rpc(4,'kalistar_sync_v2_claim',[device,0,false]);
  const pending=await rpc(4,'kalistar_journey_start',[BOOK,JSON.stringify(team),device,hash]);
  const saved=E.newGame(team,team,{mode:'ai',seed:pending.seed,arenaId:'electro',turnOrder:'ABBA',deckCoverage:2});
  saved.matchId='match-'+pending.id;
  const units=[...saved.players[0].board.filter(Boolean),...saved.players[0].reserve];
  saved.collection={schema:1,userId:pending.localProfile,opponent:'virtual',bindings:Object.fromEntries(units.map(u=>[u.instanceId,pending.cards.find(c=>c.modelId===u.cardId).id]))};
  saved.journey={version:1,attemptId:pending.id,bookId:BOOK,stage:pending.stage,revision:pending.revision,sequence:1,snapshot:Combat.freeze(legacyData,saved)};
  E.assertState(saved);
  const sign=state=>{
    const frame=JSON.stringify({attemptId:pending.id,actorId:pending.actorId,runtimeHash:hash,sequence:state.journey.sequence,state});
    return [frame,crypto.createHmac('sha256',KEY).update('kalistar-journey-v1:'+frame).digest('hex'),device];
  };
  const oldAttempt=await rpc(4,'kalistar_journey_commit',sign(saved));

  await t.test('rollback and repeat application leave personal state byte-for-byte equivalent',async()=>{
    const before=await f.snap(),beforeView=await library(0);
    const body=migration.replace(/^begin;$/m,'').replace(/^commit;$/m,'');
    await db.exec('begin;'+body+'rollback;');
    assert.deepEqual(await f.snap(),before);assert.deepEqual(await library(0),beforeView);
    assert.equal(await value('select version from kalistar_private.registry_version'),11);
    await db.exec(migration);assert.deepEqual(await f.snap(),before);
    const once=await library(0);await db.exec(migration);
    assert.deepEqual(await library(0),once);assert.deepEqual(await f.snap(),before);
    assert.equal(await value('select version from kalistar_private.registry_version'),12);
    assert.equal(await value('select count(*)::int from kalistar_private.journeys'),3);
  });

  await t.test('old claimed and unacknowledged versions stay truthful and cannot mint a second reward',async()=>{
    for(const [i,receipt] of [[0,oldReceipt],[1,oldUnacked]]){
      const b=await library(i);assert.equal(b.cleared,4);assert(b.claimed);
      assert.equal(b.rewardModelId,OLD);assert.equal(b.claimedRewardModelId,OLD);assert.equal(b.configuredRewardModelId,NEXT);
      assert.equal(b.acknowledged,i===0);
      const replay=await rpc(i,'kalistar_journey_claim',[BOOK]);assert(replay.replayed);assert.equal(replay.card.id,receipt.card.id);assert.equal(replay.card.modelId,OLD);
      assert.equal(await owned(i,OLD),1);assert.equal(await owned(i,NEXT),0);
    }
    await rpc(1,'kalistar_journey_ack',[BOOK]);assert((await library(1)).acknowledged);
    assert.equal((await library(1)).rewardModelId,OLD);
  });

  await t.test('completed but unclaimed gets the new version once; an existing version is reused',async()=>{
    const b=await library(2);assert.equal(b.rewardModelId,NEXT);assert.equal(b.claimedRewardModelId,null);assert(!b.claimed);
    const granted=await rpc(2,'kalistar_journey_claim',[BOOK]);assert.equal(granted.card.modelId,NEXT);assert(!granted.alreadyOwned&&!granted.replayed);
    assert.equal((await rpc(2,'kalistar_journey_claim',[BOOK])).card.id,granted.card.id);assert.equal(await owned(2,NEXT),1);
    const reused=await rpc(5,'kalistar_journey_claim',[BOOK]);assert(reused.alreadyOwned);assert.equal(reused.card.id,alreadyOwnedNew);assert.equal(await owned(5,NEXT),1);
    await assert.rejects(db.query("insert into public.kalistar_collectibles(model_id,owner_id,status,activated_at) values($1,$2,'owned',now())",[NEXT,ids[2]]),e=>e.code==='23505');
  });

  await t.test('transferring either edition never resets its claim or creates a replacement',async()=>{
    for(const [sender,recipient,modelId] of [[0,6,OLD],[2,6,NEXT]]){
      const receipt=await rpc(sender,'kalistar_journey_claim',[BOOK]);
      const transfer=await rpc(sender,'kalistar_offer',[receipt.card.id,'adventure_'+recipient]);
      await rpc(recipient,'kalistar_settle',[transfer,'accepted']);
      assert.equal(await owned(sender,modelId),0);assert.equal(await owned(recipient,modelId),1);
      const replay=await rpc(sender,'kalistar_journey_claim',[BOOK]);assert(replay.replayed);assert.equal(replay.card.id,receipt.card.id);
      assert.equal((await library(sender)).rewardModelId,modelId);assert.equal(await owned(sender,modelId),0);
    }
    const receipt=await rpc(5,'kalistar_journey_claim',[BOOK]);
    await assert.rejects(rpc(5,'kalistar_offer',[receipt.card.id,'adventure_6']),/already_owned/);
    assert.equal(await owned(6,NEXT),1);
  });

  await t.test('RLS, signing, progression and every reward ACK gate survive the revision',async()=>{
    for(const actor of [null,3,6])await assert.rejects(rpc(actor,'kalistar_journey_claim',[BOOK]),e=>e.code==='42501');
    await f.as(3);await assert.rejects(db.exec("update kalistar_private.journey_progress set cleared=7"),e=>e.code==='42501');await db.exec('reset role');
    await assert.rejects(rpc(4,'kalistar_journey_commit',['{}','a'.repeat(64),device]),e=>e.code==='42501');
    assert.equal((await library(3)).cleared,3);assert.equal((await library(6)).cleared,0);
    const rls=await value("select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname='kalistar_private' and c.relname like 'journey%'");assert(rls);
    await rpc(5,'kalistar_sync_v2_claim',[device,0,false]);
    for(const modelId of team.cards)await issue(5,modelId);
    const start=()=>rpc(5,'kalistar_journey_start',[BOOK,JSON.stringify(team),device,hash]);
    await assert.rejects(start(),e=>e.code==='42501');await rpc(5,'kalistar_journey_ack',[BOOK]);
    for(const stage of [4,5,6]){
      const a=await start();assert.equal(a.stage,stage);
      await rpc(5,'kalistar_journey_abandon',[a.id,device]);assert.equal((await library(5)).cleared,stage);
      await assert.rejects(rpc(5,'kalistar_journey_equipment_claim',[BOOK,stage]),e=>e.code==='42501');
      // Fixture the next earned victory to isolate the SQL gate; full signed battles have separate tests.
      await progress(5,stage+1);
      if(stage<6)await assert.rejects(start(),e=>e.code==='42501');
      const grant=await rpc(5,'kalistar_journey_equipment_claim',[BOOK,stage]);assert.equal(grant.stage,stage);
      if(stage<6)await assert.rejects(start(),e=>e.code==='42501');
      await rpc(5,'kalistar_journey_equipment_ack',[BOOK,stage]);
    }
    assert((await library(5)).finished);await assert.rejects(start(),e=>e.code==='22023');
  });

  await t.test('a saved old opponent and its profiles survive real Worker context and move',async()=>{
    assert.deepEqual(await rpc(4,'kalistar_journey_context',[oldAttempt.id,device]),oldAttempt);
    const {journeyRequest}=await import(pathToFileURL(path.join(root,'V4/deploy/journey-worker.mjs')).href);
    const changed=copy(legacyData);for(const c of changed.cards)c.title='Changed catalogue title';
    const source={Combat,Composition,hash},env={KALISTAR_JOURNEY_KEY:KEY,ASSETS:{fetch:async()=>Response.json(changed)}};
    const fetcher=async(url,options)=>{
      const name=url.split('/').at(-1),args=JSON.parse(options.body);
      const parameters=name.endsWith('_context')?[args.p_attempt_id,args.p_device_id]:[args.p_frame,args.p_signature,args.p_device_id];
      assert(['kalistar_journey_context','kalistar_journey_commit'].includes(name));return Response.json(await rpc(4,name,parameters));
    };
    const request=async(action,extra={})=>journeyRequest(new Request('https://isolated.test/api/journeys/'+action,{method:'POST',headers:{Origin:'https://isolated.test',Authorization:'Bearer fixture-only','Content-Type':'application/json'},body:JSON.stringify({attemptId:oldAttempt.id,deviceId:device,...extra})}),env,fetcher,source);
    const response=await request('context');assert.equal(response.status,200);assert.deepEqual((await response.json()).attempt,oldAttempt);
    const moved=await request('move',{sequence:oldAttempt.sequence,commands:[{method:'rollInitiative'}]});assert.equal(moved.status,200);
    const next=(await moved.json()).attempt;assert.equal(next.sequence,oldAttempt.sequence+1);
    assert.deepEqual(next.state.players,oldAttempt.state.players);assert.deepEqual(next.state.journey.snapshot,oldAttempt.state.journey.snapshot);
    assert.deepEqual(next.state.equipment,oldAttempt.state.equipment);assert.equal(next.runtimeHash,hash);
    const again=await request('context');assert.deepEqual((await again.json()).attempt,next);
    assert.equal((await library(4)).cleared,1);
  });

  await t.test('backups restore both historical receipts and the new future reward without reminting',async()=>{
    const backup=require('../../deploy/supabase/backup.cjs'),{drill}=require('../../deploy/supabase/backup-drill.cjs');
    const rows=(await db.query(backup.query())).rows,csv='part,parts,sha256,chunk\n'+rows.map(r=>[r.part,r.parts,r.sha256,r.chunk].join(',')).join('\n');
    const snapshot=backup.decodeCSV(csv),bundle=backup.bundle(snapshot);assert.equal(bundle.migrations.length,13);
    const result=await drill(bundle);assert(result.passed);assert.equal(result.tables['kalistar_private.journey_claims'],4);
    const older=copy(snapshot);older.tables.find(t=>t.name==='registry_version').rows[0].version=11;
    assert.equal(backup.bundle(older).migrations.length,12,'Unpublished migration must not enter a pre-migration backup');
  });
});

test('migration identity guard fails atomically instead of rewriting an unexpected reward',async t=>{
  const f=await fixture(t);await f.db.exec("update kalistar_private.journeys set reward_model_id='30000007' where id='momo-petits-bonheurs'");
  const before=await f.snap();await assert.rejects(f.db.exec(migration),/Unexpected Momo Fragment/);await f.db.exec('rollback');
  assert.deepEqual(await f.snap(),before);assert.equal(await f.value('select version from kalistar_private.registry_version'),11);
  assert.equal(await f.value("select reward_model_id from kalistar_private.journeys where id='momo-petits-bonheurs'"),'30000007');
});

test('a never-initialized current-runtime attempt adopts the latest stable stage definitions exactly once',async()=>{
  const data=(await require('../../deploy/build.cjs').plan()).catalogue,runtime=Combat.create(data),hash=await Hash.hash(root);
  const team=Composition.create(runtime.engine).fromPreset({name:'Pending attempt fixture',cards:data.decks.player});
  const book=runtime.books.find(book=>book.id===BOOK),stage=1;
  let stored={id:crypto.randomUUID(),actorId:ids[0],localProfile:'user-adventure-0',bookId:BOOK,revision:'journeys-1',stage,
    seed:'pending-current-adventure',deck:team,cards:team.cards.map((modelId,i)=>({modelId,id:'KC-'+String(i+1).padStart(32,'0')})),
    runtimeHash:hash,sequence:0,state:null,status:'active'},commits=0;
  const {journeyRequest}=await import(pathToFileURL(path.join(root,'V4/deploy/journey-worker.mjs')).href);
  const source={Combat,Composition,hash},env={KALISTAR_JOURNEY_KEY:KEY,ASSETS:{fetch:async()=>Response.json(data)}};
  const fetcher=async(url,options)=>{
    if(url.endsWith('kalistar_journey_context'))return Response.json(stored);
    assert(url.endsWith('kalistar_journey_commit'));
    const input=JSON.parse(options.body),frame=JSON.parse(input.p_frame);
    assert.equal(input.p_signature,crypto.createHmac('sha256',KEY).update('kalistar-journey-v1:'+input.p_frame).digest('hex'));
    stored={...stored,sequence:frame.sequence,state:frame.state};commits++;return Response.json(stored);
  };
  const request=()=>journeyRequest(new Request('https://isolated.test/api/journeys/context',{method:'POST',headers:{Origin:'https://isolated.test',Authorization:'Bearer fixture-only','Content-Type':'application/json'},
    body:JSON.stringify({attemptId:stored.id,deviceId:device})}),env,fetcher,source);
  const response=await request();assert.equal(response.status,200);const first=(await response.json()).attempt;
  assert.equal(first.revision,'journeys-1');assert.equal(first.stage,stage);assert.equal(first.sequence,1);
  const opponent=[...first.state.players[1].board.filter(Boolean),...first.state.players[1].reserve].map(u=>u.cardId).sort();
  assert.deepEqual(opponent,book.stages[stage].deck.slice().sort());assert.equal(first.state.arenaId,book.stages[stage].arenaId);
  const resumed=await request();assert.deepEqual((await resumed.json()).attempt,first);assert.equal(commits,1);
});
