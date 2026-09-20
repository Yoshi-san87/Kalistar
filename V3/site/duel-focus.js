(() => {
  'use strict';
  let boards=[],frame=0,observer=null,previous=new Map(),lastPaint=0;
  const animations=new Set(),motion=matchMedia('(prefers-reduced-motion:reduce)');
  function capture(){
    previous=new Map(boards.flatMap(board=>[...board.querySelectorAll('.slot')].map(node=>{
      const style=getComputedStyle(node);return [node.dataset.key,{transform:style.transform,opacity:style.opacity}];
    })));
    cancelAnimationFrame(frame);frame=0;observer?.disconnect();
    for(const animation of animations)animation.cancel();animations.clear();boards=[];
  }
  function layout(){
    for(const board of boards){
      const selected=board.querySelector('.challenger'),slots=[...board.querySelectorAll('.slot')],side=Number(board.dataset.player),w=board.clientWidth,h=board.clientHeight;
      board.classList.toggle('has-challenger',!!selected);
      let index=0;
      for(const node of slots){
        const cw=node.offsetWidth,ch=node.offsetHeight;let scale=1,dx=0,dy=0,opacity=1;
        if(selected){
          const chosen=node===selected;
          scale=chosen?1.72:.60;opacity=chosen?1:.67;
          const column=index%2,row=Math.floor(index/2);
          const x=chosen?w-cw*scale/2-10:cw*.30+column*(cw*.60+10)+4;
          const y=chosen?h/2:h/2+(row-.5)*(ch*.60+24);
          dx=(side?w-x:x)-(node.offsetLeft+cw/2);dy=y-(node.offsetTop+ch/2);
          if(!chosen)index++;
        }
        const transform=`translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) scale(${scale})`;
        if(node._kalistarFocusTransform!==transform){
          const style=getComputedStyle(node),from=node.style.transform?{transform:style.transform,opacity:style.opacity}:previous.get(node.dataset.key)||{transform:'none',opacity:'1'};
          node._kalistarFocusTransform=transform;
          node.style.transform=transform;node.style.opacity=String(opacity);
          if(!motion.matches){
            const before=new DOMMatrix(from.transform==='none'?undefined:from.transform),after=new DOMMatrix(transform);
            const changed=['a','b','c','d','e','f'].some(key=>Math.abs(before[key]-after[key])>.001)||Math.abs(Number(from.opacity)-opacity)>.001;
            if(changed){
              const animation=node.animate([from,{transform,opacity}],{duration:520,easing:'cubic-bezier(.2,.75,.2,1)'});
              animations.add(animation);animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));
            }
          }
        }
        const canvas=node.querySelector('.element-aura');
        if(canvas){
          const card=node.querySelector('.slot-card'),width=cw+48,height=card.offsetHeight+48,ratio=Math.min(devicePixelRatio*scale,2.5);
          canvas.style.top=(card.offsetTop-24)+'px';canvas.style.left='-24px';canvas.style.width=width+'px';canvas.style.height=height+'px';
          canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);canvas._size={width,height,ratio};
        }
      }
    }
  }
  function borderPoint(p,w,h){
    const length=2*(w+h);let n=(p%1)*length;
    if(n<w)return {x:n,y:0};n-=w;
    if(n<h)return {x:w,y:n};n-=h;
    if(n<w)return {x:w-n,y:h};n-=w;
    return {x:0,y:h-n};
  }
  function paint(canvas,time){
    const ctx=canvas.getContext('2d');if(!ctx||!canvas._size)return;
    const {width,height,ratio}=canvas._size,w=width-48,h=height-48,node=canvas.closest('.slot'),element=node.dataset.element;
    if(!element||element==='NONE'){ctx.clearRect(0,0,canvas.width,canvas.height);return;}
    const color=getComputedStyle(node).getPropertyValue('--element-color').trim()||'#bae6d0';
    const t=motion.matches?1:time/1000;
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);ctx.translate(24,24);
    ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.shadowColor=color;ctx.shadowBlur=12;
    ctx.globalAlpha=.85;ctx.beginPath();ctx.roundRect(-2,-2,w+4,h+4,7);ctx.stroke();
    const count=element==='ELECTRO'?10:26;
    for(let i=0;i<count;i++){
      const phase=(t*.48+i*.371)%1,p=borderPoint((i/count+t*.045)%1,w,h);
      const alpha=Math.sin(phase*Math.PI)*.8+.1;
      ctx.globalAlpha=alpha;ctx.fillStyle=element==='RAINBOW'?`hsl(${i*360/count+t*22},94%,73%)`:color;
      ctx.strokeStyle=ctx.fillStyle;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8;
      ctx.save();ctx.translate(p.x,p.y);
      if(element==='ELECTRO'){
        ctx.lineWidth=1.6;ctx.beginPath();
        for(let j=0;j<8;j++){
          const q=borderPoint((i/count+t*.045+j*.004)%1,w,h),shake=Math.sin(i*7+j*4+t*7)*5;
          if(j===0)ctx.moveTo(q.x-p.x,q.y-p.y);else ctx.lineTo(q.x-p.x+shake,q.y-p.y-shake);
        }
        ctx.stroke();
      }else if(element==='PYRO'){
        const rise=5+phase*19,sway=Math.sin(t*3+i)*5;
        ctx.beginPath();ctx.moveTo(-4,4);ctx.bezierCurveTo(-10,-rise*.4,sway-5,-rise*.5,sway,-rise);ctx.bezierCurveTo(sway+3,-rise*.3,8,-3,4,4);ctx.closePath();ctx.fill();
        ctx.fillStyle='#ffe6a3';ctx.globalAlpha=alpha*.85;ctx.beginPath();ctx.ellipse(0,0,2,5,0,0,Math.PI*2);ctx.fill();
      }else if(element==='HERBO'){
        ctx.rotate(i+t*.7);ctx.beginPath();ctx.moveTo(0,-9);ctx.quadraticCurveTo(10,0,0,8);ctx.quadraticCurveTo(-3,0,0,-9);ctx.fill();
      }else if(element==='HYDRO'||element==='AERO'||element==='NECRO'){
        ctx.lineWidth=element==='HYDRO'?2.5:1.3;ctx.beginPath();ctx.moveTo(-9,-phase*8);ctx.quadraticCurveTo(0,-11-phase*8,11,-4-phase*8);ctx.stroke();
      }else if(element==='HEMATO'){
        ctx.translate(0,phase*12);ctx.beginPath();ctx.moveTo(0,-7);ctx.quadraticCurveTo(7,3,0,5);ctx.quadraticCurveTo(-7,3,0,-7);ctx.fill();
      }else if(element==='LUXO'||element==='RAINBOW'){
        ctx.rotate(t*.4+i);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.moveTo(0,-7);ctx.lineTo(0,7);ctx.stroke();
      }else{
        ctx.translate(Math.sin(i+t)*4,-phase*9);ctx.rotate(i+t*.4);ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(4,1);ctx.lineTo(0,6);ctx.lineTo(-3,0);ctx.closePath();ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha=1;
  }
  function tick(time){
    if(!document.hidden)for(const board of boards)for(const canvas of board.querySelectorAll('.element-aura')){
      const style=getComputedStyle(canvas.closest('.slot').querySelector('.slot-card'));
      canvas.style.transform=style.transform;canvas.style.opacity=style.opacity;canvas.style.filter=style.filter;
    }
    if(!document.hidden&&time-lastPaint>30){for(const board of boards)for(const canvas of board.querySelectorAll('.element-aura'))paint(canvas,time);lastPaint=time;}
    if(!motion.matches&&boards.some(b=>b.querySelector('.element-aura')))frame=requestAnimationFrame(tick);
  }
  function mount(nodes){
    boards=[...nodes];if(!boards.length){previous.clear();return;}
    layout();observer=new ResizeObserver(()=>{layout();for(const b of boards)for(const c of b.querySelectorAll('.element-aura'))paint(c,performance.now());});
    for(const board of boards)observer.observe(board);
    lastPaint=0;tick(performance.now());
  }
  motion.addEventListener('change',()=>{const nodes=boards.slice();capture();mount(nodes);});
  window.addEventListener('pagehide',capture);
  function reveal(side){
    const board=boards.find(b=>Number(b.dataset.player)===side),selected=board?.querySelector('.challenger'),viewport=document.querySelector('.battlefield-viewport');
    if(!selected||!viewport)return;
    const x=side?selected.offsetWidth*1.72/2+10:board.clientWidth-selected.offsetWidth*1.72/2-10;
    const left=viewport.scrollLeft+board.getBoundingClientRect().left+x-viewport.getBoundingClientRect().left-viewport.clientWidth/2;
    viewport.scrollTo({left,behavior:motion.matches?'instant':'smooth'});
  }
  window.KalistarFocus={capture,mount,reveal};
})();
