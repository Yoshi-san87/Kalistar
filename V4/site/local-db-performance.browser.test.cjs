'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_db_perf.cjs'));
const scripts=['factions','ultimate-definitions','weapons','defensive-equipment','relic-ultimates','ultimate-runtime','equipment','turn-order','performance-index','ai-strategies','engine','trophies','cloud-ownership','local-db','team-composition'];
async function main(){
  const data=(await require('../deploy/build.cjs').plan()).catalogue,browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({serviceWorkers:'block'});await context.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated IndexedDB QA</title>'}));
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://kalistar-idb.invalid/');
    for(const script of scripts)await page.addScriptTag({path:path.join(__dirname,script+'.js')});
    const result=await page.evaluate(async data=>{
      const check=(value,message)=>{if(!value)throw Error(message);},eq=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message);
      const E=KalistarEngine.createEngine(data),T=KalistarTeamComposition.create(E),name='kalistar-v4-cards-performance-'+crypto.randomUUID();
      const player={localProfile:'user-paris',label:'Fixture',cards:data.cards.map((c,i)=>({id:'KC-'+(i+1).toString(16).padStart(32,'0'),modelId:c.id,status:'owned'})),pending:[]};
      let db=await KalistarLocalDB.open(data,{name,cloud:player}),peer;
      const make=seed=>db.registry.bindGame(player.localProfile,E.newGame(T.fromPreset({name:'Fixture',cards:data.decks.player}),T.fromPreset({name:'Enemy',cards:data.decks.enemy}),{mode:'ai',seed,turnOrder:'ABBA',deckCoverage:2}));
      let all=[],get=[];const originalAll=IDBObjectStore.prototype.getAll,originalGet=IDBObjectStore.prototype.get;
      IDBObjectStore.prototype.getAll=function(...args){all.push(this.name);return originalAll.apply(this,args);};
      IDBObjectStore.prototype.get=function(...args){get.push(this.name);return originalGet.apply(this,args);};
      try{
        for(let i=0;i<40;i++){const state=make('idb-history-'+i);await db.saveGame(state);await db.registry.releaseGame(player.localProfile,state.matchId);}
        const before=db.counts(),game=make('active');all=[];get=[];await db.saveGame(game);
        check(!all.length,'A cloud game save must not perform any getAll');check(get.includes('matches')&&get.includes('registryMeta'),'Transactional key reads must remain');
        const saved=db.match(game.matchId),participants=new Set(game.players.flatMap(p=>[...p.board.filter(Boolean),...p.reserve,...p.dead].map(u=>u.cardId)));
        eq(saved.profiles.map(c=>c.id).sort(),[...participants].sort(),'Only participating models are archived');check(saved.arenas.length===1&&saved.arenas[0].id===game.arenaId,'Only selected arena is archived');
        const fingerprint=JSON.stringify(saved.state);await db.saveGame(game);eq(JSON.stringify(db.match(game.matchId).state),fingerprint,'Repeated save preserves state');
        const store=db.cloudProgress.storage,ack=i=>JSON.stringify({schema:1,userId:'fixture',base:{revision:i,payload:{schema:2}},outbox:null});
        await store.setItem('pending',JSON.stringify({schema:1,base:{},outbox:{payload:{name:'UNSENT'}}}));await store.setItem('unknown','unreadable-draft');
        all=[];for(let i=0;i<20;i++)await store.setItem('session-'+i,ack(i));
        check(all.every(n=>n==='registryMeta'),'Metadata writes must not scan match history');
        const backup=await db.exportBackup(),metadata=backup.registryMeta.filter(r=>r.id.startsWith('sync-meta-'));
        check(metadata.length===6,'Keep four acknowledged sessions plus both unresolved drafts');check(await store.getItem('pending'),'Pending draft retained');check(await store.getItem('unknown'),'Unreadable draft retained');
        await db.cloudProgress.archives.put('a'.repeat(64),'immutable archive');
        db.close();db=await KalistarLocalDB.open(data,{name,cloud:player});
        eq(db.counts().matches,before.matches+1,'No historical rows lost after reload');eq(JSON.stringify(db.match(game.matchId).state),fingerprint,'Game restored exactly');
        eq(await db.cloudProgress.archives.get('a'.repeat(64)),'immutable archive','Outbox archives survive reload');
        peer=await KalistarLocalDB.open(data,{name,cloud:player});await peer.registry.releaseGame(player.localProfile,game.matchId);
        let rejected=false;try{await db.saveGame(game);}catch{rejected=true;}check(rejected,'Fresh transactional lease prevents stale-tab save');
        eq(JSON.stringify(db.match(game.matchId).state),fingerprint,'Rejected save is atomic');
        await peer.equipment.equip(player.localProfile,'balmhyr','fallen-king-axe');check(db.equipment.items(player.localProfile,'balmhyr').length===1,'Peer cache refreshed for equipment');
        return {passed:true,archivedMatches:before.matches,saveGetAll:0,acknowledgedSessions:4,preservedDrafts:2,participants:saved.profiles.length,arenas:saved.arenas.length};
      }finally{IDBObjectStore.prototype.getAll=originalAll;IDBObjectStore.prototype.get=originalGet;peer?.close();db.close();}
    },data);
    assert.deepEqual(errors,[]);const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/audit-fixes-2026-10-17');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'idb-performance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await context.close();
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
