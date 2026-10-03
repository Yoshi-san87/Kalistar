'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__weapon_backgrounds__.cjs'))('playwright');
const base=process.env.KALISTAR_URL||'http://127.0.0.1:4304',out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-04-weapon-scenes/details');
let browser;const errors=[],results=[];
async function ready(page){await page.waitForFunction(()=>[...document.querySelectorAll('.weapon-card img')].every(i=>i.complete&&i.naturalWidth));await page.evaluate(()=>document.fonts.ready);}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height,motion]of [['desktop',1440,1000,'no-preference'],['razr50',412,1007,'no-preference'],['compact',320,650,'reduce']]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,serviceWorkers:'block'});
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return open.call(this,n+'-background-qa-only',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/jeu/#weapons');await page.waitForFunction(()=>window.KALISTAR_READY);await ready(page);
    for(const id of ['white-oath-rapier','brotherhood','post-bow','socom','violet-reaping','lulu-mog','kaine-saw']){
      await page.locator('.weapons-page [data-weapon="'+id+'"]').click();await ready(page);
      const card=page.locator('#weapons-dialog .wc-surface');
      assert.equal(await card.locator('.wc-art-background').count(),0);
      const samples=await card.locator('.wc-art-main,.wc-art-background').evaluateAll(nodes=>nodes.map(n=>({src:n.src,filter:getComputedStyle(n).filter,fit:getComputedStyle(n).objectFit})));
      assert.equal(samples.length,1);assert.equal(samples[0].fit,'cover');assert.equal(samples[0].filter,'none');
      assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)));
      await page.screenshot({path:path.join(out,name+'-'+id+'.png')});
      await card.screenshot({path:path.join(out,name+'-'+id+'-card.png')});
      results.push({name,id,samples});await page.locator('[data-weapon-action=close]').click();
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,results,errors},null,2));console.log({passed:true,checks:results.length,out});
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
