'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
test('private equipment entitlements: empty player, admin catalogue, forged saves and journeys rejected',async()=>{
  const data=(await require('../build.cjs').plan()).catalogue,f=await require('./browser-fixture.cjs').create(data,{journeyKey:'a'.repeat(64)}),device=randomUUID();
  const call=(name,args={},profile='user-tokyo')=>f.call(name,args,profile);
  try{
    const player=await call('kalistar_player'),admin=await call('kalistar_player',{},'user-paris');
    assert.deepEqual(player.equipment,{all:false,ids:[]});assert.equal(admin.equipment.all,true);
    assert.equal(player.cards.length,10);assert(admin.cards.length>10);
    const Q=require('../../site/equipment.js'),slots={weapon:{balmhyr:'fallen-king-axe'},shield:{},relic:{}};
    const base={schema:2,edition:'V4',localProfile:'user-tokyo',preferences:{},deckLibrary:{schema:2,edition:'V4',decks:[]},equipment:Q.profile('user-tokyo'),matches:[],activeMatchId:null,releasedMatches:[],archives:[]};
    await call('kalistar_sync_v2_claim',{p_device_id:device,p_expected_revision:0,p_takeover:false});
    assert((await call('kalistar_sync_v2_write',{p_device_id:device,p_expected_revision:0,p_payload:base})).ok);
    for(const mutate of [p=>p.equipment.slots=slots,p=>p.preferences.teamDraft={equipment:slots},p=>p.deckLibrary.decks=[{equipment:slots}]]){
      const payload=structuredClone(base);mutate(payload);
      await assert.rejects(call('kalistar_sync_v2_write',{p_device_id:device,p_expected_revision:1,p_payload:payload}),e=>e.code==='42501'&&/arsenal/.test(e.message));
    }
    await assert.rejects(call('kalistar_journey_start',{p_book_id:'unknown',p_deck:{equipment:slots},p_device_id:device,p_runtime_hash:'0'.repeat(64)}),e=>e.code==='42501'&&/arsenal/.test(e.message));
    assert.equal((await call('kalistar_sync_v2_read')).revision,1);
    for(const row of await f.equipmentPermissions())for(const [key,value] of Object.entries(row))if(key!=='rolname')assert.equal(value,false,key);
    const E=require('../../site/engine.js').createEngine(data),Team=require('../../site/team-composition.js').create(E),team=Team.fromPreset({name:'Tokyo',cards:player.starterDeck});team.equipment=slots;
    const game=E.newGame(team,Team.fromPreset({name:'Virtual',cards:data.decks.enemy}),{mode:'ai',seed:'equipment-ownership',turnOrder:'ABBA',deckCoverage:2});
    game.collection={schema:1,userId:'user-tokyo',opponent:'virtual',bindings:Object.fromEntries([...game.players[0].board.filter(Boolean),...game.players[0].reserve].map(u=>[u.instanceId,player.cards.find(c=>c.modelId===u.cardId).id]))};
    const stale={...base,equipment:{...base.equipment,slots},preferences:{teamDraft:team},deckLibrary:{...base.deckLibrary,decks:[team]},matches:[{id:game.matchId,state:game}],activeMatchId:game.matchId},before=structuredClone(stale);
    await f.legacyEquipmentSave('user-tokyo',stale);
    assert.equal(await f.resetEquipment('user-tokyo'),true);
    const reset=await call('kalistar_sync_v2_read');assert.equal(reset.revision,2);
    assert.deepEqual(reset.payload.equipment.slots,Q.emptyLoadout());
    assert.deepEqual(reset.payload.preferences.teamDraft.equipment,Q.emptyLoadout());
    assert.deepEqual(reset.payload.deckLibrary.decks[0].equipment,Q.emptyLoadout());
    assert.deepEqual(reset.payload.matches,before.matches);assert.deepEqual(reset.payload.archives,before.archives);
    assert.equal(await f.resetEquipment('user-tokyo'),false,'Idempotent without revision churn');
    await call('kalistar_sync_v2_claim',{p_device_id:device,p_expected_revision:2,p_takeover:false});
    assert((await call('kalistar_sync_v2_write',{p_device_id:device,p_expected_revision:2,p_payload:reset.payload})).ok,'An existing equipped battle can finish');
    const forged=structuredClone(reset.payload),newId='match-'+randomUUID();forged.activeMatchId=newId;forged.matches[0].id=newId;forged.matches[0].state.matchId=newId;
    await assert.rejects(call('kalistar_sync_v2_write',{p_device_id:device,p_expected_revision:3,p_payload:forged}),e=>e.code==='42501'&&/arsenal/.test(e.message));
    await f.equipmentGrant('user-tokyo',slots.weapon.balmhyr);await f.equipmentGrant('user-tokyo',slots.weapon.balmhyr);
    assert.deepEqual((await call('kalistar_player')).equipment,{all:false,ids:[slots.weapon.balmhyr]});
    assert((await call('kalistar_sync_v2_write',{p_device_id:device,p_expected_revision:3,p_payload:before})).ok);
    assert.deepEqual((await call('kalistar_player',{},'user-paris')).cards,admin.cards);
    await assert.rejects(call('kalistar_player',{},'anon'),e=>e.code==='42501');
  }finally{await f.close();}
});
