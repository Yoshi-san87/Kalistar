(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarLineupIntro=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const roles=Object.freeze(['TANK','DPS PHYSIQUE','MIDDLE','DPS MAGIQUE / DISTANCE','SUPPORT']);
  const timing=Object.freeze({title:60,depart:330,weapon:600,crystal:600,faction:600,suspense:80,flip:400,hold:400,arrive:330});
  const reducedTiming=Object.freeze({title:0,depart:0,weapon:280,crystal:280,faction:280,suspense:0,flip:120,hold:180,arrive:0});
  const clueKinds=Object.freeze(['weapon','crystal','faction']);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Read-only presentation data: native identity clues never inspect equipped weapons.
  function describe(state,cards,{elements={},asset=()=>null,url=p=>p}={}){
    const byId=new Map(cards.map(c=>[c.id,c]));
    return (state?.players||[]).map((p,side)=>p.board.map(u=>{
      const c=byId.get(u?.cardId);if(!c)return null;
      const element=elements[c.element],crystal=c.element&&c.element!=='NONE'&&element;
      return {uid:u.uid,cardId:c.id,name:c.name,captain:state.composition?.teams?.[side]?.captain===c.id,
        clues:{
          weapon:{title:'Arme',label:c.weapon||'Arme inconnue',icon:'sword',image:Number.isInteger(c.weapon_index)?url(asset('armes',String(c.weapon_index).padStart(2,'0'))):null,color:'#edce9a'},
          crystal:{title:'Cristal',label:crystal?element.label||c.element:'Sans cristal',icon:'circle-slash',image:crystal?url(asset('cristaux',c.element)):null,color:crystal&&/^[\da-f]{6}$/i.test(element.color)?'#'+element.color:'#bdcec9'},
          faction:{title:'Faction',label:c.faction||'Sans faction',icon:'flag',image:c.faction?url(asset('factions',c.faction)):null,color:'#e7d1ac'}
        }};
    }));
  }
  function play({shell,formations,cardBack,onComplete=()=>{},onSkip=()=>{},onExit=()=>{}}){
    if(!shell||formations.length!==2||formations.some(team=>team.length!==5||team.some(c=>!c?.node||!c.cardId)))throw Error('Formation de presentation incomplete.');
    const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,t=reduced?reducedTiming:timing;
    const abort=new AbortController(),animations=new Set(),clueFlights=new Set(),waiters=new Set(),movers=new Map(),actors=[],stacks=[];
    const dockDuration=reduced?0:160;
    const hidden=formations.flatMap(team=>team.map(c=>c.node.closest('.slot')||c.node));
    const inertNodes=[shell,document.querySelector('.masthead')].filter(Boolean).map(node=>({node,inert:node.inert}));
    const previousFocus=document.activeElement;let active=true,step='loading',position=0;
    const root=document.createElement('section');root.className='lineup-intro'+(reduced?' is-reduced':'');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Presentation des titulaires');
    root.innerHTML=`<div class="li-shade"></div><header class="li-header"><button class="li-exit icon-button" aria-label="Retour au menu" title="Retour au menu"><i data-lucide="arrow-left"></i></button><h2 class="li-title" aria-live="polite"></h2><button class="li-skip"><i data-lucide="skip-forward"></i>Passer</button></header><div class="li-stage"></div>`;
    const stage=root.querySelector('.li-stage'),title=root.querySelector('.li-title'),skip=root.querySelector('.li-skip');
    shell.classList.add('lineup-underlay');document.body.classList.add('lineup-opening');hidden.forEach(n=>n.classList.add('lineup-unrevealed'));inertNodes.forEach(({node})=>node.inert=true);
    document.body.append(root);globalThis.lucide?.createIcons();skip.focus({preventScroll:true});
    const field=shell.querySelector('.battlefield');field?.setAttribute('data-lineup-opening','true');
    function wait(ms){
      if(!active)return Promise.resolve(false);
      return new Promise(resolve=>{const item={timer:null,finish:()=>{clearTimeout(item.timer);waiters.delete(item);resolve(active);}};waiters.add(item);item.timer=setTimeout(item.finish,ms);});
    }
    function animate(node,frames,options){
      const a=node.animate(frames,options);animations.add(a);a.finished.catch(()=>{});return a;
    }
    function setRect(node,r){Object.assign(node.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});}
    function cardRect(card){return card.node.getBoundingClientRect();}
    function centre(side){
      const w=root.clientWidth,h=root.clientHeight,landscape=w>h&&w<=950&&h<=500;
      const header=landscape?skip.getBoundingClientRect().bottom+8:root.querySelector('.li-header').getBoundingClientRect().bottom;
      const dock=parseFloat(getComputedStyle(root).getPropertyValue('--li-dock-height'));
      const start=header+dock+12,gap=landscape?Math.max(230,w*.32):w<700?14:Math.min(100,w*.055);
      const height=Math.max(80,Math.min(650,h-start-44,(w-gap-32)/2*1388/797)),width=height*797/1388;
      const left=w/2+(side?gap/2:-gap/2-width);
      return {left,top:start+Math.max(0,(h-start-44-height)/2),width,height};
    }
    // Retarget a travelling clone from its current visual bounds on resize, retaining its deadline.
    function move(node,target,duration){
      if(!active)return Promise.resolve(false);
      return new Promise(resolve=>{
        const deadline=performance.now()+duration;let animation=null;
        const job={retarget(){
          const from=node.getBoundingClientRect(),to=target(),remaining=Math.max(0,deadline-performance.now());
          animation?.cancel();setRect(node,to);
          if(!remaining||reduced){movers.delete(node);resolve(active);return;}
          animation=animate(node,[{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},{transform:'none'}],{duration:remaining,easing:'cubic-bezier(.22,.7,.2,1)',fill:'both'});
          const current=animation;current.finished.then(()=>{if(animation!==current)return;current.cancel();movers.delete(node);resolve(active);},()=>{});
        },cancel(){animation?.cancel();movers.delete(node);resolve(false);}};
        movers.set(node,job);job.retarget();
      });
    }
    function resize(){
      if(!active)return;
      // A docked clue follows the card's CSS geometry even when a phone rotates mid-flight.
      for(const a of clueFlights)a.cancel();clueFlights.clear();
      stacks.forEach((node,side)=>setRect(node,cardRect(formations[side][4])));
      title.style.marginTop='0px';
      if(matchMedia('(max-width:699px), (max-width:950px) and (max-height:500px)').matches){
        const top=title.getBoundingClientRect().top;
        const end=Math.max(0,...stacks.map(n=>n.getBoundingClientRect()).filter(r=>r.top<root.clientHeight*.3).map(r=>r.bottom));
        title.style.marginTop=Math.max(0,end+14-top)+'px';
      }
      actors.forEach((a,side)=>{if(movers.has(a))movers.get(a).retarget();else if(a.isConnected)setRect(a,centre(side));});
    }
    function finish(reason){
      if(!active)return;active=false;abort.abort();observer.disconnect();
      for(const item of [...waiters])item.finish();for(const job of [...movers.values()])job.cancel();
      for(const a of animations)a.cancel();animations.clear();clueFlights.clear();
      hidden.forEach(n=>n.classList.remove('lineup-unrevealed'));shell.classList.remove('lineup-underlay');document.body.classList.remove('lineup-opening');field?.removeAttribute('data-lineup-opening');
      inertNodes.forEach(({node,inert})=>node.inert=inert);root.remove();
      if(reason==='complete'||reason==='skip'){
        const target=previousFocus?.isConnected&&previousFocus.getClientRects().length&&!previousFocus.closest('[inert]')?previousFocus:shell.querySelector('.slot-card');target?.focus({preventScroll:true});
        (reason==='skip'?onSkip:onComplete)();
      }
    }
    const observer=new ResizeObserver(resize);observer.observe(shell);window.addEventListener('resize',resize,{signal:abort.signal});window.visualViewport?.addEventListener('resize',resize,{signal:abort.signal});
    const block=event=>{if(!active||root.contains(event.target))return;event.preventDefault();event.stopImmediatePropagation();};
    for(const type of ['click','pointerdown','input','change','submit'])document.addEventListener(type,block,{capture:true,signal:abort.signal});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish('skip');return;}
      if(event.key==='Tab'){
        const exit=root.querySelector('.li-exit');if(event.shiftKey&&document.activeElement===exit){event.preventDefault();skip.focus();}else if(!event.shiftKey&&document.activeElement===skip){event.preventDefault();exit.focus();}
      }else if(!root.contains(event.target)||!['Enter',' '].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}
    },{capture:true,signal:abort.signal});
    skip.addEventListener('click',()=>finish('skip'),{signal:abort.signal});
    root.querySelector('.li-exit').addEventListener('click',()=>{finish('exit');onExit();},{signal:abort.signal});
    root.addEventListener('error',event=>{if(event.target instanceof HTMLImageElement){event.target.hidden=true;event.target.parentElement.classList.add('li-asset-missing');}}, {capture:true,signal:abort.signal});
    function mark(next){step=next;root.dataset.step=next;root.dataset.position=String(position+1);root.dispatchEvent(new CustomEvent('kalistar:lineup-step',{bubbles:true,detail:{position:position+1,step:next}}));}
    function actor(card,side){
      const node=document.createElement('article');node.className='li-flight';node.dataset.side=String(side);node.dataset.cardId=card.cardId;node.setAttribute('aria-label',side?'Adversaire, carte cachee':'Joueur, carte cachee');
      node.innerHTML=`<div class="li-rotor"><div class="li-back"><img class="li-card-back" src="${esc(cardBack)}" alt="Dos de carte Kalistar"></div><div class="li-front"></div></div><div class="li-clues">${clueKinds.map((kind,index)=>{
        const value=card.clues[kind];
        return `<div class="li-clue li-clue-${kind}" data-kind="${kind}" style="--clue-index:${index};--clue-color:${esc(value.color)}" hidden aria-label="${esc(value.title+': '+value.label)}"><small>${esc(value.title)}</small><span class="li-clue-symbol">${value.image?`<img src="${esc(value.image)}" alt="">`:''}<i class="li-fallback" data-lucide="${esc(value.icon)}" aria-hidden="true"></i></span><b>${esc(value.label)}</b></div>`;
      }).join('')}</div><span class="li-side">${side?'ADVERSAIRE':'JOUEUR'}</span>${card.captain?'<span class="li-captain-label" aria-hidden="true">CAPITAINE</span>':''}`;
      const face=card.node.cloneNode(true);face.inert=true;face.tabIndex=-1;
      for(const n of [face,...face.querySelectorAll('*')])for(const name of n.getAttributeNames())if(name==='id'||name.startsWith('data-action')||name==='aria-pressed')n.removeAttribute(name);
      node.querySelector('.li-front').append(face);stage.append(node);setRect(node,reduced?centre(side):cardRect(formations[side][4]));return node;
    }
    function clue(kind){
      actors.forEach(node=>{const host=node.querySelector(`[data-kind="${kind}"]`);host.hidden=false;host.classList.add('is-presenting');});
      globalThis.lucide?.createIcons();mark(kind);
    }
    function dockClue(kind){
      actors.forEach(node=>{
        const host=node.querySelector(`[data-kind="${kind}"]`),parts=[host.querySelector('.li-clue-symbol'),host.querySelector('b')];
        const before=parts.map(n=>n.getBoundingClientRect());host.classList.replace('is-presenting','is-pinned');
        if(!dockDuration)return;
        parts.forEach((part,i)=>{
          const from=before[i],to=part.getBoundingClientRect();
          const a=animate(part,[{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},{transform:'none'}],{duration:dockDuration,easing:'cubic-bezier(.22,.7,.2,1)'});
          clueFlights.add(a);a.finished.then(()=>{a.cancel();animations.delete(a);clueFlights.delete(a);},()=>{animations.delete(a);clueFlights.delete(a);});
        });
      });
    }
    async function run(){
      try{
        title.textContent='P1 \u00b7 '+roles[0];mark('loading');
        for(let side=0;side<2;side++){
          const pile=document.createElement('div');pile.className='li-stack';pile.setAttribute('aria-hidden','true');
          pile.innerHTML=Array.from({length:3},(_,i)=>`<img src="${esc(cardBack)}" alt="" style="--pile:${i}">`).join('');stage.append(pile);stacks.push(pile);
        }resize();
        // Bounded preparation: images continue loading during the identity suspense.
        await Promise.race([Promise.all([...shell.querySelectorAll('.slot-card>img')].map(img=>img.decode().catch(()=>{}))),wait(300)]);
        for(position=0;position<5&&active;position++){
          title.textContent='P'+(position+1)+' \u00b7 '+roles[position];mark('title');if(!await wait(t.title))return;
          actors.splice(0,actors.length,...formations.map((team,side)=>actor(team[position],side)));
          mark('depart');if(!(await Promise.all(actors.map((n,side)=>move(n,()=>centre(side),t.depart)))).every(Boolean))return;
          // Docking is included in each 600 ms clue beat, not added to the total duration.
          for(const kind of clueKinds){clue(kind);if(!await wait(t[kind]-dockDuration))return;dockClue(kind);if(!await wait(dockDuration))return;}
          mark('suspense');root.classList.add('li-dim');if(!await wait(t.suspense))return;
          mark('flip');
          actors.forEach(n=>{n.classList.add('is-flipping');if(!reduced)animate(n.querySelector('.li-rotor'),[{transform:'rotateY(0deg)'},{transform:'rotateY(180deg)'}],{duration:t.flip,easing:'ease-in-out',fill:'forwards'});else n.classList.add('is-revealed');});
          if(!await wait(t.flip/2))return;
          root.classList.remove('li-dim');if(!reduced){root.classList.add('li-reveal-accent');animate(root.querySelector('.li-shade'),[{opacity:.7},{opacity:.38},{opacity:.58}],{duration:150});}
          if(!await wait(t.flip/2))return;
          root.classList.remove('li-reveal-accent');mark('reveal');
          actors.forEach((n,side)=>{const card=formations[side][position];n.classList.add('is-revealed');n.setAttribute('aria-label',(side?'Adversaire : ':'Joueur : ')+card.name+(card.captain?', capitaine':''));});
          if(!await wait(t.hold))return;
          mark('arrive');actors.forEach(n=>n.classList.add('is-placing'));
          if(!reduced&&!(await Promise.all(actors.map((n,side)=>move(n,()=>cardRect(formations[side][position]),t.arrive)))).every(Boolean))return;
          formations.forEach(team=>(team[position].node.closest('.slot')||team[position].node).classList.remove('lineup-unrevealed'));
          for(const a of [...animations])if(actors.some(n=>n.contains(a.effect?.target))){a.cancel();animations.delete(a);}
          actors.forEach(n=>n.remove());actors.length=0;
        }
        if(active)finish('complete');
      }catch(error){if(active){console.error('Lineup presentation:',error);finish('skip');}}
    }
    run();return {skip:()=>finish('skip'),destroy:()=>finish('destroy'),get active(){return active;},get step(){return step;}};
  }
  return Object.freeze({roles,timing,reducedTiming,describe,play});
});
