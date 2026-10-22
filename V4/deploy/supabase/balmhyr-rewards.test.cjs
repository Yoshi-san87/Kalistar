'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_CLOUD_MODULES||path.resolve(__dirname,'../../../work/supabase-runtime/node_modules'),'_balmhyr_test.cjs'));
const {PGlite}=runtime('@electric-sql/pglite'),{pgcrypto}=runtime('@electric-sql/pglite/contrib/pgcrypto');
const NAME='202610220014_balmhyr_iron_gauntlet.sql',sql=fs.readFileSync(path.join(__dirname,'migrations',NAME),'utf8');
const BOOK='balmhyr-retour',OLD='49900802',NEXT='30000007';
const ids=Array.from({length:6},(_,i)=>'00000000-0000-4000-8000-'+String(901+i).padStart(12,'0'));

test('Balmhyr rewards migrate additively with exact old receipts, private audit and stable card ownership',async t=>{
  const db=new PGlite({extensions:{pgcrypto}});t.after(()=>db.close());
  const value=async(q,args=[])=>Object.values((await db.query(q,args)).rows[0])[0];
  const rpc=async(i,name,args=[])=>{
    await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[i===null?'':ids[i]]);
    await db.exec('set role '+(i===null?'anon':'authenticated'));
    try{return await value('select public.'+name+'('+args.map((_,j)=>'$'+(j+1)).join(',')+')',args);}finally{await db.exec('reset role');}
  };
  const rows=table=>value("select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from "+table+' r');
  const progress=(i,n,book=BOOK)=>db.query('insert into kalistar_private.journey_progress(user_id,book_id,cleared) values($1,$2,$3) on conflict(user_id,book_id) do update set cleared=excluded.cleared',[ids[i],book,n]);
  const grant=(i,id)=>db.query("insert into kalistar_private.equipment_grants(user_id,equipment_id,source) values($1,$2,'isolated-test') on conflict do nothing",[ids[i],id]);
  const library=async i=>(await rpc(i,'kalistar_journey_library')).books.find(b=>b.id===BOOK);
  const claim=(i,stage)=>rpc(i,'kalistar_journey_equipment_claim',[BOOK,stage]);
  await db.exec(`create schema auth;create schema extensions;create role anon;create role authenticated;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  for(const f of fs.readdirSync(path.join(__dirname,'migrations')).filter(f=>f.endsWith('.sql')&&f<NAME).sort())await db.exec(fs.readFileSync(path.join(__dirname,'migrations',f),'utf8'));
  for(let i=0;i<ids.length;i++){
    await db.query('insert into auth.users values($1,now(),$2)',[ids[i],'balmhyr-'+i+'@example.invalid']);
    await db.query("insert into kalistar_private.players(user_id,email_sha256,local_profile,label) values($1,extensions.digest($2,'sha256'),$3,$4)",[ids[i],'balmhyr-'+i+'@example.invalid','user-balmhyr-'+i,'Fixture '+i]);
    await rpc(i,'kalistar_set_profile',['balmhyr_'+i,'Fixture '+i,false]);
  }
  // Fixture earned milestones to isolate migration behavior; signed battles have separate tests.
  const oldCards=[];
  for(const i of [0,1,2]){
    await progress(i,7);oldCards.push(await rpc(i,'kalistar_journey_claim',[BOOK]));
    await rpc(i,'kalistar_journey_ack',[BOOK]);
    await claim(i,4);
    if(i===0)continue; // An unacknowledged stage-four receipt must remain unacknowledged.
    await rpc(i,'kalistar_journey_equipment_ack',[BOOK,4]);await claim(i,5);
    await rpc(i,'kalistar_journey_equipment_ack',[BOOK,5]);await claim(i,6);
    await rpc(i,'kalistar_journey_equipment_ack',[BOOK,6]);
  }
  await grant(2,'fallen-king-axe');
  await progress(3,4);await progress(4,3);
  await progress(5,5,'momo-petits-bonheurs');await rpc(5,'kalistar_journey_claim',['momo-petits-bonheurs']);
  await rpc(5,'kalistar_journey_ack',['momo-petits-bonheurs']);await rpc(5,'kalistar_journey_equipment_claim',['momo-petits-bonheurs',4]);
  const receipts=await rows('kalistar_private.journey_equipment_claims'),oldGrants=await rows('kalistar_private.equipment_grants');
  const preserved={};
  for(const name of ['public.kalistar_collectibles','kalistar_private.journey_claims','kalistar_private.journey_progress','kalistar_private.journey_attempts','kalistar_private.player_saves'])preserved[name]=await rows(name);

  await t.test('rollback and idempotence, without resetting progress, saves or earned cards',async()=>{
    const body=sql.replace(/^begin;$/m,'').replace(/^commit;$/m,'');
    await db.exec('begin;'+body+'rollback;');
    assert.equal(await value('select version from kalistar_private.registry_version'),12);
    assert.deepEqual(await rows('kalistar_private.journey_equipment_claims'),receipts);
    await db.exec(sql);
    for(const [table,before] of Object.entries(preserved))assert.deepEqual(await rows(table),before,table);
    assert.equal(await value('select version from kalistar_private.registry_version'),13);
    const once={};for(const table of ['journey_reward_adjustments','journey_equipment_claims','equipment_grants','journey_equipment_rewards'])once[table]=await rows('kalistar_private.'+table);
    await db.exec(sql);for(const [table,before] of Object.entries(once))assert.deepEqual(await rows('kalistar_private.'+table),before,table);
    for(const old of oldGrants)assert((await rows('kalistar_private.equipment_grants')).some(g=>JSON.stringify(g)===JSON.stringify(old)),'Old object and origin remain');
  });
  await t.test('replacement receipts match current slots and preserve original audit, ACK and uniqueness',async()=>{
    const adjustments=await rows('kalistar_private.journey_reward_adjustments');assert.equal(adjustments.length,5);
    for(const a of adjustments){
      const old=receipts.find(c=>c.user_id===a.user_id&&c.book_id===a.book_id&&c.stage===a.stage);
      assert.deepEqual(a.previous_claim,old);
      const c=(await rows('kalistar_private.journey_equipment_claims')).find(c=>c.user_id===a.user_id&&c.book_id===a.book_id&&c.stage===a.stage);
      assert.equal(c.acknowledged,old.acknowledged);assert.equal(c.created_at,old.created_at);assert.equal(c.equipment_id,a.equipment_id);
    }
    assert.equal((await library(0)).equipmentClaims[0].acknowledged,false);
    assert.deepEqual((await library(1)).equipmentClaims.map(c=>[c.equipmentId,c.kind]),[['fallen-king-axe','weapon'],['durane-rampart','shield'],['mythic-iron-gauntlet','relic']]);
    assert((await library(1)).finished);
    assert.equal((await claim(2,4)).alreadyOwned,true);
    assert.equal((await claim(1,6)).alreadyOwned,true,'The former gauntlet is reused, not duplicated');
    for(const i of [0,1,2]){assert((await claim(i,4)).replayed);assert.equal((await claim(i,4)).equipmentId,'fallen-king-axe');}
    const momo=(await rpc(5,'kalistar_journey_library')).books.find(b=>b.id==='momo-petits-bonheurs');assert.equal(momo.equipmentClaims[0].equipmentId,'little-joys-flute');
  });
  await t.test('old print remains truthful while new card and all three rewards are compatible',async()=>{
    for(let i=0;i<3;i++){
      const b=await library(i);assert.equal(b.rewardModelId,OLD);assert.equal(b.configuredRewardModelId,NEXT);
      assert.equal((await rpc(i,'kalistar_journey_claim',[BOOK])).card.id,oldCards[i].card.id);
    }
    assert.equal((await library(3)).rewardModelId,NEXT);
    const c=await rpc(3,'kalistar_journey_claim',[BOOK]);assert.equal(c.card.modelId,NEXT);
    assert.equal((await rpc(3,'kalistar_journey_claim',[BOOK])).card.id,c.card.id);
    await rpc(3,'kalistar_journey_ack',[BOOK]);
    for(const [stage,id] of [[4,'fallen-king-axe'],[5,'durane-rampart'],[6,'mythic-iron-gauntlet']]){
      await assert.rejects(claim(3,stage),e=>e.code==='42501');await progress(3,stage+1);
      assert.equal((await claim(3,stage)).equipmentId,id);await rpc(3,'kalistar_journey_equipment_ack',[BOOK,stage]);
    }
    assert((await library(3)).finished);
    const Q=require('../../site/equipment.js'),data=(await require('../build.cjs').plan()).catalogue;
    const card=data.cards.find(c=>c.id===NEXT);
    for(const id of ['fallen-king-axe','durane-rampart','mythic-iron-gauntlet'])assert(Q.compatible(Q.catalogue.weapons.find(w=>w.id===id),card));
    const transfer=await rpc(3,'kalistar_offer',[c.card.id,'balmhyr_4']);await rpc(4,'kalistar_settle',[transfer,'accepted']);
    assert.equal((await rpc(3,'kalistar_journey_claim',[BOOK])).card.id,c.card.id,'Transfer never resets an earned reward');
  });
  await t.test('RLS and early-claim rejection remain closed, including the audit',async()=>{
    await assert.rejects(rpc(null,'kalistar_journey_equipment_claim',[BOOK,4]),e=>e.code==='42501');
    await assert.rejects(claim(4,4),e=>e.code==='42501');await assert.rejects(rpc(4,'kalistar_journey_claim',[BOOK]),e=>e.code==='42501');
    for(const role of ['anon','authenticated']){
      assert.equal(await value("select has_table_privilege($1,'kalistar_private.journey_reward_adjustments','SELECT,INSERT,UPDATE,DELETE')",[role]),false);
    }
    assert(await value("select relrowsecurity from pg_class where oid='kalistar_private.journey_reward_adjustments'::regclass"));
  });
  await t.test('schema thirteen backup restores the audit and every earned object',async()=>{
    const B=require('./backup.cjs'),parts=(await db.query(B.query())).rows;
    const csv='part,parts,sha256,chunk\n'+parts.map(r=>[r.part,r.parts,r.sha256,r.chunk].join(',')).join('\n');
    const bundle=B.bundle(B.decodeCSV(csv));assert.equal(bundle.migrations.length,14);
    const restored=await require('./backup-drill.cjs').drill(bundle);assert(restored.passed);
    assert.equal(restored.tables['kalistar_private.journey_reward_adjustments'],5);
  });
});
