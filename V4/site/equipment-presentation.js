(() => {
  'use strict';
  const animations=new Set(),nodes=new Set(),motion=matchMedia('(prefers-reduced-motion:reduce)');
  const native={left:76,top:1103,width:122,height:122,center:{x:137,y:1163.5}};
  let previous=new Map(),observer=null,gameId=null,loads=null;
  let detailOverlay=null,detailObserver=null,detailLoads=null;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url=file=>window.KalistarSite?.url('assets/equipment/'+file)||'assets/equipment/'+file;
  const skins=Object.freeze({
    axe:Object.freeze({body:'fallen-king-axe-v3.webp',rim:'stone-copper-ring-v1.webp'}),
    flute:Object.freeze({body:'little-joys-flute-v3.webp',rim:'electro-copper-ring-v1.webp'})
  });
  function markup(w,{bonus=true}={}){
    const skin=skins[w.visual];
    return `<span class="eq-mechanism" data-visual="${w.visual}" aria-hidden="true"><span class="eq-backplate"></span><img class="eq-body" src="${url(skin.body)}" alt="" draggable="false"><span class="eq-orbit"><img class="eq-rim" src="${url(skin.rim)}" alt="" draggable="false"></span><span class="eq-radar"></span>${bonus?`<span class="eq-tab"><b>+${w.effect.value}</b><small>${w.effect.stat}</small></span>`:''}<span class="eq-reflection"></span></span>`;
  }
  function animate(node,frames,options,signal){
    if(!node||signal?.aborted)return Promise.resolve();
    const animation=node.animate(frames,options);animations.add(animation);
    const abort=()=>animation.cancel();signal?.addEventListener('abort',abort,{once:true});
    return animation.finished.catch(()=>{}).finally(()=>{animations.delete(animation);signal?.removeEventListener('abort',abort);});
  }
  function transition(node,opening){
    const duration=motion.matches?120:opening?640:420;
    if(!opening)return Promise.all([
      animate(node.querySelector('.eq-tab'),[{transform:'scaleY(1)',opacity:1},{transform:'scaleY(0)',opacity:0}],{duration:motion.matches?120:220,fill:'forwards'}),
      animate(node.querySelector('.eq-rim'),[{transform:'rotate(0)'},{transform:motion.matches?'rotate(0)':'rotate(-80deg)'}],{duration,easing:'ease-in-out'}),
      animate(node,[{opacity:1,offset:0},{opacity:1,offset:.45},{opacity:0}],{duration,fill:'forwards'})]);
    animate(node,[{opacity:0},{opacity:1}],{duration:motion.matches?120:200});
    if(motion.matches)return Promise.resolve();
    animate(node.querySelector('.eq-rim'),[{transform:'rotate(-110deg)'},{transform:'rotate(0)'}],{duration,easing:'cubic-bezier(.18,.8,.25,1)'});
    animate(node.querySelector('.eq-body'),[{filter:'brightness(.75)'},{filter:'brightness(1.2)',offset:.6},{filter:'brightness(1)'}],{duration});
    animate(node.querySelector('.eq-reflection'),[{opacity:0,transform:'rotate(-60deg)'},{opacity:.6,offset:.5},{opacity:0,transform:'rotate(100deg)'}],{duration});
    if(node.querySelector('[data-visual=flute]'))for(let i=0;i<3;i++){
      const note=document.createElement('span');note.className='eq-soft-note';note.textContent=i===1?'\u266a':'\u00b7';note.style.left=(18+i*27)+'%';node.append(note);
      animate(note,[{opacity:0,transform:'translateY(0)'},{opacity:.65,offset:.4},{opacity:0,transform:'translateY(-12px)'}],{duration:600,delay:i*65}).then(()=>note.remove());
    }
    return animate(node.querySelector('.eq-tab'),[{transform:'scaleY(0)',opacity:0},{transform:'scaleY(1)',opacity:1}],{duration:260,delay:310,easing:'ease-out',fill:'backwards'});
  }
  function capture({reset=false}={}){
    clearDetail();
    observer?.disconnect();observer=null;
    loads?.abort();loads=null;
    for(const animation of animations)animation.cancel();animations.clear();
    for(const node of nodes)node.remove();nodes.clear();
    if(reset){previous.clear();gameId=null;}
  }
  function position(overlay,img,container){
    // Contained popup images can be letterboxed: anchor to the drawn card, not its CSS box.
    const crop=KalistarCardMedia.crop;
    const css=getComputedStyle(img),boxWidth=parseFloat(css.width),boxHeight=parseFloat(css.height);
    const scale=css.objectFit==='contain'?Math.min(boxWidth/crop.width,boxHeight/crop.height):null;
    const width=scale===null?boxWidth:crop.width*scale,height=scale===null?boxHeight:crop.height*scale;
    const left=img.offsetLeft+(boxWidth-width)/2,top=img.offsetTop+(boxHeight-height)/2;
    overlay.style.visibility=img.naturalWidth===crop.width&&img.naturalHeight===crop.height?'visible':'hidden';
    overlay.style.left=(left+(native.left-crop.left)/crop.width*width)+'px';
    overlay.style.top=(top+(native.top-crop.top)/crop.height*height)+'px';
    overlay.style.width=(native.width/crop.width*width)+'px';
    overlay.style.height=(native.height/crop.height*height)+'px';
    overlay.style.setProperty('--eq-font',(width/crop.width*28)+'px');
  }
  function clearDetail(){
    detailObserver?.disconnect();detailObserver=null;
    detailLoads?.abort();detailLoads=null;
    detailOverlay?.remove();detailOverlay=null;
  }
  function mountDetail(container,w,{bonus=true}={}){
    clearDetail();
    const img=container?.querySelector(':scope > img');if(!img||!w)return;
    const overlay=document.createElement('span');detailOverlay=overlay;
    overlay.className='eq-overlay eq-detail-overlay is-active';overlay.dataset.weaponId=w.id;
    overlay.innerHTML=markup(w,{bonus});
    overlay.style.setProperty('--eq-loop-delay',-(performance.now()%3600)+'ms');
    overlay.setAttribute('role','img');
    overlay.setAttribute('aria-label',w.name+' : '+(bonus?'active, +'+w.effect.value+' '+w.effect.stat:'arme equipee'));
    container.append(overlay);
    const update=()=>position(overlay,img,container);update();
    detailLoads=new AbortController();
    img.addEventListener('load',update,{signal:detailLoads.signal});
    container.closest('dialog')?.addEventListener('close',clearDetail,{signal:detailLoads.signal});
    detailObserver=new ResizeObserver(update);detailObserver.observe(img);detailObserver.observe(container);
  }
  function mount(s,engine){
    if(!s||s.phase==='over'){capture({reset:true});return;}
    const next=new Map(),fresh=gameId!==s.matchId;gameId=s.matchId;
    const placements=[];loads=new AbortController();
    for(const slot of document.querySelectorAll('.formation .slot[data-unit]')){
      const uid=slot.dataset.unit,u=s.players.flatMap(p=>p.board.filter(Boolean)).find(u=>u.uid===uid);if(!u)continue;
      const state=engine.equipmentView(s,u),old=previous.get(uid),active=state.active,w=state.weapon;
      next.set(uid,{active,weapon:w});
      const button=slot.querySelector('.slot-card'),img=button.querySelector('img');if(!img)continue;
      if(active||!fresh&&old?.active){
        const overlay=document.createElement('span');overlay.className='eq-overlay'+(active?' is-active':'');overlay.innerHTML=markup(active?w:old.weapon);
        overlay.style.setProperty('--eq-loop-delay',-(performance.now()%3600)+'ms');
        overlay.setAttribute('role','img');overlay.setAttribute('aria-label',`${(active?w:old.weapon).name} : ${active?'active':'se replie'}, +${(active?w:old.weapon).effect.value} ${(active?w:old.weapon).effect.stat}`);
        button.append(overlay);nodes.add(overlay);placements.push([overlay,img,button]);position(overlay,img,button);
        img.addEventListener('load',()=>position(overlay,img,button),{signal:loads.signal});
        if(active&&!fresh&&!old?.active)transition(overlay,true);
        if(!active)transition(overlay,false).then(()=>{overlay.remove();nodes.delete(overlay);});
      }
      if(s.equipment?.pending[uid]){
        const bonus=engine.equipmentModifier(s,u,'DEF');
        if(bonus){const note=document.createElement('span');note.className='eq-pending';note.textContent='+'+bonus.value+' DEF';note.title=bonus.name+' · prochain duel';slot.querySelector('.slot-buffs').append(note);nodes.add(note);}
      }
    }
    previous=next;
    if(placements.length){observer=new ResizeObserver(()=>placements.forEach(args=>position(...args)));for(const [,img,button]of placements){observer.observe(button);observer.observe(img);}}
  }
  function pulse(source,signal){
    const mechanism=source?.querySelector('.eq-mechanism');if(!mechanism)return Promise.resolve();
    return animate(mechanism,[{filter:'brightness(1)',transform:'translateY(0)'},{filter:'brightness(1.5)',transform:motion.matches?'none':'translateY(-1.5px)',offset:.35},{filter:'brightness(1)',transform:'translateY(0)'}],{duration:motion.matches?160:340,easing:'ease-out'},signal);
  }
  async function play({before,after,signal}){
    const d=after.duel;if(!d||signal?.aborted)return;
    const transfer=d.equipmentTransfer&&!before.duel?.equipmentTransfer?d.equipmentTransfer:null;
    if(transfer){
      const source=document.querySelector(`.slot[data-unit="${transfer.sourceUid}"]`),target=document.querySelector(`.slot[data-unit="${transfer.recipient}"]`),w=after.equipment.definitions.find(w=>w.id===transfer.weaponId);
      if(!source||!target)return;
      previous.set(transfer.sourceUid,{active:true,weapon:w});
      let overlay=source.querySelector('.eq-overlay');
      if(!overlay){overlay=document.createElement('span');overlay.className='eq-overlay is-active';overlay.style.setProperty('--eq-loop-delay',-(performance.now()%3600)+'ms');overlay.innerHTML=markup(w);source.querySelector('.slot-card').append(overlay);nodes.add(overlay);position(overlay,source.querySelector('.slot-card img'),source.querySelector('.slot-card'));transition(overlay,true);}
      const start=overlay.getBoundingClientRect(),end=target.querySelector('.slot-card').getBoundingClientRect();
      const note=document.createElement('span');note.className='eq-transfer';note.textContent='\u266a';note.setAttribute('aria-hidden','true');document.body.append(note);nodes.add(note);
      note.style.left=(start.left+start.width/2)+'px';note.style.top=(start.top+start.height/2)+'px';
      await animate(note,motion.matches?[{opacity:0},{opacity:1},{opacity:0}]:[{opacity:0,transform:'translate(0,0)'},{opacity:.9,offset:.2},{opacity:0,transform:`translate(${end.left+end.width*.5-start.left-start.width*.5}px,${end.top+end.height*.6-start.top-start.height*.5}px)`}],{duration:motion.matches?180:650,easing:'ease-in-out'},signal);
      note.remove();nodes.delete(note);await pulse(source,signal);
      const caption=document.createElement('span');caption.className='eq-gift';caption.textContent='+'+transfer.value+' '+transfer.stat;target.querySelector('.slot-card').append(caption);nodes.add(caption);
      await animate(caption,[{opacity:0},{opacity:1,offset:.25},{opacity:0}],{duration:motion.matches?180:650},signal);caption.remove();nodes.delete(caption);
    }
    if(d.formula&&!before.duel?.formula)for(const [part,value] of [['attack',d.formula.equipmentAttack],['defense',d.formula.equipmentDefense]])if(value){
      const e=d.equipment[part];await pulse(document.querySelector(`.slot[data-unit="${e.sourceUid}"]`),signal);
    }
  }
  window.addEventListener('pagehide',()=>capture({reset:true}));
  motion.addEventListener('change',()=>{for(const animation of animations)animation.cancel();animations.clear();});
  window.KalistarEquipmentFX={markup,capture,mount,mountDetail,clearDetail,play,native,skins};
})();
