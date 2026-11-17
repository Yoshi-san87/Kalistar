'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/_arena_living.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const base=built?'https://arena-living.invalid':process.env.KALISTAR_URL||'http://127.0.0.1:4304',out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/arena-living/browser'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.woff2':'font/woff2'};
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),checks=[];
  try{
    for(const [name,width,height]of [['pc',1440,900],['razr',412,1007],['compact',320,740],['landscape',1007,412]]){
      const context=await browser.newContext({viewport:{width,height},isMobile:width<1100,hasTouch:width<1100,serviceWorkers:'block'});
      if(built)await context.route(base+'/**',route=>{const p=decodeURIComponent(new URL(route.request().url()).pathname),file=path.resolve(dist,'.'+(p.endsWith('/')?p+'index.html':p));assert(file.startsWith(dist+path.sep));return route.fulfill({status:fs.existsSync(file)?200:404,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.existsSync(file)?fs.readFileSync(file):'Missing'});});
      await context.addInitScript(()=>{
        const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-arena-living-qa'):open.call(this,n+'-arena-living-qa',v);};
        window.arenaSoundNodes=[];
        for(const proto of [AudioScheduledSourceNode.prototype,AudioBufferSourceNode.prototype]){const start=proto.start;proto.start=function(...args){window.arenaSoundNodes.push({time:performance.now(),duration:args[2]});return start.apply(this,args);};}
      });
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      const ready=async()=>{await page.locator('[data-startup-enter]:enabled').click();await page.waitForFunction(()=>window.KALISTAR_READY);};
      await page.goto(base+'/jeu/#arena');await ready();
      const states=await page.evaluate(()=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),team=T.fromPreset({name:'Living QA',cards:KALISTAR_DATA.decks.player});
        const s=E.newGame(team,team,{seed:'LIVING-ARENA',mode:'local',turnOrder:'ABBA'});E.rollInitiative(s,[6,1]);const states={};
        for(let i=0;i<2000;i++){
          E.assertState(s);states[s.phase]??=E.clone(s);if(s.phase==='over')break;
          if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='kalistel')E.acceptAttack(s);
          else if(s.phase==='defense')E.rollDefense(s);else if(s.phase==='result')E.next(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
          else{const k={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];E['grant'+k](s,E['ai'+k+'Choice'](s));}
        }return states;
      });
      async function load(s){await page.evaluate(async state=>{await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(state);localStorage.setItem('kalistar.v4.game',JSON.stringify(state));localStorage.removeItem('kalistar.v4.openingMatch');},s);await page.reload();await ready();await page.waitForFunction(()=>[...document.querySelectorAll('.formation .slot-card>img')].every(i=>i.dataset.v4Cropped==='card'&&i.complete));}
      await load(states.choose);assert.equal(await page.evaluate(()=>KALISTAR_ARENA_AUDIO.snapshot().state),'dormant','no audio processing before a gesture');
      await page.locator('[data-arena-prompt=attacker]').first().click({position:{x:8,y:12}});await page.locator('[data-arena-prompt=target]').first().click({position:{x:8,y:12}});
      const button=page.locator('[data-action=lock]'),box=await button.boundingBox();
      assert(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=height+1,'action is fully framed');
      const cue=button.locator('.arena-action-cue');assert.equal(await cue.evaluate(n=>getComputedStyle(n,'::before').animationName),'arena-action-reflect');
      assert.equal(await cue.evaluate(n=>getComputedStyle(n,'::after').animationName),'arena-action-reflect');
      await page.screenshot({path:path.join(out,name+'-choose.png')});await button.click();
      await page.waitForFunction(()=>document.querySelector('.duel-console')?.dataset.phase==='attack');
      await page.waitForFunction(()=>arenaSoundNodes.length>=2);assert.equal(await page.locator('.challenger').count(),2);
      const light=await page.evaluate(()=>({opacity:getComputedStyle(document.querySelector('.arena-tension')).opacity,selected:[...document.querySelectorAll('.challenger')].map(n=>getComputedStyle(n).filter),others:[...document.querySelectorAll('.slot:not(.challenger)')].map(n=>getComputedStyle(n).filter)}));
      await page.waitForTimeout(850);assert.equal(await page.locator('.arena-tension').evaluate(n=>getComputedStyle(n).opacity),'0.54');
      assert(light.selected.every(f=>f==='none'));assert(light.others.every(f=>f==='brightness(0.55)'));
      await page.screenshot({path:path.join(out,name+'-duel.png')});
      await page.locator('[data-action=roll]').click();await page.waitForFunction(()=>document.querySelector('.duel-console')?.dataset.phase!=='attack'&&!document.querySelector('#app.rolling'));assert(await page.evaluate(()=>arenaSoundNodes.length>=6));
      await page.waitForTimeout(1800);assert.equal(await page.evaluate(()=>KALISTAR_ARENA_AUDIO.snapshot().state),'suspended');assert.equal(await page.evaluate(()=>KALISTAR_ARENA_AUDIO.snapshot().voices),0);
      // Recreate every result on the actual transformed, cropped cards, then resize them.
      for(const face of [6,5,4,3,2,1]){
        await page.evaluate(async face=>{await KalistarDice.play(0,face,true);await KalistarDice.play(1,face,true);},face);
        const offsets=await page.evaluate(face=>[...document.querySelectorAll('.ritual-result')].map(n=>{
          const img=n.parentElement.querySelector('img'),r=img.getBoundingClientRect(),m=n.getBoundingClientRect(),atk=n.dataset.role==='ATK',rows=[774,676,577,475,371,147];
          const x=face===6?(atk?146:754):atk?156:741,y=rows[face-1],full=img.naturalWidth===897,crop=full?{l:0,t:0,w:897,h:1497}:{l:50,t:50,w:797,h:1388},scale=Math.min(r.width/crop.w,r.height/crop.h);
          return Math.hypot(m.x+m.width/2-(r.x+(r.width-crop.w*scale)/2+(x-crop.l)*scale),m.y+m.height/2-(r.y+(r.height-crop.h*scale)/2+(y-crop.t)*scale));
        }),face);assert(offsets.length===2&&offsets.every(d=>d<1),'result is optically anchored on face '+face+': '+offsets);
      }
      await page.setViewportSize({width:width+17,height});await page.waitForTimeout(150);await page.setViewportSize({width,height});await page.waitForTimeout(150);
      await load(states.attack);await page.waitForFunction(()=>KALISTAR_ARENA_AUDIO.snapshot().state==='dormant');
      await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.arena-action-cue').first().evaluate(n=>getComputedStyle(n,'::after').animationName),'none');
      await page.locator('[data-action=roll]').click();await page.waitForFunction(()=>document.querySelector('.duel-console')?.dataset.phase!=='attack'&&!document.querySelector('#app.rolling'));
      assert(await page.evaluate(()=>arenaSoundNodes.length>0),'reduced motion does not mute sound');
      await page.evaluate(()=>KALISTAR_ARENA_AUDIO.set({enabled:false}));const count=await page.evaluate(()=>arenaSoundNodes.length);await page.evaluate(()=>KALISTAR_ARENA_AUDIO.play('strike'));assert.equal(await page.evaluate(()=>arenaSoundNodes.length),count);
      await page.evaluate(()=>location.hash='home');await page.waitForFunction(()=>!document.body.classList.contains('arena-view'));assert.equal(await page.locator('.arena-tension').count(),0);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);checks.push({name,width,height,framing:true,duelFocus:true,cues:true,idleSuspends:true,anchors:true,reduced:true});await context.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,built,checks},null,2));console.log(JSON.stringify({passed:true,checks}));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
