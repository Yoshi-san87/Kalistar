'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_CLOUD_MODULES||path.resolve(__dirname,'../../../work/supabase-runtime/node_modules'),'_momo_night_test.cjs'));
const {PGlite}=runtime('@electric-sql/pglite'),{pgcrypto}=runtime('@electric-sql/pglite/contrib/pgcrypto');
const NAME='202610270015_momo_night_reward.sql',BOOK='momo-petits-bonheurs',NIGHT='30000001',STANDING='30000014';
const sql=fs.readFileSync(path.join(__dirname,'migrations',NAME),'utf8');
const ids=Array.from({length:6},(_,i)=>'00000000-0000-4000-8000-'+String(971+i).padStart(12,'0'));

test('Momo night reward preserves all earned editions and applies only to future claims',async t=>{
  const db=new PGlite({extensions:{pgcrypto}});t.after(()=>db.close());
  const value=async(q,args=[])=>Object.values((await db.query(q,args)).rows[0])[0];
  const rows=table=>value("select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from "+table+' r');
  const rpc=async(i,name,args=[])=>{
    await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[i===null?'':ids[i]]);
    await db.exec('set role '+(i===null?'anon':'authenticated'));
    try{return await value('select public.'+name+'('+args.map((_,j)=>'$'+(j+1)).join(',')+')',args);}finally{await db.exec('reset role');}
  };
  const library=async i=>(await rpc(i,'kalistar_journey_library')).books.find(b=>b.id===BOOK);
  const claim=i=>rpc(i,'kalistar_journey_claim',[BOOK]);
  await db.exec(`create schema auth;create schema extensions;create role anon;create role authenticated;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  for(const file of fs.readdirSync(path.join(__dirname,'migrations')).filter(f=>f.endsWith('.sql')&&f<NAME).sort())await db.exec(fs.readFileSync(path.join(__dirname,'migrations',file),'utf8'));
  for(let i=0;i<ids.length;i++){
    await db.query('insert into auth.users values($1,now(),$2)',[ids[i],'momo-'+i+'@example.invalid']);
    await db.query("insert into kalistar_private.players(user_id,email_sha256,local_profile,label) values($1,extensions.digest($2,'sha256'),$3,$4)",[ids[i],'momo-'+i+'@example.invalid','user-momo-'+i,'Fixture '+i]);
    await rpc(i,'kalistar_set_profile',['momo_'+i,'Fixture '+i,false]);
    // Migration-only milestones; the signed battle path is exercised by journeys tests.
    await db.query('insert into kalistar_private.journey_progress(user_id,book_id,cleared) values($1,$2,$3)',[ids[i],BOOK,i===4?3:4]);
  }
  const standing=await claim(0);assert.equal(standing.card.modelId,STANDING);
  await db.query('update kalistar_private.journeys set reward_model_id=$1 where id=$2',[NIGHT,BOOK]);
  const night=await claim(1);assert.equal(night.card.modelId,NIGHT);await rpc(1,'kalistar_journey_ack',[BOOK]);
  await db.query('update kalistar_private.journeys set reward_model_id=$1 where id=$2',[STANDING,BOOK]);
  await db.query("insert into public.kalistar_collectibles(model_id,owner_id,status,activated_at) values($1,$2,'owned',now())",[NIGHT,ids[3]]);
  const preserved={};
  for(const table of ['public.kalistar_collectibles','kalistar_private.journey_claims','kalistar_private.journey_progress','kalistar_private.journey_attempts','kalistar_private.player_saves','kalistar_private.equipment_grants','kalistar_private.journey_equipment_claims'])preserved[table]=await rows(table);
  await t.test('migration is rollback-safe, idempotent and does not touch personal state',async()=>{
    await db.exec('begin;'+sql.replace(/^begin;$/m,'').replace(/^commit;$/m,'')+'rollback;');
    assert.equal(await value('select version from kalistar_private.registry_version'),13);
    assert.equal((await library(2)).rewardModelId,STANDING);
    await db.exec(sql);await db.exec(sql);
    for(const [table,before] of Object.entries(preserved))assert.deepEqual(await rows(table),before,table);
    assert.equal(await value('select version from kalistar_private.registry_version'),14);
  });
  await t.test('both historical editions keep their specimen, actual cover and pending ceremony',async()=>{
    for(const [i,receipt] of [[0,standing],[1,night]]){
      const b=await library(i);assert.equal(b.rewardModelId,receipt.card.modelId);assert.equal(b.configuredRewardModelId,NIGHT);
      assert.equal(b.claimedRewardModelId,receipt.card.modelId);assert.equal(b.acknowledged,i===1);
      assert.equal((await claim(i)).card.id,receipt.card.id);
    }
  });
  await t.test('new claims award the night edition exactly once, including already-owned cards',async()=>{
    assert.equal((await library(2)).rewardModelId,NIGHT);
    const c=await claim(2);assert.equal(c.card.modelId,NIGHT);assert.equal((await claim(2)).card.id,c.card.id);
    const reused=await claim(3);assert.equal(reused.card.modelId,NIGHT);assert(reused.alreadyOwned);
    assert.equal(await value("select count(*)::int from public.kalistar_collectibles where owner_id=$1 and model_id=$2 and status='owned'",[ids[3],NIGHT]),1);
    const offer=await rpc(2,'kalistar_offer',[c.card.id,'momo_5']);await rpc(5,'kalistar_settle',[offer,'accepted']);
    assert.equal((await claim(2)).card.id,c.card.id,'transfer cannot reset an earned reward');
    await assert.rejects(claim(4),e=>e.code==='42501');
    await assert.rejects(rpc(null,'kalistar_journey_claim',[BOOK]),e=>e.code==='42501');
  });
  await t.test('night Momo is compatible with every sequel reward',async()=>{
    const data=(await require('../build.cjs').plan()).catalogue,Q=require('../../site/equipment.js');
    const book=require('../../site/journey-definitions.js').catalogue(data).find(b=>b.id===BOOK);
    assert.equal(book.rewardModelId,NIGHT);
    const card=data.cards.find(c=>c.id===NIGHT);
    for(const stage of book.bonusStages)assert(Q.compatible(Q.catalogue.weapons.find(w=>w.id===stage.rewardEquipmentId),card));
  });
  await t.test('schema fourteen backup restores real claims without rewriting their reward',async()=>{
    const B=require('./backup.cjs'),parts=(await db.query(B.query())).rows;
    const csv='part,parts,sha256,chunk\n'+parts.map(r=>[r.part,r.parts,r.sha256,r.chunk].join(',')).join('\n');
    const bundle=B.bundle(B.decodeCSV(csv));assert.equal(bundle.migrations.length,15);
    assert((await require('./backup-drill.cjs').drill(bundle)).passed);
  });
});
