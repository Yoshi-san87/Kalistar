'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const {openEquipment}=require('./equipment-browser-test-helpers.cjs'),{activeFixture}=require('./fixtures/ff9-combat.cjs');
const {buildCatalog}=require('../atelier/game-catalog.cjs'),Q=require('./equipment.js');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__ff9_browser__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const base=process.env.KALISTAR_URL||(built?'https://kalistar-qa.invalid/Kalistar':'http://127.0.0.1:4304');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-09-ff9-equipment/qa');
const items=Q.catalogue.weapons.filter(w=>w.id.startsWith('ff9-')),results=[],errors=[];let browser,navigation=0;
async function ready(page,view='weapons'){await page.goto(base+'/jeu/?ff9-equipment-qa='+ ++navigation+'#'+view);await page.waitForFunction(()=>window.KALISTAR_READY);}
async function images(page){await page.waitForFunction(()=>[...document.querySelectorAll('dialog[open] img,.eq-overlay img,.slot-card > img')].every(i=>!i.getBoundingClientRect().width||i.complete&&i.naturalWidth));}
async function capture(page,name){await images(page);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:88,animations:'disabled',mask:[page.locator('.ownership-banner small')]});}
async function bind(page,state){
  await page.evaluate(async state=>{
    const old=JSON.parse(localStorage.getItem('kalistar.v4.game')||'null');
    if(old&&!old.seed?.startsWith('FF9-VISUAL-QA-'))throw Error('Non-QA game protected');
    if(old?.collection&&old.phase!=='over')await KALISTAR_DB.registry.releaseGame(KALISTAR_ACTIVE_USER,old.matchId);
    const s=KALISTAR_DB.registry.bindGame(KALISTAR_ACTIVE_USER,state);await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
  },state);
}
async function geometry(overlay,motion){
  const r=await overlay.evaluate(n=>{
    const i=n.closest('.slot-card').querySelector('img').getBoundingClientRect(),r=n.getBoundingClientRect(),c=KalistarCardMedia.crop,a=KalistarEquipmentFX.native;
    return {dx:Math.abs(r.left-i.left-(a.left-c.left)/c.width*i.width),dy:Math.abs(r.top-i.top-(a.top-c.top)/c.height*i.height),dw:Math.abs(r.width-a.width/c.width*i.width),animation:getComputedStyle(n.querySelector('.eq-orbit')).animationName};
  });
  assert(Math.max(r.dx,r.dy,r.dw)<1.5,JSON.stringify(r));assert.equal(r.animation,motion==='reduce'?'none':'eq-continuous-orbit');return r;
}
async function main(){
  fs.mkdirSync(out,{recursive:true});const data=await buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
  const fixtures=items.map((w,i)=>activeFixture(data,w,i%2));
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height,motion]of [['desktop',1440,1000,'no-preference'],['razr50',412,1007,'no-preference'],['compact',320,640,'reduce']]){
    if(process.env.KALISTAR_QA_VIEWPORT&&process.env.KALISTAR_QA_VIEWPORT!==name)continue;
    const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,serviceWorkers:'block'});
    if(built)await context.route('**/*',async route=>{
      const url=new URL(route.request().url());if(url.origin!==new URL(base).origin||!url.pathname.startsWith('/Kalistar/'))return route.abort();
      let relative=decodeURIComponent(url.pathname.slice('/Kalistar/'.length));if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))throw Error('Missing built resource: '+relative);
      const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      await route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-ff9-qa-only'):open.call(this,n+'-ff9-qa-only',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));page.on('response',r=>{if(r.status()>=400)errors.push(name+': '+r.status()+' '+r.url());});
    await ready(page);assert.equal(await page.locator('.weapon-entry').count(),93);
    for(const w of items){
      await openEquipment(page,w.id);await images(page);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,w.id);
      const overflow=await page.locator('#weapons-dialog :is(.wc-title,.wc-rule-condition,.wc-rule-effect,.wc-flavour,.wc-activation,.wc-bearers)').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2).map(n=>n.className));assert.deepEqual(overflow,[],w.id);
      const expected=[...new Set(data.cards.filter(c=>Q.compatible(w,c)).map(c=>c.characterId))].sort();
      const actual=await page.locator('#weapons-dialog [data-weapon-action=equip]').evaluateAll(ns=>ns.map(n=>n.dataset.character).sort());assert.deepEqual(actual,expected,w.id);
      await page.locator('#weapons-dialog [data-weapon-action=equip]').first().click();
      if(await page.locator('.weapon-confirm').isVisible())await page.locator('[data-weapon-action=confirm]').click();
      await page.waitForFunction(id=>Object.values(KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon).includes(id),w.id);
      await page.locator('#weapons-dialog').evaluate(n=>n.scrollTop=0);await capture(page,name+'-'+w.id+'-detail');
      await page.locator('[data-weapon-action=close]').click();
    }
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    assert.equal(await page.evaluate(()=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon['steiner-ff9']),'ff9-oath-helm');
    await openEquipment(page,'ff9-oath-helm');await page.locator('[data-weapon-action=unequip]').click();await page.waitForFunction(()=>!KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon['steiner-ff9']);await page.locator('[data-weapon-action=close]').click();
    const deckSlot=await page.evaluate(()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),c=KALISTAR_DATA.cards.find(c=>c.characterId==='vivi-ff9');
      let team=T.normalize({name:'FFIX QA',cards:[c.id]});team=T.equip(team,c.id,'ff9-vivi-hat');
      localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(team));return T.slots(team).indexOf(c.id);
    });
    await ready(page,'decks');await page.locator(`[data-deck-slot="${deckSlot}"] [data-deck-action=detail]`).click();await images(page);
    assert.equal(await page.locator('.eq-detail-overlay').getAttribute('data-weapon-id'),'ff9-vivi-hat');
    assert.equal(await page.locator('.eq-detail-overlay .eq-tab').count(),0,'deck preview does not promise an active bonus');
    await capture(page,name+'-deck-inspection');await page.locator('#detail-dialog [data-action=close]').click();
    for(const f of fixtures){
      await bind(page,f.inactive);await ready(page,'arena');assert.equal(await page.locator('.slot[data-unit="'+f.uid+'"] .eq-overlay').count(),0,f.id+' inactive');
      await bind(page,f.state);await ready(page,'arena');const overlay=page.locator('.slot[data-unit="'+f.uid+'"] .eq-overlay');
      await overlay.waitFor();await images(page);await page.waitForTimeout(800);const aligned=await geometry(overlay,motion);
      assert((await overlay.locator('.eq-rim').getAttribute('src')).endsWith(f.id+'-ring-v1.webp'));
      assert((await overlay.locator('.eq-body').getAttribute('src')).endsWith(f.id+'-v1.webp'));
      await capture(page,name+'-'+f.id+'-arena');
      await page.locator('.slot[data-unit="'+f.uid+'"] [data-action=detail]').click();await images(page);
      assert.equal(await page.locator('.eq-detail-overlay').getAttribute('data-weapon-id'),f.id);
      if(['ff9-save-the-queen','ff9-vivi-hat','ff9-garnet-pendant'].includes(f.id))await capture(page,name+'-'+f.id+'-inspection');
      await page.locator('#detail-dialog [data-action=close]').click();
      await page.setViewportSize({width:width+17,height:height-13});await page.waitForTimeout(200);await geometry(overlay,motion);await page.setViewportSize({width,height});
      await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await overlay.waitFor();
      results.push({name,id:f.id,side:f.side,round:f.round,geometry:aligned,equipReloadInspect:true});
      console.log('PASS '+name+' '+f.id);
    }
    await ready(page);assert.equal(await page.locator('.eq-overlay').count(),0);await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results'+(process.env.KALISTAR_QA_VIEWPORT?'-'+process.env.KALISTAR_QA_VIEWPORT:'')+'.json'),JSON.stringify({passed:true,results,errors},null,2)+'\n');
  console.log({passed:true,checks:results.length,out});
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
