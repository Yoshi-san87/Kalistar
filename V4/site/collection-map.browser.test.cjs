'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__collection_map_qa__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',url=built?'https://kalistar-sleeve.invalid/Kalistar':process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=process.env.KALISTAR_VERIFICATION_DIR||path.join(os.tmpdir(),'kalistar-astralia-map-qa');
const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
async function routeBuilt(context){
  if(!built)return;
  await context.route(url+'/**',route=>{
    const p=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,'');
    const file=path.resolve(dist,p.endsWith('/')?p+'index.html':p);
    if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:p});
    const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
    return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
  });
}
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],checks=[];
    await routeBuilt(context);
    page.on('pageerror',e=>errors.push(e.message));
    page.setDefaultTimeout(90000);
    await page.goto(url+'/jeu/#collection');await page.waitForFunction(()=>window.KALISTAR_READY);
    await page.locator('.cb-spread').waitFor();
    const action=(name,id)=>page.locator(`[data-binder-action="${name}"]${id===undefined?'':`[data-id="${id}"]`}:visible`);
    await action('scope','catalogue').click();
    const asset=await page.locator('.cb-workbench').evaluate(async node=>{
      const source=getComputedStyle(node,'::before').backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];
      const image=new Image();image.src=source;await image.decode();
      return {source,width:image.naturalWidth,height:image.naturalHeight};
    });
    assert.match(asset.source,/collection-astralia-planisphere-v2\.webp$/);
    assert.equal(asset.width/asset.height,2,'the full atlas has its original aspect ratio');
    const pedestalAsset=await page.locator('.cb-plinth-art > span > span').first().evaluate(async node=>{
      const source=getComputedStyle(node).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1],image=new Image();image.src=source;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      return {source,width:image.naturalWidth,height:image.naturalHeight,cornerAlpha:ctx.getImageData(0,0,1,1).data[3],centerAlpha:ctx.getImageData(1086,330,1,1).data[3],faceColor:[...ctx.getImageData(1086,330,1,1).data]};
    });
    assert.equal(pedestalAsset.width,2172);assert.equal(pedestalAsset.height,724);
    assert.equal(pedestalAsset.cornerAlpha,0,'the art has genuine transparent corners');
    assert.ok(pedestalAsset.centerAlpha>=250,'painted center is at least 98% opaque behind the direct lettering');
    for(const [width,height]of [[2041,1383],[1440,1000],[1024,768],[412,1007],[390,844],[320,568],[844,390]]){
      await page.setViewportSize({width,height});
      await page.waitForFunction(()=>[...document.querySelectorAll('.cb-pocket img')].every(n=>n.complete&&n.naturalWidth>0));
      await page.waitForTimeout(150);
      const geometry=await page.locator('.cb-spread').evaluate(node=>{
        const work=node.parentElement,style=getComputedStyle(work,'::before'),rect=work.getBoundingClientRect();
        const captions=[...node.querySelectorAll('.cb-caption')].map(n=>{
          const box=n.getBoundingClientRect(),name=n.querySelector('h2'),stack=n.previousElementSibling,card=stack.getBoundingClientRect(),sleeve=getComputedStyle(stack,'::before');
          const pocket=n.parentElement.getBoundingClientRect();
          const range=document.createRange();range.selectNodeContents(name);
          const inkBox=range.getBoundingClientRect(),title=name.parentElement.getBoundingClientRect(),rim=n.querySelector('.cb-plinth-art > span > span').getBoundingClientRect().height;
          const titleFits=inkBox.left>=title.left-1&&inkBox.right<=title.right+1&&inkBox.top>=title.top-1&&inkBox.bottom<=title.bottom+1&&inkBox.top>=box.top+rim-1&&inkBox.bottom<=box.bottom-rim+1;
          const mark=n.querySelector('.cb-faction-watermark'),markBox=mark.getBoundingClientRect(),markStyle=getComputedStyle(mark),markImage=mark.querySelector('img').getBoundingClientRect();
          const positions=n.querySelector('.cb-pocket-positions').getBoundingClientRect(),favorite=stack.querySelector('.cb-card-favorite'),star=favorite.getBoundingClientRect();
          return {ink:getComputedStyle(name).color,paper:getComputedStyle(name.parentElement).backgroundColor,material:getComputedStyle(name.parentElement).backgroundImage,watermark:{opacity:Number(markStyle.opacity),clip:markStyle.overflow,pointer:markStyle.pointerEvents,blend:markStyle.mixBlendMode,inside:markBox.left>=box.left&&markBox.right<=box.right&&markBox.top>=box.top&&markBox.bottom<=box.bottom,zoomed:markImage.height>markBox.height*1.5,source:mark.querySelector('img').getAttribute('src'),label:mark.getAttribute('aria-label')},positionsLeft:positions.right<=title.left+1||positions.left<title.left+1&&positions.top>=title.bottom-1,favorite:{inside:star.left>=card.left&&star.right<=card.right+1&&star.top>=card.top&&star.bottom<=card.bottom,corner:star.x+star.width/2>=card.x+card.width/2&&star.top>=card.bottom-48,nested:n.querySelector('[data-binder-action=favorite]')!==null||favorite.closest('.cb-card')!==null,visible:star.x+star.width/2>=0&&star.x+star.width/2<innerWidth&&star.y+star.height/2>=0&&star.y+star.height/2<innerHeight,hitIsFavorite:document.elementFromPoint(star.x+star.width/2,star.y+star.height/2)?.closest('[data-binder-action=favorite]')===favorite},art:getComputedStyle(n.querySelector('.cb-plinth-art > span > span')).backgroundImage,artPointer:getComputedStyle(n.querySelector('.cb-plinth-art')).pointerEvents,artCells:n.querySelectorAll('.cb-plinth-art > span > span').length,artBounds:n.querySelector('.cb-plinth-art').getBoundingClientRect().toJSON(),plinthLayer:getComputedStyle(n).zIndex,stackLayer:getComputedStyle(stack).zIndex,titleFits,captionHeight:box.height,cardBottom:card.bottom,pocketBottom:pocket.bottom,sleeve:{content:sleeve.content,pointer:sleeve.pointerEvents,transition:sleeve.transitionDuration,left:card.left+parseFloat(sleeve.left),right:card.left+parseFloat(sleeve.left)+parseFloat(sleeve.width),bottom:card.top+parseFloat(sleeve.top)+parseFloat(sleeve.height)},label:{left:box.left,right:box.right,top:box.top,bottom:box.bottom},fits:[...n.querySelectorAll('.cb-copy-count,.cb-version-count,h2,.position-emblem')].every(c=>{const r=c.getBoundingClientRect();return r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1;})};
        });
        return {background:style.backgroundImage,size:style.backgroundSize,blur:style.filter,interactive:style.pointerEvents,workFilter:getComputedStyle(work).filter,spreadFilter:getComputedStyle(node).filter,spine:getComputedStyle(node,'::before').content,spreadBackground:getComputedStyle(node).backgroundImage,overflow:document.documentElement.scrollWidth-innerWidth,captions,cards:[...node.querySelectorAll('.cb-card')].map(n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height,filter:getComputedStyle(n).filter,inside:r.left>=rect.left&&r.right<=rect.right&&r.height>0};})};
      });
      geometry.copies=await page.locator('.cb-card-copies').evaluateAll(nodes=>nodes.map(n=>{
        const card=n.parentElement.getBoundingClientRect(),r=n.getBoundingClientRect(),icon=n.querySelector('img').getBoundingClientRect(),number=n.querySelector('b').getBoundingClientRect();
        return {inside:r.left>=card.left&&r.right<=card.right&&r.top>=card.top&&r.bottom<=card.bottom,left:Math.abs(r.left-card.left-4)<1,bottom:Math.abs(r.bottom-card.bottom+4)<1,adjacent:icon.right<number.left&&Math.abs(icon.y+icon.height/2-number.y-number.height/2)<1,noninteractive:getComputedStyle(n).pointerEvents==='none',inPlinth:n.closest('.cb-pocket').querySelector('.cb-pedestal .cb-copy-count')!==null,label:n.getAttribute('aria-label')};
      }));
      assert(geometry.copies.length===geometry.cards.length&&geometry.copies.every(c=>c.inside&&c.left&&c.bottom&&c.adjacent&&c.noninteractive&&!c.inPlinth&&/exemplaire/.test(c.label)),'copies sit beside their card icon in the bottom-left corner: '+JSON.stringify(geometry.copies));
      assert.match(geometry.background,/collection-astralia-planisphere-v2\.webp/);
      assert.equal(geometry.blur,'blur(1.6px)','only the map has a restrained blur');
      assert.equal(geometry.interactive,'none','map layer never blocks controls');
      assert.equal(geometry.workFilter,'none');assert.equal(geometry.spreadFilter,'none');
      assert.ok(geometry.cards.every(c=>!c.filter.includes('blur')),'cards stay sharp');
      assert.equal(geometry.size,'cover','atlas is cropped proportionally, never stretched');
      assert.equal(geometry.spine,'none','the collection has no book seam');
      assert.equal(geometry.spreadBackground,'none','pagination does not repaint a second book texture');
      assert.ok(geometry.overflow<=1,'no horizontal overflow at '+width+'x'+height);
      assert.ok(geometry.cards.length>0&&geometry.cards.every(c=>c.inside&&c.height>=120),'cards remain readable and inside the atlas at '+width+'x'+height+': '+JSON.stringify(geometry.cards));
      for(const caption of geometry.captions){
        if(!caption.fits){
          const detail=await page.locator('.cb-caption').evaluateAll(nodes=>nodes.map(n=>({box:n.getBoundingClientRect().toJSON(),rows:getComputedStyle(n).gridTemplateRows,children:[...n.querySelectorAll('.cb-copy-count,.cb-version-count,h2,.cb-icon,.position-emblem')].map(c=>({className:c.className,box:c.getBoundingClientRect().toJSON(),row:getComputedStyle(c).gridRow}))})));
          fs.writeFileSync(path.join(output,'caption-failed-'+width+'x'+height+'.json'),JSON.stringify(detail,null,2));await page.screenshot({path:path.join(output,'caption-failed-'+width+'x'+height+'.png')});
        }
        assert.ok(caption.fits,'caption tools fit at '+width+'x'+height);
        assert.ok(caption.titleFits,'name stays inside the painted face at '+width+'x'+height);
        assert.equal(caption.captionHeight,64,'the museum plinth uses only its reserved height');
        assert.equal(caption.artCells,9,'the existing bitmap is sliced, not regenerated');
        const ink=caption.ink.match(/[\d.]+/g).map(Number),paper=caption.paper.match(/[\d.]+/g).map(Number);
        assert.equal(paper[3],0,'the name has no separate opaque plaque');
        assert.equal(caption.material,'none','the name is written directly on the painted material');
        const worstPaper=pedestalAsset.faceColor.slice(0,3).map(v=>v+(255-v)*caption.watermark.opacity),light=[luminance(worstPaper),luminance(ink.slice(0,3))].sort((a,b)=>b-a);
        assert.ok((light[0]+.05)/(light[1]+.05)>=4.5,'caption contrast exceeds 4.5:1');
        assert.ok(caption.watermark.opacity>0&&caption.watermark.opacity<=.15,'the team watermark stays subtle');
        assert.equal(caption.watermark.clip,'hidden');assert.equal(caption.watermark.pointer,'none');assert.equal(caption.watermark.blend,'screen');
        assert.ok(caption.watermark.inside&&caption.watermark.zoomed,'the faction is cropped inside the plinth, never across its rim');
        assert.ok(caption.positionsLeft,'positions use the left edge without crossing the name');
        assert.ok(caption.favorite.inside&&caption.favorite.corner&&!caption.favorite.nested,'favorite is independent in the card bottom-right corner');
        if(caption.favorite.visible)assert.ok(caption.favorite.hitIsFavorite,'visible favorite receives its own pointer hit');
        assert.ok(luminance(pedestalAsset.faceColor.slice(0,3))<.05,'the actual painted face is dark, with no pale caption band');
        assert.match(caption.art,/collection-pedestal-v2\.webp/,'the sculpted bitmap is the actual pedestal');
        assert.equal(caption.artPointer,'none','sculpted art never intercepts a control');
        assert.notEqual(caption.sleeve.content,'none');assert.equal(caption.sleeve.pointer,'none');
        assert.ok(Math.abs(caption.sleeve.left-caption.label.left-8)<1&&Math.abs(caption.label.right-caption.sleeve.right-8)<1,'glass is seated 8px inside both copper corners at '+width+'x'+height+': '+JSON.stringify(caption));
        assert.ok(Math.abs(caption.artBounds.top-caption.label.top+8)<1&&Math.abs(caption.artBounds.bottom-caption.label.bottom)<1,'copper corners rise 8px over the glass joint within the reserved plinth');
        assert.ok(Number(caption.plinthLayer)>(Number(caption.stackLayer)||0),'the copper seat is in front of the glass, including during a card flip');
        assert.ok(Math.abs(caption.sleeve.bottom-caption.cardBottom-4)<1,'glass ends at the card, not the bottom of the plinth');
        assert.ok(caption.sleeve.bottom<=caption.label.top+1,'the whole plinth sits outside the glass');
        assert.ok(Math.abs(caption.label.top-caption.cardBottom-4)<1,'the card rests on its independent plinth without losing vertical space');
        assert.ok(caption.sleeve.bottom<=caption.pocketBottom+1,'bottom seal fits its pocket');
        assert.equal(caption.sleeve.transition,'0s','Reduced Motion settles the sleeve');
      }
      checks.push({width,height,geometry});
      await page.screenshot({path:path.join(output,`collection-${width}x${height}.png`),scale:'css'});
      // Short desktop layouts intentionally scroll; exercise off-screen controls after revealing them.
      if(geometry.captions.some(c=>!c.favorite.visible))for(const favorite of await page.locator('.cb-card-favorite').all()){
        await favorite.scrollIntoViewIfNeeded();
        assert.equal(await favorite.evaluate(n=>{const r=n.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-binder-action=favorite]')===n;}),true,'scrolled favorite is not masked by the glass or navigation');
      }
    }
    await page.setViewportSize({width:1440,height:1000});
    const initial=await page.locator('.cb-page-label').textContent();
    await action('next-page').last().click();assert.notEqual(await page.locator('.cb-page-label').textContent(),initial);
    await action('pages').click();await page.locator('.cb-overlay:modal').waitFor();
    assert.match(await page.locator('.cb-mini-book').first().evaluate(n=>getComputedStyle(n,'::before').backgroundImage),/collection-astralia-planisphere-v2\.webp/);
    await action('jump-page','0').click();
    await action('filters').click();
    await page.locator('[data-binder-filter=collection]').last().selectOption('kalistar');
    await action('close-overlay').last().click();
    await page.locator('[data-binder-field=search]').fill('MOMO');
    const before=await page.locator('.cb-pocket').first().getAttribute('data-card-id');
    const cycle=action('cycle-version').first();assert.ok(await cycle.isVisible());
    assert.equal(await cycle.locator('.lucide-rotate-3d').count(),1,'the version control has its own rotation glyph');
    assert.equal(await cycle.evaluate(n=>getComputedStyle(n).borderTopWidth),'0px','the recessed dial is not a separately bordered button');
    assert.notEqual(await cycle.evaluate(n=>getComputedStyle(n,'::before').content),'none','the dial has a recessed rail joining the plinth');
    await page.locator('.cb-pocket').first().screenshot({path:path.join(output,'flip-desktop-card.png'),scale:'css'});
    await cycle.click();assert.notEqual(await page.locator('.cb-pocket').first().getAttribute('data-card-id'),before);
    assert.equal(await action('cycle-version').first().evaluate(n=>n===document.activeElement),true,'focus survives the version change');
    await action('open').first().click();
    assert.match(await page.locator('.cb-workbench').evaluate(n=>getComputedStyle(n).backgroundImage),/collection-reader-grimoire-v1\.webp/,'character notebooks retain their reading surface');
    assert.equal(await page.locator('.cb-workbench').evaluate(n=>getComputedStyle(n,'::before').content),'none','map disappears in character notebooks');
    const notes=action('pane','notes');if(await notes.isVisible())await notes.click();
    for(const tab of ['profile','career','copies']){await action('tab',tab).click();await page.locator('#cb-read-content').waitFor();}
    await action('back').click();
    await page.locator('[data-view=story]').click();await page.locator('.story-library').waitFor();
    assert.match(await page.locator('.story-volume-object img').first().getAttribute('src'),/story-closed-grimoire-v2\.webp/,'Story is unchanged');
    await page.locator('[data-view=collection]').click();await page.locator('.cb-spread').waitFor();
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    assert.match(await page.locator('.cb-workbench').evaluate(n=>getComputedStyle(n,'::before').backgroundImage),/collection-astralia-planisphere-v2\.webp/);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('[data-binder-field=search]').fill('MAELOR');
    const card=action('open').first(),rim=()=>card.evaluate(n=>getComputedStyle(n.closest('.cb-stack'),'::before').borderColor);
    await page.mouse.move(1,1);await page.waitForTimeout(250);
    const normal=await rim();await card.hover();await page.waitForTimeout(250);
    assert.notEqual(await rim(),normal,'hover catches the sleeve edge');
    await page.mouse.move(1,1);await card.focus();await page.waitForTimeout(250);
    assert.notEqual(await rim(),normal,'keyboard focus catches the same sleeve edge');
    await page.waitForFunction(()=>[...document.querySelectorAll('.cb-card img')].every(n=>n.complete&&n.naturalWidth>0));
    const detail=await card.boundingBox(),captionBox=await page.locator('.cb-caption').first().boundingBox();
    await page.screenshot({path:path.join(output,'sleeve-detail.png'),clip:{x:detail.x-5,y:detail.y-5,width:detail.width+10,height:captionBox.y+captionBox.height-detail.y+10},scale:'css'});
    const phone=await browser.newContext({viewport:{width:412,height:1007},isMobile:true,hasTouch:true,reducedMotion:'no-preference'}),touch=await phone.newPage();
    await routeBuilt(phone);
    touch.on('pageerror',e=>errors.push(e.message));
    await touch.goto(url+'/jeu/#collection');await touch.waitForFunction(()=>window.KALISTAR_READY);
    await touch.locator('[data-binder-action=scope][data-id=catalogue]').tap();
    const label=touch.locator('.cb-page-label'),firstPage=await label.textContent();
    await touch.locator('.cb-footer [data-binder-action=next-page]').tap();
    await touch.waitForFunction(value=>document.querySelector('.cb-page-label').textContent!==value,firstPage);
    await touch.locator('.cb-footer [data-binder-action=previous-page]').tap();
    await touch.locator('[data-binder-action=filters]').tap();
    await touch.locator('.cb-overlay:modal').waitFor();
    await touch.locator('[data-binder-action=close-overlay]').last().tap();
    const favorite=touch.locator('.cb-card-favorite').first();
    const favoriteInk=await favorite.locator('.lucide').evaluate(n=>getComputedStyle(n).color);
    assert.ok((luminance(favoriteInk.match(/[\d.]+/g).slice(0,3).map(Number))+.05)/(luminance([16,28,31])+.05)>=3,'touch favorite icons remain visible on the sleeve');
    const pressed=await favorite.getAttribute('aria-pressed');await favorite.tap();
    assert.notEqual(await touch.locator('.cb-card-favorite').first().getAttribute('aria-pressed'),pressed,'the sleeve does not intercept favorite taps');
    assert.equal(await touch.locator('.cb-page').getAttribute('data-mode'),'book','favorite tap does not open the card reader');
    assert.equal(await touch.locator('.cb-card-favorite').first().evaluate(n=>n===document.activeElement),true,'favorite keeps keyboard focus after repaint');
    const favoriteId=await touch.locator('.cb-card-favorite').first().getAttribute('data-id'),savedPressed=await touch.locator('.cb-card-favorite').first().getAttribute('aria-pressed');
    await touch.reload();await touch.waitForFunction(()=>window.KALISTAR_READY);
    assert.equal(await touch.locator(`.cb-card-favorite[data-id="${favoriteId}"]`).getAttribute('aria-pressed'),savedPressed,'favorite still belongs to the same card after reload');
    await touch.locator('[data-binder-action=favorites]').click();
    assert.equal(await touch.locator('.cb-pocket').count(),1,'the existing favorites filter uses the moved control');
    await touch.locator('[data-binder-action=favorites]').click();
    await touch.screenshot({path:path.join(output,'collection-razr-touch.png'),scale:'css'});
    const samples=[];
    const longest=await touch.evaluate(()=>KALISTAR_DATA.cards.slice().sort((a,b)=>b.name.length-a.name.length).slice(0,12).map(c=>c.name));
    for(const name of [...new Set(['MOMO','ILIANE','BALMHYR','GENERAL BAROK','MAELOR',...longest])]){
      await touch.locator('[data-binder-field=search]').fill(name);
      await touch.waitForFunction(()=>[...document.querySelectorAll('.cb-pedestal img')].every(n=>n.complete&&n.naturalWidth));
      for(const pedestal of await touch.locator('.cb-pedestal').all()){
        const sample=await pedestal.evaluate(n=>{
          const r=n.getBoundingClientRect(),c=KALISTAR_DATA.cards.find(c=>c.id===n.closest('.cb-pocket').dataset.cardId),title=n.querySelector('h2'),range=document.createRange();range.selectNodeContents(title);
          const ink=range.getBoundingClientRect(),face=title.parentElement.getBoundingClientRect(),padding=getComputedStyle(title.parentElement),nameFits=ink.top>=face.top+parseFloat(padding.paddingTop)-1&&ink.bottom<=face.bottom-parseFloat(padding.paddingBottom)+1&&ink.left>=face.left+parseFloat(padding.paddingLeft)-1&&ink.right<=face.right-parseFloat(padding.paddingRight)+1;
          const tools=[...n.querySelectorAll('h2,.cb-copy-count,.cb-version-count,.position-emblem')];
          return {id:c.id,name:c.name,faction:n.dataset.faction,source:n.querySelector('.cb-faction-watermark img').getAttribute('src'),expected:KalistarCollaborations.asset('factions',c.faction),fits:tools.every(t=>{const b=t.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1;}),nameFits,font:parseFloat(getComputedStyle(title).fontSize),width:r.width};
        });
        assert.equal(sample.source,sample.expected,'faction watermark follows the current version');assert(sample.fits&&sample.nameFits,'long name and tools fit '+JSON.stringify(sample));samples.push(sample);
      }
    }
    await touch.locator('[data-binder-field=search]').fill('MOMO');
    await touch.waitForFunction(()=>[...document.querySelectorAll('.cb-pedestal img')].every(n=>n.complete&&n.naturalWidth));
    await touch.screenshot({path:path.join(output,'pedestal-razr-momo.png'),scale:'css'});
    await touch.locator('.cb-pocket').first().screenshot({path:path.join(output,'flip-razr-card.png'),scale:'css'});
    const flip=touch.locator('.cb-flip-control').first(),old=await flip.getAttribute('data-id');
    await flip.tap();
    await touch.locator('.cb-stack[data-cycling=true]').waitFor();
    assert.equal(await touch.locator('.cb-stack[data-cycling=true]').evaluate(n=>Number(getComputedStyle(n).zIndex)<Number(getComputedStyle(n.nextElementSibling).zIndex)),true,'copper corners stay in front during the animated version change');
    await touch.waitForFunction(id=>document.querySelector('.cb-flip-control')?.dataset.id!==id,old);
    assert.equal(await touch.locator('.cb-flip-control[aria-busy=true]').count(),0,'touch rotation settles without an idle animation');
    const current=await touch.locator('.cb-flip-control').first().getAttribute('data-id');
    assert.equal(await touch.locator('.cb-card-favorite').first().getAttribute('data-id'),current,'favorite follows the current version, not its displayed name');
    assert.equal(await touch.locator('.cb-faction-watermark img').first().evaluate((n,id)=>n.getAttribute('src')===KalistarCollaborations.asset('factions',KALISTAR_DATA.cards.find(c=>c.id===id).faction),current),true,'watermark follows the current card version');
    await touch.emulateMedia({reducedMotion:'reduce'});await touch.locator('.cb-flip-control').first().tap();
    assert.notEqual(await touch.locator('.cb-flip-control').first().getAttribute('data-id'),current,'Reduced Motion keeps version switching functional');
    assert.equal(await touch.locator('.cb-flip-symbol').first().evaluate(n=>getComputedStyle(n).transform),'none');
    await touch.emulateMedia({forcedColors:'active'});
    assert.equal(await touch.locator('.cb-plinth-art').first().evaluate(n=>getComputedStyle(n).display),'none');
    assert.equal(await touch.locator('.cb-flip-control').first().evaluate(n=>getComputedStyle(n).borderTopStyle),'solid');
    await touch.emulateMedia({forcedColors:'none'});
    await phone.close();
    // Real catalogue names in compact multi-card rows; no player callbacks or saves.
    const stressContext=await browser.newContext({viewport:{width:412,height:1007},reducedMotion:'reduce'}),stressPage=await stressContext.newPage();
    await routeBuilt(stressContext);stressPage.on('pageerror',e=>errors.push(e.message));
    await stressPage.goto(url+'/jeu/#collection');await stressPage.waitForFunction(()=>window.KALISTAR_READY);
    await stressPage.evaluate(()=>{
      const cards=[...KALISTAR_DATA.cards.filter(c=>['MOMO','ILIANE'].includes(c.name)),...KALISTAR_DATA.cards.slice().sort((a,b)=>b.name.length-a.name.length).slice(0,22)];
      const data={...KALISTAR_DATA,cards:[...new Map(cards.map(c=>[c.id,c])).values()]},host=document.createElement('main');host.id='app';document.querySelector('#app').replaceWith(host);
      const surface=document.createElement('div');surface.id='collection-binder-root';host.append(surface);
      const counts=new Map(data.cards.map((c,i)=>[c.id,1+i%27]));window.CB_STRESS_COUNTS=counts;
      const view=KalistarCollection.create({data,getOwned:id=>id?Array.from({length:counts.get(id)},()=>({cardId:id})):data.cards.map(c=>({cardId:c.id}))});surface.innerHTML=view.render();view.mount(surface);window.CB_STRESS=view;
    });
    const nameStress=[];
    for(const [width,height]of [[1440,1000],[412,1007],[390,844],[320,568],[844,390]]){
      await stressPage.setViewportSize({width,height});await stressPage.waitForTimeout(150);
      await stressPage.locator('[data-binder-action=pages]:visible').click();
      await stressPage.locator('[data-binder-action=jump-page][data-id="0"]').click();
      for(let index=0;index<30;index++){
        await stressPage.waitForFunction(()=>[...document.querySelectorAll('.cb-card img')].every(n=>n.complete&&n.naturalWidth));
        assert(await stressPage.locator('.cb-card-copies').evaluateAll(nodes=>nodes.every(n=>Number(n.querySelector('b').textContent)===CB_STRESS_COUNTS.get(n.closest('.cb-pocket').dataset.cardId))),'each copy count belongs to its current card ID');
        const names=await stressPage.locator('.cb-pedestal').evaluateAll(nodes=>nodes.map(n=>{
          const stand=n.getBoundingClientRect(),title=n.querySelector('.cb-caption-title').getBoundingClientRect(),h=n.querySelector('h2'),range=document.createRange();range.selectNodeContents(h);
          const text=range.getBoundingClientRect(),rim=n.querySelector('.cb-plinth-art > span > span').getBoundingClientRect().height;
          const stack=n.previousElementSibling,card=stack.getBoundingClientRect(),glass=getComputedStyle(stack,'::before'),left=card.left+parseFloat(glass.left),right=left+parseFloat(glass.width),art=n.querySelector('.cb-plinth-art').getBoundingClientRect();
          return {name:h.textContent,width:stand.width,lines:text.height/parseFloat(getComputedStyle(h).lineHeight),seated:Math.abs(left-stand.left-8)<1&&Math.abs(stand.right-right-8)<1&&Math.abs(art.top-card.bottom+4)<1&&Math.abs(art.bottom-stand.bottom)<1,fits:text.left>=stand.left-1&&text.right<=stand.right+1&&text.left>=title.left-1&&text.right<=title.right+1&&text.top>=title.top-1&&text.bottom<=title.bottom+1&&text.top>=stand.top+rim-1&&text.bottom<=stand.bottom-rim+1};
        }));
        assert(names.every(n=>n.fits),'museum names fit their painted face: '+JSON.stringify({width,height,index,names}));
        assert(names.every(n=>n.seated),'glass fits inside copper supports in every compact row: '+JSON.stringify({width,height,index,names}));
        nameStress.push({width,height,page:index+1,names});
        if(index===0||names.some(n=>n.name==='COMMANDER WHITE'))await stressPage.screenshot({path:path.join(output,`museum-names-${width}x${height}-${index+1}.png`),scale:'css'});
        const next=stressPage.locator('.cb-footer [data-binder-action=next-page]');if(await next.isDisabled())break;await next.click();
      }
    }
    await stressPage.evaluate(()=>{
      window.CB_STRESS.destroy();
      const variants=KALISTAR_DATA.cards.filter(c=>c.name==='MOMO').slice(0,2),single=KALISTAR_DATA.cards.find(c=>c.name==='ILIANE');
      const cards=[...variants.map(c=>({...c,characterId:variants[0].characterId||variants[0].id,name:'VALENTIN DE LA FRONTIERE',positions:[1,2,3,4,5]})),{...single,name:"ARCHIVISTE D'ASTRALIA",positions:[1,2,3,4,5]}];
      const surface=document.querySelector('#collection-binder-root'),view=KalistarCollection.create({data:{...KALISTAR_DATA,cards},getOwned:id=>id?[{}]:cards.map(c=>({cardId:c.id}))});surface.innerHTML=view.render();view.mount(surface);window.CB_STRESS=view;
    });
    const fitStress=[];
    for(const [width,height]of [[1440,1000],[412,1007],[320,568],[844,390]]){
      await stressPage.setViewportSize({width,height});await stressPage.waitForTimeout(150);
      const names=await stressPage.locator('.cb-pedestal').evaluateAll(nodes=>nodes.map(n=>{
        const h=n.querySelector('h2'),range=document.createRange();range.selectNodeContents(h);
        const ink=range.getBoundingClientRect(),face=h.parentElement.getBoundingClientRect(),style=getComputedStyle(h.parentElement),card=n.closest('.cb-pocket'),positions=[...n.querySelectorAll('.position-emblem')],plinth=n.getBoundingClientRect();
        return {name:h.textContent,font:parseFloat(getComputedStyle(h).fontSize),fits:ink.top>=face.top+parseFloat(style.paddingTop)-1&&ink.bottom<=face.bottom-parseFloat(style.paddingBottom)+1&&ink.left>=face.left+parseFloat(style.paddingLeft)-1&&ink.right<=face.right-parseFloat(style.paddingRight)+1,positions:positions.length,positionsFit:positions.every(p=>{const r=p.getBoundingClientRect();return r.left>=plinth.left-1&&r.right<=plinth.right+1&&r.top>=plinth.top-1&&r.bottom<=plinth.bottom+1;}),versions:n.querySelectorAll('.cb-version-count').length,many:card.dataset.character===KALISTAR_DATA.cards.find(c=>c.name==='MOMO').characterId};
      }));
      assert(names.length===2&&names.every(n=>n.fits&&n.positions===5&&n.positionsFit&&n.font>=8),'future long names and five positions fit: '+JSON.stringify({width,height,names}));
      assert.equal(names.find(n=>n.name.startsWith('ARCHIVISTE')).versions,0,'a single version leaves no selector or count');
      assert.equal(names.find(n=>n.name.startsWith('VALENTIN')).versions,1,'multiple versions retain the inset dial');
      fitStress.push({width,height,names});await stressPage.screenshot({path:path.join(output,`name-fit-five-positions-${width}x${height}.png`),scale:'css'});
    }
    // Reproduce the mixed one/many-edition FF9 row that exposed the shifted names.
    await stressPage.evaluate(()=>{
      window.CB_STRESS.destroy();
      const names=['DJIDANE','VIVI','GRENAT','STEINER','EIKO','FREYJA'];
      const cards=KALISTAR_DATA.cards.filter(c=>names.includes(c.name));
      if(!names.every(name=>cards.some(c=>c.name===name)))throw new Error('Missing FF9 caption fixture');
      const surface=document.querySelector('#collection-binder-root'),view=KalistarCollection.create({data:{...KALISTAR_DATA,cards},getOwned:id=>id?[{}]:cards.map(c=>({cardId:c.id}))});
      surface.innerHTML=view.render();view.mount(surface);window.CB_STRESS=view;
    });
    const titleAlignment=[];
    const measureTitles=()=>stressPage.locator('.cb-pedestal').evaluateAll(nodes=>nodes.map(n=>{
      const plinth=n.getBoundingClientRect(),title=n.querySelector('.cb-caption-title').getBoundingClientRect(),name=n.querySelector('h2'),style=getComputedStyle(name),h=name.getBoundingClientRect();
      const content=getComputedStyle(n.querySelector('.cb-pedestal-content'));
      const overlaps=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
      return {name:name.textContent,width:plinth.width,titleX:title.x+title.width/2-plinth.x-plinth.width/2,titleY:title.y+title.height/2-plinth.y,font:parseFloat(style.fontSize),baseFont:parseFloat(content.getPropertyValue('--cb-name-size')),centered:Math.abs(h.x+h.width/2-plinth.x-plinth.width/2)<.5,clear:[...n.querySelectorAll('.position-emblem,.cb-flip-control')].every(control=>!overlaps(h,control.getBoundingClientRect())),versions:!!n.querySelector('.cb-flip-control')};
    }));
    for(const [width,height]of [[1920,1080],[1440,900],[412,1007],[390,844],[320,568],[844,390],[1920,1080]]){
      await stressPage.setViewportSize({width,height});await stressPage.waitForTimeout(150);
      await stressPage.locator('[data-binder-action=pages]:visible').click();
      await stressPage.locator('[data-binder-action=jump-page][data-id="0"]').click();
      for(let index=0;index<6;index++){
        await stressPage.waitForFunction(()=>[...document.querySelectorAll('.cb-card img')].every(n=>n.complete&&n.naturalWidth));
        const names=await measureTitles();
        assert(names.every(n=>Math.abs(n.titleX)<.5&&n.centered&&n.clear),'titles stay on the card axis and clear of controls: '+JSON.stringify({width,height,names}));
        assert(names.every(n=>n.font===n.baseFont),'short names share the CSS size, with or without editions: '+JSON.stringify({width,height,names}));
        assert(names.every(n=>Math.abs(n.titleY-names[0].titleY)<.5),'all plinth titles share the same vertical center');
        titleAlignment.push({width,height,page:index+1,names});
        await stressPage.screenshot({path:path.join(output,`titles-ff9-${width}x${height}-${index+1}.png`),scale:'css'});
        const next=stressPage.locator('.cb-footer [data-binder-action=next-page]');if(await next.isDisabled())break;await next.click();
      }
    }
    const beforeFlip=await measureTitles(),dial=stressPage.locator('.cb-flip-control').first();
    assert(await dial.count(),'the FF9 row includes an edition dial');await dial.click();
    assert.deepEqual(await measureTitles(),beforeFlip,'changing edition does not move or resize the title');
    await stressPage.evaluate(()=>window.CB_STRESS.destroy());await stressContext.close();
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,built,sizes:7,asset,pedestalAsset,checks,samples,nameStress,fitStress,titleAlignment,errors},null,2)+'\n');
    console.log(JSON.stringify({sizes:7,asset,checks:'atlas, sleeves, caption contrast, paging, filters, editions, notebook, Story, reload and real touch controls',screenshots:output}));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
