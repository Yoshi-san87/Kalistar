'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const source=fs.readFileSync(path.join(__dirname,'catalogue.js'),'utf8');
const sandbox={window:{KALISTAR_DATA:{cards:[]}}};
vm.runInNewContext(source,sandbox);
const render=sandbox.window.KalistarCatalogue.careerStatistics;
const value=(html,kind,key)=>html.match(new RegExp('data-career-'+kind+'="'+key+'"[^>]*>([^<]*)<'))[1].replace(/\s/g,'');
const sample={games:3,kills:7,holds:4,attack:1000,defense:902,support:5,debuff:70,reraises:1,mvp:2};
const before=JSON.stringify(sample),html=render(sample);
for(const key of ['kills','holds','attack','defense','support','debuff','reraises','mvp']){
  assert.equal(value(html,'total',key),String(sample[key]));
  assert.equal(value(html,'average',key),(sample[key]/sample.games).toLocaleString('fr-FR',{maximumFractionDigits:1}).replace(/\s/g,''));
}
assert.equal(value(html,'average','kills'),'2,3');
assert.equal(JSON.stringify(sample),before,'formatting never changes stored totals');
assert.equal(value(render({games:0,kills:0}),'average','kills'),'-');
assert.equal(value(render({games:0,kills:0}),'total','kills'),'0');
assert.equal(value(render({games:1,kills:7}),'average','kills'),'7');
assert.equal(value(render({games:10,kills:15}),'average','kills'),'1,5','aggregate uses total participations, not an average of averages');
assert.equal(value(render({games:3}),'average','support'),'0');
console.log('PASS: career means, exact totals, French rounding, zero/one match and weighted aggregate.');

const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__career_statistics__.cjs'))('playwright');
const output=path.join(__dirname,'verification/career-statistics');
let browser;
async function main(){
  fs.mkdirSync(output,{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.KALISTAR_URL||'http://127.0.0.1:4304')+'/jeu/');
  await page.waitForFunction(()=>window.KALISTAR_READY);
  // Read-only fixture adapter in a disposable profile; no registry writes.
  await page.evaluate(()=>{
    const original=KALISTAR_DB.registry,user=KALISTAR_ACTIVE_USER,id=document.querySelector('.cb-card').dataset.id,item=original.owned(user,id)[0],extra={...item,id:'career-test-copy'};
    const base={games:0,wins:0,losses:0,draws:0,kills:0,holds:0,attack:0,defense:0,support:0,debuff:0,reraises:0,mvp:0,history:[]};
    const a={...base,games:3,wins:2,losses:1,kills:6,holds:4,attack:1000,defense:902,support:5,debuff:70,reraises:1,mvp:2};
    const b={...base,games:7,wins:4,losses:2,draws:1,kills:9,holds:10,attack:3040,defense:2577,support:3,debuff:80,reraises:2,mvp:1};
    const history=(count,instanceId)=>Array.from({length:count},(_,i)=>({matchId:'test-career-'+instanceId+'-'+i,instanceId,side:0,winner:0,seed:'CARRIERE-TEST-'+(i+1),finishedAt:'2026-09-21T00:00:00.000Z',kills:1,holds:1}));
    a.history=history(a.games,item.id);b.history=history(b.games,extra.id);
    const all={...base};for(const key of Object.keys(base))if(key!=='history')all[key]=a[key]+b[key];
    all.history=[...a.history,...b.history];
    window.testCareer={id:item.cardId,first:item.id,second:extra.id,all,a,b,base};
    KALISTAR_DB.registry={...original,owned:(u,id)=>{const items=original.owned(u,id);return u===user&&(!id||id===item.cardId)?[...items,extra]:items;},career:(u,id,copy)=>id===item.cardId?(copy===item.id?a:copy===extra.id?b:all):original.career(u,id,copy)};
  });
  const fixture=await page.evaluate(()=>window.testCareer);
  await page.locator('.cb-card[data-id="'+fixture.id+'"]').click();
  await page.locator('[data-binder-action=tab][data-id=career]').click();
  const read=(kind,key)=>page.locator('.cb-career [data-career-'+kind+'="'+key+'"]').textContent();
  assert.equal(await read('average','kills'),'1,5');assert.equal(await read('total','kills'),'15');
  await page.locator('[data-binder-field=instance]').selectOption(fixture.first);
  assert.equal(await read('average','kills'),'2');assert.equal(await read('total','kills'),'6');
  assert.equal(await read('average','attack'),'333,3');
  await page.locator('[data-binder-field=instance]').selectOption(fixture.second);
  assert.equal(await read('average','kills'),'1,3');assert.equal(await read('total','kills'),'9');
  await page.locator('[data-binder-field=instance]').selectOption('all');
  for(const [width,height] of [[1440,1000],[1440,700],[412,1007],[390,844],[320,568],[844,390]]){
    await page.setViewportSize({width,height});
    if(width<700||height<500)await page.locator('[data-binder-action=pane][data-id=notes]').click();
    if(width===1440&&height===1000){
      const metric=await page.locator('.cb-career [data-career-stat=mvp]').boundingBox(),panel=await page.locator('.cb-read-content').boundingBox();
      assert.ok(metric.y+metric.height<=panel.y+panel.height+1,'all career metrics fit the desktop manuscript without scrolling');
    }
    await page.locator('.cb-career [data-career-stat=mvp]').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('.cb-career .career-statistics .lucide').first().evaluate(n=>parseFloat(getComputedStyle(n).width)>=20&&parseFloat(getComputedStyle(n).strokeWidth)>=2),'career icons are visibly larger and stronger');
    assert.ok(await page.locator('.cb-reading-tabs .lucide').first().evaluate(n=>parseFloat(getComputedStyle(n).width)>=20),'notebook tabs keep readable icons');
    const fits=await page.locator('.cb-career .career-statistics').evaluate(table=>{
      const r=table.getBoundingClientRect(),page=table.closest('.cb-read-content').getBoundingClientRect();
      return r.left>=page.left-1&&r.right<=page.right+1&&table.scrollWidth<=table.clientWidth+1;
    });
    assert.ok(fits,'career table fits the manuscript at '+width+'x'+height);
    const row=await page.locator('.cb-career [data-career-stat=mvp]').boundingBox(),panel=await page.locator('.cb-read-content').boundingBox();
    assert.ok(row.y+row.height<=panel.y+panel.height+1,'last metric stays reachable');
    await page.locator('.cb-read-content').evaluate(n=>{n.scrollTop=0;});
    await page.screenshot({path:path.join(output,'career-'+width+'x'+height+'.png')});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>{
    const f=window.testCareer,dialog=document.getElementById('detail-dialog');
    dialog.innerHTML='<div class="dialog-body">'+KalistarCatalogue.career(f.id,{instances:()=>[{id:f.first},{id:f.second}],career:(_,id)=>id===f.first?f.a:id===f.second?f.b:f.all})+'</div>';dialog.showModal();lucide.createIcons();
  });
  assert.equal(await page.locator('.career-panel [data-career-average=kills]').textContent(),'1,5');
  assert.equal(await page.locator('.career-panel [data-career-total=kills]').textContent(),'15');
  await page.screenshot({path:path.join(output,'detail-career.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS: collection/detail career, instance selection, totals and averages across desktop/Razr/small phone/landscape.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
