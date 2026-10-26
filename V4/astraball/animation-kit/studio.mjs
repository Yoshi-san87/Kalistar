import {TEMPLATE,CLIPS,createDraft,frameAt,bodyHeight} from './template-v2.mjs';
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d');
const motion=new Image(),poses=new Image();motion.src='/data/kaylis-motion-01.png';poses.src='/data/kaylis-keyposes-01.png';
let entries=[],selected=null,playing=false,start=0,elapsed=0,raf=null,mirrored=false;
const names=['Repos','Course','Saut','Victoire','Pousser','Se baisser','Blocage','Impact','Chute','Relevé','Lancer','Estoc : préparation','Estoc : extension','Magie : préparation','Magie : libération','Mort'];
for(const [id,c] of Object.entries(CLIPS))$('clip').add(new Option(c.label,id));
for(const [i,name] of names.entries())$('pose').add(new Option(name,i));
function stop(){playing=false;cancelAnimationFrame(raf);raf=null;$('play').innerHTML='<i data-lucide="play"></i>';$('play').setAttribute('aria-label','Lire');$('play').title='Lire';window.lucide?.createIcons();}
function display(){
  const zoom=Number($('zoom').value),view=$('view').value;
  canvas.width=canvas.height=320*zoom;canvas.style.width=canvas.style.height=(320*zoom)+'px';ctx.imageSmoothingEnabled=false;
  ctx.scale(zoom,zoom);ctx.fillStyle='#27312f';ctx.fillRect(0,0,320,320);
  ctx.fillStyle='#2d3835';for(let y=0;y<320;y+=16)for(let x=0;x<320;x+=16)if((x+y)%32===0)ctx.fillRect(x,y,16,16);
  const clip=CLIPS[$('clip').value];
  canvas.dataset.studyFrame='';
  let index=clip.frames[Number($('frame').value)]?.index??0;
  if(view==='poses')index=Number($('pose').value);
  const image=view==='motion'?motion:poses;
  if((view==='poses'||view==='motion'&&['idle','run','jump'].includes(clip.id))&&image.complete&&image.naturalWidth){
    // Untouched study pixels. Exact integer crops only, never optical recentering.
    const local=index%16,x=Math.floor(local%4*image.naturalWidth/4),y=Math.floor(Math.floor(local/4)*image.naturalHeight/4);
    const w=Math.floor((local%4+1)*image.naturalWidth/4)-x,h=Math.floor((Math.floor(local/4)+1)*image.naturalHeight/4)-y;
    ctx.save();if(mirrored){ctx.translate(320,0);ctx.scale(-1,1);}ctx.drawImage(image,x,y,w,h,0,0,w,h);ctx.restore();
    canvas.dataset.studyFrame=String(index);
  }
  if($('guides').checked){
    ctx.lineWidth=1;ctx.strokeStyle='#79cdb6';ctx.beginPath();ctx.moveTo(0,272.5);ctx.lineTo(320,272.5);ctx.stroke();
    ctx.strokeStyle='#77958b';ctx.beginPath();ctx.moveTo(160.5,0);ctx.lineTo(160.5,320);ctx.stroke();
    const h=bodyHeight(selected?.heightCm||164);ctx.strokeStyle='#e5c88b';ctx.strokeRect(112.5,272-h+.5,96,h);
    ctx.fillStyle='#f4d37d';ctx.fillRect(156,271,9,3);ctx.fillRect(159,268,3,9);
  }
  $('counter').value=(Number($('frame').value)+1)+' / '+clip.frames.length;
  $('body').textContent='Cible anatomique : '+(selected?.bodyPixels||105)+' px';
}
function updateClip(){
  stop();const c=CLIPS[$('clip').value];$('frame').max=c.frames.length-1;$('frame').value=0;
  $('duration').textContent=c.frames.length+' frames · '+c.frames.reduce((n,f)=>n+f.durationMs,0)+' ms';
  $('loop').textContent=c.loop?'Boucle':'Dernier dessin maintenu';
  const available=$('view').value==='motion'&&['idle','run','jump'].includes(c.id);
  $('play').disabled=!available;$('previous').disabled=$('next').disabled=$('frame').disabled=$('view').value==='poses';
  $('status').textContent=$('view').value==='template'?'Gabarit':available?'Étude hors gabarit':$('view').value==='poses'?'Poses clés hors gabarit':'Animation à produire';
  $('poses').hidden=$('view').value!=='poses';display();
}
function select(){selected=entries.find(e=>e.id===$('actor').value)||entries[0];if(!selected)return;
  if(selected.characterId!=='kaylis')$('view').value='template';
  for(const option of $('view').options)option.disabled=option.value!=='template'&&selected.characterId!=='kaylis';
  $('height').textContent=selected.heightCm+' cm';$('weapon').textContent=selected.weapon;$('family').textContent=selected.physicalFamily;updateClip();}
function filter(){const query=$('search').value.toLocaleLowerCase('fr');$('actor').replaceChildren();
  for(const e of entries.filter(e=>(e.name+' '+e.characterId+' '+e.modelId).toLocaleLowerCase('fr').includes(query)))$('actor').add(new Option(e.name+' · '+e.modelId,e.id));
  if(selected&&[...$('actor').options].some(o=>o.value===selected.id))$('actor').value=selected.id;select();}
function tick(now){if(!playing||document.hidden)return;elapsed=now-start;const clip=CLIPS[$('clip').value],index=frameAt(clip,elapsed);
  $('frame').value=clip.frames.findIndex(f=>f.index===index);display();
  if(!clip.loop&&elapsed>=clip.frames.reduce((n,f)=>n+f.durationMs,0)){stop();return;}raf=requestAnimationFrame(tick);}
$('play').onclick=()=>{if(playing)return stop();playing=true;start=performance.now();$('play').innerHTML='<i data-lucide="pause"></i>';$('play').title='Pause';$('play').setAttribute('aria-label','Pause');window.lucide?.createIcons();raf=requestAnimationFrame(tick);};
$('next').onclick=()=>{stop();$('frame').value=Math.min(Number($('frame').max),Number($('frame').value)+1);display();};
$('previous').onclick=()=>{stop();$('frame').value=Math.max(0,Number($('frame').value)-1);display();};
$('frame').oninput=()=>{stop();display();};$('clip').onchange=updateClip;$('view').onchange=updateClip;$('pose').onchange=display;
$('zoom').onchange=display;$('guides').onchange=display;$('mirror').onclick=()=>{mirrored=!mirrored;$('mirror').setAttribute('aria-pressed',String(mirrored));display();};
$('actor').onchange=select;$('search').oninput=filter;
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
$('download').onclick=()=>{if(!selected)return;const actor=createDraft(selected),url=URL.createObjectURL(new Blob([JSON.stringify(actor,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=actor.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
motion.onload=poses.onload=display;
motion.onerror=poses.onerror=()=>{$('error').textContent='Source de travail indisponible';};
try{const r=await fetch('/data/inventory.json');if(!r.ok)throw Error('Inventaire absent');entries=(await r.json()).entries;selected=entries.find(e=>e.characterId==='kaylis');filter();$('coverage').textContent=entries.length+' modèles · aucun migré';}catch(e){$('error').textContent=e.message;}
const params=new URLSearchParams(location.search);
if(selected?.characterId==='kaylis'&&['motion','poses'].includes(params.get('view')))$('view').value=params.get('view');
if(Object.hasOwn(CLIPS,params.get('clip')))$('clip').value=params.get('clip');
updateClip();window.lucide?.createIcons();
