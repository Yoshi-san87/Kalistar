(() => {
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  let clearKillCelebration=()=>{};
  function cancelKillCelebration(){clearKillCelebration();}
  function celebrateKill({tier,name,side,reduced=false}){
    cancelKillCelebration();
    const host=document.querySelector('.duel-console'),T=window.KalistarTrophies,definition=T?.killMedals.find(m=>m.tier===tier);
    if(!host||!definition)return;
    const node=document.createElement('div');node.className='kill-celebration';node.dataset.side=String(side);node.dataset.tier=String(tier);node.dataset.reduced=String(reduced);
    node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');
    node.innerHTML=T.medal(tier,{decorative:true});
    const copy=document.createElement('div'),who=document.createElement('span'),title=document.createElement('strong');
    who.className='kill-celebration-name';who.textContent=name;title.textContent=definition.name;copy.append(who,title);node.append(copy);host.append(node);
    const timeout=setTimeout(clean,1800);
    function clean(){clearTimeout(timeout);node.remove();if(clearKillCelebration===clean)clearKillCelebration=()=>{};}
    clearKillCelebration=clean;
  }
  async function shatterKalistel(button,{reduced=false,signal}={}){
    const art=button?.querySelector('.kalistel-art'),img=art?.querySelector('img');
    if(!art||!img?.complete||!img.naturalWidth||signal?.aborted||reduced)return;
    const rect=art.getBoundingClientRect(),imageRect=img.getBoundingClientRect();
    const size=Math.min(300,innerWidth,innerHeight),radius=innerWidth<700?76:110;
    const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    const left=clamp(cx-size/2,0,innerWidth-size),top=clamp(cy-size/2,0,innerHeight-size);
    const canvas=document.createElement('canvas'),ratio=Math.min(devicePixelRatio||1,2);
    canvas.className='kalistel-burst';canvas.setAttribute('aria-hidden','true');
    Object.assign(canvas.style,{position:'fixed',left:left+'px',top:top+'px',width:size+'px',height:size+'px',pointerEvents:'none',zIndex:80});
    canvas.width=Math.round(size*ratio);canvas.height=Math.round(size*ratio);
    const ctx=canvas.getContext('2d');if(!ctx)return;
    document.body.append(canvas);
    const points=[[.5,0],[1,.36],[.5,1],[0,.36],[.5,.36],[.36,.58],[.64,.58]];
    const mesh=[[0,3,4],[0,4,1],[3,5,4],[4,5,6],[4,6,1],[3,2,5],[5,2,6],[6,2,1]];
    const shards=mesh.map((indices,i)=>{
      const vertices=indices.map(n=>[points[n][0]*rect.width,points[n][1]*rect.height]);
      const x=vertices.reduce((v,p)=>v+p[0],0)/3,y=vertices.reduce((v,p)=>v+p[1],0)/3;
      const angle=-Math.PI/2+i*Math.PI*2/mesh.length;
      return {vertices,x,y,vx:Math.cos(angle)*radius*(.65+i%3*.12),vy:Math.sin(angle)*radius,spin:(i%2?1:-1)*(1.7+i*.3)};
    });
    let frame=0,timeout=0,finish;
    const done=new Promise(resolve=>{finish=resolve;});
    const clean=()=>{cancelAnimationFrame(frame);clearTimeout(timeout);canvas.remove();finish();};
    const start=performance.now(),duration=900;
    const draw=now=>{
      if(signal?.aborted||!button.isConnected){clean();return;}
      const t=clamp((now-start)/duration,0,1),flight=1-Math.pow(1-t,2),fade=Math.pow(1-t,1.25);
      ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,size,size);
      for(const shard of shards){
        ctx.save();ctx.translate(rect.left-left+shard.x+shard.vx*flight,rect.top-top+shard.y+shard.vy*flight+32*t*t);
        ctx.rotate(shard.spin*t);ctx.scale(1-t*.3,1-t*.3);ctx.globalAlpha=fade;
        ctx.beginPath();shard.vertices.forEach(([x,y],i)=>i?ctx.lineTo(x-shard.x,y-shard.y):ctx.moveTo(x-shard.x,y-shard.y));ctx.closePath();
        ctx.save();ctx.clip();ctx.drawImage(img,imageRect.left-rect.left-shard.x,imageRect.top-rect.top-shard.y,imageRect.width,imageRect.height);ctx.restore();
        ctx.strokeStyle='#e0fbff';ctx.lineWidth=.7;ctx.shadowColor='#9deaff';ctx.shadowBlur=5;ctx.stroke();ctx.restore();
      }
      // Fine angular splinters and glints, rather than a screen-filling flash.
      for(let i=0;i<18;i++){
        const angle=i*2.39996,reach=radius*(.4+(i%5)*.14),x=cx-left+Math.cos(angle)*reach*flight,y=cy-top+Math.sin(angle)*reach*flight+20*t*t;
        ctx.save();ctx.translate(x,y);ctx.rotate(angle+t*2);ctx.globalAlpha=fade*.8;
        ctx.fillStyle=['#d9fbff','#a3dcf4','#ecd3fa','#fff0bf'][i%4];
        ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(1.7,1);ctx.lineTo(-1.2,2);ctx.closePath();ctx.fill();
        if(i%3===0){ctx.strokeStyle='#eaffff';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-4,0);ctx.lineTo(4,0);ctx.moveTo(0,-4);ctx.lineTo(0,4);ctx.stroke();}
        ctx.restore();
      }
      if(t===1)clean();else frame=requestAnimationFrame(draw);
    };
    signal?.addEventListener('abort',clean,{once:true});
    timeout=setTimeout(clean,duration+250);frame=requestAnimationFrame(draw);
    try{await done;}finally{signal?.removeEventListener('abort',clean);clean();}
  }
  function outcome(before,after){
    const d=after.duel;
    if(before.phase==='guard')return 'guard-gain';
    if(before.phase==='clover')return 'clover-gain';
    if(before.phase==='potion')return 'mana-gain';
    if(before.phase==='physical')return 'power-gain';
    if(before.phase==='heart')return 'heart-gain';
    if(before.phase==='defense'&&d.luckUsed&&!before.duel.luckUsed)return 'second-chance';
    if(after.phase==='kalistel')return null;
    if(['attack','kalistel'].includes(before.phase))return {guard:'guard',revive:'heart',mana:'mana',buff_atk:'power',retry:'luck'}[d.attackValue]||null;
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
      source.classList.remove('combat-actor');target.classList.remove('combat-target');
      field.querySelectorAll('.effect-recipient').forEach(node=>node.classList.remove('effect-recipient'));
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
      const img=document.createElement('img');img.src=`shared/effets/${asset}.png`;img.alt='';
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
    function shield(recipient=target,ward=false){
      const node=append(recipient,'combat-shield'+(ward?' combat-ward':''));
      node.innerHTML='<i data-lucide="shield-check"></i>'+(ward?'<strong>DEF +60</strong>':'');
      window.lucide?.createIcons();
      return animate(node,[{opacity:0,transform:'scale(.86)'},{opacity:1,transform:'scale(1)',offset:.2},{opacity:.9,offset:.7},{opacity:0,transform:'scale(1.08)'}],640);
    }
    function impact(){
      const node=append(target,'combat-impact');node.style.setProperty('--impact-color',d.magic&&element&&element!=='NONE'?color:'#f3ddd0');
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
      if(['guard','guard-gain','heart','heart-gain','mana','mana-gain','power','power-gain','luck','clover-gain','second-chance'].includes(reaction)){
        const recipient=(['guard-gain','heart-gain','clover-gain','mana-gain','power-gain'].includes(reaction)?field.querySelector(`.slot[data-unit="${d.guardGranted||d.reraiseGranted||d.cloverGranted||d.manaGranted||d.physicalGranted}"]`):['attack','kalistel'].includes(before.phase)?source:target)||source,card=recipient.querySelector('.slot-card');
        field.dataset.combat='support';field.dataset.reaction=reaction;recipient.classList.add('effect-recipient');
        const [asset,label,tint]=reaction==='guard-gain'||reaction==='guard'?['guard',reaction==='guard'?'Garde obtenue':'DEF physique +60','#a6d8eb']:reaction==='heart-gain'||reaction==='heart'?['revive',reaction==='heart'?'Cœur obtenu':'Reraise','#ff96b7']:reaction==='mana-gain'?['mana','Magie +60','#74d9f7']:reaction==='mana'?['mana','Potion obtenue','#74d9f7']:reaction==='power'||reaction==='power-gain'?['buff_atk',reaction==='power'?'Puissance obtenue':'Physique +60','#f49b78']:['retry',reaction==='clover-gain'?'Trèfle':reaction==='second-chance'?'Seconde chance':['attack','kalistel'].includes(before.phase)?'Trèfle obtenu':'Relance','#7eeb9b'];
        const symbol=emblem(recipient,asset,label,tint);
        if(reaction==='guard-gain')await shield(recipient,true);
        await animate(card,[{boxShadow:`0 0 0 ${tint}`},{boxShadow:`0 0 30px ${tint}`,offset:.4},{boxShadow:`0 0 0 ${tint}`}],880);
        await symbol;return;
      }
      const elementalMagic=d.magic&&element&&element!=='NONE';
      field.dataset.combat=elementalMagic?'magic':'physical';field.dataset.reaction=reaction;field.dataset.element=element;
      source.classList.add('combat-actor');target.classList.add('combat-target');
      const direction=d.side===0?1:-1;
      let attack;
      if(elementalMagic){
        attack=animate(sourceCard,[{filter:'brightness(1)',boxShadow:`0 0 0 ${color}`},{filter:'brightness(1.2)',boxShadow:`0 0 32px ${color}`,offset:.35},{filter:'brightness(1)',boxShadow:`0 0 0 ${color}`}],850);
        await magicFlight();
      }else{
        const distance=Math.min(74,sourceCard.clientWidth*.42)*direction;
        attack=animate(sourceCard,[{transform:'translateX(0)'},{transform:`translateX(${-12*direction}px) rotate(${-2*direction}deg)`,offset:.23},{transform:`translateX(${distance}px) rotate(${3*direction}deg)`,offset:.46},{transform:'translateX(0)',offset:1}],650);
        await wait(290);
      }
      if(signal.aborted)return;
      if(d.formula?.ward>0&&!before.duel?.formula?.ward)await shield(target,true);
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
  window.KalistarCombat={play,shatterKalistel,celebrateKill,cancelKillCelebration};
})();
