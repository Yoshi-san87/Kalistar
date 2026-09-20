const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/catalogue');
const url='file:///'+root.replace(/\\/g,'/')+'/site/index.html';
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'donnees',n+'.json')));
const data={cards:read('cartes'),rules:read('regles'),demo:read('regles_demo'),elements:read('elements'),weapons:read('armes'),decks:read('decks_demo')};
const E=require('../site/engine.js').createEngine(data);
function campaign(seed,sameDeck=false){
 const s=E.newGame(data.decks.player,sameDeck?data.decks.player:data.decks.enemy,{seed,mode:'local'});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
 let actions=0;while(s.phase!=='over'&&actions++<10000){
  if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='defense')E.rollDefense(s);
  else if(s.phase==='heart')E.grantReraise(s,E.aiReraiseChoice(s));else if(s.phase==='clover')E.grantClover(s,E.aiCloverChoice(s));else if(s.phase==='potion')E.grantPotion(s,E.aiPotionChoice(s));else if(s.phase==='result')E.next(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
 }
 E.assertState(s);assert.equal(s.phase,'over');return s;
}
const report={checks:[],errors:[],screens:[]};
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.KALISTAR_READY);
  assert(await page.evaluate(()=>!!window.KALISTAR_DB));assert.equal(await page.locator('.character-item').count(),15);
  const momo=page.locator('[data-character="MOMO"]');assert.equal(await momo.locator('.stack-behind').count(),1);assert.equal(await momo.locator('[data-action="cover-version"]').count(),2);
  const first=await momo.locator('.card-open').getAttribute('data-id');await momo.locator('[data-action="cover-version"]').nth(1).click();assert.notEqual(await momo.locator('.card-open').getAttribute('data-id'),first);
  await momo.locator('.card-open').click();assert.equal(await page.locator('.detail-versions button').count(),2);assert.equal(await page.locator('.career-panel').count(),1);assert((await page.locator('.detail-visual img').getAttribute('src')).endsWith('.png'));
  await page.locator('.detail-versions button').first().click();assert.equal(await page.locator('.detail-versions [aria-pressed="true"]').getAttribute('data-id'),first);
  await page.locator('#detail-dialog [data-action="close"]').click();await page.locator('#search').fill('momo');assert.equal(await page.locator('.character-item').count(),1);await page.locator('#search').fill('');
  await page.locator('[data-action="element"][data-id="PYRO"]').click();assert.equal(await page.locator('.character-item').count(),data.cards.filter(c=>c.element==='PYRO').length);await page.locator('[data-action="reset-filters"]').click();
  report.checks.push('15 character groups / 20 versions, Momo stack and version navigation, filters, full-resolution detail and career');
  const final=campaign('CAREER-TEST'),other=campaign('CAREER-TEST'),copies=campaign('COPIES',true),summary=E.matchStats(final);
  const storage=await page.evaluate(async ({final,other,copies})=>{
   const db=window.KALISTAR_DB,eq=(a,b,message)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(message);};
   await db.saveGame(final);const before=await db.exportBackup();await db.saveGame(final);eq((await db.exportBackup()).results,before.results,'Duplicate final counted twice');
   const earlier=structuredClone(final);earlier.phase='choose';earlier.winner=null;earlier.duel=null;earlier.lastDuel=null;
   await db.saveGame(earlier);if(!db.match(final.matchId).finalized)throw Error('Final overwritten by active state');
   await db.saveGame(other);await db.saveGame(copies);
   const exported=await db.exportBackup(),db2=await KalistarLocalDB.open(KALISTAR_DATA,{name:'kalistar-import-test'});
   await db2.importBackup(exported);eq(db2.counts(),db.counts(),'Import counts differ');await db2.importBackup(exported);eq(db2.counts(),db.counts(),'Repeated import duplicated');
   for(const c of KALISTAR_DATA.cards)eq(db2.career(c.id),db.career(c.id),'Imported career differs');
   const collision=structuredClone(exported);collision.matches[0].state.winner=collision.matches[0].state.winner===0?1:0;
   let rejected=false;try{await db2.importBackup(collision);}catch{rejected=true;}if(!rejected)throw Error('Conflicting final accepted');eq(db2.counts(),db.counts(),'Rejected import changed counts');
   const corrupt=structuredClone(exported);corrupt.instances[0].serial='invalid';rejected=false;try{await db2.importBackup(corrupt);}catch{rejected=true;}if(!rejected)throw Error('Invalid serial accepted');
   const partial=structuredClone(final);partial.matchId='match-'+crypto.randomUUID();partial.match.partial=true;
   const careerBefore=db.career(final.players[0].dead[0]?.cardId||final.players[0].board.find(Boolean).cardId);
   await db.saveGame(partial);eq(db.career(final.players[0].dead[0]?.cardId||final.players[0].board.find(Boolean).cardId),careerBefore,'Partial history counted in career');
   db2.close();return {counts:db.counts(),stats:KALISTAR_DATA.cards.map(c=>({id:c.id,career:db.career(c.id),instances:db.instances(c.id)}))};
  },{final,other,copies});
  for(const row of storage.stats){const expected=[final,other,copies].flatMap(s=>E.matchStats(s).units.filter(u=>u.cardId===row.id&&u.participated).map(u=>({...u,winner:s.winner})));assert.equal(row.career.games,expected.length);assert.equal(row.career.kills,expected.reduce((n,u)=>n+u.kills,0));assert.equal(row.career.wins,expected.filter(u=>u.winner===u.side).length);}
  report.checks.push('Real IndexedDB: unique instances, final idempotency, separate same-seed games, atomic import/conflict rejection, no unused-reserve or partial-history credit');
  await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);assert.deepEqual(await page.evaluate(()=>KALISTAR_DB.counts()),storage.counts);
  for(const width of [2493,1440,768,390,320]){
   await page.setViewportSize({width,height:width<700?844:1080});await page.evaluate(()=>scrollTo(0,0));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Collection overflow '+width);
   await page.screenshot({path:path.join(out,'collection-'+width+'.jpg'),type:'jpeg',quality:90});report.screens.push('collection-'+width);
  }
  await page.setViewportSize({width:1440,height:1000});await page.locator('[data-character="MOMO"] .card-open').click();
  await page.screenshot({path:path.join(out,'momo-detail.jpg'),type:'jpeg',quality:93});
  await page.locator('#career-instance').selectOption({index:1});assert((await page.locator('#career-instance').inputValue()).startsWith('K2-'));
  await page.locator('#detail-dialog [data-action="close"]').click();await page.locator('[data-action="database"]').click();
  const download=page.waitForEvent('download');await page.locator('[data-action="export-library"]').click();const file=await download;const exported=JSON.parse(fs.readFileSync(await file.path()));assert.equal(exported.format,'kalistar-local-library');assert.equal(exported.matches.length,storage.counts.matches);
  await page.locator('.database-matches [data-action="history-match"]').first().click();assert.equal(await page.locator('.match-awards .match-award').count(),4);assert((await page.locator('.match-awards').innerText()).includes('Debuffer'));await page.screenshot({path:path.join(out,'palmares.jpg'),type:'jpeg',quality:92});
  for(const width of [768,390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.locator('#match-dialog').evaluate(n=>n.scrollWidth>n.clientWidth),false,'Report overflow '+width);await page.screenshot({path:path.join(out,'palmares-'+width+'.jpg'),type:'jpeg',quality:90});}
  await page.locator('#match-dialog [data-action="close"]').first().click();await page.locator('#database-dialog [data-action="close"]').click();
  report.checks.push('Reload persistence, per-instance career, JSON download, archived palmares, responsive 320–2493px');
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'catalogue-tests.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
