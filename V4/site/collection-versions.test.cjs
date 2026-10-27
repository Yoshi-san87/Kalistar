'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__collection_versions__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',url=built?'https://kalistar-versions.invalid/Kalistar':process.env.KALISTAR_URL||'http://127.0.0.1:4304',output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/collection-gallery-versions');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const sizes=[[1440,1000],[1920,1080],[2560,1440],[412,1007],[390,844],[320,568],[844,390]];
async function enter(page){await page.locator('[data-startup-enter]:enabled').click();await page.waitForFunction(()=>window.KALISTAR_READY);}
async function settle(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
let browser;
async function main(){
  fs.mkdirSync(output,{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  if(built)await context.route(url+'/**',route=>{
    const p=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,p.endsWith('/')?p+'index.html':p);
    if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:p});
    const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
    return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
  });
  page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/jeu/#collection');await enter(page);
  const protectedState=async()=>{const state=await page.evaluate(()=>({catalogue:KALISTAR_DATA,owned:KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).slice().sort((a,b)=>a.id.localeCompare(b.id)),matches:KALISTAR_DB.registry.matches(KALISTAR_ACTIVE_USER),games:Object.fromEntries(Object.keys(localStorage).filter(k=>/(?:^|\.)game$/.test(k)).sort().map(k=>[k,localStorage.getItem(k)]))}));return Object.fromEntries(Object.entries(state).map(([key,value])=>[key,require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex')]));};
  const beforeState=await protectedState();
  const fixture=await page.evaluate(()=>{
    const versions=KALISTAR_DATA.cards.filter(c=>c.name==='MOMO').sort((a,b)=>a.id.localeCompare(b.id));
    const original=KALISTAR_DB.registry,user=KALISTAR_ACTIVE_USER,copy=original.owned(user,versions[0].id)[0];
    if(!copy)throw Error('Missing owned MOMO fixture');window.CB_ORIGINAL_REGISTRY=original;
    // A read-only count adapter: the first version owns two copies, the second one.
    KALISTAR_DB.registry={...original,owned:(u,id)=>{const items=original.owned(u,id);return u===user&&(!id||id===copy.cardId)?[...items,{...copy,id:'version-test-copy'}]:items;}};
    return {versions:versions.map(c=>({id:c.id,title:c.title,text:c.text||c.description||'',pngUrl:KalistarSite.url(c.pngUrl)})),character:versions[0].characterId||versions[0].id};
  });
  const [first,second]=fixture.versions;
  assert.ok(fixture.versions.length>=2);
  const pocket=page.locator('.cb-pocket[data-character="'+fixture.character+'"]');
  const waitCard=id=>page.waitForFunction(({character,id})=>[...document.querySelectorAll('.cb-pocket')].some(n=>n.dataset.character===character&&n.dataset.cardId===id),{character:fixture.character,id});
  const readyImages=()=>page.waitForFunction(()=>[...document.querySelectorAll('.cb-stack img,.cb-hero-image')].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight;}).every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
  await page.locator('[data-binder-action=scope][data-id=catalogue]').click();
  await readyImages();
  const universeCounts=await page.evaluate(()=>{
    const cards=KALISTAR_DATA.cards,collab=KalistarCollaborations;
    return {kalistar:cards.filter(c=>collab.universe(c)==='kalistar').length,'final-fantasy':cards.filter(c=>/^FF\d+$/.test(collab.of(c)?.faction||'')).length,nier:cards.filter(c=>collab.matches(c,'nier')||collab.matches(c,'replicant')).length};
  });
  for(const [scope,count] of Object.entries(universeCounts)){
    await page.locator('[data-binder-filter=collection]:visible').selectOption(scope);
    await page.waitForFunction(expected=>document.querySelector('.cb-count')?.textContent.includes(expected+' versions'),count);
  }
  await page.locator('[data-binder-filter=collection]:visible').selectOption('nier');
  await page.locator('[data-binder-action=filters]').click();
  const factionChoices=await page.locator('[data-binder-filter=faction] option').evaluateAll(options=>options.map(option=>option.value));
  const fantasyFactions=await page.evaluate(()=>KalistarCollaborations.entries.filter(e=>/^FF\d+$/.test(e.faction)).map(e=>e.faction));
  for(const faction of [...fantasyFactions,'NieR','Replicant'])assert(factionChoices.includes(faction),'Faction filter remains available: '+faction);
  const replicantCount=await page.evaluate(()=>KALISTAR_DATA.cards.filter(c=>KalistarCollaborations.matches(c,'replicant')).length);
  await page.locator('[data-binder-filter=faction]').selectOption('Replicant');
  await page.waitForFunction(expected=>document.querySelector('.cb-count')?.textContent.includes(expected+' versions'),replicantCount);
  await page.locator('.cb-filter-actions [data-binder-action=close-overlay]').click();
  await page.locator('.cb-toolbar [data-binder-action=reset]').click();
  await page.locator('[data-binder-action=scope][data-id=catalogue]').click();
  await readyImages();
  assert.equal(await pocket.locator('.cb-copy-count b').textContent(),'2');
  assert.match(await pocket.locator('.cb-version-count').getAttribute('aria-label'),new RegExp('^'+fixture.versions.length+' versions'));
  assert.match(await pocket.locator('.cb-version-count b').textContent(),new RegExp('1\\s*/\\s*'+fixture.versions.length+'$'));
  await pocket.locator('[data-binder-action=cycle-version]').scrollIntoViewIfNeeded();
  const folio=await page.locator('.cb-page-label').textContent(),before=await pocket.boundingBox();
  await pocket.locator('[data-binder-action=cycle-version]').click();await waitCard(second.id);
  assert.equal(await page.locator('.cb-page').getAttribute('data-mode'),'book');
  assert.equal(await page.locator('.cb-page-label').textContent(),folio);
  assert.deepEqual(await pocket.boundingBox(),before,'cycling preserves the gallery geometry');
  assert.equal(await pocket.locator('.cb-copy-count b').textContent(),'1');
  assert.match(await pocket.locator('.cb-card').getAttribute('aria-label'),new RegExp(second.title));
  assert.equal(await pocket.locator('[data-binder-action=favorite]').getAttribute('data-id'),second.id);
  assert.equal(await pocket.locator('[data-binder-action=cycle-version]').evaluate(n=>n===document.activeElement),true,'keyboard focus follows the new version');
  for(const version of [...fixture.versions.slice(2),first]){
    await pocket.locator('[data-binder-action=cycle-version]').press('Enter');await waitCard(version.id);
  }
  for(const [width,height] of sizes){
    await page.setViewportSize({width,height});await settle(page);await pocket.scrollIntoViewIfNeeded();await readyImages();
    await page.screenshot({path:path.join(output,`gallery-${width}x${height}.png`),scale:'css'});
    const fits=await pocket.locator('.cb-caption').evaluate(n=>{
      const box=n.getBoundingClientRect();return [...n.querySelectorAll('.cb-copy-count,h2,.cb-version-count,.cb-icon')].every(c=>{const r=c.getBoundingClientRect();return r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1;});
    });
    assert.ok(fits,'caption counters fit at '+width+'x'+height);
    const inline=await pocket.locator('.cb-caption').evaluate(n=>{
      const pocket=n.closest('.cb-pocket'),card=pocket.querySelector('.cb-stack').getBoundingClientRect(),copies=pocket.querySelector('.cb-card-copies').getBoundingClientRect(),favorite=pocket.querySelector('.cb-card-favorite').getBoundingClientRect(),versions=n.querySelector('.cb-version-count').getBoundingClientRect(),name=n.querySelector('h2').getBoundingClientRect();
      const separate=(a,b)=>a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1;
      return copies.left>=card.left&&copies.bottom<=card.bottom&&favorite.right<=card.right+1&&favorite.bottom<=card.bottom&&separate(copies,favorite)&&separate(versions,name);
    });
    assert.ok(inline,'copies/favorite occupy card corners and versions never cross the name, at '+width+'x'+height);
    assert.ok((await pocket.locator('.cb-card').boundingBox()).height>=120,'cards retain a readable height at '+width+'x'+height);
    await pocket.locator('.cb-card').click();
    const notes=page.locator('[data-binder-action=pane][data-id=notes]');if(await notes.isVisible())await notes.click();
    assert.deepEqual(await page.locator('.cb-versions button > span:last-child').allTextContents(),fixture.versions.map(v=>v.title));
    assert.equal(await page.locator('.cb-versions button[aria-pressed=true]').count(),1);
    const geometry=await page.locator('.cb-reader').evaluate(n=>{
      const visual=n.querySelector('.cb-visual'),reading=n.querySelector('.cb-reading'),v=visual.getBoundingClientRect(),r=reading.getBoundingClientRect();
      const versions=reading.querySelector('.cb-versions'),tabs=reading.querySelector('.cb-reading-tabs'),paragraph=reading.querySelector('.cb-story p');
      const labels=[...versions.querySelectorAll('button > span:last-child')].map(s=>{const range=document.createRange();range.selectNodeContents(s);const ink=range.getBoundingClientRect(),button=s.parentElement.getBoundingClientRect();return ink.width>0&&ink.left>=button.left-1&&ink.right<=button.right+1&&ink.bottom<=button.bottom+1;});
      const active=versions.querySelector('[aria-pressed=true]'),inactive=versions.querySelector('[aria-pressed=false]');
      return {sideBySide:v.right<=r.left+1,stacked:v.bottom<=r.top+1,visible:v.width>0&&v.height>0&&r.width>0&&r.height>0,labels:labels.every(Boolean),overlap:versions.getBoundingClientRect().bottom>tabs.getBoundingClientRect().top+1,font:parseFloat(getComputedStyle(paragraph).fontSize),overflow:document.documentElement.scrollWidth-innerWidth,selectedStyle:getComputedStyle(active).backgroundColor!==getComputedStyle(inactive).backgroundColor||getComputedStyle(active).borderColor!==getComputedStyle(inactive).borderColor};
    });
    assert(geometry.visible&&geometry.labels&&!geometry.overlap&&geometry.font>=14&&geometry.overflow<=1&&geometry.selectedStyle,'readable reader: '+JSON.stringify({width,height,geometry}));
    if(width>=1440)assert(geometry.sideBySide,'desktop keeps visual left and content right');
    if(width<=699)assert(geometry.stacked,'phone keeps visual then content in vertical flow');
    assert.equal(await page.locator('.cb-story p').textContent(),first.text,'the complete story stays available');
    for(const pane of ['visual','notes']){
      const button=page.locator(`[data-binder-action=pane][data-id=${pane}]`);
      if(await button.isVisible()){
        await button.click();await settle(page);
        assert(await page.locator('.cb-visual').isVisible()&&await page.locator('.cb-reading').isVisible(),'pane shortcuts do not hide either section');
        const target=page.locator(pane==='visual'?'.cb-visual':'.cb-reading');
        assert(await target.evaluate(n=>{const r=n.getBoundingClientRect(),work=n.closest('.cb-workbench').getBoundingClientRect();return r.top<work.bottom&&r.bottom>work.top;}),'pane shortcut scrolls to its section');
      }
    }
    await page.locator('.cb-story p').scrollIntoViewIfNeeded();
    const storyReachable=await page.locator('.cb-story p').evaluate(n=>{
      const r=n.getBoundingClientRect(),leaf=n.closest('.cb-workbench').getBoundingClientRect(),y=(Math.max(r.top,leaf.top)+Math.min(r.bottom,leaf.bottom))/2;
      return n.closest('.cb-read-content').clientHeight>0&&document.elementsFromPoint(r.left+r.width/2,y).includes(n);
    });
    assert.ok(storyReachable,'the story remains reachable at '+width+'x'+height);
    for(const tab of ['profile','career','copies']){
      await page.locator(`[data-binder-action=tab][data-id=${tab}]`).click();
      assert.equal(await page.locator('#cb-read-content').getAttribute('aria-labelledby'),'cb-tab-'+tab);
      assert((await page.locator('#cb-read-content').textContent()).trim().length>0,'reader content '+tab);
    }
    const ownedIds=await page.evaluate(id=>KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER,id).map(c=>c.id),first.id);
    assert.deepEqual(await page.locator('.cb-copy b').allTextContents(),ownedIds.slice(0,2),'copies retain their instance identities');
    await page.locator('[data-binder-action=tab][data-id=copies]').focus();await page.keyboard.press('Home');
    assert.equal(await page.locator('[data-binder-action=tab][data-id=story]').getAttribute('aria-selected'),'true');
    assert(await page.locator('[data-binder-action=tab][data-id=story]').evaluate(n=>n===document.activeElement));
    await page.locator('[data-binder-action=media][data-id=art]').click();await readyImages();
    assert(await page.locator('.cb-hero-image').evaluate(n=>n.classList.contains('is-art')&&n.dataset.v4Cropped==='art'));
    await page.locator('[data-binder-action=media][data-id=card]').click();await readyImages();
    assert(await page.locator('.cb-hero-image').evaluate(n=>!n.classList.contains('is-art')&&n.dataset.v4Cropped==='card'));
    assert.equal(await page.locator('.cb-visual a[download]').getAttribute('href'),first.pngUrl,'download keeps the native PNG source');
    if(width===1440){
      const pending=page.waitForEvent('download');await page.locator('.cb-visual a[download]').click();const download=await pending;
      assert.match(download.suggestedFilename(),/\.png$/i);assert.equal(await download.failure(),null);
      const stream=await download.createReadStream();let signature=Buffer.alloc(0);
      for await(const chunk of stream){signature=Buffer.concat([signature,chunk]);if(signature.length>=8)break;}
      assert.deepEqual([...signature.subarray(0,8)],[137,80,78,71,13,10,26,10],'download is a real PNG');
    }
    await readyImages();await page.screenshot({path:path.join(output,`reader-${width}x${height}.png`),scale:'css'});
    await page.locator('.cb-versions [data-id="'+second.id+'"]').click();
    assert.equal(await page.locator('.cb-versions [aria-pressed=true]').getAttribute('data-id'),second.id);
    assert.equal(await page.locator('.cb-card-heading p').textContent(),second.title);
    await page.locator('[data-binder-action=back]').click();await waitCard(second.id);
    for(const version of [...fixture.versions.slice(2),first]){
      await pocket.locator('[data-binder-action=cycle-version]').click();await waitCard(version.id);
    }
  }
  await page.setViewportSize({width:1440,height:1000});await settle(page);await readyImages();await page.emulateMedia({reducedMotion:'no-preference'});
  await pocket.locator('.cb-layer-0').evaluate(n=>{
    const decode=n.decode.bind(n);window.CB_SWAP_DIAGNOSTICS=[];
    n.decode=async()=>{try{return await decode();}catch(error){CB_SWAP_DIAGNOSTICS.push({message:error.message,source:n.src});throw error;}};
  });
  await pocket.locator('[data-binder-action=cycle-version]').click();
  await page.waitForSelector('.cb-stack[data-cycling=true]',{timeout:5000}).catch(async()=>{
    throw Error('Version swap did not animate: '+JSON.stringify(await page.evaluate(()=>({decode:CB_SWAP_DIAGNOSTICS,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,current:document.querySelector('.cb-pocket')?.dataset.cardId,busy:document.querySelector('.cb-flip-control')?.getAttribute('aria-busy')}))));
  });
  const frame=await pocket.locator('.cb-stack').evaluate(n=>{
    const animations=n.getAnimations({subtree:true});animations.forEach(a=>{a.pause();a.currentTime=320;});
    return {count:animations.length,bounded:animations.every(a=>{const t=a.effect.getComputedTiming();return Number.isFinite(t.endTime)&&t.endTime<=1000&&t.iterations===1;}),front:getComputedStyle(n.querySelector('.cb-card')).transform,back:getComputedStyle(n.querySelector('.cb-layer-0')).transform};
  });
  assert.equal(frame.count,2);assert(frame.bounded,'WAAPI swap is finite');assert.notEqual(frame.front,'none');assert.notEqual(frame.front,frame.back);
  await page.screenshot({path:path.join(output,'version-swap-midpoint.png'),scale:'css'});
  await pocket.locator('[data-binder-action=cycle-version]').evaluate(n=>{n.click();n.click();});
  await pocket.locator('.cb-stack').evaluate(n=>n.getAnimations({subtree:true}).forEach(a=>a.finish()));await waitCard(second.id);
  assert.equal(await pocket.locator('[aria-busy=true]').count(),0,'rapid clicks do not leave the stack busy');
  await pocket.locator('[data-binder-action=cycle-version]').click();await page.waitForSelector('.cb-stack[data-cycling=true]');
  await page.locator('[data-binder-field=search]').fill('AELIS');
  await page.waitForTimeout(900);assert.equal(await pocket.count(),0,'filter change cancels the previous animation');
  assert.equal(await page.locator('.cb-stack[data-cycling=true],[aria-busy=true]').count(),0);
  await page.locator('[data-binder-field=search]').fill('MOMO');
  await pocket.locator('[data-binder-action=cycle-version]').click();await page.waitForSelector('.cb-stack[data-cycling=true]');
  await pocket.locator('.cb-stack').evaluate(n=>{window.CB_CANCELLED_STACK=n;});
  await page.locator('[data-view=decks]').click();
  assert.equal(await page.evaluate(()=>CB_CANCELLED_STACK.getAnimations({subtree:true}).length),0,'navigation destroys the in-flight version animation');
  await page.waitForTimeout(900);assert(await page.locator('.kdb-page').isVisible(),'late swap completion cannot replace the destination view');
  await page.locator('[data-view=collection]').click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-binder-field=search]').fill(first.title);
  assert.equal(await pocket.locator('.cb-version-count').count(),0,'single filtered versions have no dial or count');
  assert.equal(await pocket.locator('[data-binder-action=cycle-version]').count(),0,'cycling never bypasses a filter');
  await page.locator('[data-binder-field=search]').fill('');
  await page.evaluate(({ids,keep})=>{const registry=KALISTAR_DB.registry;KALISTAR_DB.registry={...registry,owned:(u,c)=>registry.owned(u,c).filter(i=>!ids.includes(i.cardId)||i.cardId===keep)};},{ids:fixture.versions.map(v=>v.id),keep:first.id});
  await page.locator('[data-binder-action=scope][data-id=owned]').click();
  assert.equal(await pocket.locator('.cb-version-count').count(),0,'single owned versions have no dial or count');
  assert.equal(await pocket.locator('[data-binder-action=cycle-version]').count(),0,'owned scope does not reveal an unowned version');
  await page.evaluate(()=>{KALISTAR_DB.registry=CB_ORIGINAL_REGISTRY;});
  assert.deepEqual(await protectedState(),beforeState,'versions and reader never change collection/game data');
  // Unique media URLs avoid confusing browser cache hits with deferred loading.
  const mediaRequests=[];page.on('request',request=>{if(request.url().includes('collection-gallery-media='))mediaRequests.push(request.url());});
  const media=await page.evaluate(()=>{
    const variants=KALISTAR_DATA.cards.filter(c=>c.name==='MOMO').sort((a,b)=>a.id.localeCompare(b.id)).slice(0,2);
    const cards=variants.map((c,i)=>{const url=new URL(KalistarSite.url(c.pngUrl),document.baseURI);url.searchParams.set('collection-gallery-media',String(i));return {...c,pngUrl:url.href};});
    const host=document.createElement('main');host.id='app';document.querySelector('#app').replaceWith(host);
    const surface=document.createElement('div');surface.id='collection-binder-root';host.append(surface);
    const view=KalistarCollection.create({data:{...KALISTAR_DATA,cards},getOwned:id=>id?[{cardId:id}]:cards.map(c=>({cardId:c.id}))});
    surface.innerHTML=view.render();view.mount(surface);window.CB_MEDIA_FIXTURE=view;
    return cards.map(c=>({id:c.id,url:c.pngUrl}));
  });
  await readyImages();await settle(page);
  assert(mediaRequests.includes(media[0].url),'front PNG is requested');assert(!mediaRequests.includes(media[1].url),'next PNG is not prefetched');
  assert(await page.locator('.cb-behind').evaluateAll(nodes=>nodes.length>0&&nodes.every(n=>n.getAttribute('src')==='assets/back-obsidian-v1.webp')),'unselected variants use the common card back');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const requested=page.waitForRequest(request=>request.url()===media[1].url);
  await page.locator('[data-binder-action=cycle-version]').click();await requested;
  await page.waitForFunction(id=>document.querySelector('.cb-pocket').dataset.cardId===id,media[1].id);
  await readyImages();assert.equal(await page.locator('[aria-busy=true]').count(),0);
  await page.locator('[data-binder-action=cycle-version]').click();await page.waitForSelector('.cb-stack[data-cycling=true]');
  const destroyedId=await page.locator('.cb-pocket').getAttribute('data-card-id');
  await page.evaluate(()=>CB_MEDIA_FIXTURE.destroy());await page.waitForTimeout(900);
  assert.equal(await page.locator('.cb-pocket').getAttribute('data-card-id'),destroyedId,'destroyed fixture cannot repaint after cancellation');
  assert.equal(await page.locator('.cb-stack[data-cycling=true],[aria-busy=true]').count(),0);
  assert.deepEqual(await protectedState(),beforeState);
  assert.deepEqual(errors,[]);
  console.log('PASS: named versions, responsive reader, story/profile/career/copies, card/art/PNG, ownership, keyboard focus, bounded swap, cancellation and seven responsive sizes.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
