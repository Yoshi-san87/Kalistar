'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_rename_qa.cjs'))('playwright');
const dist=process.env.KALISTAR_DIST;assert(dist);
const home=__dirname,out=path.join(home,process.env.KALISTAR_PAGES_URL?'public-browser-proof':'browser-proof');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
async function main(){
 const server=http.createServer((req,res)=>{try{
  const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname).replace(/^\/Kalistar\//,'');
  assert(!name.includes('..'));const f=path.resolve(dist,name.endsWith('/')?name+'index.html':name);
  assert(f.startsWith(path.resolve(dist)+path.sep));res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));
 }catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],failures=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
  const base=process.env.KALISTAR_PAGES_URL||'http://127.0.0.1:'+server.address().port+'/Kalistar/';
  await page.goto(base+'jeu/?rename469='+Date.now()+'#collection');await page.waitForFunction(()=>window.KALISTAR_READY);
  const card=await page.evaluate(()=>KALISTAR_DATA.cards.find(c=>c.id==='49901503'));
  assert.equal(card.name,"L'HOMME MYST\u00c8RE");assert.equal(card.characterId,'sphinx-batman');
  assert.equal(await page.title(),'Kalistar V4.6.9 \u00b7 Collection, Decks et Ar\u00e8ne');
  const screens=[];
  for(const [label,width,height]of [['desktop',1440,1000],['razr50',412,915],['narrow',320,740]]){
   await page.setViewportSize({width,height});
   await page.locator('.cb-collection-select select').selectOption('batman');
   await page.locator('[data-binder-field=search]').fill('homme mystere');
   assert.equal(await page.locator('.cb-card[data-id="49901503"]').count(),1);
   await page.locator('.cb-card[data-id="49901503"]').click();await page.locator('.cb-reader').waitFor();
   const pane=page.locator('[data-binder-action=pane][data-id=visual]');if(await pane.isVisible())await pane.click();
   await page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0));
   await page.waitForFunction(()=>{const i=document.querySelector('.cb-hero-image');return i&&i.complete&&i.naturalWidth===797&&i.naturalHeight===1388;});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const image=label+'-homme-mystere.png';await page.screenshot({path:path.join(out,image)});screens.push(image);
   await page.locator('[data-binder-action=back]').click();
  }
  await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
  assert.equal(await page.evaluate(()=>KALISTAR_DATA.cards.find(c=>c.id==='49901503').name),card.name);
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,base,version:'4.6.9',cardId:card.id,characterId:card.characterId,name:card.name,screens,viewports:[1440,412,320],reload:true,errors,failures},null,2)+'\n');
  console.log('PASS: renamed card reader and unaccented search on desktop, Razr 50, narrow mobile and reload');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
