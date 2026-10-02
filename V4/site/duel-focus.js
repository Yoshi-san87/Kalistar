(() => {
  'use strict';
  let boards=[],observer=null,previous=new Map(),unsubscribe=null,activation=null,layoutSize='';
  const animations=new Set(),motion=matchMedia('(prefers-reduced-motion:reduce)');
  const phone=matchMedia('(max-width:699px), (max-width:950px) and (max-height:500px)');
  // Native crystal centre (448,1195), minus the shared (50,50) media crop, in 797x1388.
  const crystalAnchor=Object.freeze({x:398/797,y:1145/1388});
  const waiting=new Set();
  const geometry=()=>boards.map(b=>[b.clientWidth,b.clientHeight,...[...b.querySelectorAll('.slot-card')].flatMap(c=>[c.offsetWidth,c.offsetHeight])].join(',')).join('|');
  function cancelActivation(){activation=null;for(const finish of waiting)finish();waiting.clear();}
  function capture(){
    previous=new Map(boards.flatMap(board=>[...board.querySelectorAll('.slot')].map(node=>{
      const style=getComputedStyle(node);return [node.dataset.key,{transform:style.transform,opacity:style.opacity}];
    })));
    unsubscribe?.();unsubscribe=null;observer?.disconnect();cancelActivation();
    for(const animation of animations)animation.cancel();animations.clear();boards=[];
  }
  function layout(){
    for(const board of boards){
      const selected=board.querySelector('.challenger'),slots=[...board.querySelectorAll('.slot')],side=Number(board.dataset.player),w=board.clientWidth,h=board.clientHeight;
      board.classList.toggle('has-challenger',!!selected);
      let index=0;
      for(const node of slots){
        const cw=node.offsetWidth,ch=node.offsetHeight;let scale=1,dx=0,dy=0,opacity=1;
        if(selected&&phone.matches){
          // Keep the upper corners free for score/menu or player resources/action.
          const chosen=node===selected,supportHeight=Math.min((h-102)/2,(w*.24-14)/.57420749);
          scale=chosen?Math.min((h-74)/ch,w*.43/cw):supportHeight/ch;
          opacity=1;
          const column=index%2,row=Math.floor(index/2);
          const x=chosen?w*(side ? .77 : .23):w*(side ? .12+column*.24 : .64+column*.24);
          const y=chosen?(h+44)/2:78+supportHeight/2+row*(supportHeight+12);
          dx=x-(node.offsetLeft+cw/2);dy=y-(node.offsetTop+ch/2);
          if(!chosen)index++;
        }else if(selected){
          const chosen=node===selected;
          scale=chosen?1.72:.60;opacity=chosen?1:.67;
          const column=index%2,row=Math.floor(index/2);
          const x=chosen?w-cw*scale/2-10:cw*.30+column*(cw*.60+10)+4;
          const y=chosen?h/2:h/2+(row-.5)*(ch*.60+24);
          dx=(side?w-x:x)-(node.offsetLeft+cw/2);dy=y-(node.offsetTop+ch/2);
          if(!chosen)index++;
        }
        const transform=`translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) scale(${scale})`;
        node.style.setProperty('--focus-scale',String(scale));
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
        let canvas=node.querySelector('.element-aura');
        if(!canvas&&node.classList.contains('last-combatant')&&node.dataset.element&&node.dataset.element!=='NONE'){
          canvas=document.createElement('canvas');canvas.className='element-aura';canvas.setAttribute('aria-hidden','true');node.append(canvas);
        }
        if(canvas){
          const card=node.querySelector('.slot-card'),width=card.offsetWidth+48,height=card.offsetHeight+48,ratio=Math.min(devicePixelRatio*scale,phone.matches?2:2.5);
          canvas.style.top=(card.offsetTop-24)+'px';canvas.style.left=(card.offsetLeft-24)+'px';canvas.style.width=width+'px';canvas.style.height=height+'px';
          canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);canvas._size={width,height,ratio,scale};
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
    const {width,height,ratio,scale}=canvas._size,w=width-48,h=height-48,node=canvas.closest('.slot'),element=node.dataset.element;
    if(!element||element==='NONE'){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);return;}
    const color=getComputedStyle(node).getPropertyValue('--element-color').trim()||'#bae6d0';
    // Aura details keep their screen size when the challenger is enlarged.
    const unit=1/Math.max(1,scale),t=motion.matches?1:time/1000*.65;
    const age=activation?(time-activation.start)/800:1,awake=node.classList.contains('challenger')&&!motion.matches&&age>=0&&age<1;
    const peak=awake?Math.sin(Math.PI*age)**2:0,solitary=node.classList.contains('last-combatant')||node.classList.contains('match-point');
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);ctx.translate(24,24);
    ctx.strokeStyle=color;ctx.lineWidth=unit*(1+peak*.65);ctx.shadowColor=color;ctx.shadowBlur=(4+peak*5)*ratio*unit;
    ctx.globalAlpha=.4+(solitary ? .09 : 0)+peak*.25;ctx.beginPath();ctx.roundRect(-unit,-unit,w+2*unit,h+2*unit,4*unit);ctx.stroke();
    const count=element==='ELECTRO'?6:phone.matches?8:14;
    for(let i=0;i<count;i++){
      const phase=(t*.48+i*.371)%1,p=borderPoint((i/count+t*.045)%1,w,h);
      const alpha=Math.min(.8,(Math.sin(phase*Math.PI)*.4+.05)*(1+peak*.8+(solitary ? .12 : 0)));
      ctx.globalAlpha=alpha;ctx.fillStyle=element==='RAINBOW'?`hsl(${i*360/count+t*22},94%,73%)`:color;
      ctx.strokeStyle=ctx.fillStyle;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=3*ratio*unit;
      ctx.save();ctx.translate(p.x,p.y);
      if(element!=='ELECTRO')ctx.scale(.65*unit,.65*unit);
      if(element==='ELECTRO'){
        ctx.lineWidth=1.1*unit;ctx.beginPath();
        for(let j=0;j<8;j++){
          const q=borderPoint((i/count+t*.045+j*.004)%1,w,h),shake=Math.sin(i*7+j*4+t*7)*3*unit;
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
    if(awake)awakening(ctx,{w,h,age,unit,element,color});
    ctx.globalAlpha=1;
  }
  function awakening(ctx,{w,h,age,unit,element,color}){
    const x=w*crystalAnchor.x,y=h*crystalAnchor.y,r=w*.083;
    const pulse=Math.sin(Math.PI*Math.min(1,age/.8));
    if(age>.22){
      const progress=Math.min(1,(age-.22)/.7),origin=(w+h+w-x)/(2*(w+h));
      ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.6*unit;ctx.shadowColor=color;ctx.shadowBlur=4*unit;ctx.globalAlpha=Math.sin(progress*Math.PI)*.7;
      for(const direction of [-1,1]){
        ctx.beginPath();
        for(let i=0;i<=36;i++){
          const distance=Math.max(0,progress-.16*(1-i/36)),p=borderPoint((origin+direction*distance*.5+1)%1,w,h);
          if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();ctx.translate(x,y);ctx.shadowBlur=0;
    const glow=ctx.createRadialGradient(0,0,r*.2,0,0,r*1.9);
    glow.addColorStop(0,'transparent');glow.addColorStop(.42,color);glow.addColorStop(1,'transparent');
    ctx.globalAlpha=pulse*.26;ctx.fillStyle=glow;ctx.fillRect(-r*2,-r*2,r*4,r*4);
    ctx.strokeStyle=color;ctx.lineWidth=unit;ctx.shadowColor=color;ctx.shadowBlur=5*unit;
    ctx.globalAlpha=pulse*.62;ctx.beginPath();ctx.ellipse(0,0,r*(.55+age*.7),r*(.75+age),0,0,Math.PI*2);ctx.stroke();
    const count=phone.matches?6:10;
    for(let i=0;i<count;i++){
      const angle=i*Math.PI*2/count,spread=r*(element==='NECRO'?1.5-age:.5+age*1.1),inward=element==='NECRO'?1-age:age;
      ctx.save();ctx.rotate(angle);ctx.translate(spread,0);
      ctx.globalAlpha=pulse*.68;ctx.strokeStyle=ctx.fillStyle=element==='RAINBOW'?`hsl(${i*360/count+age*45},85%,75%)`:color;
      ctx.beginPath();
      if(element==='ELECTRO'){ctx.moveTo(-r*.25,0);ctx.lineTo(0,-r*.12);ctx.lineTo(r*.1,r*.1);ctx.lineTo(r*.28,0);ctx.stroke();}
      else if(element==='PYRO'){ctx.moveTo(0,-2*unit);ctx.quadraticCurveTo(r*.5,-r*.25,r*.7,0);ctx.quadraticCurveTo(r*.15,r*.2,0,2*unit);ctx.fill();}
      else if(element==='HYDRO'||element==='HEMATO'){ctx.ellipse(0,0,unit*1.3,unit*2.2,0,0,Math.PI*2);ctx.fill();}
      else if(element==='AERO'||element==='NECRO'){ctx.moveTo(-r*.25,0);ctx.quadraticCurveTo(r*.15,-r*.22,r*(.4+inward*.3),0);ctx.stroke();}
      else if(element==='LUXO'||element==='RAINBOW'){ctx.moveTo(-r*.12,0);ctx.lineTo(r*.36,0);ctx.stroke();}
      else if(element==='HERBO'){ctx.ellipse(0,0,unit*2.5,unit,age*2,0,Math.PI*2);ctx.fill();}
      else{ctx.rotate(age);ctx.moveTo(0,-3*unit);ctx.lineTo(2*unit,0);ctx.lineTo(0,3*unit);ctx.lineTo(-2*unit,0);ctx.closePath();ctx.stroke();}
      ctx.restore();
    }
    ctx.restore();
  }
  function tick(time){
    if(!document.hidden)for(const board of boards)for(const canvas of board.querySelectorAll('.element-aura')){
      const style=getComputedStyle(canvas.closest('.slot').querySelector('.slot-card'));
      canvas.style.transform=style.transform;canvas.style.opacity=style.opacity;canvas.style.filter=style.filter;
    }
    if(!document.hidden){for(const board of boards)for(const canvas of board.querySelectorAll('.element-aura'))paint(canvas,time);}
    if(activation&&time-activation.start>=800)cancelActivation();
  }
  function mount(nodes){
    if(boards.length)capture();
    boards=[...nodes];if(!boards.length){document.querySelectorAll('.formation .element-aura').forEach(c=>c.remove());previous.clear();return;}
    layout();layoutSize=geometry();observer=new ResizeObserver(()=>{const size=geometry();if(size===layoutSize)return;layoutSize=size;cancelActivation();layout();window.KalistarAmbience?.refresh();});
    for(const board of boards)observer.observe(board);
    unsubscribe=window.KalistarAmbience.subscribe(tick);
  }
  motion.addEventListener('change',()=>{const nodes=boards.slice();capture();mount(nodes);});
  phone.addEventListener('change',()=>{const nodes=boards.slice();capture();mount(nodes);});
  window.addEventListener('pagehide',capture);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelActivation();});
  function engage(){
    cancelActivation();if(motion.matches||document.hidden)return;
    activation={start:performance.now()};window.KalistarAmbience.refresh();
  }
  function ready(signal){
    const remaining=activation?Math.max(0,800-(performance.now()-activation.start)):0;
    if(!remaining||signal?.aborted)return Promise.resolve();
    return new Promise(resolve=>{
      let timer=0;
      const finish=()=>{clearTimeout(timer);signal?.removeEventListener('abort',finish);waiting.delete(finish);resolve();};
      waiting.add(finish);signal?.addEventListener('abort',finish,{once:true});timer=setTimeout(finish,remaining);
    });
  }
  function reveal(side){
    if(phone.matches)return;
    const board=boards.find(b=>Number(b.dataset.player)===side),selected=board?.querySelector('.challenger'),viewport=document.querySelector('.battlefield-viewport');
    if(!selected||!viewport)return;
    const x=side?selected.offsetWidth*1.72/2+10:board.clientWidth-selected.offsetWidth*1.72/2-10;
    const left=viewport.scrollLeft+board.getBoundingClientRect().left+x-viewport.getBoundingClientRect().left-viewport.clientWidth/2;
    viewport.scrollTo({left,behavior:motion.matches?'instant':'smooth'});
  }
  window.KalistarFocus={capture,mount,reveal,engage,ready,crystalAnchor};
})();
