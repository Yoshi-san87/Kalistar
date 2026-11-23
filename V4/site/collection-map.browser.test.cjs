'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__collection_album_map__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',url=built?'https://kalistar-gallery.invalid/Kalistar':process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/album-vivant/map');
const sizes=[[1440,900],[2532,1412],[412,1007],[320,740],[1007,412]];
const action=(p,name,id)=>p.locator(`[data-binder-action="${name}"]${id===undefined?'':`[data-id="${id}"]`}:visible`);
async function enter(p){await p.locator('[data-startup-enter]:enabled').click();await p.waitForFunction(()=>window.KALISTAR_READY);}
async function settle(p){await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function images(p){await p.waitForFunction(()=>[...document.querySelectorAll('.cb-album > .cb-spread img')].filter(n=>n.getClientRects().length).every(n=>n.complete&&n.naturalWidth>0&&!n.src.includes('#v4-')));}
async function routeBuilt(context){
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
  if(!built)return;
  await context.route(url+'/**',route=>{
    const p=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,p.endsWith('/')?p+'index.html':p);
    if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:p});
    const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
    return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
  });
}
async function layout(p){
  const r=await p.locator('.cb-album > .cb-spread').evaluate(spread=>{
    const rect=n=>n.getBoundingClientRect(),within=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
    const leaves=[...spread.querySelectorAll(':scope > .cb-leaf')],pockets=[...spread.querySelectorAll('.cb-pocket')],view={left:0,top:0,right:innerWidth,bottom:innerHeight},single=getComputedStyle(spread.closest('.cb-album')).getPropertyValue('--cb-single-leaf').trim()==='1';
    return {sides:leaves.map(n=>n.dataset.leaf),slots:leaves.map(n=>n.querySelectorAll('.cb-pocket').length),empty:pockets.filter(n=>n.classList.contains('is-empty')).length,
      ids:pockets.filter(n=>n.dataset.cardId).map(n=>n.dataset.cardId),fits:within(rect(spread),view)&&leaves.every(n=>single||within(rect(n),rect(spread)))&&pockets.every(n=>within(rect(n),rect(single?spread:n.closest('.cb-leaf')))),
      native:pockets.filter(n=>n.dataset.cardId).every(n=>n.querySelector('.cb-card > img') instanceof HTMLImageElement&&!n.querySelector('canvas')),
      scroll:[document.documentElement,document.body,document.querySelector('#app'),spread.closest('.cb-workbench')].map(n=>({node:n.id||n.className||n.tagName,x:n.scrollWidth-n.clientWidth,y:n.scrollHeight-n.clientHeight,top:n.scrollTop,left:n.scrollLeft}))};
  });
  assert.deepEqual(r.sides,['left','right']);assert.deepEqual(r.slots,[6,6]);assert.equal(r.ids.length+r.empty,12);assert.equal(new Set(r.ids).size,r.ids.length);assert(r.fits&&r.native,JSON.stringify(r));assert(r.scroll.every(n=>n.x<=1&&n.y<=1&&n.top===0&&n.left===0),JSON.stringify(r.scroll));return r;
}
async function protectedState(p){const state=await p.evaluate(()=>({catalogue:KALISTAR_DATA,owned:KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).slice().sort((a,b)=>a.id.localeCompare(b.id)),matches:KALISTAR_DB.registry.matches(KALISTAR_ACTIVE_USER),games:Object.fromEntries(Object.keys(localStorage).filter(k=>/(?:^|\.)game$/.test(k)).sort().map(k=>[k,localStorage.getItem(k)]))}));return Object.fromEntries(Object.entries(state).map(([key,value])=>[key,require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex')]));}
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',serviceWorkers:'block'});await routeBuilt(context);const page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url+'/jeu/#collection');await enter(page);page.setDefaultTimeout(20000);const before=await protectedState(page);await action(page,'scope','catalogue').click();
    for(const [width,height] of sizes){await page.setViewportSize({width,height});await settle(page);await images(page);const r=await layout(page);assert.equal(r.ids.length,12);checks.push({width,height,...r});await page.screenshot({path:path.join(output,`album-${width}x${height}.png`),scale:'css'});}
    await action(page,'pages').click();assert(await page.locator('.cb-index img').evaluateAll(ns=>ns.filter(n=>n.getAttribute('src')!=='assets/back-obsidian-v1.webp').length<=9),'index limits native previews to the current spread and its neighbors');await action(page,'jump-page','1').click();const label=await page.locator('.cb-page-label').textContent(),ids=(await layout(page)).ids,id=ids.at(-1);
    await action(page,'open',id).click();assert.equal(await page.locator('.cb-visual a[download]').getAttribute('href'),await page.evaluate(id=>KalistarSite.url(KALISTAR_DATA.cards.find(c=>c.id===id).pngUrl),id));await action(page,'back').click();assert.equal(await page.locator('.cb-page-label').textContent(),label);assert.deepEqual((await layout(page)).ids,ids);assert(await action(page,'open',id).evaluate(n=>n===document.activeElement));
    await action(page,'pages').click();const last=String(await action(page,'jump-page').count()-1);await action(page,'jump-page',last).click();const tail=await layout(page),total=await page.evaluate(()=>KALISTAR_DATA.cards.length);assert.equal(tail.ids.length,total%12||12);assert(await action(page,'next-page').isDisabled());
    await action(page,'pages').click();await action(page,'jump-page','0').click();assert(await action(page,'previous-page').isDisabled());
    await page.setViewportSize({width:1440,height:900});await action(page,'filters').click();await page.locator('dialog[open] [data-binder-action=filter-choice][data-id=ELECTRO]').click();await page.locator('.cb-filter-actions [data-binder-action=close-overlay]').click();assert(await page.locator('.cb-pocket[data-card-id]').evaluateAll(ns=>ns.length>0&&ns.every(n=>KALISTAR_DATA.cards.find(c=>c.id===n.dataset.cardId).element==='ELECTRO')));
    const discovery=await page.evaluate(()=>KALISTAR_DATA.cards.filter(c=>c.element==='ELECTRO').sort((a,b)=>a.id.localeCompare(b.id)).map(c=>c.id));
    for(const [random,expected] of [[0,discovery[0]],[.999999999,discovery.at(-1)]]){await page.evaluate(value=>{const original=Math.random;try{Math.random=()=>value;document.querySelector('[data-binder-action=discover]').click();}finally{Math.random=original;}},random);assert.equal(await page.locator('.cb-hero-image').getAttribute('alt'),await page.evaluate(id=>{const c=KALISTAR_DATA.cards.find(c=>c.id===id);return c.name+' : '+c.title;},expected));await action(page,'back').click();}
    await action(page,'reset').click();const search=page.locator('[data-binder-field=search]');await search.fill('__no_album_card__');
    for(const [width,height] of sizes){await page.setViewportSize({width,height});await settle(page);assert.equal((await layout(page)).empty,12);assert(await page.locator('[data-binder-action=discover]').isDisabled());await page.screenshot({path:path.join(output,`empty-${width}x${height}.png`),scale:'css'});await action(page,'reset').click();assert.equal((await layout(page)).ids.length,12);assert.match(await page.locator('.cb-page-label').textContent(),new RegExp('01 / '+Math.ceil(total/12)));await search.fill('__no_album_card__');}
    await search.fill('');await search.pressSequentially('MOMO');assert(await search.evaluate(n=>n===document.activeElement&&n.selectionStart===4));const searchPage=await page.locator('.cb-page-label').textContent();await search.press('ArrowLeft');assert(await search.evaluate(n=>n.selectionStart===3));assert.equal(await page.locator('.cb-page-label').textContent(),searchPage);await search.fill('');
    await page.locator('[data-view=story]').click();await page.locator('.story-library').waitFor();assert.match(await page.locator('.story-volume-object img').first().getAttribute('src'),/story-closed-grimoire-v2\.webp/);
    await page.goto(url+'/jeu/?collection-album-qa=map#map');await enter(page);await page.waitForFunction(()=>document.querySelector('.map-atlas')?.naturalWidth>0);assert.equal(await page.locator('.map-atlas').getAttribute('src'),await page.evaluate(()=>KalistarSite.atlas));await page.goto(url+'/jeu/#collection');await enter(page);assert.deepEqual(await protectedState(page),before);
    const phone=await browser.newContext({viewport:{width:412,height:1007},isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'});await routeBuilt(phone);const touch=await phone.newPage();touch.setDefaultTimeout(90000);touch.on('pageerror',e=>errors.push(e.message));await touch.goto(url+'/jeu/#collection');await enter(touch);touch.setDefaultTimeout(20000);const touchBefore=await protectedState(touch);await action(touch,'scope','catalogue').tap();
    const firstCard=action(touch,'open').first(),favoriteId=await firstCard.getAttribute('data-id');
    await firstCard.tap();const favorite=touch.locator('.cb-visual [data-binder-action=favorite]'),pressed=await favorite.getAttribute('aria-pressed');
    await favorite.tap();assert.notEqual(await favorite.getAttribute('aria-pressed'),pressed);await action(touch,'back').tap();
    assert.equal(await touch.locator('.cb-page').getAttribute('data-mode'),'book');await touch.reload();await enter(touch);
    await action(touch,'open',favoriteId).tap();assert.notEqual(await favorite.getAttribute('aria-pressed'),pressed,'reader favorite persists after reload');await action(touch,'back').tap();
    await action(touch,'favorites').tap();assert.deepEqual((await layout(touch)).ids,[favoriteId]);assert.equal((await layout(touch)).empty,11);await action(touch,'favorites').tap();await action(touch,'filters').tap();await touch.keyboard.press('Escape');assert(await action(touch,'filters').evaluate(n=>n===document.activeElement));assert.deepEqual(await protectedState(touch),touchBefore);await phone.close();
    await page.evaluate(()=>{const host=document.createElement('main');host.id='app';document.querySelector('#app').replaceWith(host);const surface=document.createElement('div');surface.id='collection-binder-root';host.append(surface);window.CB_FIXTURE_SURFACE=surface;});
    for(const fixture of ['longest','five-positions','ff9']){
      const expected=await page.evaluate(kind=>{
        window.CB_FIXTURE?.destroy();let cards;
        if(kind==='longest')cards=KALISTAR_DATA.cards.slice().sort((a,b)=>b.name.length-a.name.length).slice(0,32);
        if(kind==='five-positions'){const variants=KALISTAR_DATA.cards.filter(c=>c.name==='MOMO').slice(0,2),single=KALISTAR_DATA.cards.find(c=>c.name==='ILIANE');if(variants.length!==2||!single)throw Error('Missing fixtures');cards=[...variants.map(c=>({...c,name:'VALENTIN DE LA FRONTIERE',positions:[1,2,3,4,5]})),{...single,name:"ARCHIVISTE D'ASTRALIA",positions:[1,2,3,4,5]}];}
        if(kind==='ff9'){const names=['DJIDANE','VIVI','GRENAT','STEINER','EIKO','FREYJA'];cards=KALISTAR_DATA.cards.filter(c=>names.includes(c.name));if(!names.every(name=>cards.some(c=>c.name===name)))throw Error('Missing FF9 fixtures');}
        window.CB_FIXTURE_DATA={...KALISTAR_DATA,cards};window.CB_FIXTURE_ORIGINAL=JSON.stringify(CB_FIXTURE_DATA);const counts=Object.fromEntries(cards.map((c,i)=>[c.id,1+i%27]));const view=KalistarCollection.create({data:CB_FIXTURE_DATA,getOwned:id=>id?Array.from({length:counts[id]},()=>({cardId:id})):cards.map(c=>({cardId:c.id}))});view.mount(CB_FIXTURE_SURFACE);window.CB_FIXTURE=view;return cards.map(c=>c.id).sort();
      },fixture);
      for(const [width,height] of sizes){await page.setViewportSize({width,height});await settle(page);await action(page,'pages').click();await action(page,'jump-page','0').click();const seen=[];
        for(let index=0;index<Math.ceil(expected.length/12);index++){const r=await layout(page);seen.push(...r.ids);if(index===0){await images(page);await page.screenshot({path:path.join(output,`${fixture}-${width}x${height}.png`),scale:'css'});}if(await action(page,'next-page').isDisabled())break;await action(page,'next-page').click();}assert.deepEqual(seen.sort(),expected,'every VERSION remains reachable, including shared characters');}
      assert(await page.evaluate(()=>JSON.stringify(CB_FIXTURE_DATA)===CB_FIXTURE_ORIGINAL));
    }
    await page.emulateMedia({forcedColors:'active'});await action(page,'open').first().focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert(await action(page,'open').first().evaluate(n=>n===document.activeElement&&n.matches(':focus-visible')&&getComputedStyle(n).outlineStyle!=='none'),'high contrast keyboard focus');await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});assert.equal(await page.locator('.cb-page').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
    await page.evaluate(()=>CB_FIXTURE.destroy());assert.deepEqual(await protectedState(page),before);assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,built,sizes,checks,errors},null,2)+'\n');console.log('PASS: fixed album, pagination/filter/random/empty, Back focus, favorite persistence, saves, story/map and long-name/FF9/all-version fixtures.');
  }catch(error){fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,built,sizes,checks,errors,error:error.message},null,2)+'\n');const p=browser.contexts().flatMap(c=>c.pages()).at(-1);if(p)await p.screenshot({path:path.join(output,'failure.png'),scale:'css'}).catch(()=>{});throw error;}
  finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
