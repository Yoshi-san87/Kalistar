(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarDeparture=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function profileFor({magic,element,weapon=''}={}){
    const family=magic?({PYRO:'ash',HYDRO:'tide',AERO:'wind',CRYO:'ice',MINERO:'stone',GEO:'stone',HERBO:'leaf',HEMATO:'blood',NECRO:'shadow',LUXO:'light',RAINBOW:'prism',ELECTRO:'arc'}[element]||'aether'):/hache|marteau|poing|masse|fléau/i.test(weapon)?'shatter':/arc|lance|projectile|gun/i.test(weapon)?'pierce':/instrument|baton|bâton|sceptre|tome|orbe/i.test(weapon)?'aether':'cut';
    const colors={ash:'#ffab69',tide:'#85e2ee',wind:'#b8edd4',ice:'#b5e8ff',stone:'#c6bca4',leaf:'#b5d68e',blood:'#db718b',shadow:'#b4a1d8',light:'#fff0c4',prism:'#c0e9ef',arc:'#ffe4a1',aether:'#d7d4e8',cut:'#dfcbb2',shatter:'#c4b9a2',pierce:'#b9d7cb'};
    return {family,color:colors[family],duration:['stone','shatter','ice'].includes(family)?820:940};
  }
  function changed(before,after){
    if(!before||!after||before.matchId!==after.matchId)return [];
    return after.players.flatMap((player,side)=>{
      const old=new Set(before.players[side].dead.map(u=>u.uid)),dead=new Set(player.dead.filter(u=>!old.has(u.uid)).map(u=>u.uid));
      return before.players[side].board.flatMap((unit,slot)=>unit&&dead.has(unit.uid)?[{uid:unit.uid,side,slot}]:[]);
    });
  }
  async function play({node,magic,element,weapon,reduced=false,signal}){
    if(!node||signal?.aborted||document.hidden)return false;
    const profile=profileFor({magic,element,weapon}),image=node.querySelector('img'),r=image?.getBoundingClientRect(),release=window.KalistarFocus?.spotlight(node.closest('.slot'),signal)||(()=>{});
    if(reduced||!image?.complete||!image.naturalWidth||!r?.width){
      const fade=node.animate([{opacity:1},{opacity:0}],{duration:reduced?80:200,fill:'forwards'}),abort=()=>fade.cancel();signal?.addEventListener('abort',abort,{once:true});
      try{await fade.finished.catch(()=>{});return !signal?.aborted;}finally{fade.cancel();signal?.removeEventListener('abort',abort);release();}
    }
    const pad=42,left=Math.max(0,r.left-pad),top=Math.max(0,r.top-pad),width=Math.min(innerWidth,r.right+pad)-left,height=Math.min(innerHeight,r.bottom+pad)-top;
    if(width<=0||height<=0){release();return true;}
    const canvas=document.createElement('canvas');canvas.className='combat-departure';canvas.dataset.mode=profile.family;canvas.setAttribute('aria-hidden','true');
    const dpr=Math.min(devicePixelRatio||1,1.25);canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);
    Object.assign(canvas.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});document.body.append(canvas);
    const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();release();return false;}ctx.scale(dpr,dpr);
    const columns=innerWidth<700?6:8,rows=12,tiles=[];
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const seed=(((y*columns+x)*73+19)%101)/101;tiles.push({x,y,seed,angle:(seed-.5)*1.8,delay:profile.family==='ash'?(1-y/rows)*.3:seed*.16});}
    const fade=node.animate([{opacity:1},{opacity:0,offset:.3},{opacity:0}],{duration:profile.duration,fill:'forwards'}),events=new AbortController();
    let finish,timer=0,unsubscribe=null,done=false;const started=performance.now(),completion=new Promise(resolve=>{finish=resolve;});
    function clean(){if(done)return;done=true;clearTimeout(timer);unsubscribe?.();events.abort();canvas.remove();fade.cancel();release();finish(!signal?.aborted);}
    signal?.addEventListener('abort',clean,{once:true});window.addEventListener('resize',clean,{once:true,signal:events.signal});document.addEventListener('visibilitychange',()=>{if(document.hidden)clean();},{signal:events.signal});
    window.addEventListener('hashchange',clean,{once:true,signal:events.signal});window.addEventListener('pagehide',clean,{once:true,signal:events.signal});
    matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',clean,{once:true,signal:events.signal});
    function draw(now){
      const t=Math.min(1,Math.max(0,(now-started)/profile.duration));ctx.clearRect(0,0,width,height);const cw=r.width/columns,ch=r.height/rows;
      // The fragments sample the real card, never a replacement artwork or confetti.
      for(const tile of tiles){
        const q=Math.max(0,Math.min(1,(t-tile.delay)/(1-tile.delay))),e=q*q,side=tile.x<columns/2?-1:1;let dx=0,dy=0,spin=tile.angle*q,scale=1-q*.2;
        switch(profile.family){
          case 'ash':dy=-80*e;dx=Math.sin(q*5+tile.seed*8)*18*q;scale=1-q*.85;break;
          case 'tide':dx=Math.sin(tile.y*.6+q*5)*35*e;dy=70*e;scale=1-q*.65;break;
          case 'wind':dx=side*110*e;dy=-35*e;spin=q*tile.angle*.5;break;
          case 'stone':case 'shatter':dx=side*(16+tile.seed*34)*e;dy=(40+tile.seed*55)*e;break;
          case 'ice':dx=side*(35+tile.seed*35)*e;dy=(tile.seed-.35)*90*e;scale=1-q*.55;break;
          case 'leaf':dx=Math.sin(q*4+tile.seed*6)*30*q;dy=-50*e;scale=1-q*.75;break;
          case 'blood':case 'shadow':dx=(columns/2-tile.x)*cw*.7*e;dy=(rows/2-tile.y)*ch*.5*e;scale=1-q*.7;break;
          case 'light':case 'prism':case 'aether':dy=-55*e;dx=Math.sin(tile.seed*6+q*3)*14*q;scale=1-q*.8;break;
          case 'arc':dx=(tile.seed>.5?1:-1)*Math.floor(q*7)*4;dy=-25*e;scale=1-q*.65;break;
          case 'pierce':dx=side*12*e;dy=65*e;scale=1-q*.8;break;
          default:dx=side*35*e;dy=(tile.y/rows-.5)*18*e;spin=side*.08*q;
        }
        ctx.save();ctx.globalAlpha=Math.max(0,1-q*1.25);ctx.translate(r.left-left+(tile.x+.5)*cw+dx,r.top-top+(tile.y+.5)*ch+dy);ctx.rotate(spin);ctx.scale(scale,scale);
        ctx.drawImage(image,tile.x*image.naturalWidth/columns,tile.y*image.naturalHeight/rows,image.naturalWidth/columns,image.naturalHeight/rows,-cw/2,-ch/2,cw+.5,ch+.5);
        if(q>.25&&q<.9&&tile.seed>.72){ctx.globalAlpha=Math.sin(q*Math.PI)*.65;ctx.fillStyle=profile.color;ctx.fillRect(-1,-1,2,profile.family==='ice'?5:2);}ctx.restore();
      }
      if(t>=1)clean();
    }
    draw(started);unsubscribe=window.KalistarAmbience?.subscribe(draw);timer=setTimeout(clean,profile.duration+150);
    try{return await completion;}finally{signal?.removeEventListener('abort',clean);clean();}
  }
  return Object.freeze({profileFor,changed,play});
});
