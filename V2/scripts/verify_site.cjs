const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/site');
const url='file:///'+root.replace(/\\/g,'/')+'/site/index.html';
const report={viewports:[],checks:[],errors:[]};
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')));
async function images(page){await page.locator('img').evaluateAll(async imgs=>{for(const i of imgs){i.loading='eager';await i.decode();}});}
async function click(page,action){await page.locator(`[data-action="${action}"]:visible`).first().click();}
async function close(page,id){await page.locator(`#${id} [data-action="close"]`).click();}
async function startLocal(page){
 await click(page,'new-game');await page.selectOption('#game-mode','local');await page.fill('#game-seed','SITE-QA-20');
 await page.locator('#new-game-form button[type="submit"]').click();await click(page,'start');
}
async function humanStep(page,s){
 if(s.phase==='choose'){
  const pair=await page.evaluate(s=>KalistarEngine.createEngine(KALISTAR_DATA).aiChoice(s),s);
  await page.locator(`[data-action="slot"][data-side="${s.turn}"][data-slot="${pair[0]}"]`).click();
  await page.locator(`[data-action="slot"][data-side="${1-s.turn}"][data-slot="${pair[1]}"]`).click();
  await click(page,'lock');
 }else if(['heart','clover','potion'].includes(s.phase)){
  const uid=await page.evaluate(s=>{const E=KalistarEngine.createEngine(KALISTAR_DATA);return s.phase==='heart'?E.aiReraiseChoice(s):s.phase==='potion'?E.aiPotionChoice(s):E.aiCloverChoice(s);},s);
  await page.locator(`.slot[data-unit="${uid}"] .slot-card`).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')).phase==='result');
 }else if(s.phase==='attack'||s.phase==='defense'){
  const before=JSON.stringify(s);if(!s.duel.autoDefense)await click(page,'roll');
  await page.waitForFunction(b=>localStorage.getItem('kalistar.v2.game')!==b,before);
 }else if(s.phase==='result')await click(page,'next');
 else if(s.phase==='replace')await click(page,'auto-replace');
 else throw new Error('Unexpected phase '+s.phase);
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 page.on('requestfailed',r=>report.errors.push(r.url()+': '+r.failure().errorText));
 await page.goto(url);await page.waitForFunction(()=>window.KALISTAR_READY);await images(page);
 assert.equal(await page.evaluate(()=>KALISTAR_DATA.cards.length),20);
 assert.equal(await page.locator('.collection-item').count(),15);
 await page.screenshot({path:path.join(out,'collection-desktop.png'),fullPage:true});
 await page.screenshot({path:path.join(out,'collection-versions.png'),fullPage:true});
 await page.fill('#search','momo');assert.equal(await page.locator('.collection-item').count(),1);
 await click(page,'reset-filters');await page.locator('[data-action="element"][data-id="ELECTRO"]').click();assert.equal(await page.locator('.collection-item').count(),2);
 for(const field of ['faction','race','weapon','position']){
  await click(page,'reset-filters');
  const select=page.locator(`[data-filter="${field}"]`),value=await select.locator('option').nth(1).getAttribute('value');
  await select.selectOption(value);
  const expected=await page.evaluate(({field,value})=>new Set(KALISTAR_DATA.cards.filter(c=>field==='position'?c.positions.includes(+value):c[field]===value).map(c=>c.name)).size,{field,value});
  assert.equal(await page.locator('.collection-item').count(),expected);
 }
 await click(page,'reset-filters');await click(page,'favorite');await page.check('#favorites-only');assert.equal(await page.locator('.collection-item').count(),1);
 await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.favorites')).length),1);
 await click(page,'detail');await images(page);assert.equal(await page.locator('.stats-table tbody td').count(),12);await click(page,'toggle-art');await images(page);
 await page.screenshot({path:path.join(out,'detail-desktop.png'),fullPage:false});await close(page,'detail-dialog');
 report.checks.push('20 versions across 15 character stacks; all images; search; every filter; favorite persistence; detail and artwork');
 await click(page,'deck');await page.locator('#deck-dialog [data-action="remove"]:not([disabled])').first().click();
 assert.equal(await page.locator('#deck-count').textContent(),'9');await close(page,'deck-dialog');
 await page.locator('[data-view="arena"]').click();assert.equal(await page.locator('#deck-dialog').evaluate(d=>d.open),true);
 await click(page,'default-deck');assert.equal(await page.locator('#deck-count').textContent(),'10');
 const [deckDownload]=await Promise.all([page.waitForEvent('download'),click(page,'export-deck')]);
 await deckDownload.saveAs(path.join(out,'deck-export.json'));
 await page.locator('#deck-file').setInputFiles({name:'deck.json',mimeType:'application/json',buffer:fs.readFileSync(path.join(out,'deck-export.json'))});
 await close(page,'deck-dialog');await page.locator('[data-view="arena"]').click();await images(page);
 assert.equal(await page.locator('.slot-card img').count(),10);
 await page.screenshot({path:path.join(out,'arena-desktop.png'),fullPage:true});
 report.checks.push('Invalid deck blocks game with a usable editor; deck JSON export and import; all 10 positions deploy');
 for(const viewport of [{width:1920,height:1080},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]){
  await page.setViewportSize(viewport);
  await page.locator('[data-view="collection"]').click();await images(page);
  let overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(overflow,false,'Collection horizontal overflow '+viewport.width);
  await page.screenshot({path:path.join(out,`collection-${viewport.width}.png`),fullPage:true});
  if(viewport.width===390){await click(page,'toggle-filters');await page.selectOption('[data-filter="race"]','ROBOT');assert.equal(await page.locator('.collection-item').count(),2);await click(page,'reset-filters');await click(page,'toggle-filters');}
  await page.locator('[data-view="arena"]').click();await images(page);
  overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(overflow,false,'Arena horizontal overflow '+viewport.width);
  await page.screenshot({path:path.join(out,`arena-${viewport.width}.png`),fullPage:true});
  await page.locator('.inspect').first().click();await images(page);
  assert.equal(await page.locator('#detail-dialog').evaluate(d=>d.scrollWidth>d.clientWidth),false,'Detail overflow');await close(page,'detail-dialog');
  report.viewports.push({...viewport,horizontalOverflow:false,imagesLoaded:true});
 }
 await page.setViewportSize({width:1440,height:1000});await startLocal(page);
 let steps=0,reloaded=false,phases={};
 while((await state(page)).phase!=='over'&&steps++<1800){
  const s=await state(page);phases[s.phase]=(phases[s.phase]||0)+1;
  if(s.round===3&&!reloaded){await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);assert.deepEqual(await state(page),s);reloaded=true;}
  await humanStep(page,s);
  if(s.round===4&&s.phase==='result')await page.screenshot({path:path.join(out,'duel-resolu.png'),fullPage:true});
 }
 const end=await state(page);assert.equal(end.phase,'over');
 assert(await page.locator('#match-dialog').evaluate(d=>d.open));await page.locator('#match-dialog .dialog-head [data-action="close"]').click();
 report.localMatch={steps,exchanges:end.round,winner:end.winner,phases,reloadPreservedState:reloaded};
 const [gameDownload]=await Promise.all([page.waitForEvent('download'),click(page,'save-game')]);await gameDownload.saveAs(path.join(out,'game-export.json'));
 await page.locator('#game-file').setInputFiles({name:'game.json',mimeType:'application/json',buffer:fs.readFileSync(path.join(out,'game-export.json'))});
 await page.waitForTimeout(150);assert.deepEqual(await state(page),end);
 await page.locator('#match-dialog .dialog-head [data-action="close"]').click();
 await page.locator('#game-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schema":1,"players":null}')});
 await page.waitForTimeout(150);assert.match(await page.locator('#toast').textContent(),/Import refus/);assert.deepEqual(await state(page),end);
 await click(page,'new-game');await page.selectOption('#game-mode','ai');await page.fill('#game-seed','AI-QA-20');await page.locator('#new-game-form button[type="submit"]').click();await click(page,'start');
 let aiSteps=0;
 while((await state(page)).round<13&&(await state(page)).phase!=='over'&&aiSteps++<300){
  const s=await state(page),actor=s.phase==='defense'?1-s.turn:s.phase==='replace'?s.replacing:s.turn;
  if(actor===1&&['choose','attack','defense','clover','potion','heart','replace'].includes(s.phase)){
   await page.waitForFunction(before=>localStorage.getItem('kalistar.v2.game')!==before,JSON.stringify(s));
  }else await humanStep(page,s);
 }
 assert((await state(page)).round>=13||(await state(page)).phase==='over');
 report.checks.push('Complete local match through UI; reload mid-game; game JSON export/import; corrupt save rejected; 12 exchanges against automatic opponent');
 assert.deepEqual(report.errors,[]);
 console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'browser-tests.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exit(1)});
