'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),site=path.join(root,'site'),out=path.join(root,'verification-readability');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__readability__.cjs'))('playwright');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(site,'data.js'),'utf8'),sandbox);
const data=JSON.parse(JSON.stringify(sandbox.window.KALISTAR_DATA)),E=require(path.join(site,'engine.js')).createEngine(data);
const report={tests:[],errors:[],screenshots:[]};
function step(s){
  if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
  else if(s.phase==='attack')E.rollAttack(s);
  else if(s.phase==='defense')E.rollDefense(s);
  else if(s.phase==='result')E.next(s);
  else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
  else {const kinds={guard:['grantGuard','aiGuardChoice'],clover:['grantClover','aiCloverChoice'],heart:['grantReraise','aiReraiseChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice']};const k=kinds[s.phase];if(k)E[k[0]](s,E[k[1]](s));}
}
function scenario(){
  const s=E.newGame(data.decks.player,data.decks.enemy,{mode:'local',seed:'READABILITY-1',deckCoverage:2});
  E.autoDeploy(s,0);E.autoDeploy(s,1);const setup=E.clone(s);E.start(s);let duel;
  for(let n=0;n<4000&&s.phase!=='over';n++){
    if(s.phase==='choose'&&s.round>=12&&!duel)duel=E.clone(s);
    step(s);
  }
  assert.ok(duel);assert.equal(s.phase,'over');return {setup,duel,over:s};
}
let browser,page,context;
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v3.game')));
async function load(s){
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());KalistarReservePreview.hide();});
  await page.locator('[data-view=arena]').click();
  await page.locator('#game-file').setInputFiles({name:'readability.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
  await page.waitForFunction(s=>{const g=JSON.parse(localStorage.getItem('kalistar.v3.game'));return g?.matchId===s.matchId&&g?.phase===s.phase&&g?.round===s.round;},s);
}
async function shot(name){const file=path.join(out,name+'.png');await page.screenshot({path:file});report.screenshots.push(file);}
async function test(name,fn){await fn();report.tests.push(name);console.log('PASS '+name);}
async function noReportOverflow(){
  const result=await page.locator('#match-dialog').evaluate(d=>{
    const r=d.getBoundingClientRect();return {rect:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},width:innerWidth,height:innerHeight,
      overflow:[d,...d.querySelectorAll('*')].filter(n=>n.clientHeight>1&&n.clientWidth>1&&((n.scrollHeight>n.clientHeight+3&&['auto','scroll','hidden'].includes(getComputedStyle(n).overflowY))||(n.scrollWidth>n.clientWidth+3&&['auto','scroll'].includes(getComputedStyle(n).overflowX)))).map(n=>({tag:n.tagName,cls:n.className,height:n.clientHeight,scroll:n.scrollHeight}))};
  });
  assert.ok(result.rect.x>=0&&result.rect.y>=0&&result.rect.right<=result.width+1&&result.rect.bottom<=result.height+1,JSON.stringify(result));
  assert.deepEqual(result.overflow,[],JSON.stringify(result));
}
async function run(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  context=await browser.newContext({viewport:{width:1600,height:1080},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>report.errors.push(e.stack));await page.goto(pathToFileURL(path.join(site,'index.html')).href);await page.waitForFunction(()=>window.KALISTAR_READY&&window.KALISTAR_DB);
  const found=scenario();await load(found.setup);
  await test('Reserve full image uses available height and stays inside the viewport',async()=>{
    for(const [width,height] of [[1600,1080],[1440,900],[390,844],[360,740]]){
      await page.setViewportSize({width,height});await page.mouse.move(0,0);await page.evaluate(()=>KalistarReservePreview.hide());
      await page.locator('[data-reserve-card][data-side="0"]').first().hover();await page.locator('#reserve-preview').waitFor({state:'visible'});
      const g=await page.locator('#reserve-preview').evaluate(n=>{const r=n.getBoundingClientRect(),i=n.querySelector('img').getBoundingClientRect(),a=n.querySelector('.reserve-preview-actions').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,h:r.height,imageW:i.width,imageH:i.height,last:a.bottom,scroll:n.scrollHeight,client:n.clientHeight,natural:n.querySelector('img').naturalWidth};});
      assert.ok(g.x>=0&&g.y>=0&&g.right<=width&&g.bottom<=height,JSON.stringify(g));assert.ok(g.last<=g.bottom&&g.scroll<=g.client+2,JSON.stringify(g));
      assert.ok(g.imageH>=(width>640?height*.78:height*.65),JSON.stringify(g));assert.ok(Math.abs(g.imageW/g.imageH-797/1388)<.002);assert.equal(g.natural,797);
      await shot('reserve-'+width);await page.evaluate(()=>KalistarReservePreview.hide());
    }
  });
  await page.setViewportSize({width:1600,height:1080});await load(found.duel);
  await test('Selected duel cards show eight current-match counters in four columns, with independent unit identities',async()=>{
    const [a,b]=E.aiChoice(found.duel),side=found.duel.turn;
    await page.locator(`.slot-card[data-side="${side}"][data-slot="${a}"]`).click();
    await page.locator(`.slot-card[data-side="${1-side}"][data-slot="${b}"]`).click();
    assert.equal(await page.locator('.duel-match-stats').count(),2);
    assert.equal(await page.locator('.duel-match-stats i[data-lucide]').count(),0);
    const stats=E.matchStats(found.duel),expected=new Map(stats.units.map(u=>[u.uid,u]));
    const shown=await page.locator('.duel-match-stats').evaluateAll(nodes=>nodes.map(n=>({uid:n.dataset.matchUnit,scope:n.dataset.statScope,values:Object.fromEntries([...n.querySelectorAll('[data-metric]')].map(x=>[x.dataset.metric,Number(x.querySelector('dd').textContent.replace(/\s/g,''))]))})));
    for(const strip of shown){assert.equal(strip.scope,'match');for(const [k,v] of Object.entries(strip.values))assert.equal(v,expected.get(strip.uid)[k]*(['physical','guards'].includes(k)?60:1),strip.uid+' '+k);}
    const layouts=await page.locator('.duel-match-stats').evaluateAll(nodes=>nodes.map(n=>Object.fromEntries([...n.querySelectorAll('[data-metric]')].map(x=>[x.dataset.metric,x.getBoundingClientRect().toJSON()]))));
    for(const layout of layouts){
      assert.deepEqual(Object.keys(layout),['kills','holds','attack','defense','clovers','hearts','physical','guards']);
      for(const [top,bottom] of [['kills','holds'],['attack','defense'],['clovers','hearts'],['physical','guards']]){
        assert.ok(Math.abs(layout[top].x-layout[bottom].x)<1);assert.ok(layout[top].bottom<=layout[bottom].top);
      }
      assert.ok(layout.kills.right<=layout.attack.left&&layout.attack.right<=layout.clovers.left&&layout.clovers.right<=layout.physical.left);
      assert.ok(Math.abs(layout.kills.y-layout.attack.y)<1&&Math.abs(layout.attack.y-layout.clovers.y)<1);
    }
    assert.equal(await page.locator('.duel-match-stats .match-metric-plus').count(),4);
    assert.deepEqual(await state(),found.duel);await shot('duel-current-match');
    const overlap=await page.locator('.challenger').evaluateAll(nodes=>nodes.map(n=>{const a=n.querySelector('.slot-card').getBoundingClientRect(),b=n.querySelector('.duel-match-stats').getBoundingClientRect();return b.top<a.bottom;}));assert.deepEqual(overlap,[false,false]);
  });
  await test('Paginated score sheet exposes every unit once with fixed portrait and name columns',async()=>{
    await page.locator('[data-action=match-stats]').click();await page.locator('[data-action=stats-tab][data-id=lineup]').click();
    const expected=E.matchStats(found.duel),rows=[];let pageNumber=0;
    while(true){
      await noReportOverflow();
      const batch=await page.locator('[data-stat-unit]').evaluateAll(nodes=>nodes.map(n=>{const img=n.querySelector('img'),label=n.querySelector('button span');return {uid:n.dataset.statUnit,x:img.getBoundingClientRect().x,text:label.getBoundingClientRect().x,values:[...n.querySelectorAll('td')].map(x=>Number(x.textContent.replace(/\s/g,'')))};}));
      assert.ok(batch.length>0);assert.ok(batch.every(row=>Math.abs(row.x-batch[0].x)<1&&Math.abs(row.text-batch[0].text)<1));rows.push(...batch);
      const next=page.locator(`[data-action=stats-page][data-id="${pageNumber+1}"][aria-label="Page suivante"]:not(:disabled)`);if(!await next.count())break;
      await next.click();pageNumber++;assert.ok(pageNumber<20);
    }
    assert.equal(rows.length,20);assert.equal(new Set(rows.map(r=>r.uid)).size,20);
    for(const row of rows){const u=expected.units.find(u=>u.uid===row.uid);assert.deepEqual(row.values,['kills','holds','attack','defense','clovers','hearts'].map(k=>u[k]));}
    await shot('boxscore-desktop');
    for(const tab of ['awards','teams','definitions','lineup']){await page.locator(`[data-action=stats-tab][data-id=${tab}]`).click();await noReportOverflow();await shot('report-'+tab);}
    assert.deepEqual(await state(),found.duel);
  });
  await test('Report tabs and pages fit tablet, mobile and short screens without scrollbars',async()=>{
    for(const [width,height] of [[1440,900],[1024,768],[390,844],[360,740],[844,390]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(160);
      for(const tab of ['lineup','awards','teams','definitions']){
        await page.locator(`[data-action=stats-tab][data-id=${tab}]`).click();await noReportOverflow();
        if(tab==='lineup'){
          const rows=await page.locator('[data-stat-unit]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {bottom:r.bottom,last:Math.max(...[...n.querySelectorAll('th,td')].map(c=>c.getBoundingClientRect().bottom))};}));
          assert.ok(rows.every(r=>r.last<=r.bottom+1),JSON.stringify(rows));
        }
      }
      await page.locator('[data-action=stats-tab][data-id=lineup]').click();await shot('boxscore-'+width);
    }
  });
  await test('Manual next turn remains available and reading statistics does not advance play',async()=>{
    await page.setViewportSize({width:1600,height:1080});await load(found.duel);const result=E.clone(found.duel);while(result.phase!=='result'&&result.phase!=='over')step(result);assert.equal(result.phase,'result');await load(result);
    const before=await state();await page.waitForTimeout(1800);assert.deepEqual(await state(),before);assert.equal(await page.locator('[data-action=next]').count(),1);
  });
  await test('Real deck page reorders, persists and saves without changing match or ownership',async()=>{
    const gameBefore=await state(),ownedBefore=await page.evaluate(()=>KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).map(x=>x.id).sort());
    await page.locator('[data-view=decks]').click();
    const order=()=>page.locator('[data-deck-slot]').evaluateAll(ns=>ns.map(n=>n.dataset.deckPreview||null));
    const before=await order(),a=await page.locator('.kdb-slot-image[data-slot="0"]').boundingBox(),b=await page.locator('.kdb-slot-image[data-slot="4"]').boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:16});await page.mouse.up();
    const expected=before.slice();[expected[0],expected[4]]=[expected[4],expected[0]];assert.deepEqual(await order(),expected);
    await page.locator('[data-deck-action=name]').fill('Ordre test lisibilite');await page.locator('[data-deck-action=save]').click();await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    assert.deepEqual(await order(),expected);assert.deepEqual(await state(),gameBefore);assert.deepEqual(await page.evaluate(()=>KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).map(x=>x.id).sort()),ownedBefore);
    await page.setViewportSize({width:2560,height:1440});
    const sizes=await page.locator('.kdb-slots').evaluate(n=>({width:n.clientWidth,parent:n.parentElement.clientWidth,card:n.querySelector('.kdb-slot-image').getBoundingClientRect().width,scrollbar:getComputedStyle(document.documentElement).scrollbarWidth,viewport:innerHeight,height:document.documentElement.scrollHeight,slots:[...n.querySelectorAll('.kdb-slot')].map(s=>s.getBoundingClientRect().toJSON())}));
    assert.ok(sizes.width<=sizes.parent&&sizes.card>150,JSON.stringify(sizes));assert.equal(sizes.scrollbar,'none');assert.ok(sizes.height<=sizes.viewport);assert.ok(sizes.slots.every(s=>s.top>=0&&s.bottom<=sizes.viewport));await shot('decks-full-width');
  });
  await test('No browser exceptions',async()=>{assert.deepEqual(report.errors,[]);});
}
run().catch(async e=>{report.failure=e.stack;console.error(e);process.exitCode=1;try{await shot('failure');}catch{}}).finally(async()=>{await browser?.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));});
