'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const {inside,DIST:defaultDist}=require('../deploy/build.cjs');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_map_portraits_qa.cjs'))('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||defaultDist);
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/map-portraits'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.mp4':'video/mp4'};
async function main(){
 let browser;
 const server=http.createServer((req,res)=>{
  try{
   let rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'');
   if(rel==='map-component.html'){
    res.setHeader('Content-Type',mime['.html']);
    res.end('<!doctype html><html><head><meta charset="utf-8"><base href="/jeu/"><link rel="stylesheet" href="map-view.css"><style>body{margin:0;height:100dvh}#map-root{height:100dvh}</style><script defer src="site-config.js"></script><script defer src="map-view.js"></script></head><body><main id="map-root"></main><script>addEventListener("load",()=>{window.testMap=KalistarMap.create();testMap.mount(document.getElementById("map-root"));window.KALISTAR_READY=true;});</script></body></html>');return;
   }
   if(rel.endsWith('/'))rel+='index.html';
   const file=inside(dist,rel);
   res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
   res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));
  }catch{res.writeHead(404);res.end();}
 });
 try{
  fs.mkdirSync(output,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/jeu/';
  browser=await chromium.launch({channel:'chrome',headless:true});
  const results=[],errors=[];
  const ready=page=>page.waitForFunction(()=>window.KALISTAR_READY&&document.querySelector('.map-atlas')?.naturalWidth===1774);
  for(const [name,width,height,touch] of [['desktop',1440,1000,false],['razr',412,1007,true],['small',320,568,true],['landscape',844,390,true],['tablet',768,1024,true]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:'reduce'});
   await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,...args){return open.call(this,name+'-city-portraits-qa-only',...args);};});
   const page=await context.newPage(),requests=[];
   page.on('pageerror',e=>errors.push(name+': '+e.message));
   page.on('request',req=>{if(new URL(req.url()).pathname.includes('/assets/map/portraits/'))requests.push(new URL(req.url()).pathname);});
   await page.goto(base+'#map');await ready(page);
   assert.equal(await page.locator('[data-map-city]').count(),8);
   assert.equal(await page.locator('.map-city-portrait img').count(),0,'closed city descriptions do not create image requests');
   assert.deepEqual(requests,[]);
   const cities=await page.evaluate(()=>KalistarMap.cities.map(c=>({id:c.id,name:c.name,portrait:c.portrait})));
   for(const [index,city] of cities.entries()){
    const button=page.locator('[data-map-city="'+city.id+'"]');
    if(touch)await button.tap();else await button.click();
    const panel=page.locator('#map-city-'+city.id),opener=panel.locator('[data-map-portrait]');
    await panel.locator('.map-city-portrait img').evaluate(img=>img.decode());
    assert.equal(await panel.locator('img').evaluate(img=>img.naturalWidth),768);
    assert.equal(await page.locator('[data-map-city][aria-expanded=true]').count(),1);
    assert.equal(await page.locator('[data-map-landmark="'+city.id+'"]').evaluate(el=>el.classList.contains('is-selected')),true);
    assert(requests.every(url=>url.endsWith('-small.webp')||cities.slice(0,index).some(c=>url.endsWith('/'+path.basename(c.portrait.src)))),'large views are fetched only when opened');
    const portraitBox=await opener.boundingBox();assert(portraitBox.width>=190&&portraitBox.height>=100);
    if(name==='desktop'&&['arborium','vulkar','thalassea'].includes(city.id))await page.screenshot({path:path.join(output,name+'-'+city.id+'.png')});
    if(touch)await opener.tap();else{await opener.focus();await page.keyboard.press('Enter');}
    const dialog=page.locator('.map-portrait-dialog');
    assert.equal(await dialog.evaluate(el=>el.open),true);
    await dialog.locator('img').evaluate(img=>img.decode());
    assert.equal(await dialog.locator('h2').textContent(),city.name);
    assert((await dialog.locator('img').getAttribute('src')).endsWith(path.basename(city.portrait.src)));
    assert.equal(await dialog.locator('img').evaluate(img=>img.naturalWidth),1672);
    const bounds=await dialog.boundingBox();
    assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1,name+' dialog stays in viewport');
    assert.equal(await page.evaluate(()=>{document.querySelector('[data-map-city]').focus();return document.querySelector('.map-portrait-dialog').contains(document.activeElement);}),true,'native modal keeps background inert');
    if(['arborium','thalassea'].includes(city.id))await page.screenshot({path:path.join(output,name+'-'+city.id+'-large.png')});
    if(index===1)await dialog.locator('[data-map-portrait-close]').click();
    else if(index===2)await page.mouse.click(2,2);
    else await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('.map-portrait-dialog').open);
    await page.waitForFunction(()=>!history.state?.kalistarDialogBack);
    assert.equal(await opener.evaluate(el=>el===document.activeElement),true,'closing restores focus to the selected portrait');
    assert.equal(await button.getAttribute('aria-expanded'),'true');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   }
   assert.equal(new Set(requests.filter(p=>p.endsWith('-small.webp'))).size,8);
   assert.equal(new Set(requests.filter(p=>!p.endsWith('-small.webp'))).size,8);
   const oldRequests=requests.filter(p=>p.endsWith('-small.webp')).length;
   await page.locator('[data-map-city="arborium"]').click();
   assert.equal(requests.filter(p=>p.endsWith('-small.webp')).length,oldRequests,'reopening an accordion reuses its existing thumbnail');
   await page.locator('#map-city-arborium [data-map-portrait]').click();
   await page.goBack();
   await page.waitForFunction(()=>!document.querySelector('.map-portrait-dialog').open);
   assert.equal(await page.locator('.kalistar-map').count(),1,'Back closes the image without leaving Map');
   await page.evaluate(()=>{location.hash='collection';});
   await page.locator('.kalistar-map').waitFor({state:'detached'});
   assert.equal(await page.evaluate(()=>document.querySelectorAll('dialog:modal').length),0,'unmount removes an open modal');
   await page.evaluate(()=>{location.hash='map';});await ready(page);
   assert.equal(await page.locator('[data-map-city][aria-expanded=true]').count(),0);
   assert.equal(await page.locator('.map-city-portrait img').count(),0);
   await page.locator('[data-map-city="woodland"]').click();
   await page.locator('#map-city-woodland .map-city-portrait img').evaluate(img=>img.decode());
   await page.locator('#map-city-woodland [data-map-portrait]').click();
   assert.equal(await page.locator('.map-portrait-dialog[open]').count(),1,'one viewer after remount');
   await page.keyboard.press('Escape');
   const layout=await page.evaluate(()=>({canvas:document.querySelector('.map-canvas').getBoundingClientRect().toJSON(),cities:document.querySelector('.map-cities').getBoundingClientRect().toJSON()}));
   if(width<700)assert(layout.cities.bottom<=layout.canvas.top+1,'phone map stays below city details');
   results.push({name,width,height,cities:8,thumbnailOnSelection:true,largeOnClick:true,keyboard:true,focusRestored:true,noOverflow:true,remount:true});
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:412,height:915},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push('failures: '+e.message));
  await context.route('**/assets/map/portraits/durane-02-small.webp',route=>route.abort());
  await context.route('**/assets/map/portraits/arborium-11.webp',route=>route.abort());
  await page.goto(base+'#map');await ready(page);
  await page.locator('[data-map-city="durane"]').click();
  await page.waitForFunction(()=>document.querySelector('#map-city-durane [data-map-portrait]').disabled);
  assert.equal(await page.locator('#map-city-durane .map-portrait-status').isVisible(),true);
  assert.equal(await page.locator('#map-city-durane>p').isVisible(),true,'description survives a failed image');
  await page.locator('[data-map-city="arborium"]').click();
  await page.locator('#map-city-arborium .map-city-portrait img').evaluate(img=>img.decode());
  await page.locator('#map-city-arborium [data-map-portrait]').click();
  await page.waitForFunction(()=>document.querySelector('.map-portrait-dialog .map-portrait-status').textContent==='Illustration indisponible');
  assert.equal(await page.locator('.map-portrait-dialog .map-portrait-status').isVisible(),true);
  await page.locator('[data-map-portrait-close]').click();
  assert.equal(await page.locator('#map-city-arborium [data-map-portrait]').evaluate(el=>el===document.activeElement),true);
  await context.close();
  const standalone=await browser.newContext(),fixture=await standalone.newPage();
  await fixture.goto(new URL('../map-component.html',base).href);await ready(fixture);
  await fixture.locator('[data-map-city="arborium"]').click();
  await fixture.locator('#map-city-arborium [data-map-portrait]').click();
  assert.equal(await fixture.locator('.map-portrait-dialog[open]').count(),1);
  await fixture.evaluate(()=>{testMap.destroy();document.getElementById('map-root').replaceChildren();});
  assert.equal(await fixture.evaluate(()=>document.querySelectorAll('dialog:modal').length),0,'destroy closes an open native modal');
  await standalone.close();
  assert.deepEqual(errors,[]);
  const report={status:'passed',formats:results,failedThumbnailKeepsDescription:true,failedLargeImageCanClose:true,errors,personalBrowserStorageUsed:false};
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
