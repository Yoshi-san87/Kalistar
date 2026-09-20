const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/clover');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'donnees',n+'.json')));
const data={cards:read('cartes'),rules:read('regles'),demo:read('regles_demo'),elements:read('elements'),weapons:read('armes'),decks:read('decks_demo')};
const E=require('../site/engine.js').createEngine(data),url='file:///'+root.replace(/\\/g,'/')+'/site/index.html#arena';
const report={checks:[],images:[],errors:[]};
function fixture(reverse=false){const s=E.newGame(reverse?data.decks.enemy:data.decks.player,reverse?data.decks.player:data.decks.enemy,{seed:'CLOVER-QA',mode:'local'});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);return s;}
function grantFixture(side=0){const s=fixture(side===1);s.turn=side;const index=s.players[side].board.findIndex(u=>E.card(u).atk.includes('retry'));assert(index>=0);E.lock(s,index,0);const die=6-E.card(s.players[side].board[index]).atk.indexOf('retry');E.rollAttack(s,die);return s;}
function defenseFixture(heart=0,wantSurvive=true){
 for(let i=0;i<5;i++)for(let j=0;j<5;j++)for(let die=6;die>0;die--){
  const s=fixture();s.players[1].board[j].luck=1;s.players[1].board[j].reraise=heart;E.lock(s,i,j);E.rollAttack(s,die);
  if(s.phase!=='defense'||typeof s.duel.attackValue!=='number')continue;
  for(let rng=1;rng<100000;rng+=101){const before=E.clone(s);before.rng=rng;const failed=E.clone(before);E.rollDefense(failed);if(!failed.duel.autoDefense)continue;
   const result=E.clone(failed);let attempts=0;while(result.phase==='defense'&&attempts++<20)E.rollDefense(result);
   const survived=!!result.players[1].board[j]&&!result.duel.reraised;
   if(result.phase==='result'&&survived===wantSurvive&&typeof result.duel.defenseValue==='number')return {before,failed,result};
  }
 }
 throw Error('No defense fixture found');
}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')));
async function state(page,s){await page.goto(url);await page.waitForFunction(()=>document.body.classList.contains('arena-view'));await page.evaluate(s=>{localStorage.setItem('kalistar.v2.game',JSON.stringify(s));localStorage.setItem('kalistar.v2.boardScale','100');},s);await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);}
async function images(page){await page.locator('.slot-card img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));}
async function result(page,expected){await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')).phase==='result',null,{timeout:20000});assert.deepEqual(await saved(page),expected);}
const shot=async(page,name)=>page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:94,fullPage:true});
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:2493,height:1461},deviceScaleFactor:2,reducedMotion:'no-preference'});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.errors.push(r.url()+': '+r.failure().errorText));
  const grant=grantFixture();await state(page,grant);await images(page);await page.waitForTimeout(600);
  assert.equal(await page.locator('.clover-eligible').count(),5);
  await page.locator('.slot-card[data-side="1"][data-slot="0"]').click();assert.deepEqual(await saved(page),grant);
  const ally=grant.players[0].board.find(u=>u.uid!==grant.duel.attacker),expected=E.clone(grant);E.grantClover(expected,ally.uid);
  await page.locator(`.slot[data-unit="${ally.uid}"] .slot-card`).click();await page.waitForFunction(()=>document.querySelector('.battlefield')?.dataset.reaction==='clover-gain');
  assert.equal(await page.locator(`.slot[data-unit="${ally.uid}"] .combat-emblem[data-effect="retry"]`).count(),1);await shot(page,'clover-grant');await result(page,expected);
  assert.equal(await page.locator('.clover-badge').count(),1);
  await page.locator('.clover-badge').click();assert.equal(await page.locator('.highlighted').getAttribute('data-explains'),'luck');assert.match(await page.locator('.highlighted').textContent(),/relancé automatiquement/);await page.locator('#detail-dialog [data-action="close"]').click();
  report.checks.push('Ally selection, rejected enemy, animated grant, persistent badge, clickable explanation and exact engine result');
  const battle=defenseFixture();await state(page,battle.before);await images(page);await page.waitForTimeout(600);
  const sharpness=await page.locator('.challenger .slot-card img').evaluateAll(imgs=>imgs.map(i=>({natural:i.naturalWidth,display:i.getBoundingClientRect().width,dpr:devicePixelRatio,source:i.currentSrc,promoted:getComputedStyle(i.closest('.slot')).willChange})));
  for(const i of sharpness){assert.equal(i.natural,897);assert(i.natural>=i.display*i.dpr);assert(i.source.endsWith('.png'));assert.equal(i.promoted,'auto');}report.images=sharpness;
  const target=page.locator(`.slot[data-unit="${battle.before.duel.target}"]`);
  const badges=await target.locator('.life-badge').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));assert.equal(badges.length,1);assert.equal(await target.locator('.clover-badge b').count(),0);
  await shot(page,'duel-high-resolution');await target.locator('.slot-card').screenshot({path:path.join(out,'card-high-resolution.png')});
  await page.locator('[data-action="roll"]').click();await page.waitForFunction(()=>document.querySelector('.battlefield')?.dataset.reaction==='second-chance');await shot(page,'second-chance-effect');
  await result(page,battle.result);assert.equal(await target.locator('.clover-badge').count(),0);assert.equal(await target.locator('[data-bonus="reraise"]').count(),0);
  assert.equal(await page.locator('[data-total="attack"]').textContent(),String(battle.result.duel.formula.attack));
  assert.equal(await page.locator('[data-total="defense"]').textContent(),String(battle.result.duel.formula.defense));
  report.checks.push('Original 897px images cover HiDPI duel size; no forced low-resolution compositing; only the clover trait is active, without a numeric counter');
  report.checks.push('Failed DEF triggers clover effect and automatic animated reroll for a human player; no extra click, stale score or heart consumption');
  await page.emulateMedia({reducedMotion:'reduce'});await state(page,battle.failed);await result(page,battle.result);
  const lethal=defenseFixture(0,false);await state(page,lethal.failed);await result(page,lethal.result);assert.equal(lethal.result.players[1].board[lethal.result.duel.targetSlot],null);assert.equal(await page.locator('.clover-badge').count(),0);
  report.checks.push('Reload during pending second chance resumes exact seeded result; second failed roll eliminates without another active trait');
  const ai=grantFixture(1);ai.mode='ai';const aiResult=E.clone(ai);E.grantClover(aiResult,E.aiCloverChoice(aiResult));await state(page,ai);await result(page,aiResult);
  const legacy=E.clone(grant);legacy.schema=2;legacy.phase='attack';for(const p of legacy.players)for(const u of [...p.board,...p.reserve])delete u.luck;await state(page,legacy);assert.deepEqual(await saved(page),E.restoreGame(legacy));
  report.checks.push('AI awards an allied clover; schema 2 pending ATK retry migrates to recipient selection');
  await state(page,battle.failed);await page.locator('[data-view="collection"]').click();await page.waitForTimeout(1600);assert.deepEqual(await saved(page),battle.failed);
  await page.locator('[data-view="arena"]').click();await result(page,battle.result);
  await page.emulateMedia({reducedMotion:'no-preference'});await state(page,grant);await page.waitForTimeout(600);await page.locator(`.slot[data-unit="${ally.uid}"] .slot-card`).click();await page.waitForFunction(()=>document.querySelector('.battlefield')?.dataset.reaction==='clover-gain');await page.locator('[data-view="collection"]').click();await page.waitForTimeout(1000);assert.deepEqual(await saved(page),grant);assert.equal(await page.locator('.combat-emblem').count(),0);
  report.checks.push('Navigation cancels pending grant and automatic reroll without ghost commits; return resumes the saved second chance');
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const viewport of [{width:1440,height:1000},{width:768,height:1024},{width:390,height:844}]){
   await page.setViewportSize(viewport);await state(page,battle.before);await images(page);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(viewport.width<1000)await page.locator('[data-action="focus-right"]').click();
   await shot(page,'duel-'+viewport.width);
  }
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'clover-tests.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exit(1)});
