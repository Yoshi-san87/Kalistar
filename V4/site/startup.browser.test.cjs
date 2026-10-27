'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_startup_qa.cjs'));
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/performance-20261020/startup'));
const base='https://kalistar-startup-qa.invalid/jeu/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4'};
// Deterministic conflict transport; real cloud sync/Worker coverage lives in
// login.browser.test.cjs. No personal credentials or remote data are used here.
const conflictFixture=`
if(sessionStorage.getItem('startup-conflict')){
  window.KALISTAR_CLOUD_ACCESS={localProfile:'user-paris',label:'QA'};
  KalistarCloudPlayer.connect=async({data})=>({db:await KalistarLocalDB.open(data),prefix:'kalistar.v4.',
    userId:'00000000-0000-0000-0000-000000000001',client:{},scopedStorage:localStorage,onChanged(){},notice:'QA notice'});
  KalistarCloudSync.create=()=>({start:async()=>{},changed:async()=>{},destroy(){},
    snapshot:()=>({status:'conflict',canWrite:false,revision:3,cloudUpdatedAt:'2026-10-20T00:00:00Z'}),subscribe:()=>()=>{}});
}
`;
async function routeSite(context,{missing='',slow=null}={}){
  await context.route('https://kalistar-startup-qa.invalid/**',async route=>{
    const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
    if(missing&&pathname.endsWith('/'+missing))return route.fulfill({status:404,body:'QA missing module'});
    if(pathname.endsWith('/catalogue.json')&&slow)await slow;
    let file=path.resolve(dist,'.'+pathname+(pathname.endsWith('/')?'index.html':''));assert(file.startsWith(dist+path.sep));
    if(process.env.KALISTAR_TEST_SOURCE==='1'&&pathname.startsWith('/jeu/')&&/\.(js|css)$/.test(pathname)){
      const source=path.join(__dirname,pathname.slice(5));if(fs.existsSync(source))file=source;
    }
    let body;
    if(process.env.KALISTAR_TEST_SOURCE==='1'&&pathname==='/jeu/')body=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('data-hosting="local"','data-hosting="static"');
    else if(fs.existsSync(file))body=fs.readFileSync(file);
    else return route.fulfill({status:404,body:'Missing QA asset'});
    if(pathname.endsWith('/app.js'))body=conflictFixture+body.toString();
    return route.fulfill({body,contentType:mime[path.extname(file)]||'application/octet-stream'});
  });
}
async function dormant(page){
  await page.waitForFunction(()=>window.KALISTAR_PREPARED);
  assert.equal(await page.evaluate(()=>!!window.KALISTAR_READY),false);
  assert.equal(await page.locator('#home-root,.game-shell,#collection-binder-root,.cloud-sync-dialog,.lineup-intro').count(),0);
  assert.equal(await page.locator('dialog[open]:not(.login-intro)').count(),0);
  assert.equal(await page.locator('#app').evaluate(n=>n.inert),true);
  assert.equal(await page.locator('.masthead').evaluate(n=>n.inert),true);
  assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&!a.effect?.target?.closest('.login-intro')).length),0);
  assert(await page.locator('link[rel=preload][as=image]').count()>0,'first-view media warms while no view is mounted');
}
async function enter(page){
  const button=page.locator('[data-startup-enter]');await button.waitFor();
  assert.equal(await page.evaluate(()=>!!window.KALISTAR_READY),false);
  await button.click();await page.waitForFunction(()=>window.KALISTAR_READY);
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});const results=[];
  const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  try{
    for(const profile of [{name:'desktop',width:1440,height:1000},{name:'razr',width:412,height:1007,mobile:true}]){
      const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:!!profile.mobile,hasTouch:!!profile.mobile});
      await routeSite(context);await context.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('playing'));return Promise.resolve();};});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'#decks');await enter(page);
      await page.locator('[data-deck-action=captain][data-slot="0"]').click();await page.locator('[data-deck-action=play]').click();
      await page.locator('#game-mode').selectOption('ai');await page.locator('.match-advanced summary').click();await page.locator('#game-seed').fill('PAGES-QA-2');
      await page.locator('#new-game-form [type=submit]').click();await page.locator('.lineup-intro').waitFor();
      const before=await page.evaluate(()=>{KalistarLoginIntro.prepare();return localStorage.getItem('kalistar.v4.game');});
      await page.reload();await dormant(page);await page.waitForTimeout(1100);
      assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v4.game')),before,'no RNG, initiative, turn or persistence change during preparation');
      await page.screenshot({path:path.join(output,profile.name+'-dormant.png')});
      await page.locator('.login-intro__skip').click();await enter(page);await page.locator('.lineup-intro').waitFor();
      assert.equal(await page.locator('.lineup-intro').count(),1);await page.locator('.li-skip').click();await page.waitForSelector('.lineup-intro',{state:'detached'});
      assert.equal(await page.locator('.masthead').evaluate(n=>n.inert),false,'lineup restores the active menu, not the preparation lock');
      assert.equal(await page.locator('#app').evaluate(n=>n.inert),false,'game is interactive after the presentation');
      await page.locator('[data-action=exit-arena]').click();await page.locator('.main-nav [data-view=home]').evaluate(n=>n.click());
      await page.evaluate(()=>{sessionStorage.setItem('startup-conflict','1');KalistarLoginIntro.prepare();});
      await page.reload();await dormant(page);
      assert.equal(await page.locator('#toast').evaluate(n=>n.classList.contains('visible')),false);
      // Completing the film (not just skip) activates the real automatic conflict UI.
      await page.locator('.login-intro video').evaluate(n=>n.dispatchEvent(new Event('ended')));
      await page.locator('[data-startup-enter]').waitFor();assert.equal(await page.locator('.cloud-sync-dialog[open]').count(),0);
      await enter(page);await page.locator('.cloud-sync-dialog[open]').waitFor();
      assert.equal(await page.locator('.login-intro').count(),0);assert.equal(await page.locator('#home-root').count(),1);
      await page.screenshot({path:path.join(output,profile.name+'-conflict-after-film.png')});
      await page.locator('[data-sync-action=close]').click();
      await page.evaluate(()=>{sessionStorage.removeItem('startup-conflict');KalistarLoginIntro.prepare();});
      await page.reload();await dormant(page);
      // Backgrounding closes the movie but must not secretly activate the app.
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>!!window.KALISTAR_READY),false);
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await enter(page);
      assert.equal(await page.locator('#home-root').count(),1);
      await page.reload();await enter(page);assert.equal(await page.locator('.login-intro').count(),0,'handoff consumed only once');
      assert.deepEqual(errors,[]);results.push({profile:profile.name,dormant:true,matchUnchanged:true,oneActivation:true,conflictDeferred:true,backgroundDeferred:true,errors});await context.close();
    }
    for(const scenario of ['reduced','failed-module','skip-slow-data','failed-media']){
      const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:scenario==='reduced'?'reduce':'no-preference'});
      let release;const slow=scenario==='skip-slow-data'?new Promise(resolve=>{release=resolve;}):null;
      await routeSite(context,{missing:scenario==='failed-module'?'engine.js':'',slow});
      await context.addInitScript(()=>{sessionStorage.setItem('kalistar.login.intro.pending',String(Date.now()));HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('playing'));return Promise.resolve();};});
      const page=await context.newPage();await page.goto(base+'#home');
      if(scenario==='failed-module'){
        await page.waitForTimeout(500);assert.equal(await page.getByText('Jeu V4 indisponible').count(),0);await page.locator('.login-intro__skip').click();await page.getByText('Jeu V4 indisponible').waitFor();assert(await page.getByRole('button',{name:'Reessayer'}).isEnabled());
      }else{
        if(scenario==='skip-slow-data'){await page.locator('.login-intro__skip').click();assert.equal(await page.evaluate(()=>!!window.KALISTAR_READY),false);release();}
        if(scenario==='failed-media'){await page.locator('.login-intro video').evaluate(n=>n.dispatchEvent(new Event('error')));}
        await enter(page);assert.equal(await page.locator('.login-intro').count(),0);assert.equal(await page.locator('#home-root').count(),1);
      }
      results.push({scenario,passed:true});await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');console.log('PASS startup: prepare without views/actions, conflict after film, PC/Razr, resume, hidden, reduced, slow/error/skip.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
