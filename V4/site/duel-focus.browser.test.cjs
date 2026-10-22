'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_duel_focus_qa.cjs'));
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/duel-focus'));
const base='https://duel-focus.invalid';
assert(!(process.env.KALISTAR_DIST&&process.env.KALISTAR_TEST_SOURCE==='1'),'Choose the frozen build or local focus source, not both');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.mp4':'video/mp4','.mp3':'audio/mpeg'};
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];
  try{
    for(const profile of [{name:'desktop',width:1440,height:1000},{name:'laptop',width:1280,height:720},{name:'zoomed',width:1280,height:720,zoom:140},{name:'wide',width:1920,height:1080},{name:'phone',width:412,height:1007,mobile:true},{name:'reduced',width:1440,height:1000,reduced:true}].filter(p=>!process.env.KALISTAR_VIEWPORT_PROFILE||process.env.KALISTAR_VIEWPORT_PROFILE.split(',').includes(p.name))){
      const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:!!profile.mobile,hasTouch:!!profile.mobile,reducedMotion:profile.reduced?'reduce':'no-preference',serviceWorkers:'block'});
      await context.route('**/*',route=>{
        const url=new URL(route.request().url());if(url.origin!==base)return route.abort();
        let rel=decodeURIComponent(url.pathname).slice(1);if(rel.endsWith('/'))rel+='index.html';
        const source=process.env.KALISTAR_TEST_SOURCE==='1'&&rel==='jeu/duel-focus.js';
        const root=source?__dirname:dist,file=path.resolve(root,source?'duel-focus.js':rel);
        if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){errors.push('Missing asset: '+rel);return route.fulfill({status:404,body:'Missing QA asset'});}
        return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
      });
      await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,...args){return open.call(this,name+'-duel-focus-qa-only',...args);};});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'/jeu/#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
      await page.evaluate(async()=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),team=KalistarTeamComposition.create(E).fromPreset({name:'Focus QA',cards:KALISTAR_DATA.decks.player});
        const s=E.newGame(team,team,{mode:'local',seed:'DUEL-FOCUS-QA',turnOrder:'ABBA'});E.rollInitiative(s,[6,1]);
        await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
      });
      if(profile.zoom)await page.evaluate(zoom=>localStorage.setItem('kalistar.v4.boardScale',JSON.stringify(zoom)),profile.zoom);
      await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(650);
      await page.evaluate(()=>{
        window.focusBoxes=()=>Object.fromEntries([...document.querySelectorAll('.formation .slot')].map(n=>{const r=n.querySelector('.slot-card').getBoundingClientRect();return[n.dataset.key,{x:r.x,y:r.y,width:r.width,height:r.height}];}));
        window.focusAnimations=()=>Object.fromEntries([...document.querySelectorAll('.formation .slot')].map(n=>{const a=n.getAnimations().find(a=>a.effect.target===n);return[n.dataset.key,{time:a?.currentTime??null,target:n.style.transform,opacity:n.style.opacity}];}));
        window.focusClick=selector=>{const before=focusBoxes(),animationsBefore=focusAnimations();document.querySelector(selector).click();return{before,after:focusBoxes(),animationsBefore,animationsAfter:focusAnimations()};};
        document.addEventListener('pointerdown',()=>{window.focusSample={before:focusBoxes(),animationsBefore:focusAnimations()};},true);
        document.addEventListener('click',()=>{if(window.focusSample){window.focusSample.after=focusBoxes();window.focusSample.animationsAfter=focusAnimations();}});
      });
      const stored=await page.evaluate(()=>localStorage.getItem('kalistar.v4.game'));
      const click=async(selector,label,synthetic=false)=>{
        let sample;
        if(synthetic)sample=await page.evaluate(selector=>focusClick(selector),selector);
        else{await page.locator(selector)[profile.mobile?'tap':'click']({position:{x:5,y:5}});sample=await page.evaluate(()=>focusSample);}
        sample.profile=profile.name;sample.label=label;results.push(sample);
        fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,results,errors},null,2));
        if(!profile.reduced)for(const [key,before]of Object.entries(sample.before))for(const field of ['x','y','width','height'])assert(Math.abs(sample.after[key][field]-before[field])<1.1,`${profile.name} ${label}: ${key} ${field} jumped ${sample.after[key][field]-before[field]}px`);
        for(const [key,before]of Object.entries(sample.animationsBefore)){
          const after=sample.animationsAfter[key];
          if(before.time!==null&&before.target===after.target&&before.opacity===after.opacity)assert(after.time!==null&&after.time>=before.time-1,`${profile.name} ${label}: unchanged animation ${key} restarted at ${after.time}ms instead of ${before.time}ms`);
        }
        if(label!=='change attacker'){
          sample.frames=await page.evaluate(()=>new Promise(resolve=>{const frames=[],start=performance.now();const frame=()=>{frames.push(focusBoxes());if(performance.now()-start<600)requestAnimationFrame(frame);else resolve(frames);};requestAnimationFrame(frame);}));
          const end=sample.frames.at(-1);
          fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,results,errors},null,2));
          if(!profile.reduced)for(const boxes of sample.frames)for(const [key,start]of Object.entries(sample.after))for(const field of ['x','y','width','height'])assert(boxes[key][field]>=Math.min(start[field],end[key][field])-1.1&&boxes[key][field]<=Math.max(start[field],end[key][field])+1.1,`${profile.name} ${label}: ${key} ${field} left its transition path`);
        }
      };
      await click('.team-left .slot-card[data-slot="0"]','first selection');
      await click('.team-right .slot-card[data-slot="0"]','opponent selection');
      await click('.team-left .slot-card[data-slot="1"]','change attacker');await page.waitForTimeout(90);
      await click('.team-left .slot-card[data-slot="2"]','change during animation',true);
      await click('.team-right .slot-card[data-slot="1"]','change target');
      assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v4.game')),stored,'selection does not mutate match');
      // Resize the same DOM while focus is moving: superseded tweens must not stack.
      await page.evaluate(()=>document.querySelector('.team-left .slot-card[data-slot="0"]').click());await page.waitForTimeout(80);
      for(const width of [profile.width-24,profile.width]){
        await page.setViewportSize({width,height:profile.height});await page.waitForTimeout(80);
        const counts=await page.evaluate(()=>[...document.querySelectorAll('.formation .slot')].map(n=>n.getAnimations().filter(a=>a.effect.target===n).length));
        assert(counts.every(n=>n<=1),profile.name+': resize stacks focus animations');
      }
      await page.waitForTimeout(600);await click('.team-left .slot-card[data-slot="2"]','restore attacker');
      await page.screenshot({path:path.join(output,profile.name+'-selection.png'),scale:'css'});
      const settled=await page.evaluate(()=>focusBoxes());
      await click('[data-action=lock]','lock duel');
      const frames=await page.evaluate(()=>new Promise(resolve=>{const values=[],start=performance.now();const frame=()=>{values.push(focusBoxes());if(performance.now()-start<600)requestAnimationFrame(frame);else resolve(values);};requestAnimationFrame(frame);}));
      for(const boxes of frames)for(const [key,before]of Object.entries(settled))for(const field of ['x','y','width','height'])assert(Math.abs(boxes[key][field]-before[field])<1.1,`${profile.name} lock: stationary card ${key} changed ${field}`);
      await page.screenshot({path:path.join(output,profile.name+'-locked.png'),scale:'css'});
      const locked=await page.evaluate(s=>{KalistarEngine.createEngine(KALISTAR_DATA).lock(s,2,1);return s;},JSON.parse(stored));
      assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game'))),locked,'focus keeps the exact engine lock');
      await page.locator('[data-action=roll]').click();
      await page.waitForFunction(()=>!document.querySelector('#app.rolling'),{},{timeout:20000});
      const rolled=await page.evaluate(s=>{KalistarEngine.createEngine(KALISTAR_DATA).rollAttack(s);return s;},locked);
      assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game'))),rolled,'focus keeps the exact engine roll');
      const afterRoll=await page.evaluate(()=>focusBoxes());
      for(const [key,before]of Object.entries(settled))for(const field of ['x','y','width','height'])assert(Math.abs(afterRoll[key][field]-before[field])<1.1,`${profile.name} roll: stationary card ${key} changed ${field}`);
      await context.close();
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,results,errors},null,2));
    console.log('PASS duel focus: '+[...new Set(results.map(r=>r.profile))].join(', ')+'; continuous selections, interrupted animations, resize, lock and engine roll parity.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
