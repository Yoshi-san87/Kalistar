(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarCloudPlayer=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const copy=value=>structuredClone(value),keys=['deck','deckName','teamDraft','favorites','deckPreset','enemyDeckPreset','story-progress','boardScale','arena','openingMatch'];
  const prefixFor=id=>'kalistar.v4.cloud.'+id+'.';
  const parse=(storage,key,fallback=null)=>{const raw=storage.getItem(key);return raw===null?fallback:JSON.parse(raw);};
  function compactArchive(match){
    const ids=new Set(match.state.players.flatMap(p=>[...p.board.filter(Boolean),...p.reserve,...p.dead].map(u=>u.cardId)));
    return {...copy(match),profiles:match.profiles.filter(c=>ids.has(c.id)),arenas:match.arenas.filter(a=>a.id===match.state.arenaId)};
  }
  function validatePayload(value,localProfile,data,{expanded=false}={}){
    const modern=value?.schema===2;
    if(!value||![1,2].includes(value.schema)||value.edition!=='V4'||value.localProfile!==localProfile||!expanded&&new TextEncoder().encode(JSON.stringify(value)).length>8388608
      ||Object.keys(value).some(k=>!['schema','edition','localProfile','preferences','deckLibrary','equipment','matches','activeMatchId','releasedMatches',...(modern?['archives']:[])].includes(k))
      ||!value.preferences||typeof value.preferences!=='object'||Array.isArray(value.preferences)||Object.keys(value.preferences).some(k=>!keys.includes(k))
      ||!Array.isArray(value.matches)||value.matches.length>(modern?1:expanded?10001:500)||new Set(value.matches.map(m=>m.id)).size!==value.matches.length
      ||!Array.isArray(value.releasedMatches)||value.releasedMatches.length>(modern||expanded?10000:500)||value.releasedMatches.some(id=>typeof id!=='string'||!/^match-[a-f0-9-]{36}$/.test(id))||value.equipment?.id!==localProfile)throw Error('Progression incompatible avec ce compte.');
    if(modern)globalThis.KalistarCloudArchives.validate(value);
    if(value.matches.some(m=>m.state?.collection?.userId!==localProfile||!Number.isFinite(Date.parse(m.createdAt))||!Number.isFinite(Date.parse(m.updatedAt))))throw Error('Historique de compte invalide.');
    if(value.activeMatchId!==null&&!value.matches.some(m=>m.id===value.activeMatchId&&m.state.phase!=='over'))throw Error('Partie active manquante.');
    if(data){
      const engine=globalThis.KalistarEngine.createEngine(data),team=globalThis.KalistarTeamComposition.create(engine);
      if(value.preferences.teamDraft)team.normalize(value.preferences.teamDraft);
      if(value.preferences.deck&&(!Array.isArray(value.preferences.deck)||value.preferences.deck.length>10||value.preferences.deck.some(id=>!engine.byId[id])))throw Error('Deck de progression inconnu.');
      if(value.preferences.favorites&&(!Array.isArray(value.preferences.favorites)||value.preferences.favorites.length>1000||value.preferences.favorites.some(id=>!engine.byId[id])))throw Error('Favoris invalides.');
      globalThis.KalistarEquipment.validateProfile(value.equipment,data.cards);
      const storage={getItem:()=>null,setItem(){}};
      globalThis.KalistarDeckLibrary.create({storage,userId:localProfile,knownIds:data.cards.map(c=>c.id),normalizeDeck:team.normalize}).importJSON(JSON.stringify(value.deckLibrary),{mode:'replace'});
    }
    return copy(value);
  }
  async function legacyRows(){
    if(typeof indexedDB.databases!=='function'||!(await indexedDB.databases()).some(d=>d.name==='kalistar-v4-cards'))return null;
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open('kalistar-v4-cards');request.onerror=()=>reject(request.error);request.onsuccess=()=>{
        const db=request.result,names=['matches','equipment'].filter(n=>db.objectStoreNames.contains(n)),result={matches:[],equipment:[]};
        if(!names.length){db.close();resolve(result);return;}
        const tx=db.transaction(names,'readonly');for(const name of names){const r=tx.objectStore(name).getAll();r.onsuccess=()=>result[name]=r.result;}
        tx.oncomplete=()=>{db.close();resolve(result);};tx.onabort=()=>{db.close();reject(tx.error);};
      };
    });
  }
  async function connect({data,access,storage=localStorage}){
    const session=await globalThis.KalistarCloudSession.get(),identity=session.snapshot().user,client=await globalThis.KalistarCloudSession.getClient();
    if(!identity||!/^[a-f0-9-]{36}$/.test(identity.id))throw Error('Identite de synchronisation indisponible.');
    const {data:player,error}=await client.rpc('kalistar_player');if(error)throw Error('Collection en ligne indisponible. Reessaie sans effacer tes donnees.');
    if(player?.localProfile!==access.localProfile)throw Error('Le profil en ligne a change. Reconnecte-toi.');
    const db=await globalThis.KalistarLocalDB.open(data,{name:'kalistar-v4-cards-cloud-'+identity.id,cloud:player}),prefix=prefixFor(identity.id),profile=access.localProfile;
    const archives=globalThis.KalistarCloudArchives.create({client,profile,compact:compactArchive,entries:()=>db.cloudProgress.capture().matches,storage:db.cloudProgress.archives});
    const engine=globalThis.KalistarEngine.createEngine(data),Team=globalThis.KalistarTeamComposition.create(engine),libraryKey=prefix+'kalistar.v4.deckLibrary.'+encodeURIComponent(profile);
    let changed=()=>{},notice='',applying=false;
    const scopedStorage={getItem:key=>storage.getItem(prefix+key),setItem:(key,value)=>{if(storage.getItem(prefix+key)!==value){storage.setItem(prefix+key,value);changed();}},removeItem:key=>{storage.removeItem(prefix+key);changed();}};
    const starter=Team.fromPreset({name:profile==='user-tokyo'?'Les compagnons de Kaylis':'Les premiers Sentry',cards:player.starterDeck});
    if(profile==='user-tokyo'&&starter.formation.includes('30000012'))starter.captain='30000012';
    function preferences(){return Object.fromEntries(keys.filter(k=>storage.getItem(prefix+k)!==null).map(k=>[k,parse(storage,prefix+k)]));}
    function capture(context={}){
      return db.idle().then(async()=>{
        if(context.isCurrent&&!context.isCurrent())throw Error('Synchronisation interrompue.');
        const progress=db.cloudProgress.capture(),game=parse(storage,prefix+'game'),activeMatchId=game&&game.phase!=='over'?game.matchId:null;
        const payload=db.registry.restrictProgress(await archives.split({schema:1,edition:'V4',localProfile:profile,preferences:preferences(),deckLibrary:parse(storage,libraryKey,{schema:2,edition:'V4',decks:[]}),equipment:progress.equipment,matches:progress.matches,activeMatchId,releasedMatches:progress.releasedMatches}));
        validatePayload(payload,profile,data);
        const meaningful=payload.matches.length>0||payload.archives.length>0||payload.deckLibrary.decks.length>0||payload.preferences.favorites?.length>0||!!payload.preferences['story-progress']||Object.values(payload.equipment.slots).some(items=>Object.keys(items).length>0)||JSON.stringify(payload.preferences.teamDraft)!==JSON.stringify(starter);
        return {payload,meaningful};
      });
    }
    async function apply(payload,context={}){
      applying=true;
      try{
        if(context.isCurrent&&!context.isCurrent())throw Error('Synchronisation interrompue.');
        const wire=payload.schema===1?await archives.split(payload):validatePayload(payload,profile,data);
        const value=db.registry.restrictProgress(validatePayload(await archives.expand(wire,context),profile,data,{expanded:true}));await db.cloudProgress.apply(value,context);
        if(context.isCurrent&&!context.isCurrent())throw Error('Synchronisation interrompue.');
        for(const key of keys){if(Object.hasOwn(value.preferences,key))storage.setItem(prefix+key,JSON.stringify(value.preferences[key]));else storage.removeItem(prefix+key);}
        storage.setItem(libraryKey,JSON.stringify(value.deckLibrary));
        const game=value.activeMatchId?value.matches.find(m=>m.id===value.activeMatchId)?.state:null;
        storage.setItem(prefix+'game',JSON.stringify(game));
      }finally{applying=false;}
    }
    if(!storage.getItem(prefix+'initialized')){
      // Copy only this player's progress. The original demo database and keys are never changed.
      const oldPrefix=profile==='user-paris'?'kalistar.v4.':'kalistar.v4.user-tokyo.',old=await legacyRows();
      const prefs={};for(const key of keys){try{const value=parse(storage,oldPrefix+key);if(value!==null)prefs[key]=value;}catch{}}
      let library={schema:2,edition:'V4',decks:[]};try{library=parse(storage,'kalistar.v4.deckLibrary.'+profile,library);}catch{}
      const matches=[],available=new Map(player.cards.filter(c=>c.status==='owned').map(c=>[c.modelId,c.id]));let omitted=0;
      for(const source of old?.matches||[]){
        if((source.state.collection?.userId||'user-paris')!==profile)continue;
        try{
          const match=compactArchive(source),units=[...match.state.players[0].board.filter(Boolean),...match.state.players[0].reserve,...match.state.players[0].dead];
          if(units.some(u=>!available.has(u.cardId)))throw Error('Historical collection differs');
          match.state.collection={schema:1,userId:profile,opponent:'virtual',bindings:Object.fromEntries(units.map(u=>[u.instanceId,available.get(u.cardId)]))};
          if(new Set(Object.values(match.state.collection.bindings)).size!==units.length)throw Error('Distinct specimens required');
          globalThis.KalistarEngine.createArchiveEngine(data,match).assertState(match.state);matches.push(match);
        }catch{omitted++;}
      }
      let draft=starter;try{if(prefs.teamDraft||prefs.deck){const d=Team.normalize(prefs.teamDraft||{name:prefs.deckName||starter.name,cards:prefs.deck});if(!db.registry.deckErrors(profile,d.cards.filter(Boolean)).length&&d.cards.some(Boolean))draft=d;}}catch{}
      prefs.teamDraft=draft;prefs.deck=draft.cards.filter(Boolean);prefs.deckName=draft.name;prefs.favorites=(Array.isArray(prefs.favorites)?prefs.favorites:[]).filter(id=>engine.byId[id]);
      let oldGame=null;try{oldGame=parse(storage,oldPrefix+'game');}catch{}
      const active=oldGame?matches.find(m=>m.id===oldGame.matchId&&!m.finalized):null;
      let equipment=globalThis.KalistarEquipment.profile(profile);try{const row=old?.equipment.find(e=>e.id===profile);if(row)equipment=globalThis.KalistarEquipment.reconcileProfile(row,data.cards);}catch{}
      const candidate={schema:1,edition:'V4',localProfile:profile,preferences:prefs,deckLibrary:library,equipment,matches,activeMatchId:active?.id||null,releasedMatches:[]};
      try{await apply(candidate);}catch{
        notice='Les anciennes donnees restent conservees sur cet appareil. Certaines archives necessitent une reprise manuelle.';
        await apply({...candidate,preferences:{teamDraft:starter,deck:starter.cards,deckName:starter.name,favorites:[]},deckLibrary:{schema:2,edition:'V4',decks:[]},equipment:globalThis.KalistarEquipment.profile(profile),matches:[],activeMatchId:null});
      }
      if(omitted)notice=omitted+' ancienne(s) rencontre(s) restent conservees dans les archives locales, hors de cette collection.';
      storage.setItem(prefix+'initialized','1');
    }
    const syncStorage={getItem:async key=>archives.migrateRecord(await db.cloudProgress.storage.getItem(key)),setItem:(key,value)=>db.cloudProgress.storage.setItem(key,value)};
    return {db,player,client:archives.transport,userId:identity.id,prefix,scopedStorage,syncStorage,capture,apply,notice,
      get applying(){return applying;},
      backup:async(reason,context={})=>{const captured=await capture(context),full=await archives.expand(captured.payload,context);if(context.isCurrent&&!context.isCurrent())throw Error('Synchronisation interrompue.');await db.cloudProgress.backup(full,reason);},
      onChanged:fn=>{changed=fn;},
      validateDeck:async cards=>{const result=await client.rpc('kalistar_validate_deck',{p_cards:cards});if(result.error||!result.data?.ok)throw Error(result.error?.message||'Deck non autorise par ta collection en ligne.');},
      refresh:async()=>{const result=await client.rpc('kalistar_player');if(result.error)throw Error('Collection en ligne indisponible.');db.registry.update(result.data);}
    };
  }
  return {connect,prefixFor,compactArchive,validatePayload};
});
