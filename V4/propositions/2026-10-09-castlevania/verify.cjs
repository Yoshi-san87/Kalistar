'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const requireRuntime=createRequire(path.join(runtime,'_cv_gallery.cjs')),sharp=requireRuntime('sharp'),{chromium}=requireRuntime('playwright'),manifest=require('./final-prompts.json');
async function main(){
 const dir=path.join(__dirname,'verification-with-blood');fs.mkdirSync(dir,{recursive:true});const assets=[];
 for(const c of manifest.items){const p=path.join(__dirname,c.file),b=fs.readFileSync(p),m=await sharp(b).metadata();assert(m.width>=1000&&m.height>m.width);assert(b.equals(fs.readFileSync(c.generatedSource)));assets.push({key:c.key,file:c.file,width:m.width,height:m.height,sha256:crypto.createHash('sha256').update(b).digest('hex')});}
 const blood=require('../../expansions/2026-10-10-castlevania/asset-provenance.json').blood;
 const bloodBytes=fs.readFileSync(path.join(__dirname,'images/dracula-sang.png')),bloodMeta=await sharp(bloodBytes).metadata();
 assert(bloodBytes.equals(fs.readFileSync(blood.generated)));assert(bloodMeta.width>=1000&&bloodMeta.height>bloodMeta.width);
 assets.push({key:'dracula-sang',file:'images/dracula-sang.png',width:bloodMeta.width,height:bloodMeta.height,sha256:crypto.createHash('sha256').update(bloodBytes).digest('hex')});
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));assert.equal(await page.locator('figure').count(),9);
 for(const [label,width,height]of [['desktop',1440,1000],['phone',412,915],['narrow',320,740]]){await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(dir,label+'.png')});}
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({passed:true,assets,viewports:[1440,412,320],errors},null,2)+'\n');console.log('PASS: 8 approved originals preserved, 9-illustration gallery, desktop/phone/narrow');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
