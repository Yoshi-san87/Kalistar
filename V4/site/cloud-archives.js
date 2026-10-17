(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarCloudArchives=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const copy=value=>structuredClone(value),validId=/^match-[a-f0-9-]{36}$/,validHash=/^[a-f0-9]{64}$/;
  async function digest(text){return [...new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
  function validate(value){
    if(value?.schema!==2||!Array.isArray(value.archives)||value.archives.length>10000||!Array.isArray(value.matches)||value.matches.length>1
      ||value.archives.some(r=>!r||!validId.test(r.id)||!validHash.test(r.hash)||Object.keys(r).length!==2||r.id===value.activeMatchId)
      ||new Set(value.archives.map(r=>r.id)).size!==value.archives.length
      ||value.matches.some(m=>m.id!==value.activeMatchId))throw Error('References d archives invalides.');
    return value;
  }
  function create({client,profile,compact,entries=()=>[],storage}){
    const fingerprints=new WeakMap(),pending=new Map(),uploaded=new Set();
    async function reference(match){
      if(fingerprints.has(match))return fingerprints.get(match);
      const promise=(async()=>{
        const archive=compact(match);
        if(!validId.test(archive.id)||archive.state?.collection?.userId!==profile)throw Error('Archive d un autre compte.');
        const text=stable(archive),hash=await digest(text),ref={id:archive.id,hash};
        if(storage)await storage.put(hash,text);
        if(!uploaded.has(hash))pending.set(hash,archive);
        return ref;
      })();
      fingerprints.set(match,promise);try{return await promise;}catch(e){fingerprints.delete(match);throw e;}
    }
    async function split(value){
      if(value===null)return null;
      if(value.schema===2)return copy(validate(value));
      if(value.schema!==1||value.localProfile!==profile||!Array.isArray(value.matches))throw Error('Progression historique invalide.');
      const matches=[],archives=[];
      for(const match of value.matches){
        if(match.id===value.activeMatchId)matches.push(compact(match));else archives.push(await reference(match));
      }
      return validate({...copy({...value,matches:undefined}),schema:2,matches,archives:archives.sort((a,b)=>a.id.localeCompare(b.id))});
    }
    async function call(name,args,signal){
      if(signal?.aborted)throw new DOMException('Annule','AbortError');
      let request=client.rpc(name,args);if(request.abortSignal&&signal)request=request.abortSignal(signal);
      const result=await request;
      if(signal?.aborted)throw new DOMException('Annule','AbortError');
      return result;
    }
    async function expand(value,context={}){
      if(value?.schema===1)return copy(value);
      validate(value);const available=new Map();
      const ids=new Set(value.archives.map(r=>r.id));
      for(const match of entries())if(ids.has(match.id)){const ref=await reference(match);available.set(ref.hash,match);}
      const wanted=[];
      for(const ref of value.archives){
        if(available.has(ref.hash)||pending.has(ref.hash))continue;
        const text=await storage?.get(ref.hash);
        if(text&&await digest(text)===ref.hash){const match=JSON.parse(text);if(match.id!==ref.id||match.state?.collection?.userId!==profile)throw Error('Archive locale invalide.');available.set(ref.hash,match);}
        else wanted.push(ref);
      }
      for(let i=0;i<wanted.length;i+=8){
        if(context.isCurrent&&!context.isCurrent())throw Error('Synchronisation interrompue.');
        const refs=wanted.slice(i,i+8),result=await call('kalistar_archive_read',{p_refs:refs},context.signal);
        if(result.error||!Array.isArray(result.data)||result.data.length!==refs.length)throw Error('Lecture des archives impossible.');
        for(let j=0;j<refs.length;j++){
          const row=result.data[j],ref=refs[j];
          if(row.id!==ref.id||row.hash!==ref.hash||await digest(row.text)!==ref.hash)throw Error('Integrite d archive invalide.');
          const match=JSON.parse(row.text);
          if(match.id!==ref.id||match.state?.collection?.userId!==profile)throw Error('Archive d un autre compte.');
          if(storage)await storage.put(ref.hash,row.text);
          available.set(ref.hash,match);uploaded.add(ref.hash);
        }
      }
      const result={...copy(value),schema:1,matches:[...value.matches.map(copy),...value.archives.map(r=>copy(available.get(r.hash)||pending.get(r.hash)))]};
      delete result.archives;return result;
    }
    async function convertResponse(data){
      if(!data||typeof data!=='object')return data;
      const next={...data};
      if(next.payload){
        if(next.payload.schema===2)for(const ref of validate(next.payload).archives)uploaded.add(ref.hash);
        next.payload=await split(next.payload);
      }
      if(next.current)next.current=await convertResponse(next.current);
      return next;
    }
    async function perform(name,args,signal){
      if(!name.startsWith('kalistar_sync_'))return call(name,args,signal);
      const verb=name.slice('kalistar_sync_'.length);
      if(verb==='write'){
        validate(args.p_payload);
        for(const ref of args.p_payload.archives)if(!uploaded.has(ref.hash)&&!pending.has(ref.hash)){
          const text=await storage?.get(ref.hash);
          if(text&&await digest(text)===ref.hash)pending.set(ref.hash,JSON.parse(text));
        }
        const refs=args.p_payload.archives.filter(r=>!uploaded.has(r.hash)&&pending.has(r.hash));
        for(let i=0;i<refs.length;){
          const batch=[];let bytes=0;
          while(i<refs.length&&batch.length<8){
            const ref=refs[i],text=stable(pending.get(ref.hash)),size=new TextEncoder().encode(text).length;
            if(size>2097152)throw Error('Archive trop volumineuse.');
            if(batch.length&&bytes+size>2500000)break;
            batch.push({hash:ref.hash,text});bytes+=size;i++;
          }
          const saved=await call('kalistar_archive_put',{p_device_id:args.p_device_id,p_expected_revision:args.p_expected_revision,p_archives:batch},signal);
          if(saved.error||saved.data?.ok!==true)return {...saved,data:await convertResponse(saved.data)};
          for(const row of batch){uploaded.add(row.hash);pending.delete(row.hash);}
        }
      }
      const result=await call('kalistar_sync_v2_'+verb,args,signal);
      return {...result,data:await convertResponse(result.data)};
    }
    const transport={auth:client.auth,rpc(name,args){
      let signal,promise;
      return {abortSignal(value){signal=value;return this;},then(resolve,reject){promise??=perform(name,args,signal);return promise.then(resolve,reject);}};
    }};
    async function migrateRecord(raw){
      if(raw===null)return null;
      const value=JSON.parse(raw);
      if(value.base?.payload?.schema===2)for(const ref of validate(value.base.payload).archives)uploaded.add(ref.hash);
      if(value.base?.payload?.schema===1)value.base.payload=await split(value.base.payload);
      if(value.outbox?.payload?.schema===1)value.outbox.payload=await split(value.outbox.payload);
      return JSON.stringify(value);
    }
    return {split,expand,transport,migrateRecord};
  }
  return {create,validate,digest,stable};
});
