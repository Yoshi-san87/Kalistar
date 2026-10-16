'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_intro_browser.cjs'));
const {chromium}=runtime('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/login-intro'));
const origin='https://cinematic.invalid',mime={'.js':'text/javascript','.css':'text/css','.mp4':'video/mp4','.webp':'image/webp','.woff2':'font/woff2'};
const profiles=[{name:'desktop',width:1440,height:900},{name:'razr',width:412,height:1007,phone:true},{name:'compact',width:320,height:740,phone:true},{name:'landscape',width:1007,height:412,phone:true},{name:'reduced',width:412,height:1007,phone:true,reduced:true}];
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
  try{
    for(const profile of profiles){
      const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:!!profile.phone,hasTouch:!!profile.phone,reducedMotion:profile.reduced?'reduce':'no-preference',serviceWorkers:'block'});
      const page=await context.newPage(),errors=[],mediaRequests=[];page.on('pageerror',e=>errors.push(e.message));
      await context.route(origin+'/**',async route=>{
        const pathname=new URL(route.request().url()).pathname;
        if(pathname==='/jeu/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/jeu/login.css"><link rel="stylesheet" href="/jeu/login-intro.css"><script src="/jeu/assets/lucide.min.js"></script><script src="/jeu/login-intro.js"></script><body><button id="start">Connexion</button><script>document.querySelector("#start").onclick=()=>{window.result=null;window.KalistarLoginIntro.play().then(value=>window.result=value);};</script></body></html>'});
        if(pathname.endsWith('.mp4'))mediaRequests.push(pathname);
        const file=path.resolve(dist,'.'+pathname);assert(file.startsWith(dist+path.sep));
        return route.fulfill({status:fs.existsSync(file)?200:404,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.existsSync(file)?fs.readFileSync(file):'Missing fixture'});
      });
      await page.goto(origin+'/jeu/');await page.locator('#start').click();
      if(profile.reduced){await page.waitForFunction(()=>window.result==='reduced-motion');assert.equal(mediaRequests.length,0);assert.equal(await page.locator('video').count(),0);}
      else{
        const film=page.locator('.login-intro video');await page.waitForFunction(()=>document.querySelector('video')?.currentTime>.35);
        const info=await film.evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,muted:v.muted,src:v.currentSrc}));
        assert.equal(info.muted,true);assert(Math.abs(info.duration-12)<.1);assert.equal(info.height>info.width,profile.height>profile.width&&profile.width<=699);
        const layout=await page.locator('.login-intro').evaluate(d=>({w:innerWidth,scroll:document.documentElement.scrollWidth,buttons:[...d.querySelectorAll('button:not([hidden])')].map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};})}));
        assert.equal(layout.w,layout.scroll);assert(layout.buttons.every(b=>b.w>=44&&b.h>=44&&b.x>=0&&b.y>=0&&b.x+b.w<=profile.width&&b.y+b.h<=profile.height));
        const frames=[];
        for(const time of [1,4.7,8.3,10.8]){
          if(!['desktop','razr'].includes(profile.name))break;
          await page.waitForFunction(t=>document.querySelector('video')?.currentTime>=t,time);
          const pixels=await film.evaluate(v=>{const c=document.createElement('canvas');c.width=96;c.height=96;const x=c.getContext('2d');x.drawImage(v,0,0,96,96);return [...x.getImageData(0,0,96,96).data];});
          assert(pixels.filter((v,i)=>i%4!==3&&v>20).length>100,'nonblank decoded frame');frames.push(pixels);
          await page.screenshot({path:path.join(out,profile.name+'-'+time+'.png')});
        }
        if(frames.length){assert.notDeepEqual(frames[0],frames[1]);await page.waitForFunction(()=>window.result==='completed');assert.equal(await page.locator('video').count(),0);}
        else{await page.locator('.login-intro__sound').click();assert.equal(await film.evaluate(v=>v.muted),false);await page.locator('.login-intro__skip').click();await page.waitForFunction(()=>window.result==='skipped');}
        assert.equal(mediaRequests.length,1,'only selected cut is downloaded');assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('login-intro-open')),false);
        if(profile.name==='razr'){
          await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('video')?.currentTime>.2);
          const source=await page.locator('video').evaluate(v=>v.currentSrc);await page.setViewportSize({width:1007,height:412});assert.equal(await page.locator('video').evaluate(v=>v.currentSrc),source);
          await page.setViewportSize({width:412,height:1007});await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.result==='reduced-motion');assert.equal(await page.locator('video').count(),0);
        }
      }
      assert.deepEqual(errors,[]);results.push({profile:profile.name,passed:true,mediaRequests});await context.close();
    }
    const context=await browser.newContext(),page=await context.newPage();let playable=false;
    await page.route(origin+'/**',async route=>{
      const p=new URL(route.request().url()).pathname;
      if(p==='/jeu/')return route.fulfill({contentType:'text/html',body:'<script src="/jeu/login-intro.js"></script><button onclick="KalistarLoginIntro.play().then(v=>window.result=v)">Start</button>'});
      if(p.endsWith('.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(dist,'jeu/login-intro.js'))});
      if(playable&&p.endsWith('.mp4'))return route.fulfill({contentType:'video/mp4',body:fs.readFileSync(path.join(dist,'jeu/assets/cinematics/kalistar-anime-v1.mp4'))});
      return route.fulfill({status:404,body:''});
    });
    await page.goto(origin+'/jeu/');await page.getByText('Start').click();await page.waitForFunction(()=>window.result==='unavailable');assert.equal(await page.locator('video').count(),0);
    playable=true;await context.addInitScript(()=>{HTMLMediaElement.prototype.play=()=>Promise.reject(new DOMException('Fixture','NotAllowedError'));});
    await page.reload();await page.getByText('Start').click();await page.locator('.login-intro__play:not([hidden])').waitFor();await page.keyboard.press('Escape');await page.waitForFunction(()=>window.result==='skipped');await context.close();
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,profiles:results,failures:['404 decodes safely','autoplay denied remains skippable']},null,2));
    console.log('PASS cinematic: real 12s playback desktop/Razr, decoded pixels, portrait/landscape/compact, sound/skip, resize, Reduced Motion, network failure and blocked autoplay.');
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
