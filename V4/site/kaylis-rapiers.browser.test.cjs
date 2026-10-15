'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const Q=require('./equipment.js'),{activeFixture,deck}=require('./fixtures/castlevania-kalistar-combat.cjs');
const {openEquipment}=require('./equipment-browser-test-helpers.cjs'),{createEngine}=require('./engine.js');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__kaylis_browser__.cjs'))('playwright');
const root=path.resolve(__dirname,'../..'),dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-14-kaylis-rapiers/qa');
const base='https://kalistar-equipment-qa.invalid/Kalistar',items=['white-oath-rapier','kaylis-eclipse-rapier'].map(id=>Q.catalogue.weapons.find(w=>w.id===id));
const errors=[],results=[];let browser,nav=0;
const ready=async(p,view='weapons')=>{await p.goto(base+'/jeu/?kaylis-qa='+ ++nav+'#'+view);await p.waitForFunction(()=>window.KALISTAR_READY);};
const images=p=>p.waitForFunction(()=>[...document.querySelectorAll('dialog[open] img,.eq-overlay img,.slot-card > img')].every(i=>!i.getBoundingClientRect().width||i.complete&&i.naturalWidth));
async function capture(p,name){await images(p);await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:88,animations:'disabled',mask:[p.locator('.ownership-banner small')]});}
async function bind(p,state){
  await p.evaluate(async s=>{
    const old=JSON.parse(localStorage.getItem('kalistar.v4.game')||'null');
    if(old&&!old.seed.startsWith('CV-KAL-'))throw Error('Only isolated QA saves may be replaced');
    if(old?.collection&&old.phase!=='over')await KALISTAR_DB.registry.releaseGame(KALISTAR_ACTIVE_USER,old.matchId);
    const bound=KALISTAR_DB.registry.bindGame(KALISTAR_ACTIVE_USER,s);await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(bound);
    localStorage.setItem('kalistar.v4.game',JSON.stringify(bound));
  },state);
}
async function geometry(node,motion,active=true){
  const r=await node.evaluate(n=>{
    const img=n.parentElement.querySelector(':scope > img'),r=n.getBoundingClientRect(),i=img.getBoundingClientRect(),c=KalistarCardMedia.crop;
    const a=(n.dataset.arena==='true'?KalistarEquipmentFX.arenaLayouts:KalistarEquipmentFX.layouts)[n.dataset.slot],style=getComputedStyle(img);
    const w=style.objectFit==='contain'?Math.min(i.width,i.height*c.width/c.height):i.width,h=style.objectFit==='contain'?Math.min(i.height,i.width*c.height/c.width):i.height;
    return {dx:Math.abs(r.left-i.left-(i.width-w)/2-(a.left-c.left)/c.width*w),dy:Math.abs(r.top-i.top-(i.height-h)/2-(a.top-c.top)/c.height*h),dw:Math.abs(r.width-a.width/c.width*w),animation:getComputedStyle(n.querySelector('.eq-orbit')).animationName};
  });
  assert(Math.max(r.dx,r.dy,r.dw)<1.5,JSON.stringify(r));
  assert.equal(r.animation,motion==='reduce'||!active?'none':'eq-continuous-orbit');return r;
}
async function main(){
  fs.mkdirSync(out,{recursive:true});
  const plan=process.env.KALISTAR_SOURCE==='1'?await require('../deploy/build.cjs').plan():null;
  const data=plan?plan.catalogue:JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8'));
  const sources=plan&&new Map(plan.files.map(f=>[f.target,path.join(root,f.source)]));
  const fixtures=items.map((w,i)=>activeFixture(data,w,i));
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height,motion]of [['desktop',1440,1000,'no-preference'],['razr50',412,1007,'no-preference'],['compact',320,740,'reduce']]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,serviceWorkers:'block'});
    await context.route('**/*',async route=>{
      const u=new URL(route.request().url());if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/Kalistar/'))return route.abort();
      let rel=decodeURIComponent(u.pathname.slice('/Kalistar/'.length));if(rel.endsWith('/'))rel+='index.html';
      if(plan&&rel==='jeu/catalogue.json')return route.fulfill({json:data});
      const file=plan?sources.get(rel):path.resolve(dist,rel);assert(file&&fs.existsSync(file),'Missing '+rel);
      const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      if(plan&&rel==='jeu/index.html')return route.fulfill({body:fs.readFileSync(file,'utf8').replace('data-hosting="local"','data-hosting="static"'),contentType:'text/html'});
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-kaylis-qa-only'):open.call(this,n+'-kaylis-qa-only',v);};});
    const p=await context.newPage();p.on('pageerror',e=>errors.push(name+': '+e.message));
    await ready(p);
    for(const w of items){
      await openEquipment(p,w.id);await images(p);
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const overflow=await p.locator('#weapons-dialog :is(.wc-title,.wc-rule-condition,.wc-rule-effect,.wc-flavour,.wc-activation,.wc-bearers)').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2).map(n=>n.className));
      assert.deepEqual(overflow,[],name+' '+w.id);
      assert.equal(await p.locator('#weapons-dialog .wc-title').innerText(),w.name.toUpperCase());
      const buttons=p.locator('#weapons-dialog [data-weapon-action=equip]');assert.equal(await buttons.count(),1);
      assert.equal(await buttons.first().getAttribute('data-character'),'kaylis');await buttons.first().click();
      if(w===items[1]){await p.locator('.weapon-confirm').waitFor();await p.locator('[data-weapon-action=confirm]').click();}
      await p.waitForFunction(id=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon.kaylis===id,w.id);
      await p.locator('#weapons-dialog').evaluate(n=>n.scrollTop=0);await capture(p,name+'-'+w.id+'-detail');
      await p.locator('[data-weapon-action=close]').click();
    }
    await p.reload();await p.waitForFunction(()=>window.KALISTAR_READY);
    assert.equal(await p.evaluate(()=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon.kaylis),items[1].id);
    await openEquipment(p,items[1].id);await p.locator('[data-weapon-action=unequip]').click();
    await p.waitForFunction(()=>!KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon.kaylis);
    await p.locator('[data-weapon-action=close]').click();
    const E=createEngine(data),deckIds=deck(E,['49055457']);
    await p.evaluate(({deckIds,id})=>{
      const T=KalistarTeamComposition.create(KalistarEngine.createEngine(KALISTAR_DATA));
      let team=T.fromPreset({name:'Kaylis rapier QA',cards:deckIds});team=T.equip(team,'49055457',id);
      localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(team));
    },{deckIds,id:items[1].id});
    await ready(p,'decks');
    await p.locator('[data-deck-slot][data-deck-preview="49055457"] [data-deck-action=detail]').click();await images(p);
    await geometry(p.locator('.eq-detail-overlay'),motion);await capture(p,name+'-eclipse-deck');
    await p.locator('#detail-dialog [data-action=close]').click();
    for(const f of fixtures){
      await bind(p,f.inactive);await ready(p,'arena');await images(p);
      const overlay=p.locator('.slot[data-unit="'+f.uid+'"] .eq-overlay[data-weapon-id="'+f.id+'"]');
      await overlay.waitFor();await geometry(overlay,motion,false);
      await bind(p,f.state);await ready(p,'arena');await overlay.waitFor();await images(p);await p.waitForTimeout(700);
      const aligned=await geometry(overlay,motion);await capture(p,name+'-'+f.id+'-arena');
      await p.locator('.slot[data-unit="'+f.uid+'"] [data-action=detail]').click();await images(p);
      await geometry(p.locator('.eq-detail-overlay[data-weapon-id="'+f.id+'"]'),motion);await capture(p,name+'-'+f.id+'-inspection');
      await p.locator('#detail-dialog [data-action=close]').click();
      await p.setViewportSize({width:width+17,height:height-13});await p.waitForTimeout(200);await geometry(overlay,motion);await p.setViewportSize({width,height});
      await p.reload();await p.waitForFunction(()=>window.KALISTAR_READY);await overlay.waitFor();await images(p);await geometry(overlay,motion);
      results.push({viewport:name,id:f.id,side:f.side,geometry:aligned});console.log('PASS '+name+' '+f.id);
    }
    await ready(p);assert.equal(await p.locator('.eq-overlay,.eq-use,.eq-transfer').count(),0);await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({passed:true,results,errors},null,2)+'\n');
}
main().catch(async e=>{console.error(e);for(const c of browser?.contexts()||[])for(const p of c.pages()){console.error(await p.locator('body').innerText().catch(()=>''));await p.screenshot({path:path.join(out,'failure.jpg')}).catch(()=>{});}process.exitCode=1;}).finally(()=>browser?.close());
