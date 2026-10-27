(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarStartup=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Preparation may read/cache data. Runtime controllers only mount after ready().
  function create({host=window,doc=host.document,presentation=Promise.resolve(),reading=null}={}){
    const events=new AbortController(),preloads=new Map(),waiters=new Set();
    const surfaces=[...doc.querySelectorAll('.masthead,#app,#atelier-panel')].map(node=>({node,inert:node.inert}));
    let finished=false,disposed=false,failed=false,away=false,state='preparing';
    const visible=()=>!doc.hidden&&!away;
    const setState=value=>{state=value;doc.documentElement.dataset.runtimeState=value;};
    const release=()=>{for(const {node,inert} of surfaces)node.inert=inert;for(const link of preloads.values())link.remove();preloads.clear();};
    function notify(){
      doc.documentElement.dataset.runtimeVisibility=visible()?'visible':'hidden';
      if(!disposed&&(!finished||!visible()))return;
      for(const resolve of waiters)resolve(!disposed);
      waiters.clear();
    }
    function wait(){
      if(disposed)return Promise.resolve(false);
      if(finished&&visible())return Promise.resolve(true);
      return new Promise(resolve=>waiters.add(resolve));
    }
    function destroy(){
      if(disposed)return;
      disposed=true;events.abort();reading?.destroy();setState('closed');
      for(const link of preloads.values())link.remove();preloads.clear();notify();
    }
    for(const {node} of surfaces)node.inert=true;
    setState(state);notify();
    doc.addEventListener('visibilitychange',notify,{signal:events.signal});
    host.addEventListener('pagehide',event=>{away=true;if(event.persisted)notify();else destroy();},{signal:events.signal});
    host.addEventListener('pageshow',()=>{away=false;notify();},{signal:events.signal});
    Promise.resolve(presentation).catch(()=>{}).finally(()=>{finished=true;if(!disposed&&!failed)reading?.show();notify();});
    return Object.freeze({
      get state(){return state;},
      preloadImages(urls){
        if(disposed||state!=='preparing')return;
        for(const source of urls){
          if(preloads.size>=8)break;
          if(!source)continue;
          const url=new URL(source,host.location.href);
          if(url.origin!==host.location.origin||preloads.has(url.href))continue;
          const link=doc.createElement('link');link.rel='preload';link.as='image';link.fetchPriority='low';link.href=url.href;
          preloads.set(url.href,link);doc.head.append(link);
        }
      },
      async ready(){
        if(disposed||failed)return false;
        host.KALISTAR_PREPARED=true;host.performance?.mark('kalistar:prepared');setState('prepared');
        if(!await wait()||failed)return false;
        if(reading&&!await reading.ready())return false;
        if(!await wait()||failed)return false;
        setState('activating');return true;
      },
      activate(){
        if(disposed||state!=='activating')return;
        setState('active');reading?.destroy();release();host.performance?.mark('kalistar:active');
      },
      async fail(show){
        failed=true;reading?.destroy();
        if(!await wait())return;
        setState('failed');release();show();
      },
      destroy
    });
  }
  return Object.freeze({create});
});
