(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarCloudSession??=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const email=value=>typeof value==='string'&&value.length<=254&&/^\S+@\S+\.\S+$/.test(value);
  const protectedSite=(online,location)=>online&&location.protocol==='https:'&&!['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&!location.hostname.endsWith('.invalid');
  const target=(value,origin)=>{try{const u=new URL(value||'/jeu/#home',origin);if(u.origin===origin&&u.pathname.startsWith('/jeu/')&&!u.pathname.includes('login'))return u.pathname+u.search+u.hash;}catch{}return '/jeu/#home';};
  function create({client,exchange,redirectTo}){
    let state={user:null,access:null,recovery:false},generation=0,pending=null;
    const listeners=new Set(),snapshot=()=>structuredClone(state),emit=()=>{for(const fn of listeners)fn(snapshot());};
    const clear=()=>{generation++;state={user:null,access:null,recovery:false};emit();};
    const subscription=client.auth.onAuthStateChange((event)=>{
      if(event==='SIGNED_OUT')clear();
      if(event==='PASSWORD_RECOVERY'){state.recovery=true;emit();}
    }).data.subscription;
    async function check(){
      if(pending)return pending;
      const ticket=generation;
      pending=(async()=>{
        const {data,error}=await client.auth.getSession();if(error)throw Error('Session indisponible. Reconnecte-toi.');
        if(ticket!==generation)return snapshot();
        if(!data.session){clear();return snapshot();}
        const permission=await client.rpc('kalistar_access');
        if(ticket!==generation)return snapshot();
        if(permission.error||!['user-paris','user-tokyo'].includes(permission.data?.localProfile)){clear();throw Error('Ce compte ne peut pas acceder a Kalistar.');}
        if(state.recovery)return snapshot();
        await exchange('POST',data.session.access_token);
        if(ticket!==generation)return snapshot();
        state={user:{id:data.session.user.id,email:data.session.user.email},access:permission.data,recovery:false};emit();return snapshot();
      })().finally(()=>{pending=null;});
      return pending;
    }
    return {snapshot,check,client,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},
      login:async(address,password)=>{
        if(!email(address)||typeof password!=='string'||!password||password.length>1024)throw Error('Renseigne ton email et ton mot de passe.');
        const {error}=await client.auth.signInWithPassword({email:address,password});
        if(error)throw Error('Email ou mot de passe incorrect, ou connexion temporairement indisponible.');
        return check();
      },
      forgot:async address=>{if(!email(address))throw Error('Adresse email invalide.');const {error}=await client.auth.resetPasswordForEmail(address,{redirectTo});if(error)throw Error('Envoi indisponible. Reessaie plus tard.');},
      password:async(value,confirmation)=>{
        if(typeof value!=='string'||value.length<8||value.length>1024||value!==confirmation)throw Error('Choisis au moins 8 caracteres et confirme le meme mot de passe.');
        const {error}=await client.auth.updateUser({password:value});if(error)throw Error('Le mot de passe ne peut pas etre modifie. Recommence la recuperation.');
        state.recovery=false;return check();
      },
      logout:async()=>{generation++;await exchange('DELETE');const {error}=await client.auth.signOut({scope:'local'});if(error)throw Error('Deconnexion incomplete. Reessaie.');clear();},
      destroy:()=>{generation++;subscription.unsubscribe();listeners.clear();}
    };
  }
  const api={create,protectedSite,target};
  if(typeof window!=='undefined'){
    let sdkPromise,instance;
    api.required=()=>protectedSite(window.KalistarSite?.online??document.documentElement.dataset.hosting==='static',location);
    api.getClient=async()=>{
      if(!window.supabase){
        sdkPromise??=new Promise((resolve,reject)=>{
          const script=document.createElement('script'),timer=setTimeout(()=>{script.remove();sdkPromise=null;reject(Error('Connexion indisponible.'));},15000);
          script.src=window.KalistarCloudConfig.sdk;script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();sdkPromise=null;reject(Error('Connexion indisponible.'));};document.head.append(script);
        });await sdkPromise;
      }
      if(!api.client){const c=window.KalistarCloudConfig;api.client=window.supabase.createClient(c.url,c.publishableKey,{auth:{storageKey:'kalistar.cloud.auth.v1',flowType:'pkce',persistSession:true,detectSessionInUrl:true,autoRefreshToken:true},global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)})}});}
      return api.client;
    };
    api.get=async()=>{
      if(!instance)instance=create({client:await api.getClient(),redirectTo:window.KalistarCloudConfig.redirectTo,exchange:async(method,token)=>{
        const response=await fetch('/auth/session',{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},...(token?{body:JSON.stringify({accessToken:token})}:{}),signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw Error('Acces au jeu indisponible. Reessaie.');
      }});
      return instance;
    };
    api.logout=async()=>{await api.beforeLogout?.();await(await api.get()).logout();if(window.KalistarAuthGuard)window.KalistarAuthGuard.leave();else location.replace('/jeu/login.html');};
  }
  return api;
});
