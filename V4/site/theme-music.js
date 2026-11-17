(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarThemeMusic=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KEY='kalistar.audio.v1',SOURCE='assets/audio/six-note-motif-v1.mp3';
  function preference(value){
    return {enabled:typeof value?.enabled==='boolean'?value.enabled:true,volume:typeof value?.volume==='number'&&Number.isFinite(value.volume)?Math.min(.4,Math.max(0,value.volume)):.16};
  }
  function create({host=window,doc=host.document}={}){
    let saved;try{saved=JSON.parse(host.localStorage.getItem(KEY));}catch{}
    let settings=preference(saved),audio=null,active=false,dead=false,failed=false,playing=false,attempt=0,fade=null;
    const events=new AbortController();
    const listen=(node,event,fn,capture=false)=>node.addEventListener(event,fn,{capture,signal:events.signal});
    const snapshot=()=>({...settings,playing,available:!failed});
    const eligible=()=>active&&!dead&&!failed&&!doc.hidden&&settings.enabled&&settings.volume>0&&!/^#(?:arena|astraball)(?:$|[/?])/.test(host.location.hash)&&!doc.querySelector('.login-intro[open],.gaming-book-dialog[open]');
    function cancelFade(){host.clearTimeout(fade);fade=null;}
    function update(){
      for(const button of doc.querySelectorAll('[data-theme-music-toggle]')){
        const label=settings.enabled?'Couper la musique':'Activer la musique';
        button.setAttribute('aria-pressed',String(settings.enabled));button.setAttribute('aria-label',label);button.title=label;
        const text=button.querySelector('[data-theme-music-label]');if(text)text.textContent=label;
        const detail=button.querySelector('small');if(detail)detail.textContent=failed?'Indisponible':settings.enabled?'Activée':'Coupée';
      }
      for(const input of doc.querySelectorAll('[data-theme-music-enabled]'))input.checked=settings.enabled;
      for(const input of doc.querySelectorAll('[data-theme-music-volume]'))input.value=String(Math.round(settings.volume*100));
      for(const output of doc.querySelectorAll('[data-theme-music-level]'))output.textContent=Math.round(settings.volume*100)+' %';
    }
    function pause(){attempt++;cancelFade();playing=false;audio?.pause();if(audio)audio.volume=0;}
    function fadeIn(ticket){
      cancelFade();const start=audio.volume,target=settings.volume;let step=0;
      function next(){if(ticket!==attempt||!eligible())return;audio.volume=start+(target-start)*(++step/20);if(step<20)fade=host.setTimeout(next,35);else fade=null;}
      next();
    }
    function sync(){
      if(!eligible()){pause();return;}
      if(playing){fadeIn(attempt);return;}
      if(!audio){audio=doc.createElement('audio');audio.preload='none';audio.loop=true;audio.src=SOURCE;listen(audio,'error',()=>{failed=true;pause();update();});}
      const ticket=++attempt;audio.volume=0;
      try{Promise.resolve(audio.play()).then(()=>{
        if(ticket!==attempt||!eligible()){if(!eligible())pause();return;}
        playing=true;fadeIn(ticket);
      }).catch(()=>{if(ticket===attempt){playing=false;cancelFade();}});}catch{playing=false;}
    }
    function set(value){settings=preference({...settings,...value});try{host.localStorage.setItem(KEY,JSON.stringify(settings));}catch{}update();sync();}
    listen(doc,'click',event=>{
      if(event.target.closest('[data-theme-music-toggle]')){event.preventDefault();set({enabled:!settings.enabled});}
      else if(!playing)sync();
    },true);
    listen(doc,'keydown',event=>{if(['Enter',' '].includes(event.key)&&!playing)sync();},true);
    listen(doc,'input',event=>{
      if(event.target.matches('[data-theme-music-volume]'))set({volume:Number(event.target.value)/100});
      if(event.target.matches('[data-theme-music-enabled]'))set({enabled:event.target.checked});
    });
    listen(doc,'visibilitychange',sync);listen(host,'hashchange',sync);listen(host,'kalistar-overlay',sync);
    listen(host,'pagehide',event=>{if(event.persisted){active=false;pause();}else destroy();});
    listen(host,'pageshow',event=>{if(event.persisted&&!dead){active=true;sync();}});
    listen(host,'storage',event=>{if(event.key===KEY||event.key===null){try{settings=preference(JSON.parse(host.localStorage.getItem(KEY)));}catch{settings=preference();}update();sync();}});
    function destroy(){if(dead)return;dead=true;pause();events.abort();if(audio){audio.removeAttribute('src');audio.load();audio=null;}}
    return Object.freeze({activate(){if(!dead){active=true;update();sync();}},refresh:update,set,snapshot,destroy});
  }
  function controls(value){
    const state=preference(value);
    return `<section class="account-section"><h3>Musique de Kalistar</h3><div class="account-form"><label class="account-check"><input type="checkbox" data-theme-music-enabled ${state.enabled?'checked':''}><span>Thème officiel<small>Sur cet appareil</small></span></label><label class="account-music-volume"><span>Volume <output data-theme-music-level>${Math.round(state.volume*100)} %</output></span><input type="range" min="0" max="40" step="1" value="${Math.round(state.volume*100)}" data-theme-music-volume aria-label="Volume de la musique"></label></div></section>`;
  }
  return Object.freeze({create,preference,controls,SOURCE,KEY});
});
