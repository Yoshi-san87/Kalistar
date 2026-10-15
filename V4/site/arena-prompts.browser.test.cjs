'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/__arena_prompts__.cjs'));
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist')),base='https://arena-prompts-qa.invalid/Kalistar';
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-11-razr-experience/qa/prompts');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
  try{
    for(const [name,width,height,mobile]of [['desktop',1440,1000,false],['razr',412,1007,true],['compact',320,740,true],['landscape',1007,412,true]]){
      const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
      await context.route(base+'/**',route=>{
        const relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative);
        assert(file.startsWith(dist+path.sep));if(!fs.existsSync(file))return route.fulfill({status:404,body:'Missing QA asset '+relative});
        return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
      });
      await context.addInitScript(()=>{
        const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-arena-prompts-qa'):open.call(this,n+'-arena-prompts-qa',v);};
        // Freeze only autonomous AI timers in this isolated UI fixture.
        Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
      });
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
      await page.goto(base+'/jeu/#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
      if(await page.locator('.li-skip').count())await page.locator('.li-skip').click();
      const states=await page.evaluate(()=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),team=T.fromPreset({name:'Prompt QA',cards:KALISTAR_DATA.decks.player});
        const s=E.newGame(team,team,{seed:'ARENA-PROMPTS',mode:'local',turnOrder:'ABBA'}),states={};E.rollInitiative(s,[6,1]);
        for(let i=0;i<4000;i++){
          E.assertState(s);states[s.phase+'-'+s.turn]??=E.clone(s);if(s.phase==='over')break;
          if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='kalistel')E.acceptAttack(s);
          else if(s.phase==='defense')E.rollDefense(s);else if(s.phase==='result')E.next(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
          else{const k={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];E['grant'+k](s,E['ai'+k+'Choice'](s));}
        }return states;
      });
      const load=async state=>{
        await page.evaluate(async s=>{await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));localStorage.removeItem('kalistar.v4.openingMatch');},state);
        await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
        await page.waitForFunction(()=>[...document.querySelectorAll('.formation .slot-card>img')].every(i=>i.complete&&i.naturalWidth>0));
      };
      await load(states['choose-0']);
      assert.equal(await page.locator('[data-arena-prompt=attacker]').count(),5);assert.equal(await page.locator('[data-arena-prompt=target]').count(),5);
      const geometry=async()=>page.locator('.formation .slot-card').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
      const before=await geometry();await page.evaluate(()=>{[...document.styleSheets].find(s=>s.href?.includes('arena-prompts.css')).disabled=true;});
      assert.deepEqual(await geometry(),before,'decorative CSS does not move or resize cards');await page.evaluate(()=>{[...document.styleSheets].find(s=>s.href?.includes('arena-prompts.css')).disabled=false;});
      const first=page.locator('[data-arena-prompt=attacker]').first();assert.equal(await first.evaluate(n=>getComputedStyle(n,'::after').animationName),'arena-choice-breathe');
      assert.equal(await first.evaluate(n=>getComputedStyle(n,'::after').pointerEvents),'none');
      await page.screenshot({path:path.join(out,name+'-choose.png')});
      await first.click();assert.equal(await page.locator('[data-arena-prompt=attacker]').count(),0);assert.equal(await page.locator('[data-arena-prompt=target]').count(),5);
      await page.locator('[data-arena-prompt=target]').first().click();assert.equal(await page.locator('[data-arena-prompt]').count(),0);
      const button=page.locator('[data-action=lock]');assert(await button.isEnabled());
      assert.equal(await button.locator('.arena-action-cue').evaluate(n=>getComputedStyle(n,'::before').animationName),'arena-action-reflect');
      await page.screenshot({path:path.join(out,name+'-engage.png')});await button.click();
      await page.waitForFunction(()=>document.querySelector('.duel-console')?.dataset.phase==='attack');
      assert.equal(await page.locator('[data-arena-prompt]').count(),0);
      assert.equal(await page.locator('[data-action=roll] .arena-action-cue').evaluate(n=>getComputedStyle(n,'::before').animationName),'arena-action-reflect');
      await load(states['result-0']);assert.equal(await page.locator('[data-action=next] .arena-action-cue').evaluate(n=>getComputedStyle(n,'::before').animationName),'arena-action-reflect');
      await load({...states['choose-1'],mode:'ai'});assert.equal(await page.locator('[data-arena-prompt]').count(),0,'AI decisions are not clickable prompts');
      for(const state of Object.values(states).filter(s=>['clover','guard','potion','physical','heart'].includes(s.phase)).slice(0,3)){
        await load(state);const prompts=await page.locator('[data-arena-prompt=support]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.side)));
        assert(prompts.length>0&&prompts.every(side=>side===state.turn),'only real friendly support recipients are prompted');
      }
      await load(states['choose-0']);await page.locator(mobile?'[data-action=arena-menu]':'[data-action=journal]').click();
      assert.equal(await first.evaluate(n=>getComputedStyle(n,'::after').visibility),'hidden','modal blocks decorative click cues');
      await page.locator((mobile?'#mobile-dialog':'#journal-dialog')+' [data-action=close]').first().click();await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await first.evaluate(n=>getComputedStyle(n,'::after').animationName),'none');
      await page.screenshot({path:path.join(out,name+'-reduced.png')});
      await load(Object.values(states).find(s=>s.phase==='over'));assert.equal(await page.locator('[data-arena-prompt]').count(),0);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      checks.push({name,selection:true,geometry:true,buttons:true,AI:true,support:true,reduced:true});await context.close();
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,checks,errors},null,2)+'\n');console.log(JSON.stringify({passed:true,checks}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
