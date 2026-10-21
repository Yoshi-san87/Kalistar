import Runtime from './journey-runtime.cjs';
const PROJECT='https://fkskjhlaaagqlfcsojjp.supabase.co',PUBLISHABLE='sb_publishable_TwMp0VMZvhlJ0-ojTtaIcw_eU4AQpE4';
const encoder=new TextEncoder(),uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const catalogues=new WeakMap();
async function body(request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw Error('Requete invalide.');
  const reader=request.body?.getReader();if(!reader)throw Error('Requete vide.');let count=0,text='';const decoder=new TextDecoder();
  while(true){const {value,done}=await reader.read();if(done)break;count+=value.byteLength;if(count>16384){await reader.cancel();throw Error('Requete trop volumineuse.');}text+=decoder.decode(value,{stream:true});}
  return JSON.parse(text+decoder.decode());
}
export async function signFrame(frame,secret){
  if(typeof secret!=='string'||secret.length<43)throw Error('Parcours temporairement indisponibles.');
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode('kalistar-journey-v1:'+frame)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export function entropyState(state){
  // Fresh entropy for each request also prevents probing a rejected batch to
  // learn its dice, then reusing the same sequence with a different command.
  const values=new Uint32Array(2),next=structuredClone(state);
  do{crypto.getRandomValues(values);}while(!values[0]||!values[1]);
  next.rng=values[0];if(next.initiative)next.initiative.rng=values[1];
  return next;
}
export async function journeyRequest(request,env,fetcher=fetch,source=Runtime){
  const url=new URL(request.url),action=url.pathname.slice('/api/journeys/'.length);
  if(request.method!=='POST')return json({error:'Methode refusee.'},405);
  if(request.headers.get('Origin')!==url.origin)return json({error:'Acces refuse.'},403);
  const token=request.headers.get('Authorization');
  if(!token?.startsWith('Bearer ')||token.length>7200)return json({error:'Connexion requise.'},401);
  const headers={apikey:PUBLISHABLE,Authorization:token,'Content-Type':'application/json'};
  const rpc=async(name,args={})=>{
    const response=await fetcher(PROJECT+'/rest/v1/rpc/kalistar_journey_'+name,{method:'POST',headers,body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
    const result=await response.json();
    if(!response.ok)throw Object.assign(Error(result.message||'Parcours indisponible.'),{status:response.status===401||response.status===403?403:409});
    return result;
  };
  try{
    const input=await body(request);
    if(!['library','start','context','move','abandon','claim','ack','equipment-claim','equipment-ack'].includes(action))return json({error:'Parcours introuvable.'},404);
    if(action==='library')return json(await rpc('library'));
    if(action==='claim'||action==='ack')return json(await rpc(action,{p_book_id:input.bookId}));
    if(action==='equipment-claim'||action==='equipment-ack'){
      if(!Number.isInteger(input.stage)||input.stage<4||input.stage>6)return json({error:'Chapitre invalide.'},400);
      return json(await rpc(action.replace('-','_'),{p_book_id:input.bookId,p_stage:input.stage}));
    }
    if(!uuid.test(input.deviceId||''))return json({error:'Appareil invalide.'},400);
    if(action==='abandon')return json(await rpc('abandon',{p_attempt_id:input.attemptId,p_device_id:input.deviceId}));
    let runtimeHash=source.hash;
    if(!source.Combat||!runtimeHash||!env.KALISTAR_JOURNEY_KEY)return json({error:'Parcours temporairement indisponibles.'},503);
    // Scope immutable catalogue caches to their asset binding, never to an attempt.
    const data=async()=>{
      if(!catalogues.has(env.ASSETS)){const response=await env.ASSETS.fetch(new Request(new URL('/jeu/catalogue.json',url)));if(!response.ok)throw Error('Catalogue indisponible.');catalogues.set(env.ASSETS,await response.json());}
      return catalogues.get(env.ASSETS);
    };
    let runtime;
    let attempt;
    if(action==='start'){
      runtime=source.Combat.create(await data());
      const team=source.Composition.create(runtime.engine).normalize(input.deck);
      if(runtime.engine.validateComposition(team).length)throw Error('Composition de parcours invalide.');
      attempt=await rpc('start',{p_book_id:input.bookId,p_deck:team,p_device_id:input.deviceId,p_runtime_hash:runtimeHash});
    }else attempt=await rpc('context',{p_attempt_id:input.attemptId,p_device_id:input.deviceId});
    if(attempt.runtimeHash!==runtimeHash){
      const compatibleSnapshot=source.snapshotHashes?.includes(attempt.runtimeHash)&&(!attempt.state||attempt.state.journey?.snapshot);
      if(attempt.runtimeHash!==source.legacy?.hash&&!compatibleSnapshot)return json({error:'Les regles de ce combat ont ete actualisees. Abandonne cette etape puis relance-la ; tes victoires restent conservees.',code:'runtime_changed',attempt},409);
      runtimeHash=attempt.runtimeHash;
      if(attempt.state&&!attempt.state.journey?.snapshot)attempt.state.journey.snapshot=source.Combat.freeze(source.legacy.data,attempt.state);
    }
    if(attempt.state&&action!=='move')return json({attempt});
    if(attempt.status!=='active')return json({error:'Ce combat est deja termine.',attempt},409);
    let state;
    if(attempt.state){
      if(input.sequence!==attempt.sequence)return json({error:'Le combat a avance sur un autre ecran. Reprends sa sauvegarde.',attempt,code:'conflict'},409);
      // Existing fights do not depend on validation of newly published books.
      state=source.Combat.create(await data(),{resume:true}).apply(entropyState(attempt.state),input.commands);
    }else{
      if(action==='move')return json({error:'Le combat doit d abord etre initialise.'},409);
      state=(runtimeHash===source.legacy?.hash?source.Combat.create(source.legacy.data):runtime||source.Combat.create(await data())).initial(attempt);
    }
    const frame=JSON.stringify({attemptId:attempt.id,actorId:attempt.actorId,runtimeHash,sequence:state.journey.sequence,state});
    const signature=await signFrame(frame,env.KALISTAR_JOURNEY_KEY);
    const saved=await rpc('commit',{p_frame:frame,p_signature:signature,p_device_id:input.deviceId});
    return json({attempt:saved});
  }catch(error){return json({error:error.message||'Parcours indisponible.'},error.status||400);}
}
