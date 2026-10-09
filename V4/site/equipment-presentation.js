(() => {
  'use strict';
  const animations=new Set(),nodes=new Set(),placements=new Map(),motion=matchMedia('(prefers-reduced-motion:reduce)');
  const native=Object.freeze({left:76,top:1103,width:122,height:122,center:{x:137,y:1163.5}});
  // Native glyphs: Calque 43 ATK motif; Calque 46 DEF bounds [696,231,774,310].
  const layouts=Object.freeze({weapon:Object.freeze({left:117,top:221.5,width:86,height:86,center:{x:160,y:264.5}}),shield:Object.freeze({left:692,top:227.5,width:86,height:86,center:{x:735,y:270.5}}),relic:native});
  let previous=new Map(),observer=null,gameId=null,loads=null,detailOverlays=[],detailObserver=null,detailLoads=null;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url=file=>window.KalistarSite?.url('assets/equipment/'+file)||'assets/equipment/'+file;
  const skins=Object.freeze({axe:Object.freeze({body:'fallen-king-axe-v3.webp',rim:'stone-copper-ring-v1.webp'}),flute:Object.freeze({body:'little-joys-flute-v3.webp',rim:'electro-copper-ring-v1.webp'})});
  function skin(w){
    const base=skins[w.visual]||skins.axe,custom=window.KalistarWeapons.weapons.find(item=>item.id===w.id&&item.collectible?.cutout&&item.art===w.art);
    return window.KalistarWeaponArt?.get(w)||(custom?{body:custom.art+'.webp',rim:base.rim}:base);
  }
  const art=w=>w?url(skin(w).body):'';
  function markup(w,{bonus=true}={}){
    const visual=skin(w);
    return `<span class="eq-mechanism" data-kind="${esc(w.kind||w.slot||'weapon')}" data-visual="${esc(w.visual)}" data-music="${w.family==='Instrument'}"${visual.color?` style="--eq-accent:${esc(visual.color)}"`:''} aria-hidden="true"><span class="eq-backplate"></span><img class="eq-body" src="${art(w)}" alt="" draggable="false"><span class="eq-orbit"><img class="eq-rim" src="${url(visual.rim)}" alt="" draggable="false"></span><span class="eq-radar"></span>${bonus?`<span class="eq-tab"><b>+${w.effect.value}</b><small>${w.effect.stat}</small></span>`:''}<span class="eq-reflection"></span></span>`;
  }
  function animate(node,frames,options,signal){
    if(!node||signal?.aborted)return Promise.resolve();
    const animation=node.animate(frames,options);animations.add(animation);
    const abort=()=>animation.cancel();signal?.addEventListener('abort',abort,{once:true});
    return animation.finished.catch(()=>{}).finally(()=>{animations.delete(animation);signal?.removeEventListener('abort',abort);animation.cancel();});
  }
  function notes(node,signal){
    if(motion.matches||!node?.querySelector('[data-music=true]'))return;
    for(let i=0;i<3;i++){
      const note=document.createElement('span');note.className='eq-soft-note';note.textContent=i===1?'\u266a':'\u00b7';note.style.left=(18+i*27)+'%';node.append(note);
      animate(note,[{opacity:0,transform:'translateY(0)'},{opacity:.65,offset:.4},{opacity:0,transform:'translateY(-12px)'}],{duration:600,delay:i*65},signal).then(()=>note.remove());
    }
  }
  async function transition(node,opening,signal){
    const duration=motion.matches?120:opening?640:420;
    if(!opening){await Promise.all([
      animate(node.querySelector('.eq-tab'),[{transform:'scaleY(1)',opacity:1},{transform:'scaleY(0)',opacity:0}],{duration:motion.matches?120:220,fill:'forwards'},signal),
      animate(node.querySelector('.eq-rim'),[{transform:'rotate(0)'},{transform:motion.matches?'rotate(0)':'rotate(-80deg)'}],{duration,easing:'ease-in-out'},signal),
      animate(node,[{opacity:1,offset:0},{opacity:1,offset:.45},{opacity:0}],{duration,fill:'forwards'},signal)]);return;}
    if(motion.matches){await animate(node,[{opacity:0},{opacity:1}],{duration},signal);return;}
    notes(node,signal);
    await Promise.all([
      animate(node,[{opacity:0},{opacity:1}],{duration:200},signal),
      animate(node.querySelector('.eq-rim'),[{transform:'rotate(-110deg)'},{transform:'rotate(0)'}],{duration,easing:'cubic-bezier(.18,.8,.25,1)'},signal),
      animate(node.querySelector('.eq-body'),[{filter:'brightness(.75)'},{filter:'brightness(1.2)',offset:.6},{filter:'brightness(1)'}],{duration},signal),
      animate(node.querySelector('.eq-reflection'),[{opacity:0,transform:'rotate(-60deg)'},{opacity:.6,offset:.5},{opacity:0,transform:'rotate(100deg)'}],{duration},signal),
      animate(node.querySelector('.eq-tab'),[{transform:'scaleY(0)',opacity:0},{transform:'scaleY(1)',opacity:1}],{duration:260,delay:310,easing:'ease-out',fill:'backwards'},signal)]);
  }
  function clearDetail(){
    detailObserver?.disconnect();detailObserver=null;detailLoads?.abort();detailLoads=null;
    for(const node of detailOverlays)node.remove();detailOverlays=[];
  }
  function clearArena(){
    observer?.disconnect();observer=null;placements.clear();loads?.abort();loads=null;
    for(const animation of animations)animation.cancel();animations.clear();for(const node of nodes)node.remove();nodes.clear();
    for(const result of document.querySelectorAll?.('.ritual-result[data-equipment-six]')||[]){delete result.dataset.equipmentSix;result.style.removeProperty('--eq-loop-delay');}
  }
  function capture({reset=false}={}){clearDetail();clearArena();if(reset){previous.clear();gameId=null;}}
  function position(overlay,img,container){
    // Drawn card coordinates stay local, inheriting the challenger's transform once.
    const crop=KalistarCardMedia.crop,n=layouts[overlay.dataset.slot]||native;
    const css=getComputedStyle(img),boxWidth=parseFloat(css.width),boxHeight=parseFloat(css.height),scale=css.objectFit==='contain'?Math.min(boxWidth/crop.width,boxHeight/crop.height):null;
    const width=scale===null?boxWidth:crop.width*scale,height=scale===null?boxHeight:crop.height*scale,left=img.offsetLeft+(boxWidth-width)/2,top=img.offsetTop+(boxHeight-height)/2;
    overlay.style.visibility=img.naturalWidth===crop.width&&img.naturalHeight===crop.height?'visible':'hidden';
    overlay.style.left=(left+(n.left-crop.left)/crop.width*width)+'px';overlay.style.top=(top+(n.top-crop.top)/crop.height*height)+'px';
    overlay.style.width=(n.width/crop.width*width)+'px';overlay.style.height=(n.height/crop.height*height)+'px';overlay.style.setProperty('--eq-font',(width/crop.width*(overlay.dataset.slot==='relic'?28:23))+'px');
  }
  function observe(overlay,img,button){
    placements.set(overlay,[img,button]);
    if(!loads)loads=new AbortController();if(!observer)observer=new ResizeObserver(()=>{for(const [node,args]of placements)position(node,...args);});
    observer.observe(img);observer.observe(button);img.addEventListener('load',()=>position(overlay,img,button),{signal:loads.signal});position(overlay,img,button);
  }
  function createOverlay(w,slot,{bonus=true,delay=-(performance.now()%3600)+'ms',detail=false}={}){
    const overlay=document.createElement('span');overlay.className='eq-overlay is-active'+(detail?' eq-detail-overlay':'');overlay.dataset.weaponId=w.id;overlay.dataset.slot=slot;overlay.innerHTML=markup(w,{bonus});
    overlay.style.setProperty('--eq-loop-delay',delay);overlay.setAttribute('role','img');overlay.setAttribute('aria-label',w.name+' : '+(bonus?'active, +'+w.effect.value+' '+w.effect.stat:'equipement porte'));return overlay;
  }
  function normalize(value){return (Array.isArray(value)?value:value?[value]:[]).map(row=>row.weapon!==undefined?row:{weapon:row,slot:'relic',active:true}).filter(row=>row.weapon&&row.active!==false);}
  function mountDetail(container,value,{bonus=true}={}){
    clearDetail();const img=container?.querySelector(':scope > img'),states=normalize(value);if(!img||!states.length)return;const delay=-(performance.now()%3600)+'ms';
    for(const state of states){const overlay=createOverlay(state.weapon,state.slot||'relic',{bonus,delay,detail:true});detailOverlays.push(overlay);container.append(overlay);}
    const update=()=>detailOverlays.forEach(overlay=>position(overlay,img,container));update();detailLoads=new AbortController();
    img.addEventListener('load',update,{signal:detailLoads.signal});container.closest('dialog')?.addEventListener('close',clearDetail,{signal:detailLoads.signal});detailObserver=new ResizeObserver(update);detailObserver.observe(img);detailObserver.observe(container);
  }
  const key=(uid,slot)=>uid+':'+slot;
  const states=(s,u,engine)=>engine.equipmentViews?engine.equipmentViews(s,u):[{...engine.equipmentView(s,u),slot:'relic'}];
  function syncSix(button,slot,delay,active=true){
    if(slot==='relic')return;const marker=button.querySelector(`.ritual-result[data-face="6"][data-role="${slot==='weapon'?'ATK':'DEF'}"]`);if(!marker)return;
    if(active){marker.dataset.equipmentSix=slot;marker.style.setProperty('--eq-loop-delay',delay);}else{delete marker.dataset.equipmentSix;marker.style.removeProperty('--eq-loop-delay');}
  }
  function mount(s,engine){
    if(!s||s.phase==='over'){capture({reset:true});return;}clearArena();const next=new Map(),fresh=gameId!==s.matchId;gameId=s.matchId;const delay=-(performance.now()%3600)+'ms';loads=new AbortController();
    for(const slot of document.querySelectorAll('.formation .slot[data-unit]')){
      const uid=slot.dataset.unit,u=s.players.flatMap(p=>p.board.filter(Boolean)).find(u=>u.uid===uid);if(!u)continue;const button=slot.querySelector('.slot-card'),img=button?.querySelector('img');if(!img)continue;
      for(const state of states(s,u,engine)){
        const slotKey=state.slot||'relic',k=key(uid,slotKey),old=previous.get(k),active=state.active,w=state.weapon;next.set(k,{active,weapon:w});
        if(active||!fresh&&old?.active){
          const overlay=createOverlay(active?w:old.weapon,slotKey,{delay});if(!active){overlay.classList.remove('is-active');overlay.setAttribute('aria-label',old.weapon.name+' : se replie');}button.append(overlay);nodes.add(overlay);observe(overlay,img,button);syncSix(button,slotKey,delay,active);
          if(active&&!fresh&&(!old?.active||old.weapon?.id!==w.id))transition(overlay,true,loads.signal);
          if(!active)transition(overlay,false,loads.signal).then(()=>{overlay.remove();nodes.delete(overlay);placements.delete(overlay);});
        }
      }
      if(s.equipment?.pending?.[uid]||s.equipment?.defensive?.grants.some(r=>r.recipient===uid&&r.status==='ready')){
        const bonus=engine.equipmentModifier(s,u,'DEF'),host=slot.querySelector('.slot-buffs');if(bonus&&host){const note=document.createElement('span');note.className='eq-pending';note.textContent='+'+bonus.value+' DEF';note.title=bonus.name+(s.equipment.pending?.[uid]?' · prochain duel':' · prochaine défense');host.append(note);nodes.add(note);}
      }
    }previous=next;
  }
  function pulse(source,signal,id){
    const overlay=[...source?.querySelectorAll('.eq-overlay')||[]].find(n=>!id||n.dataset.weaponId===id),mechanism=overlay?.querySelector('.eq-mechanism');
    return animate(mechanism,[{filter:'brightness(1)',transform:'translateY(0)'},{filter:'brightness(1.4)',transform:motion.matches?'none':'translateY(-1.5px)',offset:.35},{filter:'brightness(1)',transform:'translateY(0)'}],{duration:motion.matches?160:340,easing:'ease-out'},signal);
  }
  const unitSlot=uid=>[...document.querySelectorAll('.formation .slot[data-unit]')].find(n=>n.dataset.unit===uid);
  const findOverlay=(slot,id)=>[...slot?.querySelectorAll('.eq-overlay')||[]].find(n=>n.dataset.weaponId===id);
  async function ensureOverlay(slot,w,slotKey,signal){
    let overlay=findOverlay(slot,w.id);if(overlay?.classList.contains('is-active'))return overlay;
    if(overlay){for(const animation of overlay.getAnimations({subtree:true}))animation.cancel();overlay.remove();nodes.delete(overlay);placements.delete(overlay);}
    const button=slot?.querySelector('.slot-card'),img=button?.querySelector('img');if(!img)return null;
    const delay=-(performance.now()%3600)+'ms';overlay=createOverlay(w,slotKey,{delay});button.append(overlay);nodes.add(overlay);observe(overlay,img,button);syncSix(button,slotKey,delay);previous.set(key(slot.dataset.unit,slotKey),{active:true,weapon:w});await transition(overlay,true,signal);return overlay;
  }
  async function useItem(slot,w,slotKey,signal){
    const button=slot?.querySelector('.slot-card');if(!button||signal?.aborted)return;const glow=pulse(slot,signal,w.id);if(motion.matches){await glow;return;}
    const node=document.createElement('span');node.className='eq-use';node.dataset.slot=slotKey;node.dataset.weaponId=w.id;node.setAttribute('aria-hidden','true');const image=document.createElement('img');image.src=art(w);image.alt='';image.draggable=false;node.append(image);button.append(node);nodes.add(node);
    try{await Promise.all([glow,animate(node,[{opacity:0,transform:slotKey==='weapon'?'translate(-8px,5px) rotate(-8deg) scale(.82)':'scale(.88)'},{opacity:.85,transform:'translate(0,0) rotate(0) scale(1)',offset:.35},{opacity:.7,offset:.6},{opacity:0,transform:slotKey==='weapon'?'translate(8px,-4px) rotate(5deg) scale(1.04)':'scale(1.07)'}],{duration:520,easing:'ease-out'},signal)]);}finally{node.remove();nodes.delete(node);}
  }
  async function play({before,after,signal}){
    const d=after.duel;if(!d||signal?.aborted)return;const definitions=after.equipment?.definitions||[],transfers=d.equipmentTransfer&&!before.duel?.equipmentTransfer?[d.equipmentTransfer]:[];
    for(const row of after.equipment?.defensive?.grants||[])if(row.status==='ready'&&row.recipient!==row.sourceUid&&!(before.equipment?.defensive?.grants||[]).some(r=>r.sourceUid===row.sourceUid&&r.recipient===row.recipient)){const w=definitions.find(w=>w.id===row.weaponId);if(w)transfers.push({...row,value:w.effect.value,stat:w.effect.stat});}
    for(const transfer of transfers){
      const source=unitSlot(transfer.sourceUid),target=unitSlot(transfer.recipient),w=definitions.find(w=>w.id===transfer.weaponId);if(!source||!target||!w)continue;const overlay=await ensureOverlay(source,w,'relic',signal);if(!overlay||signal?.aborted)return;
      const start=overlay.getBoundingClientRect(),end=target.querySelector('.slot-card').getBoundingClientRect(),note=document.createElement('span');note.className='eq-transfer';note.textContent=w.family==='Instrument'?'\u266a':'+';note.setAttribute('aria-hidden','true');document.body.append(note);nodes.add(note);note.style.left=(start.left+start.width/2)+'px';note.style.top=(start.top+start.height/2)+'px';
      try{await animate(note,motion.matches?[{opacity:0},{opacity:1},{opacity:0}]:[{opacity:0,transform:'translate(0,0)'},{opacity:.9,offset:.2},{opacity:0,transform:`translate(${end.left+end.width*.5-start.left-start.width*.5}px,${end.top+end.height*.6-start.top-start.height*.5}px)`}],{duration:motion.matches?180:650,easing:'ease-in-out'},signal);}finally{note.remove();nodes.delete(note);}
      if(signal?.aborted)return;await pulse(source,signal,w.id);notes(overlay,signal);const caption=document.createElement('span');caption.className='eq-gift';caption.textContent='+'+transfer.value+' '+transfer.stat;target.querySelector('.slot-card').append(caption);nodes.add(caption);
      try{await animate(caption,[{opacity:0},{opacity:1,offset:.25},{opacity:0}],{duration:motion.matches?180:650},signal);}finally{caption.remove();nodes.delete(caption);}
    }
    // ATK6 awakens only after it is accepted, never during the Kalistel choice.
    for(const part of ['weapon','protection']){const entry=d.equipment?.[part];if(!entry||before.duel?.equipment?.[part]?.weaponId===entry.weaponId)continue;const w=definitions.find(w=>w.id===entry.weaponId);if(w)await ensureOverlay(unitSlot(entry.sourceUid),w,part==='weapon'?'weapon':'shield',signal);}
    const changed=d.formula&&(!before.duel?.formula||d.defenseRolls?.length!==before.duel.defenseRolls?.length);if(!changed||signal?.aborted)return;const reactions=[];
    for(const [part,formula]of [['weapon','equipmentWeapon'],['protection','equipmentProtection']]){const entry=d.equipment?.[part],w=entry&&definitions.find(w=>w.id===entry.weaponId);if(w&&d.formula[formula]>0)reactions.push(useItem(unitSlot(entry.sourceUid),w,part==='weapon'?'weapon':'shield',signal));}
    for(const [part,value]of [['attack',d.formula.equipmentAttack],['defense',d.formula.equipmentDefense]]){const entry=d.equipment?.[part];if(entry&&value>0){const source=unitSlot(entry.sourceUid),w=definitions.find(w=>w.id===entry.weaponId);if(w){await ensureOverlay(source,w,'relic',signal);notes(findOverlay(source,w.id),signal);reactions.push(pulse(source,signal,w.id));}}}
    await Promise.all(reactions);
  }
  window.addEventListener('pagehide',()=>capture({reset:true}));motion.addEventListener('change',()=>{for(const animation of animations)animation.cancel();animations.clear();});
  window.KalistarEquipmentFX={markup,art,capture,mount,mountDetail,clearDetail,play,native,layouts,skins};
})();
