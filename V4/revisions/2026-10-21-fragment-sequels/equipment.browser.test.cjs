'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../..'),dist=path.resolve(process.env.KALISTAR_DIST||path.join(root,'V4/deploy/dist'));
const out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(root,'work/qa/fragment-equipment'));
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'_fragment_art.cjs'))('playwright');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
async function main(){
  const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],missing=[],results=[];
  fs.mkdirSync(out,{recursive:true});
  try{
    const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!=='http://127.0.0.1:48104')return route.abort();
      const file=path.resolve(dist,'.'+decodeURIComponent(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
      if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)){missing.push(url.pathname);return route.fulfill({status:404,body:''});}
      return route.fulfill({status:200,body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:48104/jeu/#weapons');await page.waitForFunction(()=>window.KALISTAR_READY);
    for(const width of [1440,412,320])for(const id of ['kaylis-next-step-boots','kaylis-colours-ribbon']){
      await page.setViewportSize({width,height:1007});
      await page.evaluate(id=>{
        const item=KalistarWeapons.weapons.find(w=>w.id===id);
        document.querySelector('#app').innerHTML='<section class="weapons-page" style="padding:16px;min-height:0"><div class="weapon-card" style="max-width:1100px;width:100%;margin:auto">'+KalistarWeaponCards.markup(item,{cards:KALISTAR_DATA.cards,medallion:KalistarEquipmentFX.markup})+'</div></section>';
        lucide.createIcons();
      },id);
      await page.waitForFunction(()=>[...document.querySelectorAll('.weapon-card img')].every(img=>img.complete&&img.naturalWidth));
      await page.evaluate(()=>document.fonts.ready);
      const fields=await page.locator('.wc-title,.wc-lore,.wc-activation,.wc-power,.wc-bearers').evaluateAll(nodes=>nodes.map(n=>{
        const r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);const t=range.getBoundingClientRect();
        return {name:n.className,fits:t.left>=r.left-1&&t.right<=r.right+1&&t.top>=r.top-1&&t.bottom<=r.bottom+1};
      }));
      assert(fields.length>=4);assert(fields.every(f=>f.fits),JSON.stringify({id,width,fields}));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.locator('.weapon-card').screenshot({path:path.join(out,id+'-'+width+'.png')});
      results.push({id,width,fields});
    }
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,results},null,2));
    console.log('PASS Fragment equipment: six rendered cards, responsive text bounds and loaded media.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
