'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__equipment_qa__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const base=process.env.KALISTAR_URL||(built?'https://kalistar-qa.invalid/Kalistar':'http://127.0.0.1:4304'),out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-06-equipment-categories/qa');
const errors=[],results=[];let browser,navigation=0;
async function ready(page,hash='weapons'){await page.goto(base+'/jeu/?equipment-categories-qa='+ ++navigation+'#'+hash);await page.waitForFunction(()=>window.KALISTAR_READY);}
async function capture(page,name){await page.locator('#toast.visible').waitFor({state:'hidden'});await page.screenshot({path:path.join(out,name+'.png'),fullPage:false,animations:'disabled'});}
async function align(page,label){
  await page.waitForFunction(()=>[...document.querySelectorAll('.eq-overlay')].some(n=>getComputedStyle(n).visibility==='visible'));
  const samples=await page.locator('.eq-overlay').evaluateAll(nodes=>nodes.map(n=>{
    const img=n.closest('.slot-card').querySelector('img'),i=img.getBoundingClientRect(),r=n.getBoundingClientRect(),c=KalistarCardMedia.crop,a=KalistarEquipmentFX.native;
    return {dx:Math.abs(r.left-(i.left+(a.left-c.left)/c.width*i.width)),dy:Math.abs(r.top-(i.top+(a.top-c.top)/c.height*i.height)),dw:Math.abs(r.width-a.width/c.width*i.width),animation:getComputedStyle(n.querySelector('.eq-orbit')).animationName};
  }));
  for(const s of samples)for(const k of ['dx','dy','dw'])assert(s[k]<1.5,label+JSON.stringify(s));results.push({label,samples});return samples;
}
async function prepare(page,id,side,armed){
  return page.evaluate(async({id,side,armed})=>{
    const previous=JSON.parse(localStorage.getItem('kalistar.v4.game')||'null');
    if(previous?.seed&&previous.seed!=='EQUIPMENT-CATEGORIES-QA')throw Error('Refusing to replace a non-QA game.');
    if(previous?.collection&&previous.phase!=='over')await KALISTAR_DB.registry.releaseGame(KALISTAR_ACTIVE_USER,previous.matchId);
    const E=KalistarEngine.createEngine(KALISTAR_DATA),w=KalistarWeapons.weapons.find(w=>w.id===id),c=KALISTAR_DATA.cards.find(c=>KalistarEquipment.compatible(w,c));
    const base=KALISTAR_DATA.decks.player,deck=base.map((_,i)=>base.map((v,j)=>j===i?c.id:v)).find(ids=>!E.validatePlayableDeck(ids).length),loadout={[c.characterId]:id};
    let s=E.newGame(deck,deck,{mode:'local',seed:'EQUIPMENT-CATEGORIES-QA',kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
    const uid=s.players[side].reserve.find(u=>u.cardId===c.id).uid;
    E.autoDeploy(s,0);E.autoDeploy(s,1);
    if(!s.players[side].board.some(u=>u?.uid===uid)){E.recall(s,side,c.positions[0]-1);E.deploy(s,side,uid,c.positions[0]-1);}E.start(s);
    function defenseState(state,resolve){
      const target=state.players[side].board.find(u=>u?.uid===uid);
      for(const actor of state.players[1-side].board.filter(Boolean))for(let atk=6;atk>0;atk--){
        if(typeof E.card(actor).atk[6-atk]!=='number')continue;
        for(let def=6;def>0;def--){
          if(typeof E.card(target).defense[6-def]!=='number')continue;
          const next=E.clone(state);next.turn=1-side;
          E.lock(next,next.players[1-side].board.findIndex(u=>u?.uid===actor.uid),next.players[side].board.findIndex(u=>u?.uid===uid));E.rollAttack(next,atk);
          const pending=E.clone(next);E.rollDefense(next,def);
          if(next.phase==='result'&&next.match.events.at(-1).hold)return {state:resolve?next:pending,def};
        }
      }
      throw Error('No real numeric Block fixture for '+id);
    }
    if(armed&&id==='pod-042'){s=defenseState(s,true).state;E.next(s);}
    let die=null;
    if(armed){const r=defenseState(s,false);s=r.state;die=r.def;}
    E.assertState(s);s=KALISTAR_DB.registry.bindGame(KALISTAR_ACTIVE_USER,s);await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
    return {uid,die};
  },{id,side,armed});
}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,viewport,motion] of [['desktop',{width:1440,height:1000},'no-preference'],['phone',{width:412,height:1007},'no-preference'],['compact',{width:320,height:568},'reduce']]){
    const context=await browser.newContext({viewport,reducedMotion:motion,serviceWorkers:'block'});
    if(built)await context.route('**/*',async route=>{
      const url=new URL(route.request().url());if(url.origin!==new URL(base).origin||!url.pathname.startsWith('/Kalistar/'))return route.abort();
      let relative=decodeURIComponent(url.pathname.slice('/Kalistar/'.length));if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))throw Error('Missing built resource: '+relative);
      const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      await route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-equipment-categories-qa'):open.call(this,n+'-equipment-categories-qa',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));page.on('dialog',d=>d.accept());
    await ready(page);assert.equal(await page.locator('.weapon-entry').count(),75);
    for(const [kind,id,character] of [['shield','durane-rampart','balmhyr'],['relic','pod-042','2b-nier']]){
      await page.locator(`[data-equipment-category=${kind}]`).click();assert.equal(await page.locator('.weapon-entry').count(),21);
      await page.locator(`[data-weapon="${id}"]`).click();await page.waitForFunction(()=>[...document.querySelectorAll('#weapons-dialog img')].every(i=>i.complete&&i.naturalWidth));
      await capture(page,name+'-'+kind+'-detail');
      const button=page.locator(`[data-weapon-action=equip][data-character="${character}"]`);assert(await button.isVisible());await button.click();
      await page.waitForFunction(({character,id})=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon[character]===id,{character,id});
      await page.locator('[data-weapon-action=close]').click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await capture(page,name+'-'+kind+'-catalogue');
      await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
      assert.equal(await page.evaluate(c=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon[c],character),id);
    }
    // Cross-category replacement uses the same confirmation and single persisted slot.
    await page.locator('[data-weapon=fallen-king-axe]').click();await page.locator('[data-weapon-action=equip][data-character=balmhyr]').click();
    assert(await page.locator('.weapon-confirm').isVisible());await page.locator('[data-weapon-action=confirm]').click();
    await page.waitForFunction(()=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon.balmhyr==='fallen-king-axe');await page.locator('[data-weapon-action=close]').click();
    await page.locator('[data-weapon=fallen-king-axe]').click();await page.locator('[data-weapon-action=unequip]').click();await page.waitForFunction(()=>!KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon.balmhyr);await page.locator('[data-weapon-action=close]').click();
    for(const id of ['durane-rampart','pod-042']){
      const cardId=await page.evaluate(id=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),w=KalistarWeapons.weapons.find(w=>w.id===id),c=KALISTAR_DATA.cards.find(c=>KalistarEquipment.compatible(w,c));
        const base=KALISTAR_DATA.decks.player,cards=base.map((_,i)=>base.map((v,j)=>i===j?c.id:v)).find(ids=>!E.validatePlayableDeck(ids).length);
        const draft=T.fromPreset({name:'Equipements QA',cards});localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(draft));return c.id;
      },id);
      await ready(page,'decks');await page.locator(`[data-deck-preview="${cardId}"] [data-deck-action=slot]`).click();
      if(await page.locator('[data-deck-action=panel][data-id=recruit]').isVisible())await page.locator('[data-deck-action=panel][data-id=recruit]').click();
      await page.locator('[data-deck-action=recruit-mode][data-id=weapons]').click();
      await page.locator(`[data-deck-action=equip][data-id="${id}"]`).click();
      await page.waitForFunction(id=>Object.values(JSON.parse(localStorage.getItem('kalistar.v4.teamDraft')).equipment).includes(id),id);
      if(await page.locator('[data-deck-action=panel][data-id=board]').isVisible())await page.locator('[data-deck-action=panel][data-id=board]').click();
      await page.locator(`[data-deck-action=detail][data-id="${cardId}"]`).click();await page.waitForFunction(()=>document.querySelector('.eq-detail-overlay'));
      assert.equal(await page.locator('.eq-detail-overlay .eq-tab').count(),0);await capture(page,name+'-'+id+'-deck-inspection');
      await page.locator('#detail-dialog [data-action=close]').click();
    }
    for(const [id,side]of [['durane-rampart',0],['pod-042',1]]){
      await prepare(page,id,side,false);await ready(page,'arena');assert.equal(await page.locator('.eq-overlay').count(),0);
      const f=await prepare(page,id,side,true);await ready(page,'arena');
      await capture(page,name+'-'+id+'-before-alignment');
      const samples=await align(page,name+'-'+id);assert(samples.every(s=>s.animation===(motion==='reduce'?'none':'eq-continuous-orbit')));
      await capture(page,name+'-'+id+'-combat');
      await page.setViewportSize({width:viewport.width+24,height:viewport.height});await align(page,name+'-'+id+'-resize');await page.setViewportSize(viewport);
      const before=await page.evaluate(()=>localStorage.getItem('kalistar.v4.game'));
      await page.locator(`.slot[data-unit="${f.uid}"] [data-action=detail]`).click();
      await page.waitForFunction(()=>document.querySelector('.eq-detail-overlay'));await capture(page,name+'-'+id+'-inspection');
      assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v4.game')),before);
      await page.locator('#detail-dialog [data-action=close]').click();
      const resolved=await page.evaluate(async({die})=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.restoreGame(JSON.parse(localStorage.getItem('kalistar.v4.game')));
        E.rollDefense(s,die);E.assertState(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));await KALISTAR_DB.saveGame(s);return s.duel.formula.equipmentDefense;
      },f);assert.equal(resolved,id==='pod-042'?20:30);
      await ready(page,'arena');assert.equal(await page.locator('.eq-overlay').count(),0,'consumed overlay gone after reload');
    }
    await ready(page);assert.equal(await page.locator('.eq-overlay').count(),0);results.push({label:name+' equipment UX and real combat',passed:true});await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,results,errors},null,2)+'\n');console.log('PASS: equipment categories, equip/replace/unequip/reload, real combat, native anchors and reduced motion.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
