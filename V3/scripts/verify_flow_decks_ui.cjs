'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),site=path.join(root,'site'),out=path.join(root,'verification-flow');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__flow__.cjs'))('playwright');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(site,'data.js'),'utf8'),sandbox);
const data=JSON.parse(JSON.stringify(sandbox.window.KALISTAR_DATA)),E=require(path.join(site,'engine.js')).createEngine(data);
const report={at:new Date().toISOString(),tests:[],screenshots:[],errors:[],arenas:[]};
const url=pathToFileURL(path.join(site,'index.html')).href;
function step(s){
  if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
  else if(s.phase==='attack')E.rollAttack(s);
  else if(s.phase==='defense')E.rollDefense(s);
  else if(s.phase==='result')E.next(s);
  else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
  else if(s.phase==='guard')E.grantGuard(s,E.aiGuardChoice(s));
  else if(s.phase==='clover')E.grantClover(s,E.aiCloverChoice(s));
  else if(s.phase==='heart')E.grantReraise(s,E.aiReraiseChoice(s));
  else if(s.phase==='potion')E.grantPotion(s,E.aiPotionChoice(s));
  else if(s.phase==='physical')E.grantPhysical(s,E.aiPhysicalChoice(s));
}
function scenarios(){
  const found={results:{}};
  for(let seed=0;seed<20;seed++){
    const s=E.newGame(data.decks.player,data.decks.enemy,{mode:'local',seed:'FLOW-'+seed,deckCoverage:2});
    E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
    for(let i=0;i<3000&&s.phase!=='over';i++){
      if(s.phase==='defense'&&!found.defense){const next=E.clone(s);E.rollDefense(next);if(next.phase==='result'&&next.duel.formula&&next.players.every(p=>p.board.every(Boolean))){found.defense=E.clone(s);found.result=next;}}
      if(s.phase==='replace'&&s.replacing===0&&!found.replace)found.replace=E.clone(s);
      if(s.phase==='heart'&&!found.heart)found.heart=E.clone(s);
      if(s.phase==='result'){
        if(s.duel.formula&&!found.results[s.turn])found.results[s.turn]=E.clone(s);
        const next=E.clone(s);E.next(next);
        if(next.phase==='replace'&&next.replacing===0&&!found.beforeReplace)found.beforeReplace=E.clone(s);
        if(next.phase==='over'&&next.winner!=='draw'&&!found.beforeVictory)found.beforeVictory=E.clone(s);
      }
      step(s);
    }
    if(s.phase==='over'&&s.winner!=='draw')found.over=E.clone(s);
    if(['defense','replace','heart','over','beforeReplace','beforeVictory'].every(k=>found[k])&&found.results[0]&&found.results[1])break;
  }
  for(const key of ['defense','replace','heart','over','beforeReplace','beforeVictory'])assert.ok(found[key],key);
  assert.ok(found.results[0]&&found.results[1]);
  return found;
}
let browser,page,context,currentTest='boot';
const ready=()=>page.waitForFunction(()=>window.KALISTAR_READY&&window.KALISTAR_DB);
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v3.game')));
const close=()=>page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
async function capture(name){const file=path.join(out,name+'.png');await page.screenshot({path:file,fullPage:false});report.screenshots.push(file);}
async function test(name,fn){currentTest=name;await fn();report.tests.push(name);console.log('PASS '+name);}
async function loadState(s){
  await close();await page.evaluate(()=>window.KalistarReservePreview?.hide());
  await page.locator('[data-view=arena]').click();
  await page.locator('#game-file').setInputFiles({name:'flow.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
  await page.waitForFunction(id=>JSON.parse(localStorage.getItem('kalistar.v3.game'))?.matchId===id,s.matchId);
  await page.evaluate(()=>KALISTAR_DB.idle());
}
async function run(){
  fs.mkdirSync(out,{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  context=await browser.newContext({viewport:{width:1600,height:1080},reducedMotion:'reduce'});
  // Obsolete preferences must never reactivate automatic turn advancement.
  await context.addInitScript(()=>{
    localStorage.setItem('kalistar.v3.autoAdvance','true');
    localStorage.setItem('kalistar.v3.user-tokyo.autoAdvance','true');
  });
  page=await context.newPage();page.setDefaultTimeout(18000);
  page.on('pageerror',error=>{report.errors.push({test:currentTest,stack:error.stack});console.error(currentTest,error.stack);});
  await page.goto(url);await ready();
  await test('Deck page: ten slots, two rows, no deck modal, original full-resolution cards',async()=>{
    await page.locator('[data-view=decks]').click();assert.equal(await page.locator('.kdb-slot').count(),10);assert.equal(await page.locator('#deck-dialog[open]').count(),0);
    const rows=await page.locator('.kdb-slot').evaluateAll(ns=>ns.map(n=>Math.round(n.getBoundingClientRect().top)));assert.equal(new Set(rows).size,2);assert.equal(rows.filter(y=>y===rows[0]).length,5);
    assert.equal(await page.locator('[data-deck-action=play]').isEnabled(),true);
    assert.equal(await page.locator('.kdb-coverage .is-missing').count(),0);
    assert.ok((await page.locator('.kdb-slot-image img').first().getAttribute('src')).endsWith('-full.png'));
    await capture('decks-desktop');
  });
  await test('Strict coverage: removing a unique P2 disables play; new slots and matching filters work',async()=>{
    const index=data.decks.player.indexOf('30000002');await page.locator(`[data-deck-action=remove][data-slot="${index}"]`).click();
    assert.equal(await page.locator('[data-deck-action=play]').isDisabled(),true);assert.match(await page.locator('.kdb-validation').innerText(),/P2/);
    await page.locator('.kdb-recruit-tools [data-deck-action=filters]').click();await page.locator('[data-deck-filter=synergy]').selectOption('coverage');await page.locator('.kdb-filters [data-deck-action=filters]').click();assert.ok(await page.locator('.kdb-candidate').count());
    await page.locator('[data-deck-filter=search]').fill('Cana');assert.equal(await page.locator('.kdb-candidate').count(),1);
    await page.locator('.kdb-candidate-image').hover();assert.match(await page.locator('.kdb-preview').innerText(),/CANA/);
    await page.locator('[data-deck-action=add][data-id="30000002"]').click();assert.equal(await page.locator('[data-deck-action=play]').isEnabled(),true);
    await page.locator('.kdb-recruit-tools [data-deck-action=reset-filters]').click();
  });
  await test('Ten saved decks per profile, name persistence, duplicate limit and inline delete confirmation',async()=>{
    await page.locator('[data-deck-action=name]').fill('Les gardiens du passage');await page.locator('[data-deck-action=save]').click();
    await page.locator('.kdb-heading [data-deck-action=manage]').click();
    for(let i=1;i<10;i++)await page.locator('[data-deck-action=duplicate]').click();
    assert.equal(await page.locator('[data-deck-action=select] option').count(),11);assert.equal(await page.locator('[data-deck-action=duplicate]').isDisabled(),true);
    await page.locator('[data-deck-action=delete]').click();assert.equal(await page.locator('.kdb-delete-confirm').count(),1);await page.locator('[data-deck-action=cancel-delete]').click();assert.equal(await page.locator('[data-deck-action=select] option').count(),11);
    await page.locator('[data-deck-action=delete]').click();await page.locator('[data-deck-action=confirm-delete]').click();assert.equal(await page.locator('[data-deck-action=select] option').count(),10);
    await page.reload();await ready();assert.equal(await page.locator('[data-deck-action=select] option').count(),10);
  });
  await test('All demo decks satisfy two compatibles per P1-P5 and preserve 41-card coverage',async()=>{
    const presets=[data.decks.player,data.decks.enemy,...data.decks.presets.map(p=>p.cards)];for(const p of presets)assert.deepEqual(E.validatePlayableDeck(p),[]);assert.equal(new Set(presets.flat()).size,41);
    await page.locator('#deck-preset').selectOption('player');await page.locator('[data-action=load-preset]').click();
    await page.locator('[data-deck-action=play]').click();await page.locator('#game-mode').selectOption('local');await page.locator('#new-game-form [type=submit]').click();
    await page.locator('#new-game-dialog').waitFor({state:'hidden'});assert.equal((await state()).deckCoverage,2);
  });
  await test('Reserve hover opens a large exact-ratio full card; eye is bottom-right; formation placement works',async()=>{
    const slot=page.locator('.formation[data-player="0"] .slot').first();
    const geom=await slot.evaluate(n=>{const a=n.querySelector('.slot-card').getBoundingClientRect(),b=n.querySelector('.inspect').getBoundingClientRect();return{eyeBottom:b.bottom,eyeRight:b.right,left:a.left,top:a.top,right:a.right,bottom:a.bottom,height:a.height};});
    assert.ok(geom.eyeBottom<=geom.bottom+3&&geom.eyeBottom>geom.top+geom.height*.75);assert.ok(geom.eyeRight<=geom.right+2&&geom.eyeRight>geom.right-45);
    const anchor=page.locator('[data-reserve-card][data-side="0"]').first();await anchor.hover();await page.locator('#reserve-preview').waitFor({state:'visible'});
    const box=await page.locator('#reserve-preview>img').boundingBox();assert.ok(box.height>=400&&box.width>=200);
    assert.match(await page.locator('#reserve-preview>img').getAttribute('src'),/-full\.png$/);await capture('reserve-grand-apercu');
    const id=await page.locator('#reserve-preview').getAttribute('data-card-id'),command=page.locator('[data-preview-place]').first(),pos=Number(await command.getAttribute('data-preview-place'));
    await command.click();assert.equal((await state()).players[0].board[pos].cardId,id);
    await page.locator('[data-action=auto-formation]').click();
    const drag=page.locator('[data-reserve-card][data-side="0"]').first(),uid=await drag.getAttribute('data-uid'),unit=(await state()).players[0].reserve.find(u=>u.uid===uid),position=E.card(unit).positions[0]-1;
    await drag.hover();await page.locator('#reserve-preview').waitFor({state:'visible'});
    const from=await drag.boundingBox(),to=await page.locator(`.slot-card[data-side="0"][data-slot="${position}"]`).boundingBox();
    await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:18});await page.mouse.up();
    assert.equal((await state()).players[0].board[position].uid,uid);assert.equal(await page.locator('#reserve-preview').isVisible(),false);
    // The formation dragger suppresses the synthetic post-drop click for 450ms.
    await page.waitForTimeout(500);
  });
  await test('Sixteen arena console identities, no stretched card-border and fixed visible kill score',async()=>{
    for(const arena of data.arenas){
      await page.locator('[data-action=arena-picker]').click();await page.locator(`#arena-form input[name=arena][value="${arena.id}"]`).check();await page.locator('#arena-form [type=submit]').click();
      const frame=await page.locator('.duel-console').evaluate(n=>({arena:n.closest('.game-shell').dataset.arena,material:n.dataset.material,color:getComputedStyle(n).getPropertyValue('--arena-accent'),border:getComputedStyle(n,'::before').borderImageSource,innerOverflow:[...n.querySelectorAll('.duel-centre,.duel-recap')].some(e=>e.scrollHeight>e.clientHeight+2&&['auto','scroll'].includes(getComputedStyle(e).overflowY))}));
      assert.equal(frame.arena,arena.id);assert.equal(frame.border,'none');assert.equal(frame.innerOverflow,false);report.arenas.push(frame);
      assert.equal(await page.locator('[data-kills="0"]').innerText(),'0');if(['pyro','hydro','z13'].includes(arena.id))await capture('console-'+arena.id);
    }
    assert.ok(new Set(report.arenas.map(x=>x.color)).size>=12);
  });
  const found=scenarios();
  await test('Resolved score, bonuses, dice and RNG remain readable until an explicit Next click',async()=>{
    await loadState(found.result);assert.equal(await page.locator('[data-action=next]').count(),1);
    assert.equal(await page.locator('[data-action=auto-flow],.turn-transition').count(),0);
    const before=await state(),recap=await page.locator('.duel-recap').innerText(),dice=await page.locator('.duel-die').allTextContents();
    await page.waitForTimeout(3000);assert.deepEqual(await state(),before);assert.equal(await page.locator('.duel-recap').innerText(),recap);assert.deepEqual(await page.locator('.duel-die').allTextContents(),dice);
    await page.locator('.inspect').first().click();await page.waitForTimeout(500);await close();assert.deepEqual(await state(),before);
    await capture('tour-suivant-recap');
    await page.locator('[data-action=next]').click();const expected=E.clone(before);E.next(expected);assert.deepEqual(await state(),expected);
    await page.waitForTimeout(800);assert.deepEqual(await state(),expected);assert.equal(await page.locator('[data-action=next]').count(),0);
  });
  await test('Navigation, reload and an obsolete true preference preserve the resolved duel and database',async()=>{
    const fresh=E.clone(found.result);fresh.matchId='match-'+crypto.randomUUID();await loadState(fresh);
    const recap=await page.locator('.duel-recap').innerText();await page.locator('[data-view=decks]').click();await page.waitForTimeout(700);assert.deepEqual(await state(),fresh);
    await page.reload();await ready();await page.locator('[data-view=arena]').click();await page.waitForTimeout(2600);
    assert.deepEqual(await state(),fresh);assert.equal(await page.locator('.duel-recap').innerText(),recap);assert.equal(await page.locator('[data-action=next]').isEnabled(),true);
    await page.evaluate(()=>KALISTAR_DB.idle());assert.deepEqual(await page.evaluate(id=>KALISTAR_DB.match(id).state,fresh.matchId),fresh);
    await page.locator('[data-action=next]').click();assert.equal((await state()).round,fresh.round+1);
  });
  await test('Compatible replacement reserves highlighted, incompatible reserves dimmed; legal deploy updates board',async()=>{
    await loadState(found.replace);const s=await state(),p=s.players[0],slot=p.board.findIndex((u,i)=>!u&&p.reserve.some(r=>E.card(r).positions.includes(i+1)));
    const eligible=await page.locator('.reinforcement-eligible').evaluateAll(ns=>ns.map(n=>n.dataset.uid));assert.deepEqual(eligible.sort(),p.reserve.filter(u=>E.card(u).positions.includes(slot+1)).map(u=>u.uid).sort());
    assert.equal(await page.locator('.replacement-target').count(),1);await capture('renforts-compatibles');
    await page.locator('.reinforcement-eligible').first().focus();await page.locator(`[data-preview-place="${slot}"]`).click();assert.ok((await state()).players[0].board[slot]);
  });
  await test('Dice and combat finish before Next is enabled; support results also wait for confirmation',async()=>{
    await page.emulateMedia({reducedMotion:'no-preference'});
    const before=E.clone(found.defense);before.matchId='match-'+crypto.randomUUID();await loadState(before);await page.locator('[data-action=roll]').click();
    await page.waitForSelector('[data-action=next][disabled]');assert.equal((await state()).phase,'defense');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v3.game')).phase==='result');assert.equal((await state()).round,before.round);
    const resolved=await state();await page.waitForTimeout(2500);assert.deepEqual(await state(),resolved);assert.equal(await page.locator('[data-action=next]').isEnabled(),true);
    await page.locator('[data-action=next]').click();assert.equal((await state()).round,before.round+1);await page.emulateMedia({reducedMotion:'reduce'});
    const heart=E.clone(found.heart);heart.matchId='match-'+crypto.randomUUID();await loadState(heart);const unit=E.aiReraiseChoice(heart);await page.locator(`.slot[data-unit="${unit}"] .slot-card`).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v3.game')).phase==='result');const after=await state();assert.equal(after.players[heart.turn].board.find(u=>u?.uid===unit).reraise,1);
    assert.equal(await page.locator(`[data-kills="${heart.turn}"]`).innerText(),String(after.players[1-heart.turn].dead.length));
    await page.waitForTimeout(2500);assert.deepEqual(await state(),after);await page.locator('[data-action=next]').click();assert.equal((await state()).round,after.round+1);
  });
  await test('Ten kills wins, final scoreboard equals dead pile, final report stays open',async()=>{
    await loadState(found.over);await page.locator('#match-dialog').waitFor({state:'visible'});await close();
    assert.equal(await page.locator(`[data-kills="${found.over.winner}"]`).innerText(),'10');await page.waitForTimeout(2100);assert.equal((await state()).phase,'over');
  });
  await test('Normal-motion cards stay in duel view, then return to formation on Next',async()=>{
    await page.emulateMedia({reducedMotion:'no-preference'});
    const result=E.clone(found.result);result.matchId='match-'+crypto.randomUUID();await loadState(result);
    await page.waitForTimeout(2600);assert.equal(await page.locator('.challenger').count(),2);assert.deepEqual(await state(),result);
    await page.locator('[data-action=next]').click();assert.equal(await page.locator('.challenger').count(),0);
    const animations=await page.locator('.formation .slot').evaluateAll(ns=>ns.flatMap(n=>n.getAnimations()).filter(a=>a.playState==='running').length);
    assert.ok(animations>=2,'Returning cards animate on the explicit Next command');assert.equal((await state()).round,result.round+1);
    await page.waitForTimeout(650);
    assert.equal(await page.locator('.formation .slot').evaluateAll(ns=>ns.flatMap(n=>n.getAnimations()).filter(a=>a.playState==='running').length),0);
    await page.emulateMedia({reducedMotion:'reduce'});
  });
  await test('Human and AI duels both wait at results; AI resumes its actions after Next',async()=>{
    for(const side of [0,1]){
      const s=E.clone(found.results[side]);s.mode='ai';s.matchId='match-'+crypto.randomUUID();await loadState(s);
      await page.waitForTimeout(2600);assert.deepEqual(await state(),s);assert.equal(await page.locator('[data-action=next]').isEnabled(),true);
      const expected=E.clone(s);E.next(expected);
      await page.locator('[data-action=next]').click();assert.deepEqual(await state(),expected);
      // An eliminated card is replaced before either side chooses a new duel.
      for(let i=0;i<2&&(await state()).phase==='replace';i++){
        const replacing=(await state()).replacing;
        if(replacing===0)await page.locator('[data-action=auto-replace]').click();
        else await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v3.game')).phase!=='replace');
      }
      if(side===0){
        await page.waitForFunction(()=>['defense','result'].includes(JSON.parse(localStorage.getItem('kalistar.v3.game')).phase));
        const next=await state();assert.equal(next.turn,1);
        if(next.phase==='defense')await page.locator('[data-action=roll]:enabled').waitFor();
      }else{await page.waitForTimeout(800);assert.equal((await state()).phase,'choose');assert.equal((await state()).turn,0);}
    }
  });
  await test('Kills keep their recap before Next opens replacements or the final report',async()=>{
    for(const [source,phase]of [[found.beforeReplace,'replace'],[found.beforeVictory,'over']]){
      const s=E.clone(source);s.matchId='match-'+crypto.randomUUID();await loadState(s);await page.waitForTimeout(2500);assert.deepEqual(await state(),s);
      assert.equal(await page.locator('#match-dialog[open]').count(),0);await page.locator('[data-action=next]').click();assert.equal((await state()).phase,phase);
      const expected=E.clone(s);E.next(expected);assert.deepEqual(await state(),expected);
      await page.evaluate(()=>KALISTAR_DB.idle());assert.deepEqual(await page.evaluate(id=>KALISTAR_DB.match(id).state,s.matchId),expected);
      if(phase==='over'){assert.equal(await page.locator('#match-dialog[open]').count(),1);await close();}
    }
  });
  await test('Mobile reserve opens by tap within viewport; AI reserve remains hidden',async()=>{
    const setup=E.newGame(data.decks.player,data.decks.enemy,{mode:'ai',seed:'MOBILE-RESERVE',deckCoverage:2});E.autoDeploy(setup,0);E.autoDeploy(setup,1);await loadState(setup);
    assert.equal(await page.locator('.team-right [data-reserve-card]').count(),0);assert.equal(await page.locator('.team-right .face-down').count(),5);
    await page.setViewportSize({width:390,height:844});const card=page.locator('[data-reserve-card][data-side="0"]').first();await card.scrollIntoViewIfNeeded();await card.click();await page.locator('#reserve-preview').waitFor({state:'visible'});
    const b=await page.locator('#reserve-preview').boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=391&&b.y+b.height<=845);await capture('reserve-mobile');
    await page.locator('[data-preview-close]').click();await page.setViewportSize({width:1600,height:1080});
  });
  await test('Responsive desktop/mobile deck page, no body overflow, images decoded',async()=>{
    await page.locator('[data-view=decks]').click();
    for(const width of [2560,1440,390,360]){
      await page.setViewportSize({width,height:width>1000?1200:844});await page.evaluate(()=>scrollTo(0,0));
      await page.waitForTimeout(120);assert.equal(await page.locator('.kdb-slot').count(),10);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width);
      const unloaded=await page.locator('.kdb-slot-image img').evaluateAll(async ns=>{await Promise.all(ns.map(n=>n.decode().catch(()=>{})));return ns.filter(n=>!n.naturalWidth).length;});assert.equal(unloaded,0);
      await capture('decks-'+width);
    }
  });
  await test('Tokyo has no owned cards or saved Paris decks, cannot start a forged deck',async()=>{
    await page.evaluate(()=>localStorage.setItem('kalistar.v3.activeUser','user-tokyo'));await page.reload();await ready();
    assert.equal(await page.locator('[data-deck-action=select] option').count(),1);assert.equal(await page.locator('.kdb-slot-image img').count(),0);assert.equal(await page.locator('[data-deck-action=play]').isDisabled(),true);
    assert.equal(await page.locator('.kdb-candidate [data-deck-action=add]:enabled').count(),0);
    await page.evaluate(()=>localStorage.setItem('kalistar.v3.activeUser','user-paris'));await page.reload();await ready();assert.equal(await page.locator('[data-deck-action=select] option').count(),10);
  });
  assert.deepEqual(report.errors,[]);report.status='passed';
}
run().catch(async error=>{report.status='failed';report.failure=error.stack;console.error(error);try{await capture('failure');}catch{}process.exitCode=1;}).finally(async()=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'flow-decks-ui.json'),JSON.stringify(report,null,2));await browser?.close();});
