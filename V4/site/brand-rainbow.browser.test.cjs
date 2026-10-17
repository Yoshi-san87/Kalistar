'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),dist=path.resolve(process.env.KALISTAR_DIST||path.join(root,'V4/deploy/dist'));
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_brand_qa.cjs'));
const {chromium}=runtime('playwright'),output=process.env.KALISTAR_VERIFICATION_DIR||path.join(root,'work/qa/rainbow-brand');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    for(const profile of [{name:'desktop',width:1440,height:1000},{name:'razr',width:412,height:1007,mobile:true}]){
      const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:!!profile.mobile,hasTouch:!!profile.mobile,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await context.route('https://kalistar-brand-qa.invalid/**',route=>{
        const relative=decodeURIComponent(new URL(route.request().url()).pathname).slice(1),file=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative);
        assert(file.startsWith(dist+path.sep));return fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}):route.fulfill({status:404,body:'Missing QA asset'});
      });
      await page.goto('https://kalistar-brand-qa.invalid/jeu/login.html');
      await page.waitForFunction(()=>[...document.querySelectorAll('.login-brand,.login-seal img')].every(i=>i.complete&&i.naturalWidth>0));
      assert((await page.locator('.login-seal img').getAttribute('src')).includes('rainbow-v2'));
      await page.screenshot({path:path.join(output,profile.name+'-login.png')});
      await page.goto('https://kalistar-brand-qa.invalid/jeu/#home');
      await page.waitForFunction(()=>window.KALISTAR_READY&&document.querySelector('.home-heading img')?.complete);
      assert.equal(await page.locator('.home-heading img').evaluate(i=>i.naturalWidth),1000);
      assert.equal(await page.locator('.brand img').evaluate(i=>i.naturalWidth),1000);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(output,profile.name+'-home.png')});
      await page.goto(pathToFileURL(path.join(root,'V4/propositions/2026-10-17-card-backs/index.html')).href);
      await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('.preview').count(),5);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(output,profile.name+'-proposals.png'),fullPage:true});
      await page.locator('.preview').nth(4).click();assert.equal(await page.locator('dialog').evaluate(d=>d.open),true);
      await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);
      assert.deepEqual(errors,[]);await context.close();
    }
    console.log('PASS rainbow brand PC/Razr: login, home, five proposals, expansion, keyboard, no overflow.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
