'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../..'),dist=process.env.KALISTAR_DIST&&path.resolve(process.env.KALISTAR_DIST);
const output=process.env.KALISTAR_VERIFICATION_DIR||path.join(root,'work/qa/map-wheel');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'_map_wheel.cjs'))('playwright');
const fixture='<!doctype html><html><head><meta charset="utf-8"><base href="/jeu/"><link rel="stylesheet" href="/jeu/map-view.css"><style>body{margin:0;background:#151b19;color:#e4d1b0}.masthead{height:76px}</style><script defer src="/jeu/site-config.js"></script><script defer src="/jeu/map-view.js"></script></head><body class="map-view"><header class="masthead"></header><main id="app"><div id="map-root"></div></main><script>addEventListener("load",()=>{window.wheelMap=KalistarMap.create();wheelMap.mount(document.getElementById("map-root"));window.KALISTAR_READY=true;});</script></body></html>';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4'};
async function main(){
  fs.mkdirSync(output,{recursive:true});let browser;
  const server=http.createServer((req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      res.setHeader('Cache-Control','no-store');
      if(!dist&&pathname==='/'){res.setHeader('Content-Type',mime['.html']);res.end(fixture);return;}
      const base=dist||__dirname,relative=dist?pathname.slice(1):pathname.replace(/^\/jeu\//,'');
      const file=path.resolve(base,relative.endsWith('/')?relative+'index.html':relative);
      assert(file.startsWith(base+path.sep));res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
    }catch{res.writeHead(404);res.end();}
  });
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+(dist?'/jeu/#map':'/'));
    const ready=()=>page.waitForFunction(()=>window.KALISTAR_READY&&document.querySelector('.map-atlas')?.naturalWidth===1774&&[...document.querySelectorAll('.map-landmark img')].every(img=>img.complete&&img.naturalWidth>0));
    await ready();
    const image=page.locator('.map-atlas'),viewport=page.locator('.map-viewport');
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const wheel=(selector,options={})=>page.evaluate(({selector,options})=>{
      const node=document.querySelector(selector),rect=node.getBoundingClientRect();
      const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:-120,clientX:rect.x+rect.width/2,clientY:rect.y+rect.height/2,...options});
      node.dispatchEvent(event);return event.defaultPrevented;
    },{selector,options});
    const initial=(await image.boundingBox()).width;
    await page.screenshot({path:path.join(output,'fit-desktop.png')});
    assert.equal(await wheel('.map-viewport',{ctrlKey:false}),false);await settle();assert.equal((await image.boundingBox()).width,initial);
    assert.equal(await wheel('.map-cities'),false);assert.equal((await image.boundingBox()).width,initial,'Ctrl+wheel outside the map is untouched');
    const box=await viewport.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.keyboard.down('Control');await page.mouse.wheel(0,-120);await page.keyboard.up('Control');
    await page.waitForFunction(width=>document.querySelector('.map-atlas').getBoundingClientRect().width>width,initial);
    assert.equal(await page.evaluate(()=>innerWidth),1440);assert.equal(await page.evaluate(()=>visualViewport.scale),1,'browser page zoom is not used');
    await page.keyboard.down('Control');await page.mouse.wheel(0,120);await page.keyboard.up('Control');await settle();
    await page.locator('[data-map-action=fit]').click();
    await page.locator('[data-map-city=durane]').click();
    await page.locator('[data-map-action=in]').click();await page.locator('[data-map-action=in]').click();
    const area=await viewport.boundingBox(),cursor={x:area.x+area.width*.55,y:area.y+area.height*.55},before=await image.boundingBox();
    const point={x:(cursor.x-before.x)/before.width,y:(cursor.y-before.y)/before.height};
    assert.equal(await wheel('.map-viewport',{clientX:cursor.x,clientY:cursor.y}),true);
    const after=await image.boundingBox();assert(after.width>before.width);
    assert(Math.abs(after.x+point.x*after.width-cursor.x)<2,'horizontal map point remains under the cursor');
    assert(Math.abs(after.y+point.y*after.height-cursor.y)<2,'vertical map point remains under the cursor');
    assert.equal(await page.locator('[data-map-city=durane]').getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('[data-map-landmark=durane]').evaluate(node=>node.classList.contains('is-selected')),true);
    await page.screenshot({path:path.join(output,'cursor-zoom-desktop.png')});
    const enlarged=after.width;assert.equal(await wheel('.map-viewport',{deltaY:120,clientX:cursor.x,clientY:cursor.y}),true);assert((await image.boundingBox()).width<enlarged);
    for(const deltaMode of [1,2]){const old=(await image.boundingBox()).width;assert.equal(await wheel('.map-viewport',{deltaMode,deltaY:-3}),true);assert((await image.boundingBox()).width>old);}
    const panBefore=await viewport.evaluate(node=>({left:node.scrollLeft,top:node.scrollTop}));
    await page.mouse.move(cursor.x,cursor.y);await page.mouse.down();await page.mouse.move(cursor.x-40,cursor.y-30,{steps:4});await page.mouse.up();
    const panAfter=await viewport.evaluate(node=>({left:node.scrollLeft,top:node.scrollTop}));
    assert(Math.abs(panAfter.left-panBefore.left-40)<2&&Math.abs(panAfter.top-panBefore.top-30)<2,'mouse dragging remains available after wheel zoom');
    for(let i=0;i<14;i++)assert.equal(await wheel('.map-viewport',{deltaY:-10000}),true);
    assert.equal(await page.locator('[data-map-action=in]').isDisabled(),true);const maximum=(await image.boundingBox()).width;
    assert.equal(await wheel('.map-viewport'),true);assert.equal((await image.boundingBox()).width,maximum);
    for(let i=0;i<14;i++)assert.equal(await wheel('.map-viewport',{deltaY:10000}),true);
    assert.equal(await page.locator('[data-map-action=out]').isDisabled(),true);const minimum=(await image.boundingBox()).width;
    assert.equal(await wheel('.map-viewport',{deltaY:120}),true);assert.equal((await image.boundingBox()).width,minimum);
    assert.equal(await wheel('.map-viewport',{deltaY:0}),false);
    await viewport.focus();await page.keyboard.press('+');assert((await image.boundingBox()).width>minimum);
    await page.keyboard.press('0');assert.equal(await page.locator('[data-map-action=out]').isDisabled(),true);
    await viewport.dblclick({position:{x:area.width/2,y:area.height/2}});assert((await image.boundingBox()).width>minimum);
    await viewport.dblclick({position:{x:area.width/2,y:area.height/2}});assert.equal(await page.locator('[data-map-action=out]').isDisabled(),true);
    await page.evaluate(()=>{window.oldWheelViewport=document.querySelector('.map-viewport');});
    if(dist){await page.goto(base+'/jeu/#collection');await page.locator('.cb-spread').waitFor();}
    else await page.evaluate(()=>{wheelMap.destroy();document.getElementById('map-root').replaceChildren();});
    assert.equal(await page.evaluate(()=>{const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:-120});oldWheelViewport.dispatchEvent(event);return event.defaultPrevented;}),false,'destroy removes the non-passive wheel listener');
    if(dist)await page.goto(base+'/jeu/#map');else await page.evaluate(()=>wheelMap.mount(document.getElementById('map-root')));
    await ready();const remount=(await image.boundingBox()).width;
    assert.equal(await wheel('.map-viewport'),true);const ratio=(await image.boundingBox()).width/remount;
    assert(ratio>1.1&&ratio<1.4,'one wheel event is handled exactly once after re-entry');
    assert.deepEqual(errors,[]);
    const report={passed:true,mode:dist?'frozen game':'isolated Map component',viewport:{width:1440,height:1000},cursorAnchor:true,realCtrlWheel:true,normalWheelUnaffected:true,outsideMapUnaffected:true,deltaModes:[0,1,2],zoomBounds:[1,8],citySelectionPreserved:true,keyboardPreserved:true,dragPreserved:true,doubleClickPreserved:true,listenerRemovedOnDestroy:true,remountSingleHandler:true,errors};
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await context.close();
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
