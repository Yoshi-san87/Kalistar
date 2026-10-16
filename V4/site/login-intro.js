(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarLoginIntro=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  let active=null;
  const MEDIA='assets/cinematics/kalistar-anime-v3';
  function play({host=window,doc=host.document}={}){
    if(active)return active;
    const reduced=host.matchMedia('(prefers-reduced-motion: reduce)');
    if(reduced.matches)return Promise.resolve('reduced-motion');
    active=new Promise(resolve=>{
      const dialog=doc.createElement('dialog'),events=new AbortController();
      const previous=doc.activeElement;
      let ended=false,started=false,mutedFallback=false,startTimer,deadline;
      dialog.className='login-intro';
      dialog.setAttribute('aria-label','Kalistar : introduction cin\u00e9matographique');
      dialog.innerHTML=`<video class="login-intro__film" playsinline preload="auto" disablepictureinpicture aria-label="Momo, Kaylis, Voloden et Balmhyr : l\u2019\u00e9veil de Kalistar"></video>
        <div class="login-intro__shade" aria-hidden="true"></div>
        <p class="login-intro__status" role="status">Kalistar</p>
        <button type="button" class="login-intro__play" hidden><i data-lucide="play" aria-hidden="true"></i>Lire l\u2019intro</button>
        <div class="login-intro__controls">
          <button type="button" class="login-intro__sound" aria-label="Couper le son" aria-pressed="true" title="Couper le son"><i data-lucide="volume-2" aria-hidden="true"></i></button>
          <button type="button" class="login-intro__skip"><span>Passer</span><i data-lucide="skip-forward" aria-hidden="true"></i></button>
        </div>
        <div class="login-intro__track" aria-hidden="true"><span></span></div>`;
      const video=dialog.querySelector('video'),sound=dialog.querySelector('.login-intro__sound');
      const resume=dialog.querySelector('.login-intro__play'),status=dialog.querySelector('.login-intro__status');
      const progress=dialog.querySelector('.login-intro__track span');
      const listen=(node,name,fn)=>node.addEventListener(name,fn,{signal:events.signal});
      function updateSound(){
        const label=video.muted?'Activer le son':'Couper le son';
        sound.setAttribute('aria-label',label);sound.title=label;sound.setAttribute('aria-pressed',String(!video.muted));
        sound.innerHTML=`<i data-lucide="${video.muted?'volume-x':'volume-2'}" aria-hidden="true"></i>`;
        host.lucide?.createIcons();
      }
      function finish(reason){
        if(ended)return;
        ended=true;events.abort();host.clearTimeout(startTimer);host.clearTimeout(deadline);
        video.pause();video.removeAttribute('src');video.load();
        if(dialog.open)dialog.close();dialog.remove();
        doc.documentElement.classList.remove('login-intro-open');
        if(previous?.isConnected&&!previous.disabled)previous.focus({preventScroll:true});
        resolve(reason);
      }
      async function begin(){
        try{await video.play();}
        catch(error){
          if(ended)return;
          if(error?.name!=='NotAllowedError')return finish('unavailable');
          if(!video.muted&&!mutedFallback){
            mutedFallback=true;video.muted=true;updateSound();return begin();
          }
          host.clearTimeout(startTimer);dialog.dataset.state='paused';resume.hidden=false;resume.focus();
        }
      }
      listen(dialog,'cancel',event=>{event.preventDefault();finish('skipped');});
      listen(dialog,'close',()=>finish('closed'));
      listen(dialog.querySelector('.login-intro__skip'),'click',()=>finish('skipped'));
      listen(resume,'click',()=>{resume.hidden=true;void begin();});
      listen(sound,'click',()=>{
        video.muted=!video.muted;updateSound();
      });
      listen(video,'playing',()=>{
        if(ended)return;
        host.clearTimeout(startTimer);dialog.dataset.state='playing';resume.hidden=true;status.textContent='';
        if(!started){started=true;host.clearTimeout(deadline);deadline=host.setTimeout(()=>finish('timeout'),31500);}
      });
      listen(video,'timeupdate',()=>{
        if(Number.isFinite(video.duration)&&video.duration>0)progress.style.transform=`scaleX(${Math.min(1,video.currentTime/video.duration)})`;
      });
      listen(video,'ended',()=>finish('completed'));
      listen(video,'error',()=>finish('unavailable'));
      listen(host,'pagehide',()=>finish('navigation'));
      listen(doc,'visibilitychange',()=>{if(doc.hidden)finish('background');});
      listen(reduced,'change',()=>{if(reduced.matches)finish('reduced-motion');});
      try{
        doc.body.append(dialog);doc.documentElement.classList.add('login-intro-open');dialog.showModal();
        host.lucide?.createIcons();
        video.muted=false;video.volume=.65;updateSound();
        const phone=host.matchMedia('(max-width: 699px) and (orientation: portrait)').matches;
        video.poster=MEDIA+(phone?'-phone-poster.webp':'-poster.webp');
        video.src=MEDIA+(phone?'-phone.mp4':'.mp4');
        dialog.querySelector('.login-intro__skip').focus({preventScroll:true});
        startTimer=host.setTimeout(()=>finish('slow-network'),4500);
        deadline=host.setTimeout(()=>finish('timeout'),35000);
        void begin();
      }catch{finish('unavailable');}
    }).finally(()=>{active=null;});
    return active;
  }
  return {play};
});
