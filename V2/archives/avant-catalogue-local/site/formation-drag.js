(() => {
  'use strict';
  let options,drag=null,frame=0,suppressClickUntil=0;
  const pointTarget=(x,y)=>document.elementFromPoint(x,y)?.closest('.slot-card');
  function clearMarks(){document.querySelectorAll('.drop-compatible,.drop-hover').forEach(n=>n.classList.remove('drop-compatible','drop-hover'));}
  function cancel(){
    if(!drag)return;
    const current=drag;drag=null;cancelAnimationFrame(frame);frame=0;
    current.ghost?.remove();current.button.classList.remove('drag-source');clearMarks();
    document.body.classList.remove('formation-dragging');
    if(current.button.hasPointerCapture(current.pointer))current.button.releasePointerCapture(current.pointer);
  }
  function hover(){
    if(!drag?.active)return;
    const target=pointTarget(drag.x,drag.y);
    document.querySelectorAll('.drop-hover').forEach(n=>n.classList.remove('drop-hover'));
    const valid=target&&options.valid(drag.source,Number(target.dataset.side),Number(target.dataset.slot));
    drag.target=valid?target:null;target?.closest('.slot').classList.toggle('drop-hover',!!valid);
    drag.ghost.classList.toggle('drop-allowed',!!valid);
  }
  function scroll(){
    if(!drag?.active)return;
    const viewport=document.querySelector('.battlefield-viewport'),rect=viewport?.getBoundingClientRect();
    if(rect&&drag.y>rect.top&&drag.y<rect.bottom){
      const speed=drag.x<rect.left+44?-10:drag.x>rect.right-44?10:0;
      if(speed)viewport.scrollLeft+=speed;
    }
    if(drag.y<55)window.scrollBy(0,-9);else if(drag.y>innerHeight-55)window.scrollBy(0,9);
    hover();frame=requestAnimationFrame(scroll);
  }
  function begin(){
    drag.active=true;drag.button.classList.add('drag-source');
    const ghost=document.createElement('div');ghost.className='formation-drag-ghost';ghost.setAttribute('aria-hidden','true');
    const img=drag.button.querySelector('img').cloneNode();img.draggable=false;ghost.append(img);document.body.append(ghost);drag.ghost=ghost;
    document.body.classList.add('formation-dragging');
    for(const card of document.querySelectorAll('.slot-card')){
      if(options.valid(drag.source,Number(card.dataset.side),Number(card.dataset.slot)))card.closest('.slot').classList.add('drop-compatible');
    }
    scroll();
  }
  window.KalistarFormationDrag={cancel,init(value){options=value;}};
  document.addEventListener('pointerdown',event=>{
    if(event.button!==0||!event.isPrimary||drag||!options)return;
    const button=event.target.closest('[data-drag-reserve]');if(!button)return;
    const source=options.source(button);if(!source)return;
    drag={button,source,pointer:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,active:false};
    button.setPointerCapture(event.pointerId);
  });
  document.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointer)return;
    drag.x=event.clientX;drag.y=event.clientY;
    if(!drag.active&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>7)begin();
    if(drag.active){event.preventDefault();drag.ghost.style.transform=`translate(${drag.x-48}px,${drag.y-56}px) rotate(-3deg)`;hover();}
  },{passive:false});
  document.addEventListener('pointerup',event=>{
    if(!drag||event.pointerId!==drag.pointer)return;
    const current=drag;
    if(current.active){event.preventDefault();suppressClickUntil=performance.now()+450;hover();}
    const target=current.target,valid=target&&options.valid(current.source,Number(target.dataset.side),Number(target.dataset.slot));
    cancel();
    if(current.active&&valid)options.drop(current.source,Number(target.dataset.side),Number(target.dataset.slot));
  });
  document.addEventListener('pointercancel',cancel);
  document.addEventListener('lostpointercapture',event=>{if(drag?.pointer===event.pointerId)cancel();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag){suppressClickUntil=performance.now()+450;cancel();}});
  document.addEventListener('click',event=>{if(event.detail&&performance.now()<suppressClickUntil){suppressClickUntil=0;event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('dragstart',event=>{if(event.target.closest('.reserve-card'))event.preventDefault();});
  window.addEventListener('blur',cancel);
  window.addEventListener('pagehide',cancel);
})();
