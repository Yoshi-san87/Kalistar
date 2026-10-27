'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__collection_gallery_qa__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',url=built?'https://kalistar-gallery.invalid/Kalistar':process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/collection-fixed-layout');
const sizes=[[1440,1000],[1920,1080],[2560,1440],[2560,800],[1440,600],[412,1007],[390,844],[320,568],[844,390]];
const action=(p,name,id)=>p.locator(`[data-binder-action="${name}"]${id===undefined?'':`[data-id="${id}"]`}:visible`);
async function enter(p){await p.locator('[data-startup-enter]:enabled').click();await p.waitForFunction(()=>window.KALISTAR_READY);}
async function settle(p){await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function setDensity(p,value){
  const viewport=p.viewportSize(),control=action(p,'density',value),resize=!await control.isVisible();
  // Phone hides density controls; select through the desktop UI, then resize back.
  if(resize)await p.setViewportSize({width:1440,height:1000});
  await control.click();if(resize)await p.setViewportSize(viewport);await settle(p);
}
async function images(p){await p.waitForFunction(()=>[...document.querySelectorAll('.cb-pocket img,.cb-hero-image')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight;}).every(n=>n.complete&&n.naturalWidth>0&&!n.src.includes('#v4-')));}
async function routeBuilt(context){
  if(!built)return;
  await context.route(url+'/**',route=>{
    const p=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,p.endsWith('/')?p+'index.html':p);
    if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:p});
    const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
    return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
  });
}
async function layout(p){
  return p.locator('.cb-spread').evaluate(spread=>{
    const within=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
    const separate=(a,b)=>a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1;
    const rect=n=>n.getBoundingClientRect(),visible=n=>n.getClientRects().length>0&&getComputedStyle(n).visibility==='visible',groups=[];
    const viewport={left:0,top:0,right:innerWidth,bottom:innerHeight},work=spread.closest('.cb-workbench'),workBox=rect(work);
    const pockets=[...spread.querySelectorAll(':scope > .cb-pocket')].map(pocket=>{
      const box=rect(pocket),stage=pocket.querySelector(':scope > .cb-art-stage'),stack=pocket.querySelector('.cb-stack'),card=pocket.querySelector('.cb-card'),caption=pocket.querySelector('.cb-caption.cb-pedestal');
      const stand=rect(caption),face=rect(card),title=caption.querySelector('.cb-caption-title'),favorite=stack.querySelector('.cb-card-favorite'),copies=stack.querySelector('.cb-card-copies');
      const controls=[...caption.querySelectorAll('.position-emblem,.cb-flip-control')];
      const text=[...title.querySelectorAll('h2,p')].filter(visible).map(n=>{
        const range=document.createRange();range.selectNodeContents(n);const ink=range.getBoundingClientRect();
        // Font ascenders may exceed the line box into unpainted padding, never the pedestal.
        const titleBox=rect(title),otherText=[...title.querySelectorAll('h2,p')].filter(other=>other!==n&&visible(other));
        return {text:n.textContent,heading:n.tagName==='H2',fits:within(ink,stand)&&ink.left>=titleBox.left-1&&ink.right<=titleBox.right+1&&n.scrollWidth<=n.clientWidth+1,ink:ink.toJSON(),title:titleBox.toJSON(),stand:stand.toJSON(),clear:[...controls,...otherText].every(c=>separate(ink,rect(c))),font:parseFloat(getComputedStyle(n).fontSize),inlineFont:n.style.fontSize};
      });
      const mark=caption.querySelector('.cb-faction-watermark'),c=(window.CB_FIXTURE_DATA||KALISTAR_DATA).cards.find(c=>c.id===pocket.dataset.cardId);
      let row=groups.find(r=>Math.abs(r.top-box.top)<2);if(!row){row={top:box.top,count:0};groups.push(row);}row.count++;
      return {id:c.id,name:c.name,positions:[...caption.querySelectorAll('.position-emblem')].map(n=>Number(n.dataset.positionIcon)),expectedPositions:c.positions,text,
        identity:title.querySelector('h2')?.textContent===c.name&&title.querySelector('p')?.textContent===c.title&&card.dataset.id===c.id&&favorite.dataset.id===c.id,
        versionHidden:!visible(title.querySelector('p')),
        fits:within(box,rect(spread))&&within(box,workBox)&&within(box,viewport)&&within(face,box)&&within(stand,box)&&controls.every(n=>visible(n)&&within(rect(n),stand)),
        // Hover may lift the stack inside the pocket without changing its stage size.
        stage:!!stage&&stack.parentElement===stage&&within(rect(stage),box)&&stack.offsetWidth<=stage.clientWidth+1&&stack.offsetHeight<=stage.clientHeight+1,
        separate:separate(stand,face)&&controls.every((n,i)=>controls.slice(i+1).every(other=>separate(rect(n),rect(other)))),
        targets:[card,favorite,...caption.querySelectorAll('button')].every(n=>{const r=rect(n);return visible(n)&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),
        card:{width:face.width,height:face.height,ratio:face.width/face.height,imageRatio:rect(card.querySelector('img')).width/rect(card.querySelector('img')).height,sharp:!getComputedStyle(card).filter.includes('blur')},
        favorite:visible(favorite)&&within(rect(favorite),face)&&rect(favorite).left+rect(favorite).width/2>face.left+face.width/2&&rect(favorite).top+rect(favorite).height/2>face.top+face.height/2&&!favorite.closest('.cb-card'),
        copies:visible(copies)&&within(rect(copies),face)&&rect(copies).left+rect(copies).width/2<face.left+face.width/2&&rect(copies).top+rect(copies).height/2>face.top+face.height/2&&separate(rect(copies),rect(favorite)),
        count:Number(copies.querySelector('b').textContent),expectedCount:window.CB_FIXTURE_COUNTS?.[c.id]??KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER,c.id).length,
        source:mark.querySelector('img').getAttribute('src'),expectedSource:KalistarCollaborations.asset('factions',c.faction),markInert:getComputedStyle(mark).pointerEvents==='none',versions:caption.querySelectorAll('[data-binder-action=cycle-version]').length};
    });
    const scroll=[document.documentElement,document.body,document.querySelector('#app'),spread.closest('.cb-page'),work,spread].map(n=>({node:n.id||n.className||n.tagName,overflow:n.scrollHeight-n.clientHeight,top:n.scrollTop}));
    const chrome=[...document.querySelectorAll('.cb-heading,.cb-toolbar,.cb-footer,.main-nav')].filter(visible);
    return {columns:Number(spread.dataset.columns),pageSize:Number(spread.dataset.pageSize),rowCapacity:Number(spread.dataset.rows),rows:groups.map(r=>r.count),pockets,direct:spread.children.length===pockets.length,display:getComputedStyle(spread).display,legacy:spread.querySelectorAll('.cb-sheet,.cb-plinth-art').length,overflow:document.documentElement.scrollWidth-innerWidth,scroll,
      contained:within(rect(spread),workBox)&&within(workBox,viewport),chrome:chrome.every(n=>within(rect(n),viewport)&&separate(rect(n),workBox)&&[...n.querySelectorAll('button,input,select')].filter(visible).every(c=>within(rect(c),rect(n)))),short:innerHeight<700};
  });
}
function assertLayout(r,label,{full=false,five=false}={}){
  assert.equal(r.display,'grid',label);assert.equal(r.direct,true,'direct grid children');assert.equal(r.legacy,0);
  assert(r.columns>=2&&r.columns<=8,label+': '+r.columns+' columns exceed the 2-8 bound');
  assert([1,2].includes(r.rowCapacity),label+': one or two rows');assert.equal(r.pageSize,r.columns*r.rowCapacity,'capacity follows both axes');
  assert(r.pockets.length>0&&r.pockets.length<=r.pageSize,label);assert(r.rows.length<=r.rowCapacity&&r.rows.every(n=>n<=r.columns),label);
  if(full){assert.equal(r.pockets.length,r.pageSize);assert.deepEqual(r.rows,Array(r.rowCapacity).fill(r.columns));}
  assert(r.overflow<=1,label+': no horizontal overflow');
  assert(r.contained&&r.chrome,label+': gallery and chrome fit the viewport');
  assert(r.scroll.every(n=>n.overflow<=1&&n.top===0),label+': no vertical gallery/document scroll '+JSON.stringify(r.scroll));
  for(const c of r.pockets){
    const message=label+': '+JSON.stringify(c);assert(c.fits&&c.stage&&c.separate&&c.targets&&c.favorite&&c.copies&&c.identity,message);
    assert(c.card.height>=120&&c.card.width>60&&c.card.sharp,message);
    assert(Math.abs(c.card.ratio-797/1388)<.003&&Math.abs(c.card.imageRatio-797/1388)<.003,'card artwork keeps its aspect ratio: '+message);
    assert(c.text.some(t=>t.heading&&t.text===c.name)&&c.text.length===(c.versionHidden?1:2)&&c.text.every(t=>t.fits&&t.clear&&t.font>=(t.heading?12:10)&&!t.inlineFont),message);
    if(r.short)assert(c.versionHidden,'short galleries hide only the version title: '+message);
    assert.deepEqual(c.positions,c.expectedPositions,'every position remains visible and correct');
    assert.equal(c.count,c.expectedCount,'copies follow displayed model ID');assert.equal(c.source,c.expectedSource,'faction follows displayed version');assert(c.markInert);
    if(five)assert.equal(c.positions.length,5,message);
  }
}
async function protectedState(p){
  const state=await p.evaluate(()=>({catalogue:KALISTAR_DATA,owned:KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).slice().sort((a,b)=>a.id.localeCompare(b.id)),matches:KALISTAR_DB.registry.matches(KALISTAR_ACTIVE_USER),games:Object.fromEntries(Object.keys(localStorage).filter(k=>/(?:^|\.)game$/.test(k)).sort().map(k=>[k,localStorage.getItem(k)]))}));
  return Object.fromEntries(Object.entries(state).map(([key,value])=>[key,require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex')]));
}
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[],failures=[];
  const verify=(label,check)=>{try{check();}catch(error){failures.push({label,message:error.message});console.error('FAIL '+label+': '+error.message);}};
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await routeBuilt(context);
    const page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url+'/jeu/#collection');await enter(page);await page.locator('.cb-spread').waitFor();page.setDefaultTimeout(30000);const before=await protectedState(page);
    await action(page,'scope','catalogue').click();
    for(const [width,height] of sizes){
      await page.setViewportSize({width,height});await settle(page);let comfortable;
      for(const density of ['comfortable','compact']){
        await setDensity(page,density);await images(page);assert.equal(await page.locator(`[data-binder-action=density][data-id=${density}]`).getAttribute('aria-pressed'),'true');
        const r=await layout(page);verify(`${width}x${height} ${density}`,()=>assertLayout(r,`${width}x${height} ${density}`,{full:true,density}));
        if(width<=699)assert.equal(r.columns,2);if(width>=1440)assert(r.columns>=3);
        if(density==='comfortable')comfortable=r;else assert(r.columns>=comfortable.columns&&r.pageSize>=comfortable.pageSize,'compact cannot reduce capacity');
        checks.push({width,height,density,...r});await page.screenshot({path:path.join(output,`gallery-${width}x${height}-${density}.png`),scale:'css'});
      }
    }
    for(const density of ['comfortable','compact']){
      const at=(width,height)=>checks.find(r=>r.width===width&&r.height===height&&r.density===density);
      assert(at(2560,1440).pageSize>at(2560,800).pageSize,'height alone changes page capacity: '+density);
      assert(at(2560,1440).columns>at(412,1007).columns,'width changes column capacity: '+density);
      assert.equal(at(2560,1440).rowCapacity,2);assert.equal(at(844,390).rowCapacity,1);
    }
    console.log('Gallery viewport/density matrix completed.');
    await page.setViewportSize({width:412,height:1007});await settle(page);await setDensity(page,'comfortable');
    await action(page,'pages').click();await action(page,'jump-page','1').click();await settle(page);
    const galleryPage=await page.locator('.cb-page-label').textContent(),galleryIds=await page.locator('.cb-pocket').evaluateAll(ns=>ns.map(n=>n.dataset.cardId));
    const opened=action(page,'open').last(),id=await opened.getAttribute('data-id');await opened.click();
    assert.equal(await page.locator('.cb-visual a[download]').getAttribute('href'),await page.evaluate(id=>KalistarSite.url(KALISTAR_DATA.cards.find(c=>c.id===id).pngUrl),id),'reader retains the displayed model native PNG');
    await action(page,'back').click();await settle(page);
    assert.equal(await page.locator('.cb-page').getAttribute('data-mode'),'book');assert.equal(await page.locator('.cb-page-label').textContent(),galleryPage,'Back restores the same page');
    assert.deepEqual(await page.locator('.cb-pocket').evaluateAll(ns=>ns.map(n=>n.dataset.cardId)),galleryIds,'Back restores the same visible models');
    assertLayout(await layout(page),'Back to fixed gallery');
    assert(await action(page,'open',id).evaluate(n=>n===document.activeElement),'Back restores focus');
    console.log('Gallery Back/page/focus completed.');
    const initial=await page.locator('.cb-page-label').textContent();await action(page,'next-page').click();assert.notEqual(await page.locator('.cb-page-label').textContent(),initial);
    await action(page,'pages').click();const last=String(await action(page,'jump-page').count()-1);await action(page,'jump-page',last).click();assert(await action(page,'next-page').isDisabled());
    await action(page,'pages').click();await action(page,'jump-page','0').click();assert(await action(page,'previous-page').isDisabled());
    console.log('Gallery pagination completed.');
    await page.setViewportSize({width:1440,height:1000});await settle(page);
    await page.locator('.cb-elements [data-binder-action=filter-choice][data-id=ELECTRO]').click();
    assert(await page.locator('.cb-pocket').evaluateAll(ns=>ns.length>0&&ns.every(n=>KALISTAR_DATA.cards.find(c=>c.id===n.dataset.cardId).element==='ELECTRO')));
    // Deterministic endpoints catch discovery restricted to the current page.
    const discovery=await page.evaluate(()=>KALISTAR_DATA.cards.filter(c=>c.element==='ELECTRO').sort((a,b)=>a.id.localeCompare(b.id)).map(c=>c.id));
    for(const [random,expected] of [[0,discovery[0]],[.999999999,discovery.at(-1)]]){
      await page.evaluate(value=>{const original=Math.random;try{Math.random=()=>value;document.querySelector('[data-binder-action=discover]').click();}finally{Math.random=original;}},random);
      assert.equal(await page.locator('.cb-versions [aria-pressed=true]').getAttribute('data-id'),expected);await action(page,'back').click();
    }
    await action(page,'reset').click();await page.locator('[data-binder-field=search]').fill('__no_gallery_card__');
    assert.equal(await page.locator('.cb-pocket').count(),0);assert(await page.locator('.cb-empty').isVisible());assert(await action(page,'discover').isDisabled());
    // No spread exists while empty; clearing after a resize must measure the new workbench.
    for(const [width,height,clear] of [[390,844,'reset'],[844,390,'input'],[1440,1000,'reset']]){
      await page.setViewportSize({width,height});await settle(page);
      const empty=await page.locator('.cb-empty').evaluate(n=>{
        const rect=n=>n.getBoundingClientRect(),visible=n=>n&&n.getClientRects().length>0;
        const within=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
        const separate=(a,b)=>a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1;
        const box=rect(n),work=n.closest('.cb-workbench'),heading=work.querySelector('.cb-gallery-heading');
        return {inside:within(box,rect(work))&&within(box,{left:0,top:0,right:innerWidth,bottom:innerHeight}),heading:!visible(heading)||separate(box,rect(heading)),content:[...n.children].filter(visible).every(c=>within(rect(c),box)),scroll:[document.documentElement,document.body,document.querySelector('#app'),work].every(c=>c.scrollHeight<=c.clientHeight+1&&c.scrollTop===0)};
      });
      assert(empty.inside&&empty.heading&&empty.content&&empty.scroll,'empty gallery after resize '+width+'x'+height+': '+JSON.stringify(empty));
      await page.screenshot({path:path.join(output,`empty-${width}x${height}.png`),scale:'css'});
      if(clear==='input')await page.locator('[data-binder-field=search]').fill('');else await page.locator('.cb-empty [data-binder-action=reset]').click();
      await settle(page);const r=await layout(page);assertLayout(r,`empty reset ${width}x${height}`,{full:true});
      const expected=checks.find(c=>c.width===width&&c.height===height&&c.density==='comfortable');
      assert.equal(r.pageSize,expected.pageSize,'empty reset recalculates capacity for the new viewport');assert.equal(r.columns,expected.columns);assert.equal(r.rowCapacity,expected.rowCapacity);
      const characters=await page.evaluate(()=>new Set(KALISTAR_DATA.cards.map(c=>c.characterId||c.id)).size);
      assert.equal((await page.locator('.cb-page-label span').textContent()).trim(),'1 / '+Math.ceil(characters/r.pageSize));
      checks.push({scenario:'empty-resize',width,height,...r});
      if(width!==1440)await page.locator('[data-binder-field=search]').fill('__no_gallery_card__');
    }
    const search=page.locator('[data-binder-field=search]');await search.pressSequentially('MOMO');
    assert.equal(await search.inputValue(),'MOMO');assert(await search.evaluate(n=>n===document.activeElement&&n.selectionStart===4&&n.selectionEnd===4),'typing survives gallery rerenders with caret and focus');
    const searchPage=await page.locator('.cb-page-label').textContent();await search.press('ArrowLeft');
    assert(await search.evaluate(n=>n===document.activeElement&&n.selectionStart===3),'gallery shortcuts do not intercept search editing');
    assert.equal(await page.locator('.cb-page-label').textContent(),searchPage);await search.fill('');
    console.log('Gallery filters/discovery/empty state completed.');
    await page.locator('[data-view=story]').click();await page.locator('.story-library').waitFor();assert.match(await page.locator('.story-volume-object img').first().getAttribute('src'),/story-closed-grimoire-v2\.webp/);
    // A changed query forces a full document navigation, unlike a hash-only change.
    await page.goto(url+'/jeu/?collection-gallery-qa=map#map');await enter(page);await page.waitForFunction(()=>document.querySelector('.map-atlas')?.naturalWidth>0);
    assert.equal(await page.locator('.map-atlas').getAttribute('src'),await page.evaluate(()=>KalistarSite.atlas));
    await page.goto(url+'/jeu/#collection');await enter(page);assert.deepEqual(await protectedState(page),before);
    const phone=await browser.newContext({viewport:{width:412,height:1007},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await routeBuilt(phone);
    const touch=await phone.newPage();touch.setDefaultTimeout(90000);touch.on('pageerror',e=>errors.push(e.message));await touch.goto(url+'/jeu/#collection');await enter(touch);
    const touchBefore=await protectedState(touch);await action(touch,'scope','catalogue').tap();
    const favorite=touch.locator('.cb-card-favorite').first(),favoriteId=await favorite.getAttribute('data-id'),pressed=await favorite.getAttribute('aria-pressed');
    await favorite.tap();assert.notEqual(await touch.locator(`.cb-card-favorite[data-id="${favoriteId}"]`).getAttribute('aria-pressed'),pressed);
    assert.equal(await touch.locator('.cb-page').getAttribute('data-mode'),'book');assert(await touch.locator(`.cb-card-favorite[data-id="${favoriteId}"]`).evaluate(n=>n===document.activeElement));
    await touch.reload();await enter(touch);assert.notEqual(await touch.locator(`.cb-card-favorite[data-id="${favoriteId}"]`).getAttribute('aria-pressed'),pressed);
    await action(touch,'favorites').tap();assert.deepEqual(await touch.locator('.cb-pocket').evaluateAll(ns=>ns.map(n=>n.dataset.cardId)),[favoriteId]);await action(touch,'favorites').tap();
    await action(touch,'filters').tap();await touch.locator('.cb-overlay:modal').waitFor();await touch.keyboard.press('Escape');assert(await action(touch,'filters').evaluate(n=>n===document.activeElement));
    await touch.screenshot({path:path.join(output,'gallery-touch.png'),scale:'css'});assert.deepEqual(await protectedState(touch),touchBefore);await phone.close();
    // Fixture callbacks never write player data; catalogue models retain real media.
    await page.evaluate(()=>{const host=document.createElement('main');host.id='app';document.querySelector('#app').replaceWith(host);const surface=document.createElement('div');surface.id='collection-binder-root';host.append(surface);window.CB_FIXTURE_SURFACE=surface;});
    console.log('Gallery touch/favorite persistence completed.');
    for(const fixture of ['longest','five-positions','ff9']){
      await page.evaluate(kind=>{
        window.CB_FIXTURE?.destroy();let cards;
        if(kind==='longest')cards=KALISTAR_DATA.cards.slice().sort((a,b)=>b.name.length-a.name.length).slice(0,32);
        if(kind==='five-positions'){
          const variants=KALISTAR_DATA.cards.filter(c=>c.name==='MOMO').slice(0,2),single=KALISTAR_DATA.cards.find(c=>c.name==='ILIANE');if(variants.length!==2||!single)throw Error('Missing long-name fixtures');
          cards=[...variants.map(c=>({...c,characterId:variants[0].characterId||variants[0].id,name:'VALENTIN DE LA FRONTIERE',title:'Une tres longue version de la frontiere lointaine',positions:[1,2,3,4,5]})),{...single,name:"ARCHIVISTE D'ASTRALIA",positions:[1,2,3,4,5]}];
        }
        if(kind==='ff9'){const names=['DJIDANE','VIVI','GRENAT','STEINER','EIKO','FREYJA'];cards=KALISTAR_DATA.cards.filter(c=>names.includes(c.name));if(!names.every(name=>cards.some(c=>c.name===name)))throw Error('Missing FF9 fixtures');}
        window.CB_FIXTURE_DATA={...KALISTAR_DATA,cards};window.CB_FIXTURE_COUNTS=Object.fromEntries(cards.map((c,i)=>[c.id,1+i%27]));window.CB_FIXTURE_ORIGINAL=JSON.stringify(CB_FIXTURE_DATA);
        const view=KalistarCollection.create({data:CB_FIXTURE_DATA,getOwned:id=>id?Array.from({length:CB_FIXTURE_COUNTS[id]},()=>({cardId:id})):cards.map(c=>({cardId:c.id}))});CB_FIXTURE_SURFACE.innerHTML=view.render();view.mount(CB_FIXTURE_SURFACE);window.CB_FIXTURE=view;
      },fixture);
      for(const [width,height] of sizes){
        await page.setViewportSize({width,height});await settle(page);
        for(const density of ['comfortable','compact']){
          await setDensity(page,density);await action(page,'pages').click();await action(page,'jump-page','0').click();await settle(page);const seen=new Set();
          for(let index=0;index<30;index++){
            const r=await layout(page);verify(`${fixture} ${width}x${height} ${density}`,()=>assertLayout(r,`${fixture} ${width}x${height} ${density}`,{five:fixture==='five-positions',density}));
            for(const c of r.pockets){assert(!seen.has(c.id),'pagination cannot repeat a model');seen.add(c.id);}
            if(fixture==='five-positions'){assert.equal(r.pockets.length,2);assert.equal(r.pockets.find(c=>c.name.startsWith('VALENTIN')).versions,1);assert.equal(r.pockets.find(c=>c.name.startsWith('ARCHIVISTE')).versions,0);}
            checks.push({fixture,width,height,density,page:index,...r});if(index===0){await images(page);await page.screenshot({path:path.join(output,`${fixture}-${width}x${height}-${density}.png`),scale:'css'});}
            if(await action(page,'next-page').isDisabled())break;await action(page,'next-page').click();
          }
          assert.equal(seen.size,await page.evaluate(()=>new Set(CB_FIXTURE_DATA.cards.map(c=>c.characterId||c.id)).size),'all characters reachable');
        }
      }
      assert(await page.evaluate(()=>JSON.stringify(CB_FIXTURE_DATA)===CB_FIXTURE_ORIGINAL));console.log('Gallery fixture completed: '+fixture);
    }
    await action(page,'pages').click();await action(page,'jump-page','0').click();
    await page.emulateMedia({forcedColors:'active'});await settle(page);
    assert(await action(page,'cycle-version').first().evaluate(n=>{const s=getComputedStyle(n);return s.borderTopStyle!=='none'||s.outlineStyle!=='none';}),'high contrast version control');
    await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});await page.waitForTimeout(800);
    assert.equal(await page.locator('.cb-page').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running'&&a.effect.getComputedTiming().iterations===Infinity).length),0,'no permanent animation');
    await page.evaluate(()=>CB_FIXTURE.destroy());assert.deepEqual(await protectedState(page),before);assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:failures.length===0,built,sizes,checks,errors,failures},null,2)+'\n');
    assert.deepEqual(failures,[]);console.log(JSON.stringify({passed:true,sizes:sizes.length,screenshots:output}));
  }catch(error){
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,built,sizes,checks,errors,failures,error:error.message},null,2)+'\n');
    const page=browser.contexts().flatMap(context=>context.pages()).at(-1);
    if(page)await page.screenshot({path:path.join(output,'failure.png'),scale:'css'}).catch(()=>{});
    throw error;
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
