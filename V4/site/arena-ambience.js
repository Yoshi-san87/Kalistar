(() => {
  'use strict';
  const motion=matchMedia('(prefers-reduced-motion:reduce)');
  const phone=matchMedia('(max-width:699px), (max-width:950px) and (max-height:500px)');
  const profiles={
    AERO:{color:'#d6e8df',motions:['wind','mist'],count:12},
    HYDRO:{color:'#99dbe4',motions:['spray','water'],count:14},
    ELECTRO:{color:'#e5ce83',motions:['mote','spark'],count:12},
    PYRO:{color:'#edab76',motions:['ember','smoke'],count:12},
    CRYO:{color:'#d5edf2',motions:['snow','ice','mist'],count:14},
    LUXO:{color:'#eddda6',motions:['mote','light'],count:12},
    MINERO:{color:'#c5b697',motions:['dust','smoke','spark'],count:14},
    HERBO:{color:'#b3d594',motions:['leaf','pollen','mist'],count:14},
    HEMATO:{color:'#c996a6',motions:['mote','mist'],count:10},
    NECRO:{color:'#acabc2',motions:['ash','smoke'],count:12},
    GEO:{color:'#cdbb95',motions:['dust','mist'],count:14},
    RAINBOW:{color:'#ded2c5',motions:['mote','prism'],count:12},
    NONE:{color:'#bbc5b6',motions:['dust','mist'],count:10}
  };
  // Non-elemental places and crossovers can override ambience without changing arena data.
  const places={z13:'MINERO','trone-fer':'MINERO',astraball:'GEO',ruins:'NONE',
    'ff7-midgar':'ELECTRO','ff8-deling-parade':'LUXO','nier-amusement-park':'LUXO'};
  let field=null,canvas=null,shade=null,light=null,ctx=null,observer=null,frame=0,last=0;
  let profile=profiles.NONE,width=0,height=0,ratio=1,particles=[],lockUntil=0,hit=null,shake=null,sizeKey='';
  const listeners=new Set();
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const profileFor=arena=>profiles[places[arena?.id]||arena?.element]||profiles.NONE;
  function stateFor(game,engine){
    if(!game||['setup','over'].includes(game.phase))return {last:[],imminent:[]};
    const last=game.players.flatMap((p,side)=>p.board.filter(Boolean).length===1?[side]:[]);
    // Ask the existing end/replacement resolver on a disposable copy; never touch RNG or the live match.
    const imminent=last.filter(side=>{
      const probe=engine.clone(game),player=probe.players[side];
      player.dead.push(...player.board.filter(Boolean));player.board=player.board.map(()=>null);
      probe.duel=null;probe.phase='result';engine.next(probe);
      return probe.phase==='over'&&probe.winner===1-side;
    });
    return {last,imminent};
  }
  function schedule(){
    if(!frame&&!document.hidden&&!motion.matches&&(field||listeners.size))frame=requestAnimationFrame(tick);
  }
  function refresh(){
    if(document.hidden)return;
    const now=performance.now();draw(now);for(const fn of listeners)fn(now);schedule();
  }
  function tick(now){
    frame=0;if(document.hidden)return;
    if(now-last>=32){last=now;draw(now);for(const fn of listeners)fn(now);}
    schedule();
  }
  function subscribe(fn){listeners.add(fn);refresh();return ()=>{listeners.delete(fn);if(!field&&!listeners.size){cancelAnimationFrame(frame);frame=0;}};}
  function clearReaction(){hit=null;shake?.cancel();shake=null;if(light)light.style.opacity='0';}
  function resize(){
    if(!field)return;
    const key=[field.clientWidth,field.clientHeight,devicePixelRatio,phone.matches].join(',');if(key===sizeKey)return;sizeKey=key;
    clearReaction();lockUntil=0;delete field.dataset.awakening;
    width=field.clientWidth;height=field.clientHeight;ratio=Math.min(devicePixelRatio||1,phone.matches?1.25:1.5);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    particles=Array.from({length:Math.ceil(profile.count*(phone.matches ? .5 : 1))},(_,i)=>({
      x:(i*.618034+.17)%1,y:(i*.414214+.29)%1,size:.8+i%3*.5,speed:2+i%4,phase:i*2.39996
    }));refresh();
  }
  function draw(now){
    if(!field||!ctx)return;
    if(lockUntil&&now>=lockUntil){lockUntil=0;delete field.dataset.awakening;}
    if(hit){const progress=clamp((now-hit.start)/hit.duration,0,1);light.style.opacity=String(Math.sin(progress*Math.PI)*hit.strength);if(progress===1)clearReaction();}
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    if(motion.matches)return;
    const t=now/1000,quiet=field.dataset.presentation==='action' ? .42 : lockUntil ? .6 : 1;
    ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);
    // Mask the real moving card bounds and console, including labels: ambience never crosses printed stats.
    const base=field.getBoundingClientRect();
    for(const node of field.querySelectorAll('.slot-card,.duel-console,.reserve-card')){
      const r=node.getBoundingClientRect();ctx.rect(r.left-base.left-8,r.top-base.top-24,r.width+16,r.height+50);
    }
    ctx.clip('evenodd');ctx.strokeStyle=profile.color;ctx.fillStyle=profile.color;ctx.lineWidth=.7;
    const kinds=profile.motions.filter(kind=>!['mist','smoke','water','light','prism'].includes(kind));
    for(const [i,p] of particles.entries()){
      const kind=kinds[i%kinds.length]||'mote';
      const x=(p.x*width+t*p.speed*.9)%width,y=(p.y*height+(kind==='snow'?t*p.speed*1.8:Math.sin(t*.19+p.phase)*14))%height;
      const fade=.5+.5*Math.sin(t*.31+p.phase);ctx.globalAlpha=(kind==='spark' ? .12*Math.pow(fade,14) : .06+fade*.1)*quiet;
      ctx.save();ctx.translate(x,y);
      if(kind==='wind'){ctx.beginPath();ctx.moveTo(-15,0);ctx.quadraticCurveTo(0,-3,18,-1);ctx.stroke();}
      else if(kind==='spark'){ctx.beginPath();ctx.moveTo(-3,2);ctx.lineTo(0,-2);ctx.lineTo(2,1);ctx.lineTo(4,-3);ctx.stroke();}
      else if(kind==='leaf'){ctx.rotate(p.phase+t*.1);ctx.beginPath();ctx.ellipse(0,0,2,4,0,0,Math.PI*2);ctx.fill();}
      else if(kind==='ice'){ctx.rotate(p.phase);ctx.strokeRect(-1.5,-1.5,3,3);}
      else if(kind==='spray'){ctx.beginPath();ctx.ellipse(0,0,.7,1.8,-.2,0,Math.PI*2);ctx.fill();}
      else{ctx.beginPath();ctx.arc(0,0,p.size,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
    const veil=profile.motions.find(kind=>['mist','smoke','water','light','prism'].includes(kind));
    if(veil){
      const y=height*((veil==='light'||veil==='prism') ? .28 : .79)+Math.sin(t*.09)*height*.025;
      const glow=ctx.createLinearGradient(0,y-38,0,y+38);glow.addColorStop(0,'transparent');glow.addColorStop(.5,profile.color);glow.addColorStop(1,'transparent');
      ctx.globalAlpha=(veil==='water' ? .026 : .018)*quiet;ctx.fillStyle=glow;ctx.fillRect(0,y-38,width,76);
    }
    ctx.restore();
  }
  function destroy(){
    observer?.disconnect();observer=null;clearReaction();lockUntil=0;
    canvas?.remove();shade?.remove();light?.remove();
    if(field){
      delete field.dataset.presentation;delete field.dataset.awakening;delete field.dataset.tension;delete field.dataset.lastStanding;
      field.querySelectorAll('.last-combatant,.match-point').forEach(node=>node.classList.remove('last-combatant','match-point'));
    }
    field=canvas=shade=light=ctx=null;particles=[];sizeKey='';
    if(!listeners.size){cancelAnimationFrame(frame);frame=0;}last=0;
  }
  function mount(node,{arena,game,engine}={}){
    destroy();if(!node||game?.phase==='over')return;
    field=node;profile=profileFor(arena);canvas=document.createElement('canvas');canvas.className='arena-ambience';ctx=canvas.getContext('2d');
    shade=document.createElement('div');shade.className='arena-tension';light=document.createElement('div');light.className='arena-arrival';
    for(const node of [canvas,shade,light]){node.setAttribute('aria-hidden','true');field.append(node);}
    const state=stateFor(game,engine);
    field.dataset.tension=String(!!state.imminent.length);field.dataset.lastStanding=String(!!state.last.length);
    field.dataset.presentation=game?.phase==='result'?'resolved':game?.duel?'duel':field.querySelector('.challenger')?'selection':'rest';
    for(const side of state.last)field.querySelector(`.formation[data-player="${side}"] .slot[data-unit]:not([data-unit=""])`)?.classList.add('last-combatant');
    if(state.imminent.length)field.querySelectorAll('.challenger').forEach(node=>node.classList.add('match-point'));
    observer=new ResizeObserver(resize);observer.observe(field);resize();
  }
  function engage(){if(!field)return;field.dataset.presentation='duel';if(!motion.matches){lockUntil=performance.now()+800;field.dataset.awakening='true';}refresh();}
  function action(){if(!field)return;lockUntil=0;delete field.dataset.awakening;field.dataset.presentation='action';refresh();}
  function react({magic=false,color='#e8dccb',major=false,defeat=false}={}){
    if(!field||document.hidden||motion.matches)return;
    clearReaction();light.style.setProperty('--arrival-color',color);
    hit={start:performance.now(),duration:magic?220:180,strength:magic ? .10 : defeat ? .035 : 0};
    if(major)shake=field.animate([{transform:'translate(0,0)'},{transform:'translate(1.5px,-1px)',offset:.25},{transform:'translate(-1px,.5px)',offset:.55},{transform:'translate(0,0)'}],{duration:140,easing:'ease-out'});
    refresh();
  }
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;clearReaction();lockUntil=0;if(field)delete field.dataset.awakening;if(!document.hidden)refresh();});
  motion.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;clearReaction();lockUntil=0;if(field)delete field.dataset.awakening;refresh();});
  phone.addEventListener('change',resize);window.addEventListener('pagehide',destroy);
  window.KalistarAmbience={mount,destroy,engage,action,react,clearReaction,subscribe,refresh,profileFor,stateFor,
    inspect:()=>({running:!!frame,subscribers:listeners.size,particles:motion.matches?0:particles.length,dpr:ratio,profile:profile.motions.slice(),awakening:!!lockUntil,reaction:!!hit})};
})();
