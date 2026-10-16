(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarCloudRegistry=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const specimen=id=>typeof id==='string'&&/^(KC-[a-f0-9]{32}|0[0-9]{7})$/.test(id);
  const handle=name=>typeof name==='string'&&/^[a-z0-9_]{3,24}$/.test(name);
  const secret=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
  const empty=()=>({user:null,profile:null,isAdmin:false,cards:[],transfers:[],models:[]});
  function create({client}){
    let state=empty(),generation=0;
    const listeners=new Set(),emit=()=>{for(const fn of listeners)fn(snapshot());};
    const snapshot=()=>structuredClone(state);
    const clear=()=>{generation++;state=empty();emit();};
    async function rpc(name,args={}){const {data,error}=await client.rpc(name,args);if(error){if(['PGRST301','PGRST302','PGRST303','42501'].includes(error.code))clear();throw error;}return data;}
    async function refresh(){
      const ticket=++generation,{data,error}=await client.auth.getSession();if(error){clear();throw error;}
      if(ticket!==generation)return snapshot();
      const user=data.session?.user||null;
      if(!user){state=empty();emit();return snapshot();}
      const me=await rpc('kalistar_me');
      if(ticket!==generation)return snapshot();
      const [cards,transfers,models]=await Promise.all([
        rpc('kalistar_my_cards'),rpc('kalistar_my_transfers'),client.from('kalistar_models').select('id,name,title').order('name')
      ]);
      if(models.error)throw models.error;
      if(ticket!==generation)return snapshot();
      state={user:{id:user.id,email:user.email||''},profile:me.profile,isAdmin:me.isAdmin===true,cards,transfers,models:models.data};emit();return snapshot();
    }
    const subscription=client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'||!session)clear();
      // Supabase callbacks must not await other Auth methods while holding its lock.
    }).data.subscription;
    return {
      snapshot,refresh,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},
      logout:async()=>{generation++;state=empty();emit();const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;},
      profile:async values=>{
        if(!handle(values.handle)||typeof values.displayName!=='string'||values.displayName.trim().length<1||values.displayName.length>40)throw Error('Choisis un pseudo de 3 a 24 lettres minuscules, chiffres ou tirets bas.');
        await rpc('kalistar_set_profile',{p_handle:values.handle,p_display_name:values.displayName.trim(),p_publish_owner:values.publishOwner===true});return refresh();
      },
      activate:async(id,value)=>{
        if(!specimen(id)||!secret(value))throw Error('Identifiant ou code d activation invalide.');
        const result=await rpc('kalistar_activate',{p_id:id,p_secret:value});
        if(!result?.ok)throw Error(result?.code==='rate_limited'?'Trop de tentatives. Attends une minute.':'Activation refusee : code invalide, deja utilise ou carte indisponible.');
        await refresh();return result.card;
      },
      certificate:async id=>{if(!specimen(id))throw Error('Identifiant d exemplaire invalide.');return rpc('kalistar_certificate',{p_id:id});},
      offer:async(id,to)=>{if(!specimen(id)||!handle(to))throw Error('Exemplaire ou destinataire invalide.');const result=await rpc('kalistar_offer',{p_id:id,p_recipient:to});await refresh();return result;},
      settle:async(id,action)=>{if(!/^[a-f0-9-]{36}$/.test(id)||!['accepted','rejected','cancelled'].includes(action))throw Error('Confirmation invalide.');const result=await rpc('kalistar_settle',{p_transfer:id,p_action:action});await refresh();return result;},
      issue:async modelId=>{if(!/^[34]\d{7}$/.test(modelId))throw Error('Modele inconnu.');return rpc('kalistar_issue',{p_model_id:modelId,p_pilot:true});},
      destroy:()=>{generation++;state=empty();subscription.unsubscribe();client.auth.stopAutoRefresh?.();listeners.clear();}
    };
  }
  return {create,specimen,handle,secret};
});
