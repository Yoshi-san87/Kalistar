'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_octopath.cjs'))('playwright');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../../work/qa/octopath-traveler/gallery');
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  assert.equal(await page.locator('.card img').count(),16);assert.equal(await page.locator('h1').innerText(),'Octopath Traveler I & II');
  const views=[];
  for(const [name,width,height]of [['desktop',1440,1100],['razr50',412,915],['narrow',320,740]]){
   await page.setViewportSize({width,height});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert(await page.locator('.card img').evaluateAll(imgs=>imgs.every(i=>i.naturalWidth===897&&i.naturalHeight===1497)));
   await page.screenshot({path:path.join(out,name+'.png'),fullPage:name==='desktop'});
   await page.locator('#hikari').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,name+'-hikari.png')});
   await page.evaluate(()=>scrollTo(0,0));views.push({name,width,height});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.card').first().focus();
  assert(await page.locator('.card').first().evaluate(e=>e===document.activeElement));
  for(const a of await page.locator('a').all()){const href=await a.getAttribute('href');if(!href.startsWith('#'))assert(fs.existsSync(path.resolve(__dirname,href)),href);}
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,views,cards:16,errors},null,2));
  console.log('PASS: Octopath gallery desktop, Razr, 320px; native images, links and focus.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
