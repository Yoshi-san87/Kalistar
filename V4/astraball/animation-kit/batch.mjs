import {CLIPS,frameAt,frameRect,TEMPLATE} from './template-v2.mjs';
const $=id=>document.getElementById(id),all=new URLSearchParams(location.search).get('catalog')==='all';
const base=all?'/data/':'/data/ten-characters/',libraryUrl=all?'/data/full-catalog/library.json':base+'library.json';
const PAGE_SIZE=all&&matchMedia('(max-width:700px)').matches?6:12;
let actors=[],playing=false,elapsed=0,start=0,raf=null,mirrored=false,detail=null,library=null,pageIndex=0,loadToken=0,clipToken=0;
for(const [id,c] of Object.entries(CLIPS))for(const target of ['clip','detail-clip'])$(target).add(new Option(c.label,id));
const selected=()=>CLIPS[$('clip').value];
function draw(canvas,actor,index,zoom=1){
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.setTransform(zoom,0,0,zoom,0,0);
  ctx.fillStyle='#17251e';ctx.fillRect(0,0,320,320);
  if($('guides').checked){ctx.strokeStyle='#45665a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,272.5);ctx.lineTo(320,272.5);ctx.stroke();ctx.fillStyle='#e3c482';ctx.fillRect(158,271,5,3);}
  const rect=frameRect(index),image=actor.images[rect.page];
  ctx.save();if(mirrored){ctx.translate(320,0);ctx.scale(-1,1);}if(image)ctx.drawImage(image,rect.x,rect.y,320,320,0,0,320,320);ctx.restore();
  canvas.dataset.frame=String(index);canvas.dataset.scale=String(zoom);
}
function render(){
  const clip=selected(),index=frameAt(clip,elapsed);
  for(const actor of actors)draw(actor.canvas,actor,index);
  if(detail){draw($('detail-canvas'),detail,index,Number($('detail-zoom').value));$('frame').value=clip.frames.findIndex(f=>f.index===index);$('counter').value=(Number($('frame').value)+1)+' / '+clip.frames.length;}
}
function playbackIcon(){for(const id of ['play','detail-play']){$(id).innerHTML='<i data-lucide="'+(playing?'pause':'play')+'"></i>';$(id).setAttribute('aria-label',playing?'Pause':'Lire');$(id).title=playing?'Pause':'Lire';}window.lucide?.createIcons();}
function stop(){playing=false;cancelAnimationFrame(raf);raf=null;playbackIcon();}
function tick(now){if(!playing||document.hidden)return;elapsed=(now-start)*Number($('speed').value);render();if(!selected().loop&&elapsed>=selected().frames.reduce((n,f)=>n+f.durationMs,0)){stop();return;}raf=requestAnimationFrame(tick);}
function reset(){stop();elapsed=0;$('detail-clip').value=$('clip').value;$('frame').max=selected().frames.length-1;$('frame').value=0;$('duration').textContent=selected().frames.length+' frames · '+(selected().loop?'boucle':'séquence unique');render();}
function seek(value){stop();elapsed=selected().frames.slice(0,value).reduce((n,f)=>n+f.durationMs,0);render();}
function open(actor){detail=actor;stop();$('detail-name').textContent=actor.entry.name;$('downloads').replaceChildren();
  for(const [i,page] of actor.manifest.pages.entries()){const a=document.createElement('a');a.href=actor.directory+page.file;a.download='';a.textContent='Page '+(i+1);$('downloads').append(a);}
  const a=document.createElement('a');a.href=base+actor.entry.manifest;a.download='';a.textContent='Manifeste';$('downloads').append(a);$('detail-zoom').value=matchMedia('(max-width:700px)').matches?'1':'2';resizeDetail();$('detail').showModal();reset();positionDetail();}
function positionDetail(){const stage=document.querySelector('.detail-stage');stage.scrollTop=stage.scrollHeight-stage.clientHeight;stage.scrollLeft=(stage.scrollWidth-stage.clientWidth)/2;}
function resizeDetail(){const size=320*Number($('detail-zoom').value);$('detail-canvas').width=$('detail-canvas').height=size;render();}
function togglePlayback(){if(playing)return stop();const total=selected().frames.reduce((n,f)=>n+f.durationMs,0);if(!selected().loop&&elapsed>=total)elapsed=0;playing=true;start=performance.now()-elapsed/Number($('speed').value);playbackIcon();raf=requestAnimationFrame(tick);}
$('play').onclick=togglePlayback;$('detail-play').onclick=togglePlayback;
$('detail-clip').onchange=()=>{$('clip').value=$('detail-clip').value;changeClip();};
$('detail-zoom').onchange=()=>{resizeDetail();positionDetail();};
$('clip').onchange=changeClip;$('speed').onchange=()=>{stop();render();};$('guides').onchange=render;
$('mirror').onclick=()=>{mirrored=!mirrored;$('mirror').setAttribute('aria-pressed',String(mirrored));render();};
$('frame').oninput=()=>seek(Number($('frame').value));$('previous').onclick=()=>seek(Math.max(0,Number($('frame').value)-1));$('next').onclick=()=>seek(Math.min(selected().frames.length-1,Number($('frame').value)+1));
$('close').onclick=()=>$('detail').close();$('detail').addEventListener('close',()=>{detail=null;stop();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
async function json(url){const r=await fetch(url);if(!r.ok)throw Error('Chargement impossible : '+url);return r.json();}
function busy(value){$('grid').setAttribute('aria-busy',String(value));for(const id of ['play','detail-play','clip','detail-clip'])$(id).disabled=value;}
async function imagePage(directory,page){const image=new Image();image.src=directory+page.file;await image.decode();if(image.naturalWidth!==TEMPLATE.pageSize||image.naturalHeight!==TEMPLATE.pageSize)throw Error('Page native invalide');return image;}
async function changeClip(){
  const token=++clipToken,list=actors,page=frameRect(selected().frames[0].index).page;reset();busy(true);
  try{for(const actor of list){if(actor.images[page])continue;const image=await imagePage(actor.directory,actor.manifest.pages[page]);if(token!==clipToken||list!==actors)return;actor.images=[];actor.images[page]=image;render();}if(token===clipToken&&list===actors)busy(false);}
  catch(error){if(token===clipToken){$('error').textContent=error.message;busy(false);}}
}
const searchKey=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
async function loadPage(){
  const token=++loadToken;++clipToken;
  try{
  stop();actors=[];$('grid').replaceChildren();busy(true);$('error').textContent='';
  const query=searchKey($('search').value),faction=$('faction').value;
  const filtered=library.entries.filter(e=>(!faction||e.faction===faction)&&searchKey(e.name+' '+e.characterId).includes(query));
  pageIndex=Math.min(pageIndex,Math.max(0,Math.ceil(filtered.length/PAGE_SIZE)-1));
  const from=pageIndex*PAGE_SIZE,visible=filtered.slice(from,from+PAGE_SIZE);
  $('page-previous').disabled=pageIndex===0;$('page-next').disabled=from+PAGE_SIZE>=filtered.length;
  $('page-status').textContent=filtered.length?(from+1)+' - '+Math.min(from+PAGE_SIZE,filtered.length)+' / '+filtered.length:'0 / 0';
  $('empty').hidden=visible.length>0;
  for(const entry of visible){
    const manifest=await json(base+entry.manifest),directory=base+entry.manifest.slice(0,entry.manifest.lastIndexOf('/')+1),images=[];
    if(token!==loadToken)return;
    const page=frameRect(selected().frames[0].index).page;images[page]=await imagePage(directory,manifest.pages[page]);if(token!==loadToken)return;
    const article=document.createElement('article'),button=document.createElement('button'),canvas=document.createElement('canvas'),name=document.createElement('h2'),meta=document.createElement('p');
    canvas.width=canvas.height=320;canvas.setAttribute('aria-label',entry.name);button.append(canvas);button.title=entry.name;button.setAttribute('aria-label','Inspecter '+entry.name);
    name.textContent=entry.name;meta.textContent=entry.heightCm+' cm · '+entry.bodyPixels+' px · '+entry.weapon;
    article.append(button,name,meta);$('grid').append(article);const actor={entry,manifest,directory,images,canvas};actors.push(actor);button.onclick=()=>open(actor);
  }
  busy(false);reset();window.lucide?.createIcons();
  $('count').textContent=all?library.entries.length+' / '+library.counts.total+' personnages':library.entries.length+' personnages';
  }catch(error){
    // Only the current search owns the visible loading and error state.
    if(token!==loadToken)return;
    $('error').textContent=error.message;busy(false);
  }
}
function changePage(next){pageIndex=next;void loadPage();}
$('search').oninput=()=>changePage(0);$('faction').onchange=()=>changePage(0);
$('page-previous').onclick=()=>changePage(Math.max(0,pageIndex-1));$('page-next').onclick=()=>changePage(pageIndex+1);
$('catalog-select').value=all?'all':'pilot';$('catalog-select').onchange=()=>{const url=new URL(location.href);url.searchParams.set('catalog',$('catalog-select').value);location.href=url.href;};
try{library=await json(libraryUrl);for(const f of [...new Set(library.entries.map(e=>e.faction).filter(Boolean))].sort())$('faction').add(new Option(f,f));await loadPage();}
catch(error){$('error').textContent=error.message;$('grid').setAttribute('aria-busy','false');}
