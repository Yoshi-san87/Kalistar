'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),site=path.join(root,'site'),out=path.join(root,'verification-palmares');
const modules=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__palmares__.cjs'))('playwright');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(site,'data.js'),'utf8'),sandbox);
const data=JSON.parse(JSON.stringify(sandbox.window.KALISTAR_DATA)),E=require(path.join(site,'engine.js')).createEngine(data);
function finished(){
  const s=E.newGame(data.decks.player,data.decks.enemy,{mode:'local',seed:'PALMARES-V3-01',deckCoverage:2,arenaId:data.arenas[0].id});
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  for(let n=0;n<6000&&s.phase!=='over';n++){
    if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='defense')E.rollDefense(s);else if(s.phase==='result')E.next(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
    else{const [grant,choice]={guard:['grantGuard','aiGuardChoice'],clover:['grantClover','aiCloverChoice'],heart:['grantReraise','aiReraiseChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice']}[s.phase];E[grant](s,E[choice](s));}
  }
  assert.equal(s.phase,'over');E.assertState(s);return s;
}
const report={tests:[],errors:[],geometry:[],screenshots:[],isolation:'Ephemeral Chrome profile and IndexedDB; user data untouched.'};
let browser,context,page;
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v3.game')));
async function test(name,fn){await fn();report.tests.push(name);console.log('PASS '+name);}
async function shot(name){const file=path.join(out,name+'.png');await page.screenshot({path:file});report.screenshots.push(file);}
async function fit(label){
  await page.locator('#match-dialog img').evaluateAll(ns=>Promise.all(ns.map(n=>n.decode())));
  const g=await page.locator('#match-dialog').evaluate(d=>{
    const r=d.getBoundingClientRect(),visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';
    const panels=[d,...d.querySelectorAll('.match-report,.match-view,.match-palmares,.match-awards,.match-mvp,.match-award,.match-lineup,.match-table-scroll,.match-team-stats,.match-definitions')].filter(visible);
    return {viewport:[innerWidth,innerHeight],rect:r.toJSON(),overflow:panels.filter(n=>n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2).map(n=>({class:n.className,w:n.clientWidth,sw:n.scrollWidth,h:n.clientHeight,sh:n.scrollHeight})),
      outside:[...d.querySelectorAll('button,.award-value,.award-label,.award-identity,.mvp-metrics')].filter(visible).flatMap(n=>{const b=n.getBoundingClientRect();return b.left<r.left||b.right>r.right+1||b.top<r.top||b.bottom>r.bottom+1?[{class:n.className,rect:b.toJSON()}]:[];}),
      collisions:[...d.querySelectorAll('article[data-award-unit]')].filter(visible).flatMap(n=>{const a=n.querySelector('.award-inspect').getBoundingClientRect(),b=n.querySelector('.award-value').getBoundingClientRect();return Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1?[n.dataset.spotlight]:[];}),
      images:[...d.querySelectorAll('.award-art')].filter(visible).map(n=>({src:n.getAttribute('src'),natural:n.naturalWidth,rect:n.getBoundingClientRect().toJSON()}))};
  });report.geometry.push({label,...g});assert.ok(g.rect.x>=0&&g.rect.y>=0&&g.rect.right<=g.viewport[0]+1&&g.rect.bottom<=g.viewport[1]+1,JSON.stringify(g));assert.deepEqual(g.overflow,[],JSON.stringify(g));assert.deepEqual(g.outside,[],JSON.stringify(g));assert.deepEqual(g.collisions,[],JSON.stringify(g));assert.ok(g.images.every(i=>i.natural>500&&i.rect.width>80&&i.rect.height>80),JSON.stringify(g));return g;
}
async function run(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  context=await browser.newContext({viewport:{width:1600,height:1080},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.stack));
  await page.goto(pathToFileURL(path.join(site,'index.html')).href+'#arena');await page.waitForFunction(()=>window.KALISTAR_READY&&window.KALISTAR_DB);await page.locator('#game-file').waitFor({state:'attached'});
  const final=finished(),stats=E.matchStats(final);
  await page.locator('#game-file').setInputFiles({name:'palmares-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(final))});
  await page.waitForFunction(id=>JSON.parse(localStorage.getItem('kalistar.v3.game'))?.matchId===id,final.matchId);await page.locator('#match-dialog[open]').waitFor();
  const original=await state(),owners=await page.evaluate(()=>KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER));
  await test('Completed match opens the illustrated palmares with exact side scores and five real distinctions',async()=>{
    assert.equal(await page.locator('.match-report').getAttribute('data-tab'),'awards');
    for(const side of [0,1])assert.equal(await page.locator(`[data-score-side="${side}"] .match-final-score`).innerText(),String(stats.teams[side].kills));
    assert.equal(await page.locator('[data-score-side][data-winner=true]').getAttribute('data-score-side'),String(final.winner));
    for(const metric of ['rating','kills','holds','support','debuff']){
      const card=page.locator(`article[data-spotlight="${metric}"]`),uid=await card.getAttribute('data-award-unit'),unit=stats.units.find(u=>u.uid===uid);
      assert.ok(unit);assert.equal(unit[metric],Math.max(...stats.units.map(u=>u[metric])));
      assert.ok((await card.locator('.award-art').getAttribute('src')).startsWith('../assets/illustrations/'));
      assert.equal((await card.locator('.award-value').innerText()).split('\n')[0],unit[metric].toLocaleString('fr-FR'));
    }
    const uid=await page.locator('.match-mvp').getAttribute('data-award-unit'),unit=stats.units.find(u=>u.uid===uid);
    for(const key of ['kills','holds','attack','defense'])assert.equal(await page.locator(`[data-mvp-stat=${key}]`).innerText(),unit[key].toLocaleString('fr-FR'));
  });
  await test('Large artwork windows fit desktop, tablet and mobile without scrolling; every distinction stays reachable',async()=>{
    for(const [width,height]of [[1600,1080],[2560,1440],[1280,720],[900,900],[390,844],[360,640],[320,480],[844,390]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(170);await page.locator('[data-action=stats-tab][data-id=awards]').click();
      const compact=await page.locator('.match-spotlight-tabs').isVisible();
      if(compact)for(const key of ['rating','kills','holds','support','debuff']){await page.locator(`[data-action=stats-spotlight][data-id=${key}]`).click();await fit(width+'-'+height+'-'+key);assert.equal(await page.locator('article[data-spotlight]:visible').count(),1);}
      else{const g=await fit(width+'-'+height);assert.equal(g.images.length,5);assert.ok(g.rect.width>Math.min(width*.92,1880));}
      if(compact)await page.locator('[data-action=stats-spotlight][data-id=rating]').click();await shot('awards-'+width+'x'+height);
      for(const tab of ['teams','lineup','definitions']){
        await page.locator(`[data-action=stats-tab][data-id=${tab}]`).click();await fit(width+'-'+height+'-'+tab);
        if(tab==='teams'&&width>640&&height>=850)assert.equal(await page.locator('.team-comparison').count(),6);
        if(width===1600)await shot(tab+'-'+width+'x'+height);
      }
    }
  });
  await test('Illustration inspection returns to the same award and archived names use current trusted visuals',async()=>{
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(170);await page.locator('[data-action=stats-tab][data-id=awards]').click();await page.locator('[data-action=stats-spotlight][data-id=kills]').click();
    const uid=await page.locator('.award-kills').getAttribute('data-award-unit');await page.locator('.award-kills [data-action=detail]').click();await page.locator('#detail-dialog[open]').waitFor();await page.locator('#detail-dialog [data-action=close]').first().click();
    assert.equal(await page.locator('.award-kills').isVisible(),true);assert.equal(await page.locator('.award-kills').getAttribute('data-award-unit'),uid);
    const archived=await page.evaluate(s=>{
      const profiles=KALISTAR_DATA.cards.map(c=>({...c,name:'Archive '+c.name,title:'Ancienne version',art:'https://invalid.example/asset.png',slug:'unsafe'})),arenas=KALISTAR_DATA.arenas.map(a=>({...a,name:'Ancienne arène',image:'https://invalid.example/bg.png'}));
      const doc=new DOMParser().parseFromString(KalistarMatchReport.render(s,{tab:'awards',profiles,arenas}),'text/html');
      return {name:doc.querySelector('.award-identity b').textContent,arena:doc.querySelector('.match-outcome p').textContent,images:[...doc.querySelectorAll('.award-art')].map(n=>n.getAttribute('src')),style:doc.querySelector('.match-report').getAttribute('style')};
    },final);assert.match(archived.name,/^Archive /);assert.match(archived.arena,/Ancienne arène/);assert.ok(archived.images.every(src=>!src.includes('invalid.example')&&!src.includes('unsafe')));assert.ok(!archived.style.includes('invalid.example'));
  });
  await test('All tied winners remain accessible and tab keyboard navigation keeps the report open',async()=>{
    const count=Number(await page.locator('.match-report').getAttribute('data-report-pages'));
    for(let i=0;i<count;i++){const uid=await page.locator('.match-mvp').getAttribute('data-award-unit');assert.ok(stats.units.some(u=>u.uid===uid));if(i<count-1)await page.locator('[data-action=stats-award][aria-label="Page suivante"]').click();}
    assert.equal(await page.locator('[data-action=stats-award][aria-label="Page suivante"]').isDisabled(),true);
    await page.locator('[data-action=stats-spotlight][data-id=rating]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.match-report').getAttribute('data-spotlight'),'kills');
    await page.locator('[data-action=stats-tab][data-id=awards]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.match-report').getAttribute('data-tab'),'teams');assert.equal(await page.locator('#match-dialog').getAttribute('open'),'');
  });
  await test('Reveal animations are finite and reduced motion disables them',async()=>{
    await page.setViewportSize({width:1600,height:1080});await page.waitForTimeout(170);await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-action=stats-tab][data-id=awards]').click();
    const animations=await page.locator('.match-mvp,.match-award').evaluateAll(ns=>ns.map(n=>({name:getComputedStyle(n).animationName,duration:getComputedStyle(n).animationDuration,count:getComputedStyle(n).animationIterationCount})));
    assert.ok(animations.some(a=>a.name!=='none'));assert.ok(animations.every(a=>a.count!=='infinite'&&parseFloat(a.duration)<=1));
    await page.emulateMedia({reducedMotion:'reduce'});assert.ok((await page.locator('.match-mvp,.match-award').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).animationName))).every(n=>n==='none'));
  });
  await test('Export, close and rematch controls preserve completed results and ownership',async()=>{
    const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=export-stats]').click();const download=await downloadPromise;
    const payload=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.deepEqual(payload,stats);
    await page.locator('.match-report-actions [data-action=close]').click();assert.equal(await page.locator('#match-dialog').getAttribute('open'),null);assert.deepEqual(await state(),original);
    await page.locator('[data-action=match-stats]').click();await page.locator('[data-action=rematch]').click();await page.locator('#new-game-dialog[open]').waitFor();await page.locator('#new-game-dialog [data-action=close]').first().click();
    assert.deepEqual(await state(),original);assert.deepEqual(await page.evaluate(()=>KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER)),owners);assert.deepEqual(report.errors,[]);
  });
}
run().catch(async e=>{report.failure=e.stack;console.error(e);process.exitCode=1;try{await shot('failure');}catch{}}).finally(async()=>{await browser?.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));});
