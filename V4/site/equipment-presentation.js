(() => {
  'use strict';
  const animations=new Set(),nodes=new Set(),placements=new Map(),motion=matchMedia('(prefers-reduced-motion:reduce)');
  const native=Object.freeze({left:76,top:1103,width:122,height:122,center:{x:137,y:1163.5}});
  // Native glyphs: Calque 43 ATK motif; Calque 46 DEF bounds [696,231,774,310].
  const layouts=Object.freeze({weapon:Object.freeze({left:117,top:221.5,width:86,height:86,center:{x:160,y:264.5}}),shield:Object.freeze({left:692,top:227.5,width:86,height:86,center:{x:735,y:270.5}}),relic:native});
  const arenaLayouts=Object.freeze(Object.fromEntries(Object.entries(layouts).map(([slot,n])=>[slot,slot==='relic'?n:Object.freeze({...n,left:n.center.x-53,top:n.center.y-53,width:106,height:106})])));
  let previous=new Map(),observer=null,gameId=null,loads=null,detailOverlays=[],detailObserver=null,detailLoads=null,eventController=null;
  const described=new Map();
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url=file=>window.KalistarSite?.url('assets/equipment/'+file)||'assets/equipment/'+file;
  const skins=Object.freeze({axe:Object.freeze({body:'fallen-king-axe-v3.webp',rim:'stone-copper-ring-v1.webp'}),flute:Object.freeze({body:'little-joys-flute-v3.webp',rim:'electro-copper-ring-v1.webp'})});
  function skin(w){
    const base=skins[w.visual]||skins.axe,custom=window.KalistarWeapons.weapons.find(item=>item.id===w.id&&item.collectible?.cutout&&item.art===w.art);
    return window.KalistarWeaponArt?.get(w)||(custom?{body:custom.art+'.webp',rim:base.rim}:base);
  }
  const art=w=>w?url(skin(w).body):'';
  const ultimate=w=>['OUTNUMBERED_GIFT','TACTICAL_REPRISAL','ULTIMATE'].includes(w?.effect.trigger);
  const traitLabel=trait=>({luck:'Tr\u00e8fles alli\u00e9s',reraise:'Reraise'}[trait]||'');
  const effectLabel=w=>w.effect.trigger==='ULTIMATE'?(window.KalistarUltimateUI?.presentation(w).label||'Ultime'):traitLabel(w.effect.trait)||(Number.isFinite(w.effect.value)&&w.effect.stat?'+'+w.effect.value+' '+w.effect.stat:'');
  // Spending the Pod charge does not end its bonus in the accepted duel.
  const riposting=state=>state.weapon?.effect.trigger==='TACTICAL_REPRISAL'&&state.status==='spent'&&state.active&&!state.ready;
  const used=state=>state.weapon?.effect.trigger==='ULTIMATE'&&state.status==='spent'&&state.active;
  const relicState=state=>riposting(state)||used(state)?'active':['spent','invalidated','lost'].includes(state.status)?'spent':state.status==='choice'?'choice':state.targetUid?'mark':state.ready?'ready':state.active?'active':'dormant';
  const stateLabel=state=>riposting(state)?'Riposte active':used(state)?'Effet actif':state.status==='lost'?'Cible perdue':({spent:'\u00c9puis\u00e9e',choice:'Choix en attente',mark:'Cible marqu\u00e9e',ready:'\u00c9veill\u00e9e',active:'Active',dormant:'En veille'}[relicState(state)]);
  function markup(w,{bonus=true}={}){
    const visual=skin(w);
    const tab=w.effect.trigger==='ULTIMATE'?'<b>\u2726</b>':w.effect.trait?`<b>${w.effect.trait==='luck'?'\u2618':'\u2665'}</b>`:Number.isFinite(w.effect.value)?`<b>+${w.effect.value}</b><small>${esc(w.effect.stat)}</small>`:'';
    return `<span class="eq-mechanism" data-kind="${esc(w.kind||w.slot||'weapon')}" data-visual="${esc(w.visual)}" data-music="${w.family==='Instrument'}"${visual.color?` style="--eq-accent:${esc(visual.color)}"`:''} aria-hidden="true"><span class="eq-backplate"></span><img class="eq-body" src="${art(w)}" alt="" draggable="false"><span class="eq-orbit"><img class="eq-rim" src="${url(visual.rim)}" alt="" draggable="false"></span><span class="eq-radar"></span>${bonus&&tab?`<span class="eq-tab">${tab}</span>`:''}<span class="eq-reflection"></span></span>`;
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
    const duration=motion.matches?120:opening?640:420,persistent=node.dataset.arena==='true'&&node.dataset.slot!=='relic';
    if(persistent&&!opening){await Promise.all([
      animate(node.querySelector('.eq-rim'),motion.matches?[{opacity:.8},{opacity:1}]:[{transform:'rotate(0)'},{transform:'rotate(-25deg)',offset:.65},{transform:'rotate(0)'}],{duration,easing:'ease-in-out'},signal),
      animate(node.querySelector('.eq-radar'),[{opacity:.72},{opacity:0}],{duration},signal)]);return;}
    if(!opening){await Promise.all([
      animate(node.querySelector('.eq-tab'),[{transform:'scaleY(1)',opacity:1},{transform:'scaleY(0)',opacity:0}],{duration:motion.matches?120:220,fill:'forwards'},signal),
      animate(node.querySelector('.eq-rim'),[{transform:'rotate(0)'},{transform:motion.matches?'rotate(0)':'rotate(-80deg)'}],{duration,easing:'ease-in-out'},signal),
      animate(node,[{opacity:1,offset:0},{opacity:1,offset:.45},{opacity:0}],{duration,fill:'forwards'},signal)]);return;}
    if(motion.matches){await animate(node,[{opacity:persistent?0.8:0},{opacity:1}],{duration},signal);return;}
    notes(node,signal);
    await Promise.all([
      animate(node,[{opacity:persistent?1:0},{opacity:1}],{duration:200},signal),
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
    eventController?.abort();eventController=null;
    observer?.disconnect();observer=null;placements.clear();loads?.abort();loads=null;
    for(const [button,value]of described){if(value===null)button.removeAttribute('aria-describedby');else button.setAttribute('aria-describedby',value);}described.clear();
    for(const animation of animations)animation.cancel();animations.clear();for(const node of nodes)node.remove();nodes.clear();
    for(const result of document.querySelectorAll?.('.ritual-result[data-equipment-six]')||[]){delete result.dataset.equipmentSix;result.style.removeProperty('--eq-loop-delay');}
  }
  function capture({reset=false}={}){clearDetail();clearArena();if(reset){previous.clear();gameId=null;}}
  function position(overlay,img,container){
    // Drawn card coordinates stay local, inheriting the challenger's transform once.
    const crop=KalistarCardMedia.crop,n=(overlay.dataset.arena==='true'?arenaLayouts:layouts)[overlay.dataset.slot]||native;
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
  function label(w,active,arena,bonus,state={}){
    if(ultimate(w)){const view={...state,weapon:w,active};return w.name+' : equipement porte, '+(arena?stateLabel(view)+', ':'')+effectLabel(w)+(state.targetUid&&relicState(view)==='mark'?' ; cible '+state.targetUid:'');}
    return w.name+' : '+(arena?'equipement porte, '+(active?'actif, '+effectLabel(w):'inactif, bonus de '+effectLabel(w)+' non applique'):bonus?'active, '+effectLabel(w):'equipement porte');
  }
  function createOverlay(w,slot,{bonus=true,delay=-(performance.now()%3600)+'ms',detail=false,active=true,arena=false,...state}={}){
    const view={...state,weapon:w,active},awakened=(active||state.ready)&&(!ultimate(w)||relicState(view)!=='spent'),overlay=document.createElement('span');overlay.className='eq-overlay'+(awakened?' is-active':'')+(detail?' eq-detail-overlay':'');overlay.dataset.weaponId=w.id;overlay.dataset.slot=slot;overlay.dataset.arena=String(arena);overlay.innerHTML=markup(w,{bonus:bonus&&!(arena&&(slot!=='relic'||ultimate(w)))});
    if(ultimate(w)&&arena){overlay.dataset.relicState=relicState(view);overlay.innerHTML+=`<span class="eq-relic-seal" aria-hidden="true">${{spent:'\u2713',mark:'\u2316',ready:'\u2726',choice:'\u2665',active:'\u2726',dormant:'\u00b7'}[overlay.dataset.relicState]}</span>`;}
    overlay.style.setProperty('--eq-loop-delay',delay);overlay.setAttribute('role','img');overlay.setAttribute('aria-label',label(w,active,arena,bonus,state));return overlay;
  }
  function normalize(value,arena){return (Array.isArray(value)?value:value?[value]:[]).map(row=>row.weapon!==undefined?row:{weapon:row,slot:'relic',active:true}).filter(row=>row.weapon&&(arena&&ultimate(row.weapon)?relicState(row)!=='spent'&&(row.active||row.ready):row.active!==false||row.ready||arena&&['weapon','shield'].includes(row.slot)));}
  function mountDetail(container,value,{bonus=true,arena=false}={}){
    clearDetail();const img=container?.querySelector(':scope > img'),states=normalize(value,arena);if(!img||!states.length)return;const delay=-(performance.now()%3600)+'ms';
    for(const state of states){const overlay=createOverlay(state.weapon,state.slot||'relic',{...state,bonus,delay,detail:true,active:state.active!==false,arena});detailOverlays.push(overlay);container.append(overlay);}
    const update=()=>detailOverlays.forEach(overlay=>position(overlay,img,container));update();detailLoads=new AbortController();
    img.addEventListener('load',update,{signal:detailLoads.signal});container.closest('dialog')?.addEventListener('close',clearDetail,{signal:detailLoads.signal});detailObserver=new ResizeObserver(update);detailObserver.observe(img);detailObserver.observe(container);
  }
  const key=(uid,slot)=>uid+':'+slot;
  const states=(s,u,engine)=>engine.equipmentViews?engine.equipmentViews(s,u):[{...engine.equipmentView(s,u),slot:'relic'}];
  function syncSix(button,slot,delay,active=true){
    if(slot==='relic')return;const marker=button.querySelector(`.ritual-result[data-face="6"][data-role="${slot==='weapon'?'ATK':'DEF'}"]`);if(!marker)return;
    if(active){marker.dataset.equipmentSix=slot;marker.style.setProperty('--eq-loop-delay',delay);}else{delete marker.dataset.equipmentSix;marker.style.removeProperty('--eq-loop-delay');}
  }
  function statusBadge(slot,text,description,kind,uid){
    const host=slot?.querySelector('.slot-buffs'),button=slot?.querySelector('.slot-card');if(!host||!button)return;
    const note=document.createElement('span');note.className='eq-relic-status';note.dataset.state=kind;note.textContent=text;note.title=description;note.id='eq-status-'+uid+'-'+nodes.size;note.setAttribute('aria-label',description);host.append(note);nodes.add(note);
    if(!described.has(button))described.set(button,button.getAttribute('aria-describedby'));
    button.setAttribute('aria-describedby',[button.getAttribute('aria-describedby'),note.id].filter(Boolean).join(' '));
  }
  function mount(s,engine){
    if(!s?.players||!engine){capture({reset:true});return;}clearArena();const ended=s.phase==='over',next=new Map(),fresh=ended||gameId!==s.matchId;gameId=s.matchId;const delay=-(performance.now()%3600)+'ms';loads=new AbortController();
    for(const slot of document.querySelectorAll('.formation .slot[data-unit]')){
      const uid=slot.dataset.unit,u=s.players.flatMap(p=>p.board.filter(Boolean)).find(u=>u.uid===uid);if(!u)continue;const button=slot.querySelector('.slot-card'),img=button?.querySelector('img');if(!img)continue;
      for(const state of states(s,u,engine)){
        const slotKey=state.slot||'relic',k=key(uid,slotKey),old=previous.get(k),w=state.weapon,active=!ended&&(state.active||state.ready)&&(!ultimate(w)||relicState(state)!=='spent');next.set(k,{active,weapon:w});
        const persistent=w&&slotKey!=='relic';
        if(persistent||active||!fresh&&old?.active&&!ultimate(w||old.weapon)){
          const overlay=createOverlay(w||old.weapon,slotKey,{...state,delay,active:!ended&&state.active,ready:!ended&&state.ready,arena:true});button.append(overlay);nodes.add(overlay);observe(overlay,img,button);syncSix(button,slotKey,delay,active);
          if(active&&!fresh&&(!old?.active||old.weapon?.id!==w.id))transition(overlay,true,loads.signal);
          if(!active&&!fresh&&old?.active)transition(overlay,false,loads.signal).then(()=>{if(!persistent){overlay.remove();nodes.delete(overlay);placements.delete(overlay);}});
        }
        if(!ended&&ultimate(w)){
          const target=relicState(state)==='mark'&&state.targetUid&&s.players.flatMap(p=>p.board.filter(Boolean)).find(u=>u.uid===state.targetUid),name=target?engine.card(target).name:null;
          const progress=typeof state.progress==='number'&&state.progress>0&&!['spent','active','mark','ready'].includes(relicState(state))?' \u00b7 '+state.progress:'';
          statusBadge(slot,stateLabel(state)+progress,w.name+' : '+stateLabel(state)+progress+(name?' ; '+name+' ; '+effectLabel(w):''),relicState(state),uid);
          if(target&&relicState(state)==='mark'){
            const enemy=unitSlot(target.uid),card=enemy?.querySelector('.slot-card');
            if(card){const mark=document.createElement('span');mark.className='eq-target-mark';mark.dataset.sourceUid=uid;mark.dataset.targetUid=target.uid;mark.setAttribute('aria-hidden','true');card.append(mark);nodes.add(mark);}
            statusBadge(enemy,'\u2316',w.name+' : cible suivie par '+engine.card(u).name,'mark',uid);
          }
        }
      }
      if(!ended&&(s.equipment?.pending?.[uid]||s.equipment?.defensive?.grants.some(r=>r.recipient===uid&&r.status==='ready'))){
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
    const button=slot?.querySelector('.slot-card'),img=button?.querySelector('img');if(!img)return null;
    const delay=-(performance.now()%3600)+'ms';
    if(overlay){for(const animation of overlay.getAnimations({subtree:true}))animation.cancel();overlay.classList.add('is-active');overlay.style.setProperty('--eq-loop-delay',delay);overlay.setAttribute('aria-label',label(w,true,true,true));}
    else{overlay=createOverlay(w,slotKey,{delay,arena:true});button.append(overlay);nodes.add(overlay);observe(overlay,img,button);}
    syncSix(button,slotKey,delay);previous.set(key(slot.dataset.unit,slotKey),{active:true,weapon:w});await transition(overlay,true,signal);return overlay;
  }
  async function useItem(slot,w,slotKey,signal){
    const button=slot?.querySelector('.slot-card');if(!button||signal?.aborted)return;const glow=pulse(slot,signal,w.id);if(motion.matches){await glow;return;}
    const node=document.createElement('span');node.className='eq-use';node.dataset.slot=slotKey;node.dataset.weaponId=w.id;node.setAttribute('aria-hidden','true');const image=document.createElement('img');image.src=art(w);image.alt='';image.draggable=false;node.append(image);button.append(node);nodes.add(node);
    try{await Promise.all([glow,animate(node,[{opacity:0,transform:slotKey==='weapon'?'translate(-8px,5px) rotate(-8deg) scale(.82)':'scale(.88)'},{opacity:.85,transform:'translate(0,0) rotate(0) scale(1)',offset:.35},{opacity:.7,offset:.6},{opacity:0,transform:slotKey==='weapon'?'translate(8px,-4px) rotate(5deg) scale(1.04)':'scale(1.07)'}],{duration:520,easing:'ease-out'},signal)]);}finally{node.remove();nodes.delete(node);}
  }
  function newRelicEvents(before,after){
    if(!before||!after||before.matchId!==after.matchId)return [];
    const sameDuel=before.round===after.round&&before.duel?.attacker===after.duel?.attacker&&before.duel?.target===after.duel?.target;
    const signature=e=>JSON.stringify([e.kind,e.weaponId,e.sourceUid,e.recipient,e.targetUid]),seen=new Map();
    for(const e of sameDuel?before.duel?.relicEvents||[]:[]){const k=signature(e);seen.set(k,(seen.get(k)||0)+1);}
    const legacy=(after.duel?.relicEvents||[]).filter(e=>{
      const k=signature(e),count=seen.get(k)||0;if(count){seen.set(k,count-1);return false;}
      return ['luck','reraise','mark','riposte','sacrifice'].includes(e.kind);
    });
    return legacy.concat(window.KalistarUltimateUI?.newEvents(before,after)||[]);
  }
  const eventLabel=e=>({luck:'Tr\u00e8fle re\u00e7u',reraise:'Reraise re\u00e7u',mark:'Cible marqu\u00e9e',riposte:'Riposte',sacrifice:'Dernier don'}[e.kind]||window.KalistarUltimateUI?.eventLabel(e)||'Effet de relique');
  async function playRelicEvents(before,after,signal){
    const groups=new Map();
    for(const e of newRelicEvents(before,after)){
      const k=e.weaponId+':'+e.sourceUid+':'+e.kind;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e);
    }
    for(const events of groups.values()){
      if(signal.aborted)return;const first=events[0],w=(after.equipment?.definitions||[]).find(w=>w.id===first.weaponId);if(!w)continue;
      const source=unitSlot(first.sourceUid),anchor=source?.querySelector('.slot-card')||document.querySelector('.duel-status');if(!anchor)continue;
      if(w.effect.trigger==='ULTIMATE'&&['ready','grant','bonus','mark'].includes(first.kind)){await ensureOverlay(source,w,'relic',signal);if(signal.aborted)return;}
      const bounds=anchor.getBoundingClientRect(),emblem=document.createElement('span');emblem.className='eq-relic-emblem';emblem.dataset.kind=first.kind;emblem.dataset.weaponId=w.id;emblem.dataset.sourceUid=first.sourceUid;
      if(first.value<0)emblem.dataset.negative='true';
      emblem.setAttribute('role','status');emblem.setAttribute('aria-live','polite');emblem.setAttribute('aria-atomic','true');
      const caption=first.kind==='riposte'?'Riposte '+effectLabel(w):first.kind==='luck'?'Tr\u00e8fles alli\u00e9s':first.kind==='reraise'?'Reraise transmis':[...new Set(events.map(eventLabel))].join(' \u00b7 ');
      emblem.innerHTML=`<img src="${esc(art(w))}" alt="" draggable="false"><strong>${esc(w.name)}</strong><span>${esc(caption)}</span>`;
      emblem.style.left=Math.max(8,Math.min(innerWidth-156,bounds.left+bounds.width/2-74))+'px';emblem.style.top=Math.max(8,Math.min(innerHeight-186,bounds.top+bounds.height*.3))+'px';
      document.body.append(emblem);nodes.add(emblem);
      try{
        await animate(emblem,motion.matches?[{opacity:0},{opacity:1}]:[{opacity:0,transform:'translateY(8px) scale(.92)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:motion.matches?100:240,fill:'both',easing:'ease-out'},signal);
        if(signal.aborted)return;
        if(first.kind==='bonus'||first.kind==='grant')await pulse(source,signal,w.id);
        await Promise.all(events.map(async e=>{
          const target=unitSlot(e.recipient||e.targetUid),card=target?.querySelector('.slot-card');if(!card)return;
          const start=emblem.getBoundingClientRect(),end=card.getBoundingClientRect(),note=document.createElement('span');note.className='eq-transfer eq-relic-transfer';note.dataset.kind=e.kind;note.dataset.trait=e.trait||'';note.textContent=e.kind==='luck'?'\u2618':e.kind==='reraise'?'\u2665':window.KalistarUltimateUI?.traits[e.trait]?.symbol||(e.kind==='bonus'?'\u2727':'\u2316');note.setAttribute('aria-hidden','true');
          note.style.left=(start.left+start.width/2)+'px';note.style.top=(start.top+50)+'px';document.body.append(note);nodes.add(note);
          try{await animate(note,motion.matches?[{opacity:0},{opacity:0}]:[{opacity:0,transform:'translate(0,0)'},{opacity:1,offset:.25},{opacity:0,transform:`translate(${end.left+end.width/2-start.left-start.width/2}px,${end.top+end.height*.5-start.top-50}px)`}],{duration:motion.matches?1:420,easing:'ease-in-out'},signal);}finally{note.remove();nodes.delete(note);}
          if(signal.aborted)return;const gift=document.createElement('span');gift.className='eq-gift eq-relic-gift';gift.dataset.kind=e.kind;gift.textContent=e.kind==='riposte'?caption:eventLabel(e);gift.setAttribute('aria-hidden','true');card.append(gift);nodes.add(gift);
          try{await animate(gift,[{opacity:0},{opacity:1,offset:.2},{opacity:1,offset:.8},{opacity:0}],{duration:motion.matches?240:560},signal);}finally{gift.remove();nodes.delete(gift);}
        }));
        if(!signal.aborted)await animate(emblem,[{opacity:1},{opacity:1,offset:.7},{opacity:0}],{duration:motion.matches?220:400},signal);
      }finally{emblem.remove();nodes.delete(emblem);}
    }
  }
  async function playCore({before,after,signal}){
    if(signal?.aborted)return;
    await playRelicEvents(before,after,signal);if(signal.aborted)return;
    const d=after.duel;if(!d)return;const definitions=after.equipment?.definitions||[],transfers=d.equipmentTransfer&&!before.duel?.equipmentTransfer?[d.equipmentTransfer]:[];
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
  async function play({before,after,signal}){
    eventController?.abort();const controller=new AbortController();eventController=controller;
    const abort=()=>controller.abort();if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    try{await playCore({before,after,signal:controller.signal});}finally{signal?.removeEventListener('abort',abort);if(eventController===controller)eventController=null;}
  }
  window.addEventListener('pagehide',()=>capture({reset:true}));window.addEventListener('resize',()=>eventController?.abort());motion.addEventListener('change',()=>{eventController?.abort();for(const animation of animations)animation.cancel();animations.clear();});
  window.KalistarEquipmentFX={markup,art,capture,mount,mountDetail,clearDetail,play,newRelicEvents,native,layouts,arenaLayouts,skins};
})();
