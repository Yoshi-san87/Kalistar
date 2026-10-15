'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__position_identities__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));const url=(built?'https://kalistar-identities-qa.invalid/Kalistar':process.env.KALISTAR_URL||'http://127.0.0.1:4304')+'/jeu/';
const output=process.env.KALISTAR_VERIFICATION_DIR||path.join(os.tmpdir(),'kalistar-position-identities-qa');
const cards=[
  {id:'49999001',characterId:'shared',name:'SHARED',title:'Support',element:'ELECTRO',faction:'Chroma',positions:[3,5]},
  {id:'49999002',characterId:'shared',name:'SHARED',title:'Physical',element:'NONE',faction:'FF7',positions:[1,2]},
  {id:'49999003',characterId:'empty',name:'EMPTY',title:'No games',element:'NONE',faction:'Chroma',positions:[4]},
  {id:'49999004',characterId:'other',name:'OTHER',title:'All positions',element:'ELECTRO',faction:'FF7',positions:[1,2,3,4,5]}
].map(c=>({...c,race:'HUMAIN',weapon:'Baton',job:'Artiste',text:'Recit de fixture.',atk:[200,160,130,90,60,30],defense:[200,160,130,90,60,30],magic:[],barriers:[],advantage:30,disadvantage:30,pngUrl:'fixture.png'}));
const data={cards,elements:{ELECTRO:{id:'ELECTRO',label:'Electricite',color:'FFDD00'},NONE:{id:'NONE',label:'Sans cristal',color:'93AAA5'}}};
let browser;
async function main(touch){
  fs.mkdirSync(output,{recursive:true});
  browser=browser||await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:touch,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],device=touch?'touch':'mouse';
  page.on('pageerror',error=>errors.push(error.message));
  if(built)await context.route('https://kalistar-identities-qa.invalid/**',route=>{
    const name=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,name.endsWith('/')?name+'index.html':name);
    assert(file.startsWith(dist+path.sep));if(!fs.existsSync(file))return route.fulfill({status:404,body:'Missing asset '+name});
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
    return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
  });
  // Load current shared assets and styles, but never boot the app or open browser storage.
  const styles=[...fs.readFileSync(path.join(__dirname,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${url+m[1]}">`).join('');
  const fixtureURL=url+'position-identities-fixture.html';
  await page.route(fixtureURL,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><base href="'+url+'">'+styles+'</head><body class="collection-view"><main id="app"></main></body></html>'}));
  await page.goto(fixtureURL);
  await page.evaluate(data=>{window.KALISTAR_DATA=data;},data);
  for(const file of ['assets/lucide.min.js','positions.js','factions.js','collaborations.js','performance-index.js','trophies.js','catalogue.js','collection-binder.js','statistics.js'])await page.addScriptTag({url:url+file});
  await page.evaluate(()=>{
    const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII=';
    const cards=KALISTAR_DATA.cards,instances=cards.map(c=>({id:'copy-'+c.id,cardId:c.id}));
    const history=(card,ratingVersion,kills)=>({cardId:card.id,uid:'unit-'+card.id+'-'+ratingVersion,instanceId:'copy-'+card.id,side:0,winner:0,participated:true,partial:false,matchId:'fixture-'+card.id+'-'+ratingVersion,seed:'FIXTURE',finishedAt:'2026-10-11T00:00:00Z',ratingVersion,rating:10*ratingVersion,kills,assists:ratingVersion>1?ratingVersion:undefined,valuedAttack:ratingVersion===3?210:undefined,trophies:['killer']});
    window.fixtureHistories=[history(cards[0],1,2),history(cards[0],2,3),history(cards[1],3,4),history(cards[3],3,1)];
    window.fixtureDB={instances:id=>instances.filter(i=>!id||i.cardId===id),matches:()=>[],career:id=>({history:fixtureHistories.filter(h=>h.cardId===id)})};
    window.fixtureBefore=JSON.stringify({cards,histories:fixtureHistories});
    window.fixtureDetails=[];
    window.KalistarCardMedia={image:()=>pixel};
    window.fixtureBinder=KalistarCollection.create({data:KALISTAR_DATA,getOwned:fixtureDB.instances});
    fixtureBinder.mount(document.querySelector('#app'));
  });
  const ready=()=>page.waitForFunction(()=>[...document.querySelectorAll('.position-emblem img')].every(i=>i.complete&&i.naturalWidth===128&&i.naturalHeight===128));
  const positions=selector=>page.locator(selector+' [data-position-icon]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.positionIcon)));
  const noCodes=async selector=>assert(!/\bP[1-5]\b/.test(await page.locator(selector).innerText()),'normal identity controls show no position codes');
  const fits=async selector=>assert(await page.locator(selector).evaluate(n=>{
    const r=n.getBoundingClientRect();return [...n.querySelectorAll('.position-emblem,.position-choice')].filter(i=>i.getClientRects().length).every(i=>{const b=i.getBoundingClientRect();return b.width>0&&b.height>0&&b.left>=r.left-1&&b.right<=r.right+1;});
  }),selector+' positions fit');

  await page.locator('[data-binder-action=filters]').click();
  const cb=page.locator('[data-binder-filter=position]'),cbValue=value=>page.locator('[data-binder-filter=position][value="'+value+'"]');
  assert.equal(await cb.count(),6);
  await cbValue('3').check();
  assert.equal(await page.evaluate(()=>fixtureBinder.inspect().filters.position),'3');
  assert.match(await page.locator('.cb-count').textContent(),/2 versions/);
  assert.deepEqual(await page.locator('.cb-pocket').evaluateAll(ns=>ns.map(n=>n.dataset.cardId)),['49999001','49999004']);
  assert.equal(await page.evaluate(()=>document.activeElement.value),'3');
  await cbValue('3').press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement.value),'4');
  assert.equal(await page.evaluate(()=>fixtureBinder.inspect().filters.position),'4');
  await cbValue('4').press('ArrowRight');
  assert.equal(await page.evaluate(()=>fixtureBinder.inspect().filters.position),'5');
  assert.equal(await page.evaluate(()=>document.activeElement.value),'5');
  await cbValue('5').check();assert.equal(await page.evaluate(()=>fixtureBinder.inspect().filters.position),'5');
  const formValue=await page.locator('.cb-filter-positions').evaluate(n=>{
    const form=document.createElement('form');form.append(n.cloneNode(true));return new FormData(form).get('position');
  });assert.equal(formValue,'5');
  await noCodes('.cb-filter-positions');await ready();await fits('.cb-filter-positions');
  await cbValue('').check();assert.equal(await page.evaluate(()=>fixtureBinder.inspect().filters.position),'');
  await page.locator('.cb-filter-actions [data-binder-action=close-overlay]').click();
  await page.locator('[data-binder-action=open][data-id="49999001"]').click();
  await page.locator('[data-binder-action=tab][data-id=profile]').click();
  assert.equal(await page.evaluate(()=>fixtureBinder.inspect().tab),'profile');
  assert.deepEqual(errors,[]);
  await page.waitForSelector('.cb-identity-positions');
  assert.deepEqual(await positions('.cb-identity-positions'),[3,5]);
  await page.locator('.cb-versions [data-id="49999002"]').click();
  assert.deepEqual(await positions('.cb-identity-positions'),[1,2]);
  assert.equal(await page.evaluate(()=>fixtureBinder.inspect().selected),'49999002');
  await page.locator('.cb-versions [data-id="49999001"]').click();
  await ready();await noCodes('.cb-identity');
  for(const [width,height]of [[1440,1000],[700,900],[412,1007],[320,568],[844,390],[844,480],[1007,412]]){
    await page.setViewportSize({width,height});
    const notes=page.locator('[data-binder-action=pane][data-id=notes]');if(await notes.isVisible())await notes.click();
    await page.locator('.cb-identity-positions').scrollIntoViewIfNeeded();
    await fits('.cb-identity');await page.screenshot({path:path.join(output,device+'-collection-'+width+'x'+height+'.png'),scale:'css'});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>{
    fixtureBinder.destroy();document.body.className='statistics-view';
    window.fixtureSheet=KalistarStatistics.create({data:KALISTAR_DATA,getDB:()=>fixtureDB,onDetail:id=>fixtureDetails.push(id)});
    fixtureSheet.mount(document.querySelector('#app'));
  });
  await ready();assert.deepEqual(await positions('[data-sheet-row=shared] .sheet-row-positions'),[1,2,3,5]);
  const statsValue=value=>page.locator('[data-sheet-field=position][value="'+value+'"]');
  await statsValue('5').check();
  assert.deepEqual(await positions('[data-sheet-row=shared] .sheet-row-positions'),[3,5]);
  assert.equal(await page.locator('[data-sheet-row=shared] [data-metric=games]').textContent(),'2');
  assert.equal(await page.locator('[data-sheet-row=shared] [data-metric=valuedAttack]').getAttribute('data-empty'),'true');
  assert.equal(await page.locator('.sheet-filter-count').textContent(),'1');
  await noCodes('[data-sheet-row=shared] .sheet-identity');
  assert.match(await page.locator('[data-sheet-row=shared] .sheet-identity button').getAttribute('aria-label'),/P3.*P5/);
  const statsForm=await page.locator('.sheet-position-filter').evaluate(n=>{
    const form=document.createElement('form');form.append(n.cloneNode(true));return new FormData(form).get('position');
  });assert.equal(statsForm,'5');
  assert.equal(await page.evaluate(()=>document.activeElement.value),'5');
  await statsValue('5').press('ArrowLeft');assert.equal(await statsValue('4').isChecked(),true);
  assert.equal(await page.locator('[data-sheet-row=shared]').count(),0);
  await statsValue('').check();
  for(const [width,height]of [[1440,1000],[700,900],[412,1007],[320,568],[844,390],[844,480],[1007,412]]){
    await page.setViewportSize({width,height});await ready();await fits('[data-sheet-row=other] .sheet-identity');
    const filters=page.locator('.sheet-filters');if(!await filters.evaluate(n=>n.open))await filters.locator('summary').click();
    await fits('.sheet-position-filter');await noCodes('.sheet-position-filter');
    await page.locator('[data-sheet-action=close-filters]').evaluate(n=>n.click());
    const accordion=page.locator('[data-sheet-row=shared] [data-sheet-action=accordion]');
    assert.equal(await accordion.count(),width<=699||touch&&width<=1100&&height<=500?1:0,'compact controls follow pointer type at '+device+' '+width+'x'+height);
    if(await accordion.count()){
      await accordion.press('Enter');
      const panel=page.locator('.sheet-detail-row:not([hidden]) .sheet-accordion');
      assert.deepEqual(await positions('.sheet-detail-row:not([hidden]) .sheet-detail-positions'),[1,2,3,5]);
      await noCodes('.sheet-detail-heading');await fits('.sheet-detail-heading');
      assert.equal(await panel.locator('[data-detail-metric=games] dd').textContent(),'3');
      await panel.locator('.sheet-detail-positions').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,device+'-statistics-'+width+'x'+height+'.png'),scale:'css'});
      await panel.locator('[data-sheet-action=detail]').click();assert.equal(await page.evaluate(()=>fixtureDetails.at(-1)),'49999001');
      await accordion.press('Escape');assert.equal(await accordion.getAttribute('aria-expanded'),'false');
    }else await page.screenshot({path:path.join(output,device+'-statistics-'+width+'x'+height+'.png'),scale:'css'});
  }
  await page.evaluate(()=>{
    fixtureSheet.destroy();document.body.className='';
    document.querySelector('#app').innerHTML='<section class="panel">'+KalistarCatalogue.versionStrip('49999001')+KalistarCatalogue.career('49999001',{instances:()=>[],career:()=>({games:1,wins:1,losses:0,draws:0,history:[]})})+'</section>';
  });
  assert.deepEqual(await positions('.career-positions'),[3,5]);await ready();
  for(const [width,height]of [[1440,1000],[412,1007],[320,568]]){
    await page.setViewportSize({width,height});await fits('.detail-versions');await fits('.career-panel');await noCodes('.detail-versions');await noCodes('.career-panel');
    await page.screenshot({path:path.join(output,device+'-catalogue-'+width+'x'+height+'.png'),scale:'css'});
  }
  assert.equal(await page.evaluate(()=>JSON.stringify({cards:KALISTAR_DATA.cards,histories:fixtureHistories})===fixtureBefore),true);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS '+device+': real position assets, Collection/Stats native radios and FormData, keyboard focus, filtered character unions, historical metrics, catalogue career, seven responsive sizes. Screenshots: '+output);
}
main(false).then(()=>main(true)).catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
