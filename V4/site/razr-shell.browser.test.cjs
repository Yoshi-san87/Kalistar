'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__razr_shell_qa__.cjs'));
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-11-razr-experience/qa/local');
const base=process.env.KALISTAR_URL||'https://kalistar-qa.invalid/Kalistar/jeu/';
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),checks=[];
  try{
    for(const profile of [{name:'razr',width:412,height:1007,mobile:true},{name:'compact',width:320,height:740,mobile:true,reduced:true},{name:'landscape',width:844,height:390,mobile:true},{name:'razr-landscape',width:1007,height:412,mobile:true},{name:'desktop',width:1440,height:1000,mobile:false}]){
      const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:profile.mobile,hasTouch:profile.mobile,serviceWorkers:'block',reducedMotion:profile.reduced?'reduce':'no-preference'});
      if(!process.env.KALISTAR_URL)await context.route('https://kalistar-qa.invalid/**',route=>{
        const relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative);
        assert(file.startsWith(dist+path.sep),'QA asset stays inside the built site');
        if(!fs.existsSync(file))return route.fulfill({status:404,body:'Missing QA asset '+relative});
        return route.fulfill({body:fs.readFileSync(file),contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});
      });
      await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-razr-shell-qa-only',version);};});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
      await page.goto(base+(profile.mobile?'':'#home'));await page.waitForSelector('.kalistar-home');
      const tap=async selector=>profile.mobile?page.locator(selector).tap():page.locator(selector).click();
      await page.waitForFunction(()=>document.querySelector('.home-card img')?.naturalWidth>0);await page.waitForTimeout(profile.reduced?100:1800);
      if(profile.mobile)assert.deepEqual(await page.locator('.main-nav button:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.view||'more')),['home','decks','arena','statistics','more']);
      assert.equal(await page.locator('.home-portals>button').count(),4);
      assert(await page.locator('.home-portals>button').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44)));
      const first=await page.locator('.home-card').getAttribute('data-home-detail');await tap('[data-home-control=next]');
      assert.notEqual(await page.locator('.home-card').getAttribute('data-home-detail'),first);assert.equal(await page.locator('[data-home-control=pause]').getAttribute('aria-pressed'),'true');
      await page.waitForTimeout(profile.reduced?100:1800);
      await page.screenshot({path:path.join(output,profile.name+'-home.jpg'),type:'jpeg',quality:84});
      await tap('[data-home-category=shield]');await page.waitForSelector('.weapons-page');
      assert.equal(await page.locator('[data-equipment-category=shield]').getAttribute('aria-pressed'),'true');
      assert(await page.locator('.weapon-open').evaluateAll(nodes=>nodes.every(n=>KalistarEquipment.catalogue.weapons.find(w=>w.id===n.dataset.weapon).slot==='shield')));
      await tap('.main-nav [data-view=decks]');await page.waitForSelector('.team-page');await page.waitForTimeout(900);
      assert.equal(await page.locator('.kalistar-page-crossing').count(),0);
      if(profile.mobile){
        await tap('.main-nav [data-view=statistics]');await page.waitForSelector('.statistics-sheet');
        await tap('.nav-more');await page.waitForSelector('#mobile-dialog[open]');
        assert.equal(await page.locator('#mobile-dialog [data-view=story]').count(),1);
        assert.equal(await page.locator('#mobile-dialog [data-view=statistics]').count(),0);
        await tap('#mobile-dialog [data-view=story]');await page.waitForSelector('.story-library');
        await tap('.nav-home');await page.waitForSelector('.kalistar-home');
        assert.equal(await page.locator('#mobile-dialog[open]').count(),0);
      }
      assert.deepEqual(errors,[]);checks.push({profile:profile.name,passed:true});await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,checks},null,2)+'\n');console.log(JSON.stringify({passed:true,checks}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
