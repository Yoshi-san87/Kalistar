const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/match'),read=n=>JSON.parse(fs.readFileSync(path.join(root,'donnees',n+'.json')));
const data={cards:read('cartes'),rules:read('regles'),demo:read('regles_demo'),elements:read('elements'),weapons:read('armes'),decks:read('decks_demo')};
const E=require('../site/engine.js').createEngine(data),url='file:///'+root.replace(/\\/g,'/')+'/site/index.html#arena',report={checks:[],viewports:[],errors:[]};
function fixture(side=0){const s=E.newGame(data.decks.player,data.decks.enemy,{seed:'MATCH-VISUAL',mode:'local',arenaId:'sanctuary'});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);s.turn=side;return s;}
function numeric(side){const s=fixture(side);E.lock(s,2,0);const a=E.card(s.players[side].board[2]),b=E.card(s.players[1-side].board[0]);E.rollAttack(s,6-a.atk.findIndex(Number.isFinite));E.rollDefense(s,6-b.defense.findIndex(Number.isFinite));assert.equal(s.phase,'result');return s;}
function campaign(){const s=fixture();let before;for(let i=0;i<5000&&s.phase!=='over';i++){if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='defense')E.rollDefense(s);else if(s.phase==='heart')E.grantReraise(s,E.aiReraiseChoice(s));else if(s.phase==='clover')E.grantClover(s,E.aiCloverChoice(s));else if(s.phase==='potion')E.grantPotion(s,E.aiPotionChoice(s));else if(s.phase==='replace')E.autoDeploy(s,s.replacing);else if(s.phase==='result'){before=E.clone(s);E.next(s);}}assert.equal(s.phase,'over');return {before,over:s};}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')));
async function state(page,s){await page.goto(url);await page.waitForFunction(()=>window.KALISTAR_READY);await page.evaluate(s=>localStorage.setItem('kalistar.v2.game',JSON.stringify(s)),s);await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);}
const shot=(page,name)=>page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:92,fullPage:true});
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.errors.push(r.url()+': '+r.failure().errorText));
  for(const side of [0,1]){
   const s=fixture(side);await state(page,s);await page.locator(`.slot-card[data-side="${side}"][data-slot="2"]`).click();await page.locator(`.slot-card[data-side="${1-side}"][data-slot="0"]`).click();
   let scores=await page.locator('.recap-totals>[data-score-player]').evaluateAll(nodes=>nodes.map(n=>({side:n.dataset.scorePlayer,role:n.dataset.scoreRole,x:n.getBoundingClientRect().left})));
   assert.deepEqual(scores.map(n=>n.side),['0','1']);assert.deepEqual(scores.map(n=>n.role),side?['defense','attack']:['attack','defense']);assert(scores[0].x<scores[1].x);
   const resolved=numeric(side);await state(page,resolved);scores=await page.locator('.recap-totals>[data-score-player]').evaluateAll(nodes=>nodes.map(n=>({side:n.dataset.scorePlayer,role:n.dataset.scoreRole,value:n.querySelector('strong').textContent})));
   assert.deepEqual(scores.map(n=>n.role),side?['defense','attack']:['attack','defense']);assert.equal(scores[side].value,String(resolved.duel.formula.attack));assert.equal(scores[1-side].value,String(resolved.duel.formula.defense));await shot(page,'scores-side-'+side);
  }
  report.checks.push('Player 1 remains left, player 2 right, with correct ATK/DEF roles and values during preview and final results on either turn');
  const initial=fixture();await state(page,initial);await page.locator('[data-action="arena-picker"]').click();assert.equal(await page.locator('#arena-dialog .arena-option').count(),3);await page.locator('#arena-dialog img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await shot(page,'arena-selection');
  for(const id of ['forge','ruins','sanctuary']){
   if(!await page.locator('#arena-dialog').evaluate(d=>d.open))await page.locator('[data-action="arena-picker"]').click();
   await page.locator(`#arena-dialog input[value="${id}"]`).check();await page.locator('#arena-form [type="submit"]').click();const current=await saved(page);assert.deepEqual({...current,arenaId:initial.arenaId},initial);assert.equal(current.arenaId,id);assert((await page.locator('.battlefield').evaluate(n=>getComputedStyle(n).backgroundImage)).includes(id==='ruins'?'arena.webp':id+'.webp'));await shot(page,'arena-'+id);await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);assert.equal((await saved(page)).arenaId,id);
  }
  await page.locator('[data-action="new-game"]').click();await page.locator('#new-game-form input[value="forge"]').check();await page.locator('#game-mode').selectOption('local');await page.locator('#new-game-form [type="submit"]').click();assert.equal((await saved(page)).arenaId,'forge');assert.equal((await saved(page)).phase,'setup');
  report.checks.push('Three arena images render, picker and new-game selection work, selection survives reload and does not change RNG, board, duel or game rules');
  const {before,over}=campaign();await state(page,before);await page.locator('[data-action="next"]').click();assert.equal((await saved(page)).phase,'over');assert(await page.locator('#match-dialog').evaluate(d=>d.open));assert.equal(await page.locator('.match-award').count(),4);assert.equal(await page.locator('[data-stat-unit]').count(),20);await shot(page,'match-desktop');
  await page.locator('[data-action="stats-sort"][data-id="kills"]').click();assert.equal(await page.locator('.match-table [aria-sort="descending"] button').getAttribute('data-id'),'kills');await page.locator('[data-action="stats-side"][data-id="1"]').click();assert.equal(await page.locator('[data-stat-unit]').count(),10);assert((await page.locator('[data-stat-unit]').evaluateAll(rows=>rows.map(r=>r.dataset.statUnit))).every(uid=>uid.startsWith('1-')));
  const waitDownload=page.waitForEvent('download');await page.locator('[data-action="export-stats"]').click();const dl=await waitDownload;await dl.saveAs(path.join(out,'match-export.json'));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'match-export.json'))),E.matchStats(over));
  await page.locator('#match-dialog [data-action="close"]').first().click();assert(!await page.locator('#match-dialog').evaluate(d=>d.open));await page.locator('[data-action="match-stats"]').click();assert(await page.locator('#match-dialog').evaluate(d=>d.open));
  report.checks.push('Automatic end-of-match report, four awards, 20 distinct units, sortable team-filtered table, reopening and JSON export identical to engine totals');
  for(const viewport of [{width:2493,height:1461},{width:1440,height:1000},{width:768,height:1024},{width:390,height:844},{width:320,height:780}]){
   await page.setViewportSize(viewport);await state(page,over);await page.locator('#match-dialog img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await shot(page,'match-'+viewport.width);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await page.locator('#match-dialog').evaluate(d=>d.scrollWidth>d.clientWidth+1),false);
   const overlaps=await page.locator('.match-award').evaluateAll(nodes=>nodes.some(n=>{const r=n.getBoundingClientRect();return Array.from(n.querySelectorAll('.award-label,.award-caption')).some(x=>x.scrollWidth>x.clientWidth+1||x.getBoundingClientRect().right>r.right+1);}));assert.equal(overlaps,false);
   await page.locator('#match-dialog [data-action="close"]').first().click();await page.locator('[data-action="arena-picker"]').click();await shot(page,'arena-picker-'+viewport.width);assert.equal(await page.locator('#arena-dialog').evaluate(d=>d.scrollWidth>d.clientWidth+1),false);await page.locator('#arena-dialog [data-action="close"]').first().click();
   report.viewports.push(viewport);
  }
  const legacy=fixture();delete legacy.match;legacy.round=12;await state(page,legacy);await page.locator('[data-action="match-stats"]').click();assert.match(await page.locator('.match-partial').textContent(),/12/);assert.equal(await page.locator('.award-portrait').count(),0);assert.match(await page.locator('.match-mvp').textContent(),/Palmarès à venir/);
  report.checks.push('Five responsive widths, no dialog/page overflow or clipped awards, all assets loaded; old saves explicitly marked partial without invented champions');
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'match-tests.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exit(1)});
