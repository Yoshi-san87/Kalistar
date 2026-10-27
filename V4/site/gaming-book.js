(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarGamingBook=api;
})(globalThis,function(root){
  'use strict';
  const bookId='momo-petits-bonheurs',channel='kalistar-gaming-book-v1';
  const supports=book=>book?.id===bookId&&book.rewardModelId==='30000001';
  const victorious=game=>game?.phase==='over'&&game.winner===0&&game.journey?.bookId===bookId&&game.journey.stage===3;
  function create({userId}){
    let active=null;
    const storageKey='kalistar-gaming-book:momo-v6:'+userId;
    function read(){try{return JSON.parse(root.localStorage.getItem(storageKey));}catch{return null;}}
    function save(value){try{if(value&&typeof value==='object'&&JSON.stringify(value).length<2000)root.localStorage.setItem(storageKey,JSON.stringify(value));}catch{}}
    function open({replay=false}={}){
      if(active)return active.promise;
      const dialog=document.createElement('dialog'),frame=document.createElement('iframe'),events=new AbortController();
      const token=root.crypto.randomUUID(),previous=document.activeElement;
      let resolve,timer;
      const promise=new Promise(done=>{resolve=done;});
      const current=active={promise,close};
      dialog.className='gaming-book-dialog';dialog.setAttribute('aria-label','Gaming Book : Momo');
      dialog.innerHTML='<header><span>Gaming Book · Momo</span><button type="button" class="icon-button" aria-label="Retour à Story" title="Retour à Story"><i data-lucide="x"></i></button></header><div class="gaming-book-stage"><p role="status">Une mélodie oubliée…</p></div>';
      frame.title='Momo : la casse';frame.allow='autoplay; fullscreen';frame.referrerPolicy='same-origin';
      const base=new URL('gaming-book/momo/index.html',document.baseURI);
      base.hash=token;frame.src=base.href;
      const stage=dialog.querySelector('.gaming-book-stage'),status=stage.querySelector('[role=status]');
      function close(completed=false){
        if(active!==current)return;
        active=null;clearTimeout(timer);events.abort();
        frame.remove();dialog.close();dialog.remove();previous?.isConnected&&previous.focus({preventScroll:true});
        resolve(completed);
      }
      function failure(){
        clearTimeout(timer);status.hidden=false;status.setAttribute('role','alert');
        status.textContent='La scène ne peut pas se charger. Retourne à Story pour réessayer : ta victoire est conservée.';
      }
      root.addEventListener('message',event=>{
        if(event.origin!==base.origin||event.source!==frame.contentWindow||event.data?.channel!==channel||event.data.token!==token)return;
        const {type,value}=event.data;
        if(type==='ready'){
          clearTimeout(timer);status.hidden=true;
          frame.contentWindow.postMessage({channel,token,type:'init',value:replay?null:read()},base.origin);
          frame.focus();
        }else if(type==='checkpoint')save(value);
        else if(type==='complete')close(true);
        else if(type==='exit')close(false);
        else if(type==='error')failure();
      },{signal:events.signal});
      dialog.querySelector('button').addEventListener('click',()=>close(),{signal:events.signal});
      dialog.addEventListener('cancel',event=>{event.preventDefault();close();},{signal:events.signal});
      dialog.addEventListener('close',()=>close(),{signal:events.signal});
      root.addEventListener('pagehide',()=>close(),{signal:events.signal});
      stage.append(frame);document.body.append(dialog);root.lucide?.createIcons({nodes:[dialog]});
      timer=setTimeout(failure,25000);
      if(root.KalistarDialogHistory)root.KalistarDialogHistory.open(dialog);else dialog.showModal();
      return promise;
    }
    return {open,destroy(){active?.close();},get active(){return !!active;}};
  }
  return {supports,victorious,create};
});
