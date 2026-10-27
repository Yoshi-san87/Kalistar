(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarStartupReading=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function selection(cards,random=Math.random){
    const pool=(Array.isArray(cards)?cards:[]).filter(card=>card?.edition==='V4'&&card.pngUrl&&card.name&&String(card.description||card.text||'').trim());
    const value=Number(random());
    return pool[Math.max(0,Math.min(pool.length-1,Math.floor((Number.isFinite(value)?value:0)*pool.length)))]||null;
  }
  function create({host=window,doc=host.document,random=Math.random}={}){
    const root=doc.createElement('section'),events=new AbortController();
    let disposed=false,shown=false,ready=false,entered=false,chosen=false,exitTimer=null,resolveEntry;
    const entry=new Promise(resolve=>{resolveEntry=resolve;});
    root.className='startup-reading';root.hidden=true;root.setAttribute('data-kui-native','');
    root.setAttribute('aria-label','Bienvenue dans Kalistar');
    root.innerHTML=`<header class="startup-reading__brand"><img src="assets/logo-rainbow-v2.webp" width="300" height="100" alt="Kalistar Card Game"><span>Les chroniques d\u2019Astralia</span></header>
      <div class="startup-reading__scene">
        <div class="startup-reading__display" aria-hidden="true"><div class="startup-reading__card"><div class="startup-reading__turn"><div class="startup-reading__back"></div><div class="startup-reading__front"><img alt="" decoding="async" fetchpriority="high"></div></div></div><span class="startup-reading__plinth"></span></div>
        <div class="startup-reading__details"><article class="startup-reading__copy" tabindex="0" aria-label="R\u00e9cit de la carte"><p class="startup-reading__eyebrow">Une carte, une histoire</p><h1>Kalistar</h1><h2>Les chroniques d\u2019Astralia</h2><span class="startup-reading__divider" aria-hidden="true"></span><p class="startup-reading__story">Chaque carte porte une histoire. La prochaine rencontre vous attend.</p></article>
        <footer class="startup-reading__entry"><span class="startup-reading__crystal" aria-hidden="true"></span><div class="startup-reading__action"><p class="startup-reading__status" role="status">Pr\u00e9paration de votre voyage\u2026</p><button type="button" class="startup-reading__enter" data-startup-enter data-kui-native disabled hidden><span>Entrer</span><i data-lucide="arrow-right" aria-hidden="true"></i></button></div></footer>
        </div></div>`;
    const button=root.querySelector('[data-startup-enter]'),status=root.querySelector('.startup-reading__status'),front=root.querySelector('.startup-reading__front img');
    const listen=(node,name,fn)=>node.addEventListener(name,fn,{signal:events.signal});
    function reveal(){if(disposed)return;root.classList.add('has-card');}
    function complete(){if(disposed)return;host.clearTimeout(exitTimer);exitTimer=null;resolveEntry(true);}
    function enter(){
      if(disposed||entered||!ready||!shown||doc.hidden)return;
      entered=true;button.disabled=true;root.classList.add('is-leaving');
      if(host.matchMedia('(prefers-reduced-motion: reduce)').matches)return complete();
      // Bounded fallback also covers CSS disabled or navigation during the fade.
      exitTimer=host.setTimeout(complete,420);
    }
    listen(button,'click',enter);
    listen(root,'animationend',event=>{if(event.target===root&&event.animationName==='startup-reading-leave')complete();});
    listen(front,'load',reveal);
    listen(front,'error',()=>{front.removeAttribute('src');root.classList.add('image-unavailable');});
    function refresh(){
      root.classList.toggle('is-ready',ready);button.hidden=!ready;button.disabled=!ready||entered;
      status.textContent=ready?'Votre voyage est pr\u00eat.':'Pr\u00e9paration de votre voyage\u2026';
      if(ready&&shown&&!doc.hidden&&!entered){host.lucide?.createIcons();button.focus({preventScroll:true});}
    }
    function destroy(){
      if(disposed)return;disposed=true;events.abort();host.clearTimeout(exitTimer);resolveEntry(false);root.remove();
    }
    doc.body.append(root);
    return Object.freeze({
      setCards(cards){
        if(disposed||chosen)return;chosen=true;
        const card=selection(cards,random);if(!card)return;
        root.dataset.cardId=String(card.id);
        root.querySelector('h1').textContent=card.name;
        root.querySelector('h2').textContent=card.title||'';
        root.querySelector('.startup-reading__story').textContent=String(card.description||card.text).trim();
        const url=new URL(host.KalistarSite?.url(card.pngUrl)||card.pngUrl,host.location.href);
        if(url.origin===host.location.origin&&/^https?:$/.test(url.protocol))front.src=url.href;
      },
      show(){if(disposed||shown)return;shown=true;root.hidden=false;root.classList.add('is-visible');refresh();},
      ready(){if(!disposed){ready=true;refresh();}return entry;},
      destroy
    });
  }
  return Object.freeze({selection,create});
});
