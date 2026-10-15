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
  // A bounded rotating showcase avoids decoding hundreds of native cards on a phone.
  function selection(cards,random=Math.random){
    const chosen=[],pool=cards.slice();
    while(pool.length&&chosen.length<8)chosen.push(pool.splice(Math.min(pool.length-1,Math.floor(random()*pool.length)),1)[0]);
    return chosen;
  }
  function create({data,image,equipment=[],medallion=null,onDetail=()=>{},onNavigate=()=>{}}){
    let root=null,controller=null,timer=null,index=0,paused=false,pool=[],observer=null;
    const motion=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
    const icons=()=>globalThis.KalistarUI?.icons(root);
    function stop(){clearTimeout(timer);timer=null;}
    function schedule(){
      stop();
      const control=root?.querySelector('[data-home-control=pause]');if(control)control.disabled=motion();
      const focused=root?.querySelector('.home-gallery')?.contains(document.activeElement);
      if(root&&!paused&&!focused&&!document.hidden&&!motion()&&!document.querySelector('dialog[open]')&&pool.length>1)timer=setTimeout(()=>show(index+1),6500);
    }
    function show(next){
      if(!root||!pool.length)return;
      index=(next+pool.length)%pool.length;
      const c=pool[index],element=data.elements[c.element],color=element?.color||'a9bcb6';
      const stage=root.querySelector('.home-showcase');stage.style.setProperty('--showcase-energy','#'+color);
      stage.innerHTML=`<button class="home-card" data-home-detail="${esc(c.id)}" aria-label="Voir ${esc(c.name)}"><img src="${esc(image(c))}" alt="Carte ${esc(c.name)}" decoding="async"></button>
        <div class="home-card-copy"><span class="eyebrow">${esc(element?.label||'Sans cristal')} <span aria-hidden="true">\u00b7</span> ${esc(c.faction)}</span><h2>${esc(c.name)}</h2><p class="home-card-title">${esc(c.title)}</p><div class="home-traits"><span>${esc(c.job)}</span>${globalThis.KalistarPositions.list(c.positions)}</div><p class="home-card-story">${esc(c.text)}</p><button class="home-inspect icon-button" data-home-detail="${esc(c.id)}" aria-label="Inspecter ${esc(c.name)}" title="Inspecter ${esc(c.name)}"><i data-lucide="scan-eye"></i></button></div>`;
      root.querySelector('.home-position').textContent=(index+1)+' / '+pool.length;
      const pause=root.querySelector('[data-home-control=pause]');pause.setAttribute('aria-pressed',String(paused));
      pause.setAttribute('aria-label',paused?'Reprendre le carrousel':'Mettre le carrousel en pause');pause.innerHTML='<i data-lucide="'+(paused?'play':'pause')+'"></i>';
      icons();schedule();
    }
    function mount(node){
      destroy();root=node;controller=new AbortController();pool=selection(data.cards);index=0;
      root.innerHTML=`<section class="kalistar-home" aria-label="Accueil Kalistar"><header class="home-heading"><h1><img src="assets/logo.webp" width="300" height="100" alt="Kalistar Card Game"></h1></header>
        <nav class="home-portals" aria-label="Collections de Kalistar">${entries.map(e=>{const item=equipment.find(w=>w.id===e.equipmentId);return `<button data-home-category="${e.id}"><span class="home-portal-emblem">${item&&medallion?medallion(item,{bonus:false}):`<img src="assets/${e.image}" alt="" width="72" height="72">`}</span><span>${e.label}</span></button>`;}).join('')}</nav>
        <section class="home-gallery" aria-roledescription="carrousel" aria-label="Cartes \u00e0 d\u00e9couvrir"><div class="home-showcase" aria-live="off"></div><div class="home-gallery-controls"><button class="icon-button" data-home-control="previous" aria-label="Carte pr\u00e9c\u00e9dente" title="Carte pr\u00e9c\u00e9dente"><i data-lucide="chevron-left"></i></button><span class="home-position"></span><button class="icon-button" data-home-control="pause" aria-pressed="false" aria-label="Mettre le carrousel en pause" title="Pause"><i data-lucide="pause"></i></button><button class="icon-button" data-home-control="next" aria-label="Carte suivante" title="Carte suivante"><i data-lucide="chevron-right"></i></button></div></section></section>`;
      const signal=controller.signal;
      root.addEventListener('click',event=>{
        const category=event.target.closest('[data-home-category]');if(category){onNavigate(category.dataset.homeCategory);return;}
        const detail=event.target.closest('[data-home-detail]');if(detail){stop();onDetail(detail.dataset.homeDetail);return;}
        const button=event.target.closest('[data-home-control]');if(!button)return;
        if(button.dataset.homeControl==='pause'){
          paused=!paused;button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',paused?'Reprendre le carrousel':'Mettre le carrousel en pause');button.innerHTML='<i data-lucide="'+(paused?'play':'pause')+'"></i>';icons();schedule();
        }else{paused=true;show(index+(button.dataset.homeControl==='next'?1:-1));}
      },{signal});
      root.querySelector('.home-gallery').addEventListener('focusin',stop,{signal});
      root.querySelector('.home-gallery').addEventListener('focusout',event=>{if(!event.currentTarget.contains(event.relatedTarget))schedule();},{signal});
      document.addEventListener('visibilitychange',schedule,{signal});
      document.addEventListener('close',schedule,{capture:true,signal});
      matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',schedule,{signal});
      window.addEventListener('pagehide',destroy,{signal});
      observer=new MutationObserver(()=>{if(document.querySelector('dialog[open]'))stop();else schedule();});
      observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
      show(0);
    }
    function destroy(){stop();observer?.disconnect();observer=null;controller?.abort();controller=null;root=null;}
    return {mount,destroy};
  }
  return {entries,selection,create};
});
