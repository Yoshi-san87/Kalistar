'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_score_browser.cjs'));
const {chromium}=runtime('playwright'),built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const url=built?'https://kalistar-score.invalid':process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/official-score/browser'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4'};
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']}),checks=[];
  try{
    for(const [width,height]of [[1440,900],[412,1007],[320,740]]){
      const context=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:width<700,reducedMotion:'no-preference'}),requests=[],errors=[];
      if(built)await context.route(url+'/**',route=>{const p=decodeURIComponent(new URL(route.request().url()).pathname),file=path.resolve(dist,'.'+(p.endsWith('/')?p+'index.html':p));assert(file.startsWith(dist+path.sep));return route.fulfill({status:fs.existsSync(file)?200:404,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.existsSync(file)?fs.readFileSync(file):'Not found'});});
      await context.addInitScript(()=>{
        window.scoreMedia=[];const play=HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play=function(){if(this.tagName==='AUDIO'&&/six-note-motif|brass-fight-call/.test(this.src)&&!window.scoreMedia.includes(this))window.scoreMedia.push(this);return play.call(this);};
        sessionStorage.setItem('kalistar.login.intro.pending',String(Date.now()));
      });
      const page=await context.newPage();page.on('request',request=>{if(request.url().includes('/assets/audio/'))requests.push(request.url());});page.on('pageerror',error=>errors.push(error.message));
      await page.goto(url+'/jeu/#home');
      try{await page.locator('.login-intro[open]').waitFor();}catch(error){await page.screenshot({path:path.join(out,'boot-failure.png')});console.error({url:page.url(),errors,body:await page.locator('body').innerText()});throw error;}
      await page.waitForFunction(()=>window.KALISTAR_PREPARED);assert.equal(requests.length,0,'theme is not fetched behind the film');assert.equal(await page.evaluate(()=>window.KALISTAR_READY),undefined);
      await page.locator('.login-intro__skip').click();await page.locator('[data-startup-enter]:enabled').waitFor();assert.equal(requests.length,0,'reading gate stays silent');
      await page.locator('[data-startup-enter]').click();await page.waitForFunction(()=>window.KALISTAR_READY&&window.KALISTAR_MUSIC.snapshot().playing&&window.scoreMedia[0]?.currentTime>.1);
      await page.waitForFunction(()=>Math.abs(scoreMedia[0].volume-.16)<.0001);let state=await page.evaluate(()=>({media:scoreMedia.length,volume:scoreMedia[0].volume,time:scoreMedia[0].currentTime,snapshot:KALISTAR_MUSIC.snapshot()}));
      assert.equal(state.media,1);assert.equal(state.volume,.16);assert(state.time>0);assert.equal(requests.length,1);
      await page.locator('[data-action=nav-more]').click();const toggle=page.locator('[data-theme-music-toggle]');await toggle.click();assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert(await page.evaluate(()=>scoreMedia[0].paused));
      const buttons=await page.locator('#mobile-dialog button').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth+1&&r.y>=0&&r.bottom<=innerHeight+1;}));assert(buttons.every(Boolean));
      await page.screenshot({path:path.join(out,'menu-'+width+'.png')});
      await toggle.click();await page.waitForFunction(()=>KALISTAR_MUSIC.snapshot().playing);await page.keyboard.press('Escape');
      await page.evaluate(async()=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),team=KalistarTeamComposition.create(E).fromPreset({name:'Audio QA',cards:KALISTAR_DATA.decks.player});
        const s=E.newGame(team,team,{seed:'SCORE-ROUTE',mode:'local',turnOrder:'ABBA'});E.rollInitiative(s,[6,1]);
        await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));localStorage.removeItem('kalistar.v4.openingMatch');
      });
      await page.reload();await page.locator('.login-intro__skip').click();await page.locator('[data-startup-enter]:enabled').click();await page.waitForFunction(()=>window.KALISTAR_READY&&window.KALISTAR_MUSIC.snapshot().playing);
      await page.evaluate(()=>scoreMedia[0].currentTime=8);await page.waitForFunction(()=>scoreMedia[0].currentTime>=8);
      const position=await page.evaluate(()=>scoreMedia[0].currentTime);
      await page.locator('[data-view=arena]:visible').first().click();
      try{await page.waitForFunction(()=>scoreMedia[1]?.src.includes('brass-fight-call')&&scoreMedia[1].currentTime>.1&&!scoreMedia[1].paused);}catch(error){console.error({width,url:page.url(),errors,body:(await page.locator('body').innerText()).slice(0,1000),audio:await page.evaluate(()=>scoreMedia.map(a=>({src:a.src,paused:a.paused,time:a.currentTime})))});throw error;}
      assert.equal(await page.evaluate(()=>KALISTAR_MUSIC.snapshot().playing),true);
      assert.equal(await page.evaluate(()=>scoreMedia.filter(p=>!p.paused).length),1,'the themes never play over each other');
      if(await page.locator('.li-skip').isVisible())await page.locator('.li-skip').click();
      await page.locator('[data-action=exit-arena]').click();await page.waitForFunction(()=>KALISTAR_MUSIC.snapshot().playing&&scoreMedia[0].src.includes('six-note-motif')&&!scoreMedia[0].paused&&scoreMedia[0].currentTime>=.1);
      assert(await page.evaluate(time=>scoreMedia[0].currentTime>=time-.1,position),'menu theme retains its position');assert(await page.evaluate(()=>scoreMedia[1].paused));
      await page.evaluate(()=>{const dialog=document.createElement('dialog');dialog.className='gaming-book-dialog';document.body.append(dialog);dialog.showModal();window.dispatchEvent(new Event('kalistar-overlay'));});
      assert(await page.evaluate(()=>scoreMedia[0].paused));await page.evaluate(()=>{document.querySelector('.gaming-book-dialog').remove();window.dispatchEvent(new Event('kalistar-overlay'));});await page.waitForFunction(()=>KALISTAR_MUSIC.snapshot().playing);
      await page.evaluate(()=>KALISTAR_MUSIC.set({enabled:false,volume:.09}));
      await page.reload();await page.locator('.login-intro__skip').click();await page.locator('[data-startup-enter]:enabled').click();await page.waitForFunction(()=>window.KALISTAR_READY);
      assert.deepEqual(await page.evaluate(()=>KALISTAR_MUSIC.snapshot()),{enabled:false,volume:.09,playing:false,available:true});assert.equal(await page.evaluate(()=>scoreMedia.length),0,'muted reload does not create an audio stream');
      assert.deepEqual(errors,[]);checks.push({width,height,passed:true});await context.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,built,checks},null,2));console.log('PASS official themes: dormant film/reading, single native stream, arena/menu track switch and resume, quiet bounded volume, mute, Gaming Book pause, persisted settings, 1440/412/320 layouts.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
