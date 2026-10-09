'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__finale_qa__.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(__dirname,'../deploy/dist');
const base=process.env.KALISTAR_URL||(built?'https://finale-qa.invalid/Kalistar':'http://127.0.0.1:4304');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-09-arena-finale/qa');
const checks=[],errors=[];
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
    if(built)await context.route(base+'/**',route=>{
      let relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,'');if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),'Missing '+relative);
      const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-finale-qa'):open.call(this,n+'-finale-qa',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(base+'/jeu/#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
    const states=await page.evaluate(()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),team=KalistarTeamComposition.create(E).fromPreset({name:'Finale QA',cards:KALISTAR_DATA.decks.player});
      const s=E.newGame(team,team,{seed:'FINALE-BROWSER-QA',mode:'local',turnOrder:'ABBA'}),states={};E.rollInitiative(s,[6,1]);
      for(let i=0;i<4000&&s.phase!=='over';i++){
        E.assertState(s);
        if(s.phase==='result'){if(KalistarFinale.endsAfterResult(s,E))states.last=E.clone(s);else states.ordinary??=E.clone(s);}
        if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);
        else if(s.phase==='kalistel')E.acceptAttack(s);else if(s.phase==='defense')E.rollDefense(s);
        else if(s.phase==='result')E.next(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
        else{const k={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];E['grant'+k](s,E['ai'+k+'Choice'](s));}
      }
      E.assertState(s);states.over=E.clone(s);states.expected=KalistarFinale.describe(s,E);return states;
    });
    assert(states.last&&states.over.phase==='over');
    const load=async state=>{
      await page.evaluate(async s=>{await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));},state);
      await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    };
    await load(states.ordinary);assert.equal(await page.locator('[data-action=next] .action-label').innerText(),'Tour suivant');
    for(const [name,width,height] of [['desktop',1440,1000],['wide',1920,1080],['razr',412,1007],['compact',320,568],['landscape',844,390]]){
      await page.setViewportSize({width,height});await load(states.last);
      assert.equal(await page.locator('[data-action=next] .action-label').innerText(),'Duel terminé');
      await page.waitForFunction(()=>[...document.querySelectorAll('.slot-card img')].filter(i=>i.getBoundingClientRect().width).every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
      if(['desktop','razr'].includes(name))await page.screenshot({path:path.join(out,name+'-last-result.png')});
      await page.locator('[data-action=next]').click();await page.locator('.arena-finale').waitFor();
      assert.equal(await page.locator('.finale-laureate').first().evaluate(n=>getComputedStyle(n).animationName),'finale-arrive');
      assert.equal(await page.locator('#match-dialog[open]').count(),0,'no forced popup');
      const laureates=await page.locator('[data-laureate]').evaluateAll(nodes=>nodes.map(n=>({uid:n.dataset.laureate,trophies:n.querySelectorAll('.finale-trophy').length})));
      assert.deepEqual(laureates,states.expected.laureates.map(u=>({uid:u.uid,trophies:u.awards.length})));
      assert.equal(await page.locator('[data-mvp=true]').count(),1);
      await page.waitForFunction(()=>[...document.querySelectorAll('.finale-card img')].every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
      if(await page.locator('[data-finale=settle]').isVisible())await page.locator('[data-finale=settle]').click();
      const geometry=await page.locator('.arena-finale').evaluate(n=>{
        const r=n.getBoundingClientRect(),track=n.querySelector('.finale-parade');
        return {x:r.x,w:r.width,overflow:document.documentElement.scrollWidth>innerWidth,track:track.scrollWidth>track.clientWidth,card:n.querySelector('.finale-card').getBoundingClientRect().width};
      });
      assert(!geometry.overflow);assert(geometry.card>=140);assert(geometry.x>=0&&geometry.x+geometry.w<=width+1);
      const clear=await page.evaluate(()=>{
        const a=document.querySelector('.finale-heading').getBoundingClientRect(),b=document.querySelector('.match-scoreboard').getBoundingClientRect();
        return a.top>=b.bottom||a.left>=b.right||a.right<=b.left;
      });assert(clear,'ceremony heading must not overlap scoreboard');
      await page.screenshot({path:path.join(out,name+'-ceremony.png'),fullPage:height<600});
      if(height<600){
        await page.locator('.finale-actions [data-action=new-game]').scrollIntoViewIfNeeded();
        assert(await page.locator('.finale-actions [data-action=new-game]').isVisible());
        await page.screenshot({path:path.join(out,name+'-actions.png')});
      }
      if(geometry.track){
        await page.emulateMedia({reducedMotion:'reduce'});
        for(let i=0;i<30&&!(await page.locator('[data-finale=next]').isDisabled());i++){
          const before=await page.locator('.finale-parade').evaluate(n=>n.scrollLeft);await page.locator('[data-finale=next]').click();
          await page.waitForFunction(value=>{const n=document.querySelector('.finale-parade');return n.scrollLeft>value+3;},before);
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        }
        await page.locator('.finale-parade').evaluate(n=>n.scrollLeft=n.scrollWidth);
        await page.waitForFunction(()=>document.querySelector('[data-finale=next]').disabled);
      }
      await page.locator('.finale-actions [data-action=match-stats]').click();await page.locator('#match-dialog').waitFor({state:'visible'});
      assert.equal(await page.locator('.match-report').getAttribute('data-tab'),'awards');
      await page.locator('#match-dialog [data-action=close]').first().click();
      const saved=await page.evaluate(()=>localStorage.getItem('kalistar.v4.game'));
      await page.locator('[data-action=finale-board]').click();assert.equal(await page.locator('.arena-finale').count(),0);
      assert.equal(await page.locator('.duel-status h2').innerText(),states.over.winner==='draw'?'Match nul':states.over.winner===0?'Victoire du joueur 1':'Victoire du joueur 2');
      assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v4.game')),saved);
      await page.locator('[data-action=finale-show]').click();assert.equal(await page.locator('.arena-finale').getAttribute('data-settled'),'true');
      await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);assert.equal(await page.locator('.arena-finale').count(),1);
      assert.equal(await page.locator('#match-dialog[open]').count(),0);checks.push({name,...geometry});
      await page.emulateMedia({reducedMotion:'no-preference'});
    }
    await page.setViewportSize({width:412,height:1007});await load(states.last);await page.locator('[data-action=next]').click();
    await page.setViewportSize({width:1440,height:1000});assert.equal(await page.locator('.arena-finale').count(),1);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('[data-mvp=true] .finale-card').evaluate(n=>getComputedStyle(n,'::after').animationName),'none');
    assert.equal(await page.locator('.finale-laureate').first().evaluate(n=>getComputedStyle(n).animationName),'none');
    await page.locator('[data-view=collection]').first().click();assert.equal(await page.locator('.arena-finale').count(),0);
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,checks,errors},null,2)+'\n');
    console.log(JSON.stringify({passed:true,viewports:checks.length,laureates:states.expected.laureates.length,errors}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
