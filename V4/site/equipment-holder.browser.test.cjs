'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const {openEquipment}=require('./equipment-browser-test-helpers.cjs');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__holder_qa__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const base=process.env.KALISTAR_URL||(built?'https://kalistar-qa.invalid/Kalistar':'http://127.0.0.1:4304');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-08-equipment-holder/qa');
const results=[],errors=[];let browser;

async function ready(page){
  await page.waitForFunction(()=>window.KALISTAR_READY);
  await page.evaluate(()=>document.fonts.ready);
}
async function capture(page,name){
  await page.locator('#weapons-dialog').evaluate(n=>n.scrollTop=0);
  await page.waitForFunction(()=>[...document.querySelectorAll('#weapons-dialog[open] img')].every(i=>i.complete&&i.naturalWidth));
  await page.locator('#weapons-dialog .weapon-card').screenshot({path:path.join(out,name+'.png')});
}
async function geometry(page,selector){
  const records=await page.locator(selector).evaluateAll(nodes=>nodes.map(surface=>{
    const rect=n=>n.getBoundingClientRect(),card=rect(surface),holder=rect(surface.querySelector('.wc-holder')),bonus=rect(surface.querySelector('.wc-power')),band=rect(surface.querySelector('.wc-bearers')),lore=rect(surface.querySelector('.wc-flavour')),label=surface.querySelector('.wc-bearers b'),text=rect(label);
    const hit=surface.closest('.weapon-card').querySelector('.weapon-holder-action'),action=hit?rect(hit):null;
    return {id:surface.dataset.weaponCard,left:(holder.left-card.left)/card.width,top:(holder.top-card.top)/card.height,
      inside:holder.left>=card.left&&holder.bottom<=card.bottom,
      separate:holder.right<bonus.left&&holder.right<band.left,
      centered:Math.abs(band.left+band.width/2-lore.left-lore.width/2)<1&&Math.abs(text.left+text.width/2-band.left-band.width/2)<1,
      fits:text.left>=band.left-1&&text.right<=band.right+1&&text.top>=band.top-1&&text.bottom<=band.bottom+1&&label.scrollWidth<=label.clientWidth+1,
      hit:!action||Math.abs(action.left-holder.left)<1&&Math.abs(action.top-holder.top)<1&&action.right<bonus.left};
  }));
  assert(records.length);
  for(const row of records){
    assert(Math.abs(row.left-(90-28)/1425)<.001,JSON.stringify(row));
    assert(Math.abs(row.top-(746-64)/916)<.001,JSON.stringify(row));
    assert(row.inside&&row.separate&&row.centered&&row.fits&&row.hit,JSON.stringify(row));
  }
  return records;
}
async function close(page){
  await page.locator('#weapons-dialog [data-weapon-action=close]').click();
  await page.waitForFunction(()=>!document.querySelector('#weapons-dialog').open);
}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height]of [['desktop',1440,1000],['wide',1920,1080],['tablet',1024,768],['razr50',412,1007],['compact',320,568],['landscape',844,390]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:name==='compact'?'reduce':'no-preference',serviceWorkers:'block'});
    if(built)await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!==new URL(base).origin||!url.pathname.startsWith('/Kalistar/'))return route.abort();
      let rel=decodeURIComponent(url.pathname.slice('/Kalistar/'.length));if(rel.endsWith('/'))rel+='index.html';
      const file=path.resolve(dist,rel);if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))throw Error('Missing built resource: '+rel);
      const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      await route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-holder-qa'):open.call(this,n+'-holder-qa',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
    await page.goto(base+'/jeu/#weapons');await ready(page);
    await page.locator('.weapons-page [data-weapon-holder=little-joys-flute]').click();
    await page.waitForFunction(()=>document.querySelector('#weapons-dialog').open);
    assert(await page.locator('[data-weapon-action=equip][data-character=momo]').isVisible());
    await geometry(page,'#weapons-dialog .wc-surface');await capture(page,name+'-empty');
    await page.locator('[data-weapon-action=equip][data-character=momo]').click();
    await page.waitForFunction(()=>document.querySelector('#weapons-dialog .wc-holder.is-filled img')?.alt==='MOMO');
    await geometry(page,'#weapons-dialog .wc-surface');await capture(page,name+'-momo');await close(page);
    await page.reload();await ready(page);
    assert.equal(await page.locator('.weapons-page [data-weapon=little-joys-flute] .wc-holder img').getAttribute('alt'),'MOMO');
    await page.locator('.weapons-page [data-weapon-holder=little-joys-flute]').click();
    await page.locator('[data-weapon-action=unequip][data-character=momo]').click();
    await page.waitForFunction(()=>document.querySelector('#weapons-dialog .wc-holder.is-empty'));await close(page);
    for(const id of ['socom','wardens-spear','commanders-sabre']){
      await openEquipment(page,id);await geometry(page,'#weapons-dialog .wc-surface');await capture(page,name+'-'+id);await close(page);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    if(name==='desktop'){
      // Exercise every printed bearer label at thumbnail, phone, modal and export sizes.
      for(const size of [190,310,570,1000]){
        await page.evaluate(size=>{
          const root=document.createElement('div');root.id='holder-qa';root.style.cssText='position:fixed;left:0;top:0;z-index:9999;width:'+size+'px';
          root.innerHTML=KalistarWeapons.weapons.map(w=>'<div class="weapon-card">'+KalistarWeaponCards.markup(w,{cards:KALISTAR_DATA.cards})+'</div>').join('');
          document.body.append(root);
        },size);
        const samples=await geometry(page,'#holder-qa .wc-surface');
        results.push({label:'all labels at '+size,count:samples.length});
        await page.locator('#holder-qa').evaluate(n=>n.remove());
      }
    }
    results.push({name,passed:true});console.log(name+' PASS');await context.close();
  }
  assert.deepEqual(errors,[]);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:!process.exitCode,results,errors},null,2));await browser?.close();});
