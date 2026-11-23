'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__collection_versions__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',url=built?'https://kalistar-versions.invalid/Kalistar':process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/album-vivant/versions');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const sizes=[[1440,900],[2532,1412],[412,1007],[320,740],[1007,412]];
async function enter(page){await page.locator('[data-startup-enter]:enabled').click();await page.waitForFunction(()=>window.KALISTAR_READY);}
async function settle(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function mediaControl(page,selector){const node=page.locator(selector);if(!await node.isVisible()&&await page.locator('.cb-media-toggle').isVisible()){await page.locator('.cb-media-toggle').click();await page.locator('.cb-media-overlay:modal').waitFor();}return node;}
async function closeMedia(page){if(await page.locator('.cb-media-overlay:modal').count())await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.cb-media-overlay:modal')&&!history.state?.kalistarDialogBack);await settle(page);}
async function selectTab(page,id){const select=page.locator('select[data-binder-field=tab]'),tab=page.locator('[data-binder-action=tab][data-id='+id+']');if(await select.isVisible())await select.selectOption(id);else if(await tab.isVisible())await tab.click();else await(await mediaControl(page,'select[data-binder-field=tab]')).selectOption(id);await closeMedia(page);}
async function reach(page,locator){
  const previous=page.locator('[data-binder-action=read-previous]'),next=page.locator('[data-binder-action=read-next]');
  while(await previous.isEnabled())await previous.click();
  for(let index=0;index<100;index++){
    if(await locator.evaluateAll(nodes=>nodes.some(n=>{const r=n.getBoundingClientRect(),w=n.closest('.cb-read-window')?.getBoundingClientRect();return !n.inert&&w&&r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1;})))return;
    if(await next.isDisabled())break;await next.click();
  }
  throw Error('Content not reachable through text pagination: '+locator);
}
let browser,activePage;
async function main(){
  fs.mkdirSync(output,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  activePage=page;
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
  if(built)await context.route(url+'/**',route=>{
    const p=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,p.endsWith('/')?p+'index.html':p);
    if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:p});
    const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
    return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
  });
  page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'/jeu/#collection');await enter(page);page.setDefaultTimeout(20000);
  const protectedState=async()=>{const state=await page.evaluate(()=>({catalogue:KALISTAR_DATA,owned:KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).slice().sort((a,b)=>a.id.localeCompare(b.id)),matches:KALISTAR_DB.registry.matches(KALISTAR_ACTIVE_USER),games:Object.fromEntries(Object.keys(localStorage).filter(k=>/(?:^|\.)game$/.test(k)).sort().map(k=>[k,localStorage.getItem(k)]))}));return Object.fromEntries(Object.entries(state).map(([key,value])=>[key,require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex')]));};
  const beforeState=await protectedState();
  const fixture=await page.evaluate(()=>{
    const versions=KALISTAR_DATA.cards.filter(c=>c.name==='MOMO').sort((a,b)=>a.id.localeCompare(b.id)),original=KALISTAR_DB.registry,user=KALISTAR_ACTIVE_USER,copy=original.owned(user,versions[0].id)[0];
    if(!copy)throw Error('Missing owned MOMO fixture');window.CB_ORIGINAL_REGISTRY=original;
    KALISTAR_DB.registry={...original,owned:(u,id)=>{const items=original.owned(u,id);return u===user&&(!id||id===copy.cardId)?[...items,{...copy,id:'version-test-copy'}]:items;}};
    return {versions:versions.map(c=>({id:c.id,title:c.title,text:c.text||c.description||'',pngUrl:KalistarSite.url(c.pngUrl)})),character:versions[0].characterId||versions[0].id};
  });
  const [first,second]=fixture.versions;assert(fixture.versions.length>=2);
  const pocket=id=>page.locator('.cb-pocket[data-card-id="'+id+'"]');
  const images=()=>page.waitForFunction(()=>[...document.querySelectorAll('.cb-card > img,.cb-hero-image')].filter(n=>n.getClientRects().length).every(n=>n.complete&&n.naturalWidth>0&&!n.src.includes('#v4-')));
  await page.locator('[data-binder-action=scope][data-id=catalogue]').click();
  const counts=await page.evaluate(()=>{const cards=KALISTAR_DATA.cards,c=KalistarCollaborations;return {kalistar:cards.filter(v=>c.universe(v)==='kalistar').length,'final-fantasy':cards.filter(v=>/^FF\d+$/.test(c.of(v)?.faction||'')).length,nier:cards.filter(v=>c.matches(v,'nier')||c.matches(v,'replicant')).length};});
  for(const [scope,count] of Object.entries(counts)){await page.locator('[data-binder-filter=collection]:visible').selectOption(scope);assert.match(await page.locator('.cb-footer-range').textContent(),new RegExp('/ '+count+'$'));}
  await page.locator('[data-binder-action=filters]').click();
  const factions=await page.locator('[data-binder-filter=faction] option').evaluateAll(ns=>ns.map(n=>n.value)),fantasy=await page.evaluate(()=>KalistarCollaborations.entries.filter(e=>/^FF\d+$/.test(e.faction)).map(e=>e.faction));
  for(const faction of [...fantasy,'NieR','Replicant'])assert(factions.includes(faction),'Faction '+faction);
  await page.locator('[data-binder-filter=faction]').selectOption('Replicant');assert.match(await page.locator('.cb-footer-range').textContent(),new RegExp('/ '+await page.evaluate(()=>KALISTAR_DATA.cards.filter(c=>KalistarCollaborations.matches(c,'replicant')).length)+'$'));
  await page.locator('.cb-filter-actions [data-binder-action=close-overlay]').click();await page.locator('.cb-toolbar [data-binder-action=reset]').click();
  const search=page.locator('[data-binder-field=search]');await search.fill('MOMO');await images();
  assert.equal(await page.locator('.cb-pocket').count(),12);assert.equal(await page.locator('.cb-pocket[data-character="'+fixture.character+'"]').count(),fixture.versions.length,'one slot per version');assert.equal(await page.locator('[data-binder-action=cycle-version]').count(),0);
  assert.equal(await pocket(first.id).locator('.cb-card-copies b').textContent(),'2');assert.equal(await pocket(second.id).locator('.cb-card-copies b').textContent(),'1');
  for(const [width,height] of sizes){
    await page.setViewportSize({width,height});await settle(page);await images();await page.screenshot({path:path.join(output,`gallery-${width}x${height}.png`),scale:'css'});
    await pocket(first.id).locator('.cb-card').click();await settle(page);
    assert.deepEqual(await page.locator('[data-binder-field=version] option').allTextContents(),fixture.versions.map(v=>v.title));assert.equal(await page.locator('[data-binder-field=version]').inputValue(),first.id);
    assert.equal(await page.locator('.cb-story p').textContent(),first.text,'complete story in paged HTML');
    assert(await page.locator('.cb-reader').evaluate(n=>{const v=n.querySelector('.cb-visual').getBoundingClientRect(),r=n.querySelector('.cb-reading').getBoundingClientRect();return v.width>0&&r.width>0&&v.right<=r.left+1;}),'card left, text right, including phone');
    for(const tab of ['profile','career','copies']){await selectTab(page,tab);assert((await page.locator('#cb-read-content').textContent()).trim().length>0);assert.equal(await page.locator('[data-binder-action=tab][data-id='+tab+']').getAttribute('aria-selected'),'true');}
    const ownedIds=await page.evaluate(id=>KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER,id).map(c=>c.id),first.id);assert.deepEqual(await page.locator('.cb-copy b').allTextContents(),ownedIds.slice(0,2));for(const id of ownedIds.slice(0,2))await reach(page,page.locator('.cb-copy').filter({hasText:id}));
    const story=page.locator('[data-binder-action=tab][data-id=story]');if(await story.isVisible()){await page.locator('[data-binder-action=tab][data-id=copies]').focus();await page.keyboard.press('Home');assert.equal(await story.getAttribute('aria-selected'),'true');assert(await story.evaluate(n=>n===document.activeElement));await page.keyboard.press('End');assert.equal(await page.locator('[data-binder-action=tab][data-id=copies]').getAttribute('aria-selected'),'true');}
    await selectTab(page,'story');await(await mediaControl(page,'[data-binder-action=media][data-id=art]')).click();await images();await closeMedia(page);assert(await page.locator('.cb-hero-image').evaluate(n=>n.classList.contains('is-art')&&n.dataset.v4Cropped==='art'));
    await(await mediaControl(page,'[data-binder-action=media][data-id=card]')).click();await images();await closeMedia(page);assert(await page.locator('.cb-hero-image').evaluate(n=>!n.classList.contains('is-art')&&n.dataset.v4Cropped==='card'));
    assert.equal(await page.locator('.cb-page a[download]').getAttribute('href'),first.pngUrl);
    if(width===1440){const pending=page.waitForEvent('download');await(await mediaControl(page,'a[download]')).click();const download=await pending;assert.match(download.suggestedFilename(),/\.png$/i);assert.equal(await download.failure(),null);const stream=await download.createReadStream();let signature=Buffer.alloc(0);for await(const chunk of stream){signature=Buffer.concat([signature,chunk]);if(signature.length>=8)break;}assert.deepEqual([...signature.subarray(0,8)],[137,80,78,71,13,10,26,10]);await closeMedia(page);}
    await page.screenshot({path:path.join(output,`reader-${width}x${height}.png`),scale:'css'});await(await mediaControl(page,'[data-binder-field=version]')).selectOption(second.id);await closeMedia(page);assert.equal(await page.locator('.cb-card-heading p').textContent(),second.title);
    await page.locator('[data-binder-action=back]').click();assert.equal(await pocket(second.id).count(),1);assert(await pocket(second.id).locator('.cb-card').evaluate(n=>n===document.activeElement),'Back focuses the selected version');
  }
  await search.fill(first.title);assert.equal(await page.locator('.cb-pocket:not(.is-empty)').count(),1);await pocket(first.id).locator('.cb-card').click();assert.equal(await page.locator('[data-binder-field=version]').count(),0,'versions cannot bypass search');await page.locator('[data-binder-action=back]').click();
  await search.fill('');await page.evaluate(({ids,keep})=>{const r=KALISTAR_DB.registry;KALISTAR_DB.registry={...r,owned:(u,c)=>r.owned(u,c).filter(i=>!ids.includes(i.cardId)||i.cardId===keep)};},{ids:fixture.versions.map(v=>v.id),keep:first.id});await page.locator('[data-binder-action=scope][data-id=owned]').click();await search.fill('MOMO');assert.equal(await page.locator('.cb-pocket:not(.is-empty)').count(),1);
  await page.evaluate(()=>{KALISTAR_DB.registry=CB_ORIGINAL_REGISTRY;});assert.deepEqual(await protectedState(),beforeState,'versions, reader and downloads never mutate saves');
  const requests=[];page.on('request',r=>{if(r.url().includes('collection-album-media='))requests.push(r.url());});
  const media=await page.evaluate(()=>{
    const source=KALISTAR_DATA.cards.filter(c=>c.name==='MOMO'),cards=Array.from({length:13},(_,i)=>{const c=source[i%source.length],url=new URL(KalistarSite.url(c.pngUrl),document.baseURI);url.searchParams.set('collection-album-media',String(i));return {...c,id:'media-'+String(i).padStart(2,'0'),pngUrl:url.href};});
    const host=document.createElement('main');host.id='app';document.querySelector('#app').replaceWith(host);const surface=document.createElement('div');surface.id='collection-binder-root';host.append(surface);window.CB_MEDIA_FIXTURE=KalistarCollection.create({data:{...KALISTAR_DATA,cards},getOwned:id=>cards.filter(c=>!id||c.id===id).map(c=>({cardId:c.id}))});CB_MEDIA_FIXTURE.mount(surface);return cards.map(c=>({id:c.id,url:c.pngUrl}));
  });
  await page.setViewportSize({width:1440,height:900});await images();assert(media.slice(0,12).every(c=>requests.includes(c.url)),'visible version images requested');assert(!requests.includes(media[12].url),'off-spread image is deferred');await page.locator('[data-binder-action=next-page]').click();await images();assert(requests.includes(media[12].url));
  await page.evaluate(()=>CB_MEDIA_FIXTURE.destroy());assert.deepEqual(await protectedState(),beforeState);assert.deepEqual(errors,[]);await context.close();
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,built,sizes},null,2)+'\n');
  console.log('PASS: separate versions, universe filters, responsive reader tabs/copies, native card/art/PNG, ownership, keyboard, focus, lazy media and unchanged saves.');
}
main().catch(async error=>{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,built,error:error.message},null,2)+'\n');await activePage?.screenshot({path:path.join(output,'failure.png'),scale:'css'}).catch(()=>{});console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
