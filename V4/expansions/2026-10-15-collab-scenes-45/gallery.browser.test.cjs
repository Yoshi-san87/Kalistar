'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{createRequire}=require('node:module'),set=require('./set.json');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_cards.cjs'))('playwright');
async function main(){
 const out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../../work/qa/collab-scenes-45/gallery');await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  assert.equal(await page.locator('figure').count(),45);
  for(const width of [1920,1440,412,320]){
   await page.setViewportSize({width,height:915});
   const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,loaded:[...document.images].every(i=>i.naturalWidth===300&&i.naturalHeight>490),textFits:[...document.querySelectorAll('h1,h2,p,label')].every(e=>e.scrollWidth<=e.clientWidth+1)}));
   assert.equal(result.width,result.scroll);assert(result.loaded&&result.textFits);views.push(result);
   await page.screenshot({path:path.join(out,'cards-'+width+'.png')});
  }
  for(const faction of new Set(set.cards.map(c=>c.faction))){
   await page.locator('#faction').selectOption(faction);assert.equal(await page.locator('figure:visible').count(),set.cards.filter(c=>c.faction===faction).length);
  }
  await page.locator('#faction').selectOption('');await page.locator('#search').fill('dracula');
  assert.equal(await page.locator('figure:visible').count(),1);await page.screenshot({path:path.join(out,'dracula-phone.png')});
  await page.locator('#search').fill('aucun-personnage');assert(await page.locator('#empty').isVisible());
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,views,cards:45,filters:true,errors},null,2));console.log('Gallery PASS');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
