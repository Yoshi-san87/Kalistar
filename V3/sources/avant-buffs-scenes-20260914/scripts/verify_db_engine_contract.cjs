'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),site=path.join(root,'site');
const reviewed=['app.js','local-db.js','catalogue.js','engine.js','data.js','match-report.js'];
const sources=Object.fromEntries(reviewed.map(file=>[file,fs.readFileSync(path.join(site,file),'utf8')]));
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,12);
const sandbox={window:{}};vm.runInNewContext(sources['data.js'],sandbox);
const data=JSON.parse(JSON.stringify(sandbox.window.KALISTAR_DATA));
const E=require(path.join(site,'engine.js')).createEngine(data);
assert.equal(data.cards.length,41);assert.equal(data.arenas.length,16);
const cases=[],browserErrors=[];
async function test(name,fn){try{await fn();cases.push({name,ok:true});console.log('PASS '+name);}catch(error){cases.push({name,ok:false,error:error.message});console.log('FAIL '+name+': '+error.message);}}
function deckFor(card){
  const ids=[card.id];
  for(let role=1;role<=5;role++)if(!ids.some(id=>E.byId[id].positions.includes(role)))ids.push(data.cards.find(c=>c.positions.includes(role)&&!ids.includes(c.id)&&c.element!=='RAINBOW').id);
  for(const c of data.cards)if(ids.length<10&&!ids.includes(c.id)&&c.element!=='RAINBOW')ids.push(c.id);
  assert.deepEqual(E.validateDeck(ids),[]);return ids;
}
function gameFor(a,b,arenaId=data.arenas[0].id,seed='DB-CONTRACT'){
  const s=E.newGame(deckFor(a),deckFor(b),{mode:'local',seed,arenaId});
  E.autoDeploy(s,0);E.autoDeploy(s,1);
  for(const [side,c] of [[0,a],[1,b]])if(!s.players[side].board.some(u=>u.cardId===c.id)){
    const slot=c.positions[0]-1,u=s.players[side].reserve.find(u=>u.cardId===c.id);E.recall(s,side,slot);E.deploy(s,side,u.uid,slot);
  }
  E.start(s);return s;
}
const guard=data.cards.find(c=>c.canGuard&&c.atk.includes('guard')),none=data.cards.find(c=>c.element==='NONE');
const pending=gameFor(guard,none);
const caster=pending.players[0].board.findIndex(u=>u.cardId===guard.id),target=pending.players[1].board.findIndex(u=>u.cardId===none.id);
E.lock(pending,caster,target);E.rollAttack(pending,6-guard.atk.indexOf('guard'));
const recipient=pending.players[0].board.find(u=>u.uid!==pending.duel.attacker);recipient.luck=1;
E.assertState(pending);
const granted=E.clone(pending);E.grantGuard(granted,recipient.uid);
function complete(){
  let s=E.clone(granted);
  for(let i=0;i<6000&&s.phase!=='over';i++){
    if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
    else if(s.phase==='attack')E.rollAttack(s);
    else if(s.phase==='defense')E.rollDefense(s);
    else if(s.phase==='result')E.next(s);
    else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
    else{
      const [grant,choice]={guard:['grantGuard','aiGuardChoice'],heart:['grantReraise','aiReraiseChoice'],potion:['grantPotion','aiPotionChoice'],clover:['grantClover','aiCloverChoice']}[s.phase];
      E[grant](s,E[choice](s));
    }
  }
  assert.equal(s.phase,'over');E.assertState(s);return s;
}
const final=complete();
function defenseScenario(kind){
  const a=data.cards.find(c=>c.atk.some((v,i)=>kind==='death'?v==='death':typeof v==='number'&&c.magic.includes(6-i)===(kind==='magic')));
  const b=kind==='dodge'?data.cards.find(c=>c.defense.includes('dodge')):none;
  const attackDie=6-a.atk.findIndex((v,i)=>kind==='death'?v==='death':typeof v==='number'&&a.magic.includes(6-i)===(kind==='magic'));
  for(let n=0;n<100;n++){
    const s=gameFor(a,b,data.arenas[0].id,'WARD-CONTRACT-'+n);
    const ai=s.players[0].board.findIndex(u=>u.cardId===a.id),bi=s.players[1].board.findIndex(u=>u.cardId===b.id);
    s.players[1].board[bi].ward=60;E.lock(s,ai,bi);E.rollAttack(s,attackDie);
    const next=E.clone(s);E.rollDefense(next);
    if(next.phase==='result'&&(kind==='dodge'?next.duel.defenseValue==='dodge':typeof next.duel.defenseValue==='number')){
      E.assertState(s);E.assertState(next);return {before:s,after:next};
    }
  }
  throw new Error('No real-profile defense scenario for '+kind);
}
function playwright(){try{return require('playwright');}catch{return createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__review__.cjs'))('playwright');}}
let browser;
async function run(){
  browser=await playwright().chromium.launch({channel:process.env.KALISTAR_BROWSER||'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>browserErrors.push(e.message));
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname!=='localhost')return route.fulfill({status:204,body:''});
    if(url.pathname==='/blank')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated contract review</title>'});
    // Asset production is explicitly outside this review; do not probe missing images.
    if(/\.(png|webp|jpg|jpeg|svg)$/i.test(url.pathname))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep))return route.fulfill({status:403,body:''});
    try{
      const basename=path.basename(file),body=path.dirname(file)===site&&sources[basename]!==undefined?sources[basename]:fs.readFileSync(file);
      return route.fulfill({body,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(file)]||'application/octet-stream'});
    }catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('http://localhost:39872/blank');
  await page.evaluate(async()=>{
    localStorage.setItem('kalistar.v2.game','V2-UNTOUCHED');
    await new Promise((resolve,reject)=>{const r=indexedDB.open('kalistar-v2-cards',1);r.onupgradeneeded=()=>r.result.createObjectStore('sentinel');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('sentinel','readwrite');tx.objectStore('sentinel').put('UNCHANGED','marker');tx.oncomplete=()=>{db.close();resolve();};};});
  });
  await page.goto('http://localhost:39872/site/index.html');
  await page.waitForFunction(()=>window.KALISTAR_READY&&window.KALISTAR_DB);
  await test('NONE catalogue/detail renders without exception or elemental barrier',async()=>{
    assert.equal(await page.locator('.character-item').count(),40);
    for(const c of data.cards.filter(c=>c.element==='NONE')){
      await page.locator(`[data-action="detail"][data-id="${c.id}"]`).first().click();
      assert.match(await page.locator('.affinities').innerText(),/sans cristal/i);
      assert.equal(await page.locator('.stats-table .barrier').count(),0);
      await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
    }
  });
  await page.locator('[data-view="arena"]').click();
  const readState=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v3.game')));
  const importState=async s=>{
    await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
    await page.locator('#game-file').setInputFiles({name:'contract.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
    await page.waitForFunction(id=>JSON.parse(localStorage.getItem('kalistar.v3.game'))?.matchId===id,s.matchId);
    await page.evaluate(()=>KALISTAR_DB.idle());
  };
  await test('Setup arena selection and imported guard retain the exact arena',async()=>{
    await page.locator('[data-action="arena-picker"]').click();
    await page.locator(`input[name="arena"][value="${data.arenas.at(-1).id}"]`).check();
    await page.locator('#arena-form button[type="submit"]').click();
    assert.equal((await readState()).arenaId,data.arenas.at(-1).id);
    await importState(pending);assert.deepEqual(await readState(),pending);
    assert.equal(await page.locator('[data-action="arena-picker"]').isDisabled(),true);
  });
  await test('UI guard replaces clover once; saved state and DB stats equal the engine',async()=>{
    await page.locator(`.slot[data-unit="${recipient.uid}"] .slot-card`).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v3.game')).phase==='result');
    await page.evaluate(()=>KALISTAR_DB.idle());assert.deepEqual(await readState(),granted);
    assert.equal(await page.locator(`.slot[data-unit="${recipient.uid}"] .trait-badge`).count(),1);
    assert.equal(await page.locator(`.slot[data-unit="${recipient.uid}"] .ward-badge b`).innerText(),'60');
    const match=await page.evaluate(id=>KALISTAR_DB.match(id),granted.matchId);
    assert.deepEqual(match.state,granted);assert.deepEqual(match.summary,E.matchStats(granted));
  });
  await test('Invalid arena, multiple traits and V2 game imports leave active state intact',async()=>{
    for(const mutate of [s=>s.arenaId='absent-place',s=>s.players[0].board[0].mana=60,s=>s.schema=5]){
      const bad=E.clone(granted);if(bad.players[0].board[0].uid!==recipient.uid)bad.players[0].board[0].ward=60;mutate(bad);
      const before=await readState();
      await page.evaluate(()=>document.querySelector('#toast').textContent='');
      await page.locator('#game-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
      await page.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Import refus'));
      assert.deepEqual(await readState(),before);
    }
  });
  await test('UI defense consumes ward only for physical numeric rolls; DB retains identical totals',async()=>{
    for(const kind of ['physical','magic','dodge','death']){
      const scenario=defenseScenario(kind);await importState(scenario.before);
      await page.locator('[data-action="roll"]').click();
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v3.game')).phase==='result');
      await page.evaluate(()=>KALISTAR_DB.idle());
      const actual=await readState();assert.deepEqual(actual,scenario.after);
      const defender=[...actual.players[1].board.filter(Boolean),...actual.players[1].dead].find(u=>u.uid===actual.duel.target);
      assert.equal(defender.ward,kind==='physical'?0:60);
      const match=await page.evaluate(id=>KALISTAR_DB.match(id),actual.matchId);
      assert.deepEqual(match.summary,E.matchStats(scenario.after));
      assert.equal(match.summary.teams[1].ward,kind==='physical'?60:0);
      if(kind==='physical')assert.equal(await page.locator('.duel-recap [data-bonus="ward"] b').innerText(),'+60');
    }
  });
  await test('Final results retain ward/arena metrics; repeated save/import never doubles careers',async()=>{
    const result=await page.evaluate(async state=>{
      const lib=await KalistarLocalDB.open(KALISTAR_DATA,{name:'kalistar-v3-cards-contract-source'});
      await lib.saveGame(state);await lib.saveGame(state);const backup=await lib.exportBackup();
      const dest=await KalistarLocalDB.open(KALISTAR_DATA,{name:'kalistar-v3-cards-contract-dest'});
      await dest.importBackup(backup);await dest.importBackup(backup);
      const output={counts:dest.counts(),summary:dest.match(state.matchId).summary,rows:dest.inspect('results'),careers:KALISTAR_DATA.cards.map(c=>({id:c.id,...dest.career(c.id)}))};
      window.CONTRACT_BACKUP=backup;lib.close();dest.close();return output;
    },final);
    const expected=E.matchStats(final);assert.deepEqual(result.summary,expected);assert.equal(result.counts.matches,1);assert.equal(result.counts.results,20);
    for(const u of expected.units){const row=result.rows.find(r=>r.instanceId===u.instanceId);for(const key of ['guards','ward','arenaAttack','arenaDefense','support','rating'])assert.equal(row[key],u[key]);}
    for(const c of result.careers){const rows=result.rows.filter(r=>r.cardId===c.id&&r.participated&&!r.partial);assert.equal(c.games,rows.length);assert.equal(c.support,rows.reduce((sum,r)=>sum+r.support,0));}
  });
  await test('V2 library import is rejected atomically and V2 storage remains isolated',async()=>{
    const result=await page.evaluate(async()=>{
      const before=JSON.stringify(['versions','instances','matches','results'].map(s=>KALISTAR_DB.inspect(s)));
      let rejected=false;try{await KALISTAR_DB.importBackup({...CONTRACT_BACKUP,edition:'V2',gameSchema:5,database:'kalistar-v2-cards'});}catch(e){rejected=/V2/.test(e.message);}
      const after=JSON.stringify(['versions','instances','matches','results'].map(s=>KALISTAR_DB.inspect(s)));
      const marker=await new Promise((resolve,reject)=>{const r=indexedDB.open('kalistar-v2-cards');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction('sentinel').objectStore('sentinel').get('marker');q.onsuccess=()=>{db.close();resolve(q.result);};};});
      return {rejected,unchanged:before===after,marker,local:localStorage.getItem('kalistar.v2.game')};
    });assert.deepEqual(result,{rejected:true,unchanged:true,marker:'UNCHANGED',local:'V2-UNTOUCHED'});
  });
  await test('Historical arena snapshots survive library import just like profiles and rules',async()=>{
    const result=await page.evaluate(async()=>{
      const backup=structuredClone(CONTRACT_BACKUP),m=backup.matches[0];
      m.arenas[0].subtitle='Historical arena snapshot';m.profiles[0].title='Historical profile snapshot';
      const lib=await KalistarLocalDB.open(KALISTAR_DATA,{name:'kalistar-v3-cards-contract-history'});
      await lib.importBackup(backup);const restored=(await lib.exportBackup()).matches[0];lib.close();
      return {arenas:JSON.stringify(restored.arenas)===JSON.stringify(m.arenas),profiles:JSON.stringify(restored.profiles)===JSON.stringify(m.profiles)};
    });assert.equal(result.profiles,true);assert.equal(result.arenas,true,'Arena snapshot was replaced by the current catalog on import');
  });
  await test('No browser exceptions in the reviewed flows',async()=>assert.deepEqual(browserErrors,[]));
  const changed=reviewed.filter(file=>sources[file]!==fs.readFileSync(path.join(site,file),'utf8'));
  console.log(JSON.stringify({cards:41,arenas:16,passed:cases.filter(t=>t.ok).length,failed:cases.filter(t=>!t.ok),sources:Object.fromEntries(reviewed.map(f=>[f,hash(sources[f])])),changedDuringReview:changed},null,2));
  if(cases.some(t=>!t.ok))process.exitCode=1;
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
