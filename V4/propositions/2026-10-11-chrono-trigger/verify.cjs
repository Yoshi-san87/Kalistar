'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const dependency=createRequire(path.join(runtime,'_chrono-gallery.cjs'));
const sharp=dependency('sharp'),{chromium}=dependency('playwright'),manifest=require('./final-prompts.json');
async function main(){
  const dir=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'verification');fs.mkdirSync(dir,{recursive:true});const assets=[];
  assert.equal(manifest.items.length,7);
  for(const item of manifest.items){
    const source=path.join(__dirname,item.file),bytes=fs.readFileSync(source),meta=await sharp(bytes).metadata();
    assert(meta.width>=1000&&meta.height>meta.width);assert(bytes.equals(fs.readFileSync(item.generatedSource)));
    if(item.initialFile)assert(fs.readFileSync(path.join(__dirname,item.initialFile)).equals(fs.readFileSync(item.initialGeneratedSource)));
    if(item.hairRevision)assert(fs.readFileSync(path.join(__dirname,item.hairRevision.input)).equals(fs.readFileSync(item.hairRevision.generatedSource)));
    assets.push({key:item.key,file:item.file,width:meta.width,height:meta.height,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
    await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
    assert.equal(await page.locator('figure').count(),7);
    for(const [label,width,height]of [['desktop',1440,1000],['phone',412,915],['narrow',320,740]]){
      await page.setViewportSize({width,height});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      const bounds=await page.locator('figure').evaluateAll(items=>items.map(f=>{const b=f.getBoundingClientRect();const a=f.querySelector('a').getBoundingClientRect();const c=f.querySelector('figcaption').getBoundingClientRect();return {left:b.left,right:b.right,imageBottom:a.bottom,textTop:c.top};}));
      for(const b of bounds){assert(b.left>=0&&b.right<=width+1);assert(b.textTop>=b.imageBottom);}
      await page.screenshot({path:path.join(dir,label+'.png')});
    }
    await page.setViewportSize({width:1440,height:1000});
    const popupPromise=page.waitForEvent('popup');await page.locator('figure#magus a').click();const popup=await popupPromise;
    await popup.waitForLoadState();assert(popup.url().endsWith('/images/magus.png'));await popup.close();
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({passed:true,scope:'illustrations-only',assets,viewports:[1440,412,320],originalsPreserved:true,imageLink:true,errors},null,2)+'\n');
    console.log('PASS: 7 originals, 3 preserved revision inputs, desktop/phone/320px gallery and full image link.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
