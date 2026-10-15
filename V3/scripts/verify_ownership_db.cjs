'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),site=path.join(root,'site');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__ownership__.cjs'))('playwright');
const source=Object.fromEntries(['engine.js','data.js','ownership.js','local-db.js'].map(f=>[f,fs.readFileSync(path.join(site,f),'utf8')]));
const cases=[],errors=[];
let browser,context,page;
async function test(name,fn){
  const at=Date.now();
  try{await fn();cases.push({name,ok:true,ms:Date.now()-at});console.log('PASS '+name);}
  catch(e){cases.push({name,ok:false,error:e.message,ms:Date.now()-at});console.error('FAIL '+name+'\n'+e.stack);}
}
async function run(){
  browser=await chromium.launch({channel:process.env.KALISTAR_BROWSER||'chrome',headless:true});
  context=await browser.newContext();page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated ownership database tests</title>'}));
  await page.goto('http://localhost:39873/ownership-tests');
  for(const f of ['data.js','engine.js','ownership.js','local-db.js'])await page.addScriptTag({content:source[f]});
  await page.evaluate(()=>{
    window.P=KalistarOwnership.PARIS;window.T=KalistarOwnership.TOKYO;window.E=KalistarEngine.createEngine(KALISTAR_DATA);
    window.opened=[];window.names=[];window.serial=0;
    window.assert=(v,m='Assertion failed')=>{if(!v)throw new Error(m);};
    window.equal=(a,b)=>assert(JSON.stringify(a)===JSON.stringify(b),'Expected '+JSON.stringify(b)+'; received '+JSON.stringify(a));
    window.reject=async(fn,code)=>{try{await fn();}catch(e){if(code)equal(e.code,code);assert(typeof e.message==='string'&&e.message.length>5);return e.code||e.message;}throw Error('Expected rejection '+(code||''));};
    window.open=async(label)=>{const name='kalistar-v3-cards-ownership-'+label;names.push(name);const db=await KalistarLocalDB.open(KALISTAR_DATA,{name});opened.push(db);return db;};
    window.fresh=()=>open('case-'+(++serial));
    window.snapshot=async db=>{const b=await db.exportBackup();delete b.exportedAt;return b;};
    window.game=()=>{
      const deck=KALISTAR_DATA.cards.slice(0,10).map(c=>c.id);assert(E.validateDeck(deck).length===0);
      return E.newGame(deck,deck,{seed:'OWNERSHIP-TEST',arenaId:'ruins'});
    };
    window.finish=value=>{
      const s=structuredClone(value);
      if(s.phase==='setup'){E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);}
      for(let n=0;n<10000&&s.phase!=='over';n++){
        if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
        else if(s.phase==='attack')E.rollAttack(s);
        else if(s.phase==='defense')E.rollDefense(s);
        else if(s.phase==='result')E.next(s);
        else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
        else{const names={guard:['grantGuard','aiGuardChoice'],heart:['grantReraise','aiReraiseChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],clover:['grantClover','aiCloverChoice']}[s.phase];E[names[0]](s,E[names[1]](s));}
      }
      equal(s.phase,'over');E.assertState(s);return s;
    };
    window.legacyFinal=finish(game());
  });
  await test('fresh seed: 41 unique random public IDs, Paris one/version, Tokyo zero, no activation secret',()=>page.evaluate(async()=>{
    const db=await fresh(),r=db.registry;assert(r.initialized);equal(r.owned(P).length,41);equal(r.owned(T),[]);
    equal(r.users().map(u=>u.email),['guillaumeprevost.paris@gmail.com','guillaumeprevost.tokyo@gmail.com']);
    equal(new Set(r.owned(P).map(c=>c.id)).size,41);equal(new Set(r.owned(P).map(c=>c.cardId)).size,41);
    assert(r.owned(P).every(c=>/^KC-[a-f0-9]{32}$/.test(c.id)&&c.id!==c.legacyInstanceId&&c.status==='owned'));
    const b=await db.exportBackup();equal(b.activations,[]);equal(b.events.length,41);equal(b.schema,3);
    const other=await fresh();assert(other.registry.owned(P).every(c=>!r.get(c.id)));
  }));
  await test('all synchronous queries are detached clones; initialized fails closed after close',()=>page.evaluate(async()=>{
    const db=await fresh(),r=db.registry,c=r.owned(P)[0];
    r.users()[0].role='other';r.user(P).name='changed';r.get(c.id).ownerId=T;r.owned(P)[0].cardId='fake';r.events(c.id)[0].type='fake';
    equal(r.user(P).role,'admin');equal(r.get(c.id).ownerId,P);equal(r.events(c.id)[0].type,'seeded');
    db.close();assert(!r.initialized);await reject(()=>r.owned(P),'REGISTRY_UNAVAILABLE');
  }));
  await test('populated actual version-1 migration preserves legacy matches, counters, instances and original IDs',()=>page.evaluate(async()=>{
    const module=KalistarOwnership;delete window.KalistarOwnership;
    const old=await open('migration');assert(!old.registry);await old.saveGame(legacyFinal);window.oldBackup=await old.exportBackup();equal(oldBackup.schema,2);
    const before=['instances','matches','results'].map(s=>old.inspect(s));old.close();window.KalistarOwnership=module;
    const db=await open('migration');equal(['instances','matches','results'].map(s=>db.inspect(s)),before);equal(db.registry.owned(P).length,41);equal(db.registry.owned(T),[]);
    equal(db.registry.matches(T),[]);equal(db.registry.matches(P).length,1);
    for(const c of KALISTAR_DATA.cards)equal(db.registry.career(T,c.id).games,0);
    window.migrationName=db.name;
    const version=await new Promise((resolve,reject)=>{const req=indexedDB.open(db.name);req.onsuccess=()=>{const d=req.result;resolve(d.version);d.close();};req.onerror=()=>reject(req.error);});equal(version,2);
  }));
  await test('simultaneous connections and reopen never duplicate or reseed a transferred original',()=>page.evaluate(async()=>{
    const name='parallel-seed';const [a,b,c]=await Promise.all([open(name),open(name),open(name)]);equal(a.registry.owned(P).length,41);equal(b.registry.owned(P).length,41);equal(c.registry.owned(P).length,41);
    const original=a.registry.owned(P)[0],offer=await a.registry.offer(P,original.id,T);await b.registry.accept(T,offer.id);
    equal(a.registry.get(original.id).ownerId,T);equal(c.registry.get(original.id).ownerId,T);a.close();b.close();c.close();
    const reopened=await open(name);equal(reopened.registry.owned(P).length,40);equal(reopened.registry.owned(T).length,1);equal(reopened.registry.get(original.id).legacyInstanceId,original.legacyInstanceId);
    equal((await reopened.exportBackup()).collectibles.length,41);
  }));
  await test('simultaneous version-1 upgrades preserve data and seed only once',()=>page.evaluate(async()=>{
    const module=KalistarOwnership;delete window.KalistarOwnership;const old=await open('migration-race');await old.saveGame(legacyFinal);old.close();window.KalistarOwnership=module;
    const [a,b,c]=await Promise.all([open('migration-race'),open('migration-race'),open('migration-race')]);
    for(const db of [a,b,c]){equal(db.registry.owned(P).length,41);equal(db.registry.owned(T).length,0);equal(db.counts().matches,1);equal(db.counts().results,20);equal((await db.exportBackup()).events.length,41);}
  }));
  await test('legacy saves and schema-2 imports preserve APIs without granting AI or Tokyo ownership',()=>page.evaluate(async()=>{
    const db=await fresh();await db.importBackup(oldBackup);await db.importBackup(oldBackup);await db.saveGame(legacyFinal);
    equal(db.counts().matches,1);equal(db.counts().results,20);equal(db.registry.owned(P).length,41);equal(db.registry.owned(T).length,0);
    for(const card of KALISTAR_DATA.cards){equal(db.registry.career(T,card.id).games,0);equal(db.career(card.id).games,db.inspect('results').filter(r=>r.cardId===card.id&&r.participated&&!r.partial).length);}
    equal(Object.keys(db.counts()),['versions','instances','matches','results']);equal(db.match(legacyFinal.matchId).state,legacyFinal);
  }));
  await test('legacy continuation requires the exact Paris original, rejects pending/sold cards and adds no locks',()=>page.evaluate(async()=>{
    const a=await open('legacy-sale'),b=await open('legacy-sale'),g=game(),instanceId=g.players[0].reserve[0].instanceId;
    E.autoDeploy(g,0);E.autoDeploy(g,1);E.start(g);await a.saveGame(g);
    const original=a.registry.owned(P).find(c=>c.legacyInstanceId===instanceId);equal(a.registry.validateGame(g,P),true);equal(a.registry.activeGames(P),[]);
    const first=await b.registry.offer(P,original.id,T);const pending=await snapshot(a);
    await reject(()=>a.registry.validateGame(g,P),'PENDING_TRANSFER');await reject(()=>a.saveGame(g),'PENDING_TRANSFER');equal(await snapshot(a),pending);
    await b.registry.cancel(P,first.id);equal(a.registry.validateGame(g,P),true);await a.saveGame(g);
    const offer=await b.registry.offer(P,original.id,T);await b.registry.accept(T,offer.id);const before=await snapshot(a);
    await reject(()=>a.registry.validateGame(g,P),'NOT_OWNER');await reject(()=>a.registry.bindGame(P,g),'NOT_OWNER');await reject(()=>a.saveGame(g),'NOT_OWNER');
    await reject(()=>a.saveGame(finish(g)),'NOT_OWNER');await reject(()=>a.saveGame(legacyFinal),'NOT_OWNER');await reject(()=>a.importBackup(oldBackup),'NOT_OWNER');
    equal(await snapshot(a),before);equal(a.counts().results,0);equal(a.registry.career(T,original.cardId).games,0);equal(a.match(g.matchId).state,g);
    a.close();b.close();const reopened=await open('legacy-sale');await reject(()=>reopened.registry.validateGame(g,P),'NOT_OWNER');equal(reopened.match(g.matchId).state,g);
  }));
  await test('buying another public collectible of the same version does not authorize the sold legacy original',()=>page.evaluate(async()=>{
    const db=await fresh(),r=db.registry,g=game(),u=g.players[0].reserve[0],original=r.owned(P,u.cardId)[0];E.autoDeploy(g,0);E.autoDeploy(g,1);E.start(g);await db.saveGame(g);
    const offer=await r.offer(P,original.id,T);await r.accept(T,offer.id);const issued=await r.issue(P,u.cardId);await r.activate(P,issued.collectible.id,issued.code);
    equal(r.owned(P,u.cardId).length,1);equal(r.owned(P,u.cardId)[0].legacyInstanceId,undefined);equal(r.deckErrors(P,game().players[0].reserve.map(u=>u.cardId)),[]);
    const before=await snapshot(db);await reject(()=>r.validateGame(g,P),'NOT_OWNER');await reject(()=>r.bindGame(P,g),'NOT_OWNER');await reject(()=>db.saveGame(finish(g)),'NOT_OWNER');equal(await snapshot(db),before);
    const newlyBound=r.bindGame(P,game());equal(newlyBound.collection.bindings[u.instanceId],issued.collectible.id);await db.saveGame(newlyBound);equal(r.career(T,u.cardId).games,0);
  }));
  await test('existing final legacy archives remain readable and idempotent after original transfer',()=>page.evaluate(async()=>{
    const db=await fresh(),r=db.registry;await db.importBackup(oldBackup);
    const row=db.inspect('results').find(r=>r.side===0&&r.participated&&!r.partial),original=r.owned(P,row.cardId).find(c=>c.legacyInstanceId===row.instanceId),career=r.career(P,row.cardId,original.id);
    const offer=await r.offer(P,original.id,T);await r.accept(T,offer.id);const before=await snapshot(db);
    equal(r.validateGame(legacyFinal,P),true);equal(r.bindGame(P,legacyFinal),legacyFinal);await db.saveGame(legacyFinal);await db.importBackup(oldBackup);equal(await snapshot(db),before);
    equal(db.match(legacyFinal.matchId).state,legacyFinal);equal(r.career(T,row.cardId,original.id),career);await reject(()=>r.validateGame(legacyFinal,T),'LEGACY_ACCOUNT');
    const forged=structuredClone(legacyFinal);forged.matchId='match-'+crypto.randomUUID();await reject(()=>r.validateGame(forged,P),'NOT_OWNER');await reject(()=>db.saveGame(forged),'NOT_OWNER');
    const changed=structuredClone(legacyFinal);changed.seed='MODIFIED-FINAL';await reject(()=>db.saveGame(changed));equal(await snapshot(db),before);
  }));
  await test('full registry restore preserves sold-original legacy archives but does not authorize continuation',()=>page.evaluate(async()=>{
    const source=await fresh();await source.importBackup(oldBackup);const active=game();await source.saveGame(active);
    const original=source.registry.owned(P,active.players[0].reserve[0].cardId)[0],offer=await source.registry.offer(P,original.id,T);await source.registry.accept(T,offer.id);
    const backup=await source.exportBackup(),dest=await fresh();await dest.importBackup(backup,{replaceRegistry:true});equal(dest.registry.get(original.id).ownerId,T);
    equal(dest.match(active.matchId).state,active);equal(dest.match(legacyFinal.matchId).state,legacyFinal);equal(dest.registry.activeGames(P),[]);equal(dest.counts(),source.counts());
    equal(dest.registry.validateGame(legacyFinal,P),true);await dest.saveGame(legacyFinal);await reject(()=>dest.registry.validateGame(active,P),'NOT_OWNER');await reject(()=>dest.saveGame(finish(active)),'NOT_OWNER');
    equal(dest.registry.career(T,original.cardId,original.id),source.registry.career(T,original.cardId,original.id));
    const pristine=await fresh();await pristine.importBackup(backup);equal(pristine.match(active.matchId).state,active);await reject(()=>pristine.registry.validateGame(active,P),'NOT_OWNER');
  }));
  await test('same-registry default import cannot add sold-original legacy results or roll forward an old legacy match',()=>page.evaluate(async()=>{
    const db=await fresh(),r=db.registry;await db.importBackup(oldBackup);const c=r.owned(P,'30000001')[0],offer=await r.offer(P,c.id,T);await r.accept(T,offer.id);
    const backup=await db.exportBackup(),before=await snapshot(db);await db.importBackup(backup);equal(await snapshot(db),before);
    const added=structuredClone(backup.matches[0]);added.id=added.state.matchId='match-'+crypto.randomUUID();backup.matches.push(added);
    await reject(()=>db.importBackup(backup),'NOT_OWNER');equal(await snapshot(db),before);
  }));
  await test('unmapped legacy 002 copies stay historical only, never become owned, including after migration',()=>page.evaluate(async()=>{
    const deck=game().players[0].reserve.map(u=>u.cardId);deck[1]=deck[0];equal(E.validateDeck(deck),[]);
    const g=E.newGame(deck,deck,{seed:'LEGACY-DUPLICATE',arenaId:'ruins'}),final=finish(g);assert(g.players[0].reserve.some(u=>u.instanceId.endsWith('-002')));
    const db=await fresh();await reject(()=>db.registry.validateGame(g,P),'NOT_OWNER');await reject(()=>db.saveGame(final),'NOT_OWNER');equal(db.registry.owned(P).length,41);
    const module=KalistarOwnership;delete window.KalistarOwnership;
    try{const legacy=await open('legacy-copies');await legacy.saveGame(final);legacy.close();}finally{window.KalistarOwnership=module;}
    const upgraded=await open('legacy-copies'),before=await snapshot(upgraded);equal(upgraded.registry.validateGame(final,P),true);await upgraded.saveGame(final);equal(await snapshot(upgraded),before);
    equal(upgraded.registry.owned(P,deck[0]).length,1);equal(upgraded.registry.owned(T),[]);assert(!(await upgraded.exportBackup()).collectibles.some(c=>c.legacyInstanceId?.endsWith('-002')));
    const renewed=structuredClone(final);renewed.matchId='match-'+crypto.randomUUID();await reject(()=>upgraded.saveGame(renewed),'NOT_OWNER');
  }));
  await test('standalone local-db on an upgraded registry cannot add sold-original legacy results',()=>page.evaluate(async()=>{
    const db=await open('legacy-bare');await db.importBackup(oldBackup);const c=db.registry.owned(P,'30000001')[0],offer=await db.registry.offer(P,c.id,T);await db.registry.accept(T,offer.id);db.close();
    const module=KalistarOwnership;delete window.KalistarOwnership;
    try{
      const bare=await open('legacy-bare'),before=await snapshot(bare);await bare.saveGame(legacyFinal);await bare.importBackup(oldBackup);
      const next=structuredClone(legacyFinal);next.matchId='match-'+crypto.randomUUID();await reject(()=>bare.saveGame(next),'NOT_OWNER');equal(await snapshot(bare),before);bare.close();
    }finally{window.KalistarOwnership=module;}
  }));
  await test('admin issue returns independent 256-bit secret once and persists only its SHA-256 hash',()=>page.evaluate(async()=>{
    const db=await fresh(),r=db.registry;await reject(()=>r.issue(T,'30000001'),'ADMIN_REQUIRED');await reject(()=>r.issue(P,'bad'),'UNKNOWN_CARD');
    const issued=await r.issue(P,'30000001');assert(/^[a-f0-9]{64}$/.test(issued.code));assert(!issued.code.includes(issued.collectible.id.slice(3)));
    equal(issued.collectible.ownerId,null);equal(issued.collectible.status,'unclaimed');equal(r.owned(P).length,41);equal(r.owned(T).length,0);
    const b=await db.exportBackup();assert(!JSON.stringify(b).includes(issued.code));
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(issued.code))),n=>n.toString(16).padStart(2,'0')).join('');equal(b.activations[0].hash,hash);
    const claimed=await r.activate(T,issued.collectible.id,issued.code);equal(claimed.ownerId,T);equal(claimed.status,'owned');equal(r.owned(T).length,1);
    await reject(()=>r.activate(P,issued.collectible.id,issued.code),'INVALID_ACTIVATION');
    const transfer=await r.offer(T,claimed.id,P);await r.accept(P,transfer.id);await reject(()=>r.activate(T,claimed.id,issued.code),'INVALID_ACTIVATION');equal(r.get(claimed.id).ownerId,P);
  }));
  await test('simultaneous claims across connections have exactly one winner',()=>page.evaluate(async()=>{
    const a=await open('claim-race'),b=await open('claim-race'),issued=await a.registry.issue(P,'30000001');
    const results=await Promise.allSettled([a.registry.activate(P,issued.collectible.id,issued.code),b.registry.activate(T,issued.collectible.id,issued.code)]);
    equal(results.filter(r=>r.status==='fulfilled').length,1);equal(results.filter(r=>r.status==='rejected').length,1);
    equal(a.registry.get(issued.collectible.id).ownerId,b.registry.get(issued.collectible.id).ownerId);equal(a.registry.events(issued.collectible.id).filter(e=>e.type==='activated').length,1);
  }));
  await test('bad claims are durably rate limited across connections, reopen and unknown IDs',()=>page.evaluate(async()=>{
    const a=await open('rate'),b=await open('rate'),issued=await a.registry.issue(P,'30000001');
    const failures=await Promise.allSettled(Array.from({length:8},(_,i)=>(i%2?a:b).registry.activate(T,issued.collectible.id,'wrong')));
    equal(failures.filter(r=>r.reason.code==='INVALID_ACTIVATION').length,5);equal(failures.filter(r=>r.reason.code==='RATE_LIMITED').length,3);
    a.close();b.close();const c=await open('rate');await reject(()=>c.registry.activate(T,issued.collectible.id,issued.code),'RATE_LIMITED');await reject(()=>c.registry.activate(P,issued.collectible.id,issued.code),'RATE_LIMITED');
    const real=Date.now;Date.now=()=>real()+61000;try{equal((await c.registry.activate(T,issued.collectible.id,issued.code)).ownerId,T);}finally{Date.now=real;}
    const d=await fresh();for(let i=0;i<5;i++)await reject(()=>d.registry.activate(T,'unknown-'+i,'bad'),'INVALID_ACTIVATION');await reject(()=>d.registry.activate(T,'another','bad'),'RATE_LIMITED');
  }));
  await test('offer/accept/cancel/reject actor checks, clones, stable ID and history',()=>page.evaluate(async()=>{
    const db=await fresh(),r=db.registry,c=r.owned(P)[0];
    await reject(()=>r.offer(T,c.id,P),'NOT_OWNER');await reject(()=>r.offer(P,c.id,P),'SAME_ACCOUNT');await reject(()=>r.offer(P,c.id,'missing'),'UNKNOWN_USER');
    const t=await r.offer(P,c.id,T);equal(t.status,'pending');equal(Object.keys(t).sort(),['collectibleId','createdAt','fromUserId','id','status','toUserId']);r.transfers(P)[0].status='accepted';equal(r.transfers(T)[0].status,'pending');
    await reject(()=>r.accept(P,t.id),'WRONG_ACTOR');await reject(()=>r.offer(P,c.id,T),'PENDING_TRANSFER');equal((await r.cancel(T,t.id)).status,'rejected');await reject(()=>r.accept(T,t.id),'STALE_TRANSFER');
    const t2=await r.offer(P,c.id,T);equal((await r.cancel(P,t2.id)).status,'cancelled');
    const t3=await r.offer(P,c.id,T);equal((await r.accept(T,t3.id)).status,'accepted');equal(r.get(c.id).id,c.id);equal(r.get(c.id).createdAt,c.createdAt);
    equal(r.events(c.id).map(e=>e.type).sort(),['seeded','offered','rejected','offered','cancelled','offered','accepted'].sort());
  }));
  await test('simultaneous offers, accept/accept and accept/cancel atomically reject stale losers',()=>page.evaluate(async()=>{
    const a=await open('transfer-race'),b=await open('transfer-race'),c=a.registry.owned(P)[0];
    let results=await Promise.allSettled([a.registry.offer(P,c.id,T),b.registry.offer(P,c.id,T)]);equal(results.filter(r=>r.status==='fulfilled').length,1);
    const t=results.find(r=>r.status==='fulfilled').value;results=await Promise.allSettled([a.registry.accept(T,t.id),b.registry.accept(T,t.id)]);equal(results.filter(r=>r.status==='fulfilled').length,1);
    const back=await a.registry.offer(T,c.id,P);results=await Promise.allSettled([a.registry.accept(P,back.id),b.registry.cancel(T,back.id)]);equal(results.filter(r=>r.status==='fulfilled').length,1);
    equal(a.registry.get(c.id),b.registry.get(c.id));equal(a.registry.transfers(P).filter(t=>t.status==='pending').length,0);
  }));
  await test('bindGame keeps schema/rules intact, side zero owned, side one virtual, Tokyo denied',()=>page.evaluate(async()=>{
    const db=await fresh(),g=game(),bound=db.registry.bindGame(P,g);assert(!g.collection);equal(bound.schema,6);E.assertState(bound);equal(bound.players,g.players);
    equal(Object.keys(bound.collection.bindings).length,10);equal(bound.collection.opponent,'virtual');assert(Object.values(bound.collection.bindings).every(id=>db.registry.get(id).ownerId===P));
    equal(db.registry.validateGame(bound,P),true);await reject(()=>db.registry.bindGame(T,g),'NOT_OWNER');await reject(()=>db.registry.validateGame(bound,T),'WRONG_ACCOUNT');
    equal(db.registry.deckErrors(P,['30000001']),[]);assert(db.registry.deckErrors(P,['30000001','30000001']).length===1);equal(db.registry.deckErrors(P,[]),[]);
    const old=finish(g);equal(db.registry.bindGame(P,old),old);await reject(()=>db.registry.bindGame(T,old),'LEGACY_ACCOUNT');await reject(()=>db.registry.validateGame(old,T),'LEGACY_ACCOUNT');
  }));
  await test('new owned duplicate can bind separately; synthetic opponent copies never count',()=>page.evaluate(async()=>{
    const db=await fresh(),r=db.registry,g=game();const card=g.players[0].reserve[0].cardId;
    const issued=await r.issue(P,card);await r.activate(P,issued.collectible.id,issued.code);equal(r.deckErrors(P,[card,card]),[]);
    const deck=g.players[0].reserve.map(u=>u.cardId);deck[1]=card;
    equal(E.validateDeck(deck),[]);const b=r.bindGame(P,E.newGame(deck,deck));equal(new Set(Object.values(b.collection.bindings)).size,10);
    equal(r.owned(T).length,0);equal(r.owned(P,card).length,2);
  }));
  await test('save revalidates bindings and prevents owner/account spoof or removal, even finished states',()=>page.evaluate(async()=>{
    const db=await fresh(),r=db.registry,b=r.bindGame(P,game());await db.saveGame(b);const before=await snapshot(db);
    const variants=[g=>g.collection.userId=T,g=>delete g.collection,g=>g.collection=null,g=>g.collection.ownerId=T,g=>g.collection.bindings[g.players[1].reserve[0].instanceId]=Object.values(g.collection.bindings)[0],g=>{const k=Object.keys(g.collection.bindings);g.collection.bindings[k[0]]=g.collection.bindings[k[1]];}];
    for(const change of variants){const bad=structuredClone(b);change(bad);await reject(()=>db.saveGame(bad));equal(await snapshot(db),before);}
    const final=finish(b);await db.saveGame(final);await db.saveGame(final);equal(db.counts().results,20);equal(r.owned(T).length,0);
    const c=r.get(Object.values(b.collection.bindings)[0]),offer=await r.offer(P,c.id,T);await r.accept(T,offer.id);equal(r.validateGame(final,P),true);await db.saveGame(final);
    const forged=structuredClone(final);forged.matchId='match-'+crypto.randomUUID();await reject(()=>db.saveGame(forged),'NOT_OWNER');
  }));
  await test('active bindings persist across reopen and prevent transfer until completion',()=>page.evaluate(async()=>{
    const db=await open('active'),b=db.registry.bindGame(P,game());await db.saveGame(b);const id=Object.values(b.collection.bindings)[0];db.close();
    const next=await open('active');equal(next.match(b.matchId).state.collection,b.collection);await reject(()=>next.registry.offer(P,id,T),'ACTIVE_GAME');
    const final=finish(b);await next.saveGame(final);const t=await next.registry.offer(P,id,T);await next.registry.accept(T,t.id);equal(next.registry.get(id).ownerId,T);
  }));
  await test('save versus offer races cannot create both pending transfer and active match',()=>page.evaluate(async()=>{
    for(let n=0;n<4;n++){
      const a=await open('save-race-'+n),b=await open('save-race-'+n),g=a.registry.bindGame(P,game()),id=Object.values(g.collection.bindings)[0];
      const jobs=n%2?[()=>a.registry.offer(P,id,T),()=>b.saveGame(g)]:[()=>b.saveGame(g),()=>a.registry.offer(P,id,T)];
      const result=await Promise.allSettled(jobs.map(fn=>fn()));equal(result.filter(r=>r.status==='fulfilled').length,1);
      assert(!(a.match(g.matchId)&&a.registry.transfers(P).some(t=>t.collectibleId===id&&t.status==='pending')));
    }
  }));
  await test('unsaved stale binding cannot save after a transfer or while an offer is pending',()=>page.evaluate(async()=>{
    const a=await open('stale-bind'),b=await open('stale-bind'),g=a.registry.bindGame(P,game()),id=Object.values(g.collection.bindings)[0];
    const t=await b.registry.offer(P,id,T);await reject(()=>a.saveGame(g),'PENDING_TRANSFER');await b.registry.accept(T,t.id);await reject(()=>a.saveGame(g),'NOT_OWNER');
    equal(a.counts().matches,0);equal(a.registry.get(id).ownerId,T);
  }));
  await test('bound and original legacy careers travel with collectible; account match lists do not',()=>page.evaluate(async()=>{
    const db=await fresh(),r=db.registry;await db.importBackup(oldBackup);const b=r.bindGame(P,game()),final=finish(b);await db.saveGame(final);
    const row=db.inspect('results').find(x=>x.matchId===final.matchId&&x.side===0&&x.participated&&!x.partial),id=b.collection.bindings[row.instanceId],before=r.career(P,row.cardId,id);assert(before.games>=1);
    equal(r.career(T,row.cardId).games,0);const offer=await r.offer(P,id,T);await r.accept(T,offer.id);
    equal(r.career(T,row.cardId,id),before);equal(r.career(P,row.cardId,id).games,0);equal(r.matches(T),[]);equal(r.matches(P).length,2);
    before.history[0].kills=9999;assert(r.career(T,row.cardId,id).history[0].kills!==9999);
    const issued=await r.issue(P,row.cardId);await r.activate(T,issued.collectible.id,issued.code);equal(r.career(T,row.cardId,issued.collectible.id).games,0);
  }));
  await test('schema-3 full history backup safely restores into pristine target and is idempotent',()=>page.evaluate(async()=>{
    const src=await fresh(),r=src.registry;await src.importBackup(oldBackup);const bound=r.bindGame(P,game()),final=finish(bound);await src.saveGame(final);
    const id=Object.values(bound.collection.bindings)[0],t=await r.offer(P,id,T);await r.accept(T,t.id);const issued=await r.issue(P,'30000001');
    const backup=await src.exportBackup();backup.matches[0].profiles[0].title='Historical title';backup.matches[0].arenas[0].subtitle='Historical arena';
    const dest=await fresh();await dest.importBackup(backup);await dest.importBackup(backup);equal(dest.registry.get(id).ownerId,T);equal(dest.counts(),src.counts());
    equal(dest.match(backup.matches[0].id).profiles[0].title,'Historical title');equal(dest.match(backup.matches[0].id).arenas[0].subtitle,'Historical arena');
    equal(dest.registry.events(id),r.events(id));equal(dest.registry.career(T,r.get(id).cardId,id),r.career(T,r.get(id).cardId,id));
    equal((await dest.registry.activate(T,issued.collectible.id,issued.code)).ownerId,T);window.fullBackup=backup;
  }));
  await test('default merge rejects ownership rollback; explicit full restore replaces all tables atomically',()=>page.evaluate(async()=>{
    const db=await fresh(),r=db.registry,backup=await db.exportBackup(),c=r.owned(P)[0];const t=await r.offer(P,c.id,T);await r.accept(T,t.id);
    const before=await snapshot(db);await reject(()=>db.importBackup(backup),'REGISTRY_CONFLICT');equal(await snapshot(db),before);
    await db.importBackup(backup,{replaceRegistry:true});equal(r.get(c.id).ownerId,P);equal(r.transfers(P),[]);
    await db.importBackup(fullBackup,{replaceRegistry:true});equal(r.owned(T).length,1);equal(db.counts().matches,2);
  }));
  await test('malformed registry restores fail atomically: owner spoof, duplicate IDs, plaintext secrets, broken history',()=>page.evaluate(async()=>{
    const db=await fresh();await db.saveGame(legacyFinal);const before=await snapshot(db);
    const variants=[b=>b.collectibles[0].ownerId='outsider',b=>b.collectibles.push(b.collectibles[0]),b=>b.activations[0].code='plaintext-secret',b=>b.collectibles.find(c=>c.ownerId===P).ownerId=T,b=>b.events.pop(),b=>b.registryMeta=[],b=>b.users[1].role='admin',b=>b.matches[0].state.arenaId='invalid'];
    for(const change of variants){const bad=structuredClone(fullBackup);change(bad);await reject(()=>db.importBackup(bad,{replaceRegistry:true}));equal(await snapshot(db),before);}
  }));
  await test('late conflict inside merge rolls back earlier match/instance writes',()=>page.evaluate(async()=>{
    const db=await fresh();await db.importBackup(oldBackup);const before=await snapshot(db),backup=structuredClone(oldBackup);
    const added=structuredClone(backup.matches[0]);added.id=added.state.matchId='match-'+crypto.randomUUID();backup.matches.unshift(added);
    backup.matches[1].state.seed='CONFLICTING-FINISHED';await reject(()=>db.importBackup(backup));equal(await snapshot(db),before);
  }));
  await test('registry-bound import cannot spoof bindings; schema-2 import cannot smuggle registry metadata',()=>page.evaluate(async()=>{
    const db=await fresh();await db.importBackup(fullBackup);const before=await snapshot(db);
    const bad=structuredClone(fullBackup),match=bad.matches.find(m=>m.state.collection);match.state.collection.userId=T;
    await reject(()=>db.importBackup(bad));equal(await snapshot(db),before);
    const legacy=structuredClone(oldBackup);legacy.collectibles=fullBackup.collectibles;await reject(()=>db.importBackup(legacy));equal(await snapshot(db),before);
    const legacy2=structuredClone(oldBackup);legacy2.matches[0].state.collection=match.state.collection;await reject(()=>db.importBackup(legacy2));equal(await snapshot(db),before);
  }));
  await test('full restore rejects forged historical match account even if bound events are also changed',()=>page.evaluate(async()=>{
    const source=await fresh(),g=source.registry.bindGame(P,game());await source.saveGame(finish(g));const backup=await source.exportBackup();
    backup.matches[0].state.collection.userId=T;for(const e of backup.events)if(e.type==='bound')e.actorId=T;
    const target=await fresh(),before=await snapshot(target);await reject(()=>target.importBackup(backup,{replaceRegistry:true}),'INVALID_BACKUP');equal(await snapshot(target),before);
  }));
  await test('full restore with active match and pending transfer is rejected transactionally',()=>page.evaluate(async()=>{
    const src=await fresh(),bound=src.registry.bindGame(P,game());await src.saveGame(bound);const backup=await src.exportBackup(),id=Object.values(bound.collection.bindings)[0];
    const transferId='KT-'+'a'.repeat(32),at=new Date().toISOString();backup.transfers.push({id:transferId,collectibleId:id,fromUserId:P,toUserId:T,status:'pending',createdAt:at});
    backup.events.push({id:'KE-'+'b'.repeat(32),type:'offered',collectibleId:id,actorId:P,createdAt:at,transferId});
    const dest=await fresh(),before=await snapshot(dest);await reject(()=>dest.importBackup(backup,{replaceRegistry:true}));equal(await snapshot(dest),before);
  }));
  await test('same registry concurrent backup import and transfer cannot roll ownership backward',()=>page.evaluate(async()=>{
    const a=await open('import-race'),b=await open('import-race'),c=a.registry.owned(P)[0],t=await a.registry.offer(P,c.id,T),backup=await a.exportBackup();
    const result=await Promise.allSettled([b.registry.accept(T,t.id),a.importBackup(backup)]);equal(result[0].status,'fulfilled');equal(a.registry.get(c.id).ownerId,T);
    assert(result[1].status==='fulfilled'||result[1].reason.code==='REGISTRY_CONFLICT');
  }));
  await test('explicit release preserves archive without results, checks actor, survives reopen and restore',()=>page.evaluate(async()=>{
    const db=await open('release'),g=db.registry.bindGame(P,game());await db.saveGame(g);const id=Object.values(g.collection.bindings)[0];
    await reject(()=>db.registry.releaseGame(T,g.matchId),'WRONG_ACCOUNT');await reject(()=>db.registry.releaseGame(P,'missing'),'UNKNOWN_MATCH');
    const lease=await db.registry.releaseGame(P,g.matchId);equal(await db.registry.releaseGame(P,g.matchId),lease);equal(db.match(g.matchId).state,g);equal(db.counts().results,0);
    await reject(()=>db.registry.validateGame(g,P),'LEASE_RELEASED');await reject(()=>db.saveGame(g),'LEASE_RELEASED');await reject(()=>db.saveGame(finish(g)),'LEASE_RELEASED');
    const offer=await db.registry.offer(P,id,T);await db.registry.accept(T,offer.id);const backup=await db.exportBackup();db.close();
    const reopened=await open('release');equal(reopened.registry.get(id).ownerId,T);equal(reopened.registry.matches(P).length,1);await reject(()=>reopened.saveGame(g),'LEASE_RELEASED');
    const dest=await fresh();await dest.importBackup(backup);equal(dest.registry.get(id).ownerId,T);equal(dest.match(g.matchId).state,g);equal(dest.counts().results,0);
  }));
  await test('release only removes its own lock; concurrent release/save cannot resurrect a lease',()=>page.evaluate(async()=>{
    const a=await open('release-race'),b=await open('release-race'),g=a.registry.bindGame(P,game()),g2=a.registry.bindGame(P,game());await a.saveGame(g);await a.saveGame(g2);
    const id=Object.values(g.collection.bindings)[0];await a.registry.releaseGame(P,g.matchId);await reject(()=>a.registry.offer(P,id,T),'ACTIVE_GAME');
    const results=await Promise.allSettled([a.registry.releaseGame(P,g2.matchId),b.saveGame(g2)]);equal(results[0].status,'fulfilled');await reject(()=>b.saveGame(g2),'LEASE_RELEASED');
    const t=await b.registry.offer(P,id,T);await b.registry.accept(T,t.id);equal(a.registry.get(id).ownerId,T);
  }));
  await test('activeGames returns detached bound unfinished matches for its profile, never legacy or finalized matches',()=>page.evaluate(async()=>{
    const db=await fresh(),r=db.registry;equal(r.activeGames(P),[]);equal(r.activeGames(T),[]);await reject(()=>r.activeGames('missing'),'UNKNOWN_USER');
    const legacy=game(),paris=r.bindGame(P,game()),completed=r.bindGame(P,game());
    await db.saveGame(legacy);await db.saveGame(paris);await db.saveGame(finish(completed));
    const tokyoSetup=game();for(const u of tokyoSetup.players[0].reserve){const issued=await r.issue(P,u.cardId);await r.activate(T,issued.collectible.id,issued.code);}
    const tokyo=r.bindGame(T,tokyoSetup);await db.saveGame(tokyo);
    equal(r.activeGames(P),[db.match(paris.matchId)]);equal(r.activeGames(T),[db.match(tokyo.matchId)]);equal(r.matches(P).length,3);
    const detached=r.activeGames(P);detached[0].state.collection.userId=T;detached[0].summary.units[0].cardId='changed';detached[0].profiles[0].title='changed';detached.push({id:'fake'});
    equal(r.activeGames(P),[db.match(paris.matchId)]);equal(r.activeGames(T),[db.match(tokyo.matchId)]);
    db.close();await reject(()=>r.activeGames(P),'REGISTRY_UNAVAILABLE');
  }));
  await test('activeGames reflects release and completion across connections, reopen and full backup restore',()=>page.evaluate(async()=>{
    const a=await open('active-getter'),b=await open('active-getter'),first=a.registry.bindGame(P,game()),second=a.registry.bindGame(P,game());
    await a.saveGame(first);const saving=a.saveGame(second);await a.idle();await saving;
    equal(a.registry.activeGames(P).length,2);equal(b.registry.activeGames(P),a.registry.activeGames(P));
    const ordered=a.registry.activeGames(P);assert(ordered[0].updatedAt>=ordered[1].updatedAt);
    await b.registry.releaseGame(P,first.matchId);equal(a.registry.activeGames(P).map(m=>m.id),[second.matchId]);equal(b.registry.activeGames(P),a.registry.activeGames(P));
    await a.saveGame(finish(second));equal(a.registry.activeGames(P),[]);equal(b.registry.activeGames(P),[]);
    const third=a.registry.bindGame(P,game());await a.saveGame(third);const backup=await a.exportBackup();a.close();b.close();
    const reopened=await open('active-getter');equal(reopened.registry.activeGames(P).map(m=>m.id),[third.matchId]);equal(reopened.registry.matches(P).length,3);
    const dest=await fresh();await dest.importBackup(backup,{replaceRegistry:true});equal(dest.registry.activeGames(P),reopened.registry.activeGames(P));equal(dest.registry.activeGames(T),[]);
    await dest.registry.releaseGame(P,third.matchId);equal(dest.registry.activeGames(P),[]);equal(dest.registry.matches(P).length,3);
  }));
  await test('equal-clock rapid transfer chains remain valid and restore in causal order',()=>page.evaluate(async()=>{
    const a=await fresh(),r=a.registry,c=r.owned(P)[0],clock=Date.now,at=clock();Date.now=()=>at;
    try{for(let n=0;n<8;n++){const from=n%2?T:P,to=n%2?P:T,t=await r.offer(from,c.id,to);await r.accept(to,t.id);}}finally{Date.now=clock;}
    const events=r.events(c.id);equal(new Set(events.map(e=>e.createdAt)).size,events.length);
    equal(events.map(e=>e.type),['seeded',...Array.from({length:8},()=>['offered','accepted']).flat()]);
    const backup=await a.exportBackup(),dest=await fresh();await dest.importBackup(backup);equal(dest.registry.get(c.id).ownerId,P);equal(dest.registry.transfers(P).length,8);
  }));
  await test('standalone local-db opens an upgraded DB without VersionError and refuses bound writes',()=>page.evaluate(async()=>{
    const db=await open('standalone'),g=db.registry.bindGame(P,game());await db.saveGame(g);db.close();
    const module=KalistarOwnership;delete window.KalistarOwnership;try{
      const bare=await open('standalone');assert(!bare.registry);equal(bare.match(g.matchId).state,g);await reject(()=>bare.saveGame(g));
      const stripped=structuredClone(g);delete stripped.collection;await reject(()=>bare.saveGame(stripped));await bare.saveGame(legacyFinal);equal(bare.counts().matches,2);bare.close();
    }finally{window.KalistarOwnership=module;}
    const next=await open('standalone');equal(next.registry.owned(T),[]);equal(next.registry.owned(P).length,41);
  }));
  await test('refresh propagates committed changes to another tab without shared JS cache',async()=>{
    const other=await context.newPage();await other.goto('http://localhost:39873/other');
    for(const f of ['data.js','engine.js','ownership.js','local-db.js'])await other.addScriptTag({content:source[f]});
    const id=await page.evaluate(async()=>{window.cross=await open('cross-tab');return cross.registry.owned(P)[0].id;});
    await other.evaluate(async()=>{window.cross=await KalistarLocalDB.open(KALISTAR_DATA,{name:'kalistar-v3-cards-ownership-cross-tab'});});
    const transfer=await page.evaluate(id=>cross.registry.offer(P,id,T),id);
    await other.evaluate(id=>cross.registry.accept(KalistarOwnership.TOKYO,id),transfer.id);
    await page.waitForFunction(id=>cross.registry.get(id).ownerId===T,id);
    assert.equal(await other.evaluate(async id=>{await cross.registry.refresh();return cross.registry.get(id).ownerId;},id),'user-tokyo');await other.close();
  });
  await test('no uncaught browser errors; original database name was never opened',async()=>{
    assert.deepEqual(errors,[]);assert.equal(await page.evaluate(async()=>!(await indexedDB.databases()).some(d=>d.name==='kalistar-v3-cards')),true);
  });
  await page.evaluate(async()=>{for(const db of opened)db.close();for(const name of new Set(names))await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=resolve;r.onerror=()=>reject(r.error);});});
}
run().catch(e=>{cases.push({name:'harness',ok:false,error:e.stack});console.error(e);}).finally(async()=>{
  if(browser)await browser.close();
  const report={generatedAt:new Date().toISOString(),browser:'isolated headless Chrome context',databasePrefix:'kalistar-v3-cards-ownership-',actualUserProfileAccessed:false,networkBackend:false,
    sources:Object.fromEntries(Object.entries(source).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')])),passed:cases.filter(c=>c.ok).length,failed:cases.filter(c=>!c.ok).length,cases,errors};
  fs.mkdirSync(path.join(root,'verification-ownership'),{recursive:true});fs.writeFileSync(path.join(root,'verification-ownership/backend-tests.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
});
