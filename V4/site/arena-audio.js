(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarArenaAudio=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KEY='kalistar.arena-audio.v1';
  const cues=Object.freeze({
    engage:[[110,165,.36,.17],[440,660,.45,.045]],
    roll:[[180,72,.32,.07],[1800,320,.25,.045,'noise']],
    land:[[660,440,.18,.07],[1320,880,.24,.025]],
    strike:[[130,44,.25,.22],[1600,180,.15,.10,'noise']],
    shield:[[880,620,.34,.09],[1320,930,.46,.04]],
    magic:[[330,990,.50,.07],[660,1320,.60,.035]],
    support:[[440,660,.35,.065],[660,880,.50,.04]],
    defeat:[[164,82,.48,.12],[880,220,.35,.025]],
    dodge:[[1100,1800,.22,.045,'noise']],
    victory:[[330,330,.65,.07],[440,440,.72,.05],[660,660,.85,.04]]
  });
  function preference(value){return {enabled:typeof value?.enabled==='boolean'?value.enabled:true,volume:Number.isFinite(value?.volume)?Math.max(0,Math.min(.4,value.volume)):.20};}
  function create({host=window,doc=host.document}={}){
    let saved;try{saved=JSON.parse(host.localStorage.getItem(KEY));}catch{}
    let settings=preference(saved),active=false,dead=false,unlocked=false,context=null,noise=null,timer=null,generation=0;
    const voices=new Set(),events=new AbortController();
    const listen=(node,name,fn,capture=false)=>node.addEventListener(name,fn,{capture,signal:events.signal});
    const eligible=()=>active&&!dead&&!doc.hidden&&settings.enabled&&settings.volume>0&&/^#arena(?:$|[/?])/.test(host.location.hash)&&!doc.querySelector('dialog[open],.lineup-intro');
    const snapshot=()=>({...settings,voices:voices.size,state:context?.state||'dormant'});
    function update(){
      for(const n of doc.querySelectorAll('[data-arena-sound-enabled]'))n.checked=settings.enabled;
      for(const n of doc.querySelectorAll('[data-arena-sound-volume]'))n.value=String(Math.round(settings.volume*100));
      for(const n of doc.querySelectorAll('[data-arena-sound-level]'))n.textContent=Math.round(settings.volume*100)+' %';
    }
    function stop(){
      generation++;host.clearTimeout(timer);timer=null;
      for(const voice of [...voices])voice.stop();
      host.clearTimeout(timer);timer=null;
      if(context?.state==='running')void context.suspend().catch(()=>{});
    }
    function idle(){
      if(dead||!active||doc.hidden)return;
      host.clearTimeout(timer);timer=host.setTimeout(()=>{timer=null;if(!voices.size&&context?.state==='running')void context.suspend().catch(()=>{});},1000);
    }
    function prepare(){
      if(context)return context;
      const Context=host.AudioContext||host.webkitAudioContext;if(!Context)return null;
      context=new Context({latencyHint:'interactive'});
      noise=context.createBuffer(1,Math.ceil(context.sampleRate*.65),context.sampleRate);
      const data=noise.getChannelData(0);let seed=31;
      for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296)*2-1;}
      return context;
    }
    function unlock(event){
      if(!event.isTrusted||!active||dead)return;
      unlocked=true;if(!eligible())return;
      try{const ctx=prepare();if(ctx)void ctx.resume().then(()=>{if(!eligible())stop();else idle();}).catch(()=>{});}catch{}
    }
    async function play(name,{signal}={}){
      if(!eligible()||!unlocked||signal?.aborted||!cues[name]||voices.size>=4)return false;
      const ticket=generation;let ctx;
      try{ctx=prepare();if(!ctx)return false;await ctx.resume();}catch{return false;}
      if(ticket!==generation||!eligible()||signal?.aborted||voices.size>=4){if(!eligible())stop();else idle();return false;}
      const nodes=[],voice={stop:()=>{for(const [source,gain]of nodes){source.onended=null;try{source.stop();}catch{}source.disconnect();gain.disconnect();}voices.delete(voice);signal?.removeEventListener('abort',voice.stop);idle();}};
      voices.add(voice);signal?.addEventListener('abort',voice.stop,{once:true});let remaining=cues[name].length;
      try{
        for(const [from,to,duration,level,type]of cues[name]){
          const gain=ctx.createGain(),source=type==='noise'?ctx.createBufferSource():ctx.createOscillator(),now=ctx.currentTime;
          if(type==='noise')source.buffer=noise;else{source.type='sine';source.frequency.setValueAtTime(from,now);source.frequency.exponentialRampToValueAtTime(to,now+duration);}
          gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,level*settings.volume),now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
          source.connect(gain);gain.connect(ctx.destination);nodes.push([source,gain]);
          source.onended=()=>{source.disconnect();gain.disconnect();if(!--remaining){voices.delete(voice);signal?.removeEventListener('abort',voice.stop);idle();}};
          source.start(now);source.stop(now+duration+.02);
        }
        return true;
      }catch{voice.stop();return false;}
    }
    function set(value){settings=preference({...settings,...value});try{host.localStorage.setItem(KEY,JSON.stringify(settings));}catch{}stop();update();}
    listen(doc,'pointerdown',unlock,true);listen(doc,'keydown',unlock,true);
    listen(doc,'input',event=>{
      if(event.target.matches('[data-arena-sound-enabled]'))set({enabled:event.target.checked});
      if(event.target.matches('[data-arena-sound-volume]'))set({volume:Number(event.target.value)/100});
    });
    listen(doc,'visibilitychange',()=>{if(doc.hidden)stop();});listen(host,'hashchange',stop);listen(host,'kalistar-overlay',()=>{if(!eligible())stop();});
    listen(host,'storage',event=>{if(event.key===KEY||event.key===null){try{settings=preference(JSON.parse(host.localStorage.getItem(KEY)));}catch{settings=preference();}stop();update();}});
    listen(host,'pagehide',event=>{if(event.persisted){active=false;stop();}else destroy();});listen(host,'pageshow',event=>{if(event.persisted&&!dead)active=true;});
    function destroy(){if(dead)return;dead=true;active=false;stop();events.abort();if(context)void context.close().catch(()=>{});context=noise=null;}
    return Object.freeze({activate(){if(!dead){active=true;update();}},refresh(){update();if(!eligible())stop();},play,set,snapshot,destroy});
  }
  function controls(value){const s=preference(value);return `<section class="account-section"><h3>Sons de l’arène</h3><div class="account-form"><label class="account-check"><input type="checkbox" data-arena-sound-enabled ${s.enabled?'checked':''}><span>Effets sonores<small>Sur cet appareil</small></span></label><label class="account-music-volume"><span>Volume <output data-arena-sound-level>${Math.round(s.volume*100)} %</output></span><input type="range" min="0" max="40" step="1" value="${Math.round(s.volume*100)}" data-arena-sound-volume aria-label="Volume des effets sonores"></label></div></section>`;}
  return Object.freeze({create,controls,preference,KEY});
});
