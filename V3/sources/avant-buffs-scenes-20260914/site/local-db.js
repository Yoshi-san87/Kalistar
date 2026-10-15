(() => {
  'use strict';
  const stores=['versions','instances','matches','results'];
  const copy=value=>structuredClone(value);
  const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  const completed=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||new Error('Transaction annulée.'));tx.onerror=()=>{};});
  const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const EDITION='V3',GAME_SCHEMA=6,NAME='kalistar-v3-cards';
  const legacyError=()=>new Error('Import V2 refusé : règles et statistiques incompatibles avec V3. Vos données V2 restent intactes.');
  function validateGame(value){
    if(value?.schema!==GAME_SCHEMA)throw legacyError();
    if(value.players?.some(p=>[...(p.board||[]),...(p.reserve||[]),...(p.dead||[])].some(u=>u&&!/^K3-30\d{6}-00[1-4]$/.test(u.instanceId))))throw legacyError();
    return value;
  }
  async function open(data,{name=NAME}={}) {
    if(!name.startsWith(NAME))throw new Error('La base V3 doit rester isolée de V2.');
    if(!data.cards?.length||data.cards.some(c=>!/^30\d{6}$/.test(c.id)||!c.characterId))throw new Error('Profils V3 indisponibles : aucune donnée V2 copiée dans la base V3.');
    const E=KalistarEngine.createEngine(data),req=indexedDB.open(name,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      db.createObjectStore('versions',{keyPath:'id'}).createIndex('characterId','characterId');
      const instances=db.createObjectStore('instances',{keyPath:'id'});
      instances.createIndex('cardId','cardId');instances.createIndex('serial','serial',{unique:true});
      db.createObjectStore('matches',{keyPath:'id'});
      const results=db.createObjectStore('results',{keyPath:['matchId','instanceId']});
      results.createIndex('cardId','cardId');results.createIndex('instanceId','instanceId');results.createIndex('matchId','matchId');
    };
    const db=await new Promise((resolve,reject)=>{
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
      req.onblocked=()=>reject(new Error('Fermez les autres onglets Kalistar puis rechargez.'));
    });
    db.onversionchange=()=>db.close();
    let cache={versions:[],instances:[],matches:[],results:[]},queue=Promise.resolve();
    const serial=(id,n)=>`K3-${id}-${String(n).padStart(3,'0')}`;
    const instance=(id,n,date)=>({id:serial(id,n),cardId:id,characterId:E.byId[id].characterId,copy:n,serial:serial(id,n),createdAt:date});
    const enqueue=fn=>{const run=queue.then(fn);queue=run.catch(()=>{});return run;};
    async function refresh(){
      const tx=db.transaction(stores,'readonly'),done=completed(tx),reads=stores.map(s=>request(tx.objectStore(s).getAll()));
      for(let i=0;i<stores.length;i++)cache[stores[i]]=await reads[i];
      await done;
    }
    const date=new Date().toISOString(),tx=db.transaction(['versions','instances'],'readwrite'),done=completed(tx);
    for(const card of data.cards){
      tx.objectStore('versions').put({...copy(card),updatedAt:date});
      const item=instance(card.id,1,date),existing=tx.objectStore('instances').get(item.id);
      existing.onsuccess=()=>{if(!existing.result)tx.objectStore('instances').add(item);};
    }
    await done;await refresh();
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
    async function writeMatches(incoming,extraInstances=[]){
      const tx=db.transaction(['instances','matches','results'],'readwrite'),done=completed(tx);
      let failure=null;const ensured=new Set();
      const stop=e=>{failure=e;tx.abort();};
      const ensure=item=>{
        if(ensured.has(item.id))return;ensured.add(item.id);
        const get=tx.objectStore('instances').get(item.id);
        get.onsuccess=()=>{if(!get.result)tx.objectStore('instances').add(item);};
      };
      for(const item of extraInstances)ensure(item);
      for(const match of incoming){
        const get=tx.objectStore('matches').get(match.id);
        get.onsuccess=()=>{
          const old=get.result;
          if(old?.finalized){
            if(match.finalized&&!sameFinal(old,match))stop(new Error('Deux résultats différents portent le même identifiant de match. Import annulé.'));
            return;
          }
          if(old&&!match.finalized&&match.updatedAt<old.updatedAt)return;
          if(old){match.createdAt=old.createdAt;}
          tx.objectStore('matches').put(match);
          for(const u of match.summary.units){
            ensure(instance(u.cardId,Number(u.instanceId.slice(-3)),match.createdAt));
            if(match.finalized)tx.objectStore('results').put({...u,matchId:match.id,winner:match.state.winner,partial:match.summary.partial,finishedAt:match.updatedAt});
          }
        };
      }
      try{await done;}catch(e){throw failure||e;}
      await refresh();
    }
    function career(cardId,instanceId=null){
      const rows=cache.results.filter(r=>r.cardId===cardId&&(!instanceId||r.instanceId===instanceId)&&r.participated&&!r.partial);
      const result={games:0,wins:0,losses:0,draws:0,kills:0,holds:0,support:0,debuff:0,attack:0,defense:0,reraises:0,mvp:0,history:[]};
      for(const row of rows){
        result.games++;result[row.winner==='draw'?'draws':row.winner===row.side?'wins':'losses']++;
        for(const key of ['kills','holds','support','debuff','attack','defense','reraises'])result[key]+=row[key]||0;
        const match=cache.matches.find(m=>m.id===row.matchId),top=Math.max(...match.summary.units.map(u=>u.rating));
        if(row.rating>0&&row.rating===top)result.mvp++;
        result.history.push({...row,seed:match.state.seed});
      }
      result.history.sort((a,b)=>b.finishedAt.localeCompare(a.finishedAt));
      return result;
    }
    return {
      name,edition:EDITION,
      inspect:store=>{if(!stores.includes(store))throw new Error('Table inconnue.');return copy(cache[store]);},
      saveGame:value=>{const snapshot=copy(value);return enqueue(()=>writeMatches([makeMatch(snapshot)]));},
      career,
      instances:cardId=>copy(cache.instances.filter(i=>i.cardId===cardId).sort((a,b)=>a.copy-b.copy)),
      matches:()=>copy(cache.matches).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),
      match:id=>copy(cache.matches.find(m=>m.id===id)),
      counts:()=>Object.fromEntries(stores.map(s=>[s,cache[s].length])),
      exportBackup:()=>enqueue(async()=>{await refresh();return {format:'kalistar-local-library',schema:2,edition:EDITION,gameSchema:GAME_SCHEMA,database:NAME,exportedAt:new Date().toISOString(),...copy(cache)};}),
      importBackup:value=>enqueue(async()=>{
        if(value?.edition!==EDITION||value?.gameSchema!==GAME_SCHEMA||value?.database!==NAME)throw legacyError();
        if(value?.format!=='kalistar-local-library'||value.schema!==2||!stores.every(s=>Array.isArray(value[s]))||value.matches.length>10000||value.instances.length>data.cards.length*4)throw new Error('Sauvegarde de collection invalide.');
        if(value.versions.some(p=>!E.byId[p?.id]||p.characterId!==E.byId[p.id].characterId))throw legacyError();
        const instances=value.instances.map(i=>{
          if(!E.byId[i.cardId]||!Number.isInteger(i.copy)||i.copy<1||i.copy>4||i.id!==serial(i.cardId,i.copy)||i.serial!==serial(i.cardId,i.copy)||!Number.isFinite(Date.parse(i.createdAt)))throw new Error('Identifiant d’exemplaire invalide.');
          return instance(i.cardId,i.copy,i.createdAt);
        });
        if(new Set(instances.map(i=>i.id)).size!==instances.length)throw new Error('Exemplaire en double.');
        const matches=value.matches.map(m=>{
          const validated=makeMatch(m.state);
          if(validated.id!==m.id||!Number.isFinite(Date.parse(m.createdAt))||!Number.isFinite(Date.parse(m.updatedAt)))throw new Error('Rencontre invalide.');
          validated.createdAt=m.createdAt;validated.updatedAt=m.updatedAt;
          if(!Array.isArray(m.profiles)||m.profiles.length>1000||!m.profiles.every(p=>p&&typeof p.id==='string'&&E.byId[p.id]&&p.characterId===E.byId[p.id].characterId)||!m.rules||typeof m.rules.version!=='string')throw new Error('Profils historiques invalides.');
          validated.profiles=copy(m.profiles);validated.rules=copy(m.rules);validated.arenas=historicalArenas(m.arenas,validated.state.arenaId);
          return validated;
        });
        if(new Set(matches.map(m=>m.id)).size!==matches.length)throw new Error('Rencontre en double.');
        // Performance rows are derived again from validated games, never imported as counters.
        await writeMatches(matches,instances);
      }),
      idle:()=>queue,close:()=>db.close()
    };
  }
  window.KalistarLocalDB={open,validateGame};
})();
