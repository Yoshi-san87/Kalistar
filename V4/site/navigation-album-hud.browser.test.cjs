'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/album-repair/navigation'));
fs.mkdirSync(path.join(out,'temp'),{recursive:true});process.env.TEMP=process.env.TMP=path.join(out,'temp');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_navigation_album.cjs'));
const {chromium}=runtime('playwright'),base=process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const profiles=[['wide',2532,1412],['user-ratio',1913,799],['laptop',1440,900],['compact-pc',1280,720],['tablet',800,1000],['boundary',700,700],['short-pc',844,390],['phone',412,1007,true],['phone-compact',320,568,true],['touch-landscape',1007,412,true]];
const results=[],failures=[],errors=[],zoomDiagnostics=[];
async function settle(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function capture(page,name){await page.waitForFunction(()=>!document.querySelector('.kalistar-page-crossing'));await settle(page);await page.screenshot({path:path.join(out,name+'.png')});}
async function sample(page){return page.evaluate(()=>{
 const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const visible=n=>n.getClientRects().length&&getComputedStyle(n).display!=='none',header=document.querySelector('.masthead'),nav=header.querySelector('.main-nav'),actions=header.querySelector('.header-actions');
 const hit=n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));};
 const buttons=[...nav.querySelectorAll('button')].filter(visible);
 return {viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,scrollY,bodyScroll:document.body.scrollTop,header:box(header),nav:box(nav),brand:box(header.querySelector('.brand')),logo:box(header.querySelector('.brand img')),actions:box(actions),
  layout:getComputedStyle(header).display,navPosition:getComputedStyle(nav).position,target:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navigation-header-height')),
  measured:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--masthead-height')),gap:box(actions).x-box(header.querySelector('.brand')).right,
  buttons:buttons.map(n=>({id:n.dataset.view||'more',...box(n),hit:hit(n),current:n.getAttribute('aria-current'),frame:getComputedStyle(n,'::before').borderImageSource,
    parts:[...n.querySelectorAll('span,img,svg')].filter(visible).map(box)})),
  actionsButtons:[...actions.querySelectorAll('button')].filter(visible).map(n=>({...box(n),hit:hit(n),label:n.getAttribute('aria-label')||n.textContent.trim(),frame:getComputedStyle(n,'::before').borderImageSource})),
  idle:nav.getAnimations({subtree:true}).every(a=>a.effect.getComputedTiming().iterations!==Infinity)};
});}
function geometry(s,phone){
 assert.equal(s.layout,'grid');assert(Math.abs(s.header.y)<1,'header remains at the top');assert.equal(s.scrollY,0);assert.equal(s.bodyScroll,0);
 assert(Math.abs(s.header.height-s.target)<1&&Math.abs(s.measured-s.target)<1,'measured and reserved header heights agree');
 assert(s.idle,'no permanent navigation animation');
 const inside=(r,b)=>r.x>=b.x-1&&r.right<=b.right+1&&r.y>=b.y-1&&r.bottom<=b.bottom+1;
 assert(inside(s.brand,s.header)&&inside(s.actions,s.header),'brand and commands stay in their header track');
 assert(inside(s.logo,s.brand),'whole logo stays inside its reserved brand area');
 for(const b of s.buttons){assert(b.width>=44&&b.height>=44&&b.hit,'visible 44px command '+b.id);assert.equal(b.frame,'none');
  assert(b.parts.every(r=>r.x>=b.x-1&&r.right<=b.right+1&&r.bottom<=b.bottom+1),'contained label/icon '+b.id);
  if(!phone)assert(inside(b,s.header),'desktop command in the header '+b.id);
 }
 for(const b of s.actionsButtons){assert(b.width>=44&&b.height>=44&&b.hit&&b.label,'labelled 44px header action');assert(inside(b,s.header));assert.equal(b.frame,'none');}
 if(phone){assert.equal(s.buttons.length,5);assert.equal(s.navPosition,'fixed');assert(Math.abs(s.nav.bottom-s.viewport[1])<1);assert(s.gap>=8);}
 else {assert.equal(s.navPosition,'relative');assert(inside(s.nav,s.header),'desktop navigation never floats outside its track');if(s.nav.y<s.actions.bottom)assert(s.nav.right<=s.actions.x+1,'no overlap between navigation and actions');}
}
async function menu(page,name){
 const trigger=page.locator('.nav-more'),dialog=page.locator('#mobile-dialog');
 const before=await trigger.boundingBox();await trigger.hover();await page.waitForTimeout(200);
 assert.deepEqual(await trigger.boundingBox(),before,'hover never moves the menu trigger');assert.equal(await dialog.evaluate(n=>n.open),false,'hover does not open a dialog');
 await trigger.click();await dialog.waitFor({state:'visible'});await page.waitForTimeout(250);
 assert.equal(await trigger.getAttribute('aria-expanded'),'true');
 const inspect=()=>dialog.evaluate(d=>{const r=d.getBoundingClientRect(),close=d.querySelector('[data-action=close]'),c=close.getBoundingClientRect(),scroller=d.querySelector('.mobile-menu');return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,viewport:[innerWidth,innerHeight],close:close.contains(document.elementFromPoint(c.x+c.width/2,c.y+c.height/2)),closeSize:[c.width,c.height],scroll:scroller.scrollTop,horizontal:scroller.scrollWidth-scroller.clientWidth};});
 let s=await inspect();assert(s.x>=0&&s.y>=0&&s.right<=s.viewport[0]&&s.bottom<=s.viewport[1]&&s.close&&s.closeSize.every(n=>n>=44)&&s.horizontal<=1);
 const row=dialog.locator('[data-view=story]');await row.scrollIntoViewIfNeeded();const rowBox=await row.boundingBox();await row.hover();await page.waitForTimeout(200);assert.deepEqual(await row.boundingBox(),rowBox,'popup hover keeps row geometry');
 await capture(page,name+'-menu');
 await page.keyboard.press('Tab');assert(await dialog.evaluate(n=>n.contains(document.activeElement)),'native modal focus trap');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('.nav-more').getAttribute('aria-expanded')==='false');
 await trigger.click();await page.goBack();await dialog.waitFor({state:'hidden'});
 await trigger.click();await dialog.locator('[data-view=map]').click();await page.waitForFunction(()=>document.body.classList.contains('map-view'));
 assert.equal(await trigger.getAttribute('aria-current'),'page');
 await page.evaluate(()=>location.hash='collection');await page.locator('.cb-page').waitFor();await settle(page);
 return s;
}
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true,downloadsPath:path.join(out,'downloads')});
 try{
  for(const mode of ['local','public-shell-fixture']){
   const context=await browser.newContext({viewport:{width:1913,height:799},serviceWorkers:'block',reducedMotion:'no-preference'});
   await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
   await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-navigation-repair-test-only'):open.call(this,n+'-navigation-repair-test-only',v);};});
   const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(mode+': '+e.message));
   await page.goto(base+'/jeu/#collection');await page.locator('[data-startup-enter]:enabled').click();await page.waitForFunction(()=>window.KALISTAR_READY);await page.evaluate(()=>document.fonts.ready);
   await page.locator('.brand img').evaluate(n=>n.decode());
   if(mode!=='local')await page.evaluate(()=>{
    document.documentElement.dataset.hosting='static';window.KalistarSite=Object.freeze({...KalistarSite,online:true});document.querySelector('.main-nav [data-view=atelier]')?.remove();document.querySelector('.phone-preview-entry')?.remove();
    const state={status:'synced',revision:1};window.navigationSync=KalistarCloudSyncUI.create({sync:{snapshot:()=>state,subscribe:()=>()=>{},retry:async()=>state,resolve:async()=>state},mount:document.querySelector('.header-actions'),autoOpen:false});
   });
   for(const p of profiles.filter(p=>!p[3])){
    const name=mode+'-'+p[0];
    try{
     await page.setViewportSize({width:p[1],height:p[2]});await settle(page);geometry(await sample(page),false);
     await page.locator('.cb-workbench').focus();await page.locator('.cb-page-label').focus();await page.mouse.move(p[1]/2,p[2]/2);await page.mouse.wheel(0,800);await settle(page);geometry(await sample(page),false);
     await page.locator('[data-binder-field=search]').fill('MOMO');await page.locator('[data-binder-field=search]').fill('');await settle(page);geometry(await sample(page),false);
     const deck=page.locator('.main-nav [data-view=decks]'),initial=await deck.boundingBox();await deck.hover();await page.waitForTimeout(220);assert.deepEqual(await deck.boundingBox(),initial);await page.mouse.down();assert.deepEqual(await deck.boundingBox(),initial,'press never moves the navigation target');await page.mouse.up();await page.waitForFunction(()=>document.body.classList.contains('decks-view'));geometry(await sample(page),false);
     await page.locator('.main-nav [data-view=collection]').click();await page.locator('.cb-page').waitFor();
     await menu(page,name);geometry(await sample(page),false);
     if(p[0]==='user-ratio'){
      await page.locator('.header-actions [data-action=rules]').hover();await page.locator('#kalistar-ui-hint:popover-open').waitFor();
      assert.match(await page.locator('#kalistar-ui-hint').textContent(),/R\u00e8gles/);
      await page.mouse.move(p[1]/2,p[2]/2);await page.locator('#kalistar-ui-hint:popover-open').waitFor({state:'hidden'});
     }
     if(['user-ratio','laptop','short-pc'].includes(p[0]))await capture(page,name);
     if(p[0]==='user-ratio'){
      await page.locator('.brand').click();await page.waitForFunction(()=>document.body.classList.contains('home-view'));await page.mouse.wheel(0,900);
      await page.locator('[data-home-category=collection]').click();await page.locator('.cb-page').waitFor();await settle(page);geometry(await sample(page),false);
      for(const view of ['story','statistics']){
       await page.locator('.main-nav [data-view='+view+']').click();await page.waitForFunction(view=>document.body.classList.contains(view+'-view'),view);await settle(page);geometry(await sample(page),false);
      }
      await page.locator('.main-nav [data-view=collection]').click();await page.locator('.cb-page').waitFor();await settle(page);geometry(await sample(page),false);
     }
     results.push({name,passed:true,sample:await sample(page)});console.log('PASS '+name);
    }catch(e){failures.push({name,error:e.message,sample:await sample(page)});await page.screenshot({path:path.join(out,name+'-failure.png')});console.error(name+': '+e.message);}
   }
   // Paired CSS viewport/DPR emulation covers zoom layout thresholds, not browser UI zoom.
   const cdp=await context.newCDPSession(page);
   for(const factor of [.8,1.25,1.5]){
    const viewport={width:Math.round(1913/factor),height:Math.round(799/factor)};
    await page.setViewportSize(viewport);await cdp.send('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:factor,mobile:false});await settle(page);
    const name=mode+'-zoom-'+factor;
    try{geometry(await sample(page),false);await menu(page,name);geometry(await sample(page),false);results.push({name,passed:true,sample:await sample(page)});console.log('PASS '+name);}
    catch(e){failures.push({name,error:e.message,sample:await sample(page)});}
   }
   await cdp.detach();await page.setViewportSize({width:1913,height:799});
   await page.evaluate(()=>{document.body.style.zoom='1.25';scrollTo(0,95);});await settle(page);
   zoomDiagnostics.push({mode,note:'Synthetic body zoom tests the shell 100dvh/scroll contract, not browser UI zoom.',sample:await sample(page),root:await page.evaluate(()=>({height:document.documentElement.scrollHeight,overflow:getComputedStyle(document.documentElement).overflow}))});
   if(Math.abs(zoomDiagnostics.at(-1).sample.header.y)>1)failures.push({name:mode+'-root-scroll',error:'Root scrolling must not displace the reserved header',sample:zoomDiagnostics.at(-1).sample});
   await context.close();
  }
  for(const p of profiles.filter(p=>p[3])){
   const context=await browser.newContext({viewport:{width:p[1],height:p[2]},hasTouch:true,isMobile:true,serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);
   await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
   await page.goto(base+'/jeu/#collection');await page.locator('[data-startup-enter]:enabled').click();await page.waitForFunction(()=>window.KALISTAR_READY);await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(()=>{const state={status:'synced',revision:1};window.navigationSync=KalistarCloudSyncUI.create({sync:{snapshot:()=>state,subscribe:()=>()=>{},retry:async()=>state,resolve:async()=>state},mount:document.querySelector('.header-actions'),autoOpen:false});document.querySelector('[data-pwa-install]').hidden=false;});
   try{await settle(page);geometry(await sample(page),true);await menu(page,p[0]);geometry(await sample(page),true);await capture(page,p[0]);results.push({name:p[0],passed:true,sample:await sample(page)});console.log('PASS '+p[0]);}
   catch(e){failures.push({name:p[0],error:e.message,sample:await sample(page)});}
   await context.close();
  }
  assert.deepEqual(errors,[]);assert.equal(failures.length,0,failures.map(f=>f.name+': '+f.error).join('\n'));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:!failures.length&&!errors.length,publicMode:'Production DOM and controllers, public shell CSS/destinations + real sync UI with offline stub; no account connection',results,failures,errors,zoomDiagnostics},null,2));}
 console.log(JSON.stringify({passed:true,cases:results.length,out}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
