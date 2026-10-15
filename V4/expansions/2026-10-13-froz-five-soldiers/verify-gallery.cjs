'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_gallery.cjs'))('playwright');
async function main(){
 const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'gallery-proof');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>Array.from(document.images).length===5&&Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));
  for(const [name,width,height]of [['desktop',1440,1000],['mobile',412,915],['narrow',320,740]]){
   await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const images=await page.locator('figure img').evaluateAll(imgs=>imgs.map(i=>({width:i.naturalWidth,height:i.naturalHeight,fit:getComputedStyle(i).objectFit})));
   assert(images.every(i=>i.fit==='contain'));checks.push({name,width,height,images});
   await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,checks,errors},null,2)+'\n');
  console.log('PASS: five native cards, desktop/mobile/narrow gallery, no overflow or JS errors.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
