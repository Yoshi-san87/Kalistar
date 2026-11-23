'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_album.cjs'));
const {chromium}=runtime('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist')),built=process.env.KALISTAR_BUILT_SITE==='1';
const site=built?path.join(dist,'jeu'):__dirname,origin='https://album.invalid';
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/album-repair/album'));
const profiles=[['desktop',1440,900],['wide',2532,1412],['razr',412,1007],['compact',320,740],['landscape',1007,412],['reduced',412,1007],['short-phone',320,568],['short-landscape',844,390]];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const action=(page,name)=>page.locator('.cb-page [data-binder-action="'+name+'"]:not(.cb-page-turn *)');
async function settle(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function images(page){await page.waitForFunction(()=>{
  const nodes=[...document.querySelectorAll('.cb-album > .cb-spread img')].filter(n=>n.getClientRects().length);
  return nodes.length>0&&nodes.every(n=>n.complete&&n.naturalWidth>0&&!n.src.includes('#v4-'));
});}
async function idle(page){await page.waitForFunction(()=>!ALBUM.view.inspect().turning&&!document.querySelector('.cb-page-turn'));await settle(page);}
async function animationReport(page){
  return page.locator('.cb-page').evaluate(root=>({
    time:performance.now(),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,hidden:document.hidden,inspect:ALBUM.view.inspect(),
    animations:root.getAnimations({subtree:true}).map(a=>{
      const timing=a.effect.getComputedTiming(),target=a.effect.target;
      return {type:a.constructor.name,name:a.animationName||a.transitionProperty||a.id,state:a.playState,pending:a.pending,currentTime:a.currentTime,
        duration:timing.duration,iterations:Number.isFinite(timing.iterations)?timing.iterations:'Infinity',endTime:Number.isFinite(timing.endTime)?timing.endTime:'Infinity',infinite:!Number.isFinite(timing.endTime),
        target:target?.tagName+'.'+target?.className,action:target?.dataset.binderAction,card:target?.dataset.id,hovered:target?.matches(':hover'),focused:target===document.activeElement,
        keyframes:a.effect.getKeyframes()};
    })
  }));
}
async function gallery(page,filled){
  await settle(page);
  const result=await page.locator('.cb-album > .cb-spread').evaluate(spread=>{
    const rect=n=>n.getBoundingClientRect(),within=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
    const leaves=[...spread.querySelectorAll(':scope > .cb-leaf')],pockets=[...spread.querySelectorAll('.cb-pocket')],view={left:0,top:0,right:innerWidth,bottom:innerHeight};
    const single=Number(getComputedStyle(spread.parentElement).getPropertyValue('--cb-single-leaf'))===1,stage=rect(spread.closest('.cb-workbench'));
    const rows=nodes=>{const groups=[];for(const n of nodes){const r=rect(n);let row=groups.find(g=>Math.abs(g.top-r.top)<2);if(!row){row={top:r.top,count:0};groups.push(row);}row.count++;}return groups.map(r=>r.count);};
    return {sides:leaves.map(n=>n.dataset.leaf),slots:leaves.map(n=>n.querySelectorAll(':scope > .cb-pocket').length),empty:pockets.filter(n=>n.classList.contains('is-empty')).length,
      ids:pockets.filter(n=>n.dataset.cardId).map(n=>n.dataset.cardId),switchers:spread.querySelectorAll('[data-binder-action=cycle-version],.cb-versions,.cb-stack').length,
      single,expectedSingle:stage.width<=699&&stage.width/stage.height<=6/5,portrait:stage.width/stage.height<=6/5,
      displays:leaves.map(n=>getComputedStyle(n).display),rows:single?[rows(pockets)]:leaves.map(leaf=>rows(leaf.querySelectorAll('.cb-pocket'))),
      fits:within(rect(spread),view)&&(single||leaves.every(n=>within(rect(n),rect(spread))))&&pockets.every(n=>{const r=rect(n);return r.width>0&&r.height>0&&within(r,rect(single?spread:n.closest('.cb-leaf')));}),
      images:pockets.filter(n=>n.dataset.cardId).every(n=>{const img=n.querySelector('.cb-card > img'),card=n.querySelector('.cb-card'),r=rect(img);return img instanceof HTMLImageElement&&r.width>0&&r.height>0&&Math.abs(r.width/r.height-797/1388)<.005&&within(r,rect(n))&&within(rect(card),rect(n))&&!n.querySelector('canvas')&&getComputedStyle(img).filter.indexOf('blur')<0;}),
      scroll:[document.documentElement,document.body,document.querySelector('#app'),spread.closest('.cb-workbench')].map(n=>({node:n.id||n.tagName||n.className,x:n.scrollWidth-n.clientWidth,y:n.scrollHeight-n.clientHeight,top:n.scrollTop,left:n.scrollLeft})),
      sideBySide:single||rect(leaves[0]).right<=rect(leaves[1]).left+1,inspect:ALBUM.view.inspect()};
  });
  assert.deepEqual(result.sides,['left','right']);assert.deepEqual(result.slots,[6,6]);assert.equal(result.empty,12-filled);
  assert.equal(result.ids.length,filled);assert.equal(new Set(result.ids).size,filled,'each version gets a unique slot');
  assert.equal(result.switchers,0);assert.equal(result.inspect.pageSize,12);assert(result.fits&&result.sideBySide&&result.images,JSON.stringify(result));
  assert.equal(result.single,result.expectedSingle,'physical folio follows the available stage');
  if(result.single){assert.deepEqual(result.displays,['contents','contents']);assert.deepEqual(result.rows,[[3,3,3,3]],'single folio has twelve physical slots in 3x4');}
  else assert.deepEqual(result.rows,Array.from({length:2},()=>result.portrait?[2,2,2]:[3,3]));
  assert(result.scroll.every(n=>n.x<=1&&n.y<=1&&n.top===0&&n.left===0),'album never scrolls: '+JSON.stringify(result.scroll));
  return result;
}
async function readerGeometry(page){
  const result=await page.locator('.cb-reader').evaluate(album=>{
    const rect=n=>n.getBoundingClientRect(),within=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
    const visual=album.querySelector('.cb-visual[data-leaf=left]'),reading=album.querySelector('.cb-reading[data-leaf=right]'),window=reading.querySelector('.cb-read-window'),content=window.firstElementChild;
    const v=rect(visual),r=rect(reading),w=rect(window),view={left:0,top:0,right:innerWidth,bottom:innerHeight};
    const hero=visual.querySelector('.cb-hero-image'),stage=visual.querySelector('.cb-hero-stage'),h=rect(hero),art=hero.classList.contains('is-art');
    const controls=[...visual.querySelectorAll('figcaption button,figcaption a,.cb-version-select select')].filter(n=>n.getClientRects().length);
    const toggle=visual.querySelector('.cb-media-toggle'),collapsed=toggle.getClientRects().length>0;
    const work=album.closest('.cb-workbench'),style=getComputedStyle(work),stageWidth=work.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),stageHeight=work.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
    const heading=document.createRange();heading.selectNodeContents(reading.querySelector('.cb-card-heading h2'));
    return {sideBySide:v.right<=r.left+1&&Math.abs(v.top-r.top)<2,visible:v.width>0&&r.width>0&&v.height>0&&w.height>0,
      fits:within(v,view)&&within(r,view)&&within(w,r)&&within(h,v)&&within(h,rect(stage))&&within(rect(stage),v),
      native:hero instanceof HTMLImageElement&&hero.dataset.v4Cropped===(art?'art':'card')&&hero.naturalWidth===(art?460:797)&&hero.naturalHeight===(art?880:1388)&&Math.abs(h.width/h.height-(art?460/880:797/1388))<.005,
      headingVisible:reading.querySelector('.cb-card-heading').getClientRects().length>0,headingLines:[...heading.getClientRects()].filter(r=>r.width>0).length,collapsed,expectedCollapsed:stageHeight<=400&&stageWidth/stageHeight>=6/5,
      controls:collapsed?controls.length===0&&rect(toggle).width>=44&&rect(toggle).height>=44&&within(rect(toggle),v)&&toggle.contains(document.elementFromPoint(rect(toggle).x+22,rect(toggle).y+22)):within(rect(visual.querySelector('figcaption')),v)&&controls.length>=5&&controls.every(n=>{const c=rect(n);return within(c,v)&&n.contains(document.elementFromPoint(c.x+c.width/2,c.y+c.height/2));}),
      boxes:{visual:v.toJSON(),reading:r.toJSON(),window:w.toJSON(),stage:rect(stage).toJSON(),hero:h.toJSON(),controls:controls.map(n=>({label:n.getAttribute('aria-label'),bounds:rect(n).toJSON()}))},
      clip:['hidden','clip'].includes(getComputedStyle(window).overflowX)&&['hidden','clip'].includes(getComputedStyle(window).overflowY),
      columns:getComputedStyle(content).columnWidth!=='auto'||Number(getComputedStyle(content).columnCount)>=1,
      font:parseFloat(getComputedStyle(content.querySelector('p')).fontSize),
      scroll:[document.documentElement,document.body,album.closest('.cb-workbench'),window].map(n=>({y:n.scrollHeight-n.clientHeight,top:n.scrollTop,left:n.scrollLeft})),
      pager:within(rect(reading.querySelector('.cb-reading-pager')),r),canvas:album.querySelectorAll('canvas').length};
  });
  assert(result.sideBySide&&result.visible&&result.fits&&result.native&&result.controls&&result.clip&&result.columns&&result.pager,JSON.stringify(result));
  assert.equal(result.collapsed,result.expectedCollapsed,'landscape tools collapse at 400px of available stage height');
  assert.equal(result.headingLines,result.headingVisible?1:0,'MOMO stays on one line unless moved to the native tools dialog');
  assert(result.font>=14,'text stays readable without shrinking: '+JSON.stringify(result));assert.equal(result.canvas,0);
  assert(result.scroll.every(n=>n.y<=1&&n.top===0&&n.left===0),'reader is paged, not scrollable: '+JSON.stringify(result.scroll));
  if(page.viewportSize().width<=699||page.viewportSize().height<=600)assert(await page.locator('.cb-reading-pager button').evaluateAll(ns=>ns.length===2&&ns.every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44;})),'phone and short readers keep native 44px paging targets');
  return result;
}
async function mediaAccess(page,selector){
  const control=page.locator('.cb-page '+selector);
  if(!await control.isVisible()){
    await action(page,'media-tools').click();await page.locator('.cb-media-overlay:modal').waitFor();
  }
  assert.equal(await control.count(),1,'one real media control, never a duplicate');assert(await control.isVisible(),selector+' is accessible');
  return control;
}
async function readerTools(page){
  const toggle=action(page,'media-tools'),collapsed=await toggle.isVisible();
  const selectors=['[data-binder-action=media][data-id=card]','[data-binder-action=media][data-id=art]','[data-binder-action=favorite]','a[download]','select[data-binder-field=version]'];
  const state=await page.evaluate(()=>ALBUM.view.inspect());
  if(collapsed){
    await page.evaluate(()=>{ALBUM.mediaNodes=[...document.querySelectorAll('.cb-visual>figcaption,.cb-visual>.cb-version-select')].map(node=>({node,parent:node.parentNode}));});
    await toggle.click();await page.locator('.cb-media-overlay:modal').waitFor();
    assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    assert(await page.locator('.cb-media-overlay').evaluate(dialog=>dialog.contains(document.activeElement)&&ALBUM.mediaNodes.every(({node})=>dialog.contains(node))),'native modal focuses and moves the original controls');
    assert.equal(await page.locator('.cb-media-overlay h2').textContent(),'MOMO');
  }
  for(const selector of selectors){
    const control=page.locator('.cb-page '+selector);assert.equal(await control.count(),1,selector+' stays unique');assert(await control.isVisible(),selector+' stays visible inline or in tools');
    await control.scrollIntoViewIfNeeded();assert(await control.evaluate(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),selector+' is unobstructed');
    if(page.viewportSize().width<=699||page.viewportSize().height<=600){const box=await control.boundingBox();assert(box.width>=44&&box.height>=44,selector+' keeps a 44px touch target: '+box.width+'x'+box.height);}
  }
  assert(await page.locator('.cb-page a[download]').getAttribute('href'),'native download keeps its media destination');
  const tabs=page.locator('select[data-binder-field=tab]');
  if(await tabs.isVisible())assert.deepEqual(await tabs.locator('option').evaluateAll(ns=>ns.map(n=>n.value)),['story','profile','career','copies']);
  if(collapsed){
    await page.keyboard.press('Tab');assert(await page.locator('.cb-media-overlay').evaluate(n=>n.contains(document.activeElement)),'native modal traps keyboard focus');
    await page.screenshot({path:path.join(output,(await page.evaluate(()=>innerWidth))+'x'+(await page.evaluate(()=>innerHeight))+'-reader-tools.png'),scale:'css'});
    await page.keyboard.press('Escape');assert.equal(await page.locator('.cb-media-overlay').count(),0);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    assert(await toggle.evaluate(n=>n===document.activeElement),'Escape returns focus to tools');
    assert(await page.evaluate(()=>ALBUM.mediaNodes.every(({node,parent})=>node.parentNode===parent)),'original controls return to the visual leaf');
    assert.deepEqual(await page.evaluate(()=>ALBUM.view.inspect()),state,'closing tools does not leave the reader or move its text page');
    await toggle.click();await action(page,'close-overlay').click();assert.equal(await page.locator('.cb-media-overlay').count(),0,'native close button also restores the reader');
  }
  // Exercise the same real version, favorite and detail controls in either presentation.
  await (await mediaAccess(page,'select[data-binder-field=version]')).selectOption('album-001');await images(page);assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).selected,'album-001');
  await (await mediaAccess(page,'select[data-binder-field=version]')).selectOption('album-000');await images(page);
  await (await mediaAccess(page,'[data-binder-action=favorite]')).click();assert(await page.evaluate(()=>ALBUM.favorites.has('album-000')));
  await (await mediaAccess(page,'[data-binder-action=favorite]')).click();assert.equal(await page.evaluate(()=>ALBUM.favorites.size),0);
  const detail=page.locator('select[data-binder-field=tab]');
  if(await detail.isVisible()||collapsed){
    await (await mediaAccess(page,'select[data-binder-field=tab]')).selectOption('profile');assert.equal(await page.locator('.cb-profile').count(),1);
    await (await mediaAccess(page,'select[data-binder-field=tab]')).selectOption('story');
  }else{
    await page.locator('[role=tab][data-id=profile]').click();assert.equal(await page.locator('.cb-profile').count(),1);await page.locator('[role=tab][data-id=story]').click();
  }
  return {collapsed,controls:selectors.length,versions:true,favorites:true,details:true};
}
async function readAll(page,expected,label){
  await settle(page);const state=await page.evaluate(()=>ALBUM.view.inspect());assert(state.readPages>1,'long lore has multiple text pages');
  assert.equal(await page.locator('.cb-story p').textContent(),expected,'complete lore remains in HTML');
  const coverage=Array(expected.length).fill(false),signatures=[];
  for(let index=0;index<state.readPages;index++){
    assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).readPage,index);
    const visible=await page.locator('.cb-story p').evaluate(p=>{
      const win=p.closest('.cb-read-window').getBoundingClientRect(),walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),indices=[];let node,offset=0;
      while((node=walker.nextNode())){for(let i=0;i<node.length;i++){if(!node.data[i].trim())continue;const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);if([...range.getClientRects()].some(r=>r.width>0&&r.left>=win.left-1&&r.right<=win.right+1&&r.top>=win.top-1&&r.bottom<=win.bottom+1))indices.push(offset+i);}offset+=node.length;}
      return indices;
    });
    const metadata=visible.length===0&&await page.locator('.cb-story-kicker').evaluate(n=>{const w=n.closest('.cb-read-window').getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);return [...range.getClientRects()].some(r=>r.width>0&&r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1);});
    const metrics=await page.locator('.cb-read-window').evaluate(n=>({window:n.getBoundingClientRect().toJSON(),clientWidth:n.clientWidth,contentWidth:n.firstElementChild.getBoundingClientRect().width,scrollWidth:n.firstElementChild.scrollWidth,transform:n.firstElementChild.style.transform}));
    assert(visible.length>0||metadata,'empty advertised text page '+(index+1)+'/'+state.readPages+': '+JSON.stringify(metrics));signatures.push(visible.length?visible.join(','):'metadata');visible.forEach(i=>{coverage[i]=true;});
    assert.equal(await action(page,'read-previous').isDisabled(),index===0);assert.equal(await action(page,'read-next').isDisabled(),index===state.readPages-1);
    if(index<state.readPages-1)await action(page,'read-next').click();
  }
  assert.equal(new Set(signatures).size,state.readPages,'text pages advance');
  const missing=[...expected].flatMap((c,i)=>c.trim()&&!coverage[i]?[{index:i,char:c,context:expected.slice(Math.max(0,i-15),i+16)}]:[]);
  const diagnostics=missing.length?await page.locator('.cb-story p').evaluate((p,items)=>{
    const win=p.closest('.cb-read-window'),content=p.closest('.cb-read-content');
    return {inspect:ALBUM.view.inspect(),window:win.getBoundingClientRect().toJSON(),clientWidth:win.clientWidth,columnWidth:getComputedStyle(content).columnWidth,transform:content.style.transform,missing:items.map(item=>{const range=document.createRange();range.setStart(p.firstChild,item.index);range.setEnd(p.firstChild,item.index+1);return {...item,rects:[...range.getClientRects()].map(r=>r.toJSON())};})};
  },missing):null;
  if(diagnostics)fs.writeFileSync(path.join(output,label+'-long-lore-details.json'),JSON.stringify(diagnostics,null,2)+'\n');
  assert.equal(missing.length,0,'unreadable characters across all text pages: '+missing.length+'; see '+label+'-long-lore-details.json');
  await action(page,'read-previous').click();assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).readPage,state.readPages-2);
  if(state.readPages>2){await action(page,'read-previous').focus();await page.keyboard.press('ArrowLeft');assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).readPage,state.readPages-3,'reading keyboard arrows page the lore, not the card');}
  return {pages:state.readPages,characters:expected.length,nonWhitespace:[...expected].filter(c=>c.trim()).length,missing:missing.length};
}
async function swipe(page,selector,dx,dy=0){
  const cdp=await page.context().newCDPSession(page),box=await page.locator(selector).boundingBox();
  const x=box.x+box.width*(dx<0?.85:.15),y=box.y+box.height*.6;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  for(let step=1;step<=8;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*step/8,y:y+dy*step/8,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await settle(page);
}
async function accessRights(page,id){
  await page.evaluate(id=>{ALBUM.hiddenCopy=ALBUM.owned.shift();if(ALBUM.hiddenCopy.cardId!==id)throw Error('Unexpected rights fixture');ALBUM.view.refresh();},id);
  try{
    await action(page,'scope').filter({hasText:'Catalogue'}).click();await settle(page);
    const pocket=page.locator('.cb-album > .cb-spread .cb-pocket[data-card-id="'+id+'"]');
    assert.equal(await pocket.locator('.cb-locked-face[role=img]').count(),1,'undiscovered card keeps its accessible locked face');
    assert.equal(await pocket.locator('[data-binder-action],a[download]').count(),0,'locked card grants no reader, favorite or download action');
    assert(await pocket.locator('img').evaluate(n=>n.getAttribute('src').includes('back-obsidian')),'locked face never reveals native card media');
    await pocket.click();assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).selected,null);
  }finally{
    await page.evaluate(()=>{ALBUM.owned.unshift(ALBUM.hiddenCopy);delete ALBUM.hiddenCopy;ALBUM.view.refresh();});
    await action(page,'scope').filter({hasText:'Mes cartes'}).click();await settle(page);
  }
  await gallery(page,12);return {locked:true,restored:true};
}
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results=[],failures=[];
  try{
    const data=JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8'));
    const variants=data.cards.filter(c=>c.name==='MOMO').sort((a,b)=>a.id.localeCompare(b.id));assert(variants.length>=2);
    const cards=[...variants,...data.cards.filter(c=>c.name!=='MOMO')].slice(0,25).map((c,i)=>({...c,id:'album-'+String(i).padStart(3,'0'),text:i===0?Array.from({length:24},(_,n)=>'Paragraphe '+(n+1)+'. Le voyageur retrouve la grande bibliotheque et relit chaque souvenir, sans perdre une ligne du recit.').join(' '):c.text}));
    for(const [name,width,height] of profiles.filter(p=>!process.env.KALISTAR_ALBUM_PROFILES||process.env.KALISTAR_ALBUM_PROFILES.split(',').includes(p[0]))){
      const context=await browser.newContext({viewport:{width,height},isMobile:width<700||height<500,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],evidence={};
      page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
      const check=async(label,run)=>{try{evidence[label]=await run();}catch(error){failures.push({profile:name,check:label,error:error.message});console.error(name+' '+label+': '+error.message);await page.screenshot({path:path.join(output,name+'-'+label+'-failure.png'),scale:'css'});}};
      await context.route('**/*',route=>{
        const u=new URL(route.request().url());assert.equal(u.origin,origin,'no external network or real Supabase');
        if(u.pathname==='/jeu/'){
          const links=fs.readFileSync(path.join(site,'index.html'),'utf8').match(/<link[^>]+rel="stylesheet"[^>]*>/g).join('\n');
          return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+links+'</head><body class="collection-view"><main id="app"><div id="collection-binder-root"></div></main></body></html>'});
        }
        let file=path.resolve(dist,'.'+u.pathname);assert(file.startsWith(dist+path.sep));
        if(!built&&u.pathname.startsWith('/jeu/')){
          const source=path.resolve(site,decodeURIComponent(u.pathname.slice('/jeu/'.length)));assert(source.startsWith(site+path.sep));
          if(fs.existsSync(source)&&fs.statSync(source).isFile())file=source;
        }
        return route.fulfill(fs.existsSync(file)?{body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}:{status:404,body:'Missing fixture asset'});
      });
      await page.goto(origin+'/jeu/');
      await page.evaluate(shell=>{
        const header=new DOMParser().parseFromString(shell,'text/html').querySelector('body > .masthead');
        if(!header)throw Error('Real masthead fixture required');document.body.prepend(header);document.body.dataset.edition='V4';
      },fs.readFileSync(path.join(site,'index.html'),'utf8'));
      for(const file of ['assets/lucide.min.js','base-weapons.js','factions.js','collaborations.js','positions.js','card-media.js','collection-binder.js'])await page.addScriptTag({path:fs.existsSync(path.join(site,file))?path.join(site,file):path.join(dist,'jeu',file)});
      await page.evaluate(({data,cards})=>{
        const owned=cards.map(c=>({id:'fixture-'+c.id,cardId:c.id,createdAt:'2026-11-22T00:00:00Z'}));
        window.ALBUM={data:{...data,cards},owned,favorites:new Set()};ALBUM.before=JSON.stringify({data:ALBUM.data,owned,storage:{...localStorage}});
        ALBUM.view=KalistarCollection.create({data:ALBUM.data,getOwned:id=>owned.filter(c=>!id||c.cardId===id),getFavorites:()=>ALBUM.favorites,onFavorite:id=>ALBUM.favorites.has(id)?ALBUM.favorites.delete(id):ALBUM.favorites.add(id)});
        if(!['render','mount','refresh','destroy','inspect'].every(method=>typeof ALBUM.view[method]==='function'))throw Error('Incomplete Album API');
        const template=document.createElement('template');template.innerHTML=ALBUM.view.render();if(template.content.querySelectorAll('.cb-pocket').length!==12)throw Error('render() must return twelve slots before mount');
        ALBUM.view.mount(document.querySelector('#collection-binder-root'));
      },{data,cards});
      try{
        await page.evaluate(()=>document.fonts.ready);await images(page);const first=await gallery(page,12);assert.deepEqual(first.ids,cards.slice(0,12).map(c=>c.id));
        evidence.gallery={single:first.single,rows:first.rows,slots:first.slots,ids:first.ids};assert(await page.locator('body > .masthead').isVisible());
        await page.screenshot({path:path.join(output,name+'-gallery.png'),scale:'css'});
        await action(page,'next-page').click();await gallery(page,12);await action(page,'next-page').click();const last=await gallery(page,1);assert.equal(last.inspect.page,2);assert.deepEqual(last.ids,[cards[24].id]);assert(await action(page,'next-page').isDisabled());
        await page.locator('[data-binder-field=search]').fill(cards[24].id);await gallery(page,1);
        await page.locator('[data-binder-field=search]').fill('no-album-result');await gallery(page,0);assert(await action(page,'discover').isDisabled());
        await page.screenshot({path:path.join(output,name+'-empty.png'),scale:'css'});
        await page.locator('[data-binder-field=search]').fill('');await gallery(page,12);
        await page.locator('.cb-workbench').focus();await page.keyboard.press('ArrowRight');assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).page,1);
        await page.keyboard.press('ArrowLeft');assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).page,0);
        const search=page.locator('[data-binder-field=search]');await search.fill('MOMO');await search.press('ArrowLeft');assert.equal(await search.inputValue(),'MOMO');assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).page,0);await search.fill('');
        await page.locator('[data-binder-action=open][data-id="'+cards[0].id+'"]').click();await images(page);
        assert.equal(await page.locator('body > .masthead').isVisible(),height>600,'short reader is immersive; tall reader keeps global navigation');
        assert.equal(await page.locator('select[data-binder-field=version] option').count(),variants.length,'versions are independent slots and remain selectable in the reader');
        await check('long-lore',()=>readAll(page,cards[0].text,name));console.log(name+': long lore checked across '+(await page.evaluate(()=>ALBUM.view.inspect())).readPages+' text pages.');await check('reader-geometry',()=>readerGeometry(page));
        await check('reader-tools',()=>readerTools(page));
        await check('art-geometry',async()=>{await (await mediaAccess(page,'[data-binder-action=media][data-id=art]')).click();await images(page);return readerGeometry(page);});
        await (await mediaAccess(page,'[data-binder-action=media][data-id=card]')).click();await images(page);
        await page.screenshot({path:path.join(output,name+'-reader-last-text.png'),scale:'css'});
        await action(page,'back').click();assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).page,0);assert(await page.locator('[data-binder-action=open][data-id="'+cards[0].id+'"]').evaluate(n=>n===document.activeElement));
        assert(await page.locator('body > .masthead').isVisible(),'Back restores the global navigation');await check('access-rights',()=>accessRights(page,cards[0].id));
        // CDP touch events exercise native pointer/swipe handling, never JS dispatchEvent.
        if(name==='razr'){
          await swipe(page,'.cb-gallery-leaf[data-leaf=right] .cb-pocket:last-of-type .cb-card',-70);assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).page,1,'a swipe starting on the card turns the spread without opening the reader');
          assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).selected,null,'swipe suppresses the following native click');
          await swipe(page,'.cb-album > .cb-spread',70);assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).page,0);
          await swipe(page,'.cb-album > .cb-spread',-12,30);assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).page,0,'vertical gestures do not turn pages');
          await page.waitForTimeout(260);await page.locator('[data-binder-action=open][data-id="'+cards[0].id+'"]').tap();await settle(page);
          await swipe(page,'.cb-read-window',-65);assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).readPage,1);
          assert.equal((await page.evaluate(()=>ALBUM.view.inspect())).selected,cards[0].id,'reading swipes do not skip cards');
          await page.waitForTimeout(260);
          await page.keyboard.press('Escape');await gallery(page,12);
        }
        if(name==='desktop'){
          await page.emulateMedia({reducedMotion:'no-preference'});await action(page,'next-page').click();
          await page.waitForSelector('.cb-page-turn > .cb-turn-sheet');
          const frame=await page.locator('.cb-turn-sheet').evaluate(sheet=>{
            const animations=sheet.getAnimations();animations.forEach(a=>{a.pause();a.currentTime=360;});
            return {count:animations.length,timing:animations.map(a=>a.effect.getComputedTiming().endTime),iterations:animations.map(a=>a.effect.getComputedTiming().iterations),transform:getComputedStyle(sheet).transform,
              layer:sheet.parentElement.inert&&sheet.parentElement.getAttribute('aria-hidden')==='true',images:[...sheet.parentElement.querySelectorAll('img')].filter(n=>n.complete&&n.naturalWidth>0).length};
          });
          assert.equal(frame.count,1);assert.deepEqual(frame.timing,[720]);assert.deepEqual(frame.iterations,[1]);assert.notEqual(frame.transform,'none');assert(frame.layer&&frame.images>0,'mid-turn keeps real images');
          const screenshot=await page.screenshot({path:path.join(output,'turn-midpoint.png'),scale:'css'}),{PNG}=runtime('pngjs'),png=PNG.sync.read(screenshot);
          const box=await page.locator('.cb-album').boundingBox(),colors=new Set();
          for(let y=Math.ceil(box.y);y<Math.min(png.height,box.y+box.height);y+=3)for(let x=Math.ceil(box.x);x<Math.min(png.width,box.x+box.width);x+=3){const i=(y*png.width+x)*4;colors.add((png.data[i]<<16)|(png.data[i+1]<<8)|png.data[i+2]);}
          assert(colors.size>100,'mid-turn album screenshot is nonblank');
          await page.locator('.cb-turn-sheet').evaluate(n=>n.getAnimations().forEach(a=>a.finish()));await idle(page);
          for(const cancel of ['resize','search','visibility','motion','refresh','destroy']){
            await page.evaluate(()=>ALBUM.view.refresh());await action(page,'previous-page').click();await page.waitForSelector('.cb-turn-sheet');
            await page.locator('.cb-page-turn').evaluate(n=>{ALBUM.cancelled=n;ALBUM.animations=n.getAnimations({subtree:true});ALBUM.animations.forEach(a=>{a.pause();a.currentTime=300;});});
            if(cancel==='resize')await page.setViewportSize({width:width-1,height});
            if(cancel==='search')await page.evaluate(()=>{const input=document.querySelector('[data-binder-field=search]');input.value='no-album-result';input.dispatchEvent(new Event('input',{bubbles:true}));});
            if(cancel==='visibility')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
            if(cancel==='motion')await page.emulateMedia({reducedMotion:'reduce'});
            if(cancel==='refresh')await page.evaluate(()=>ALBUM.view.refresh());
            if(cancel==='destroy')await page.evaluate(()=>ALBUM.view.destroy());
            await settle(page);
            const after=await page.evaluate(()=>({html:document.querySelector('#collection-binder-root').innerHTML,state:ALBUM.view.inspect(),animations:ALBUM.cancelled.getAnimations({subtree:true}).length,states:ALBUM.animations.map(a=>a.playState)}));
            assert.equal(after.state.turning,false,cancel);assert.equal(after.animations,0,cancel);assert(after.states.every(s=>s==='idle'),cancel+' cancels WAAPI');assert.equal(await page.locator('.cb-page-turn').count(),0,cancel);
            await page.waitForTimeout(820);
            assert.equal(await page.locator('#collection-binder-root').innerHTML(),after.html,cancel+' cannot repaint after a late promise');assert.deepEqual(await page.evaluate(()=>ALBUM.view.inspect()),after.state,cancel+' keeps state after cancellation');
            if(cancel==='destroy')await page.evaluate(()=>ALBUM.view.mount(document.querySelector('#collection-binder-root')));
            await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-binder-field=search]').fill('');await page.evaluate(()=>{document.querySelector('[data-binder-action=next-page]').click();});await page.emulateMedia({reducedMotion:'no-preference'});
          }
          const deadline=Date.now()+1500,normalIdle={stage:'after destroy/remount, reduce, next-page, no-preference',deadlineMs:1500,initial:await animationReport(page)};
          // Motion emulation can start native hover transitions on a later frame.
          try{await page.waitForFunction(()=>{
            const running=document.querySelector('.cb-page').getAnimations({subtree:true}).filter(a=>a.playState==='running');
            for(const a of running)if(!(a instanceof CSSTransition)||!Number.isFinite(a.effect.getComputedTiming().endTime))throw Error('Unexpected idle animation: '+a.constructor.name+' '+(a.animationName||a.transitionProperty||a.id));
            return running.length===0;
          },{},{timeout:Math.max(1,deadline-Date.now())});}catch(error){normalIdle.error=error.message;}
          normalIdle.after=await animationReport(page);normalIdle.elapsedMs=normalIdle.after.time-normalIdle.initial.time;
          const unexpected=normalIdle.initial.animations.filter(a=>a.state==='running'&&(a.type!=='CSSTransition'||a.infinite));
          fs.writeFileSync(path.join(output,'desktop-idle-animations.json'),JSON.stringify(normalIdle,null,2)+'\n');evidence['normal-motion-idle']=normalIdle;
          if(normalIdle.error||unexpected.length||normalIdle.after.animations.some(a=>a.state==='running'))console.error('desktop idle animations: '+JSON.stringify(normalIdle));
          assert.deepEqual(unexpected,[],'idle drain permits only finite native CSS transitions');assert.equal(normalIdle.error,undefined,'normal-motion idle settles within 1500ms');
          assert.equal(await page.locator('.cb-page').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0,'normal-motion idle album has no running animations');
          await page.emulateMedia({reducedMotion:'reduce'});
        }
        await page.evaluate(()=>ALBUM.view.refresh());
        await action(page,'next-page').evaluate(n=>{if(!n.disabled)n.click();else document.querySelector('[data-binder-action=previous-page]').click();});
        assert.equal(await page.locator('.cb-page-turn').count(),0,'Reduced Motion has no page-turn layer');
        assert.equal(await page.locator('.cb-page').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0,'zero idle animation');
        assert.equal(await page.evaluate(()=>JSON.stringify({data:ALBUM.data,owned:ALBUM.owned,storage:{...localStorage}})===ALBUM.before),true,'fixture data and saves remain byte-identical');
        assert.deepEqual(errors,[]);results.push({name,width,height,passed:!failures.some(f=>f.profile===name),evidence});console.log(name+': '+(results.at(-1).passed?'passed':'failed'));
      }catch(error){failures.push({profile:name,error:error.message});results.push({name,width,height,passed:false});console.error(name+': '+error.message);await page.screenshot({path:path.join(output,name+'-failure.png'),scale:'css'}).catch(()=>{});}
      finally{await context.close();}
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:failures.length===0,built,profiles:results,failures},null,2)+'\n');
    assert.equal(failures.length,0,JSON.stringify(failures));
    console.log('PASS: 12 slots, independent versions, empty/last spreads, full paged lore, side-by-side phone reader, native images, keyboard/touch, 720ms turn, cancellation and Reduced Motion.');
  }catch(error){fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,built,profiles:results,failures,error:error.message},null,2)+'\n');throw error;}
  finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
