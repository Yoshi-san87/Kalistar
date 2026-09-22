(() => {
  'use strict';
  const stores=['versions','instances','matches','results'];
  const copy=value=>structuredClone(value);
  const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  const completed=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||new Error('Transaction annulée.'));tx.onerror=()=>{};});
  const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const EDITION='V4',GAME_SCHEMA=6,NAME='kalistar-v4-cards';
  const registryStores=['users','collectibles','activations','transfers','events','registryMeta'];
  const connections=new Map();
  const legacyError=()=>new Error('Import V2/V3 refusé : sauvegarde V4 requise. Vos données V2/V3 restent intactes.');
  function validateGame(value){
    if(value?.schema!==GAME_SCHEMA||value.edition!=='V4')throw legacyError();
    if(value.players?.some(p=>[...(p.board||[]),...(p.reserve||[]),...(p.dead||[])].some(u=>u&&!/^K4-[34]\d{7}-00[1-4]$/.test(u.instanceId))))throw legacyError();
    return value;
  }
  async function open(data,{name=NAME}={}) {
    if(!name.startsWith(NAME))throw new Error('La base V4 doit rester isolée de V2.');
    if(data.version!==4||data.edition!=='V4'||!data.cards?.length||data.cards.some(c=>c.edition!=='V4'||!c.characterId))throw new Error('Profils V4 indisponibles : aucune donnée historique copiée dans la base V4.');
    const E=KalistarEngine.createEngine(data),O=window.KalistarOwnership,T=window.KalistarTrophies;
    async function connect(version){
      const req=version===undefined?indexedDB.open(name):indexedDB.open(name,version);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains('versions'))db.createObjectStore('versions',{keyPath:'id'}).createIndex('characterId','characterId');
        if(!db.objectStoreNames.contains('instances')){
          const instances=db.createObjectStore('instances',{keyPath:'id'});
          instances.createIndex('cardId','cardId');instances.createIndex('serial','serial',{unique:true});
        }
        if(!db.objectStoreNames.contains('matches'))db.createObjectStore('matches',{keyPath:'id'});
        if(!db.objectStoreNames.contains('results')){
          const results=db.createObjectStore('results',{keyPath:['matchId','instanceId']});
          results.createIndex('cardId','cardId');results.createIndex('instanceId','instanceId');results.createIndex('matchId','matchId');
        }
        if(O)for(const table of registryStores)if(!db.objectStoreNames.contains(table))db.createObjectStore(table,{keyPath:'id'});
      };
      return new Promise((resolve,reject)=>{
        let blocked=false;
        req.onsuccess=()=>{if(blocked){req.result.close();return;}req.result.onversionchange=()=>req.result.close();resolve(req.result);};
        req.onerror=()=>reject(req.error);
        req.onblocked=()=>{blocked=true;reject(new Error('Fermez les autres onglets Kalistar puis rechargez.'));};
      });
    }
    let db=await connect();
    while(O&&registryStores.some(s=>!db.objectStoreNames.contains(s))){
      const version=db.version+1;db.close();
      try{db=await connect(version);}catch(e){if(e.name!=='VersionError')throw e;db=await connect();}
    }
    const hasRegistry=registryStores.every(s=>db.objectStoreNames.contains(s));
    const allStores=[...stores,...(hasRegistry?registryStores:[])];
    let cache=Object.fromEntries(allStores.map(s=>[s,[]])),queue=Promise.resolve(),opened=true,channel=null;
    const catalogueListeners=new Set();
    const catalogueChanges=()=>[...new Set([...cache.versions.map(c=>c.id),...(cache.collectibles||[]).map(c=>c.cardId)].filter(id=>!E.byId[id]))];
    const serial=(id,n)=>`K4-${id}-${String(n).padStart(3,'0')}`;
    const instance=(id,n,date)=>({id:serial(id,n),cardId:id,characterId:E.byId[id].characterId,copy:n,serial:serial(id,n),createdAt:date});
    const enqueue=fn=>{const run=queue.then(fn);queue=run.catch(()=>{});return run;};
    async function refresh(){
      if(!opened)throw new Error('Base locale fermee.');
      const tx=db.transaction(allStores,'readonly'),done=completed(tx),reads=allStores.map(s=>request(tx.objectStore(s).getAll())),next={};
      for(let i=0;i<allStores.length;i++)next[allStores[i]]=await reads[i];
      await done;
      const previous=catalogueChanges().join(',');cache=next;
      const changed=catalogueChanges();
      if(changed.join(',')!==previous)for(const listener of catalogueListeners)try{listener(changed.slice());}catch{}
    }
    async function publish(){
      await refresh();
      for(const peer of connections.get(name)||[])if(peer!==refresh)try{await peer();}catch{}
      channel?.postMessage('changed');
    }
    // Every registry mutation and match write locks the same tables. The callback
    // runs inside the last IDB read event; no crypto/network await can close the tx.
    async function atomic(fn){
      if(!opened)throw new Error('Base locale fermee.');
      const tx=db.transaction(allStores,'readwrite'),done=completed(tx),snapshot={};
      let remaining=allStores.length,result,failure;
      const key=(store,row)=>store==='results'?stable([row.matchId,row.instanceId]):row.id;
      const write=(store,row)=>{
        const item=copy(row),index=snapshot[store].findIndex(r=>key(store,r)===key(store,item));
        if(index<0)snapshot[store].push(item);else snapshot[store][index]=item;
        tx.objectStore(store).put(item);
      };
      const clear=store=>{snapshot[store]=[];tx.objectStore(store).clear();};
      for(const store of allStores){
        const get=tx.objectStore(store).getAll();
        get.onsuccess=()=>{
          snapshot[store]=get.result;
          if(--remaining===0)try{result=fn(snapshot,write,clear);}catch(e){failure=e;tx.abort();}
        };
      }
      try{await done;}catch(e){throw failure||e;}
      await publish();return result;
    }
    try{
      await atomic((s,write)=>{
        const date=new Date().toISOString();
        for(const card of data.cards){
          write('versions',{...copy(card),updatedAt:date});
          const item=instance(card.id,1,date);if(!s.instances.some(i=>i.id===item.id))write('instances',item);
        }
        if(O)O.seed(s,write,data);
        // Add derived honours to old archives without changing a game or ownership.
        if(T)for(const match of s.matches.filter(m=>m.finalized)){
          const rows=s.results.filter(r=>r.matchId===match.id);
          if(rows.every(r=>r.trophyVersion===T.version))continue;
          const awarded=T.awards(E.matchStats(E.restoreGame(validateGame(match.state))));
          for(const row of rows)write('results',{...row,trophyVersion:T.version,trophies:awarded[row.uid]||[]});
        }
      });
    }catch(e){opened=false;db.close();throw e;}
    if(!connections.has(name))connections.set(name,new Set());connections.get(name).add(refresh);
    if(typeof BroadcastChannel!=='undefined'){
      channel=new BroadcastChannel(name+'-ownership');
      channel.onmessage=()=>{enqueue(refresh).catch(()=>{});};
    }
    const close=()=>{opened=false;catalogueListeners.clear();channel?.close();connections.get(name)?.delete(refresh);db.close();};
    db.onversionchange=close;
    function makeMatch(value,at=new Date().toISOString()){
      const state=E.restoreGame(validateGame(value)),summary=E.matchStats(state);
      return {id:state.matchId,state,summary,createdAt:at,updatedAt:at,finalized:state.phase==='over',edition:EDITION,arenas:copy(data.arenas||[]),rules:copy(data.demo),profiles:copy(data.cards)};
    }
    function historicalArenas(arenas,arenaId){
      if(!Array.isArray(arenas)||!arenas.length||arenas.length>1000||arenas.some(a=>!a||['name','subtitle','image','source'].some(key=>typeof a[key]!=='string'||a[key].length>10000)))throw new Error('Arènes historiques invalides.');
      // Reuse the engine's arena constraints without replacing the archived catalog.
      KalistarEngine.createEngine({...data,arenas});
      if(!arenas.some(a=>a.id===arenaId))throw new Error('Arène de la rencontre absente du catalogue historique.');
      return copy(arenas);
    }
    function sameFinal(a,b){
      return stable(a.state)===stable(b.state);
    }
    function extendBackup(s,registry,matches,instances,snapshotIds){
      const incomingIds=new Set(registry.collectibles.map(c=>c.id));
      const retainedIds=new Set(s.collectibles.filter(c=>!snapshotIds.has(c.cardId)||!c.legacyInstanceId&&!incomingIds.has(c.id)).map(c=>c.id));
      const retainedMatches=new Set();
      const originals=new Map(s.collectibles.filter(c=>c.legacyInstanceId).map(c=>[c.legacyInstanceId,c.id]));
      // Keep the entire dependency component: one retained card can share a match
      // with older cards whose ownership events must remain valid as well.
      let grew=true;
      while(grew){
        grew=false;
        for(const match of s.matches){
          const player=match.state.players[0];
          const bindings=match.state.collection?Object.values(match.state.collection.bindings):[...player.board.filter(Boolean),...player.reserve,...player.dead].map(u=>originals.get(u.instanceId)).filter(Boolean);
          const newer=match.state.players.some(p=>[...p.board.filter(Boolean),...p.reserve,...p.dead].some(u=>!snapshotIds.has(u.cardId)));
          if(!retainedMatches.has(match.id)&&(newer||bindings.some(id=>retainedIds.has(id)))){
            retainedMatches.add(match.id);for(const id of bindings)retainedIds.add(id);grew=true;
          }
        }
      }
      const retained=s.collectibles.filter(c=>retainedIds.has(c.id));
      const legacyIds=new Set(retained.map(c=>c.legacyInstanceId).filter(Boolean));
      const out=copy(registry);
      out.collectibles=out.collectibles.filter(c=>!retainedIds.has(c.id)&&!legacyIds.has(c.legacyInstanceId)).concat(copy(retained));
      for(const table of ['activations','transfers','events']){
        const id=row=>table==='activations'?row.id:row.collectibleId;
        out[table]=out[table].filter(row=>!retainedIds.has(id(row))).concat(copy(s[table].filter(row=>retainedIds.has(id(row)))));
      }
      const protectedMeta=s.registryMeta.filter(row=>row.id.startsWith('lease-')&&retainedMatches.has(row.matchId)||retainedIds.size&&row.id.startsWith('rate-'));
      const metaIds=new Set(protectedMeta.map(row=>row.id));
      out.registryMeta=out.registryMeta.filter(row=>!metaIds.has(row.id)&&!(row.id.startsWith('lease-')&&retainedMatches.has(row.matchId))).concat(copy(protectedMeta));
      const keptMatches=s.matches.filter(m=>retainedMatches.has(m.id)).map(m=>({...copy(m),summary:E.matchStats(E.restoreGame(validateGame(m.state)))}));
      const combinedMatches=matches.filter(m=>!retainedMatches.has(m.id)).concat(keptMatches);
      const unitIds=new Set(keptMatches.flatMap(m=>m.state.players.flatMap(p=>[...p.board.filter(Boolean),...p.reserve,...p.dead].map(u=>u.instanceId))));
      const keptInstances=s.instances.filter(i=>!snapshotIds.has(i.cardId)||unitIds.has(i.id)||legacyIds.has(i.id));
      const combinedInstances=[...new Map([...instances,...keptInstances].map(i=>[i.id,copy(i)])).values()];
      // Re-run all ownership/activation/transfer proofs on the composed snapshot.
      // Incompatible shared histories abort the transaction, never reset an owner.
      O.validateBackup(out,data);O.validateArchive({...out,matches:combinedMatches});
      return {registry:out,matches:combinedMatches,instances:combinedInstances};
    }
    function mergeMatches(incoming,extraInstances,s,write,{restoring=false,restoreLegacy=false}={}){
      const ensure=item=>{
        if(!s.instances.some(i=>i.id===item.id))write('instances',item);
      };
      for(const item of extraInstances)ensure(item);
      for(const match of incoming){
          const old=s.matches.find(m=>m.id===match.id);
          const bound=Object.hasOwn(match.state,'collection'),oldBound=old&&Object.hasOwn(old.state,'collection');
          if((bound||oldBound)&&!O)throw new Error('Module de propriete requis pour cette partie.');
          if(O)O.validateSave(match.state,old,s,{restoring,restoreLegacy});
          // Older standalone loaders must not bypass an already upgraded registry.
          else if(hasRegistry&&!(old?.finalized&&match.finalized&&sameFinal(old,match))){
            const p=match.state.players[0];
            for(const u of [...p.board.filter(Boolean),...p.reserve,...p.dead]){
              const original=s.collectibles.find(c=>c.legacyInstanceId===u.instanceId&&c.cardId===String(u.cardId));
              if(!original||original.ownerId!=='user-paris'||original.status!=='owned')throw Object.assign(new Error('Reprise historique refusee : exemplaire original non possede par Paris.'),{name:'OwnershipError',code:'NOT_OWNER'});
              if(s.transfers.some(t=>t.collectibleId===original.id&&t.status==='pending'))throw Object.assign(new Error('Un exemplaire original a un transfert en attente.'),{name:'OwnershipError',code:'PENDING_TRANSFER'});
            }
          }
          if(old?.finalized){
            if(match.finalized&&!sameFinal(old,match))throw new Error('Deux résultats différents portent le même identifiant de match. Import annulé.');
            continue;
          }
          if(old&&!match.finalized&&match.updatedAt<old.updatedAt)continue;
          if(old){match.createdAt=old.createdAt;}
          if(O&&!restoring)O.recordBindings(match.state,old,s,write);
          write('matches',match);
          const awarded=T?.awards(match.summary)||{};
          for(const u of match.summary.units){
            ensure(instance(u.cardId,Number(u.instanceId.slice(-3)),match.createdAt));
            if(match.finalized)write('results',{...u,matchId:match.id,winner:match.state.winner,partial:match.summary.partial,finishedAt:match.updatedAt,...(T?{trophyVersion:T.version,trophies:awarded[u.uid]||[]}: {})});
          }
      }
    }
    async function writeMatches(incoming,extraInstances=[]){
      return atomic((s,write)=>mergeMatches(incoming,extraInstances,s,write));
    }
    function career(cardId,instanceId=null){
      const rows=cache.results.filter(r=>r.cardId===cardId&&(!instanceId||r.instanceId===instanceId)&&r.participated&&!r.partial);
      const matches=new Map(cache.matches.map(m=>[m.id,m]));
      const result=T?T.empty():{games:0,wins:0,losses:0,draws:0,kills:0,holds:0,support:0,debuff:0,attack:0,defense:0,reraises:0,mvp:0,history:[]};
      for(const row of rows){
        const match=matches.get(row.matchId);if(!match?.finalized)continue;
        const trophies=T?.awards(match.summary)[row.uid]||[];
        if(T)T.add(result,row,trophies);
        else{
        result.games++;result[row.winner==='draw'?'draws':row.winner===row.side?'wins':'losses']++;
        for(const key of ['kills','holds','support','debuff','attack','defense','reraises'])result[key]+=row[key]||0;
        const top=Math.max(...match.summary.units.map(u=>u.rating));
        if(row.rating>0&&row.rating===top)result.mvp++;
        }
        result.history.push({...row,trophies,seed:match.state.seed});
      }
      result.history.sort((a,b)=>b.finishedAt.localeCompare(a.finishedAt));
      return result;
    }
    const api={
      name,edition:EDITION,
      catalogueChanges,
      onCatalogueChange:listener=>{catalogueListeners.add(listener);listener(catalogueChanges());return()=>catalogueListeners.delete(listener);},
      inspect:store=>{if(!stores.includes(store))throw new Error('Table inconnue.');return copy(cache[store]);},
      saveGame:value=>{const snapshot=copy(value);return enqueue(()=>writeMatches([makeMatch(snapshot)]));},
      career,
      instances:cardId=>copy(cache.instances.filter(i=>i.cardId===cardId).sort((a,b)=>a.copy-b.copy)),
      matches:()=>copy(cache.matches).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),
      match:id=>copy(cache.matches.find(m=>m.id===id)),
      counts:()=>Object.fromEntries(stores.map(s=>[s,cache[s].length])),
      exportBackup:()=>enqueue(async()=>{await refresh();return {format:'kalistar-local-library',schema:hasRegistry?3:2,edition:EDITION,gameSchema:GAME_SCHEMA,database:NAME,exportedAt:new Date().toISOString(),...copy(cache)};}),
      importBackup:(input,options={})=>{const value=copy(input),replaceRegistry=options.replaceRegistry===true;return enqueue(async()=>{
        if(value?.edition!==EDITION||value?.gameSchema!==GAME_SCHEMA||value?.database!==NAME)throw legacyError();
        if(value?.format!=='kalistar-local-library'||![2,3].includes(value.schema)||!stores.every(s=>Array.isArray(value[s]))||value.matches.length>10000||value.instances.length>data.cards.length*4)throw new Error('Sauvegarde de collection invalide.');
        if(value.schema===2&&(replaceRegistry||registryStores.some(s=>Object.hasOwn(value,s))||value.matches.some(m=>m?.state&&Object.hasOwn(m.state,'collection'))))throw new Error('Une sauvegarde historique ne peut pas modifier le registre.');
        if(value.schema===3&&!O)throw new Error('Module de propriete requis pour importer ce registre.');
        if(!value.versions.length||value.versions.length>1000||new Set(value.versions.map(p=>p?.id)).size!==value.versions.length||value.versions.some(p=>!E.byId[p?.id]||p.edition!==EDITION||p.characterId!==E.byId[p.id].characterId))throw legacyError();
        const snapshotIds=new Set(value.versions.map(p=>p.id));
        // A registry-backed archive proves its own complete roster of originals.
        // New approved cards are retained by extendBackup, just like publications.
        // Schema 2 has no ownership proofs to validate an older approved roster.
        if(value.schema===2&&data.cards.some(c=>c.origin==='approved'&&!snapshotIds.has(c.id)))throw legacyError();
        const registry=value.schema===3?O.validateBackup(value,{...data,cards:value.versions}):null;
        const instances=value.instances.map(i=>{
          if(!snapshotIds.has(i.cardId)||!Number.isInteger(i.copy)||i.copy<1||i.copy>4||i.id!==serial(i.cardId,i.copy)||i.serial!==serial(i.cardId,i.copy)||!Number.isFinite(Date.parse(i.createdAt)))throw new Error('Identifiant d’exemplaire invalide.');
          return instance(i.cardId,i.copy,i.createdAt);
        });
        if(new Set(instances.map(i=>i.id)).size!==instances.length)throw new Error('Exemplaire en double.');
        const matches=value.matches.map(m=>{
          const validated=makeMatch(m.state);
          if(m.state.players.some(p=>[...p.board.filter(Boolean),...p.reserve,...p.dead].some(u=>!snapshotIds.has(u.cardId))))throw legacyError();
          if(validated.id!==m.id||!Number.isFinite(Date.parse(m.createdAt))||!Number.isFinite(Date.parse(m.updatedAt)))throw new Error('Rencontre invalide.');
          validated.createdAt=m.createdAt;validated.updatedAt=m.updatedAt;
          if(!Array.isArray(m.profiles)||m.profiles.length>1000||!m.profiles.every(p=>p&&typeof p.id==='string'&&snapshotIds.has(p.id)&&p.characterId===E.byId[p.id].characterId)||!m.rules||typeof m.rules.version!=='string')throw new Error('Profils historiques invalides.');
          validated.profiles=copy(m.profiles);validated.rules=copy(m.rules);validated.arenas=historicalArenas(m.arenas,validated.state.arenaId);
          return validated;
        });
        if(new Set(matches.map(m=>m.id)).size!==matches.length)throw new Error('Rencontre en double.');
        if(registry)O.validateArchive({...registry,matches});
        // Performance rows are derived again from validated games, never imported as counters.
        await atomic((s,write,clear)=>{
          if(s.versions.some(c=>!E.byId[c.id]))O.fail('CATALOGUE_STALE','Actualisez le catalogue avant de restaurer une sauvegarde.');
          const expanded=registry?extendBackup(s,registry,matches,instances,snapshotIds):{matches,instances};
          const pristine=registry&&O.pristine(s,data);
          const replace=registry&&(replaceRegistry||pristine);
          if(registry&&!replace&&!O.sameRegistry(s,expanded.registry))O.fail('REGISTRY_CONFLICT','Le registre differe de cette sauvegarde. Une restauration complete confirmee est requise.');
          if(replace){
            for(const store of allStores)clear(store);
            for(const store of registryStores)for(const item of expanded.registry[store])write(store,item);
            for(const card of data.cards)write('versions',copy(value.versions.find(p=>p.id===card.id)||{...card,updatedAt:new Date().toISOString()}));
          }
          // Results are reconstructed from games, never trusted as imported counters.
          mergeMatches(expanded.matches,expanded.instances,s,write,{restoring:!!registry,restoreLegacy:!!replace});
          if(registry)O.validateArchive(s);
        });
      });},
      idle:()=>queue,close
    };
    if(O)api.registry=O.create({data,engine:E,getCache:()=>cache,enqueue,transaction:atomic,refresh,isOpen:()=>opened});
    return api;
  }
  window.KalistarLocalDB={open,validateGame};
})();
