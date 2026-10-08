'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_ff9-gallery.cjs'))('playwright');
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true}),out=path.join(__dirname,'gallery-proof');
 fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  assert.equal(await page.locator('figure').count(),22);
  for(const file of ['04-dagga-02.png','18-cina-02.png','02-vivi-cryo-02.png','02-vivi-electro-02.png'])assert.equal(await page.locator('img[src="'+file+'"]').count(),1);
  for(const width of [1440,412,320]){
   await page.setViewportSize({width,height:900});
   await page.locator('#group').selectOption('Heritiers');
   assert.equal(await page.locator('figure:visible').count(),11);
   await page.locator('#group').selectOption('');
   await page.evaluate(async()=>{for(const i of document.images){i.loading='eager';await i.decode();}});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert(await page.evaluate(()=>[...document.images].every(i=>i.naturalWidth>700&&i.naturalHeight>900)));
   await page.screenshot({path:path.join(out,'gallery-'+width+'.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,images:22,widths:[1440,412,320],errors},null,2)+'\n');
  console.log('PASS: FF9 illustration gallery, corrected sources, filters and three widths');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
