(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./trophies.js'):root.KalistarTrophies);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarFinale=api;
})(typeof window==='undefined'?globalThis:window,trophies=>{
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  const player=(s,side)=>side===0?'Joueur 1':s.mode==='ai'?'Le Veilleur':'Joueur 2';
  // Probe the existing resolver, including replacements, without advancing the live match.
  function endsAfterResult(s,engine){
    if(s?.phase!=='result'||engine.equipmentChoice(s))return false;
    const probe=engine.clone(s);engine.next(probe);return probe.phase==='over';
  }
  function describe(s,engine){
    if(s?.phase!=='over')return null;
    const stats=engine.matchStats(s),awards=trophies.awards(stats),mvp=trophies.leaders(stats,'rating')[0];
    const laureates=stats.units.filter(u=>awards[u.uid]?.length).map(u=>({...u,awards:awards[u.uid],mvp:u.uid===mvp?.uid}));
    laureates.sort((a,b)=>Number(b.mvp)-Number(a.mvp)||b.rating-a.rating||a.uid.localeCompare(b.uid));
    return {matchId:s.matchId,winner:s.winner,exchanges:stats.exchanges,partial:stats.partial,laureates};
  }
  function render(s,engine,{image,arenaName=''}){
    const scene=describe(s,engine);if(!scene)return '';
    const title=s.winner==='draw'?'Match nul':`${player(s,s.winner)} remporte la rencontre`;
    const cards=scene.laureates.map((u,index)=>{
      const c=engine.byId[u.cardId],names=u.awards.map(id=>trophies.categories.find(t=>t.id===id).name).join(', ');
      return `<article class="finale-laureate" data-laureate="${esc(u.uid)}" data-side="${u.side}" data-mvp="${u.mvp}" style="--arrival:${index*130}ms">
        <div class="finale-honour">${u.mvp?icon('crown')+'MVP':esc(player(s,u.side))}</div>
        <button class="finale-card" type="button" data-action="detail" data-id="${esc(c.id)}" data-uid="${esc(u.uid)}" data-side="${u.side}" aria-label="${esc('Voir '+c.name+' : '+names)}"><img src="${esc(image(c))}" alt="${esc(c.name)}" draggable="false"></button>
        <h3>${esc(c.name)}</h3><small class="finale-owner">${esc(player(s,u.side))}</small>
        <div class="finale-trophies">${u.awards.map(id=>{
          const t=trophies.categories.find(t=>t.id===id);
          return `<div class="finale-trophy" title="${esc(t.help)}">${trophies.image(id)}<span>${esc(t.name)}</span><b>${u[t.key]}</b></div>`;
        }).join('')}</div></article>`;
    }).join('');
    return `<section class="arena-finale" aria-label="C\u00e9r\u00e9monie de fin de rencontre" data-match="${esc(s.matchId)}" data-settled="false">
      <header class="finale-heading"><img src="assets/navigation/arena-v1.webp" alt="" aria-hidden="true"><div><small>RENCONTRE TERMIN\u00c9E</small><h2 tabindex="-1">${esc(title)}</h2><p>${esc(arenaName)} \u00b7 ${scene.exchanges} \u00e9changes</p></div><button type="button" class="icon-button finale-skip" data-finale="settle" aria-label="Passer l\u2019animation" title="Passer l\u2019animation">${icon('fast-forward')}</button></header>
      ${cards?`<div class="finale-stage"><button type="button" class="icon-button finale-prev" data-finale="prev" aria-label="Laur\u00e9ats pr\u00e9c\u00e9dents" title="Laur\u00e9ats pr\u00e9c\u00e9dents">${icon('chevron-left')}</button><div class="finale-parade" tabindex="0" role="region" aria-label="Personnages prim\u00e9s">${cards}</div><button type="button" class="icon-button finale-next" data-finale="next" aria-label="Laur\u00e9ats suivants" title="Laur\u00e9ats suivants">${icon('chevron-right')}</button></div>`:`<div class="finale-empty"><img src="assets/navigation/kalistel-rainbow-v1.webp" alt="" aria-hidden="true"><p>${scene.partial?'Historique partiel : aucun troph\u00e9e attribu\u00e9.':'Aucun troph\u00e9e attribu\u00e9.'}</p></div>`}
      <footer class="finale-actions"><button type="button" class="primary" data-action="match-stats">${icon('trophy')}<span>Palmar\u00e8s</span></button><button type="button" data-action="finale-board">${icon('list-plus')}<span>Dernier duel</span></button><button type="button" data-action="new-game">${icon('swords')}<span>Nouvelle rencontre</span></button></footer>
    </section>`;
  }
  function create(){
    let dispose=null;const seen=new Set();
    function destroy(){dispose?.();dispose=null;}
    function mount(node,{focus=false}={}){
      destroy();if(!node)return;
      if(seen.has(node.dataset.match)||document.hidden)node.dataset.settled='true';
      seen.add(node.dataset.match);
      if(seen.size>16)seen.delete(seen.values().next().value);
      const track=node.querySelector('.finale-parade'),prev=node.querySelector('[data-finale=prev]'),next=node.querySelector('[data-finale=next]');
      const update=()=>{if(!track)return;prev.disabled=track.scrollLeft<2;next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-2;};
      const click=e=>{
        const action=e.target.closest('[data-finale]')?.dataset.finale;if(!action)return;
        if(action==='settle'){node.dataset.settled='true';node.querySelector('h2').focus({preventScroll:true});return;}
        track?.scrollBy({left:(action==='prev'?-1:1)*(track.querySelector('article').getBoundingClientRect().width+32),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
      };
      const visibility=()=>{if(document.hidden)node.dataset.settled='true';};
      const motion=matchMedia('(prefers-reduced-motion:reduce)'),preference=()=>{if(motion.matches)node.dataset.settled='true';};
      const end=e=>{
        if(e.animationName==='finale-trophy'&&e.target.closest('article')===track?.lastElementChild||!track&&e.animationName==='finale-light')node.dataset.settled='true';
      };
      node.addEventListener('click',click);track?.addEventListener('scroll',update,{passive:true});document.addEventListener('visibilitychange',visibility);
      node.addEventListener('animationend',end);motion.addEventListener('change',preference);preference();
      const observer=track?new ResizeObserver(update):null;observer?.observe(track);update();
      if(focus&&!document.querySelector('dialog[open]')){
        node.closest('#app')?.scrollTo({top:0,behavior:'instant'});
        node.querySelector('h2').focus({preventScroll:true});
      }
      dispose=()=>{node.removeEventListener('click',click);node.removeEventListener('animationend',end);track?.removeEventListener('scroll',update);document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',preference);observer?.disconnect();};
    }
    return {mount,destroy};
  }
  return {endsAfterResult,describe,render,create};
});
