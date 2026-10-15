'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_cards.cjs'))('playwright');
async function main(){
 const out=path.join(__dirname,'qa/gallery');await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[],views=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  assert.equal(await page.locator('figure').count(),2);
  for(const width of [1440,412,320]){
   await page.setViewportSize({width,height:980});
   const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,loaded:[...document.images].every(i=>i.naturalWidth===897&&i.naturalHeight===1497),textFits:[...document.querySelectorAll('h1,h2,p,nav')].every(e=>e.scrollWidth<=e.clientWidth+1)}));
   assert.equal(result.width,result.scroll);assert(result.loaded&&result.textFits);views.push(result);
   await page.screenshot({path:path.join(out,'cards-'+width+'.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,views,errors},null,2));console.log('Gallery PASS');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
