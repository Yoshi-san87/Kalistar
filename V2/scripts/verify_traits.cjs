const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/traits');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'donnees',n+'.json')));
const data={cards:read('cartes'),rules:read('regles'),demo:read('regles_demo'),elements:read('elements'),weapons:read('armes'),decks:read('decks_demo')};
const E=require('../site/engine.js').createEngine(data),url='file:///'+root.replace(/\\/g,'/')+'/site/index.html#arena';
const report={checks:[],viewports:[],errors:[]};
function fixture(side=0){const s=E.newGame(side?data.decks.enemy:data.decks.player,side?data.decks.player:data.decks.enemy,{seed:'TRAIT-QA',mode:'local'});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);s.turn=side;return s;}
function rngFor(die){for(let n=1;n<100000;n+=101){let x=n;x^=x<<13;x^=x>>>17;x^=x<<5;if(Math.floor((x>>>0)/4294967296*6)+1===die)return n;}}
function potionFixture(side=0){const s=fixture(side),i=s.players[side].board.findIndex(u=>E.card(u).atk.includes('mana'));assert(i>=0);E.lock(s,i,0);s.rng=rngFor(6-E.card(s.players[side].board[i]).atk.indexOf('mana'));return s;}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')));
async function state(page,s){await page.goto(url);await page.waitForFunction(()=>document.body.classList.contains('arena-view'));await page.evaluate(s=>localStorage.setItem('kalistar.v2.game',JSON.stringify(s)),s);await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);}
async function result(page,s){await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')).phase==='result',null,{timeout:15000});assert.deepEqual(await saved(page),s);}
const shot=(page,name)=>page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:94,fullPage:true});
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.errors.push(r.url()+': '+r.failure().errorText));
  const before=potionFixture(),caster=before.players[0].board[before.duel.attackerSlot],ally=before.players[0].board.find(u=>u.uid!==caster.uid);caster.reraise=1;ally.luck=1;
  const pending=E.clone(before);E.rollAttack(pending);assert.equal(pending.phase,'potion');await state(page,before);await page.waitForTimeout(600);await page.locator('[data-action="roll"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')).phase==='potion');assert.deepEqual(await saved(page),pending);
  assert.equal(await page.locator('.potion-eligible').count(),5);assert.match(await page.locator('.single-trait-note').textContent(),/remplace/);
  assert.equal(await page.locator(`[data-uid="${caster.uid}"][data-bonus="reraise"] b`).count(),0);
  await page.locator('.slot-card[data-side="1"][data-slot="0"]').click();assert.deepEqual(await saved(page),pending);
  const target=page.locator(`.slot[data-unit="${ally.uid}"]`);assert.match(await target.locator('.slot-card').getAttribute('title'),/remplace Trèfle/);
  await shot(page,'potion-choice');const expected=E.clone(pending);E.grantPotion(expected,ally.uid);
  await target.locator('.slot-card').click();await page.waitForFunction(()=>document.querySelector('.battlefield')?.dataset.reaction==='mana-gain');assert.equal(await target.locator('.combat-emblem[data-effect="mana"]').count(),1);await shot(page,'potion-grant');await result(page,expected);
  assert.equal(await target.locator('.trait-badge').count(),1);assert.equal(await target.locator('.trait-badge').getAttribute('data-bonus'),'mana');assert.equal(await target.locator('.trait-badge b').textContent(),'60');assert.equal(await target.locator('.clover-badge').count(),0);
  await target.locator('.trait-badge').click();assert.equal(await page.locator('.highlighted').getAttribute('data-explains'),'mana');assert.match(await page.locator('.highlighted').textContent(),/60 ATK/);await page.locator('#detail-dialog [data-action="close"]').click();
  report.checks.push('Real potion die opens ally selection; caster keeps own trait; enemy rejected; ally clover replaced by an animated potion with a 60 badge and correct popup');
  await page.emulateMedia({reducedMotion:'reduce'});
  const display=fixture();for(const [i,key] of ['reraise','luck','mana','physical'].entries())display.players[0].board[i][key]=i>1?60:1;E.assertState(display);
  for(const viewport of [{width:2493,height:1461},{width:1440,height:1000},{width:768,height:1024},{width:390,height:844}]){
   await page.setViewportSize(viewport);await state(page,display);
   for(const [i,key] of ['reraise','luck','mana','physical'].entries()){
    const u=display.players[0].board[i],slot=page.locator(`.slot[data-unit="${u.uid}"]`);await slot.locator('.slot-card').click();
    if(viewport.width<1000)await page.locator('[data-action="focus-left"]').click();
    const badge=slot.locator('.trait-badge');assert.equal(await badge.count(),1);assert.equal(await badge.getAttribute('data-bonus'),key);assert.equal(await badge.locator('b').count(),i>1?1:0);if(i>1)assert.equal(await badge.locator('b').textContent(),'60');
    assert.equal(await slot.locator('.slot-buffs [data-bonus="mana"],.slot-buffs [data-bonus="physical"]').count(),0);
    await badge.locator('img').evaluate(i=>i.decode());const dimensions=await badge.evaluate(b=>{const r=b.getBoundingClientRect(),n=b.querySelector('b');return {width:r.width,height:r.height,counterFits:!n||n.scrollWidth<=n.clientWidth};});assert(dimensions.counterFits);
    if(key==='mana'||key==='physical')await shot(page,'trait-'+key+'-'+viewport.width);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);report.viewports.push(viewport);
  }
  report.checks.push('Four trait types, four viewports: one badge per card; only magic/physical show 60; no duplicate buff chips, distorted icons or page overflow');
  await page.setViewportSize({width:1920,height:1080});
  await state(page,pending);const restoredGrant=E.clone(pending);E.grantPotion(restoredGrant,ally.uid);await page.locator(`.slot[data-unit="${ally.uid}"] .slot-card`).evaluate(b=>{b.click();b.click();});await result(page,restoredGrant);
  const ai=potionFixture(1);E.rollAttack(ai);ai.mode='ai';const aiExpected=E.clone(ai);E.grantPotion(aiExpected,E.aiPotionChoice(aiExpected));await state(page,ai);await result(page,aiExpected);
  report.checks.push('Pending potion survives reload; duplicate clicks grant once; AI selects a magical allied beneficiary and resolves');
  await page.emulateMedia({reducedMotion:'no-preference'});await state(page,pending);await page.waitForTimeout(600);await page.locator(`.slot[data-unit="${ally.uid}"] .slot-card`).click();await page.waitForFunction(()=>document.querySelector('.battlefield')?.dataset.reaction==='mana-gain');await page.locator('[data-view="collection"]').click();await page.waitForTimeout(1000);assert.deepEqual(await saved(page),pending);assert.equal(await page.locator('.combat-emblem').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});const legacy=fixture();legacy.schema=3;legacy.players[0].board[0].reraise=1;legacy.players[0].board[0].luck=1;legacy.players[0].board[0].mana=60;legacy.players[0].board[0].physical=60;await page.evaluate(()=>localStorage.removeItem('kalistar.v2.game.before-single-trait'));await state(page,legacy);assert.deepEqual(await saved(page),E.restoreGame(legacy));assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.game.before-single-trait'))),legacy);
  assert.equal(await page.locator('.trait-badge').count(),1);assert.equal(await page.locator('.trait-badge').getAttribute('data-bonus'),'reraise');
  await page.locator('[data-action="rules"]').click();const downloadEvent=page.waitForEvent('download');await page.locator('[data-action="export-legacy"]').click();const download=await downloadEvent;await download.saveAs(path.join(out,'before-migration.json'));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'before-migration.json'))),legacy);await page.locator('#rules-dialog [data-action="close"]').click();
  report.checks.push('Navigation cancels pending grant cleanly; legacy multi-trait save migrates to one Reraise; original backup is exported unchanged from the rules dialog');
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'trait-tests.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exit(1)});
