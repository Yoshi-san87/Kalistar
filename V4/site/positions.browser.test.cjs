'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/__position_game__.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const base=built?'https://kalistar-position-qa.invalid/Kalistar/jeu/':process.env.KALISTAR_URL||'http://127.0.0.1:4304/jeu/';
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-12-position-identity/qa/game-local');
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
  try{
    for(const [name,width,height,touch]of [['desktop',1440,1000,false],['short-desktop',1007,412,false],['short-window',844,480,false],['razr',412,1007,true],['compact',320,740,true],['landscape',1007,412,true]]){
      const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,serviceWorkers:'block',reducedMotion:name==='compact'?'reduce':'no-preference'});
      if(built)await context.route('https://kalistar-position-qa.invalid/**',route=>{
        const name=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,name.endsWith('/')?name+'index.html':name);
        assert(file.startsWith(dist+path.sep));if(!fs.existsSync(file))return route.fulfill({status:404,body:'Missing '+name});
        return route.fulfill({path:file,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});
      });
      await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-position-game-qa'):open.call(this,n+'-position-game-qa',v);};});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
      const ready=()=>page.waitForFunction(()=>window.KALISTAR_READY),images=()=>page.waitForFunction(()=>[...document.querySelectorAll('.position-emblem img')].every(i=>i.complete&&i.naturalWidth===128));
      const noCodes=async selector=>assert(!/\bP[1-5]\b/.test((await page.locator(selector).allInnerTexts()).join(' ')),selector+' uses icon-only positions');
      await page.goto(base+'#decks');await ready();await images();
      const draft=await page.evaluate(()=>localStorage.getItem('kalistar.v4.teamDraft'));
      assert.deepEqual(await page.locator('.team-starters .kdb-slot-top [data-position-icon]').evaluateAll(ns=>ns.map(n=>+n.dataset.positionIcon)),[1,2,3,4,5]);
      assert.equal(await page.locator('.team-reserves .kdb-slot-top [data-position-icon]').count(),0,'reserve numbers are not playable roles');
      await noCodes('.kdb-coverage');await page.screenshot({path:path.join(out,name+'-deck.png')});
      await page.locator('[data-deck-action=position-filter][data-id="3"]').click();
      await page.locator('.kdb-recruit-tools [data-deck-action=filters]').click();
      const field=value=>page.locator('[data-deck-filter=position][value="'+value+'"]');
      await field('3').focus();await field('3').press('ArrowRight');assert(await field('4').isChecked());assert.equal(await page.evaluate(()=>document.activeElement.value),'4');
      const compatible=await page.locator('.kdb-candidate').evaluateAll(nodes=>nodes.every(n=>KALISTAR_DATA.cards.find(c=>c.id===n.dataset.deckPreview).positions.includes(4)));
      assert(compatible);await field('').check();assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v4.teamDraft')),draft);
      await page.locator('.kdb-filters [data-deck-action=filters]').click();
      const fixture=await page.evaluate(()=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),team=T.fromPreset({name:'Roles QA',cards:KALISTAR_DATA.decks.player}),s=E.newGame(team,team,{mode:'local',seed:'ROLE-ICONS',turnOrder:'ABBA'}),opening=E.clone(s);E.rollInitiative(s,[6,1]);const choose=E.clone(s);
        for(let i=0;i<4000&&s.phase!=='over';i++){
          if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='kalistel')E.acceptAttack(s);else if(s.phase==='defense')E.rollDefense(s);else if(s.phase==='result')E.next(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
          else{const k={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];E['grant'+k](s,E['ai'+k+'Choice'](s));}
        }E.assertState(s);return {opening,choose,over:s};
      });
      let loadRevision=0;const load=async(state,intro=false)=>{
        await page.evaluate(async({state,intro})=>{await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(state);localStorage.setItem('kalistar.v4.game',JSON.stringify(state));localStorage.setItem('kalistar.v4.openingMatch',JSON.stringify(intro?state.matchId:null));},{state,intro});
        await page.goto(base+'?role-qa='+(++loadRevision)+'#arena');await ready();
      };
      await load(fixture.opening,true);await page.waitForSelector('.li-title [data-position-icon="1"]');await images();await noCodes('.li-title');
      assert.equal(await page.locator('.li-title [role=img]').getAttribute('aria-label'),'Tank (P1)');await page.screenshot({path:path.join(out,name+'-intro.png')});await page.locator('.li-skip').click();
      await load(fixture.choose);await images();assert.equal(await page.locator('.formation .position-label [data-position-icon]').count(),10);await noCodes('.formation .position-label');
      const before=await page.evaluate(()=>localStorage.getItem('kalistar.v4.game'));
      const inspector=page.locator('.formation [data-action=detail]').first(),id=await inspector.getAttribute('data-id');await inspector.click();try{await page.locator('#detail-dialog:modal .identity-strip').waitFor();}catch(error){fs.writeFileSync(path.join(out,name+'-detail-failed.json'),JSON.stringify({errors,state:await page.evaluate(()=>({toast:document.querySelector('#toast')?.textContent,dialog:document.querySelector('#detail-dialog')?.outerHTML,positions:typeof KalistarPositions,phase:JSON.parse(localStorage.getItem('kalistar.v4.game'))?.phase}))},null,2));await page.screenshot({path:path.join(out,name+'-detail-failed.png')});throw error;}
      const expected=await page.evaluate(id=>KALISTAR_DATA.cards.find(c=>c.id===id).positions,id);
      assert.deepEqual(await page.locator('#detail-dialog .identity-strip [data-position-icon]').evaluateAll(ns=>ns.map(n=>+n.dataset.positionIcon)),expected);
      await images();await noCodes('#detail-dialog .identity-strip');await page.locator('#detail-dialog .identity-strip').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,name+'-detail.png')});await page.locator('#detail-dialog [data-action=close]').click();
      assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v4.game')),before,'inspection never changes combat state');
      await page.screenshot({path:path.join(out,name+'-arena.png')});
      await load(fixture.over);await page.waitForSelector('.arena-finale');if(await page.locator('[data-finale=settle]').isVisible())await page.locator('[data-finale=settle]').click();else assert.equal(await page.locator('.arena-finale').getAttribute('data-settled'),'true');await images();
      assert((await page.locator('.finale-positions [data-position-icon]').count())>0);await page.locator('.arena-finale [data-action=match-stats]').click();
      await page.locator('#match-dialog [data-action=stats-tab][data-id=lineup]').click();await images();assert((await page.locator('.match-positions [data-position-icon]').count())>0);
      assert(await page.locator('#match-dialog .position-emblem').evaluateAll(ns=>ns.every(n=>{const r=n.getBoundingClientRect(),i=n.querySelector('img').getBoundingClientRect();return Math.abs(r.width-i.width)<.1&&Math.abs(r.height-i.height)<.1;})),'report CSS never stretches emblem images');
      await page.screenshot({path:path.join(out,name+'-report.png')});await page.locator('#match-dialog > .dialog-head [data-action=close]').click();
      await page.goto(base+'#home');await ready();await page.waitForSelector('.home-traits .position-emblems');await images();await noCodes('.home-traits');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks.push({name,deck:true,keyboard:true,intro:true,arena:true,detail:true,report:true,home:true});await context.close();
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,checks,errors},null,2)+'\n');console.log(JSON.stringify({passed:true,checks}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
