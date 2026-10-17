'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_nestown.cjs'))('playwright');
const qa=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../../work/qa/nestown-native');
(async()=>{
 fs.mkdirSync(qa,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],results=[];
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  assert.equal(await page.locator('figure').count(),4);
  for(const width of [1920,1440,800,412,320]){
   await page.setViewportSize({width,height:width<500?1007:1100});
   const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,images:[...document.images].map(i=>({natural:[i.naturalWidth,i.naturalHeight],left:i.getBoundingClientRect().left,right:i.getBoundingClientRect().right}))}));
   assert(result.scroll<=width);assert(result.images.every(i=>i.natural[0]===897&&i.natural[1]===1497&&i.left>=0&&i.right<=width));results.push(result);
   if([1440,412].includes(width))await page.screenshot({path:path.join(qa,width===1440?'desktop.png':'razr50.png'),fullPage:true});
  }
  for(const link of await page.locator('figure a').all()){
   const href=await link.getAttribute('href');assert(fs.existsSync(path.join(__dirname,href)),href);
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(qa,'results.json'),JSON.stringify({passed:true,results},null,2));
  console.log('PASS Nestown: four native cards, 1920/1440/800/412/320, before/current source links');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
