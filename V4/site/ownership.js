(() => {
  'use strict';
  const PARIS='user-paris',TOKYO='user-tokyo';
  const stores=['users','collectibles','activations','transfers','events','registryMeta'];
  const profiles=[
    {id:PARIS,email:'guillaumeprevost.paris@gmail.com',name:'Paris',role:'admin'},
    {id:TOKYO,email:'guillaumeprevost.tokyo@gmail.com',name:'Tokyo',role:'user'}
  ];
  const copy=value=>structuredClone(value);
  const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const fail=(code,message)=>{const e=new Error(message);e.name='OwnershipError';e.code=code;throw e;};
  const random=bytes=>Array.from(crypto.getRandomValues(new Uint8Array(bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  const now=()=>new Date().toISOString();
  const publicId=id=>typeof id==='string'&&/^KC-[a-f0-9]{32}$/.test(id);
  const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
  const hasBinding=game=>Object.hasOwn(game,'collection');
  const units=game=>[...game.players[0].board.filter(Boolean),...game.players[0].reserve,...game.players[0].dead];
  const known=(s,id)=>{const user=s.users.find(u=>u.id===id);if(!user)fail('UNKNOWN_USER','Profil local inconnu.');return user;};
  const collectible=(s,id)=>{const item=s.collectibles.find(c=>c.id===id);if(!item)fail('UNKNOWN_COLLECTIBLE','Exemplaire public inconnu.');return item;};
  const pending=(s,id)=>s.transfers.some(t=>t.collectibleId===id&&t.status==='pending');
  const transferView=t=>Object.fromEntries(['id','collectibleId','fromUserId','toUserId','status','createdAt'].map(k=>[k,t[k]]));
  const released=(s,matchId)=>s.registryMeta.find(m=>m.id==='lease-'+matchId);
  const active=(s,id)=>s.matches.some(m=>!m.finalized&&!released(s,m.id)&&Object.values(m.state.collection?.bindings||{}).includes(id));
  const event=(s,write,type,item,actorId,extra={})=>{
    const at=s.events.filter(e=>e.collectibleId===item.id).reduce((at,e)=>Math.max(at,Date.parse(e.createdAt)+1),Date.now());
    write('events',{id:'KE-'+random(16),type,collectibleId:item.id,actorId,createdAt:new Date(at).toISOString(),...extra});
  };
  function seed(s,write,data){
    const seeded=s.registryMeta.some(m=>m.id==='seed-v1');
    if(!seeded&&stores.some(k=>s[k].length))fail('INVALID_REGISTRY','Registre incomplet : restauration explicite requise.');
    const createdAt=now();
    if(!seeded)for(const user of profiles)write('users',copy(user));
    for(const card of data.cards){
      // A transferred original still exists: never mint a replacement for Paris.
      if(s.collectibles.some(c=>c.legacyInstanceId===`K4-${card.id}-001`))continue;
      const item={id:'KC-'+random(16),cardId:String(card.id),ownerId:PARIS,status:'owned',createdAt,legacyInstanceId:`K4-${card.id}-001`};
      write('collectibles',item);event(s,write,'seeded',item,PARIS);
    }
    if(!seeded)write('registryMeta',{id:'seed-v1',version:1,createdAt});
  }
  function shape(game,s){
    const b=game.collection;
    if(!b||b.schema!==1||b.opponent!=='virtual'||!b.bindings||typeof b.bindings!=='object'||Array.isArray(b.bindings)||
      Object.keys(b).sort().join(',')!=='bindings,opponent,schema,userId')fail('INVALID_BINDING','Metadonnees de collection invalides.');
    known(s,b.userId);
    const own=units(game),keys=Object.keys(b.bindings),ids=Object.values(b.bindings);
    if(keys.length!==own.length||new Set(ids).size!==own.length||ids.some(id=>!publicId(id))||own.some(u=>!Object.hasOwn(b.bindings,u.instanceId)))fail('INVALID_BINDING','Chaque carte du joueur doit avoir un exemplaire distinct ; adversaire virtuel uniquement.');
    for(const u of own)if(collectible(s,b.bindings[u.instanceId]).cardId!==String(u.cardId))fail('INVALID_BINDING','La version ne correspond pas a cet exemplaire.');
    return b;
  }
  function validate(game,userId,s,{historical=false}={}){
    known(s,userId);
    if(!hasBinding(game)){
      if(userId!==PARIS)fail('LEGACY_ACCOUNT','Cette partie historique sans compte appartient a Paris.');
      if(!historical)for(const u of units(game)){
        const original=s.collectibles.find(c=>c.legacyInstanceId===u.instanceId&&c.cardId===String(u.cardId));
        if(!original||original.ownerId!==PARIS||original.status!=='owned')fail('NOT_OWNER','Reprise historique refusee : Paris ne possede plus l\'exemplaire original '+u.instanceId+'.');
        if(pending(s,original.id))fail('PENDING_TRANSFER','Un exemplaire original de cette partie fait l\'objet d\'un transfert en attente.');
      }
      return true;
    }
    const b=shape(game,s);
    if(b.userId!==userId)fail('WRONG_ACCOUNT','Cette partie appartient a un autre profil local.');
    if(!historical&&released(s,game.matchId))fail('LEASE_RELEASED','Cette partie a ete abandonnee. Creez une nouvelle partie.');
    for(const id of Object.values(b.bindings)){
      const item=collectible(s,id);
      if(!historical&&(item.ownerId!==userId||item.status!=='owned'))fail('NOT_OWNER','Vous ne possedez plus un exemplaire de cette partie.');
      if(!historical&&pending(s,id))fail('PENDING_TRANSFER','Un exemplaire fait l\'objet d\'un transfert en attente.');
    }
    return true;
  }
  function validateSave(game,old,s,{restoring=false,restoreLegacy=false}={}){
    if(old&&hasBinding(old.state)&&(!hasBinding(game)||stable(game.collection)!==stable(old.state.collection)))fail('BINDING_CHANGED','Le compte et les exemplaires d\'une partie enregistree sont immuables.');
    if(!hasBinding(game)){
      const historical=restoreLegacy||game.phase==='over'&&old?.finalized&&stable(old.state)===stable(game);
      validate(game,PARIS,s,{historical});return;
    }
    if(released(s,game.matchId)&&!restoring)fail('LEASE_RELEASED','Cette partie a ete abandonnee et ne peut plus etre enregistree.');
    if(old&&!hasBinding(old.state)&&old.state.phase!=='setup')fail('LEGACY_REBIND','Une partie historique ne peut pas etre attribuee a de nouveaux exemplaires.');
    const historical=game.phase==='over'&&(old?.finalized||restoring);
    validate(game,game.collection?.userId,s,{historical:historical||restoring&&!!released(s,game.matchId)});
    if(restoring||historical){
      for(const [instanceId,id] of Object.entries(game.collection.bindings))if(!s.events.some(e=>e.type==='bound'&&e.collectibleId===id&&e.matchId===game.matchId&&e.instanceId===instanceId&&e.actorId===game.collection.userId))fail('MISSING_HISTORY','Historique de liaison de partie manquant.');
    }
  }
  function recordBindings(game,old,s,write){
    if(!hasBinding(game)||old&&hasBinding(old.state))return;
    for(const [instanceId,id] of Object.entries(game.collection.bindings))event(s,write,'bound',{id},game.collection.userId,{matchId:game.matchId,instanceId});
  }
  function exact(row,keys){return row&&typeof row==='object'&&!Array.isArray(row)&&Object.keys(row).every(k=>keys.includes(k));}
  function validateBackup(value,data){
    const s={};
    for(const key of stores){
      if(!Array.isArray(value[key])||value[key].length>100000)fail('INVALID_BACKUP','Table de registre invalide : '+key+'.');
      s[key]=copy(value[key]);
      if(s[key].some(r=>!r||typeof r.id!=='string')||new Set(s[key].map(r=>r.id)).size!==s[key].length)fail('INVALID_BACKUP','Identifiants dupliques ou invalides : '+key+'.');
    }
    if(stable([...s.users].sort((a,b)=>a.id.localeCompare(b.id)))!==stable(profiles))fail('INVALID_BACKUP','Les deux profils locaux Paris et Tokyo doivent etre conserves.');
    const cards=new Set(data.cards.map(c=>String(c.id))),legacy=new Set();
    for(const c of s.collectibles){
      if(!exact(c,['id','cardId','ownerId','status','createdAt','legacyInstanceId'])||!publicId(c.id)||!cards.has(c.cardId)||!validDate(c.createdAt)||!['owned','unclaimed'].includes(c.status)||
        (c.status==='unclaimed'?c.ownerId!==null:!s.users.some(u=>u.id===c.ownerId)))fail('INVALID_BACKUP','Exemplaire de registre invalide.');
      if(c.legacyInstanceId!==undefined){
        if(c.legacyInstanceId!==`K4-${c.cardId}-001`||legacy.has(c.legacyInstanceId)||c.status!=='owned')fail('INVALID_BACKUP','Liaison historique originale invalide.');
        legacy.add(c.legacyInstanceId);
      }
    }
    if(legacy.size!==cards.size)fail('INVALID_BACKUP','Les exemplaires historiques originaux doivent etre conserves.');
    const rate=r=>['attempts','windowStartedAt','blockedUntil'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)&&r.attempts<=5;
    for(const a of s.activations){
      const c=collectible(s,a.id);
      if(!exact(a,['id','hash','usedAt','attempts','windowStartedAt','blockedUntil'])||c.legacyInstanceId||!/^([a-f0-9]{64})$/.test(a.hash)||!rate(a)||
        (c.status==='unclaimed'?a.usedAt!==null:!validDate(a.usedAt)))fail('INVALID_BACKUP','Activation hachee invalide. Aucun secret en clair autorise.');
    }
    if(s.collectibles.some(c=>!c.legacyInstanceId&&!s.activations.some(a=>a.id===c.id)))fail('INVALID_BACKUP','Activation manquante.');
    const offers=new Set();
    for(const t of s.transfers){
      const c=collectible(s,t.collectibleId);known(s,t.fromUserId);known(s,t.toUserId);
      if(!exact(t,['id','collectibleId','fromUserId','toUserId','status','createdAt','resolvedAt'])||!/^KT-[a-f0-9]{32}$/.test(t.id)||t.fromUserId===t.toUserId||!validDate(t.createdAt)||!['pending','accepted','cancelled','rejected'].includes(t.status)||
        (t.status==='pending'?t.resolvedAt!==undefined:!validDate(t.resolvedAt)))fail('INVALID_BACKUP','Transfert invalide.');
      if(t.status==='pending'){
        if(c.ownerId!==t.fromUserId||offers.has(c.id))fail('INVALID_BACKUP','Offre en attente incoherente.');
        offers.add(c.id);
      }
    }
    const types=['seeded','issued','activated','offered','accepted','cancelled','rejected','bound','released'];
    for(const e of s.events){
      collectible(s,e.collectibleId);known(s,e.actorId);
      if(!exact(e,['id','type','collectibleId','actorId','createdAt','transferId','matchId','instanceId'])||!/^KE-[a-f0-9]{32}$/.test(e.id)||!types.includes(e.type)||!validDate(e.createdAt))fail('INVALID_BACKUP','Evenement invalide.');
      if(e.type==='bound'||e.type==='released'){
        if(!/^match-[a-f0-9-]{36}$/.test(e.matchId)||e.transferId!==undefined||!new RegExp('^K4-'+collectible(s,e.collectibleId).cardId+'-00[1-4]$').test(e.instanceId))fail('INVALID_BACKUP','Historique de partie invalide.');
      }else if(['offered','accepted','cancelled','rejected'].includes(e.type)){
        const t=s.transfers.find(t=>t.id===e.transferId);
        if(!t||t.collectibleId!==e.collectibleId||e.actorId!==(['accepted','rejected'].includes(e.type)?t.toUserId:t.fromUserId))fail('INVALID_BACKUP','Historique de transfert invalide.');
      }else if(e.transferId!==undefined||e.matchId!==undefined||e.instanceId!==undefined)fail('INVALID_BACKUP','Champs historiques inattendus.');
    }
    // Replay ownership transitions, independent of caller-supplied current owner fields.
    for(const c of s.collectibles){
      const events=s.events.filter(e=>e.collectibleId===c.id),initial=events.filter(e=>['seeded','issued'].includes(e.type));
      if(initial.length!==1||initial[0].type!==(c.legacyInstanceId?'seeded':'issued')||initial[0].actorId!==PARIS)fail('INVALID_BACKUP','Origine de l\'exemplaire invalide.');
      const claims=events.filter(e=>e.type==='activated');
      if(claims.length!==(c.legacyInstanceId||c.status==='unclaimed'?0:1))fail('INVALID_BACKUP','Historique d\'activation incoherent.');
      let owner=c.legacyInstanceId?PARIS:claims[0]?.actorId||null;
      const accepted=s.transfers.filter(t=>t.collectibleId===c.id&&t.status==='accepted').sort((a,b)=>a.resolvedAt.localeCompare(b.resolvedAt)||a.createdAt.localeCompare(b.createdAt));
      for(const t of accepted){if(owner!==t.fromUserId)fail('INVALID_BACKUP','Chaine de proprietaires invalide.');owner=t.toUserId;}
      if(owner!==c.ownerId)fail('INVALID_BACKUP','Proprietaire incompatible avec l\'historique.');
      let historicalOwner=null,started=false;
      const timeline=events.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
      if(new Set(timeline.map(e=>e.createdAt)).size!==timeline.length)fail('INVALID_BACKUP','Ordre historique ambigu.');
      for(const e of timeline){
        if(['seeded','issued'].includes(e.type)){if(started)fail('INVALID_BACKUP','Origine historique dupliquee.');started=true;historicalOwner=e.type==='seeded'?PARIS:null;}
        else{
          if(!started)fail('INVALID_BACKUP','Evenement anterieur a l\'emission.');
          if(e.type==='activated'){if(historicalOwner!==null)fail('INVALID_BACKUP','Activation historique deja utilisee.');historicalOwner=e.actorId;}
          else if(e.type==='accepted'){
            const t=s.transfers.find(t=>t.id===e.transferId);
            if(historicalOwner!==t.fromUserId)fail('INVALID_BACKUP','Ordre des transferts incoherent.');historicalOwner=t.toUserId;
          }else if(e.type==='bound'&&e.actorId!==historicalOwner)fail('INVALID_BACKUP','La partie est liee a un profil qui ne possedait pas cet exemplaire.');
        }
      }
      if(historicalOwner!==c.ownerId)fail('INVALID_BACKUP','Historique de propriete incoherent.');
    }
    for(const t of s.transfers)for(const type of ['offered',...(t.status==='pending'?[]:[t.status])])if(s.events.filter(e=>e.transferId===t.id&&e.type===type).length!==1)fail('INVALID_BACKUP','Evenement de transfert manquant ou duplique.');
    const marker=s.registryMeta.find(m=>m.id==='seed-v1');
    if(!marker||!exact(marker,['id','version','createdAt'])||marker.version!==1||!validDate(marker.createdAt))fail('INVALID_BACKUP','Initialisation du registre manquante.');
    for(const m of s.registryMeta.filter(m=>m.id!=='seed-v1')){
      if(m.id.startsWith('lease-')){
        known(s,m.userId);
        if(!exact(m,['id','matchId','userId','releasedAt'])||m.id!=='lease-'+m.matchId||!/^match-[a-f0-9-]{36}$/.test(m.matchId)||!validDate(m.releasedAt))fail('INVALID_BACKUP','Archive de partie abandonnee invalide.');
      }else if(!['rate-'+PARIS,'rate-'+TOKYO].includes(m.id)||!exact(m,['id','attempts','windowStartedAt','blockedUntil'])||!rate(m))fail('INVALID_BACKUP','Limitation des activations invalide.');
    }
    return s;
  }
  function validateArchive(s){
    for(const m of s.registryMeta.filter(m=>m.id.startsWith('lease-'))){
      const match=s.matches.find(g=>g.id===m.matchId);
      if(!match||match.finalized||match.state.collection?.userId!==m.userId)fail('INVALID_BACKUP','Partie abandonnee absente ou incoherente.');
      for(const [instanceId,id] of Object.entries(match.state.collection.bindings))if(s.events.filter(e=>e.type==='released'&&e.matchId===m.matchId&&e.collectibleId===id&&e.instanceId===instanceId&&e.actorId===m.userId).length!==1)fail('INVALID_BACKUP','Historique d\'abandon manquant.');
    }
    for(const e of s.events.filter(e=>e.type==='bound'||e.type==='released')){
      const match=s.matches.find(m=>m.id===e.matchId);
      if(!match||match.state.collection?.userId!==e.actorId||match.state.collection.bindings[e.instanceId]!==e.collectibleId||e.type==='released'&&!released(s,e.matchId))fail('INVALID_BACKUP','Evenement de partie sans liaison correspondante.');
    }
    for(const t of s.transfers)if(t.status==='pending'&&active(s,t.collectibleId))fail('ACTIVE_GAME','Sauvegarde incoherente : transfert en attente sur une partie active.');
  }
  const sameRegistry=(a,b)=>stores.every(k=>stable([...a[k]].sort((x,y)=>x.id.localeCompare(y.id)))===stable([...b[k]].sort((x,y)=>x.id.localeCompare(y.id))));
  function pristine(s,data){
    return !s.matches.length&&!s.results.length&&s.collectibles.length===data.cards.length&&s.collectibles.every(c=>c.ownerId===PARIS&&c.legacyInstanceId)&&
      !s.activations.length&&!s.transfers.length&&s.events.length===data.cards.length&&s.events.every(e=>e.type==='seeded')&&s.registryMeta.length===1;
  }
  function create({data,engine,getCache,enqueue,transaction,refresh,isOpen}){
    const ready=()=>{if(!isOpen())fail('REGISTRY_UNAVAILABLE','Registre local indisponible : rechargez la page.');return getCache();};
    const read=fn=>copy(fn(ready()));
    const mutate=fn=>enqueue(async()=>{ready();return transaction(fn);});
    const own=(s,userId,cardId)=>s.collectibles.filter(c=>c.ownerId===userId&&c.status==='owned'&&(cardId===undefined||c.cardId===String(cardId)));
    const deckErrors=(userId,ids)=>{
      const s=ready();if(!s.users.some(u=>u.id===userId))return ['Profil local inconnu.'];
      if(!Array.isArray(ids))return ['Liste des cartes possedees invalide.'];
      const counts=new Map();for(const id of ids)counts.set(String(id),(counts.get(String(id))||0)+1);
      return [...counts].filter(([id,n])=>own(s,userId,id).filter(c=>!pending(s,c.id)).length<n).map(([id,n])=>`Propriete insuffisante pour ${id} : ${n} exemplaire(s) disponible(s) requis.`);
    };
    const validated=(game,userId)=>{
      const s=ready();engine.restoreGame(game);
      const old=s.matches.find(m=>m.id===game.matchId);
      if(old?.state.collection&&stable(old.state.collection)!==stable(game.collection))fail('BINDING_CHANGED','Liaison de collection modifiee.');
      return validate(game,userId,s,{historical:game.phase==='over'&&old?.finalized&&stable(old.state)===stable(game)});
    };
    const api={
      get initialized(){return isOpen();},
      users:()=>read(s=>s.users),user:id=>read(s=>s.users.find(u=>u.id===id)),
      owned:(userId,cardId)=>read(s=>{known(s,userId);return own(s,userId,cardId);}),
      get:id=>read(s=>s.collectibles.find(c=>c.id===id)),
      transfers:userId=>read(s=>{known(s,userId);return s.transfers.filter(t=>t.fromUserId===userId||t.toUserId===userId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(transferView);}),
      events:id=>read(s=>s.events.filter(e=>e.collectibleId===id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))),
      deckErrors,
      bindGame(userId,value){
        const game=engine.restoreGame(value),s=ready();known(s,userId);
        if(hasBinding(game)){validated(game,userId);return copy(game);}
        if(game.phase!=='setup'){
          validated(game,userId);
          return copy(game);
        }
        const errors=deckErrors(userId,units(game).map(u=>u.cardId));if(errors.length)fail('NOT_OWNER',errors.join(' '));
        const used=new Set(),bindings={};
        for(const u of units(game)){
          const c=own(s,userId,u.cardId).filter(c=>!used.has(c.id)&&!pending(s,c.id)).sort((a,b)=>Number(!a.legacyInstanceId)-Number(!b.legacyInstanceId)||a.id.localeCompare(b.id))[0];
          used.add(c.id);bindings[u.instanceId]=c.id;
        }
        game.collection={schema:1,userId,bindings,opponent:'virtual'};
        return copy(game);
      },
      validateGame:validated,
      matches:userId=>read(s=>{known(s,userId);return s.matches.filter(m=>(m.state.collection?.userId||PARIS)===userId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}),
      activeGames:userId=>read(s=>{
        known(s,userId);
        return s.matches.filter(m=>m.state.collection?.userId===userId&&!m.finalized&&!released(s,m.id)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
      }),
      career(userId,cardId,id=null){
        const s=ready();known(s,userId);
        const owned=own(s,userId,cardId).filter(c=>!id||c.id===id),byId=new Map(owned.map(c=>[c.id,c]));
        const result={games:0,wins:0,losses:0,draws:0,kills:0,holds:0,support:0,debuff:0,attack:0,defense:0,reraises:0,mvp:0,history:[]};
        for(const row of s.results){
          if(String(row.cardId)!==String(cardId)||row.side!==0||!row.participated||row.partial)continue;
          const match=s.matches.find(m=>m.id===row.matchId);if(!match)continue;
          const bound=match.state.collection;
          const item=bound?byId.get(bound.bindings[row.instanceId]):owned.find(c=>c.legacyInstanceId===row.instanceId);
          if(!item)continue;
          result.games++;result[row.winner==='draw'?'draws':row.winner===row.side?'wins':'losses']++;
          for(const key of ['kills','holds','support','debuff','attack','defense','reraises'])result[key]+=row[key]||0;
          if(row.rating>0&&row.rating===Math.max(...match.summary.units.map(u=>u.rating)))result.mvp++;
          result.history.push({...copy(row),publicId:item.id,seed:match.state.seed});
        }
        result.history.sort((a,b)=>b.finishedAt.localeCompare(a.finishedAt));return result;
      },
      issue:(actorId,cardId)=>enqueue(async()=>{
        ready();const code=random(32),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code))),n=>n.toString(16).padStart(2,'0')).join('');
        return transaction((s,write)=>{
          if(known(s,actorId).role!=='admin'||actorId!==PARIS)fail('ADMIN_REQUIRED','Seul le profil local Paris peut emettre un exemplaire.');
          if(!data.cards.some(c=>String(c.id)===String(cardId)))fail('UNKNOWN_CARD','Version de carte inconnue.');
          const item={id:'KC-'+random(16),cardId:String(cardId),ownerId:null,status:'unclaimed',createdAt:now()};
          write('collectibles',item);write('activations',{id:item.id,hash,usedAt:null,attempts:0,windowStartedAt:0,blockedUntil:0});event(s,write,'issued',item,actorId);
          return {collectible:copy(item),code};
        });
      }),
      activate:(userId,id,code)=>enqueue(async()=>{
        ready();const hash=typeof code==='string'&&/^[a-f0-9]{64}$/.test(code)?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code))),n=>n.toString(16).padStart(2,'0')).join(''):null;
        const result=await transaction((s,write)=>{
          known(s,userId);const at=Date.now(),key='rate-'+userId;
          const profile=s.registryMeta.find(m=>m.id===key)||{id:key,attempts:0,windowStartedAt:0,blockedUntil:0};
          const activation=s.activations.find(a=>a.id===id),item=s.collectibles.find(c=>c.id===id),limits=[profile,...(activation?[activation]:[])];
          if(limits.some(r=>r.blockedUntil>at))return {error:['RATE_LIMITED','Trop de tentatives. Reessayez dans une minute.']};
          for(const limit of limits)if(at-limit.windowStartedAt>=60000){limit.attempts=0;limit.windowStartedAt=at;limit.blockedUntil=0;}
          if(!item||!activation||activation.usedAt||item.status!=='unclaimed'||!hash||hash!==activation.hash){
            for(const limit of limits){limit.attempts++;if(limit.attempts>=5){limit.attempts=5;limit.blockedUntil=at+60000;}}
            write('registryMeta',profile);if(activation)write('activations',activation);
            return {error:['INVALID_ACTIVATION','Activation refusee : identifiant ou code invalide, ou code deja utilise.']};
          }
          activation.usedAt=now();activation.attempts=0;activation.blockedUntil=0;
          profile.attempts=0;profile.blockedUntil=0;
          item.ownerId=userId;item.status='owned';write('collectibles',item);write('activations',activation);write('registryMeta',profile);event(s,write,'activated',item,userId);
          return {collectible:copy(item)};
        });
        if(result.error)fail(...result.error);return result.collectible;
      }),
      offer:(userId,id,toUserId)=>mutate((s,write)=>{
        known(s,userId);known(s,toUserId);const item=collectible(s,id);
        if(userId===toUserId)fail('SAME_ACCOUNT','Choisissez un autre profil destinataire.');
        if(item.ownerId!==userId||item.status!=='owned')fail('NOT_OWNER','Seul le proprietaire peut proposer ce transfert.');
        if(pending(s,id))fail('PENDING_TRANSFER','Un transfert est deja en attente pour cet exemplaire.');
        if(active(s,id))fail('ACTIVE_GAME','Cet exemplaire participe a une partie non terminee.');
        const t={id:'KT-'+random(16),collectibleId:id,fromUserId:userId,toUserId,status:'pending',createdAt:now()};
        write('transfers',t);event(s,write,'offered',item,userId,{transferId:t.id});return transferView(t);
      }),
      releaseGame:(userId,matchId)=>mutate((s,write)=>{
        known(s,userId);const match=s.matches.find(m=>m.id===matchId);
        if(!match)fail('UNKNOWN_MATCH','Partie enregistree introuvable.');
        if(match.state.collection?.userId!==userId)fail('WRONG_ACCOUNT','Seul le profil de cette partie peut l\'abandonner.');
        if(match.finalized)fail('FINISHED_GAME','Cette partie est deja terminee.');
        const old=released(s,matchId);if(old)return copy(old);
        const lease={id:'lease-'+matchId,matchId,userId,releasedAt:now()};write('registryMeta',lease);
        for(const [instanceId,id] of Object.entries(match.state.collection.bindings))event(s,write,'released',{id},userId,{matchId,instanceId});
        return copy(lease);
      }),
      refresh:()=>enqueue(async()=>{ready();await refresh();})
    };
    const resolve=(userId,id,accept)=>mutate((s,write)=>{
      known(s,userId);const t=s.transfers.find(t=>t.id===id);if(!t)fail('UNKNOWN_TRANSFER','Transfert inconnu.');
      if(accept?userId!==t.toUserId:userId!==t.fromUserId&&userId!==t.toUserId)fail('WRONG_ACTOR','Ce profil ne peut pas effectuer cette action.');
      if(t.status!=='pending')fail('STALE_TRANSFER','Ce transfert a deja ete traite.');
      const item=collectible(s,t.collectibleId);
      if(item.ownerId!==t.fromUserId)fail('STALE_TRANSFER','Le proprietaire a change depuis cette proposition.');
      if(accept&&active(s,item.id))fail('ACTIVE_GAME','Cet exemplaire participe a une partie non terminee.');
      t.status=accept?'accepted':userId===t.fromUserId?'cancelled':'rejected';
      // Preserve causal ordering even when two complete transfers share a clock tick.
      t.resolvedAt=new Date(s.transfers.filter(x=>x.collectibleId===item.id&&x.resolvedAt).reduce((at,x)=>Math.max(at,Date.parse(x.resolvedAt)+1),Date.now())).toISOString();
      if(accept){item.ownerId=userId;write('collectibles',item);}
      write('transfers',t);event(s,write,t.status,item,userId,{transferId:t.id});return transferView(t);
    });
    api.accept=(userId,id)=>resolve(userId,id,true);api.cancel=(userId,id)=>resolve(userId,id,false);
    return Object.freeze(api);
  }
  window.KalistarOwnership=Object.freeze({PARIS,TOKYO,stores,seed,create,validateSave,recordBindings,validateBackup,validateArchive,sameRegistry,pristine,fail});
})();
