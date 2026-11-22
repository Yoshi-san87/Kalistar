'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/_arena_menu_audio.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const base=built?'https://arena-menu-audio.invalid':process.env.KALISTAR_URL||'http://127.0.0.1:4304',out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/arena-audio-menu/browser'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.woff2':'font/woff2'};
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),checks=[];
  try{
    for(const [name,width,height]of [['desktop',1440,900],['wide',2532,1412],['razr',412,1007],['compact',320,740],['landscape',1007,412]]){
      const context=await browser.newContext({viewport:{width,height},isMobile:width<1100,hasTouch:width<1100,serviceWorkers:'block'});
      if(built)await context.route(base+'/**',route=>{const p=decodeURIComponent(new URL(route.request().url()).pathname),file=path.resolve(dist,'.'+(p.endsWith('/')?p+'index.html':p));assert(file.startsWith(dist+path.sep));return route.fulfill({status:fs.existsSync(file)?200:404,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.existsSync(file)?fs.readFileSync(file):'Missing'});});
      await context.addInitScript(()=>{
        const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-audio-menu-qa'):open.call(this,n+'-audio-menu-qa',v);};
        window.menuMusic=[];const play=HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play=function(){if(this.tagName==='AUDIO'&&!menuMusic.includes(this))menuMusic.push(this);return play.apply(this,arguments);};
      });
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      const ready=async()=>{await page.locator('[data-startup-enter]:enabled').click();await page.waitForFunction(()=>window.KALISTAR_READY);};
      await page.goto(base+'/jeu/#arena');await ready();
      const game=await page.evaluate(async()=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),team=KalistarTeamComposition.create(E).fromPreset({name:'Audio Menu QA',cards:KALISTAR_DATA.decks.player});
        const s=E.newGame(team,team,{seed:'AUDIO-MENU',mode:'local',turnOrder:'ABBA'});E.rollInitiative(s,[6,1]);E.assertState(s);
        await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));localStorage.removeItem('kalistar.v4.openingMatch');return s;
      });
      await page.reload();await ready();
      const menu=page.locator('#mobile-dialog'),openMenu=async()=>{await page.locator('[data-action=arena-menu]:visible').click();await menu.waitFor({state:'visible'});};
      await openMenu();assert.equal(await menu.locator('.navigation-audio-control').count(),2);
      assert(await menu.locator('.navigation-audio-toggle').evaluateAll(labels=>labels.every(n=>getComputedStyle(n).flexDirection==='row'&&n.getBoundingClientRect().height<=48)),'channel icons, toggles and labels stay on one line');
      const music=menu.locator('[data-theme-music-volume]'),sound=menu.locator('[data-arena-sound-volume]');
      for(const range of [music,sound]){await range.scrollIntoViewIfNeeded();const box=await range.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1&&box.height>=30);}
      async function adjust(range,value){await range.focus();await page.keyboard.press('Home');for(let i=0;i<value;i++)await page.keyboard.press('ArrowRight');}
      await adjust(music,9);await adjust(sound,13);
      assert.equal(await menu.locator('[data-theme-music-level]').innerText(),'9 %');assert.equal(await menu.locator('[data-arena-sound-level]').innerText(),'13 %');
      assert(await menu.isVisible(),'adjusting never dismisses the arena menu');
      await page.waitForFunction(()=>menuMusic.some(a=>!a.paused&&Math.abs(a.volume-.09)<.001&&a.src.includes('brass-fight-call')));
      const rangeBox=await music.boundingBox();await music.click({position:{x:rangeBox.width*.6,y:rangeBox.height/2}});
      assert(Number(await music.inputValue())>15,'pointer interaction changes the native slider');await adjust(music,9);
      assert.equal(await page.evaluate(()=>KALISTAR_ARENA_AUDIO.snapshot().volume),.13);
      assert.equal(await page.evaluate(()=>KALISTAR_ARENA_AUDIO.play('strike')),false,'menu pauses combat cues while music remains adjustable');
      await menu.locator('[data-theme-music-enabled]').uncheck();await menu.locator('[data-arena-sound-enabled]').uncheck();
      assert(await page.evaluate(()=>menuMusic.every(a=>a.paused)));
      await page.screenshot({path:path.join(out,name+'-menu.png')});
      await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});await openMenu();
      assert.equal(await music.inputValue(),'9');assert.equal(await sound.inputValue(),'13');assert(!(await menu.locator('[data-theme-music-enabled]').isChecked()));
      await page.keyboard.press('Escape');await page.reload();await ready();await openMenu();
      assert.equal(await music.inputValue(),'9');assert.equal(await sound.inputValue(),'13');assert(!(await menu.locator('[data-arena-sound-enabled]').isChecked()));
      const same=await page.evaluate(()=>({music:KalistarThemeMusic.controls(KALISTAR_MUSIC.snapshot()),sound:KalistarArenaAudio.controls(KALISTAR_ARENA_AUDIO.snapshot())}));
      assert(same.music.includes('value="9"')&&same.sound.includes('value="13"'),'account controls share the same preferences');
      await menu.locator('[data-theme-music-enabled]').check();await menu.locator('[data-arena-sound-enabled]').check();
      await page.keyboard.press('Escape');assert(await page.evaluate(()=>KALISTAR_ARENA_AUDIO.play('strike')),'cues resume with the selected volume after closing');
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
      for(const key of ['matchId','phase','round','turn','rng','players','duel'])assert.deepEqual(saved[key],game[key],'audio controls do not mutate '+key);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);checks.push({name,width,height,passed:true});await context.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,built,checks},null,2));console.log(JSON.stringify({passed:true,built,checks}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
