'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification-collection');
const modules=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__collection__.cjs'))('playwright');
const report={tests:[],errors:[],geometry:[],screenshots:[]};let browser,page,context;
const action=name=>page.locator(`[data-binder-action="${name}"]`);
async function shot(name){const file=path.join(out,name+'.png');await page.screenshot({path:file});report.screenshots.push(file);}
async function test(name,fn){await fn();report.tests.push(name);console.log('PASS '+name);}
async function ready(){await page.waitForFunction(()=>window.KALISTAR_READY&&window.KALISTAR_DB);await page.locator('.cb-page').waitFor();}
async function images(){assert.deepEqual(await page.locator('.cb-page img').evaluateAll(async ns=>{await Promise.all(ns.map(n=>n.decode().catch(()=>{})));return ns.filter(n=>!n.naturalWidth).map(n=>n.src);}),[]);}
async function fit(label){
  await images();const g=await page.evaluate(()=>{
    const visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';
    return {width:innerWidth,height:innerHeight,scrollH:document.documentElement.scrollHeight,scrollW:document.documentElement.scrollWidth,
      outside:[...document.querySelectorAll('.cb-page button,.cb-page input,.cb-page select,.cb-hero-image,.cb-card,.cb-caption')].filter(visible).flatMap(n=>{const r=n.getBoundingClientRect();return r.left< -1||r.top< -1||r.right>innerWidth+1||r.bottom>innerHeight+1?[{name:n.className,action:n.dataset.binderAction,rect:r.toJSON()}]:[];}),
      overflow:[...document.querySelectorAll('.cb-heading,.cb-toolbar,.cb-workbench,.cb-sheet,.cb-pocket,.cb-reading,.cb-read-content,.cb-filters,.cb-footer')].filter(visible).filter(n=>n.scrollHeight>n.clientHeight+3||n.scrollWidth>n.clientWidth+3).map(n=>({name:n.className,height:n.clientHeight,scroll:n.scrollHeight,width:n.clientWidth,scrollW:n.scrollWidth}))};
  });report.geometry.push({label,...g});assert.ok(g.scrollH<=g.height+1&&g.scrollW<=g.width+1,JSON.stringify(g));assert.deepEqual(g.outside,[],JSON.stringify(g));assert.deepEqual(g.overflow,[],JSON.stringify(g));
}
async function run(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});context=await browser.newContext({viewport:{width:1600,height:1080},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.stack));
  await page.goto(pathToFileURL(path.join(root,'site/index.html')).href+'#collection');await ready();
  const original=await page.evaluate(()=>({owned:KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER),game:localStorage.getItem('kalistar.v3.game'),deck:localStorage.getItem('kalistar.v3.deck')}));
  await test('A single-screen binder contains both pages across desktop and mobile sizes',async()=>{
    for(const [width,height]of [[1600,1080],[2560,1440],[1440,900],[1280,720],[390,844],[360,740],[844,390]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(160);await fit(width+'-book');assert.equal(await page.locator('.cb-sheet').count(),2);await shot('binder-'+width);
    }
  });
  await page.setViewportSize({width:1600,height:1080});await page.waitForTimeout(100);
  await test('Pagination visits exactly forty characters and forty-one versions without changing the deck',async()=>{
    const names=[];while(true){names.push(...await page.locator('[data-character]').evaluateAll(ns=>ns.map(n=>n.dataset.character)));if(await action('next-page').isDisabled())break;await action('next-page').click();}
    assert.equal(names.length,40);assert.equal(new Set(names).size,40);while(await action('previous-page').isEnabled())await action('previous-page').click();
    assert.equal(await page.locator('[data-character=momo] .cb-behind').count(),1);assert.equal(await page.locator('.cb-page [data-action=add],.cb-page [data-action=remove]').count(),0);
  });
  await test('Momo versions, art, story, printed profile, career and owned copies remain available in the reader',async()=>{
    await page.locator('[data-character=momo] [data-binder-action=open]').click();const first=await page.locator('.cb-hero-image').getAttribute('src');
    assert.equal(await action('version').count(),2);await action('version').nth(1).click();assert.notEqual(await page.locator('.cb-hero-image').getAttribute('src'),first);
    await action('media').filter({hasText:'Illustration'}).click();await images();assert.equal(await page.locator('.cb-hero-image.is-art').count(),1);
    await action('media').filter({hasText:'Carte'}).click();assert.ok((await page.locator('.cb-hero-image').getAttribute('src')).endsWith('-full.png'));
    for(const id of ['story','profile','career','copies']){await page.locator(`[data-binder-action=tab][data-id=${id}]`).click();await fit('reader-'+id);await shot('reader-'+id);}
    assert.ok(await page.locator('.cb-copy').count());const uid=await page.locator('.cb-copy b').first().innerText();assert.ok(original.owned.some(c=>c.id===uid));
    await action('registry').click();await page.locator('dialog[open]').waitFor();assert.ok(await page.locator('dialog[open]').count());await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(n=>n.close()));
    await action('back').click();assert.equal(await page.locator('.cb-spread').count(),1);
  });
  await test('Search, filters, favourites and sorting are independent from deck management',async()=>{
    await page.locator('.cb-toolbar [data-binder-action=filters]').click();await page.locator('[data-binder-filter=faction]').selectOption('Chroma');await fit('filters');await page.locator('.cb-filters [data-binder-action=filters]').click();assert.ok(await page.locator('[data-character=momo]').count());
    await page.locator('.cb-toolbar [data-binder-action=reset]').click();await page.locator('[data-binder-field=search]').fill('momo');assert.equal(await page.locator('[data-character]').count(),1);
    const fave=page.locator('.cb-pocket [data-binder-action=favorite]');await fave.click();assert.equal(await fave.getAttribute('aria-pressed'),'true');const id=await fave.getAttribute('data-id');
    await page.locator('[data-binder-field=search]').fill('');await action('favorites').click();assert.equal(await page.locator('[data-character]').count(),1);assert.ok(await page.evaluate(id=>JSON.parse(localStorage.getItem('kalistar.v3.favorites')).includes(id),id));
    await action('favorites').click();await page.locator('[data-binder-field=sort]').selectOption('name');assert.equal(await page.locator('.cb-caption h2').first().innerText(),'AELIS');await page.locator('[data-binder-field=sort]').selectOption('id');
  });
  await test('Reader tabs and filters fit portrait and short landscape, with keyboard navigation',async()=>{
    await action('open').first().click();
    for(const [width,height]of [[1280,720],[390,844],[360,740],[844,390]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(120);
      for(const id of ['story','profile','career','copies']){await page.locator(`[data-binder-action=tab][data-id=${id}]`).click();await fit(width+'-'+id);await shot('reader-'+width+'-'+id);}
    }
    await page.locator('[data-binder-action=tab][data-id=story]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-binder-action=tab][data-id=profile]').getAttribute('aria-selected'),'true');
    await page.keyboard.press('Escape');assert.ok(await page.locator('.cb-spread').count());await page.locator('.cb-toolbar [data-binder-action=filters]').click();await fit('small-filters');await page.keyboard.press('Escape');assert.equal(await page.locator('.cb-filters').isVisible(),false);
  });
  await test('Reduced motion stops page animations; normal transitions remain short and finite',async()=>{
    await page.setViewportSize({width:1600,height:1080});await page.emulateMedia({reducedMotion:'no-preference'});await action('next-page').click();
    const animation=await page.locator('.cb-spread').evaluate(n=>({name:getComputedStyle(n).animationName,duration:getComputedStyle(n).animationDuration,count:getComputedStyle(n).animationIterationCount}));assert.notEqual(animation.name,'none');assert.notEqual(animation.count,'infinite');assert.ok(parseFloat(animation.duration)<=.6);
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.cb-spread').evaluate(n=>getComputedStyle(n).animationName),'none');
  });
  await test('Touch gestures turn pages; vertical and cancelled gestures leave the page unchanged',async()=>{
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(160);
    const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    const box=await page.locator('.cb-sheet').first().boundingBox(),y=box.y+24;
    const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:x==null?[]:[{x,y,id:0}]});
    const label=()=>page.locator('.cb-page-label span').innerText(),before=await label();
    await touch('touchStart',310,y);for(const x of [270,230,190,150,110,80])await touch('touchMove',x,y);await touch('touchEnd');assert.notEqual(await label(),before);
    const changed=await label();await touch('touchStart',300,y);await touch('touchMove',300,y+90);await touch('touchEnd');assert.equal(await label(),changed);
    await touch('touchStart',310,y);await touch('touchMove',200,y);await touch('touchCancel');assert.equal(await label(),changed);
    await cdp.detach();await page.setViewportSize({width:1600,height:1080});
  });
  await test('Ownership and match data stay unchanged; Tokyo sees no Paris cards or favourites',async()=>{
    const current=await page.evaluate(()=>({owned:KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER),game:localStorage.getItem('kalistar.v3.game'),deck:localStorage.getItem('kalistar.v3.deck')}));assert.deepEqual(current,original);
    await page.evaluate(()=>localStorage.setItem('kalistar.v3.activeUser','user-tokyo'));await page.reload();await ready();assert.equal(await page.locator('[data-character]').count(),0);assert.match(await page.locator('.cb-empty').innerText(),/première carte/);
    await page.locator('.cb-scopes [data-binder-action=scope][data-id=catalogue]').click();assert.ok(await page.locator('.cb-pocket.is-unowned').count());assert.equal(await page.locator('.cb-pocket [data-binder-action=favorite][aria-pressed=true]').count(),0);
    await action('open').first().click();await page.locator('[data-binder-action=tab][data-id=copies]').click();assert.equal(await page.locator('.cb-copy').count(),0);
    await page.evaluate(()=>localStorage.setItem('kalistar.v3.activeUser','user-paris'));await page.reload();await ready();assert.ok(await page.locator('.cb-pocket [data-binder-action=favorite][aria-pressed=true]').count());
  });
  await test('Deck and arena navigation still work and return to the binder',async()=>{
    await page.locator('[data-view=decks]').click();assert.equal(await page.locator('[data-deck-slot]').count(),10);await page.locator('[data-view=collection]').click();assert.equal(await page.locator('.cb-spread').count(),1);
    await page.locator('[data-view=arena]').click();await page.locator('.game-shell').waitFor();assert.ok(await page.locator('.game-shell').count());await page.locator('[data-view=collection]').click();assert.equal(await page.locator('.cb-spread').count(),1);assert.deepEqual(report.errors,[]);
  });
}
run().catch(async e=>{report.failure=e.stack;console.error(e);process.exitCode=1;try{await shot('failure');}catch{}}).finally(async()=>{await browser?.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));});
