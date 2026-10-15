const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/heart'),read=n=>JSON.parse(fs.readFileSync(path.join(root,'donnees',n+'.json')));
const data={cards:read('cartes'),rules:read('regles'),demo:read('regles_demo'),elements:read('elements'),weapons:read('armes'),decks:read('decks_demo')};
const E=require('../site/engine.js').createEngine(data),url='file:///'+root.replace(/\\/g,'/')+'/site/index.html#arena',report={checks:[],errors:[]};
function fixture(side=0){
 const s=E.newGame(side?data.decks.enemy:data.decks.player,side?data.decks.player:data.decks.enemy,{seed:'HEART-QA',mode:'local'});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);s.turn=side;
 const i=s.players[side].board.findIndex(u=>E.card(u).atk.includes('revive'));assert(i>=0);E.lock(s,i,0);
 const die=6-E.card(s.players[side].board[i]).atk.indexOf('revive');
 for(let n=1;n<100000;n+=101){let x=n;x^=x<<13;x^=x>>>17;x^=x<<5;if(Math.floor((x>>>0)/4294967296*6)+1===die){s.rng=n;break;}}
 return s;
}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')));
async function state(page,s){await page.goto(url);await page.waitForFunction(()=>window.KALISTAR_READY);await page.evaluate(s=>localStorage.setItem('kalistar.v2.game',JSON.stringify(s)),s);await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.errors.push(r.url()));
  const before=fixture(),caster=before.players[0].board[before.duel.attackerSlot],ally=before.players[0].board.find(u=>u.uid!==caster.uid);caster.mana=60;ally.luck=1;
  const pending=E.clone(before);E.rollAttack(pending);assert.equal(pending.phase,'heart');
  await state(page,before);await page.waitForTimeout(500);await page.locator('[data-action="roll"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')).phase==='heart');
  assert.deepEqual(await saved(page),pending);assert.equal(await page.locator('.heart-eligible').count(),5);
  await page.locator('.slot-card[data-side="1"][data-slot="0"]').click();assert.deepEqual(await saved(page),pending);
  const target=page.locator(`.slot[data-unit="${ally.uid}"]`);assert.match(await target.locator('.slot-card').getAttribute('title'),/remplace Trèfle/);
  await target.locator('.slot-card').click();await page.waitForFunction(()=>document.querySelector('.battlefield')?.dataset.reaction==='heart-gain');assert.equal(await target.locator('.combat-emblem[data-effect="revive"]').count(),1);
  await page.screenshot({path:path.join(out,'gift-animation.jpg'),type:'jpeg',quality:94});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')).phase==='result');const expected=E.clone(pending);E.grantReraise(expected,ally.uid);assert.deepEqual(await saved(page),expected);
  assert.equal(await target.locator('.trait-badge').getAttribute('data-bonus'),'reraise');assert.equal(await target.locator('.trait-badge b').count(),0);assert.equal(await page.locator(`.slot[data-unit="${caster.uid}"] .mana-badge b`).textContent(),'60');
  report.checks.push('Real heart die: ally selection, enemy rejection, animated recipient, clover replacement, caster potion retained, no numeric heart badge');
  await page.emulateMedia({reducedMotion:'reduce'});await state(page,pending);await target.locator('.slot-card').evaluate(b=>{b.click();b.click();});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')).phase==='result');assert.deepEqual(await saved(page),expected);
  const ai=fixture(1);E.rollAttack(ai);ai.mode='ai';const aiExpected=E.clone(ai);E.grantReraise(aiExpected,E.aiReraiseChoice(aiExpected));await state(page,ai);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')).phase==='result');assert.deepEqual(await saved(page),aiExpected);
  report.checks.push('Pending heart reload, duplicate click grants once, AI picks an allied beneficiary');
  await page.emulateMedia({reducedMotion:'no-preference'});await state(page,pending);await target.locator('.slot-card').click();await page.waitForFunction(()=>document.querySelector('.battlefield')?.dataset.reaction==='heart-gain');await page.locator('[data-view="collection"]').click();await page.waitForTimeout(1000);assert.deepEqual(await saved(page),pending);assert.equal(await page.locator('.combat-emblem').count(),0);
  report.checks.push('Leaving the arena cancels uncommitted animation and preserves the pending gift');
  await page.emulateMedia({reducedMotion:'reduce'});await state(page,pending);
  for(const width of [2493,1440,390,320]){
   await page.setViewportSize({width,height:width<700?844:1080});if(width<1100)await page.locator('[data-action="focus-duel"]').click();
   const safe=await page.locator('.duel-console').evaluate(n=>{const r=n.getBoundingClientRect(),owner=n.querySelector('.dice-owner').getBoundingClientRect();return {top:owner.top-r.top,centreFits:n.querySelector('.duel-recap').scrollHeight<=n.querySelector('.duel-recap').clientHeight+1};});
   assert(safe.top>=18,'Owner label overlaps frame '+JSON.stringify(safe));assert(safe.centreFits);await page.screenshot({path:path.join(out,'heart-choice-'+width+'.jpg'),type:'jpeg',quality:92});
  }
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'heart-tests.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
