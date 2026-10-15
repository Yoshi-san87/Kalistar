'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_chrono-gallery.cjs'))('playwright');
async function main(){
 const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'gallery-proof');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  await page.waitForFunction(()=>document.fonts.status==='loaded'&&[...document.images].every(i=>i.complete&&i.naturalWidth===897&&i.naturalHeight===1497));
  assert.equal(await page.locator('figure').count(),7);
  for(const [name,width,height]of [['desktop',1440,1000],['phone',412,915],['narrow',320,740]]){
   await page.setViewportSize({width,height});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   for(const box of await page.locator('figure').evaluateAll(nodes=>nodes.map(f=>({image:f.querySelector('a').getBoundingClientRect().bottom,text:f.querySelector('figcaption').getBoundingClientRect().top}))))assert(box.text>=box.image);
   await page.screenshot({path:path.join(out,name+'.png'),fullPage:name==='desktop'});
  }
  const popupPromise=page.waitForEvent('popup');await page.locator('#crono a').click();const popup=await popupPromise;await popup.waitForLoadState();assert(popup.url().endsWith('/cards/crono/card.png'));await popup.close();
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,cards:7,viewports:[1440,412,320],fullSizeLink:true,errors},null,2)+'\n');
  console.log('PASS native gallery: seven cards, 3 viewports, full-size image');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
