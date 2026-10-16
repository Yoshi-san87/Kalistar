(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KalistarCloudSync=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const PREFIX='kalistar.v4.cloud-sync.v1:';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const forbidden=new Set(['password','passwd','access_token','refresh_token','service_role','service_role_key','apikey','api_key','authorization','activationsecret','activation_secret','secret']);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const fault=code=>Object.assign(new Error(code),{syncCode:code});

  // Payloads are opaque JSON; the host owns their game schema and property filtering.
  function encode(value,maxBytes){
    const parents=new Set();
    function visit(item,depth){
      if(depth>80)throw fault('payload');
      if(item===null||typeof item==='string'||typeof item==='boolean')return item;
      if(typeof item==='number'&&Number.isFinite(item))return item;
      if(typeof item!=='object'||parents.has(item))throw fault('payload');
      const proto=Object.getPrototypeOf(item);
      if(!Array.isArray(item)&&proto!==Object.prototype&&proto!==null)throw fault('payload');
      parents.add(item);
      const result=Array.isArray(item)?item.map(v=>visit(v,depth+1)):Object.fromEntries(Object.keys(item).sort().map(key=>{
        if(forbidden.has(key.toLowerCase())||['__proto__','constructor','prototype'].includes(key))throw fault('payload');
        return [key,visit(item[key],depth+1)];
      }));
      parents.delete(item);return result;
    }
    if(!value||Array.isArray(value)||typeof value!=='object')throw fault('payload');
    const json=JSON.stringify(visit(value,0));
    if(new TextEncoder().encode(json).length>maxBytes)throw fault('payload-size');
    return json;
  }
  function device(userId,sessionStorage){
    const key=PREFIX+'device:'+userId;
    const saved=sessionStorage?.getItem(key);
    if(saved&&UUID.test(saved))return saved;
    const id=root.crypto?.randomUUID?.();
    if(!id)throw fault('device');
    sessionStorage?.setItem(key,id);return id;
  }
  function create(options){
    const {client,userId,storage,capture,apply,backup,onApplied}=options;
    if(!UUID.test(userId)||!client?.rpc||!client.auth?.getSession||!client.auth?.onAuthStateChange||!storage?.getItem||!storage?.setItem||![capture,apply,backup].every(fn=>typeof fn==='function'))throw TypeError('Invalid cloud sync host contract');
    const deviceId=options.deviceId||device(userId,options.sessionStorage??root.sessionStorage);
    if(!UUID.test(deviceId))throw TypeError('Invalid sync device UUID');
    const key=PREFIX+userId+':'+deviceId,maxBytes=options.maxPayloadBytes??8*1024*1024;
    if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>8*1024*1024)throw TypeError('Invalid sync payload limit');
    const now=options.now||Date.now,timers=options.timers||root;
    const events=options.eventTarget??root.window,doc=options.document??root.document;
    const visible=()=>!doc||doc.visibilityState!=='hidden';
    const online=options.isOnline||(()=>root.navigator?.onLine!==false);
    const listeners=new Set(),requests=new Set();
    if(options.onChange)listeners.add(options.onChange);
    let base=null,outbox=null,remote=null,loaded=false,prepared=false,started=false,dead=false,paused=false,recoveryConflict=false,recoveryPending=false,lastStored=null;
    let generation=0,edits=0,tail=Promise.resolve(),flushPromise=null,flushTicket=null,stagePromise=null;
    let debounce=null,heartbeat=null,retryTimer=null,status='idle',error=null,initialDraft=false;
    let lease={deviceId:null,until:null};
    let callbacks=new AbortController();
    const context=ticket=>({userId,deviceId,signal:callbacks.signal,isCurrent:()=>!dead&&ticket===generation});
    const active=ticket=>{if(dead||ticket!==generation)throw fault('cancelled');};
    const same=(a,b)=>a===null||b===null?a===b:encode(a,maxBytes)===encode(b,maxBytes);
    const snapshot=()=>({status,userId,deviceId,revision:base?.revision??null,updatedAt:base?.updatedAt??null,
      pending:!!outbox,localUpdatedAt:outbox?.capturedAt??null,cloudUpdatedAt:remote?.updatedAt??null,
      lease:{...lease},canWrite:!dead&&!paused&&['synced','pending','syncing'].includes(status)&&lease.deviceId===deviceId&&Date.parse(lease.until)>now(),
      conflict:status==='conflict'?(initialDraft?'initial':'revision'):null,error,paused,started});
    function emit(){for(const fn of listeners){try{fn(snapshot());}catch{/* An observer cannot interrupt durable saves. */}}}
    function state(next,code=null){
      if(!['synced','pending','busy'].includes(next))clearTimer('heartbeat');
      if(next!=='offline')clearTimer('retry');
      if(['conflict','error','unauthorized','paused'].includes(next))clearTimer('debounce');
      status=next;error=code;emit();
    }
    function clearTimer(name){
      if(name==='debounce'){timers.clearTimeout(debounce);debounce=null;}
      if(name==='heartbeat'){timers.clearTimeout(heartbeat);heartbeat=null;}
      if(name==='retry'){timers.clearTimeout(retryTimer);retryTimer=null;}
    }
    function stopTimers(){clearTimer('debounce');clearTimer('heartbeat');clearTimer('retry');}
    function abort(){for(const request of requests)request.abort();requests.clear();}
    function invalidate(){generation++;callbacks.abort();callbacks=new AbortController();abort();stopTimers();}
    function denied(){invalidate();lease={deviceId:null,until:null};state('unauthorized','authorization');}
    const subscription=client.auth.onAuthStateChange((event,session)=>{
      if(dead)return;
      if(event==='SIGNED_OUT'||session?.user?.id&&session.user.id!==userId)denied();
    }).data.subscription;
    async function guarded(promise,ticket){
      active(ticket);const signal=callbacks.signal;let onAbort;
      try{
        const value=await Promise.race([promise,new Promise((_,reject)=>{
          onAbort=()=>reject(fault('cancelled'));signal.addEventListener('abort',onAbort,{once:true});
        })]);
        active(ticket);return value;
      }finally{signal.removeEventListener('abort',onAbort);}
    }
    async function identity(ticket){
      active(ticket);
      const result=await guarded(client.auth.getSession(),ticket);
      if(result.error||result.data?.session?.user?.id!==userId)throw fault('authorization');
    }
    function readState(value){
      if(!value||!Number.isSafeInteger(value.revision)||value.revision<0||!(value.updatedAt===null||typeof value.updatedAt==='string'&&Number.isFinite(Date.parse(value.updatedAt))))throw fault('protocol');
      const l=value.lease;
      if(!l||!(l.deviceId===null||UUID.test(l.deviceId))||!(l.until===null||typeof l.until==='string'&&Number.isFinite(Date.parse(l.until)))||(l.deviceId===null)!==(l.until===null))throw fault('protocol');
      const payload=value.payload===null?null:JSON.parse(encode(value.payload,maxBytes));
      return {revision:value.revision,updatedAt:value.updatedAt,payload,lease:{deviceId:l.deviceId,until:l.until}};
    }
    async function load(ticket){
      if(loaded)return;
      let record;
      try{lastStored=await storage.getItem(key);active(ticket);record=lastStored==null?null:JSON.parse(lastStored);}catch(e){if(e.syncCode)throw e;throw fault('storage');}
      if(record){
        if(record.schema!==1||record.userId!==userId)throw fault('storage');
        if(record.base){const b=readState({...record.base,lease:{deviceId:null,until:null}});base={revision:b.revision,updatedAt:b.updatedAt,payload:b.payload};}
        if(record.outbox){
          if(typeof record.outbox.meaningful!=='boolean'||!Number.isFinite(Date.parse(record.outbox.capturedAt)))throw fault('storage');
          outbox={payload:JSON.parse(encode(record.outbox.payload,maxBytes)),meaningful:record.outbox.meaningful,capturedAt:record.outbox.capturedAt};
          recoveryPending=true;
        }
      }
      loaded=true;
    }
    async function persist(ticket){
      active(ticket);
      const value=JSON.stringify({schema:1,userId,base,outbox});
      if(value===lastStored)return;
      try{await storage.setItem(key,value);active(ticket);lastStored=value;}catch(e){if(e.syncCode)throw e;throw fault('storage');}
    }
    function remember(value){remote=value;lease={...value.lease};}
    async function local(ticket){
      await identity(ticket);
      // Hosts must suppress changed() for apply(), and honor this context across awaits.
      const epoch=edits;
      const value=await guarded(capture(context(ticket)),ticket);
      if(!value||typeof value.meaningful!=='boolean')throw fault('payload');
      return {payload:JSON.parse(encode(value.payload,maxBytes)),meaningful:value.meaningful,epoch};
    }
    async function stage(value,ticket){
      if(recoveryConflict)return;
      if(base&&same(base.payload,value.payload))outbox=null;
      else if(!outbox||!same(outbox.payload,value.payload))outbox={payload:value.payload,meaningful:value.meaningful,capturedAt:new Date(now()).toISOString()};
      await persist(ticket);
    }
    async function stageCurrent(ticket){
      let current;
      do{current=await local(ticket);await stage(current,ticket);}while(current.epoch!==edits);
      return current;
    }
    async function rpc(name,args,ticket){
      await identity(ticket);
      if(name==='read')args={p_known_revision:base?.revision??null};
      const controller=new AbortController();requests.add(controller);let timeout,expired=false,onAbort;
      try{
        let request=client.rpc('kalistar_sync_'+name,args);
        if(request?.abortSignal)request=request.abortSignal(controller.signal);
        const result=await Promise.race([request,new Promise((_,reject)=>{
          onAbort=()=>reject(fault(expired?'offline':'cancelled'));
          controller.signal.addEventListener('abort',onAbort,{once:true});
          timeout=timers.setTimeout(()=>{expired=true;controller.abort();},options.requestTimeoutMs??15000);
        })]);active(ticket);await identity(ticket);
        if(!result||typeof result!=='object')throw fault('protocol');
        if(result.error){
          const e=result.error;
          if(['42501','PGRST301','PGRST302','401','403'].includes(String(e.code))||[401,403].includes(result.status))throw fault('authorization');
          if(!online()||e.code===''||/fetch|network|timeout/i.test(String(e.message)))throw fault('offline');
          throw fault('server');
        }
        const data=result.data;
        if(data?.unchanged===true){
          let known;
          if(name==='read'&&base&&data.revision===base.revision)known=base.payload;
          else if(name==='claim'&&remote&&data.revision===args.p_expected_revision&&remote.revision===data.revision)known=remote.payload;
          else if(name==='write'&&data.revision===args.p_expected_revision+1)known=args.p_payload;
          else throw fault('protocol');
          return {...data,payload:clone(known)};
        }
        return data;
      }catch(e){
        active(ticket);
        if(e.syncCode)throw e;
        throw fault('offline');
      }finally{timers.clearTimeout(timeout);controller.signal.removeEventListener('abort',onAbort);requests.delete(controller);}
    }
    function schedule(){
      clearTimer('heartbeat');
      if(!dead&&started&&!paused&&visible()&&['synced','pending','busy'].includes(status))heartbeat=timers.setTimeout(()=>{heartbeat=null;void flush();},45000);
    }
    function failure(e){
      if(dead||e.syncCode==='cancelled')return;
      if(e.syncCode==='authorization'){denied();return;}
      const code=e.syncCode||'host';
      state(code==='offline'?'offline':'error',code);
      if(code==='offline'&&started&&!paused){clearTimer('retry');retryTimer=timers.setTimeout(()=>{retryTimer=null;if(visible())void flush();},15000);}
    }
    function enqueue(fn){
      const ticket=generation;
      const result=tail.then(async()=>{active(ticket);await fn(ticket);active(ticket);}).catch(e=>{if(!dead&&ticket===generation)failure(e);});
      tail=result;
      return result.then(snapshot);
    }
    function conflict(value,initial=false){remember(value);initialDraft=initial;state('conflict');}
    function outcome(result){
      if(result?.ok===true){const current=readState(result);remember(current);return current;}
      if(result?.ok===false&&['conflict','busy'].includes(result.code)){
        const current=readState(result.current);remember(current);
        if(result.code==='conflict')conflict(current);else{state('busy');schedule();}
        return null;
      }
      throw fault('protocol');
    }
    async function restore(value,reason,ticket,epoch=edits){
      if(epoch!==edits)return false;
      await guarded(backup(reason,context(ticket)),ticket);await identity(ticket);
      if(epoch!==edits)return false;
      await guarded(apply(clone(value),context(ticket)),ticket);
      if(epoch!==edits)return false;
      return true;
    }
    let initializing=false;
    async function applied(payload,reason,ticket){
      if(onApplied)await guarded(onApplied(clone(payload),{...context(ticket),reason,initial:initializing}),ticket);
      active(ticket);
    }
    async function adopt(value,ticket,epoch=edits){
      if(!await restore(value.payload,'cloud-apply',ticket,epoch)){
        await stage(await local(ticket),ticket);conflict(value);return false;
      }
      base={revision:value.revision,updatedAt:value.updatedAt,payload:value.payload};outbox=null;initialDraft=false;recoveryConflict=false;recoveryPending=false;prepared=true;await persist(ticket);
      await applied(value.payload,'cloud-apply',ticket);return true;
    }
    async function write(value,takeover,ticket){
      const claimed=outcome(await rpc('claim',{p_device_id:deviceId,p_expected_revision:value.revision,p_takeover:takeover},ticket));
      if(!claimed)return;
      if(claimed.revision!==value.revision||!same(claimed.payload,value.payload)||claimed.lease.deviceId!==deviceId)throw fault('protocol');
      if(outbox){
        // The draft stays durable until the server acknowledges this exact CAS write.
        const draft=clone(outbox);
        const saved=outcome(await rpc('write',{p_device_id:deviceId,p_expected_revision:value.revision,p_payload:draft.payload},ticket));
        if(!saved)return;
        if(saved.revision!==value.revision+1||!same(saved.payload,draft.payload))throw fault('protocol');
        base={revision:saved.revision,updatedAt:saved.updatedAt,payload:saved.payload};
        if(outbox&&same(outbox.payload,draft.payload))outbox=null;
        await persist(ticket);
      }
      state(outbox?'pending':'synced');schedule();
    }
    async function reconcile(value,current,takeover,ticket,epoch=edits){
      remember(value);
      if(base&&(value.revision<base.revision||value.revision===base.revision&&!same(base.payload,value.payload))){conflict(value);return;}
      if(same(current.payload,value.payload)){
        base={revision:value.revision,updatedAt:value.updatedAt,payload:value.payload};outbox=null;initialDraft=false;await persist(ticket);
      }else if(!base){
        if(value.payload!==null&&current.meaningful){conflict(value,true);return;}
        if(value.payload!==null){if(!await adopt(value,ticket,epoch))return;}
        else{
          await guarded(backup('cloud-initialize',context(ticket)),ticket);
          if(epoch!==edits){await stage(await local(ticket),ticket);state('pending');return;}
          base={revision:value.revision,updatedAt:value.updatedAt,payload:null};await persist(ticket);
        }
      }else if(value.revision!==base.revision){
        if(outbox){conflict(value);return;}
        if(value.payload===null){conflict(value);return;}
        if(!await adopt(value,ticket,epoch))return;
      }
      await write(value,takeover,ticket);
    }
    async function prepare(ticket){
      await load(ticket);let current=await local(ticket);
      if(!prepared){
        if(recoveryPending&&outbox&&!same(outbox.payload,current.payload)){
          if(!current.meaningful||base&&same(base.payload,current.payload)){
            if(!await restore(outbox.payload,'outbox-recovery',ticket,current.epoch)){
              recoveryConflict=true;conflict(readState(await rpc('read',undefined,ticket)),true);return null;
            }
            current={payload:clone(outbox.payload),meaningful:outbox.meaningful,epoch:edits};
            await applied(current.payload,'outbox-recovery',ticket);
          }else{
            // Two different local drafts must not erase each other during reload.
            recoveryConflict=true;conflict(readState(await rpc('read',undefined,ticket)),true);return null;
          }
        }
        prepared=true;recoveryPending=false;
      }
      await stage(current,ticket);
      return current.epoch===edits?current:stageCurrent(ticket);
    }
    async function synchronize(takeover,ticket){
      if(paused||dead)return;
      let current=await prepare(ticket);if(!current)return;
      let epoch=current.epoch;
      if(!online())throw fault('offline');
      state('syncing');
      const value=readState(await rpc('read',undefined,ticket));
      if(epoch!==edits){current=await stageCurrent(ticket);epoch=current.epoch;}
      await reconcile(value,current,takeover,ticket,epoch);
    }
    async function initialize(ticket){
      initializing=true;
      try{await synchronize(false,ticket);}finally{initializing=false;}
    }
    function flush(){
      clearTimer('debounce');clearTimer('retry');
      if(dead||paused||!started||['conflict','unauthorized'].includes(status))return Promise.resolve(snapshot());
      if(flushPromise&&flushTicket===generation)return flushPromise;
      flushTicket=generation;
      const promise=enqueue(ticket=>synchronize(false,ticket)).finally(()=>{if(flushPromise===promise)flushPromise=null;});
      flushPromise=promise;
      return flushPromise;
    }
    function changed(){
      if(dead)return Promise.resolve(snapshot());
      edits++;
      if(!stagePromise){
        stagePromise=enqueue(async ticket=>{
          await load(ticket);let epoch;
          do{
            epoch=edits;const current=await local(ticket);
            if(prepared||!recoveryPending||!outbox||same(outbox.payload,current.payload))await stage(current,ticket);
          }while(epoch!==edits);
          if(!paused&&!['conflict','busy','offline','unauthorized'].includes(status))state('pending');else emit();
        }).finally(()=>{stagePromise=null;scheduleDebounce();});
      }
      scheduleDebounce();return stagePromise;
    }
    function scheduleDebounce(){
      clearTimer('debounce');
      if(!dead&&started&&!paused&&visible()&&['pending','busy','offline'].includes(status))debounce=timers.setTimeout(()=>{debounce=null;void flush();},options.debounceMs??1000);
    }
    const onOnline=()=>{if(visible()&&!paused&&!['conflict','unauthorized'].includes(status))void flush();};
    const onOffline=()=>{if(!dead&&!paused&&!['conflict','unauthorized'].includes(status))state('offline','offline');};
    const onVisibility=()=>{if(visible())onOnline();else clearTimer('heartbeat');};
    const onStorage=event=>{if(event.key===key&&!dead&&!paused)void enqueue(async ticket=>{
      let current=await local(ticket);const value=readState(await rpc('read',undefined,ticket));
      if(current.epoch!==edits)current=await local(ticket);
      remember(value);
      if(!same(current.payload,value.payload)){await stage(current,ticket);conflict(value);}else await reconcile(value,current,false,ticket,current.epoch);
    });};
    const bind=(target,name,fn)=>target?.addEventListener?.(name,fn);
    const unbind=(target,name,fn)=>target?.removeEventListener?.(name,fn);
    const api={snapshot,changed,flush,
      subscribe:fn=>{if(dead)return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},
      start:()=>{
        if(dead||started)return tail.then(snapshot);
        started=true;bind(events,'online',onOnline);bind(events,'offline',onOffline);bind(events,'storage',onStorage);bind(doc,'visibilitychange',onVisibility);
        state('starting');return enqueue(initialize);
      },
      resolve:choice=>{
        if(!['cloud','local','takeover'].includes(choice))throw TypeError('Unknown sync resolution');
        if(dead||paused)return Promise.resolve(snapshot());
        return enqueue(async ticket=>{
          await load(ticket);
          if(choice==='takeover'){if(status!=='conflict')await synchronize(true,ticket);return;}
          if(!remote)return;
          const chosen=remote,epoch=edits;
          state('syncing');
          if(choice==='cloud'){
            const latest=readState(await rpc('read',undefined,ticket));remember(latest);
            if(latest.payload===null){conflict(latest);return;}
            if(!await adopt(latest,ticket,epoch))return;
            await write(latest,false,ticket);return;
          }
          await guarded(backup('choose-local',context(ticket)),ticket);await identity(ticket);
          const current=await local(ticket);
          if(epoch!==edits){await stage(current,ticket);conflict(chosen);return;}
          base={revision:chosen.revision,updatedAt:chosen.updatedAt,payload:chosen.payload};outbox=null;recoveryConflict=false;recoveryPending=false;prepared=true;await stage(current,ticket);initialDraft=false;
          await write(chosen,false,ticket);
        });
      },
      pause:()=>{
        if(dead)return Promise.resolve(snapshot());
        paused=true;invalidate();state('paused');
        return enqueue(async ticket=>{
          if(lease.deviceId===deviceId){
            const result=await rpc('release',{p_device_id:deviceId},ticket);
            if(result?.ok!==true)throw fault('protocol');
            lease={deviceId:null,until:null};emit();
          }
        });
      },
      retry:()=>{
        if(dead)return Promise.resolve(snapshot());
        paused=false;
        if(!started)return api.start();
        if(status==='conflict')return Promise.resolve(snapshot());
        state('pending');return flush();
      },
      destroy:()=>{
        if(dead)return;
        dead=true;invalidate();callbacks.abort();subscription.unsubscribe();
        unbind(events,'online',onOnline);unbind(events,'offline',onOffline);unbind(events,'storage',onStorage);unbind(doc,'visibilitychange',onVisibility);
        status='destroyed';listeners.clear();
      }
    };
    return api;
  }
  return {create,storageKey:(userId,deviceId)=>PREFIX+userId+':'+deviceId};
});
