'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const W=require('./weapons.js'),{openEquipment}=require('./equipment-browser-test-helpers.cjs');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__protection_browser__.cjs'))('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/protection-layout'));
const base='https://kalistar-protection-qa.invalid/Kalistar',errors=[],results=[];
const shields=W.weapons.filter(w=>W.kind(w)==='shield');
let browser;
async function images(page){
  await page.waitForFunction(()=>[...document.querySelectorAll('dialog[open] img,.weapon-entry:not([hidden]) img')].every(i=>!i.getBoundingClientRect().width||i.complete&&i.naturalWidth));
}
async function geometry(surface,kind){
  const result=await surface.evaluate(n=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const get=s=>rect(n.querySelector(s)),holder=n.closest('.weapon-card').querySelector('.weapon-holder-action');
    const overflow=[...n.querySelectorAll('.wc-title,.wc-flavour,.wc-activation,.wc-bearers')].filter(e=>e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2).map(e=>e.className);
    return {surface:rect(n),art:get('.wc-art'),activation:get('.wc-activation'),bearers:get('.wc-bearers'),lore:get('.wc-flavour'),medallion:get('.wc-medallion'),power:get('.wc-power'),holder:get('.wc-holder'),button:rect(holder),overflow,
      frame:getComputedStyle(n.querySelector('.wc-frame-clip')).transform,
      upright:[...n.querySelectorAll('.wc-art-main,.wc-title,.wc-holder img,.wc-medallion')].every(e=>getComputedStyle(e).transform==='none'),
      alignment:getComputedStyle(n.querySelector('.wc-activation')).textAlign};
  });
  const r=result;
  if(kind==='shield'){
    assert(r.art.left>r.activation.right,'protection illustration must be on the right');
    assert(r.medallion.left>r.surface.left+r.surface.width/2);
    assert(r.holder.left>r.power.right,'holder must not cover bonus');
    assert.equal(r.frame,'matrix(-1, 0, 0, 1, 0, 0)');
  }else{
    assert(r.art.right<r.activation.left,'other categories keep illustration on the left');
    assert.equal(r.frame,'none');
  }
  assert(r.upright,'art, text, medallion and bearer must stay upright');
  assert.equal(r.alignment,'left');
  assert(Math.abs(r.bearers.left-r.lore.left)<1&&Math.abs(r.bearers.width-r.lore.width)<1);
  assert(Math.abs(r.button.left-r.holder.left)<1&&Math.abs(r.button.top-r.holder.top)<1,'interactive holder follows the image');
  assert(r.button.width+1>=r.holder.width&&r.button.height+1>=r.holder.height);
  assert.deepEqual(r.overflow,[]);
  return r;
}
async function capture(page,name){
  await images(page);await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:86,animations:'disabled',mask:[page.locator('.ownership-banner small')]});
}
async function main(){
  fs.mkdirSync(out,{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height,motion]of [['desktop',1440,1000,'no-preference'],['razr50',412,1007,'no-preference'],['compact',320,740,'reduce']]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,serviceWorkers:'block'});
    await context.route('**/*',async route=>{
      const u=new URL(route.request().url());if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/Kalistar/'))return route.abort();
      let rel=decodeURIComponent(u.pathname.slice('/Kalistar/'.length));if(rel.endsWith('/'))rel+='index.html';
      const file=path.resolve(dist,rel);assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),'Missing '+rel);
      const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-protection-qa-only'):open.call(this,n+'-protection-qa-only',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
    await page.goto(base+'/jeu/#weapons');await page.waitForFunction(()=>window.KALISTAR_READY);
    await page.locator('[data-equipment-category=shield]').click();await images(page);
    await capture(page,name+'-collection');
    const checked=[];
    for(const w of shields){
      await openEquipment(page,w.id);await images(page);
      const r=await geometry(page.locator('#weapons-dialog .wc-surface'),'shield');
      assert.equal(await page.locator('#weapons-dialog .wc-title').innerText(),w.name.toUpperCase());
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      if(w.id==='durane-rampart')await capture(page,name+'-durane-detail');
      checked.push({id:w.id,overflow:r.overflow});
      await page.locator('[data-weapon-action=close]').click();
    }
    await openEquipment(page,'durane-rampart');
    const action=page.locator('#weapons-dialog [data-weapon-action=equip]').first(),character=await action.getAttribute('data-character');
    await action.click();
    await page.waitForFunction(id=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.shield[id]==='durane-rampart',character);
    await images(page);await geometry(page.locator('#weapons-dialog .wc-surface'),'shield');
    await page.locator('#weapons-dialog .wc-holder.is-filled').waitFor();
    await capture(page,name+'-equipped');
    await page.locator('[data-weapon-action=close]').click();
    // Use the actual thumbnail hit target, not the full card opener.
    await page.locator('.weapons-page [data-weapon-holder="durane-rampart"]').click();
    await page.locator('#weapons-dialog[open]').waitFor();await geometry(page.locator('#weapons-dialog .wc-surface'),'shield');
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    await openEquipment(page,'durane-rampart');
    assert.equal(await page.evaluate(id=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.shield[id],character),'durane-rampart');
    await page.setViewportSize({width:width+24,height:height-24});await page.waitForTimeout(250);
    await geometry(page.locator('#weapons-dialog .wc-surface'),'shield');await page.setViewportSize({width,height});await page.waitForTimeout(250);
    await page.locator('#weapons-dialog [data-weapon-action=unequip]').click();
    await page.waitForFunction(id=>!KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.shield[id],character);
    await page.locator('[data-weapon-action=close]').click();
    for(const id of ['fallen-king-axe','pod-042']){
      await page.locator('[data-equipment-category=all]').click();await openEquipment(page,id);await images(page);
      await geometry(page.locator('#weapons-dialog .wc-surface'),W.kind(W.weapons.find(w=>w.id===id)));
      await page.locator('[data-weapon-action=close]').click();
    }
    results.push({viewport:name,width,height,motion,protections:checked,equipReloadRemove:true,holderClick:true,resize:true,otherCategories:true});
    console.log('PASS '+name+': '+checked.length+' protections, equip/reload/remove, holder, resize, unchanged weapon/relic');
    await context.close();
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,results,errors},null,2)+'\n');
}
main().catch(async error=>{console.error(error);for(const c of browser?.contexts()||[])for(const p of c.pages())await p.screenshot({path:path.join(out,'failure.jpg')}).catch(()=>{});process.exitCode=1;}).finally(()=>browser?.close());
