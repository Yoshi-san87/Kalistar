'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__battle_qa__.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(__dirname,'../deploy/dist');
const base=process.env.KALISTAR_URL||(built?'https://battle-qa.invalid/Kalistar':'http://127.0.0.1:4304');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-09-battle-report/qa/local');
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
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-battle-qa'):open.call(this,n+'-battle-qa',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(base+'/jeu/#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
    const states=await page.evaluate(()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),team=KalistarTeamComposition.create(E).fromPreset({name:'Battle QA',cards:KALISTAR_DATA.decks.player});
      const s=E.newGame(team,team,{seed:'BATTLE-BROWSER-QA',mode:'local',turnOrder:'ABBA'}),states={};E.rollInitiative(s,[6,1]);
      for(let i=0;i<4000&&s.phase!=='over';i++){
        E.assertState(s);if(s.phase==='result'&&s.match.events.length>12)states.ongoing??=E.clone(s);
        if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);
        else if(s.phase==='kalistel')E.acceptAttack(s);else if(s.phase==='defense')E.rollDefense(s);
        else if(s.phase==='result')E.next(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
        else{const k={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];E['grant'+k](s,E['ai'+k+'Choice'](s));}
      }
      E.assertState(s);states.over=E.clone(s);states.expected=KalistarBattleReport.model(s);
      const fresh=E.newGame(team,team,{seed:'BATTLE-EMPTY-QA',mode:'local',turnOrder:'ABBA'});E.rollInitiative(fresh,[6,1]);states.empty=fresh;
      states.partial=E.clone(s);states.partial.matchId='match-'+crypto.randomUUID();states.partial.match.events=states.partial.match.events.filter(e=>e.round>=15);states.partial.match.fromRound=15;states.partial.match.partial=true;
      states.missing=E.clone(s);states.missing.matchId='match-'+crypto.randomUUID();delete states.missing.match;return states;
    });
    assert(states.expected.kills.length>10);
    const load=async state=>{
      if(await page.locator('#match-dialog[open]').count())await page.locator('#match-dialog [data-action=close]').first().click();
      await page.evaluate(async s=>{await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));},state);
      await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    };
    const open=async()=>{
      if(await page.locator('.finale-actions [data-action=match-stats]').count())await page.locator('.finale-actions [data-action=match-stats]').click();
      else{await page.evaluate(()=>document.querySelector('[data-action=match-stats]').click());}
      await page.locator('#match-tab-battle').click();await page.locator('.match-battle').waitFor();
    };
    for(const [name,width,height] of [['desktop',1440,1000],['wide',1920,1080],['razr',412,1007],['compact',320,568],['landscape',844,390]]){
      await page.setViewportSize({width,height});await load(states.over);await open();
      assert.equal(await page.locator('.battle-point').count(),states.expected.kills.length);
      assert.equal(await page.locator('.battle-duel').getAttribute('data-battle-selection'),String(states.expected.kills.length-1));
      const saved=await page.evaluate(()=>localStorage.getItem('kalistar.v4.game'));
      for(let i=states.expected.kills.length-1;i>=0;i--){
        const k=states.expected.kills[i];assert.equal(await page.locator('.battle-killer').getAttribute('data-id'),k.attacker.cardId);
        assert.equal(await page.locator('.battle-victim').getAttribute('data-id'),k.target.cardId);
        assert.equal(await page.locator('.battle-killer').getAttribute('data-instance'),k.attacker.instanceId);
        assert.deepEqual(await page.locator('.battle-score .team-color-0,.battle-score .team-color-1').allTextContents(),k.scores.map(String));
        assert((await page.locator('.battle-duel header>span').innerText()).includes('Tour '+k.turn));
        if(i>0)await page.getByRole('button',{name:'Élimination précédente',exact:true}).click();
      }
      assert(await page.getByRole('button',{name:'Élimination précédente',exact:true}).isDisabled());
      await page.locator('.battle-point[aria-pressed=true]').focus();await page.keyboard.press('End');
      assert.equal(await page.locator('.battle-duel').getAttribute('data-battle-selection'),String(states.expected.kills.length-1));
      await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('.battle-duel').getAttribute('data-battle-selection'),String(states.expected.kills.length-2));
      await page.keyboard.press('Home');assert.equal(await page.locator('.battle-duel').getAttribute('data-battle-selection'),'0');
      await page.keyboard.press('Enter');assert.equal(await page.locator('.battle-duel').getAttribute('data-battle-selection'),'0');
      await page.locator('#match-tab-teams').click();await page.locator('#match-tab-battle').click();assert.equal(await page.locator('.battle-duel').getAttribute('data-battle-selection'),'0');
      const clicked=width>1000?5:states.expected.kills.length-1;
      await page.locator('.battle-point[data-id="'+clicked+'"]').click();assert.equal(await page.locator('.battle-duel').getAttribute('data-battle-selection'),String(clicked));
      await page.locator('.battle-point[aria-pressed=true]').focus();await page.keyboard.press('Home');
      await page.waitForFunction(()=>[...document.querySelectorAll('.battle-versus img')].every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
      const geometry=await page.locator('.match-battle').evaluate(n=>{
        const plot=n.querySelector('.battle-plot').getBoundingClientRect(),point=n.querySelector('.battle-point').getBoundingClientRect(),view=n.closest('.match-view');
        return {overflow:document.documentElement.scrollWidth>innerWidth||view.scrollWidth>view.clientWidth+1,plotWidth:plot.width,plotHeight:plot.height,pointWidth:point.width,pointHeight:point.height,
          font:getComputedStyle(n.querySelector('.battle-x-axis')).fontSize,scroll:view.scrollHeight>view.clientHeight};
      });
      if(geometry.overflow)await page.screenshot({path:path.join(out,name+'-overflow.png')});
      assert(!geometry.overflow,name+' '+JSON.stringify(geometry));assert(geometry.plotWidth>200);assert(geometry.plotHeight>=180);assert.equal(geometry.pointWidth,44);assert.equal(geometry.pointHeight,44);
      const motion=await page.locator('.battle-point span').first().evaluate(n=>getComputedStyle(n).transitionDuration);
      await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.battle-point span').first().evaluate(n=>getComputedStyle(n).transitionDuration),'0s');
      await page.screenshot({path:path.join(out,name+'-chart.png')});
      await page.getByRole('button',{name:'Élimination suivante',exact:true}).scrollIntoViewIfNeeded();
      const scroll=await page.locator('#match-dialog .match-view').evaluate(n=>n.scrollTop);await page.getByRole('button',{name:'Élimination suivante',exact:true}).click();
      assert.equal(await page.locator('#match-dialog .match-view').evaluate(n=>n.scrollTop),scroll);
      if(geometry.scroll)await page.screenshot({path:path.join(out,name+'-duel.png')});
      await page.locator('.battle-killer').click();await page.locator('#detail-dialog').waitFor({state:'visible'});await page.locator('#detail-dialog [data-action=close]').first().click();
      assert.equal(await page.locator('.battle-duel').getAttribute('data-battle-selection'),'1');
      assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v4.game')),saved);checks.push({name,...geometry,motion});
      await page.emulateMedia({reducedMotion:'no-preference'});
    }
    await page.setViewportSize({width:1440,height:1000});await load(states.over);await open();
    await page.locator('#match-dialog [data-action=close]').first().click();await page.locator('[data-view=collection]').first().click();
    await page.locator('[data-binder-action=archives]').click();await page.locator('#database-dialog [data-action=history-match][data-id="'+states.over.matchId+'"]').click();
    await page.locator('#match-tab-battle').click();assert.equal(await page.locator('.battle-point').count(),states.expected.kills.length);
    const archived=await page.evaluate(()=>localStorage.getItem('kalistar.v4.game'));
    await page.locator('.battle-killer').click();assert((await page.locator('#detail-dialog').innerText()).includes('Profil du match archivé'));
    await page.locator('#detail-dialog [data-action=close]').first().click();assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v4.game')),archived);
    await page.screenshot({path:path.join(out,'archived.png')});checks.push({kind:'archived',expected:states.expected.kills.length});
    await page.locator('#match-dialog [data-action=close]').first().click();await page.locator('#database-dialog [data-action=close]').first().click();
    await page.locator('[data-view=arena]').first().click();await open();
    await page.locator('.battle-point[data-id="0"]').focus();await page.keyboard.press('Home');
    await page.setViewportSize({width:412,height:1007});await page.waitForFunction(()=>document.querySelector('.battle-chart').getBoundingClientRect().width<450);
    assert.equal(await page.locator('.battle-duel').getAttribute('data-battle-selection'),'0');
    await page.locator('#match-dialog [data-action=close]').first().click();await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await open();
    assert.equal(await page.locator('.battle-point').count(),states.expected.kills.length);
    for(const kind of ['ongoing','empty','partial','missing']){
      await load(states[kind]);await open();
      const expected=await page.evaluate(s=>KalistarBattleReport.model(s).kills.length,states[kind]);assert.equal(await page.locator('.battle-point').count(),expected);
      if(kind==='empty'||kind==='missing')assert(await page.locator('.battle-empty').isVisible());
      if(kind==='partial'){assert(await page.locator('.match-partial').isVisible());assert((await page.locator('.battle-heading').innerText()).includes('consignées'));}
      await page.screenshot({path:path.join(out,kind+'.png')});checks.push({kind,expected});
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,checks,errors},null,2)+'\n');
    console.log(JSON.stringify({passed:true,viewports:5,eliminations:states.expected.kills.length,checks:checks.length,errors}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
