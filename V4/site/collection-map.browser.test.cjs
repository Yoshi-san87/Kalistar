'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__collection_gallery_qa__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',url=built?'https://kalistar-gallery.invalid/Kalistar':process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/collection-gallery-layout');
const sizes=[[1440,1000],[1920,1080],[2560,1440],[412,1007],[390,844],[320,568],[844,390]];
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
    const rect=n=>n.getBoundingClientRect(),groups=[];
    const pockets=[...spread.querySelectorAll(':scope > .cb-pocket')].map(pocket=>{
      const box=rect(pocket),stack=pocket.querySelector('.cb-stack'),card=pocket.querySelector('.cb-card'),caption=pocket.querySelector('.cb-caption.cb-pedestal');
      const stand=rect(caption),face=rect(card),title=caption.querySelector('.cb-caption-title'),favorite=stack.querySelector('.cb-card-favorite'),copies=stack.querySelector('.cb-card-copies');
      const controls=[...caption.querySelectorAll('.position-emblem,.cb-flip-control')];
      const text=[...title.querySelectorAll('h2,p')].map(n=>{
        const range=document.createRange();range.selectNodeContents(n);const ink=range.getBoundingClientRect();
        // Font ascenders may exceed the line box into unpainted padding, never the pedestal.
        const titleBox=rect(title),otherText=[...title.querySelectorAll('h2,p')].filter(other=>other!==n);
        return {text:n.textContent,heading:n.tagName==='H2',fits:within(ink,stand)&&ink.left>=titleBox.left-1&&ink.right<=titleBox.right+1&&n.scrollWidth<=n.clientWidth+1,ink:ink.toJSON(),title:titleBox.toJSON(),stand:stand.toJSON(),clear:[...controls,...otherText].every(c=>separate(ink,rect(c))),font:parseFloat(getComputedStyle(n).fontSize),inlineFont:n.style.fontSize};
      });
      const mark=caption.querySelector('.cb-faction-watermark'),c=(window.CB_FIXTURE_DATA||KALISTAR_DATA).cards.find(c=>c.id===pocket.dataset.cardId);
      let row=groups.find(r=>Math.abs(r.top-box.top)<2);if(!row){row={top:box.top,count:0};groups.push(row);}row.count++;
      return {id:c.id,name:c.name,positions:caption.querySelectorAll('.position-emblem').length,text,
        fits:within(face,box)&&within(stand,box)&&controls.every(n=>within(rect(n),stand)),below:stand.top>=face.bottom-1,
        card:{width:face.width,height:face.height,sharp:!getComputedStyle(card).filter.includes('blur')},
        favorite:within(rect(favorite),face)&&rect(favorite).left+rect(favorite).width/2>face.left+face.width/2&&rect(favorite).top+rect(favorite).height/2>face.top+face.height/2&&!favorite.closest('.cb-card'),
        copies:within(rect(copies),face)&&rect(copies).left+rect(copies).width/2<face.left+face.width/2&&rect(copies).top+rect(copies).height/2>face.top+face.height/2,
        count:Number(copies.querySelector('b').textContent),expectedCount:window.CB_FIXTURE_COUNTS?.[c.id]??KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER,c.id).length,
        source:mark.querySelector('img').getAttribute('src'),expectedSource:KalistarCollaborations.asset('factions',c.faction),markInert:getComputedStyle(mark).pointerEvents==='none',versions:caption.querySelectorAll('[data-binder-action=cycle-version]').length};
    });
    return {columns:Number(spread.dataset.columns),pageSize:Number(spread.dataset.pageSize),rows:groups.map(r=>r.count),pockets,direct:spread.children.length===pockets.length,display:getComputedStyle(spread).display,legacy:spread.querySelectorAll('.cb-sheet,.cb-plinth-art').length,overflow:document.documentElement.scrollWidth-innerWidth};
  });
}
function assertLayout(r,label,{full=false,five=false,density='comfortable'}={}){
  assert.equal(r.display,'grid',label);assert.equal(r.direct,true,'direct grid children');assert.equal(r.legacy,0);
  const maximum=density==='compact'?8:6;
  assert(r.columns>=2&&r.columns<=maximum,label+': '+r.columns+' columns exceed the 2-'+maximum+' bound');assert.equal(r.pageSize,r.columns*3,'three rows per page');
  assert(r.pockets.length>0&&r.pockets.length<=r.pageSize,label);assert(r.rows.length<=3&&r.rows.every(n=>n<=r.columns),label);
  if(full){assert.equal(r.pockets.length,r.pageSize);assert.deepEqual(r.rows,[r.columns,r.columns,r.columns]);}
  assert(r.overflow<=1,label+': no horizontal overflow');
  for(const c of r.pockets){
    const message=label+': '+JSON.stringify(c);assert(c.fits&&c.below&&c.favorite&&c.copies,message);
    assert(c.card.height>=120&&c.card.width>60&&c.card.sharp,message);
    assert(c.text.length===2&&c.text.every(t=>t.fits&&t.clear&&t.font>=(t.heading?12:10)&&!t.inlineFont),message);
    assert.equal(c.count,c.expectedCount,'copies follow displayed model ID');assert.equal(c.source,c.expectedSource,'faction follows displayed version');assert(c.markInert);
    if(five)assert.equal(c.positions,5,message);
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
        if(density==='comfortable')comfortable=r.columns;else assert(r.columns>=comfortable,'compact cannot reduce capacity');
        checks.push({width,height,density,...r});await page.screenshot({path:path.join(output,`gallery-${width}x${height}-${density}.png`),scale:'css'});
        // Reveal each row to verify lazy artwork and off-screen pointer targets.
        for(const favorite of await page.locator('.cb-card-favorite').all()){
          await favorite.scrollIntoViewIfNeeded();await images(page);
          assert(await favorite.evaluate(n=>{const r=n.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-binder-action=favorite]')===n;}),'favorite receives its pointer hit');
        }
      }
    }
    console.log('Gallery viewport/density matrix completed.');
    await page.setViewportSize({width:412,height:1007});await settle(page);await setDensity(page,'comfortable');
    const opened=action(page,'open').nth(2);await opened.scrollIntoViewIfNeeded();
    const scroll=await page.locator('.cb-workbench').evaluate(n=>({top:n.scrollTop,max:n.scrollHeight-n.clientHeight}));assert(scroll.max>0&&scroll.top>0);
    const id=await opened.getAttribute('data-id');await opened.click();await action(page,'back').click();await settle(page);
    assert.equal(await page.locator('.cb-page').getAttribute('data-mode'),'book');assert(Math.abs(await page.locator('.cb-workbench').evaluate(n=>n.scrollTop)-scroll.top)<=2,'Back restores scroll');
    assert(await action(page,'open',id).evaluate(n=>n===document.activeElement),'Back restores focus');
    console.log('Gallery Back/scroll/focus completed.');
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
    await page.locator('.cb-empty [data-binder-action=reset]').click();assert(await page.locator('.cb-pocket').count()>0);
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
