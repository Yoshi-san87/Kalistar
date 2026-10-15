(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarHome=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const entries=Object.freeze([
    {id:'collection',label:'Collection',image:'navigation/collection-v1.webp'},
    {id:'weapon',label:'Armes',image:'equipment/fallen-king-axe-v3.webp',equipmentId:'fallen-king-axe'},
    {id:'shield',label:'Protections',image:'equipment/durane-rampart-v1.webp',equipmentId:'durane-rampart'},
    {id:'relic',label:'Reliques',image:'equipment/little-joys-flute-v3.webp',equipmentId:'little-joys-flute'}
  ]);
  const interval=9000;
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  const emblem=name=>`<img src="assets/navigation/${name}-v1.webp" alt="" width="128" height="128" decoding="async">`;
  // Only this small pool is decoded, including its two neighbouring cards.
  function selection(cards,random=Math.random){
    const chosen=[],pool=cards.slice();
    while(pool.length&&chosen.length<8){
      const value=Number(random());
      const index=Math.max(0,Math.min(pool.length-1,Math.floor((Number.isFinite(value)?value:0)*pool.length)));
      chosen.push(pool.splice(index,1)[0]);
    }
    return chosen;
  }
  function deckStatus(state={}){
    const count=Number(state?.deckCount);
    return {name:String(state?.deckName||'Ma composition'),count:Number.isFinite(count)?Math.max(0,Math.min(10,Math.trunc(count))):0,resume:state?.resume===true};
  }
  function create({data,image,equipment=[],medallion=null,asset=null,getState=()=>({}),onDetail=()=>{},onNavigate=()=>{}}){
    let root=null,controller=null,timer=null,index=0,paused=false,pool=[],observer=null,frame=null,intersect=null,visible=true,hovering=false,gesture=null,suppressClick=0;
    let reduced=null,finePointer=null,remaining=interval,startedAt=0;
    const motion=()=>reduced?.matches??true;
    const icons=()=>globalThis.KalistarUI?.icons(root);
    const wrap=n=>(n+pool.length)%pool.length;
    function stop(reset=false){
      if(timer!==null)remaining=Math.max(0,remaining-(Date.now()-startedAt));
      clearTimeout(timer);timer=null;if(reset)remaining=interval;
    }
    function schedule(){
      stop();if(!root)return;
      const focused=root.querySelector('.home-gallery')?.contains(document.activeElement);
      const blocked=paused||focused||hovering||!visible||document.hidden||motion()||!!document.querySelector('dialog[open]');
      root.dataset.homePaused=String(blocked);root.dataset.homeReduced=String(motion());
      const button=root.querySelector('[data-home-control=pause]');
      button.disabled=motion()||pool.length<2;button.setAttribute('aria-pressed',String(paused));
      button.setAttribute('aria-label',paused?'Reprendre le carrousel':'Mettre le carrousel en pause');
      button.title=motion()?'Animations r\u00e9duites':paused?'Reprendre':'Pause';
      const symbol=paused?'play':'pause';
      if(button.querySelector('[data-lucide]')?.getAttribute('data-lucide')!==symbol)button.innerHTML=icon(symbol);
      icons();
      if(!blocked&&pool.length>1){startedAt=Date.now();timer=setTimeout(()=>show(index+1),remaining);}
    }
    function cardMarkup(card,kind,offset){
      const label=kind==='home-card'?'Voir '+card.name:'D\u00e9couvrir '+card.name;
      return `<button class="${kind}" ${kind==='home-card'?`data-home-detail="${esc(card.id)}"`:`data-home-index="${offset}"`} aria-label="${esc(label)}" title="${esc(label)}" data-kui-native><img src="${esc(image(card))}" alt="${kind==='home-card'?'Carte '+esc(card.name):''}" decoding="async" draggable="false"></button>`;
    }
    function show(next,{manual=false}={}){
      if(!root||!pool.length)return;
      stop(true);
      const focus=document.activeElement,restore=focus?.closest('.home-showcase')?.contains(focus);
      if(manual)paused=true;index=wrap(next);
      const card=pool[index],element=data.elements[card.element],stage=root.querySelector('.home-showcase');
      root.style.setProperty('--showcase-energy',/^[a-f\d]{6}$/i.test(element?.color||'')?'#'+element.color:'#a9bcb6');
      const banner=asset?`<img class="home-faction" src="${esc(asset('factions',card.faction))}" alt="" decoding="async">`:'';
      const crystal=card.element&&card.element!=='NONE'&&asset?`<img src="${esc(asset('cristaux',card.element))}" alt="" width="44" height="44" decoding="async">`:'';
      stage.innerHTML=`<div class="home-fan">
        ${pool.length>1?cardMarkup(pool[wrap(index-1)],'home-satellite home-satellite-left',wrap(index-1)):''}
        ${pool.length>2?cardMarkup(pool[wrap(index+1)],'home-satellite home-satellite-right',wrap(index+1)):''}
        ${cardMarkup(card,'home-card')}
        <div class="home-card-plinth" aria-hidden="true"><span></span><img src="assets/navigation/kalistel-rainbow-v1.webp" alt="" width="48" height="48"></div>
      </div><div class="home-card-copy" id="home-card-copy">
        <div class="home-card-origin">${crystal}<span>${esc(element?.label||'Sans cristal')}<small>${esc(card.faction)}</small></span>${banner}</div>
        <h2>${esc(card.name)}</h2><p class="home-card-title">${esc(card.title)}</p>
        <div class="home-traits"><span>${esc(card.job)}</span>${globalThis.KalistarPositions.list(card.positions)}</div>
        <p class="home-card-story">${esc(card.text)}</p>
        <button class="home-inspect" data-home-detail="${esc(card.id)}" data-kui-native>${icon('scan-eye')}<span>Voir la carte</span>${icon('arrow-up-right')}</button>
      </div>`;
      root.querySelector('.home-position').textContent=String(index+1).padStart(2,'0')+' / '+String(pool.length).padStart(2,'0');
      root.querySelector('.home-reel-ticks').innerHTML=pool.map((_,i)=>`<span class="${i===index?'current':''}"></span>`).join('');
      root.querySelector('.home-gallery').setAttribute('aria-label','Cartes \u00e0 d\u00e9couvrir : '+card.name);
      if(manual)root.querySelector('.home-announcement').textContent=card.name+' : '+card.title;
      if(restore)root.querySelector('.home-card').focus({preventScroll:true});
      icons();schedule();
    }
    function resetPointer(){
      if(frame!==null)cancelAnimationFrame(frame);frame=null;
      root?.style.setProperty('--home-pointer-x','0px');root?.style.setProperty('--home-pointer-y','0px');
    }
    function mount(node){
      destroy();root=node;controller=new AbortController();
      // App repainting after a dialog must not shuffle the card being read.
      if(!pool.length)pool=selection(data.cards);
      visible=true;hovering=false;suppressClick=0;remaining=interval;
      reduced=matchMedia('(prefers-reduced-motion:reduce)');finePointer=matchMedia('(hover:hover) and (pointer:fine)');
      const state=deckStatus(getState());
      root.innerHTML=`<section class="kalistar-home" aria-label="Accueil Kalistar">
        <picture class="home-world" aria-hidden="true"><source media="(max-width:699px)" srcset="assets/home/sanctum-phone-v1.webp"><img src="assets/home/sanctum-v1.webp" alt="" width="1672" height="941" fetchpriority="high"></picture>
        <div class="home-inner"><header class="home-heading"><span class="home-heading-rule" aria-hidden="true"></span><div><p class="home-kicker">Les chroniques d'Astralia</p><h1><img src="assets/logo.webp" width="300" height="100" alt="Kalistar Card Game"></h1></div><span class="home-heading-rule" aria-hidden="true"></span></header>
        <div class="home-edition"><span>${esc(data.cards.length)} cartes</span><img src="assets/navigation/kalistel-rainbow-v1.webp" alt="" width="20" height="28"><span>${esc(new Set(data.cards.map(c=>c.characterId||c.id)).size)} personnages</span></div>
        <section class="home-gallery" aria-roledescription="carrousel" aria-label="Cartes \u00e0 d\u00e9couvrir">
          <div class="home-showcase" aria-live="off">${pool.length?'':'<div class="home-empty"><h2>Le grimoire attend ses cartes</h2></div>'}</div>
          <div class="home-gallery-controls"><button data-kui-native data-home-control="previous" aria-label="Carte pr\u00e9c\u00e9dente" title="Carte pr\u00e9c\u00e9dente" ${pool.length<2?'disabled':''}>${icon('chevron-left')}</button><span class="home-position">00 / 00</span><span class="home-reel-ticks" aria-hidden="true"></span><button data-kui-native data-home-control="pause" aria-label="Mettre le carrousel en pause" aria-pressed="false" title="Pause">${icon('pause')}</button><button data-kui-native data-home-control="next" aria-label="Carte suivante" title="Carte suivante" ${pool.length<2?'disabled':''}>${icon('chevron-right')}</button></div>
          <p class="home-announcement" role="status" aria-live="polite"></p>
        </section>
        <div class="home-play-row"><button class="home-play" data-home-route="arena" data-kui-native>${emblem('arena')}<span><small>${state.resume?'Combat en cours':'Le prochain duel vous attend'}</small><strong>${state.resume?'Reprendre le combat':"Entrer dans l'ar\u00e8ne"}</strong></span>${icon('chevron-right')}</button>
          <button class="home-deck" data-home-route="decks" data-kui-native>${emblem('decks')}<span><small>Ma composition <b>${state.count}/10</b></small><strong>${esc(state.name)}</strong></span>${icon('chevron-right')}</button></div>
        <nav class="home-portals" aria-label="Collections de Kalistar">${entries.map((entry,i)=>{const item=equipment.find(w=>w.id===entry.equipmentId);return `<button data-home-category="${entry.id}" data-kui-native style="--portal-order:${i}"><span class="home-portal-emblem">${item&&medallion?medallion(item,{bonus:false}):`<img src="assets/${entry.image}" alt="" width="72" height="72">`}</span><span>${entry.label}</span>${icon('arrow-up-right')}</button>`;}).join('')}</nav>
        </div>
        <nav class="home-explore" aria-label="L'univers Kalistar"><button data-home-route="map" data-kui-native>${emblem('map')}<span><small>Le monde de Kalistar</small><strong>Astralia</strong></span>${icon('arrow-up-right')}</button><span class="home-explore-crystal" aria-hidden="true"></span><button data-home-route="story" data-kui-native>${emblem('story')}<span><small>Les origines</small><strong>Ouvrir le Tome I</strong></span>${icon('arrow-up-right')}</button><button class="home-guide-link" data-home-route="guide" data-kui-native>${emblem('guide')}<span>Guide</span>${icon('arrow-up-right')}</button></nav>
      </section>`;
      const signal=controller.signal,gallery=root.querySelector('.home-gallery');
      root.addEventListener('click',event=>{
        if(Date.now()<suppressClick){event.preventDefault();return;}
        const route=event.target.closest('[data-home-route]');if(route){onNavigate(route.dataset.homeRoute);return;}
        const category=event.target.closest('[data-home-category]');if(category){onNavigate(category.dataset.homeCategory);return;}
        const detail=event.target.closest('[data-home-detail]');if(detail){stop();root.dataset.homePaused='true';onDetail(detail.dataset.homeDetail);return;}
        const neighbour=event.target.closest('[data-home-index]');if(neighbour){show(Number(neighbour.dataset.homeIndex),{manual:true});return;}
        const button=event.target.closest('[data-home-control]');if(!button)return;
        if(button.dataset.homeControl==='pause'){paused=!paused;schedule();}else show(index+(button.dataset.homeControl==='next'?1:-1),{manual:true});
      },{signal});
      gallery.addEventListener('focusin',schedule,{signal});
      gallery.addEventListener('focusout',event=>{if(!event.currentTarget.contains(event.relatedTarget))schedule();},{signal});
      gallery.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovering=true;schedule();}},{signal});
      gallery.addEventListener('pointerleave',()=>{hovering=false;resetPointer();schedule();},{signal});
      gallery.addEventListener('pointermove',event=>{
        if(motion()||!finePointer.matches||event.pointerType!=='mouse'||frame!==null)return;
        frame=requestAnimationFrame(()=>{frame=null;if(!root)return;const box=gallery.getBoundingClientRect();root.style.setProperty('--home-pointer-x',((event.clientX-box.left)/box.width-.5)*10+'px');root.style.setProperty('--home-pointer-y',((event.clientY-box.top)/box.height-.5)*6+'px');});
      },{signal,passive:true});
      gallery.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')gesture={id:event.pointerId,x:event.clientX,y:event.clientY};},{signal,passive:true});
      gallery.addEventListener('pointercancel',()=>{gesture=null;},{signal});
      gallery.addEventListener('pointerup',event=>{
        if(!gesture||gesture.id!==event.pointerId)return;
        const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;
        if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5&&pool.length>1){suppressClick=Date.now()+500;show(index+(dx<0?1:-1),{manual:true});}
      },{signal,passive:true});
      document.addEventListener('visibilitychange',schedule,{signal});document.addEventListener('close',schedule,{capture:true,signal});
      reduced.addEventListener('change',()=>{resetPointer();schedule();},{signal});
      window.addEventListener('pagehide',event=>{
        if(!event.persisted){destroy();return;}
        stop();resetPointer();if(root)root.dataset.homePaused='true';
      },{signal});
      window.addEventListener('pageshow',schedule,{signal});
      observer=new MutationObserver(()=>{if(document.querySelector('dialog[open]'))resetPointer();schedule();});
      observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
      if(typeof IntersectionObserver==='function'){intersect=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting!==false;schedule();},{threshold:0});intersect.observe(gallery);}
      if(pool.length)show(index);else{icons();schedule();}
    }
    function destroy(){
      stop();resetPointer();observer?.disconnect();intersect?.disconnect();observer=null;intersect=null;
      controller?.abort();controller=null;root=null;reduced=null;finePointer=null;gesture=null;
    }
    return {mount,destroy};
  }
  return {entries,interval,selection,deckStatus,create};
});
