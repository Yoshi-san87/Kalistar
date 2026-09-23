'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__kill_medals__.cjs'))('playwright');
const url=process.env.KALISTAR_URL||'http://127.0.0.1:4304',output=path.join(__dirname,'verification/kill-medals');
let browser;
async function main(){
  fs.mkdirSync(output,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/jeu/');await page.waitForFunction(()=>window.KALISTAR_READY);
  const fixture=await page.evaluate(async()=>{
    const e=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTrophies;
    function step(s){
      if(s.phase==='choose')e.lock(s,...e.aiChoice(s));
      else if(s.phase==='attack')e.rollAttack(s);
      else if(s.phase==='kalistel')e.acceptAttack(s);
      else if(s.phase==='defense')e.rollDefense(s);
      else if(s.phase==='result')e.next(s);
      else if(s.phase==='replace')e.autoDeploy(s,s.replacing);
      else{const action={guard:'Guard',heart:'Reraise',potion:'Potion',physical:'Physical',clover:'Clover'}[s.phase];e['grant'+action](s,e['ai'+action+'Choice'](s));}
    }
    for(let trial=0;trial<10;trial++){
      const s=KALISTAR_DB.registry.bindGame(KALISTAR_ACTIVE_USER,e.newGame(KALISTAR_DATA.decks.player,KALISTAR_DATA.decks.enemy,{mode:'local',seed:'MEDALS-'+trial}));
      e.autoDeploy(s,0);e.autoDeploy(s,1);e.start(s);
      for(let n=0;n<3000&&s.phase!=='over';n++){
        const before=e.clone(s);step(s);
        const medal=T.killMilestone(e.matchStats(before),e.matchStats(s),s.duel?.attacker);
        if(before.phase==='defense'&&medal?.tier===2){
          e.assertState(before);await KALISTAR_DB.saveGame(before);localStorage.setItem('kalistar.v4.game',JSON.stringify(before));
          return {uid:s.duel.attacker,side:s.duel.side,name:s.duel.attackerName,matchId:s.matchId};
        }
      }
    }
    throw Error('No deterministic double-kill fixture');
  });
  await page.goto(url+'/jeu/?qa=kill-medals#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
  assert.equal(await page.locator('.kill-celebration').count(),0);
  await page.locator('[data-action=roll]').click();
  await page.locator('.kill-celebration').waitFor();
  assert.match(await page.locator('.kill-celebration').textContent(),/Double-Kill/);
  assert.equal(await page.locator('.kill-celebration').getAttribute('data-side'),String(fixture.side));
  const strip=page.locator('.slot .duel-match-stats[data-match-unit="'+fixture.uid+'"]');
  assert.equal(await strip.locator('[data-metric=kills] dd').textContent(),'2');
  assert.equal(await strip.locator('[data-kill-tier="2"]').count(),1);
  assert.equal(await page.locator('.kill-celebration').evaluate(n=>getComputedStyle(n).pointerEvents),'none');
  assert.ok(await page.locator('[data-action=next]').isEnabled(),'the celebration never blocks Tour suivant');
  await page.screenshot({path:path.join(output,'live-double-kill.png'),scale:'css'});
  await page.waitForFunction(()=>!document.querySelector('.kill-celebration'));
  await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
  assert.equal(await page.locator('.kill-celebration').count(),0,'restoring a result does not replay the announcement');
  const persisted=await page.evaluate(async()=>{
    const e=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTrophies,db=KALISTAR_DB;
    const s=e.restoreGame(JSON.parse(localStorage.getItem('kalistar.v4.game')));
    for(let n=0;n<3000&&s.phase!=='over';n++){
      if(s.phase==='choose')e.lock(s,...e.aiChoice(s));
      else if(s.phase==='attack')e.rollAttack(s);
      else if(s.phase==='kalistel')e.acceptAttack(s);
      else if(s.phase==='defense')e.rollDefense(s);
      else if(s.phase==='result')e.next(s);
      else if(s.phase==='replace')e.autoDeploy(s,s.replacing);
      else{const a={guard:'Guard',heart:'Reraise',potion:'Potion',physical:'Physical',clover:'Clover'}[s.phase];e['grant'+a](s,e['ai'+a+'Choice'](s));}
    }
    if(s.phase!=='over')throw Error('Fixture did not finish');e.assertState(s);await db.saveGame(s);
    const before=JSON.stringify(db.inspect('results'));await db.saveGame(s);
    if(before!==JSON.stringify(db.inspect('results')))throw Error('Repeated saves changed archived results');
    const summary=e.matchStats(s),owner=summary.units.find(u=>u.side===0&&u.kills>=2),expected=T.empty();
    for(const u of summary.units.filter(u=>u.cardId===owner.cardId&&u.side===0&&u.participated))T.add(expected,{...u,side:0,winner:s.winner});
    const actual=db.registry.career(KALISTAR_ACTIVE_USER,owner.cardId);
    if(JSON.stringify(actual.killMedals)!==JSON.stringify(expected.killMedals))throw Error('Owner medal aggregate mismatch');
    const collectible=s.collection.bindings[owner.instanceId],one=db.registry.career(KALISTAR_ACTIVE_USER,owner.cardId,collectible);
    if(JSON.stringify(one.killMedals)!==JSON.stringify(expected.killMedals))throw Error('Instance medal aggregate mismatch');
    // Import recalculates derived honours from the archived game, not supplied counters.
    const backup=await db.exportBackup();backup.results.forEach(r=>{r.kills=999;r.killMedals={10:999};});
    const restored=await KalistarLocalDB.open(KALISTAR_DATA,{name:'kalistar-v4-cards-medal-import'});await restored.importBackup(backup);
    const imported=restored.registry.career(KALISTAR_ACTIVE_USER,owner.cardId);
    if(JSON.stringify(imported.killMedals)!==JSON.stringify(expected.killMedals))throw Error('Forged import medal counters trusted');
    restored.close();
    return {state:s,owner:owner.cardId,expected:expected.killMedals};
  });
  // Visual fixtures are rendered only; no synthetic achievements enter the registry.
  await page.evaluate(state=>{window.medalReport=state;},persisted.state);
  await page.emulateMedia({reducedMotion:'no-preference'});
  for(const [width,height] of [[2041,1383],[1440,1000],[1024,768],[412,1007],[390,844],[320,568],[844,390]]){
    await page.setViewportSize({width,height});
    await page.evaluate(({name,side})=>KalistarCombat.celebrateKill({tier:10,name,side,reduced:false}),fixture);
    await page.waitForTimeout(400);
    const box=await page.locator('.kill-celebration').boundingBox();
    assert.ok(box.x>=-1&&box.x+box.width<=width+1,'announcement stays inside viewport at '+width);
    assert.ok(await page.locator('.kill-celebration').evaluate(n=>{
      const r=n.getBoundingClientRect(),title=n.querySelector('strong').getBoundingClientRect();
      return n.scrollWidth<=n.clientWidth+1&&title.right<=r.right-5&&title.left>=r.left+5;
    }),'announcement title stays inside its ribbon at '+width);
    await page.screenshot({path:path.join(output,`announcement-${width}x${height}.png`),scale:'css'});
    await page.evaluate(()=>KalistarCombat.cancelKillCelebration());
    for(const tab of ['awards','lineup']){
      await page.evaluate(tab=>{
        const d=document.getElementById('match-dialog');d.innerHTML='<div class="dialog-head"><h2>Palmares</h2></div>'+KalistarMatchReport.render(window.medalReport,{tab});d.showModal();lucide.createIcons();
      },tab);
      await page.locator('#match-dialog').evaluate(async n=>Promise.all(n.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
      assert.ok(await page.locator('#match-dialog .kill-medal').count()>0,'match medal visible in '+tab);
      assert.ok(await page.locator('#match-dialog .kill-decorated-name').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1)),'names and medals fit in '+tab+' at '+width);
      if(tab==='awards'&&width>950)assert.ok(await page.locator('.match-view').evaluate(n=>n.scrollHeight<=n.clientHeight+1),'desktop awards do not gain a scrollbar');
      await page.screenshot({path:path.join(output,`${tab}-${width}x${height}.png`),scale:'css'});
      await page.locator('#match-dialog').evaluate(n=>n.close());
    }
    const metrics=await page.locator('.duel-match-stats:visible [data-metric=kills]').evaluateAll(nodes=>nodes.every(n=>{
      const r=n.getBoundingClientRect(),a=n.querySelector('dt').getBoundingClientRect(),b=n.querySelector('dd').getBoundingClientRect();return a.left>=r.left-1&&b.right<=r.right+1;
    }));
    assert.ok(metrics,'kill badge never crowds the existing number at '+width);
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(url+'/jeu/');await page.waitForFunction(()=>window.KALISTAR_READY);
  await page.locator('[data-binder-field=search]').fill(persisted.owner);await page.locator('.cb-card').click();
  await page.locator('[data-binder-action=tab][data-id=career]').click();
  assert.deepEqual(await page.locator('.trophy-keepsake > span').allTextContents(),['Golden Crystal','Golden Killer','Golden Blocker','Golden Clover','Golden Heart']);
  const earned=Object.entries(persisted.expected).filter(([,n])=>n>0).map(([tier])=>tier);
  assert.deepEqual(await page.locator('.kill-medal-keepsake .kill-medal').evaluateAll(nodes=>nodes.map(n=>n.dataset.killTier)),earned);
  async function checkCareerCounts(){
    assert.ok(await page.locator('.kill-medal-keepsake').evaluateAll(nodes=>nodes.length>0&&nodes.every(n=>{
      const medal=n.querySelector('.kill-medal').getBoundingClientRect(),count=n.querySelector('b'),r=count.getBoundingClientRect();
      const actual=getComputedStyle(count),reference=getComputedStyle(document.querySelector('.trophy-keepsake b'));
      return r.top>=medal.bottom&&Math.abs(r.left+r.width/2-medal.left-medal.width/2)<1&&/^\d[\d\s]*$/.test(count.textContent)&&
        ['fontFamily','fontSize','fontWeight','lineHeight','color'].every(key=>actual[key]===reference[key]);
    })),'career counts are centered below medals with the trophy typography and no multiplication sign');
  }
  await checkCareerCounts();
  await page.locator('.kill-medal-cabinet').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,'career-earned-medals.png'),scale:'css'});
  // All nine geometric tiers, with counts and the rainbow tier, in the actual notebook.
  await page.evaluate(()=>{const stats=KalistarTrophies.empty();for(let tier=2;tier<=10;tier++)stats.killMedals[tier]=tier===2?4:tier===3?2:1;document.querySelector('.kill-medal-cabinet').outerHTML=KalistarTrophies.medalCabinet(stats);});
  await page.screenshot({path:path.join(output,'all-medal-designs.png'),scale:'css'});
  for(const [width,height] of [[412,1007],[320,568]]){
    await page.setViewportSize({width,height});
    await page.locator('[data-binder-action=pane][data-id=notes]').click();
    await page.locator('.kill-medal-cabinet').scrollIntoViewIfNeeded();
    await checkCareerCounts();
    assert.ok(await page.locator('.kill-medal-cabinet,.trophy-cabinet').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1)),'career cabinets fit at '+width);
    await page.screenshot({path:path.join(output,`career-${width}x${height}.png`),scale:'css'});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: real double-kill announcement, no replay on reload, nonblocking controls, best-tier archives/import/instance counts, report medals and responsive PC/mobile layouts.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
