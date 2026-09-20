(() => {
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function outcome(before,after){
    const d=after.duel;
    if(before.phase==='attack')return {revive:'heart-gain',mana:'mana',buff_atk:'power',retry:'luck'}[d.attackValue]||null;
    if(before.phase==='defense'&&d.defenseValue==='retry')return 'luck';
    if(before.phase!=='defense'||after.phase!=='result')return null;
    if(d.defenseValue==='dodge')return 'dodge';
    if(d.reraised)return 'reraise';
    if(!after.players[1-d.side].board[d.targetSlot])return 'defeat';
    return 'shield';
  }
  async function play({before,after,element,color,reduced,signal}){
    const reaction=outcome(before,after),d=after.duel;
    if(!reaction||reduced||signal.aborted)return;
    const field=document.querySelector('.battlefield');
    const slot=(side,index)=>field?.querySelector(`.formation[data-player="${side}"] .slot[data-position="${index+1}"]`);
    const source=slot(d.side,d.attackerSlot),target=slot(1-d.side,d.targetSlot);
    if(!source||!target)return;
    const sourceCard=source.querySelector('.slot-card'),targetCard=target.querySelector('.slot-card');
    const animations=new Set(),nodes=new Set();
    let frame=0,timer=0,releaseWait=null,releaseFlight=null;
    const clean=()=>{
      cancelAnimationFrame(frame);clearTimeout(timer);
      releaseWait?.();releaseFlight?.();
      for(const animation of animations)animation.cancel();
      for(const node of nodes)node.remove();
      source.classList.remove('combat-actor','effect-recipient');target.classList.remove('combat-target','effect-recipient');
      delete field.dataset.combat;delete field.dataset.reaction;delete field.dataset.element;
    };
    signal.addEventListener('abort',clean,{once:true});
    const wait=ms=>new Promise(resolve=>{releaseWait=resolve;timer=setTimeout(()=>{releaseWait=null;resolve();},ms);});
    const animate=async(node,frames,duration)=>{
      if(signal.aborted)return;
      const animation=node.animate(frames,{duration,easing:'ease-out',fill:'both'});animations.add(animation);
      try{await animation.finished;}catch{}finally{animation.cancel();animations.delete(animation);}
    };
    const append=(parent,cls)=>{const node=document.createElement('div');node.className=cls;node.setAttribute('aria-hidden','true');parent.append(node);nodes.add(node);return node;};
    function emblem(parent,asset,label,tint,duration=880){
      const node=append(parent,'combat-emblem');node.dataset.effect=asset;node.style.setProperty('--effect-color',tint);
      const img=document.createElement('img');img.src=`../assets/effets/${asset}.png`;img.alt='';
      const text=document.createElement('strong');text.textContent=label;node.append(img,text);
      return animate(node,[{opacity:0,transform:'translateY(12px) scale(.55)'},{opacity:1,transform:'translateY(0) scale(1.08)',offset:.25},{opacity:1,transform:'translateY(-4px) scale(1)',offset:.72},{opacity:0,transform:'translateY(-18px) scale(1.1)'}],duration);
    }
    async function reanimate(){
      field.dataset.reanimation='fading';
      await animate(targetCard,[{filter:'grayscale(0) brightness(1)',opacity:1,transform:'translateY(0)'},{filter:'grayscale(1) brightness(.3)',opacity:.3,transform:'translateY(10px) scale(.94)'}],260);
      if(signal.aborted)return;
      field.dataset.reanimation='reviving';
      const wave=append(target,'combat-life-wave');
      const glow=animate(wave,[{opacity:0,clipPath:'inset(100% 0 0 0)'},{opacity:1,clipPath:'inset(0 0 0 0)',offset:.55},{opacity:0,clipPath:'inset(0 0 0 0)'}],1000);
      const heart=emblem(target,'revive','Reraise','#ff98b6',1050);
      await animate(targetCard,[{filter:'grayscale(1) brightness(.3)',opacity:.3,transform:'translateY(10px) scale(.94)'},{filter:'grayscale(.2) brightness(1.3)',opacity:1,transform:'translateY(-5px) scale(1.02)',offset:.6},{filter:'grayscale(0) brightness(1)',opacity:1,transform:'translateY(0) scale(1)'}],1000);
      await heart;await glow;delete field.dataset.reanimation;
    }
    function shield(){
      const node=append(target,'combat-shield');
      node.innerHTML='<i data-lucide="shield-check"></i>';
      window.lucide?.createIcons();
      return animate(node,[{opacity:0,transform:'scale(.86)'},{opacity:1,transform:'scale(1)',offset:.2},{opacity:.9,offset:.7},{opacity:0,transform:'scale(1.08)'}],640);
    }
    function impact(){
      const node=append(target,'combat-impact');node.style.setProperty('--impact-color',d.magic?color:'#f3ddd0');
      return animate(node,[{opacity:0,transform:'scale(.6)'},{opacity:.9,transform:'scale(1)',offset:.2},{opacity:0,transform:'scale(1.25)'}],420);
    }
    function magicFlight(){
      const canvas=document.createElement('canvas');canvas.className='combat-magic';canvas.setAttribute('aria-hidden','true');
      canvas.dataset.element=element;canvas.dataset.color=color;
      field.append(canvas);nodes.add(canvas);
      const width=field.clientWidth,height=field.clientHeight,ratio=Math.min(devicePixelRatio,1.5);
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
      const ctx=canvas.getContext('2d');if(!ctx)return Promise.resolve();
      ctx.scale(ratio,ratio);
      const start=performance.now(),duration=760;
      return new Promise(resolve=>{
        releaseFlight=resolve;
        const tick=now=>{
          if(signal.aborted){resolve();return;}
          const t=clamp((now-start)/duration,0,1),base=field.getBoundingClientRect(),a=sourceCard.getBoundingClientRect(),b=targetCard.getBoundingClientRect();
          const ax=a.left+a.width/2-base.left,ay=a.top+a.height*.45-base.top,bx=b.left+b.width/2-base.left,by=b.top+b.height*.45-base.top;
          ctx.clearRect(0,0,width,height);
          const point=p=>({x:ax+(bx-ax)*p,y:ay+(by-ay)*p-Math.sin(p*Math.PI)*70});
          const head=point(t),tail=Math.max(0,t-.28);
          ctx.lineCap='round';ctx.lineJoin='round';
          for(let strand=0;strand<(element==='RAINBOW'?5:3);strand++){
            const paint=element==='RAINBOW'?['#ff7197','#ffda66','#8ce7a7','#79ccff','#d7adff'][strand]:color;
            ctx.strokeStyle=paint;ctx.shadowColor=paint;ctx.shadowBlur=12;ctx.lineWidth=element==='ELECTRO'?2:3-strand*.7;
            ctx.globalAlpha=.9-strand*.14;
            ctx.beginPath();
            for(let i=0;i<=26;i++){
              const p=tail+(t-tail)*i/26,q=point(p),wave=Math.sin(i*1.7+now/50+strand)*((element==='ELECTRO'?12:5)*(1-i/27));
              const y=q.y+wave+(strand-1)*4;
              if(i===0)ctx.moveTo(q.x,y);else ctx.lineTo(q.x,y);
            }
            ctx.stroke();
          }
          // Small directional shards form a spell trail, with crystal-specific motion.
          for(let i=0;i<16;i++){
            const p=t-i*.012;if(p<0)continue;
            const q=point(p),spread=(1-i/17)*15,angle=i*2.4+now/350;
            const x=q.x+Math.cos(angle)*spread,y=q.y+Math.sin(angle)*spread;
            ctx.fillStyle=element==='RAINBOW'?`hsl(${i*27},90%,75%)`:color;
            ctx.globalAlpha=(1-i/17)*.75;ctx.shadowBlur=6;
            ctx.save();ctx.translate(x,y);ctx.rotate(angle);
            if(element==='CRYO'||element==='MINERO'||element==='GEO')ctx.fillRect(-2,-5,4,10);
            else{ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-4,-2);ctx.lineTo(-3,2);ctx.closePath();ctx.fill();}
            ctx.restore();
          }
          ctx.globalAlpha=1;ctx.shadowBlur=16;ctx.strokeStyle='#fff9e8';ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(head.x-7,head.y-7);ctx.lineTo(head.x+7,head.y+7);ctx.moveTo(head.x+7,head.y-7);ctx.lineTo(head.x-7,head.y+7);ctx.stroke();
          if(t<1)frame=requestAnimationFrame(tick);else{canvas.remove();nodes.delete(canvas);releaseFlight=null;resolve();}
        };
        frame=requestAnimationFrame(tick);
      });
    }
    try{
      if(['heart-gain','mana','power','luck'].includes(reaction)){
        const recipient=before.phase==='attack'?source:target,card=recipient.querySelector('.slot-card');
        field.dataset.combat='support';field.dataset.reaction=reaction;recipient.classList.add('effect-recipient');
        const [asset,label,tint]=reaction==='heart-gain'?['revive','Reraise +1','#ff96b7']:reaction==='mana'?['mana','Magie +60','#74d9f7']:reaction==='power'?['buff_atk','Physique +60','#f49b78']:['retry','Relance','#7eeb9b'];
        const symbol=emblem(recipient,asset,label,tint);
        await animate(card,[{boxShadow:`0 0 0 ${tint}`},{boxShadow:`0 0 30px ${tint}`,offset:.4},{boxShadow:`0 0 0 ${tint}`}],880);
        await symbol;return;
      }
      field.dataset.combat=d.magic?'magic':'physical';field.dataset.reaction=reaction;field.dataset.element=element;
      source.classList.add('combat-actor');target.classList.add('combat-target');
      const direction=d.side===0?1:-1;
      let attack;
      if(d.magic){
        attack=animate(sourceCard,[{filter:'brightness(1)',boxShadow:`0 0 0 ${color}`},{filter:'brightness(1.2)',boxShadow:`0 0 32px ${color}`,offset:.35},{filter:'brightness(1)',boxShadow:`0 0 0 ${color}`}],850);
        await magicFlight();
      }else{
        const distance=Math.min(74,sourceCard.clientWidth*.42)*direction;
        attack=animate(sourceCard,[{transform:'translateX(0)'},{transform:`translateX(${-12*direction}px) rotate(${-2*direction}deg)`,offset:.23},{transform:`translateX(${distance}px) rotate(${3*direction}deg)`,offset:.46},{transform:'translateX(0)',offset:1}],650);
        await wait(290);
      }
      if(signal.aborted)return;
      if(reaction==='dodge'){
        const echoes=[];
        for(const sign of [-1,1]){const echo=append(target,'combat-afterimage');echo.append(targetCard.querySelector('img').cloneNode());echoes.push(animate(echo,[{opacity:.32,transform:'translateX(0)'},{opacity:0,transform:`translateX(${sign*32}px)`}],620));}
        const symbol=emblem(target,'dodge','Esquive','#9df6cd',720);
        await animate(targetCard,[{transform:'translateY(0)',opacity:1},{transform:'translateY(-26px)',opacity:.48,offset:.4},{transform:'translateY(0)',opacity:1}],650);
        await symbol;for(const echo of echoes)await echo;
      }else{
        const hit=animate(targetCard,[{transform:'translateX(0)',filter:'brightness(1)',opacity:1},{transform:`translateX(${6*direction}px)`,filter:'brightness(.7)',opacity:.72,offset:.24},{transform:`translateX(${-3*direction}px)`,filter:'brightness(1)',opacity:1,offset:.6},{transform:'translateX(0)',filter:'brightness(1)',opacity:1}],360);
        const spark=impact();
        if(reaction==='shield')await shield();
        else await hit;
        await spark;
        if(reaction==='reraise')await reanimate();
        if(reaction==='defeat')await animate(targetCard,[{opacity:1,filter:'grayscale(0)'},{opacity:.12,filter:'grayscale(1)'}],260);
      }
      await attack;
    }finally{delete field.dataset.reanimation;signal.removeEventListener('abort',clean);clean();}
  }
  window.KalistarCombat={play};
})();
