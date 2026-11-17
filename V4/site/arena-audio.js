(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarArenaAudio=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KEY='kalistar.arena-audio.v1',BASE='assets/audio/arena-jrpg-v1/';
  const elements=Object.freeze(['ELECTRO','PYRO','HYDRO','AERO','CRYO','MINERO','GEO','HERBO','HEMATO','NECRO','LUXO','RAINBOW']);
  const common=Object.freeze(['engage','roll','strike','shield','defeat']);
  const cues=Object.freeze({engage:{asset:'engage'},roll:{asset:'roll',duration:.65,level:.65},land:{asset:'shield',duration:.16,rate:1.6,level:.4},strike:{asset:'strike'},shield:{asset:'shield',level:.85},defeat:{asset:'defeat',level:.75},cast:{asset:'engage',duration:.6,rate:.9,level:.45},swing:{asset:'AERO',duration:.17,rate:1.5,level:.5},support:{asset:'LUXO',rate:1.2,level:.6},dodge:{asset:'AERO',duration:.45,rate:1.3,level:.6},victory:{asset:'RAINBOW',rate:.9,level:.85}});
  function resolve(name,element){return name==='magic'?{asset:elements.includes(element)?element:'RAINBOW'}:Object.hasOwn(cues,name)?{...cues[name]}:null;}
  function preference(value){return {enabled:typeof value?.enabled==='boolean'?value.enabled:true,volume:Number.isFinite(value?.volume)?Math.max(0,Math.min(.4,value.volume)):.30};}
  function create({host=window,doc=host.document}={}){
    let saved;try{saved=JSON.parse(host.localStorage.getItem(KEY));}catch{}
    let settings=preference(saved),active=false,dead=false,unlocked=false,context=null,master=null,limiter=null,timer=null,generation=0,pending=0;
    const voices=new Set(),files=new Map(),records=new Map(),events=new AbortController(),downloads=new AbortController();
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
      master=context.createGain();master.gain.value=settings.volume;limiter=context.createDynamicsCompressor();
      limiter.threshold.value=-7;limiter.knee.value=3;limiter.ratio.value=12;limiter.attack.value=.002;limiter.release.value=.15;
      master.connect(limiter);limiter.connect(context.destination);
      return context;
    }
    function download(asset){
      if(!files.has(asset))files.set(asset,(async()=>{
        const request=new AbortController(),abort=()=>request.abort(),timeout=host.setTimeout(abort,2000);
        downloads.signal.addEventListener('abort',abort,{once:true});
        try{
          const response=await host.fetch(BASE+asset+'.mp3',{credentials:'same-origin',cache:'force-cache',signal:request.signal});if(!response.ok)return null;
          const bytes=await response.arrayBuffer();if(dead||bytes.byteLength>300000)return null;
          return bytes;
        }catch{return null;}finally{host.clearTimeout(timeout);downloads.signal.removeEventListener('abort',abort);}
      })());
      return files.get(asset);
    }
    function load(asset){
      if(!records.has(asset))records.set(asset,(async()=>{
        try{const bytes=await download(asset);if(!bytes||dead)return null;const buffer=await context.decodeAudioData(bytes.slice(0));if(dead||buffer.duration<=0||buffer.duration>2.5||buffer.numberOfChannels>2||buffer.length*buffer.numberOfChannels*4>1000000)return null;return buffer;}catch{return null;}
      })());
      return records.get(asset);
    }
    const visibleElements=()=>[...doc.querySelectorAll('.formation .slot[data-element]')].map(n=>n.dataset.element).filter(value=>elements.includes(value));
    function prefetch(){if(eligible())for(const asset of new Set([...common,...visibleElements()]))void download(asset);}
    function warm(values=[]){
      if(!eligible()||!unlocked)return;
      try{if(!prepare())return;for(const asset of new Set([...common,...values.filter(value=>elements.includes(value))]))void load(asset);}catch{}
    }
    function unlock(event){
      if(!event.isTrusted||!active||dead)return;
      unlocked=true;if(!eligible())return;
      try{const ctx=prepare();if(ctx){void ctx.resume().then(()=>{if(!eligible())stop();else idle();}).catch(()=>{});warm(visibleElements());}}catch{}
    }
    async function play(name,{signal,element}={}){
      const cue=resolve(name,element);
      if(!eligible()||!unlocked||signal?.aborted||!cue||voices.size+pending>=4)return false;
      const ticket=generation,started=Date.now();let ctx,buffer;pending++;
      try{ctx=prepare();if(!ctx)return false;buffer=await load(cue.asset);if(!buffer||ticket!==generation||!eligible()||signal?.aborted||Date.now()-started>350)return false;await ctx.resume();}catch{return false;}
      finally{pending--;}
      if(ticket!==generation||!eligible()||signal?.aborted||voices.size>=4){if(!eligible())stop();else idle();return false;}
      let source,gain,ended=false;
      try{source=ctx.createBufferSource();gain=ctx.createGain();}catch{source?.disconnect();idle();return false;}
      const clean=()=>{if(ended)return;ended=true;source.onended=null;source.disconnect();gain.disconnect();voices.delete(voice);signal?.removeEventListener('abort',voice.stop);idle();};
      const voice={stop(){try{source.stop();}catch{}clean();}};
      voices.add(voice);signal?.addEventListener('abort',voice.stop,{once:true});
      try{
        const now=ctx.currentTime,rate=cue.rate||1,length=Math.min(buffer.duration,cue.duration||buffer.duration),duration=length/rate;
        source.buffer=buffer;source.playbackRate.value=rate;master.gain.value=settings.volume;
        gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(cue.level||1,now+.004);gain.gain.setValueAtTime(cue.level||1,now+Math.max(.005,duration-.025));gain.gain.linearRampToValueAtTime(0,now+duration);
        source.connect(gain);gain.connect(master);source.onended=clean;source.start(now,0,length);source.stop(now+duration+.03);
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
    function destroy(){if(dead)return;dead=true;active=false;stop();events.abort();downloads.abort();files.clear();records.clear();master?.disconnect();limiter?.disconnect();if(context)void context.close().catch(()=>{});context=master=limiter=null;}
    return Object.freeze({activate(){if(!dead){active=true;update();prefetch();}},refresh(){update();if(!eligible())stop();else prefetch();},play,warm,set,snapshot,destroy});
  }
  function controls(value){const s=preference(value);return `<section class="account-section"><h3>Sons de l’arène</h3><div class="account-form"><label class="account-check"><input type="checkbox" data-arena-sound-enabled ${s.enabled?'checked':''}><span>Effets sonores<small>Sur cet appareil</small></span></label><label class="account-music-volume"><span>Volume <output data-arena-sound-level>${Math.round(s.volume*100)} %</output></span><input type="range" min="0" max="40" step="1" value="${Math.round(s.volume*100)}" data-arena-sound-volume aria-label="Volume des effets sonores"></label></div></section>`;}
  return Object.freeze({create,controls,preference,resolve,elements,common,BASE,KEY});
});
