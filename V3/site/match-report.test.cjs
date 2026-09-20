'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const {createEngine}=require('./engine.js');
const {createData}=require('./engine-fixtures.cjs');
const site=__dirname,root=path.resolve(site,'..');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(site,'data.js'),'utf8'),sandbox);
const data=JSON.parse(JSON.stringify(sandbox.window.KALISTAR_DATA));
const core=['kills','holds','attack','defense','clovers','hearts'],extras=['debuff','support','reraises','luckUsed','rating'];
const units=Array.from({length:20},(_,i)=>({uid:Math.floor(i/10)+'-'+i%10,side:Math.floor(i/10),cardId:data.cards[i%10].id,
  instanceId:`K3-${data.cards[i%10].id}-00${Math.floor(i/10)+1}`,participated:i%4!==0,
  kills:i%5,holds:i%7,attack:12345+i,defense:45678+i,clovers:9+i,hearts:17+i,
  debuff:i*30,support:i%3,reraises:100+i,luckUsed:200+i,rating:42}));
const stats={units,teams:[0,1].map(side=>Object.fromEntries([...core,...extras].map(key=>[key,units.filter(u=>u.side===side).reduce((sum,u)=>sum+u[key],0)]))),exchanges:50,partial:true,fromRound:17};
const state={phase:'over',winner:0,mode:'local',seed:'RAPPORT-ARCHIVE-AVEC-UN-NOM-DE-RENCONTRE-TRES-LONG'};
const output=fs.mkdtempSync(path.join(os.tmpdir(),'kalistar-match-report-'));
const report={tests:[],geometry:[],screenshots:[],browserErrors:[],output};
let browser,page;
async function test(name,run){
  try{await run();report.tests.push({name,ok:true});console.log('PASS '+name);}
  catch(error){report.tests.push({name,ok:false,error:error.stack});console.error('FAIL '+name+': '+error.message);await page?.screenshot({path:path.join(output,'failure-'+report.tests.length+'.png')}).catch(()=>{});}
}
async function render(options={}){await page.evaluate(options=>window.drawReport(options),options);}
const ids=()=>page.locator('[data-stat-unit]').evaluateAll(rows=>rows.map(row=>row.dataset.statUnit));
async function geometry(){
  return page.evaluate(()=>{
    const dialog=document.querySelector('#match-dialog'),box=dialog.getBoundingClientRect(),issues=[];
    const selectors=['#match-dialog','.match-report','.match-view','.match-lineup','.match-table-scroll','.match-definitions','.match-palmares','.match-awards','.match-team-stats'];
    for(const selector of selectors)for(const node of document.querySelectorAll(selector)){
      if(node.scrollWidth>node.clientWidth+1||node.scrollHeight>node.clientHeight+1)issues.push({type:'overflow',selector,client:[node.clientWidth,node.clientHeight],scroll:[node.scrollWidth,node.scrollHeight]});
    }
    for(const node of dialog.querySelectorAll('button,dd,.match-pagination,.match-table td')){
      const r=node.getBoundingClientRect();
      if(r.width&&r.height&&(r.left<box.left||r.right>box.right||r.top<box.top||r.bottom>box.bottom))issues.push({type:'outside-dialog',text:node.textContent.slice(0,60),rect:[r.x,r.y,r.width,r.height]});
    }
    for(const row of dialog.querySelectorAll('.match-table tbody tr')){
      const bounds=row.getBoundingClientRect();
      for(const node of row.querySelectorAll('th,td,.match-unit')){
        const r=node.getBoundingClientRect();
        if(r.top<bounds.top-1||r.bottom>bounds.bottom+1)issues.push({type:'outside-row',uid:row.dataset.statUnit,element:node.tagName,row:[bounds.top,bounds.bottom],content:[r.top,r.bottom]});
      }
      for(const cell of row.querySelectorAll('td')){
        const range=document.createRange();range.selectNodeContents(cell);const r=range.getBoundingClientRect();
        if(r.top<bounds.top||r.bottom>bounds.bottom-1)issues.push({type:'value-crosses-row-border',uid:row.dataset.statUnit,metric:cell.dataset.stat,row:[bounds.top,bounds.bottom],text:[r.top,r.bottom]});
      }
      if(innerWidth<=640){
        const identity=row.querySelector('.match-unit').getBoundingClientRect(),values=[...row.querySelectorAll('td')].map(cell=>cell.getBoundingClientRect());
        if(values.some(r=>r.top<identity.bottom))issues.push({type:'identity-value-overlap',uid:row.dataset.statUnit});
      }
    }
    for(const button of dialog.querySelectorAll('.match-table .match-unit')){
      const img=button.querySelector('img'),text=button.querySelector('span'),a=img.getBoundingClientRect(),b=text.getBoundingClientRect();
      const portraitWidth=innerWidth>640&&innerHeight>650?42:34;
      if(Math.abs(a.width-portraitWidth)>.1||b.left<a.right+5||getComputedStyle(button).justifyContent!=='start')issues.push({type:'identity-alignment',uid:button.getAttribute('aria-label'),portrait:a.width,textLeft:b.left,portraitRight:a.right});
      if(!img.complete||!img.naturalWidth)issues.push({type:'missing-image',src:img.src});
    }
    return {viewport:[innerWidth,innerHeight],tab:document.querySelector('.match-report').dataset.tab,issues};
  });
}
async function run(){
  const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const {chromium}=createRequire(path.join(modules,'__match_report__.cjs'))('playwright');
  browser=await chromium.launch({channel:process.env.KALISTAR_BROWSER||'chrome',headless:true});
  page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',error=>report.browserErrors.push(error.message));
  const styles=[...fs.readFileSync(path.join(site,'index.html'),'utf8').matchAll(/<link[^>]*href="([^"]+\.css)"/g)].map(match=>match[1]);
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname!=='localhost')return route.abort();
    if(url.pathname==='/site/report-test')return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="fr"><head>${styles.map(file=>`<link rel="stylesheet" href="${file}">`).join('')}</head><body><dialog id="match-dialog" aria-label="Bilan du match"></dialog></body></html>`});
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep))return route.fulfill({status:403,body:''});
    try{return route.fulfill({body:fs.readFileSync(file),contentType:{'.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png'}[path.extname(file)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('http://localhost:39875/site/report-test');
  await page.evaluate(({data,stats,state})=>{
    window.KALISTAR_DATA=data;window.reportStats=stats;window.reportState=state;
    window.KalistarEngine={createEngine:()=>({byId:Object.fromEntries(data.cards.map(c=>[c.id,c])),matchStats:()=>reportStats})};
  },{data,stats,state});
  await page.addScriptTag({path:path.join(site,'assets/lucide.min.js')});
  await page.addScriptTag({path:path.join(site,'match-report.js')});
  await page.evaluate(()=>{
    window.drawReport=options=>{
      window.reportOptions={...options};const dialog=document.querySelector('#match-dialog');
      dialog.innerHTML='<div class="dialog-head"><h2>Statistiques du match</h2><button type="button" aria-label="Fermer">X</button></div>'+KalistarMatchReport.render(reportState,reportOptions);
      lucide.createIcons();if(!dialog.open)dialog.showModal();
      return Promise.all([...dialog.querySelectorAll('img')].map(img=>img.decode()));
    };
    // Dedicated renderer harness: application event wiring is owned by the parent.
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
      const field={'stats-tab':'tab','stats-page':'page','stats-side':'side','stats-sort':'sort','stats-group':'group','stats-award':'award'}[button.dataset.action];
      if(!field)return;
      const options={...reportOptions,[field]:button.dataset.id};if(!['page','award'].includes(field))options.page=0;
      drawReport(options);
    });
  });
  await test('Fallback core icons and granted clovers/hearts use exact per-UID values',async()=>{
    await render();assert.equal(await page.locator('[role=tab][aria-selected=true]').getAttribute('data-id'),'lineup');
    assert.deepEqual(await page.locator('.match-table [data-action=stats-sort]').evaluateAll(nodes=>nodes.map(n=>n.dataset.id)),core);
    assert.deepEqual(await page.locator('.match-table [data-action=stats-sort]').evaluateAll(nodes=>nodes.map(n=>n.querySelector('svg').getAttribute('data-lucide'))),['skull','ban','sword','shield','clover','heart']);
    for(const uid of await ids())for(const key of core){const u=units.find(u=>u.uid===uid);assert.equal(Number(await page.locator(`[data-stat-unit="${uid}"] [data-stat="${key}"]`).getAttribute('data-value')),u[key]);}
    assert.equal(await page.locator('.match-definitions').count(),0);
  });
  await test('All 20 units including unused reserves and duplicate versions are reachable exactly once',async()=>{
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:844});await render();const seen=[];
      const count=Number(await page.locator('.match-report').getAttribute('data-report-pages'));
      for(let pageIndex=0;pageIndex<count;pageIndex++){assert.equal(Number(await page.locator('.match-report').getAttribute('data-report-page')),pageIndex);seen.push(...await ids());if(pageIndex<count-1)await page.getByRole('button',{name:'Page suivante',exact:true}).click();}
      assert.deepEqual(seen,[...units].sort((a,b)=>b.kills-a.kills||a.uid.localeCompare(b.uid)).map(u=>u.uid));assert.equal(new Set(seen).size,20);
      assert.equal(await page.getByRole('button',{name:'Page suivante',exact:true}).isDisabled(),true);
      await render({side:1,page:999});assert((await ids()).every(id=>id.startsWith('1-')));
      await render({side:'0',page:-3});assert((await ids()).every(id=>id.startsWith('0-')));
    }
  });
  await test('Sort always belongs to visible columns, with kills/core and debuff/extras defaults',async()=>{
    for(const [options,key] of [[{},'kills'],[{sort:'rating'},'kills'],[{sort:'hearts'},'hearts'],[{group:'extras',sort:'kills'},'debuff'],[{group:'extras',sort:'rating'},'rating'],[{group:'extras',sort:'luckUsed'},'luckUsed'],[{group:'extras',sort:'invalid'},'debuff']]){
      await render(options);
      assert.equal(await page.locator('.match-table th[aria-sort=descending]').count(),1);
      assert.equal(await page.locator('.match-table th[aria-sort=descending] button').getAttribute('data-id'),key);
      assert.equal(await page.locator('.match-table [data-lucide=arrow-down]').count(),1);
      const expected=[...units].sort((a,b)=>b[key]-a[key]||a.uid.localeCompare(b.uid)).map(u=>u.uid);
      const visible=await ids();assert.deepEqual(visible,expected.slice(0,visible.length));
    }
    await render({sort:'kills'});await page.locator('[data-action=stats-group][data-id=extras]').click();
    assert.equal(await page.locator('.match-table th[aria-sort=descending] button').getAttribute('data-id'),'debuff');
  });
  await test('Global metric labels and definitions are read at render time; extras stay distinct',async()=>{
    await page.addScriptTag({path:path.join(site,'match-metrics.js')});
    await render({tab:'definitions',group:'core'});
    assert.equal(await page.locator('[data-definition]').count(),3);
    const metrics=await page.evaluate(()=>KalistarMatchMetrics.core);
    assert.equal(await page.locator('[data-definition=kills] dd').innerText(),metrics[0].help);
    await render({tab:'definitions',group:'core',page:1});assert.match(await page.locator('[data-definition=defense] dd').innerText(),/ward/i);
    await render({group:'extras'});
    assert.deepEqual(await page.locator('.match-table [data-action=stats-sort]').evaluateAll(nodes=>nodes.map(n=>n.dataset.id)),extras);
    await render({tab:'teams',group:'core',page:1});
    for(const key of ['clovers','hearts']){const values=await page.locator(`.team-comparison[data-stat="${key}"]>b`).allTextContents();assert.deepEqual(values.map(s=>Number(s.replace(/\s/g,''))),stats.teams.map(t=>t[key]));}
  });
  await test('Twenty tied MVPs have bounded captions and navigation to every UID',async()=>{
    const seen=[];
    for(let award=0;award<20;award++){await render({tab:'awards',award});seen.push(await page.locator('.match-mvp').getAttribute('data-award-unit'));assert.equal(await page.locator('.match-mvp .match-unit').count(),1);assert.equal(await page.locator('details.award-ties').count(),0);}
    assert.deepEqual(seen,units.map(u=>u.uid));assert.equal(await page.locator('.match-report').getAttribute('data-report-pages'),'20');
    await render({tab:'awards',award:999});assert.equal(await page.locator('.match-report').getAttribute('data-report-page'),'19');
  });
  await test('Spotlights only change presentation; scores, leaders and MVP metrics remain exact',async()=>{
    for(const spotlight of ['rating','kills','holds','support','debuff']){
      await render({tab:'awards',spotlight});
      assert.equal(await page.locator('article[data-featured=true]').count(),1);assert.equal(await page.locator('article[data-featured=true]').getAttribute('data-spotlight'),spotlight);
      for(const side of [0,1])assert.equal(await page.locator(`[data-score-side="${side}"] .match-final-score`).innerText(),stats.teams[side].kills.toLocaleString('fr-FR'));
      const uid=await page.locator('.match-mvp').getAttribute('data-award-unit'),unit=units.find(u=>u.uid===uid);
      for(const key of ['kills','holds','attack','defense'])assert.equal(await page.locator(`[data-mvp-stat="${key}"]`).innerText(),unit[key].toLocaleString('fr-FR'));
    }
    await render({tab:'awards',spotlight:'invalid'});assert.equal(await page.locator('article[data-featured=true]').getAttribute('data-spotlight'),'rating');
    assert.deepEqual(await page.evaluate(()=>reportStats),stats);
  });
  await test('Archived names and titles survive sorting, pagination and awards; unsafe text is escaped',async()=>{
    const profiles=data.cards.map(c=>({...c,name:'Archive '+c.name,title:'Ancien <script>alert(1)</script> '+c.title,slug:'untrusted'}));
    const before=JSON.stringify({stats,profiles,state});
    for(const tab of ['lineup','awards']){await render({tab,profiles,sort:'hearts'});assert((await page.locator('.match-unit b').allTextContents()).every(name=>name.startsWith('Archive ')));assert.equal(await page.locator('#match-dialog script').count(),0);assert(!(await page.locator('.match-unit img').first().getAttribute('src')).includes('untrusted'));}
    assert.equal(JSON.stringify({stats,profiles,state}),before);
    assert.deepEqual(await page.evaluate(()=>reportStats),stats);
  });
  await test('Actual engine support events render granted values without consumed-token substitution',async()=>{
    const d=createData(),E=createEngine(d),s=E.newGame(d.decks.player,d.decks.enemy);E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
    E.lock(s,2,0);E.rollAttack(s,1);E.grantClover(s,s.players[0].board[0].uid);E.next(s);
    E.lock(s,4,0);E.rollAttack(s,1);E.grantReraise(s,s.players[1].board[0].uid);
    const real=E.matchStats(s);await page.evaluate(({s,real})=>{window.reportState=s;window.reportStats=real;},{s,real});
    await render({sort:'clovers'});assert.equal(await page.locator('[data-stat-unit="0-2"] [data-stat=clovers]').getAttribute('data-value'),'1');
    await render({sort:'hearts'});assert.equal(await page.locator('[data-stat-unit="1-4"] [data-stat=hearts]').getAttribute('data-value'),'1');
    await page.evaluate(({state,stats})=>{window.reportState=state;window.reportStats=stats;},{state,stats});
  });
  await test('Setup keeps all reserves and zero counters, with no premature awards or rematch',async()=>{
    const d=createData(),E=createEngine(d),s=E.newGame(d.decks.player,d.decks.enemy),real=E.matchStats(s);
    assert.equal(s.phase,'setup');assert.equal(real.units.length,20);
    await page.evaluate(({s,real})=>{window.reportState=s;window.reportStats=real;},{s,real});
    try{
      for(const viewport of [{width:1440,height:1000},{width:844,height:390},{width:360,height:640}]){
        await page.setViewportSize(viewport);
        for(const tab of ['lineup','awards','teams','definitions']){
          await render({tab});assert.deepEqual((await geometry()).issues,[]);
          assert.equal(await page.locator('.match-outcome h2').innerText(),'Match en cours');
          assert.equal(await page.locator('.match-partial,[data-action=rematch]').count(),0);
          if(tab==='lineup')assert((await page.locator('.match-table [data-value]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.value)))).every(value=>value===0));
          if(tab==='awards'){
            assert.equal(await page.locator('[data-award-unit]').count(),0);assert.equal(await page.locator('.award-empty').count(),5);
            assert.equal(await page.locator('[data-action=stats-award]:not(:disabled)').count(),0);
            assert.equal(await page.locator('.match-report').getAttribute('data-report-pages'),'1');
          }
        }
      }
    }finally{await page.evaluate(({state,stats})=>{window.reportState=state;window.reportStats=stats;},{state,stats});}
  });
  for(const viewport of [{width:1440,height:1000},{width:1280,height:720},{width:390,height:844},{width:360,height:640},{width:320,height:568},{width:844,height:390},{width:320,height:480}]){
    await test(`All tabs fit without scroll and identities align at ${viewport.width}x${viewport.height}`,async()=>{
      await page.setViewportSize(viewport);
      for(const tab of ['lineup','awards','teams','definitions'])for(const group of ['core','extras']){
        await render({tab,group});const g=await geometry();report.geometry.push(g);assert.deepEqual(g.issues,[],JSON.stringify(g));
      }
      for(const tab of ['lineup','awards']){await render({tab});const file=path.join(output,`${tab}-${viewport.width}x${viewport.height}.png`);await page.screenshot({path:file});report.screenshots.push(file);}
    });
  }
  await test('No browser errors and input statistics are unchanged',async()=>{assert.deepEqual(report.browserErrors,[]);assert.deepEqual(await page.evaluate(()=>reportStats),stats);});
}
run().catch(error=>{report.fatal=error.stack;process.exitCode=1;}).finally(async()=>{
  await browser?.close();report.passed=report.tests.filter(t=>t.ok).length;report.failed=report.tests.filter(t=>!t.ok).length;report.ok=!report.fatal&&!report.failed;
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
  console.log(JSON.stringify({ok:report.ok,passed:report.passed,failed:report.failed,fatal:report.fatal,output},null,2));
});
