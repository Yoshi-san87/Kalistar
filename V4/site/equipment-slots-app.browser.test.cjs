'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__equipment_app_qa__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const base=process.env.KALISTAR_URL||(built?'https://kalistar-qa.invalid/Kalistar':'http://127.0.0.1:4304');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-09-equipment-slots/qa/app');
const errors=[],results=[];let browser,nav=0;
const ready=async(page,view)=>{await page.goto(base+'/jeu/?equipment-app-qa='+ ++nav+'#'+view);await page.waitForFunction(()=>window.KALISTAR_READY);};
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  try{for(const [name,viewport,motion]of [['desktop',{width:1440,height:1000},'no-preference'],['razr',{width:412,height:1007},'no-preference'],['compact',{width:320,height:568},'reduce']]){
    const context=await browser.newContext({viewport,reducedMotion:motion,serviceWorkers:'block'});
    if(built)await context.route('**/*',async route=>{
      const u=new URL(route.request().url());if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/Kalistar/'))return route.abort();
      let relative=decodeURIComponent(u.pathname.slice('/Kalistar/'.length));if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),'Missing built resource '+relative);
      const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-equipment-app-460-qa'):open.call(this,n+'-equipment-app-460-qa',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));await ready(page,'weapons');
    await page.locator('[data-action=rules]').first().evaluate(n=>n.click());
    const rules=await page.locator('#rules-dialog').innerText();
    assert(rules.includes('Arme, protection et relique')&&rules.includes('trois équipements simultanés')&&rules.includes('6 numérique conservé'));
    await page.locator('#rules-dialog [data-action=close]').click();
    const fixture=await page.evaluate(async()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),db=KALISTAR_DB,user=KALISTAR_ACTIVE_USER;
      for(const id of ['fallen-king-axe','durane-rampart','exiled-king-seal'])await db.equipment.equip(user,'balmhyr',id);
      await db.equipment.equip(user,'momo','little-joys-flute');
      const balm=KALISTAR_DATA.cards.find(c=>c.characterId==='balmhyr'),base=KALISTAR_DATA.decks.player;
      const ids=base.includes(balm.id)?base:base.map((_,i)=>base.map((id,j)=>i===j?balm.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);
      if(!ids)throw Error('No legal full-app fixture');
      let team=T.fromPreset({name:'Trois equipements QA',cards:ids});
      for(const id of ['fallen-king-axe','durane-rampart','exiled-king-seal'])team=T.equip(team,balm.id,id);
      localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(team));return {team,id:balm.id};
    });
    await ready(page,'decks');
    assert.equal(await page.locator(`[data-deck-preview="${fixture.id}"] .team-equipped`).count(),3);
    await page.locator(`[data-deck-slot][data-deck-preview="${fixture.id}"] [data-deck-action=detail]`).click();
    await page.waitForFunction(()=>document.querySelectorAll('.eq-detail-overlay').length===3&&[...document.querySelectorAll('.eq-detail-overlay img')].every(i=>i.complete&&i.naturalWidth));
    assert.equal(await page.locator('.eq-detail-overlay .eq-tab').count(),0);
    assert.deepEqual((await page.locator('.eq-detail-overlay').evaluateAll(ns=>ns.map(n=>n.dataset.slot))).sort(),['relic','shield','weapon']);
    await page.screenshot({path:path.join(out,name+'-deck-popup.png'),scale:'css'});await page.locator('#detail-dialog [data-action=close]').click();
    const state=await page.evaluate(async team=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA);let s=E.newGame(team,team,{mode:'local',seed:'EQUIPMENT-APP-460',kalistel:false,turnOrder:'ABBA'});
      while(s.phase==='initiative')E.rollInitiative(s);
      const a=s.players[s.turn].board.findIndex(u=>E.card(u).characterId==='balmhyr'),b=s.players[1-s.turn].board.findIndex(u=>E.card(u).characterId==='balmhyr');
      E.lock(s,a,b);E.rollAttack(s,6);E.rollDefense(s,6);E.assertState(s);
      if(s.duel.formula.equipmentWeapon!==30||s.duel.formula.equipmentProtection!==30)throw Error('Missing real direct contributions');
      while(E.equipmentChoice(s))E.grantEquipment(s,E.aiEquipmentChoice(s));
      s=KALISTAR_DB.registry.bindGame(KALISTAR_ACTIVE_USER,s);await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);
      localStorage.setItem('kalistar.v4.game',JSON.stringify(s));return s;
    },fixture.team);
    await ready(page,'arena');await page.waitForFunction(()=>[...document.querySelectorAll('.eq-overlay img')].every(i=>i.complete&&i.naturalWidth));
    assert.equal(await page.locator('.eq-overlay[data-slot=weapon],.eq-overlay[data-slot=shield]').count(),2);
    const activeRelics=state.players.flatMap(p=>p.board.filter(Boolean)).filter(u=>{
      const grants=state.equipment.defensive?.grants||[];
      return grants.some(g=>g.sourceUid===u.uid&&g.status==='ready');
    }).length;
    assert.equal(await page.locator('.eq-overlay[data-slot=relic]').count(),activeRelics,'relic overlay follows actual charge');
    const contributions=await page.locator('.recap-equipment').evaluateAll(ns=>ns.map(n=>({key:n.dataset.bonus,value:n.querySelector('b').textContent,art:n.querySelector('img').getAttribute('src')})));
    assert.equal(contributions.length,2);assert(contributions.every(r=>r.value==='+30'&&r.art));
    assert.deepEqual(contributions.map(r=>r.key).sort(),['equipmentAttack','equipmentDefense']);
    const saved=await page.evaluate(()=>localStorage.getItem('kalistar.v4.game'));
    await page.locator(`.slot[data-unit="${state.duel.attacker}"] [data-action=detail]`).click();
    assert.equal(await page.locator('.eq-detail-overlay').count(),1);assert.equal(await page.locator('.eq-detail-overlay').getAttribute('data-slot'),'weapon');
    await page.goBack();await page.waitForFunction(()=>!document.querySelector('#detail-dialog').open);
    assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v4.game')),saved,'Back closes popup, does not restart duel');
    const animations=await page.locator('.eq-overlay .eq-orbit').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).animationName));
    assert(animations.every(n=>n===(motion==='reduce'?'none':'eq-continuous-orbit')));
    await page.screenshot({path:path.join(out,name+'-arena-result.png'),scale:'css'});
    await page.evaluate(()=>KALISTAR_DB.equipment.unequip(KALISTAR_ACTIVE_USER,'balmhyr','fallen-king-axe'));
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);assert.equal(await page.locator('.eq-overlay[data-slot=weapon]').count(),1,'match snapshot survives profile edit and reload');
    const resumed=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));assert.deepEqual(resumed,state);
    await page.locator('[data-view=collection]').first().evaluate(n=>n.click());assert.equal(await page.locator('.eq-overlay,.eq-use,.eq-transfer,.eq-gift').count(),0);
    results.push({name,passed:true,checks:['full app deck popup: three items','real ATK6/DEF6 totals and actual recap art','inactive relic omitted','popup Back preserves match','profile isolation/reload','motion/cleanup']});await context.close();
  }}finally{await browser.close();}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,built,results,errors},null,2)+'\n');console.log('PASS full app three-slot equipment on desktop, Razr and compact Reduced Motion.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
