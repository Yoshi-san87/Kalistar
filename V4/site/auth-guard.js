(() => {
  'use strict';
  let timer=null,validating=null,closed=false,controller=null;
  const login=()=>{
    if(closed)return;closed=true;clearInterval(timer);controller?.abort();
    document.documentElement.dataset.authState='checking';
    location.replace('/jeu/login.html?next='+encodeURIComponent(location.pathname+location.search+location.hash));
  };
  async function ensure(){
    if(!KalistarCloudSession.required()){document.documentElement.dataset.authState='ready';return true;}
    if(validating)return validating;
    validating=(async()=>{
      try{
        const session=await KalistarCloudSession.get(),s=await session.check();
        if(!s.user){login();return false;}
        if(window.KALISTAR_CLOUD_ACCESS&&window.KALISTAR_CLOUD_ACCESS.localProfile!==s.access.localProfile){await KalistarCloudSession.beforeLogout?.();location.reload();return false;}
        window.KALISTAR_CLOUD_ACCESS=s.access;document.documentElement.dataset.authState='ready';
        if(!timer){
          controller=new AbortController();
          session.subscribe(value=>{if(!value.user)login();});
          timer=setInterval(()=>{if(!document.hidden)void ensure();},240000);
          document.addEventListener('visibilitychange',()=>{if(!document.hidden)void ensure();},{signal:controller.signal});
          window.addEventListener('pageshow',event=>{if(event.persisted)void ensure();},{signal:controller.signal});
          window.addEventListener('pagehide',event=>{if(!event.persisted){clearInterval(timer);controller.abort();}},{signal:controller.signal});
        }
        return true;
      }catch{login();return false;}
    })().finally(()=>{validating=null;});return validating;
  }
  window.KalistarAuthGuard={ensure,leave:login};
})();
