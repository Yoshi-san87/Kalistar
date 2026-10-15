(() => {
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let options=null,current=null,openTimer=0,closeTimer=0;
  const panel=document.createElement('aside');panel.className='reserve-preview';panel.id='reserve-preview';panel.setAttribute('popover','manual');panel.setAttribute('aria-label','Carte en reserve');
  const visible=()=>panel.matches(':popover-open');
  function hide(){clearTimeout(openTimer);clearTimeout(closeTimer);if(visible())panel.hidePopover();current=null;window.dispatchEvent(new Event('kalistar-overlay'));}
  function locate(){
    if(!current)return null;
    return document.querySelector(`[data-reserve-card][data-side="${current.side}"][data-uid="${current.uid}"]`);
  }
  function position(anchor){
    const r=anchor.getBoundingClientRect(),p=panel.getBoundingClientRect(),gap=12;
    let x=current.side===0?r.right+gap:r.left-p.width-gap;
    if(x<8||x+p.width>innerWidth-8)x=Math.max(8,Math.min(innerWidth-p.width-8,r.left+(r.width-p.width)/2));
    panel.style.left=x+'px';panel.style.top=Math.max(8,Math.min(innerHeight-p.height-8,r.top+r.height/2-p.height/2))+'px';
  }
  function show(anchor){
    clearTimeout(openTimer);clearTimeout(closeTimer);
    const side=Number(anchor.dataset.side),uid=anchor.dataset.uid,game=options?.getGame(),u=game?.players[side]?.reserve.find(u=>u.uid===uid);
    if(!u||game.mode==='ai'&&side===1)return hide();
    current={side,uid};const c=options.engine.card(u),legal=c.positions.filter(p=>options.canPlace(side,uid,p-1));
    panel.innerHTML=`<div class="reserve-preview-head"><b>${esc(c.name)}</b><button data-preview-close aria-label="Fermer l’aperçu" title="Fermer"><i data-lucide="x"></i></button></div><img src="assets/cards/${c.slug}-full.png" width="797" height="1388" alt="${esc(c.name+' - '+c.title)}"><div class="reserve-preview-meta"><span>${esc(c.title)}</span><small>${c.positions.map(p=>'P'+p).join(' · ')} · ${esc(c.element)}</small></div><div class="reserve-preview-actions">${legal.map(p=>`<button data-preview-place="${p-1}"><i data-lucide="plus"></i>P${p}</button>`).join('')}<button data-preview-detail title="Fiche de ${esc(c.name)}" aria-label="Fiche de ${esc(c.name)}"><i data-lucide="scan-eye"></i></button></div>`;
    panel.dataset.cardId=c.id;panel.style.setProperty('--preview-color','#'+(options.data.elements[c.element]?.color||'9eaaa4'));
    if(!visible())panel.showPopover();window.lucide?.createIcons();position(anchor);window.dispatchEvent(new Event('kalistar-overlay'));
  }
  function deferHide(){clearTimeout(closeTimer);closeTimer=setTimeout(()=>{if(!panel.matches(':hover')&&!panel.contains(document.activeElement))hide();},160);}
  document.addEventListener('pointerover',e=>{const anchor=e.target.closest('[data-reserve-card]');if(!anchor||e.pointerType==='touch')return;clearTimeout(closeTimer);clearTimeout(openTimer);openTimer=setTimeout(()=>{if(anchor.isConnected)show(anchor);},180);});
  document.addEventListener('pointerout',e=>{if(e.target.closest('[data-reserve-card]')&&!e.relatedTarget?.closest?.('[data-reserve-card]')){clearTimeout(openTimer);deferHide();}});
  document.addEventListener('focusin',e=>{const anchor=e.target.closest('[data-reserve-card]');if(anchor)show(anchor);else if(!panel.contains(e.target))hide();});
  document.addEventListener('click',e=>{
    const anchor=e.target.closest('[data-reserve-card]');if(anchor){options.onSelect(Number(anchor.dataset.side),anchor.dataset.uid);const next=document.querySelector(`[data-reserve-card][data-side="${anchor.dataset.side}"][data-uid="${anchor.dataset.uid}"]`);if(next)show(next);return;}
    if(e.target.closest('[data-preview-close]'))return hide();
    const place=e.target.closest('[data-preview-place]');if(place&&current){const {side,uid}=current;hide();options.onPlace(side,uid,Number(place.dataset.previewPlace));return;}
    if(e.target.closest('[data-preview-detail]')){const id=panel.dataset.cardId;hide();options.onDetail(id);return;}
    if(!panel.contains(e.target))hide();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&visible()){e.preventDefault();hide();}});
  panel.addEventListener('pointerenter',()=>clearTimeout(closeTimer));panel.addEventListener('pointerleave',deferHide);
  document.addEventListener('pointerdown',e=>{if(e.target.closest('[data-drag-reserve]'))clearTimeout(openTimer);});
  document.addEventListener('dragstart',hide);
  window.addEventListener('resize',()=>{const anchor=locate();if(anchor&&visible())position(anchor);else hide();});
  window.addEventListener('scroll',hide,true);window.addEventListener('pagehide',hide);
  function mount(config){options=config;if(!panel.isConnected)document.body.append(panel);if(current){const anchor=locate();if(anchor&&options.getGame())show(anchor);else hide();}}
  window.KalistarReservePreview={mount,hide,isOpen:visible};
})();
