'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const Combat=require('../../site/journey-combat.js'),Composition=require('../../site/team-composition.js');
const KEY='local-fragment-sequels-test-only-signing-key-20261021';
function command(E,s,policy=0,step=0){
  if(E.equipmentChoice(s))return {method:'grantEquipment',args:[E.aiEquipmentChoice(s)]};
  if(s.phase==='initiative')return {method:'rollInitiative'};
  if(s.phase==='choose'){
    let pair=E.aiChoice(s);
    if(!s.turn&&policy){const pairs=s.players[0].board.flatMap((u,a)=>u?s.players[1].board.flatMap((v,b)=>v?[[a,b]]:[]):[]);pair=pairs[(step*(policy+1)+policy*7)%pairs.length];}
    return {method:'lock',args:pair};
  }
  if(s.phase==='attack'||s.phase==='defense')return {method:s.phase==='attack'?'rollAttack':'rollDefense'};
  if(s.phase==='kalistel')return {method:E.aiUseKalistel(s)?'useKalistel':'acceptAttack'};
  if(s.phase==='replace')return {method:'autoDeploy',args:[s.replacing]};
  if(s.phase==='result')return {method:'next'};
  const kind={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];
  assert(kind,s.phase);return {method:'grant'+kind,args:[E['ai'+kind+'Choice'](s)]};
}
function terminal(runtime,initial,winner){
  // Local SQL-fixture outcome search, not a full HTTP transcript or a balance claim.
  const E=runtime.engine;
  for(let policy=0;policy<30;policy++){
    const s=E.restoreGame(structuredClone(initial));
    for(let i=0;i<4000&&s.phase!=='over';i++){
      const c=command(E,s,policy,i),before=['next','autoDeploy','deploy'].includes(c.method)?E.clone(s):null;
      E[c.method](s,...(c.args||[]));
      if(s.phase==='over'&&s.winner===winner){assert(before);return runtime.apply(before,[c]);}
    }
  }
  throw Error('No real outcome in bounded fixture search');
}
test('seven-stage Fragment rewards: actual signed engine results, gated claims and isolated ownership',async t=>{
  const data=(await require('../build.cjs').plan()).catalogue,runtime=Combat.create(data),hash=await require('../journey-hash.cjs').hash();
  for(const book of runtime.books)await t.test(book.id,async()=>{
    const f=await require('./browser-fixture.cjs').create(data,{journeyKey:KEY}),device=crypto.randomUUID();
    const call=(name,args={},user='user-tokyo')=>f.call('kalistar_journey_'+name,args,user);
    const claim=stage=>call('equipment_claim',{p_book_id:book.id,p_stage:stage});
    const library=async()=> (await call('library')).books.find(b=>b.id===book.id);
    try{
      const player=await f.call('kalistar_player',{},'user-tokyo'),paris=await f.call('kalistar_player',{},'user-paris');
      const team=Composition.create(runtime.engine).fromPreset({name:'Local sequel test',cards:player.starterDeck});
      await f.call('kalistar_sync_v2_claim',{p_device_id:device,p_expected_revision:0,p_takeover:false},'user-tokyo');
      const start=()=>call('start',{p_book_id:book.id,p_deck:team,p_device_id:device,p_runtime_hash:hash});
      const commit=async(a,state)=>{
        const frame=JSON.stringify({attemptId:a.id,actorId:a.actorId,runtimeHash:a.runtimeHash,sequence:state.journey.sequence,state});
        return call('commit',{p_frame:frame,p_signature:crypto.createHmac('sha256',KEY).update('kalistar-journey-v1:'+frame).digest('hex'),p_device_id:device});
      };
      assert.deepEqual(player.equipment.ids,[]);
      for(const stage of [4,5,6,-1,7,null])await assert.rejects(claim(stage),e=>e.code==='42501');
      await call('equipment_ack',{p_book_id:book.id,p_stage:6});
      assert.deepEqual((await library()).equipmentClaims,[]);
      let issuedCard;
      for(let stage=0;stage<7;stage++){
        let attempt=await start();assert.equal(attempt.stage,stage);
        const initial=runtime.initial(attempt);attempt=await commit(attempt,initial);
        if(stage===4){
          const lost=await commit(attempt,terminal(runtime,initial,1));assert.equal(lost.status,'lost');assert.equal((await library()).cleared,4);
          await assert.rejects(claim(4),e=>e.code==='42501');attempt=await start();assert.equal(attempt.stage,4);
          attempt=await commit(attempt,runtime.initial(attempt));
        }
        await assert.rejects(call('commit',{p_frame:'{}',p_signature:'a'.repeat(64),p_device_id:device}),e=>e.code==='42501');
        const won=await commit(attempt,terminal(runtime,attempt.state,0));assert.equal(won.status,'won');
        assert.equal((await library()).cleared,stage+1);
        if(stage<3)continue;
        if(stage===3){
          await assert.rejects(start(),e=>e.code==='42501');
          issuedCard=await call('claim',{p_book_id:book.id});
          assert.equal(issuedCard.card.modelId,book.rewardModelId);
          assert.equal((await call('claim',{p_book_id:book.id})).card.id,issuedCard.card.id);
          await assert.rejects(start(),e=>e.code==='42501');
          await call('ack',{p_book_id:book.id});
          assert.equal((await library()).finished,false);
          continue;
        }
        if(stage<6)await assert.rejects(start(),e=>e.code==='42501');
        const claimed=await claim(stage),reward=book.stages[stage];
        assert.equal(claimed.equipmentId,reward.rewardEquipmentId);assert.equal(claimed.kind,reward.rewardKind);assert.equal(claimed.replayed,false);
        const repeated=await claim(stage);assert.equal(repeated.replayed,true);assert.equal(repeated.equipmentId,claimed.equipmentId);
        assert.equal((await call('claim',{p_book_id:book.id})).card.id,issuedCard.card.id,'Original card claim stays idempotent beyond fourth fight');
        await assert.rejects(call('equipment_claim',{p_book_id:book.id,p_stage:stage},'user-paris'),e=>e.code==='42501');
        assert((await f.call('kalistar_player',{},'user-tokyo')).equipment.ids.includes(claimed.equipmentId));
        if(stage<6)await assert.rejects(start(),e=>e.code==='42501');
        await call('equipment_ack',{p_book_id:book.id,p_stage:stage});
        await call('equipment_ack',{p_book_id:book.id,p_stage:stage});
      }
      const done=await library();assert(done.finished);assert(done.completed&&done.claimed&&done.acknowledged);assert.equal(done.cleared,7);
      assert.deepEqual(done.equipmentClaims.map(c=>c.kind),['weapon','shield','relic']);assert(done.equipmentClaims.every(c=>c.acknowledged));
      await assert.rejects(start(),e=>e.code==='22023');
      assert.equal((await f.call('kalistar_player',{},'user-tokyo')).equipment.ids.length,3);
      assert.deepEqual((await f.call('kalistar_player',{},'user-paris')).equipment,paris.equipment);
      await assert.rejects(call('equipment_claim',{p_book_id:book.id,p_stage:4},'anon'),e=>e.code==='42501');
      if(book.id==='momo-petits-bonheurs'){
        const backup=require('./backup.cjs'),rows=await f.backup();
        const csv='part,parts,sha256,chunk\n'+rows.map(r=>[r.part,r.parts,r.sha256,r.chunk].join(',')).join('\n');
        const restored=await require('./backup-drill.cjs').drill(backup.bundle(backup.decodeCSV(csv)));
        assert(restored.passed);assert.equal(restored.tables['kalistar_private.journey_equipment_claims'],3);
        assert.equal(restored.tables['kalistar_private.equipment_grants'],3);
      }
    }finally{await f.close();}
  });
});
module.exports={command,terminal};
