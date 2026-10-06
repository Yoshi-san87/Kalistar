'use strict';
const {openEquipment}=require('./equipment-browser-test-helpers.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__defensive_qa__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const base=process.env.KALISTAR_URL||(built?'https://kalistar-qa.invalid/Kalistar':'http://127.0.0.1:4304'),out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-06-protections-relics/qa');
const additions=require('./weapons.js').weapons.filter(w=>w.effect.trigger==='ONCE_DEFENSE');
const errors=[],results=[];let browser,navigation=0;
const combatOnly=process.env.KALISTAR_QA_COMBAT_ONLY==='1';
async function ready(page,hash='weapons'){await page.goto(base+'/jeu/?defensive-qa='+ ++navigation+'#'+hash);await page.waitForFunction(()=>window.KALISTAR_READY);}
async function capture(page,name){
  await page.locator('#toast.visible').waitFor({state:'hidden'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.slot-card > img,dialog[open] img,.weapon-entry img')].every(i=>{
    const r=i.getBoundingClientRect();return !r.width||r.bottom<0||r.top>innerHeight||i.complete&&i.naturalWidth>0;
  }));
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(out,name+'.png'),fullPage:false,animations:'disabled'});
}
async function prepare(page,id,side,choice=false){
  return page.evaluate(async({id,side,choice})=>{
    const old=JSON.parse(localStorage.getItem('kalistar.v4.game')||'null');
    if(old?.seed&&old.seed!=='DEFENSIVE-QA')throw Error('Non-QA game is protected.');
    if(old?.collection&&old.phase!=='over')await KALISTAR_DB.registry.releaseGame(KALISTAR_ACTIVE_USER,old.matchId);
    const E=KalistarEngine.createEngine(KALISTAR_DATA),w=KalistarWeapons.weapons.find(w=>w.id===id),c=KALISTAR_DATA.cards.find(c=>KalistarEquipment.compatible(w,c)),base=KALISTAR_DATA.decks.player;
    const deck=base.map((_,i)=>base.map((v,j)=>i===j?c.id:v)).find(ids=>!E.validatePlayableDeck(ids).length),loadout={[c.characterId]:id};
    let s=E.newGame(deck,deck,{mode:'local',seed:'DEFENSIVE-QA',kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
    const uid=s.players[side].reserve.find(u=>u.cardId===c.id).uid;E.autoDeploy(s,0);E.autoDeploy(s,1);
    if(!s.players[side].board.some(u=>u?.uid===uid)){E.recall(s,side,c.positions[0]-1);E.deploy(s,side,uid,c.positions[0]-1);}E.start(s);
    let found=null;
    for(const actor of s.players[1-side].board.filter(Boolean))for(let atk=6;atk>0&&!found;atk--)for(let def=6;def>0&&!found;def--){
      const n=E.clone(s);n.turn=1-side;E.lock(n,n.players[1-side].board.findIndex(u=>u?.uid===actor.uid),n.players[side].board.findIndex(u=>u?.uid===uid));E.rollAttack(n,atk);
      if(n.phase!=='defense'||typeof E.card(n.players[side].board.find(u=>u?.uid===uid)).defense[6-def]!=='number')continue;
      const pending=E.clone(n);E.rollDefense(n,def);
      if(n.phase==='result'&&n.duel.formula&&(choice?!!E.equipmentChoice(n):n.duel.formula.equipmentDefense===w.effect.value))found={s:choice?n:pending,die:def};
    }
    if(!found)throw Error('No real-card combat fixture for '+id);s=found.s;E.assertState(s);
    s=KALISTAR_DB.registry.bindGame(KALISTAR_ACTIVE_USER,s);await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));return {uid,die:found.die};
  },{id,side,choice});
}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,viewport,motion]of [['desktop',{width:1440,height:1000},'no-preference'],['phone',{width:412,height:1007},'no-preference'],['compact',{width:320,height:568},'reduce']]){
    if(process.env.KALISTAR_QA_VIEWPORT&&process.env.KALISTAR_QA_VIEWPORT!==name)continue;
    const context=await browser.newContext({viewport,reducedMotion:motion,serviceWorkers:'block'});
    if(built)await context.route('**/*',async route=>{
      const url=new URL(route.request().url());if(url.origin!==new URL(base).origin||!url.pathname.startsWith('/Kalistar/'))return route.abort();
      let relative=decodeURIComponent(url.pathname.slice('/Kalistar/'.length));if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))throw Error('Missing built resource: '+relative);
      const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      await route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-defensive-qa'):open.call(this,n+'-defensive-qa',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));page.on('response',r=>{if(r.status()>=400)errors.push(name+': '+r.status()+' '+r.url());});page.on('dialog',d=>d.accept());
    await ready(page);assert.equal(await page.locator('.weapon-entry').count(),75);
    for(const kind of combatOnly?[]:['shield','relic']){
      await page.locator(`[data-equipment-category=${kind}]`).click();assert.equal(await page.locator('.weapon-entry').count(),21);
      await capture(page,name+'-'+kind+'-collection');
      for(const w of additions.filter(w=>w.kind===kind)){
        await openEquipment(page,w.id);
        await page.waitForFunction(()=>[...document.querySelectorAll('#weapons-dialog img')].every(i=>i.complete&&i.naturalWidth));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,w.id);
        const broken=await page.locator('#weapons-dialog :is(.wc-title,.wc-rule-condition,.wc-rule-effect,.wc-flavour,.wc-activation,.wc-bearers)').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2).map(n=>n.className));assert.deepEqual(broken,[],w.id);
        if(name==='desktop'||['tide-pavise','octocamo','white-materia','little-joys-box'].includes(w.id))await capture(page,name+'-'+w.id);
        const equip=page.locator('[data-weapon-action=equip]').first();assert(await equip.isVisible(),w.id+' compatible bearer');await equip.click();
        if(await page.locator('.weapon-confirm').isVisible())await page.locator('[data-weapon-action=confirm]').click();
        await page.waitForFunction(id=>Object.values(KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon).includes(id),w.id);
        await page.locator('[data-weapon-action=close]').click();
      }
    }
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    if(!combatOnly)assert(Object.keys(await page.evaluate(()=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon)).length>=20);
    for(const [id,side]of [['octocamo',0],['leon-body-armor',1]]){
      const f=await prepare(page,id,side);await ready(page,'arena');await page.waitForFunction(()=>[...document.querySelectorAll('.eq-overlay')].some(n=>getComputedStyle(n).visibility==='visible'&&[...n.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth)));
      const check=()=>page.locator('.eq-overlay').evaluateAll(ns=>ns.map(n=>{
        const i=n.closest('.slot-card').querySelector('img').getBoundingClientRect(),r=n.getBoundingClientRect(),c=KalistarCardMedia.crop,a=KalistarEquipmentFX.native;
        return {dx:Math.abs(r.left-i.left-(a.left-c.left)/c.width*i.width),dy:Math.abs(r.top-i.top-(a.top-c.top)/c.height*i.height),dw:Math.abs(r.width-a.width/c.width*i.width),animation:getComputedStyle(n.querySelector('.eq-orbit')).animationName};
      }));
      for(const s of await check()){assert(Math.max(s.dx,s.dy,s.dw)<1.5);assert.equal(s.animation,motion==='reduce'?'none':'eq-continuous-orbit');}
      await capture(page,name+'-'+id+'-combat');await page.setViewportSize({width:viewport.width+23,height:viewport.height});for(const s of await check())assert(Math.max(s.dx,s.dy,s.dw)<1.5);await page.setViewportSize(viewport);
      await page.locator(`.slot[data-unit="${f.uid}"] [data-action=detail]`).click();await page.waitForFunction(()=>document.querySelector('.eq-detail-overlay'));await capture(page,name+'-'+id+'-inspection');await page.locator('#detail-dialog [data-action=close]').click();
      const value=await page.evaluate(async f=>{const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.restoreGame(JSON.parse(localStorage.getItem('kalistar.v4.game')));E.rollDefense(s,f.die);E.assertState(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));await KALISTAR_DB.saveGame(s);return s.duel.formula.equipmentDefense;},f);assert.equal(value,id==='octocamo'?25:30);
      await ready(page,'arena');assert.equal(await page.locator('.eq-overlay').count(),0);
    }
    for(const side of [0,1]){
    await prepare(page,'exiled-king-seal',side,true);await ready(page,'arena');
    const options=page.locator('[data-action=equipment-recipient]');assert.equal(await options.count(),4);
    for(const node of await options.evaluateAll(ns=>ns.map(n=>({card:n.classList.contains('slot-card'),eligible:n.closest('.slot').classList.contains('trait-eligible'),width:n.getBoundingClientRect().width,side:n.dataset.side})))){
      assert(node.card&&node.eligible&&node.width>=44,name+JSON.stringify(node));assert.equal(node.side,String(side));
    }
    assert.equal(await page.locator('.equipment-recipient-options').count(),0);await capture(page,name+'-relay-choice'+(side?'-opponent':''));
    for(const visible of await options.evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})))assert(visible,name+' every recipient is directly reachable');
    const recipient=await options.first().getAttribute('data-uid');await options.first().click();
    await page.waitForFunction(uid=>JSON.parse(localStorage.getItem('kalistar.v4.game')).equipment.defensive.grants.some(r=>r.recipient===uid&&r.status==='ready'),recipient);
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);assert.equal(await options.count(),0);await capture(page,name+'-relay-ready'+(side?'-opponent':''));
    }
    await prepare(page,'exiled-king-seal',1,true);
    await page.evaluate(async()=>{const s=JSON.parse(localStorage.getItem('kalistar.v4.game'));s.mode='ai';KalistarEngine.createEngine(KALISTAR_DATA).assertState(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));await KALISTAR_DB.saveGame(s);});
    await ready(page,'arena');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).equipment.defensive.grants.some(r=>r.sourceUid[0]==='1'&&r.status==='ready'));
    assert.equal(await page.locator('[data-action=equipment-recipient]').count(),0);
    await ready(page);assert.equal(await page.locator('.eq-overlay').count(),0);results.push({name,cards:combatOnly?0:additions.length,passed:true});await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,combatOnly?'combat-results.json':'results.json'),JSON.stringify({passed:true,results,errors},null,2)+'\n');console.log('PASS: '+(combatOnly?'combat suite':'40 equipment cards')+' on '+results.length+' viewports, reload, both combat sides, anchors, inspection, consumption, relay choice and reduced motion.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
