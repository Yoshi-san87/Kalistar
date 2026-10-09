'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_sf_gallery.cjs'))('playwright');
const sharp=createRequire(path.join(runtime,'_sf_gallery.cjs'))('sharp');
const manifest=require('./provenance.json'),edits=require('./background-edits.json').edits,out=path.join(__dirname,'verification','round-2');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 fs.mkdirSync(out,{recursive:true});const assets=[];
 for(const item of manifest.items){
  const file=path.join(__dirname,item.image),bytes=fs.readFileSync(file),edit=edits.find(e=>e.key===item.key),source=edit?edit.generated:item.source;
  assert.equal(sha(bytes),sha(fs.readFileSync(source)),item.key+' unchanged generated image');
  const m=await sharp(bytes).metadata();assert(m.width>=1000&&m.height>m.width,item.key+' portrait dimensions');
  assets.push({key:item.key,file:item.image,width:m.width,height:m.height,sha256:sha(bytes)});
 }
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,412,320]){
   await page.setViewportSize({width,height:960});await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
   assert.equal(await page.locator('figure').count(),manifest.items.length);
   for(const item of manifest.items){
    assert.equal(await page.locator('#'+item.key+' img').getAttribute('src'),item.image);
    assert.equal(await page.locator('#'+item.key+' a').getAttribute('href'),item.image);
   }
   await page.locator('img').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));
   await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
   await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
   for(const figure of await page.locator('figure').all())await figure.scrollIntoViewIfNeeded();
   await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow at '+width);
   const fits=await page.locator('figcaption').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1));assert(fits,'Captions fit '+width);
   const first=await page.locator('figure a').first().getAttribute('href');assert.equal(first,'images/ryu-v2.png');
   await page.screenshot({path:path.join(out,'gallery-'+width+'.png'),fullPage:width===1440});
   if(width===412)for(const key of ['chun-li','guile','vega','t-hawk']){
    await page.locator('#'+key).screenshot({path:path.join(out,key+'-phone.png')});
   }
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,images:assets,viewports:[1440,412,320],errors,approval:'Proposals only; user selection required before card production'},null,2));
  console.log('PASS: '+manifest.items.length+' unchanged generated portraits, current revisions linked, desktop/phone gallery, no overflow or script errors.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
