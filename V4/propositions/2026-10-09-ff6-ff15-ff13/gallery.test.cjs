'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_gallery.cjs'))('playwright');
async function main(){
 const out=path.join(__dirname,'verification');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
 try{
  for(const width of [1600,900,412,390,320]){
   const page=await browser.newPage({viewport:{width,height:width<600?915:1050}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
   await page.locator('img').evaluateAll(images=>images.forEach(i=>i.loading='eager'));
   await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
   assert.equal(await page.locator('figure:visible').count(),29);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow at '+width);
   for(const [group,count] of [['FFVI',14],['FFXV',7],['FFXIII',8],['',29]]){
    await page.locator('#group').selectOption(group);
    assert.equal(await page.locator('figure:visible').count(),count);
    assert.equal(await page.locator('#count').textContent(),count+' illustrations');
   }
   assert.equal(await page.locator('.art').count(),29);
   if(width===1600||width===390)await page.screenshot({path:path.join(out,`gallery-${width}.png`),fullPage:false});
   if(width===390){
    await page.locator('#group').selectOption('FFXIII');
    await page.screenshot({path:path.join(out,'gallery-phone-ffxiii.png')});
   }
   assert.equal(errors.length,0);results.push({width,images:29,groups:{FFVI:14,FFXV:7,FFXIII:8},overflow:false,pageErrors:errors});await page.close();
  }
  fs.writeFileSync(path.join(out,'gallery.json'),JSON.stringify({passed:true,results},null,2)+'\n');console.log(JSON.stringify({passed:true,viewports:results.length,images:29}));
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
