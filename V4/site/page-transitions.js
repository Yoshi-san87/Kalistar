(() => {
  'use strict';
  let current=null;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const illustrations={home:'kalistel-rainbow',collection:'collection',decks:'decks',weapons:'weapons',arena:'arena',statistics:'statistics',story:'story',journeys:'library'};
  function cancel(){current?.remove();current=null;document.getElementById('app')?.classList.remove('page-arriving');}
  function enter(view){
    cancel();
    if(reduced.matches)return;
    const app=document.getElementById('app');if(!app||document.querySelector('.lineup-intro'))return;
    app.classList.add('page-arriving');
    const node=document.createElement('div');node.className='kalistar-page-crossing crossing-'+view;node.setAttribute('aria-hidden','true');
    node.innerHTML=view==='decks'?'<div class="crossing-deck">'+[0,1,2].map(i=>'<img src="assets/back-obsidian-v1.webp" alt="" style="--card-index:'+i+'">').join('')+'</div>':'<img class="crossing-emblem" src="assets/navigation/'+(illustrations[view]||'kalistel-rainbow')+'-v1.webp" alt="">';
    node.append(Object.assign(document.createElement('span'),{className:'crossing-line'}));
    document.body.append(node);current=node;
    node.addEventListener('animationend',event=>{if(event.target===node&&current===node)cancel();});
  }
  window.addEventListener('pagehide',cancel);
  reduced.addEventListener('change',()=>{if(reduced.matches)cancel();});
  window.KalistarPageTransitions={enter,cancel};
})();
