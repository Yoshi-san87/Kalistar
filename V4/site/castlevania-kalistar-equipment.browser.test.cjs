'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const Q=require('./equipment.js'),{activeFixture,deck}=require('./fixtures/castlevania-kalistar-combat.cjs'),{openEquipment}=require('./equipment-browser-test-helpers.cjs');
const {createEngine}=require('./engine.js');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__cv_kal_browser__.cjs'))('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist')),base='https://kalistar-equipment-qa.invalid/Kalistar';
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-11-castlevania-kalistar-equipment/qa');
const ids=require('../revisions/2026-10-11-castlevania-kalistar-equipment/selection.json').included;
const items=ids.map(id=>Q.catalogue.weapons.find(w=>w.id===id)),errors=[],results=[];let browser,nav=0;
const ready=async(p,view='weapons')=>{await p.goto(base+'/jeu/?cv-kal-qa='+ ++nav+'#'+view);await p.waitForFunction(()=>window.KALISTAR_READY);};
const images=p=>p.waitForFunction(()=>[...document.querySelectorAll('dialog[open] img,.eq-overlay img,.slot-card > img')].every(i=>!i.getBoundingClientRect().width||i.complete&&i.naturalWidth));
async function capture(p,name){await images(p);await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:87,animations:'disabled',mask:[p.locator('.ownership-banner small')]});}
async function bind(p,state){
  await p.evaluate(async s=>{
    const old=JSON.parse(localStorage.getItem('kalistar.v4.game')||'null');if(old&&!old.seed.startsWith('CV-KAL-'))throw Error('Only isolated QA saves may be replaced');
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
    return {dx:Math.abs(r.left-i.left-(i.width-w)/2-(a.left-c.left)/c.width*w),dy:Math.abs(r.top-i.top-(i.height-h)/2-(a.top-c.top)/c.height*h),dw:Math.abs(r.width-a.width/c.width*w),animation:getComputedStyle(n.querySelector('.eq-orbit')).animationName,visibility:getComputedStyle(n).visibility};
  });
  assert(Math.max(r.dx,r.dy,r.dw)<1.5,JSON.stringify(r));assert.equal(r.visibility,'visible');
  assert.equal(r.animation,motion==='reduce'||!active?'none':'eq-continuous-orbit');return r;
}
async function main(){
  fs.mkdirSync(out,{recursive:true});const data=JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8'));
  const fixtures=items.map((w,i)=>activeFixture(data,w,i%2));
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height,motion] of [['desktop',1440,1000,'no-preference'],['razr50',412,1007,'no-preference'],['compact',320,740,'reduce']]){
    if(process.env.KALISTAR_QA_VIEWPORT&&process.env.KALISTAR_QA_VIEWPORT!==name)continue;
    const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,serviceWorkers:'block'});
    await context.route('**/*',async route=>{
      const u=new URL(route.request().url());if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/Kalistar/'))return route.abort();
      let relative=decodeURIComponent(u.pathname.slice('/Kalistar/'.length));if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),'Missing '+relative);
      const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-cv-kal-qa-only'):open.call(this,n+'-cv-kal-qa-only',v);};});
    const p=await context.newPage(),equipped=[];
    p.on('pageerror',e=>errors.push(name+': '+e.message));p.on('response',r=>{if(r.status()>=400)errors.push(name+': '+r.status()+' '+r.url());});
    await ready(p);assert.equal(await p.locator('.weapon-entry').count(),Q.catalogue.weapons.length);
    for(const w of items){
      await openEquipment(p,w.id);await images(p);
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,w.id);
      const overflow=await p.locator('#weapons-dialog :is(.wc-title,.wc-rule-condition,.wc-rule-effect,.wc-flavour,.wc-activation,.wc-bearers)').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2).map(n=>n.className));
      assert.deepEqual(overflow,[],name+' '+w.id);
      const buttons=p.locator('#weapons-dialog [data-weapon-action=equip]');assert(await buttons.count()>0,w.id);
      const character=await buttons.first().getAttribute('data-character');assert(data.cards.some(c=>c.characterId===character&&Q.compatible(w,c)));
      await buttons.first().click();if(await p.locator('.weapon-confirm').isVisible())await p.locator('[data-weapon-action=confirm]').click();
      await p.waitForFunction(({w,character})=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots[w.slot][character]===w.id,{w,character});
      equipped.push({w,character});await p.locator('#weapons-dialog').evaluate(n=>n.scrollTop=0);await capture(p,name+'-'+w.id+'-detail');
      await p.locator('[data-weapon-action=close]').click();
    }
    await p.reload();await p.waitForFunction(()=>window.KALISTAR_READY);
    const saved=await p.evaluate(()=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots);
    for(const {w,character} of equipped)assert.equal(saved[w.slot][character],w.id);
    await openEquipment(p,'castlevania-alucard-shield');await p.locator('[data-weapon-action=unequip]').click();
    await p.waitForFunction(()=>!KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.shield['alucard-castlevania']);await p.locator('[data-weapon-action=close]').click();
    await p.locator('[data-equipment-category=weapon]').click();assert.equal(await p.locator('.weapon-entry').count(),Q.catalogue.weapons.filter(w=>w.slot==='weapon').length);
    await p.locator('[data-equipment-category=all]').click();
    const E=createEngine(data),deckIds=deck(E,['49901802','49901402']);
    await p.evaluate(({deckIds,items})=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E);let team=T.fromPreset({name:'CV Kalistar QA',cards:deckIds});
      for(const id of ['castlevania-alucard-sword','castlevania-alucard-shield','kalistar-nerval-lantern']){
        const w=items.find(w=>w.id===id),c=KALISTAR_DATA.cards.find(c=>KalistarEquipment.compatible(w,c));team=T.equip(team,c.id,w.id);
      }
      localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(team));
    },{deckIds,items});
    await ready(p,'decks');
    for(const id of ['49901802','49901402']){
      await p.locator('[data-deck-slot][data-deck-preview="'+id+'"] [data-deck-action=detail]').click();await images(p);
      assert.equal(await p.locator('.eq-detail-overlay').count(),id==='49901802'?2:1);
      for(const node of await p.locator('.eq-detail-overlay').all())await geometry(node,motion);
      await capture(p,name+'-'+id+'-deck');await p.locator('#detail-dialog [data-action=close]').click();
    }
    for(const f of fixtures){
      await bind(p,f.inactive);await ready(p,'arena');await images(p);
      const overlay=p.locator('.slot[data-unit="'+f.uid+'"] .eq-overlay[data-weapon-id="'+f.id+'"]');
      if(f.slot==='relic')assert.equal(await overlay.count(),0);else{await overlay.waitFor();await geometry(overlay,motion,false);}
      await bind(p,f.state);await ready(p,'arena');await overlay.waitFor();await images(p);await p.waitForTimeout(700);
      assert.match(await overlay.locator('.eq-rim').getAttribute('src'),new RegExp(f.id+'-ring-v1.webp$'));
      const aligned=await geometry(overlay,motion);await capture(p,name+'-'+f.id+'-arena');
      await p.locator('.slot[data-unit="'+f.uid+'"] [data-action=detail]').click();await images(p);
      await geometry(p.locator('.eq-detail-overlay[data-weapon-id="'+f.id+'"]'),motion);
      if(['castlevania-alucard-sword','kalistar-vulkar-hammer','kalistar-nerval-lantern'].includes(f.id))await capture(p,name+'-'+f.id+'-inspection');
      await p.locator('#detail-dialog [data-action=close]').click();
      await p.setViewportSize({width:width+17,height:height-13});await p.waitForTimeout(200);await geometry(overlay,motion);await p.setViewportSize({width,height});
      await p.reload();await p.waitForFunction(()=>window.KALISTAR_READY);await overlay.waitFor();await images(p);await geometry(overlay,motion);
      if(f.slot==='relic'){await bind(p,f.expired);await ready(p,'arena');assert.equal(await overlay.count(),0,'consumed relic disappears');}
      results.push({name,id:f.id,side:f.side,geometry:aligned,equipReloadInspect:true});console.log('PASS '+name+' '+f.id);
    }
    await ready(p);assert.equal(await p.locator('.eq-overlay,.eq-use,.eq-transfer').count(),0);await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results'+(process.env.KALISTAR_QA_VIEWPORT?'-'+process.env.KALISTAR_QA_VIEWPORT:'')+'.json'),JSON.stringify({passed:true,results,errors},null,2)+'\n');
  console.log('PASS Castlevania / Kalistar '+results.length+' browser cases');
}
main().catch(async e=>{
  console.error(e);console.error('Browser errors:',errors);
  for(const context of browser?.contexts()||[])for(const page of context.pages()){
    console.error(await page.evaluate(()=>({url:location.href,text:document.body.innerText.slice(-2200)})).catch(()=>null));
    await page.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg'}).catch(()=>{});
  }
  process.exitCode=1;
}).finally(()=>browser?.close());
