'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_CLOUD_MODULES||path.resolve(__dirname,'../../../work/supabase-runtime/node_modules'),'_sync_test.cjs'));
const {PGlite}=runtime('@electric-sql/pglite'),{pgcrypto}=runtime('@electric-sql/pglite/contrib/pgcrypto'),grants=require('./starter-grants.cjs');
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
test('real PostgreSQL: complete/ten-card starter sets, idempotent distribution, private saves and single writer',async t=>{
  const data=(await require('../build.cjs').plan()).catalogue,db=new PGlite({extensions:{pgcrypto}});
  const query=(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>Object.values((await query(sql,args)).rows[0])[0];
  const as=async(index,role='authenticated')=>{await db.exec('reset role');await query("select set_config('request.jwt.claim.sub',$1,false)",[index===null?'':ids[index]]);await db.exec('set role '+role);};
  const denied=async(sql,args=[])=>assert.rejects(query(sql,args),e=>['42501','22023'].includes(e.code));
  const deviceA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',deviceB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  let payload;
  try{
    await db.exec(`create schema auth;create schema extensions;create role anon;create role authenticated;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
    for(let i=0;i<3;i++)await query('insert into auth.users values($1,now(),$2)',[ids[i],'player'+i+'@example.invalid']);
    for(const file of fs.readdirSync(path.join(__dirname,'migrations')).filter(n=>n.endsWith('.sql')).sort())await db.exec(fs.readFileSync(path.join(__dirname,'migrations',file),'utf8'));
    for(let i=0;i<2;i++)await query("insert into kalistar_private.players(user_id,email_sha256,local_profile,label) values($1,extensions.digest($2,'sha256'),$3,$4)",[ids[i],'player'+i+'@example.invalid',i?'user-tokyo':'user-paris',i?'Tokyo':'Paris']);
    await t.test('granting all current versions to Paris and exactly ten playable cards including stable Kaylis to Tokyo',async()=>{
      const plan=grants.plan(data);assert.equal(plan.models.length,data.cards.length);assert(plan.tokyo.includes('30000012'));
      await db.exec(grants.sql(data));const count=await value('select count(*)::int from public.kalistar_collectibles');
      assert.equal(count,data.cards.length+10);await db.exec(grants.sql(data));assert.equal(await value('select count(*)::int from public.kalistar_collectibles'),count);
      await as(0);const paris=await value('select public.kalistar_player()');assert.equal(paris.cards.length,data.cards.length);assert.equal(new Set(paris.cards.map(c=>c.modelId)).size,data.cards.length);assert(paris.cards.every(c=>!c.pilot));
      await as(1);const tokyo=await value('select public.kalistar_player()');assert.equal(tokyo.cards.length,10);assert(tokyo.cards.some(c=>c.modelId==='30000012'));
      assert((await value('select public.kalistar_validate_deck($1)',[JSON.stringify(tokyo.starterDeck)])).ok);
      await denied('select public.kalistar_validate_deck($1)',[JSON.stringify(data.decks.player)]);
      const engine=require('../../site/engine.js').createEngine(data),Team=require('../../site/team-composition.js').create(engine);
      const own=Team.fromPreset({name:'Tokyo',cards:tokyo.starterDeck}),enemy=Team.fromPreset({name:'Virtual',cards:data.decks.enemy});
      const state=engine.newGame(own,enemy,{mode:'ai',seed:'cloud-sync-fixture',turnOrder:'ABBA',deckCoverage:2});
      const all=[...state.players[0].board.filter(Boolean),...state.players[0].reserve,...state.players[0].dead];
      state.collection={schema:1,userId:'user-tokyo',opponent:'virtual',bindings:Object.fromEntries(all.map(u=>[u.instanceId,tokyo.cards.find(c=>c.modelId===u.cardId).id]))};
      payload={schema:1,edition:'V4',localProfile:'user-tokyo',preferences:{teamDraft:own,deck:own.cards,deckName:'Tokyo'},deckLibrary:{schema:2,edition:'V4',decks:[]},equipment:require('../../site/equipment.js').profile('user-tokyo'),matches:[{id:state.matchId,state}],activeMatchId:state.matchId,releasedMatches:[]};
    });
    await t.test('no anonymous/outsider RPC or direct save-table access; accounts never select another owner',async()=>{
      await as(null,'anon');for(const name of ['kalistar_player','kalistar_sync_read'])await denied('select public.'+name+'()');
      await as(2);await denied('select public.kalistar_sync_read()');await as(1);await denied('select * from kalistar_private.player_saves');
      assert.equal((await value('select public.kalistar_sync_read()')).payload,null);
    });
    await t.test('CAS writes and lease takeover stop a second device from overwriting a newer match',async()=>{
      await as(1);assert((await value('select public.kalistar_sync_claim($1,0,false)',[deviceA])).ok);
      const first=await value('select public.kalistar_sync_write($1,0,$2)',[deviceA,JSON.stringify(payload)]);assert.equal(first.revision,1);
      assert.equal(first.payload,null);assert.equal(first.unchanged,true);
      const unchanged=await value('select public.kalistar_sync_read(1)');assert.equal(unchanged.payload,null);assert.equal(unchanged.unchanged,true);
      assert((await value('select public.kalistar_sync_read()')).payload.matches.length);
      assert.equal((await value('select public.kalistar_sync_claim($1,1,false)',[deviceB])).code,'busy');
      assert.equal((await value('select public.kalistar_sync_claim($1,0,true)',[deviceB])).code,'conflict');
      assert((await value('select public.kalistar_sync_claim($1,1,true)',[deviceB])).ok);
      assert.equal((await value('select public.kalistar_sync_write($1,1,$2)',[deviceA,JSON.stringify(payload)])).code,'busy');
      assert.equal((await value('select public.kalistar_sync_write($1,1,$2)',[deviceB,JSON.stringify(payload)])).revision,2);
      assert.equal((await value('select public.kalistar_sync_write($1,1,$2)',[deviceB,JSON.stringify(payload)])).code,'conflict');
      await as(0);assert.equal((await value('select public.kalistar_sync_read()')).payload,null);await as(1);
    });
    await t.test('private progress cannot mint ownership, cross account boundaries, replay demo collections or hide a duplicated specimen',async()=>{
      for(const patch of [{localProfile:'user-paris'},{collectibles:[]},{preferences:{password:'never-store'}},{equipment:{id:'user-paris'}}])await denied('select public.kalistar_sync_write($1,2,$2)',[deviceB,JSON.stringify({...payload,...patch})]);
      const forged=structuredClone(payload),bindings=forged.matches[0].state.collection.bindings,keys=Object.keys(bindings);bindings[keys[0]]=bindings[keys[1]];
      await denied('select public.kalistar_sync_write($1,2,$2)',[deviceB,JSON.stringify(forged)]);
      assert.equal((await value('select public.kalistar_player()')).cards.length,10);
    });
    await t.test('active match blocks transfer, finished/released active slot permits normal owner-confirmed transfer',async()=>{
      const specimen=Object.values(payload.matches[0].state.collection.bindings)[0];
      await denied('select public.kalistar_offer($1,$2)',[specimen,'kalistar_paris']);
      const released={...payload,activeMatchId:null};assert((await value('select public.kalistar_sync_write($1,2,$2)',[deviceB,JSON.stringify(released)])).ok);
      assert(await value('select public.kalistar_offer($1,$2)',[specimen,'kalistar_paris']));
      await denied('select public.kalistar_sync_write($1,3,$2)',[deviceB,JSON.stringify(payload)]);
      await value('select public.kalistar_sync_release($1)',[deviceB]);assert.equal((await value('select public.kalistar_sync_write($1,3,$2)',[deviceB,JSON.stringify(released)])).code,'busy');
      assert.equal((await value('select public.kalistar_sync_write(null,3,$1)',[JSON.stringify(released)])).code,'busy');
    });
  }finally{await db.close();}
});
