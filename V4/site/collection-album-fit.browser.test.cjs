'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const dependencies=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_album_fit.cjs'));
const {chromium}=dependencies('playwright'),sharp=dependencies('sharp'),{PNG}=dependencies('pngjs');
const root=path.resolve(__dirname,'../..'),built=process.env.KALISTAR_BUILT_SITE==='1';
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(root,'work/qa/album-repair/fit'));
const diagnostic=process.env.KALISTAR_FIT_MODE==='diagnostic',matrixSteps=Number(process.env.KALISTAR_FIT_STEPS||24);
const geometryOnly=process.env.KALISTAR_FIT_MODE==='geometry',strictMedia=process.env.KALISTAR_FIT_STRICT_MEDIA==='1';
const deepProfiles=new Set(['anchor-320x360','anchor-412x1007','anchor-844x390','anchor-1440x900','anchor-1913x798','anchor-1000x1400']);
// Native cards are narrower than the concept's painted cards: 55% is a conservative cell-area floor.
const contract=Object.freeze({minCssWidth:320,maxCssWidth:3440,minCssHeight:360,maxCssHeight:1440,epsilon:1,bookDistortion:.015,cardAspect:.01,minCellArea:.55,minSleeveArea:.78,stability:1.5});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const action=(page,name)=>page.locator('.cb-page [data-binder-action="'+name+'"]:not(.cb-page-turn *):visible');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function frames(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
const hash=file=>fs.existsSync(file)?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null;
const sourceFiles=['collection-binder.js','collection-binder.css','index.html'];
const sourceStamp=()=>Object.fromEntries(sourceFiles.map(f=>[f,hash(path.join(built?path.join(dist,'jeu'):__dirname,f))]));
const bookAssets=JSON.parse(fs.readFileSync(path.join(root,'V4/revisions/2026-11-22-album-layout-lock/assets.json'),'utf8')).files;
function profiles(){
  const result=[],seen=new Set();
  const add=(name,hostWidth,hostHeight,zoom=1,dpr=1)=>{
    const width=Math.floor(hostWidth/zoom),height=Math.floor(hostHeight/zoom),key=[width,height,zoom,dpr].join('/');if(seen.has(key))return;seen.add(key);
    result.push({name,width,height,hostWidth,hostHeight,zoom,deviceScaleFactor:zoom*dpr,touch:hostWidth<700||hostWidth<=1100&&hostHeight<500,inDomain:width>=320&&width<=3440&&height>=360&&height<=1440,coverage:!geometryOnly&&deepProfiles.has(name)?'deep':'sampled'});
  };
  const anchors=diagnostic?[[1440,900],[1913,798],[412,1007],[844,390],[1000,1400]]:[[320,360],[320,568],[320,740],[412,1007],[699,600],[700,600],[1007,412],[844,390],[1440,900],[1913,798],[2532,1412],[3440,360],[3440,1440],[320,1440],[1000,1400]];
  anchors.forEach(([w,h])=>add('anchor-'+w+'x'+h,w,h));
  if(!diagnostic){
    // A low-discrepancy sweep traverses widths AND heights, rather than testing only device presets.
    const radical=(n,b)=>{let value=0,unit=1/b;for(;n;n=Math.floor(n/b)){value+=(n%b)*unit;unit/=b;}return value;};
    for(let n=1;n<=matrixSteps;n++)add('sweep-'+n,Math.round(320+3120*radical(n,2)),Math.round(360+1080*radical(n,3)));
    for(const [w,h] of [[699,600],[700,600],[1100,600],[1101,600]])for(const delta of [-1,0,1])add('edge-'+w+'-'+h+'-'+delta,w+delta,h+delta);
    for(const [w,h] of [[722,1007],[723,1007],[724,1007],[990,1007],[992,1007],[2560,1375]])add('stage-edge-'+w+'x'+h,w,h);
  }
  for(const zoom of [1.25,1.5,2])for(const [w,h] of (diagnostic?[[1440,900]]:[[1440,900],[2532,1412],[3440,1440],[640,720],[412,1007],[1007,412]]))add('zoom-'+Math.round(zoom*100)+'-'+w+'x'+h,w,h,zoom);
  if(!diagnostic)add('high-density-phone',412,1007,1,2);
  return result.filter(p=>!process.env.KALISTAR_FIT_PROFILES||process.env.KALISTAR_FIT_PROFILES.split(',').includes(p.name));
}
async function readBook(page){
  return page.locator('.cb-album').evaluate(async album=>{
    const visible=n=>n.getClientRects().length&&getComputedStyle(n).display!=='none';
    const picture=[...album.querySelectorAll('[data-album-surface] img,img[data-album-surface],img.cb-book-surface,.cb-book-surface img')].find(visible);
    let node=picture||album,style=getComputedStyle(node),url=picture?.currentSrc||picture?.src;
    if(!url){const match=style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);url=match?.[1];}
    if(!url)throw Error('Book bitmap not measurable: expose it as background-image or img[data-album-surface].');
    const img=picture||await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Book bitmap failed: '+url));image.src=url;});
    const box=node.getBoundingClientRect(),cw=box.width,ch=box.height,nw=img.naturalWidth,nh=img.naturalHeight;
    const sizing=picture?style.objectFit:style.backgroundSize.split(',')[0].trim();let width,height;
    const length=(v,axis)=>v.endsWith('%')?axis*parseFloat(v)/100:v.endsWith('px')?parseFloat(v):v==='0'?0:null;
    if(['contain','cover','scale-down'].includes(sizing)){
      let scale=(sizing==='cover'?Math.max:Math.min)(cw/nw,ch/nh);if(sizing==='scale-down')scale=Math.min(1,scale);width=nw*scale;height=nh*scale;
    }else if(picture&&(sizing==='fill'||sizing==='none')){width=sizing==='none'?nw:cw;height=sizing==='none'?nh:ch;}
    else{
      const tokens=sizing.split(/\s+/);width=length(tokens[0],cw);height=length(tokens[1]||'auto',ch);
      if(width===null&&tokens[0]!=='auto')throw Error('Unsupported book background-size: '+sizing);
      if(height===null&&tokens[1]&&tokens[1]!=='auto')throw Error('Unsupported book background-size: '+sizing);
      if(width===null&&height===null){width=nw;height=nh;}else if(width===null)width=height*nw/nh;else if(height===null)height=width*nh/nw;
    }
    const position=(picture?style.objectPosition:style.backgroundPosition).split(',')[0].trim().split(/\s+/);
    const offset=(v,room)=>v.endsWith('%')?room*parseFloat(v)/100:v.endsWith('px')?parseFloat(v):v==='center'?room/2:['right','bottom'].includes(v)?room:0;
    const x=box.x+offset(position[0]||'50%',cw-width),y=box.y+offset(position[1]||'50%',ch-height);
    return {url,natural:{width:nw,height:nh},box:box.toJSON(),paint:{x,y,left:x,top:y,right:x+width,bottom:y+height,width,height},sizing,background:style.backgroundColor,opacity:Number(style.opacity),distortion:Math.abs(width/height/(nw/nh)-1)};
  });
}
async function geometry(page){
  const book=await readBook(page);
  return page.locator('.cb-album').evaluate((album,book)=>{
    const rect=n=>n.getBoundingClientRect().toJSON(),style=n=>getComputedStyle(n),visible=n=>{const s=style(n),r=rect(n);return n.getClientRects().length&&s.display!=='none'&&s.visibility!=='hidden'&&s.clip!=='rect(0px, 0px, 0px, 0px)'&&s.clipPath!=='inset(50%)'&&!(r.width<=1&&r.height<=1&&s.overflow==='hidden');};
    const within=(a,b)=>a.width>0&&a.height>0&&a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
    const viewport={left:0,top:0,right:innerWidth,bottom:innerHeight},spread=album.querySelector(':scope>.cb-spread'),leaves=[...spread.querySelectorAll(':scope>.cb-leaf')],work=album.closest('.cb-workbench'),ws=style(work),wb=rect(work),stage={width:wb.width-parseFloat(ws.paddingLeft)-parseFloat(ws.paddingRight),height:wb.height-parseFloat(ws.paddingTop)-parseFloat(ws.paddingBottom)};
    const expectedSingle=stage.width<=699&&stage.width/stage.height<=6/5,single=Number(style(album).getPropertyValue('--cb-single-leaf'))===1,allRows=[];
    const pockets=[...spread.querySelectorAll('.cb-pocket')].map(n=>{
      const p=rect(n),slot=n.querySelector('.cb-slot'),s=slot?rect(slot):p,card=n.querySelector('.cb-card'),image=card?.querySelector(':scope>img'),c=card?rect(card):null,i=image?rect(image):null;
      const caption=n.querySelector('.cb-caption'),name=caption?.querySelector('h2'),ss=style(slot||n),inner={width:s.width-parseFloat(ss.borderLeftWidth)-parseFloat(ss.borderRightWidth),height:s.height-parseFloat(ss.borderTopWidth)-parseFloat(ss.borderBottomWidth)};
      return {id:n.dataset.cardId||null,empty:n.classList.contains('is-empty'),locked:n.classList.contains('is-undiscovered'),pocket:p,sleeve:s,card:c,image:i,
        cellArea:c?c.width*c.height/(p.width*p.height):null,sleeveArea:c?c.width*c.height/(s.width*s.height):null,
        sleeveFill:c?{width:c.width/inner.width,height:c.height/inner.height}:null,
        visible:visible(n)&&within(p,viewport)&&within(p,book.paint)&&within(p,rect(single?spread:n.closest('.cb-leaf'))),
        imageFits:!image||(within(i,s)&&within(c,s)&&image instanceof HTMLImageElement),ratio:image?style(image).objectFit==='contain'?image.naturalWidth/image.naturalHeight:parseFloat(style(image).width)/parseFloat(style(image).height):null,
        native:!image||n.classList.contains('is-undiscovered')||image.dataset.v4Cropped==='card'&&image.naturalWidth===797&&image.naturalHeight===1388,
        captionFits:!caption||!visible(caption)||within(rect(caption),p)&&(!name||!visible(name)||name.scrollWidth<=name.clientWidth+1),
        hit:!card||n.classList.contains('is-undiscovered')||card.contains(document.elementFromPoint(c.x+c.width/2,c.y+c.height/2))};
    });
    const parents=[];for(let node=album.parentElement;node;node=node.parentElement)parents.push({node:node.id||node.className||node.tagName,tag:node.tagName,top:node.scrollTop,left:node.scrollLeft,x:node.scrollWidth-node.clientWidth,y:node.scrollHeight-node.clientHeight,overflowX:style(node).overflowX,overflowY:style(node).overflowY});
    const controls=[...document.querySelectorAll('.cb-heading button,.cb-toolbar button,.cb-toolbar input,.cb-toolbar select,.cb-footer button')].filter(visible).map(n=>({action:n.dataset.binderAction||n.dataset.binderField||n.tagName,box:rect(n),visible:within(rect(n),viewport)}));
    for(const pocket of pockets){let row=allRows.find(r=>Math.abs(r.top-pocket.pocket.top)<2);if(!row){row={top:pocket.pocket.top,count:0};allRows.push(row);}row.count++;}
    const footer=document.querySelector('.cb-footer'),fb=footer?rect(footer):null;
    return {book,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},album:rect(album),work:wb,stage,contentRatio:stage.width/stage.height,single,expectedSingle,physicalRows:allRows.map(r=>r.count),
      footer:fb?{box:fb,inside:album.contains(footer),bottomCenter:(fb.top+fb.height/2-book.paint.top)/book.paint.height}:null,pageMaterial:style(document.querySelector('.cb-page')).backgroundImage,
      leaves:leaves.map(n=>{const rows=[];for(const pocket of n.querySelectorAll('.cb-pocket')){const p=rect(pocket);let row=rows.find(r=>Math.abs(r.top-p.top)<2);if(!row){row={top:p.top,count:0};rows.push(row);}row.count++;}return {side:n.dataset.leaf,label:n.getAttribute('aria-label'),display:style(n).display,box:rect(n),slots:n.querySelectorAll('.cb-pocket').length,rows:rows.map(r=>r.count)};}),pockets,parents,controls,
      page:document.querySelector('.cb-page-label')?.textContent.trim(),canvas:album.querySelectorAll('canvas').length};
  },book);
}
async function imageReady(page){await page.waitForFunction(()=>[...document.querySelectorAll('.cb-album>.cb-spread .cb-card>img,.cb-album>.cb-spread .cb-hero-image')].filter(n=>n.getClientRects().length).every(n=>n.complete&&n.naturalWidth>0&&!n.src.includes('#v4-')),{},{timeout:20000});}
async function parentState(page){return page.locator('.cb-workbench').evaluate(n=>{const rows=[];for(;n;n=n.parentElement)rows.push({node:n.id||n.className||n.tagName,top:n.scrollTop,left:n.scrollLeft});return rows;});}
async function navigationGeometry(page){return action(page,'next-page').evaluate(n=>{const rect=n=>n.getBoundingClientRect().toJSON(),box=rect(n),hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2),parents=[];for(let p=n.parentElement;p;p=p.parentElement){const s=getComputedStyle(p);parents.push({node:p.id||p.className||p.tagName,box:rect(p),overflow:[s.overflowX,s.overflowY],scroll:[p.scrollLeft,p.scrollTop]});}return {box,rects:[...n.getClientRects()].map(r=>r.toJSON()),hit:hit?.outerHTML.slice(0,300),hitInside:n.contains(hit),disabled:n.disabled,parents,visibility:document.visibilityState,turns:document.querySelectorAll('.cb-page-turn').length,animations:document.getAnimations().map(a=>({state:a.playState,time:a.currentTime,duration:a.effect?.getTiming().duration}))};},{timeout:5000});}
async function menuState(page){return page.evaluate(()=>{
  const modal=document.querySelector('.cb-overlay:modal'),body=modal?.querySelector('.cb-overlay-body'),active=document.activeElement;
  return {open:!!modal,rect:modal?.getBoundingClientRect().toJSON(),scroll:body?.scrollTop,focus:{filter:active?.dataset.binderFilter,value:active?.value,action:active?.dataset.binderAction},position:modal?.querySelector('[data-binder-filter=position]:checked')?.value};
});}
async function mediaAccess(page,selector){
  const node=page.locator('.cb-page '+selector);
  if(!await node.isVisible()){
    const toggle=page.locator('.cb-media-toggle:visible');
    if(await toggle.count()){await toggle.click();await page.locator('.cb-media-overlay:modal').waitFor();}
  }
  return node;
}
async function dismissMedia(page){if(await page.locator('.cb-media-overlay:modal').count()){await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.cb-media-overlay:modal')&&!history.state?.kalistarDialogBack);await frames(page);}}
async function jump(page,index){await action(page,'pages').click();await page.locator('.cb-index:modal').waitFor();await page.locator('.cb-index [data-binder-action=jump-page][data-id="'+index+'"]').click();await frames(page);}
async function main(){
  fs.mkdirSync(output,{recursive:true});
  // Chromium downloads can bypass Playwright route fulfillment.
  const server=built?http.createServer((req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/Kalistar/'))throw Error('Outside fixture');
      const relative=decodeURIComponent(url.pathname.slice('/Kalistar/'.length)),file=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative);
      if(!file.startsWith(dist+path.sep))throw Error('Outside dist');
      const body=fs.readFileSync(file),type=mime[path.extname(file).toLowerCase()]||'application/octet-stream';
      res.setHeader('Content-Type',type);res.setHeader('Cache-Control','no-store');
      if(/\.png$/i.test(file))res.once('finish',()=>fs.appendFileSync(path.join(output,'png-http.jsonl'),JSON.stringify({time:new Date().toISOString(),method:req.method,url:req.url,status:200,mime:type,bytes:body.length})+'\n'));
      res.end(body);
    }catch{res.writeHead(404);res.end();}
  }):null;
  if(server)await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const browser=await chromium.launch({channel:'chrome',headless:true}).catch(async error=>{if(server)await new Promise(resolve=>server.close(resolve));throw error;});
  const origin=server?'http://127.0.0.1:'+server.address().port:new URL(process.env.KALISTAR_URL||'http://127.0.0.1:4304').origin,base=built?origin+'/Kalistar':origin;
  const runs=[],failures=new Map(),bitmaps=new Map(),stamp=sourceStamp();let activePage,recovery=0;
  const fail=(profile,kind,details,spread)=>{const key=profile+'/'+kind;let item=failures.get(key);if(!item){item={profile,kind,count:0,samples:[]};failures.set(key,item);}item.count++;if(item.samples.length<4)item.samples.push({spread,details});};
  const same=(a,b,epsilon=contract.stability)=>['left','top','width','height'].every(k=>Math.abs(a[k]-b[k])<=epsilon);
  function verify(p,r,index){
    const name=p.name;
    if(r.pockets.length!==12||r.leaves.length!==2||r.leaves.some(n=>n.slots!==6))fail(name,'twelve-visible-slots',{leaves:r.leaves,count:r.pockets.length},index);
    if(r.single!==r.expectedSingle)fail(name,'physical-layout-flag-does-not-follow-stage',{stage:r.stage,actual:r.single,expected:r.expectedSingle},index);
    if(r.book.distortion>contract.bookDistortion)fail(name,'book-stretched',{natural:r.book.natural,paint:r.book.paint,sizing:r.book.sizing,distortion:r.book.distortion},index);
    const within=(a,b)=>a.left>=b.left-1&&a.top>=b.top-1&&a.right<=b.right+1&&a.bottom<=b.bottom+1;
    if(!within(r.book.paint,r.work)||!within(r.book.paint,r.book.box))fail(name,'book-clipped',{paint:r.book.paint,work:r.work,box:r.book.box},index);
    if(r.single){if(JSON.stringify(r.physicalRows)!=='[3,3,3,3]'||r.leaves.some(n=>n.display!=='contents'))fail(name,'phone-folio-not-single-three-by-four',{stage:r.stage,rows:r.physicalRows,groups:r.leaves},index);}
    else{const expectedRows=r.contentRatio<=1.2?[2,2,2]:[3,3];if(r.leaves.some(n=>JSON.stringify(n.rows)!==JSON.stringify(expectedRows)||n.box.width<=0||n.box.height<=0))fail(name,'grid-does-not-follow-container-ar',{contentRatio:r.contentRatio,expectedRows,leaves:r.leaves},index);}
    if(r.leaves.some((n,i)=>{const text=(n.label||'').normalize('NFD').replace(/\p{M}/gu,'');return !new RegExp('Emplacements.*\\b'+(i?7:1)+'\\b.*\\b'+(i?12:6)+'\\b','i').test(text)||/Page/i.test(text);}))fail(name,'slot-groups-have-physical-page-labels',r.leaves,index);
    const assetName=r.single?'album-folio-phone-v1':r.contentRatio<=1.2?'album-open-phone-v2':'album-open-v2',asset=bookAssets.find(n=>n.name===assetName);
    if(!asset||!new URL(r.book.url).pathname.endsWith(path.basename(asset.target))||r.book.natural.width!==asset.width||r.book.natural.height!==asset.height)fail(name,'wrong-physical-book-asset',{expected:asset,actual:r.book},index);
    if(!r.footer||!r.footer.inside||!within(r.footer.box,r.book.paint))fail(name,'footer-outside-book',r.footer,index);
    if(r.footer){const gap=r.footer.box.top-Math.max(...r.pockets.map(n=>n.pocket.bottom)),expectedCenter=Math.min(r.single?.94:.86,1-22/r.book.paint.height),delta=Math.abs(r.footer.bottomCenter-expectedCenter)*r.book.paint.height;if(gap<7)fail(name,'slot-footer-gap-below-eight-pixels',{gap,footer:r.footer.box,slots:r.pockets.map(n=>n.pocket)},index);if(delta>1)fail(name,'footer-center-not-on-adaptive-paper',{actual:r.footer.bottomCenter,expected:expectedCenter,deltaPixels:delta,bookHeight:r.book.paint.height},index);}
    if(/hud-material/.test(r.pageMaterial))fail(name,'obsolete-hud-material',r.pageMaterial,index);
    for(const item of r.pockets){
      if(!item.visible||!item.imageFits||!item.captionFits)fail(name,'pocket-or-content-clipped',item,index);
      if(!item.empty){
        if(item.cellArea<contract.minCellArea)fail(name,'cards-too-small-in-cells',{id:item.id,cellArea:item.cellArea,min:contract.minCellArea,pocket:item.pocket,card:item.card},index);
        if(item.sleeveArea<contract.minSleeveArea)fail(name,'cards-too-small-in-sleeves',{id:item.id,sleeveArea:item.sleeveArea,min:contract.minSleeveArea},index);
        if(item.sleeveFill.width<.94||item.sleeveFill.height<.94||item.sleeveFill.width>.98||item.sleeveFill.height>.98)fail(name,'card-does-not-fill-95-percent-sleeve',{id:item.id,fill:item.sleeveFill},index);
        if(Math.abs(item.ratio-797/1388)>contract.cardAspect)fail(name,'native-card-distorted',item,index);
        if(!item.hit)fail(name,'card-center-obstructed',{id:item.id,card:item.card},index);
      }
    }
    if(r.canvas)fail(name,'redrawn-cards',r.canvas,index);
    if(r.parents.some(n=>n.top!==0||n.left!==0||n.x>1||n.y>1))fail(name,'parent-overflow-or-scroll',r.parents,index);
    if(r.parents.some(n=>n.overflowX!=='clip'||n.overflowY!=='clip'))fail(name,'collection-parent-not-overflow-clip',r.parents,index);
    if(r.controls.some(n=>!n.visible))fail(name,'chrome-control-clipped',r.controls.filter(n=>!n.visible),index);
  }
  const captures=new Set();
  async function screenshot(page,p,label){const key=p.name+'-'+label;if(/^(sweep|edge)-/.test(p.name)&&![...failures.keys()].some(k=>k.startsWith(p.name+'/')))return;if(!captures.has(key)&&captures.size>=96)return;captures.add(key);await page.screenshot({path:path.join(output,key+'.png'),scale:'css'});}
  async function transparentCorners(page,p,r){
    const u=new URL(r.book.url),relative=decodeURIComponent(u.pathname).replace(/^\/Kalistar/,'').replace(/^\/jeu\//,''),file=path.resolve(built?path.join(dist,'jeu'):__dirname,relative);
    const directory=path.resolve(built?path.join(dist,'jeu'):__dirname);if(!file.startsWith(directory+path.sep)||!fs.existsSync(file))return;
    let bitmap=bitmaps.get(file);if(!bitmap){const bytes=fs.readFileSync(file);bitmap={...await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true}),sha256:crypto.createHash('sha256').update(bytes).digest('hex')};bitmaps.set(file,bitmap);}
    const buffer=await page.screenshot({scale:'css'}),png=PNG.sync.read(buffer),samples=[];
    for(const [fx,fy] of [[.002,.002],[.012,.012],[.988,.012],[.998,.002],[.002,.998],[.012,.988],[.988,.988],[.998,.998]]){
      const bx=Math.min(bitmap.info.width-1,Math.floor(fx*bitmap.info.width)),by=Math.min(bitmap.info.height-1,Math.floor(fy*bitmap.info.height)),bi=(by*bitmap.info.width+bx)*4;
      if(bitmap.data[bi+3]>12)continue;
      const x=Math.floor(r.book.paint.x+fx*r.book.paint.width),y=Math.floor(r.book.paint.y+fy*r.book.paint.height);if(x<0||y<0||x>=png.width||y>=png.height)continue;
      const si=(y*png.width+x)*4,rgb=[...png.data.subarray(si,si+3)];if(Math.min(...rgb)>155&&Math.max(...rgb)-Math.min(...rgb)<50)samples.push({x,y,rgb,assetAlpha:bitmap.data[bi+3]});
    }
    if(samples.length)fail(p.name,'light-rectangle-through-transparent-book',{background:r.book.background,samples});
  }
  async function idleInteraction(page,p){
    await page.mouse.move(1,1);await sleep(250);const before=await geometry(page),parents=await parentState(page);
    const card=action(page,'open').first();if(await card.count()){const box=await card.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await sleep(250);}
    const middle=await geometry(page);if(!same(before.album,middle.album)||before.pockets.some((n,i)=>!same(n.pocket,middle.pockets[i].pocket)))fail(p.name,'pointer-changes-layout',{before:before.album,after:middle.album});
    await page.mouse.move(before.work.x+before.work.width/2,before.work.y+before.work.height/2);await page.mouse.wheel(0,440);await page.mouse.wheel(240,0);await frames(page);
    if(JSON.stringify(await parentState(page))!==JSON.stringify(parents))fail(p.name,'wheel-scrolls-parent',{before:parents,after:await parentState(page)});
    const openings=action(page,'open'),count=await openings.count();
    for(const i of [...new Set([0,count-1])].filter(i=>i>=0)){await openings.nth(i).focus();await frames(page);if(JSON.stringify(await parentState(page))!==JSON.stringify(parents))fail(p.name,'focus-scrolls-parent',{index:i,before:parents,after:await parentState(page)});}
    await page.locator('[data-binder-field=search]').focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await sleep(900);
    const after=await geometry(page);if(!same(before.album,after.album))fail(p.name,'idle-changes-book',{before:before.album,after:after.album});
    if(JSON.stringify(await parentState(page))!==JSON.stringify(parents))fail(p.name,'idle-or-tab-scrolls-parent',{before:parents,after:await parentState(page)});
  }
  async function menus(page,p){
    const parents=await parentState(page);await action(page,'filters').click();await page.locator('.cb-overlay:modal').waitFor();
    const choice=page.locator('.cb-overlay:modal .position-choice').filter({has:page.locator('input[data-binder-filter=position][value="3"]')});
    await choice.scrollIntoViewIfNeeded();const before=await menuState(page),target=await choice.boundingBox();
    await choice.click();await frames(page);const selected=await menuState(page);
    if(!selected.open)fail(p.name,'position-change-closes-menu',{before,after:selected});
    else{
      if(selected.position!=='3')fail(p.name,'position-not-selected',selected);
      if(selected.focus.filter!=='position'||selected.focus.value!=='3')fail(p.name,'position-focus-jumps',selected);
      if(Math.abs(selected.scroll-before.scroll)>1||!same(before.rect,selected.rect))fail(p.name,'position-change-scrolls-or-moves-menu',{before,after:selected});
      const now=await choice.boundingBox();if(now&&Math.abs(now.y-target.y)>1)fail(p.name,'position-control-jumps',{before:target,after:now});
      await page.mouse.move(selected.rect.x+selected.rect.width*.6,selected.rect.y+selected.rect.height*.5);await page.mouse.wheel(0,150);await frames(page);
      if(!(await menuState(page)).open)fail(p.name,'wheel-closes-menu',await menuState(page));
      await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await sleep(1100);
      const idle=await menuState(page);if(!idle.open)fail(p.name,'focus-or-idle-closes-menu',idle);
    }
    if(JSON.stringify(await parentState(page))!==JSON.stringify(parents))fail(p.name,'menu-scrolls-parent',{before:parents,after:await parentState(page)});
    await screenshot(page,p,'position-menu');await page.keyboard.press('Escape');await frames(page);
    if(await page.locator('.cb-overlay:modal').count())fail(p.name,'escape-does-not-close-menu',await menuState(page));
    if(await action(page,'reset').count())await action(page,'reset').click();
    await action(page,'pages').click();await page.locator('.cb-index:modal').waitFor();const index=await menuState(page);
    await page.mouse.move(index.rect.x+index.rect.width/2,index.rect.y+index.rect.height/2);await page.mouse.wheel(0,180);await page.keyboard.press('Tab');await sleep(800);
    if(!await page.locator('.cb-index:modal').count())fail(p.name,'index-disappears-on-idle-or-focus',await menuState(page));
    if(JSON.stringify(await parentState(page))!==JSON.stringify(parents))fail(p.name,'index-scrolls-parent',{before:parents,after:await parentState(page)});
    await page.keyboard.press('Escape');await frames(page);
  }
  async function readingPages(page,p,deep){
    const paragraph=page.locator('.cb-story p'),text=await paragraph.textContent(),covered=new Set();
    const count=Number((await page.locator('[data-reading-page]').textContent()).match(/\/\s*(\d+)/)?.[1]);assert(count>0&&count<1000,'bounded readable text pagination');
    while(await page.locator('[data-binder-action=read-previous]').isEnabled())await page.locator('[data-binder-action=read-previous]').click();
    const sampled=deep?Array.from({length:count},(_,i)=>i):[...new Set([0,count-1])];
    for(let index=0;index<count;index++){
      if(!sampled.includes(index)){await page.locator('[data-binder-action=read-next]').click();continue;}
      const sample=await paragraph.evaluate(n=>{const win=n.closest('.cb-read-window').getBoundingClientRect(),walker=document.createTreeWalker(n,NodeFilter.SHOW_TEXT),indices=[],clipped=[];let node,offset=0;while((node=walker.nextNode())){for(let i=0;i<node.length;i++){if(!node.data[i].trim())continue;const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);for(const r of range.getClientRects()){if(r.width<=0)continue;const inside=r.left>=win.left-1&&r.right<=win.right+1&&r.top>=win.top-1&&r.bottom<=win.bottom+1;if(inside)indices.push(offset+i);else if(r.right>win.left+1&&r.left<win.right-1&&r.bottom>win.top+1&&r.top<win.bottom-1)clipped.push({index:offset+i,char:node.data[i],rect:r.toJSON(),window:win.toJSON()});}}offset+=node.length;}return {indices,clipped};});
      if(sample.clipped.length)fail(p.name,'reading-visible-character-partially-clipped',{index,count,samples:sample.clipped.slice(0,8)});
      sample.indices.forEach(i=>covered.add(i));if(!sample.indices.length){const metadata=await page.locator('.cb-story-kicker').evaluate(n=>{const w=n.closest('.cb-read-window').getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);return [...range.getClientRects()].some(r=>r.width>0&&r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1);});if(!metadata)fail(p.name,'empty-reading-page',{index,count});}
      if(index<count-1){if(await page.locator('[data-binder-action=read-next]').isDisabled()){fail(p.name,'reading-stops-before-last-page',{index,count});break;}await page.locator('[data-binder-action=read-next]').click();}
    }
    const missing=[];if(deep)for(let i=0;i<text.length;i++)if(text[i].trim()&&!covered.has(i))missing.push({index:i,text:text.slice(Math.max(0,i-12),i+13)});
    if(missing.length)fail(p.name,'reading-characters-clipped',{count:missing.length,samples:missing.slice(0,12)});
    return {coverage:deep?'all-characters-all-pages':'first-and-last-page',pages:count,sampledPages:sampled,coveredCharacters:covered.size,totalCharacters:[...text].filter(c=>c.trim()).length};
  }
  async function reader(page,p,deep){
    const hud=()=>page.locator('.masthead,.main-nav').evaluateAll(ns=>ns.map(n=>({name:n.className,visible:n.getClientRects().length>0&&getComputedStyle(n).display!=='none',box:n.getBoundingClientRect().toJSON()})));
    const chromeBefore=await hud();
    await action(page,'open').first().click();await frames(page);await imageReady(page);
    const chromeDuring=await hud();if(p.height<=600){if(chromeDuring.some(n=>n.visible))fail(p.name,'short-reader-not-immersive',chromeDuring);}else if(chromeBefore.some((n,i)=>n.visible&&(!chromeDuring[i]?.visible||!same(n.box,chromeDuring[i].box))))fail(p.name,'normal-height-reader-changes-global-header',{before:chromeBefore,after:chromeDuring});
    const r=await page.locator('.cb-reader').evaluate(n=>{
      const rect=n=>n.getBoundingClientRect().toJSON(),v=n.querySelector('.cb-visual'),reading=n.querySelector('.cb-reading'),img=v.querySelector('.cb-hero-image'),stage=v.querySelector('.cb-hero-stage'),win=reading.querySelector('.cb-read-window');
      return {visual:rect(v),reading:rect(reading),image:rect(img),stage:rect(stage),window:rect(win),font:parseFloat(getComputedStyle(win.firstElementChild).fontSize),native:img.dataset.v4Cropped==='card'&&img.naturalWidth===797&&img.naturalHeight===1388,pager:[...reading.querySelectorAll('.cb-reading-pager button')].map(n=>{const box=rect(n);return {action:n.dataset.binderAction,box,disabled:n.disabled,hit:n.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2))};})};
    });
    const within=(a,b)=>a.width>0&&a.height>0&&a.left>=b.left-1&&a.top>=b.top-1&&a.right<=b.right+1&&a.bottom<=b.bottom+1;
    if(!r.native||!within(r.image,r.stage)||!within(r.image,r.visual)||r.visual.right>r.reading.left+1||Math.abs(r.image.width/r.image.height-797/1388)>contract.cardAspect)fail(p.name,'reader-native-image-clipped-or-stacked',r);
    if(r.window.height<42||r.window.width<70||r.font<14)fail(p.name,'reader-text-window-unusable',r);
    const book=await readBook(page);if(book.distortion>contract.bookDistortion)fail(p.name,'reader-book-stretched',book);
    for(const control of r.pager)if(!within(control.box,r.reading)||!within(control.box,book.box)||!control.disabled&&!control.hit)fail(p.name,'reader-pager-clipped-or-obstructed',{control,reading:r.reading,book:book.box});
    const media=book.box;
    const mediaCollapsed=await page.locator('.cb-media-toggle').isVisible();if(mediaCollapsed!==((media.height<=600&&media.width/media.height>=6/5)||media.height<=400))fail(p.name,'reader-media-disclosure-does-not-follow-book',{book:media,collapsed:mediaCollapsed});
    if(deep||strictMedia)await mediaOptions(page,p);
    const text=await readingPages(page,p,deep);
    const parent=await parentState(page);await page.locator('[data-binder-action=read-next]').focus();await page.keyboard.press('Tab');await page.mouse.wheel(0,300);await sleep(500);
    if(JSON.stringify(parent)!==JSON.stringify(await parentState(page)))fail(p.name,'reader-focus-or-wheel-scrolls-parent',{before:parent,after:await parentState(page)});
    await screenshot(page,p,'reader');await action(page,'back').click();await frames(page);const chromeAfter=await hud();if(chromeBefore.some((n,i)=>n.visible!==chromeAfter[i]?.visible||n.visible&&!same(n.box,chromeAfter[i].box)))fail(p.name,'back-does-not-restore-global-header',{before:chromeBefore,after:chromeAfter});
    return {geometry:r,book,text};
  }
  async function mediaOptions(page,p){
    const toggle=page.locator('.cb-media-toggle'),book=await page.locator('.cb-album').evaluate(n=>n.getBoundingClientRect().toJSON());
    const expected=(book.height<=600&&book.width/book.height>=6/5)||book.height<=400,veryShort=book.height<=400,collapsed=await toggle.isVisible();
    if(expected!==collapsed)fail(p.name,'media-disclosure-not-following-book',{book,expected,collapsed});
    const selectors=['[data-binder-action=media][data-id=card]','[data-binder-action=media][data-id=art]','[data-binder-action=favorite]','a[download]','select[data-binder-field=version]'];
    const modalSelectors=veryShort?[...selectors,'select[data-binder-field=tab]']:selectors;
    for(const selector of selectors)if(await page.locator('.cb-reader '+selector).count()!==1)fail(p.name,'missing-or-duplicated-media-option',selector);
    if(!collapsed){for(const selector of selectors)if(!await page.locator('.cb-reader '+selector).isVisible())fail(p.name,'inline-media-option-inaccessible',selector);const version=await page.locator('.cb-reader select[data-binder-field=version]').boundingBox(),minimum=p.touch||p.width<=699||p.height<=600?44:40;if(version.height<minimum)fail(p.name,'version-select-below-contract',{...version,minimum});return;}
    const t=await toggle.boundingBox();if(t.width<44||t.height<44)fail(p.name,'media-toggle-below-44px',t);
    await page.evaluate(veryShort=>{const v=document.querySelector('.cb-visual'),nodes=[...v.querySelectorAll(':scope>figcaption,:scope>.cb-version-select,:scope>.cb-equipped')];if(veryShort)nodes.push(document.querySelector('.cb-reading select[data-binder-field=tab]'));window.__albumFitMediaNodes=nodes.filter(Boolean).map(node=>({node,parent:node.parentElement}));},veryShort);
    const parent=await parentState(page),route=page.url();await toggle.click();await page.locator('.cb-media-overlay:modal').waitFor();
    const moved=await page.evaluate(()=>{const d=document.querySelector('.cb-media-overlay:modal');return {same:__albumFitMediaNodes.every(({node})=>node.isConnected&&d.contains(node)),label:d.getAttribute('aria-label')||d.getAttribute('aria-labelledby'),focus:d.contains(document.activeElement),expanded:document.querySelector('.cb-media-toggle').getAttribute('aria-expanded')};});
    if(!moved.same||!moved.label||!moved.focus||moved.expanded!=='true')fail(p.name,'media-modal-not-native-or-controls-cloned',moved);
    for(const selector of modalSelectors){const node=page.locator('.cb-media-overlay '+selector);if(await node.count()!==1||!await node.isVisible())fail(p.name,'media-modal-option-inaccessible',selector);else{await node.scrollIntoViewIfNeeded();if(!await node.evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}))fail(p.name,'media-modal-option-obstructed',selector);if(selector==='select[data-binder-field=version]'||selector.includes('data-binder-action=media')||selector.includes('data-binder-action=favorite')||selector==='a[download]'){const box=await node.boundingBox();if(box.width<44||box.height<44)fail(p.name,'media-option-below-44px',{selector,box});}}}
    await page.keyboard.press('Tab');if(!await page.locator('.cb-media-overlay').evaluate(n=>n.contains(document.activeElement)))fail(p.name,'media-focus-escapes-dialog',{});
    await screenshot(page,p,'media-options');await dismissMedia(page);
    const escaped=await page.evaluate(()=>({same:__albumFitMediaNodes.every(({node,parent})=>node.isConnected&&parent.contains(node)),reader:!!document.querySelector('.cb-reader'),focus:document.activeElement===document.querySelector('.cb-media-toggle')}));
    if(!escaped.same||!escaped.reader||!escaped.focus||page.url()!==route)fail(p.name,'media-escape-loses-controls-reader-or-focus',escaped);
    await toggle.click();await page.locator('.cb-media-overlay:modal').waitFor();await page.goBack();await page.waitForFunction(()=>!document.querySelector('.cb-media-overlay:modal'));await frames(page);
    if(!await page.locator('.cb-reader').count()||!await toggle.evaluate(n=>n===document.activeElement)||page.url()!==route)fail(p.name,'media-browser-back-loses-reader-or-focus',{url:page.url(),expected:route});
    if(JSON.stringify(parent)!==JSON.stringify(await parentState(page)))fail(p.name,'media-options-scroll-parent',{before:parent,after:await parentState(page)});
    await page.setViewportSize({width:1440,height:1000});await frames(page);
    const inline=await page.evaluate(()=>__albumFitMediaNodes.every(({node,parent})=>node.isConnected&&parent.contains(node)));
    if(!inline||await toggle.isVisible())fail(p.name,'media-controls-not-restored-inline-after-resize',{});
    for(const selector of selectors)if(!await page.locator('.cb-reader '+selector).isVisible())fail(p.name,'resized-inline-option-inaccessible',selector);
    await page.setViewportSize({width:p.width,height:p.height});await frames(page);
    const art=await mediaAccess(page,'[data-binder-action=media][data-id=art]');await art.click();await imageReady(page);
    if(!await page.locator('.cb-hero-image').evaluate(n=>n.dataset.v4Cropped==='art'))fail(p.name,'media-art-action-not-working',{});
    const native=await mediaAccess(page,'[data-binder-action=media][data-id=card]');await native.click();await imageReady(page);
    if(!await page.locator('.cb-hero-image').evaluate(n=>n.dataset.v4Cropped==='card'))fail(p.name,'media-native-card-action-not-working',{});
    await dismissMedia(page);
    if(veryShort){const tabs=await mediaAccess(page,'select[data-binder-field=tab]');await tabs.selectOption('profile');await frames(page);if(!await page.locator('.cb-profile').count())fail(p.name,'media-reader-tab-action-not-working',{});await dismissMedia(page);const story=await mediaAccess(page,'select[data-binder-field=tab]');await story.selectOption('story');await dismissMedia(page);}
    const versions=await mediaAccess(page,'select[data-binder-field=version]'),original=await versions.inputValue(),other=await versions.locator('option:not(:disabled)').evaluateAll(ns=>ns.find(n=>!n.selected)?.value);
    if(other){await versions.selectOption(other);await imageReady(page);const restore=await mediaAccess(page,'select[data-binder-field=version]');if(await restore.inputValue()!==other)fail(p.name,'media-version-action-not-working',{});await restore.selectOption(original);await imageReady(page);}await dismissMedia(page);
    const favorite=await mediaAccess(page,'[data-binder-action=favorite]'),pressed=await favorite.getAttribute('aria-pressed');await favorite.click();const restoreFavorite=await mediaAccess(page,'[data-binder-action=favorite]');if(await restoreFavorite.getAttribute('aria-pressed')===pressed)fail(p.name,'media-favorite-action-not-working',{});await restoreFavorite.click();await dismissMedia(page);
    const png=await mediaAccess(page,'a[download]'),download=page.waitForEvent('download');await png.click();const file=await download;assert.match(file.suggestedFilename(),/\.png$/i);assert.equal(await file.failure(),null);const stream=await file.createReadStream();let signature=Buffer.alloc(0);for await(const chunk of stream){signature=Buffer.concat([signature,chunk]);if(signature.length>=8)break;}assert.deepEqual([...signature.subarray(0,8)],[137,80,78,71,13,10,26,10]);await dismissMedia(page);
  }
  try{
    const matrix=profiles();assert(matrix.some(p=>p.inDomain),'at least one in-domain profile must run');const groups=new Map();for(const p of matrix){const key=[p.zoom,p.deviceScaleFactor,p.touch].join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
    for(const list of groups.values()){
      const first=list[0],context=await browser.newContext({viewport:{width:first.width,height:first.height},deviceScaleFactor:first.deviceScaleFactor,hasTouch:first.touch,isMobile:first.touch,reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],requests=[];activePage=page;
      page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
      await context.route('**/*',route=>{
        const url=new URL(route.request().url());if(url.origin!==origin){requests.push(url.origin);return route.abort();}
        return route.continue();
      });
      await page.goto(base+'/jeu/#collection');await page.locator('[data-startup-enter]:enabled').click({timeout:90000});await page.waitForFunction(()=>window.KALISTAR_READY,{},{timeout:90000});await page.evaluate(()=>document.fonts.ready);
      const before=await page.evaluate(()=>JSON.stringify({data:KALISTAR_DATA,owned:KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).slice().sort((a,b)=>a.id.localeCompare(b.id)),matches:KALISTAR_DB.registry.matches(KALISTAR_ACTIVE_USER),game:Object.fromEntries(Object.keys(localStorage).filter(k=>/(?:^|\.)game$/.test(k)).sort().map(k=>[k,localStorage.getItem(k)]))}));
      for(const p of list){
        if(!p.inDomain){runs.push({...p,status:'below-minimum-css',note:'Diagnostic boundary, not an acceptance pass. Test the 320x360 CSS minimum separately.'});continue;}
        const deep=p.coverage==='deep',allSpreads=deep&&!diagnostic;
        const started=Date.now(),prior=new Set(failures.keys()),result={...p,status:'running',spreads:[],partial:!allSpreads,strictMedia:deep||strictMedia};runs.push(result);
        try{
          await page.setViewportSize({width:p.width,height:p.height});await frames(page);
          await action(page,'scope').filter({hasText:'Catalogue'}).click();await frames(page);await imageReady(page);
          const observed=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio}));assert.equal(observed.width,p.width);assert.equal(observed.height,p.height);assert(Math.abs(observed.dpr-p.deviceScaleFactor)<.01);result.observed=observed;
          const initial=await geometry(page),count=Number(initial.page.match(/\/\s*(\d+)/)?.[1]);assert(count>0,'spread count readable');
          const indices=allSpreads?Array.from({length:count},(_,i)=>i):[...new Set([0,Math.floor(count/2),count-1])],seen=new Set();
          for(const index of indices){
            if(index!==0&&(!allSpreads||index!==indices[indices.indexOf(index)-1]+1))await jump(page,index);else if(index>0){result.lastNavigation={to:index,before:await navigationGeometry(page)};await action(page,'next-page').click();await frames(page);}
            const r=await geometry(page);verify(p,r,index);for(const c of r.pockets.filter(n=>n.id)){if(seen.has(c.id))fail(p.name,'version-repeated-between-spreads',c.id,index);seen.add(c.id);}
            result.spreads.push({index,label:r.page,filled:r.pockets.filter(n=>!n.empty).length,bookRatio:r.book.paint.width/r.book.paint.height,distortion:r.book.distortion,minCellArea:Math.min(...r.pockets.filter(n=>!n.empty).map(n=>n.cellArea)),parents:r.parents});
            if(index===0){await imageReady(page);const loaded=await geometry(page);if(loaded.pockets.some(n=>!n.native))fail(p.name,'non-native-card-image',loaded.pockets.filter(n=>!n.native));await screenshot(page,p,'gallery');await transparentCorners(page,p,loaded);result.first=loaded;if(p.zoom!==1){const raster=PNG.sync.read(await page.screenshot({path:path.join(output,p.name+'-device-pixels.png'),scale:'device'}));result.deviceRaster={width:raster.width,height:raster.height};assert(Math.abs(raster.width-p.width*p.deviceScaleFactor)<=1&&Math.abs(raster.height-p.height*p.deviceScaleFactor)<=1,'zoom device raster agrees with CSS viewport and DPR');}}
          }
          await jump(page,0);if(deep){await idleInteraction(page,p);await menus(page,p);}
          await page.locator('[data-binder-field=search]').fill('__album_fit_no_match__');const empty=await geometry(page);verify(p,empty,'empty');if(empty.pockets.some(n=>!n.empty))fail(p.name,'empty-filter-not-empty',empty.pockets);
          await page.locator('[data-binder-field=search]').fill('');await frames(page);result.reader=await reader(page,p,deep);
          result.status=[...failures.keys()].some(k=>k.startsWith(p.name+'/'))?'failed':'passed';
        }catch(error){fail(p.name,'interaction-or-setup',error.message);result.status='failed';if(result.lastNavigation)result.lastNavigation.after=await navigationGeometry(page).catch(e=>({error:e.message}));await screenshot(page,p,'failure').catch(()=>{});fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,running:true,diagnostic,contract,source:stamp,runs,failures:[...failures.values()]},null,2)+'\n');await page.keyboard.press('Escape').catch(()=>{});await page.goto(base+'/jeu/?album-fit-recovery='+(++recovery)+'#collection');await page.locator('[data-startup-enter]:enabled').click({timeout:90000});await page.waitForFunction(()=>window.KALISTAR_READY,{},{timeout:90000});}
        result.durationMs=Date.now()-started;console.log(p.name+': '+result.status+'; '+result.spreads.length+' spreads; new contract failures '+([...failures.keys()].filter(k=>!prior.has(k)).length));
        fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,running:true,diagnostic,contract,source:stamp,runs,failures:[...failures.values()]},null,2)+'\n');
      }
      const after=await page.evaluate(()=>JSON.stringify({data:KALISTAR_DATA,owned:KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).slice().sort((a,b)=>a.id.localeCompare(b.id)),matches:KALISTAR_DB.registry.matches(KALISTAR_ACTIVE_USER),game:Object.fromEntries(Object.keys(localStorage).filter(k=>/(?:^|\.)game$/.test(k)).sort().map(k=>[k,localStorage.getItem(k)]))}));
      if(before!==after)fail('safety','collection-or-save-mutation',{});if(errors.length)fail('browser','javascript-errors',errors);await context.close();
    }
    const endStamp=sourceStamp(),changed=Object.keys(stamp).filter(k=>stamp[k]!==endStamp[k]);
    if(changed.length)fail('source','changed-during-run',{changed,start:stamp,end:endStamp});
    for(const [file,bitmap]of bitmaps)if(hash(file)!==bitmap.sha256)fail('source','book-bitmap-changed-during-run',{file});
    const report={passed:failures.size===0,running:false,diagnostic,geometryOnly,strictMedia,coverage:{deep:geometryOnly?'not run in geometry-only mode':'six pivots: all spreads, all text characters, idle/pointer/wheel/focus, menus, media tools, PNG, resize',sampled:'first/middle/last and empty spreads; native reader geometry, first/last text pages, focus/wheel, Back restores HUD',strictMedia:strictMedia?'also run media tools, PNG and resize on sampled profiles':'deep profiles only',diagnostic:diagnostic?'deep spread coverage limited to first/middle/last':null},contract,source:stamp,sourceAtEnd:endStamp,runs,failures:[...failures.values()]};
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({passed:report.passed,profiles:runs.length,tested:runs.filter(n=>n.inDomain).length,failureTypes:failures.size,report:path.join(output,'results.json')}));assert.equal(failures.size,0,'Album fit contract failed; see results.json.');
  }catch(error){fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,running:false,diagnostic,contract,source:stamp,runs,failures:[...failures.values()],runnerError:error.message},null,2)+'\n');await activePage?.screenshot({path:path.join(output,'runner-failure.png'),scale:'css'}).catch(()=>{});throw error;}
  finally{try{await browser.close();}finally{if(server)await new Promise(resolve=>server.close(resolve));}}
}
module.exports={mediaAccess,dismissMedia};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
