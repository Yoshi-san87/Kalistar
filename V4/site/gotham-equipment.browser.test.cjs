'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const Q=require('./equipment.js'),{activeFixture}=require('./fixtures/gotham-combat.cjs'),{openEquipment}=require('./equipment-browser-test-helpers.cjs');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__gotham_browser__.cjs'))('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist')),base='https://kalistar-gotham.invalid/Kalistar';
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-09-gotham-equipment/qa');
const items=Q.catalogue.weapons.filter(w=>w.id.startsWith('gotham-')),errors=[],results=[];let browser,nav=0;
const ready=async(p,view='weapons')=>{await p.goto(base+'/jeu/?gotham-qa='+ ++nav+'#'+view);await p.waitForFunction(()=>window.KALISTAR_READY);};
const images=p=>p.waitForFunction(()=>[...document.querySelectorAll('dialog[open] img,.eq-overlay img,.slot-card > img')].every(i=>!i.getBoundingClientRect().width||i.complete&&i.naturalWidth));
async function capture(p,name){await images(p);await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:88,animations:'disabled',mask:[p.locator('.ownership-banner small')]});}
async function bind(p,state){
  await p.evaluate(async s=>{
    const old=JSON.parse(localStorage.getItem('kalistar.v4.game')||'null');if(old&&!old.seed.startsWith('GOTHAM-QA-'))throw Error('Only QA saves may be replaced');
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
  fs.mkdirSync(out,{recursive:true});const data=JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8')),fixtures=items.map((w,i)=>activeFixture(data,w,i%2));
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height,motion]of [['desktop',1440,1000,'no-preference'],['razr50',412,1007,'no-preference'],['compact',320,740,'reduce']]){
    if(process.env.KALISTAR_QA_VIEWPORT&&process.env.KALISTAR_QA_VIEWPORT!==name)continue;
    const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,serviceWorkers:'block'});
    await context.route('**/*',async route=>{
      const u=new URL(route.request().url());if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/Kalistar/'))return route.abort();
      let relative=decodeURIComponent(u.pathname.slice('/Kalistar/'.length));if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),'Missing '+relative);
      const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-gotham-qa-only'):open.call(this,n+'-gotham-qa-only',v);};});
    const p=await context.newPage();p.on('pageerror',e=>errors.push(name+': '+e.message));p.on('response',r=>{if(r.status()>=400)errors.push(name+': '+r.status()+' '+r.url());});
    await ready(p);assert.equal(await p.locator('.weapon-entry').count(),Q.catalogue.weapons.length);
    for(const w of items){
      await openEquipment(p,w.id);await images(p);
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,w.id);
      const overflow=await p.locator('#weapons-dialog :is(.wc-title,.wc-rule-condition,.wc-rule-effect,.wc-flavour,.wc-activation,.wc-bearers)').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2).map(n=>n.className));assert.deepEqual(overflow,[],name+' '+w.id);
      const buttons=p.locator('#weapons-dialog [data-weapon-action=equip]');assert.equal(await buttons.count(),1);assert.equal(await buttons.getAttribute('data-character'),w.restrictions.characterIds[0]);
      await buttons.click();if(await p.locator('.weapon-confirm').isVisible())await p.locator('[data-weapon-action=confirm]').click();
      await p.waitForFunction(w=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots[w.slot][w.restrictions.characterIds[0]]===w.id,w);
      await p.locator('#weapons-dialog').evaluate(n=>n.scrollTop=0);await capture(p,name+'-'+w.id+'-detail');
      await p.locator('[data-weapon-action=close]').click();
    }
    await p.reload();await p.waitForFunction(()=>window.KALISTAR_READY);
    const saved=await p.evaluate(()=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots);
    for(const w of items)assert.equal(saved[w.slot][w.restrictions.characterIds[0]],w.id);
    await openEquipment(p,'gotham-cat-goggles');await p.locator('[data-weapon-action=unequip]').click();
    await p.waitForFunction(()=>!KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.shield['catwoman-batman']);await p.locator('[data-weapon-action=close]').click();
    await p.locator('[data-equipment-category=weapon]').click();assert.equal(await p.locator('.weapon-entry').count(),44);
    await p.locator('[data-equipment-category=all]').click();
    const deck=await p.evaluate(items=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),ids=Array.from({length:10},(_,i)=>String(49901501+i));
      let team=T.fromPreset({name:'Gotham QA',cards:ids});
      for(const w of items){const c=KALISTAR_DATA.cards.find(c=>KalistarEquipment.compatible(w,c));team=T.equip(team,c.id,w.id);}
      localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(team));return team;
    },items);
    await ready(p,'decks');
    for(const character of ['mr-freeze-batman','ras-al-ghul-batman','batman-batman']){
      const c=data.cards.find(c=>c.characterId===character),expected=items.filter(w=>w.restrictions.characterIds.includes(character));
      await p.locator('[data-deck-slot][data-deck-preview="'+c.id+'"] [data-deck-action=detail]').click();await images(p);
      assert.equal(await p.locator('.eq-detail-overlay').count(),expected.length);
      assert.equal(await p.locator('.eq-detail-overlay .eq-tab').count(),0);
      for(const w of expected)await geometry(p.locator('.eq-detail-overlay[data-weapon-id="'+w.id+'"]'),motion);
      await capture(p,name+'-'+character+'-deck');await p.locator('#detail-dialog [data-action=close]').click();
    }
    assert.equal(Object.values(deck.equipment).reduce((n,slot)=>n+Object.keys(slot).length,0),12);
    for(const f of fixtures){
      await bind(p,f.inactive);await ready(p,'arena');await images(p);
      const overlay=p.locator('.slot[data-unit="'+f.uid+'"] .eq-overlay[data-weapon-id="'+f.id+'"]');
      if(f.slot==='relic')assert.equal(await overlay.count(),0);else{await overlay.waitFor();await geometry(overlay,motion,false);}
      await bind(p,f.state);await ready(p,'arena');await overlay.waitFor();await images(p);await p.waitForTimeout(700);
      assert.equal(await overlay.getAttribute('data-slot'),f.slot);assert.match(await overlay.locator('.eq-rim').getAttribute('src'),new RegExp(f.id+'-ring-v1.webp$'));
      const aligned=await geometry(overlay,motion);
      assert.equal(await overlay.locator('.eq-tab').count(),f.slot==='relic'?1:0);
      await capture(p,name+'-'+f.id+'-arena');
      await p.locator('.slot[data-unit="'+f.uid+'"] [data-action=detail]').click();await images(p);
      const detail=p.locator('.eq-detail-overlay[data-weapon-id="'+f.id+'"]');await geometry(detail,motion);
      if(['gotham-freeze-gun','gotham-cryo-suit','gotham-utility-belt'].includes(f.id))await capture(p,name+'-'+f.id+'-inspection');
      await p.locator('#detail-dialog [data-action=close]').click();
      await p.setViewportSize({width:width+17,height:height-13});await p.waitForTimeout(200);await geometry(overlay,motion);await p.setViewportSize({width,height});
      await p.reload();await p.waitForFunction(()=>window.KALISTAR_READY);await overlay.waitFor();await images(p);await geometry(overlay,motion);
      if(f.slot==='relic'){await bind(p,f.expired);await ready(p,'arena');assert.equal(await overlay.count(),0,'consumed relic disappears');}
      results.push({name,id:f.id,side:f.side,geometry:aligned,equipReloadInspect:true});console.log('PASS '+name+' '+f.id);
    }
    await ready(p);assert.equal(await p.locator('.eq-overlay,.eq-use,.eq-transfer').count(),0);await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results'+(process.env.KALISTAR_QA_VIEWPORT?'-'+process.env.KALISTAR_QA_VIEWPORT:'')+'.json'),JSON.stringify({passed:true,results,errors},null,2)+'\n');console.log('PASS Gotham '+results.length+' browser cases');
}
main().catch(async e=>{
  console.error(e);console.error('Browser errors:',errors);
  for(const context of browser?.contexts()||[])for(const page of context.pages()){
    console.error(await page.evaluate(()=>({url:location.href,ready:window.KALISTAR_READY,text:document.body.innerText.slice(-3500)})).catch(()=>null));
    await page.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg',mask:[page.locator('.ownership-banner small')]}).catch(()=>{});
  }
  process.exitCode=1;
}).finally(()=>browser?.close());
