(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarCloudOwnership=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const copy=value=>structuredClone(value),stable=value=>JSON.stringify(value),publicId=/^KC-[a-f0-9]{32}$/;
  const units=game=>[...game.players[0].board.filter(Boolean),...game.players[0].reserve,...game.players[0].dead];
  function fail(message){const e=Error(message);e.name='OwnershipError';throw e;}
  function create({data,engine,player,getCache,enqueue,transaction,refresh,isOpen}){
    const userId=player.localProfile;
    if(!['user-paris','user-tokyo'].includes(userId)||!Array.isArray(player.cards))fail('Collection serveur invalide.');
    let cards=[],pending=new Set();
    function update(next){
      if(next.localProfile!==userId||!Array.isArray(next.cards)||next.cards.some(c=>!publicId.test(c.id)||!engine.byId[c.modelId])||new Set(next.cards.map(c=>c.id)).size!==next.cards.length)fail('Collection serveur incompatible avec ce catalogue.');
      cards=next.cards.filter(c=>c.status==='owned').map(c=>({...copy(c),cardId:c.modelId,ownerId:userId}));pending=new Set(next.pending||[]);
    }
    update(player);
    const known=id=>{if(!isOpen()||id!==userId)fail('Cette collection appartient a un autre compte.');};
    const owned=(id,cardId)=>{known(id);return copy(cards.filter(c=>cardId===undefined||c.cardId===String(cardId)));};
    const deckErrors=(id,ids)=>{
      known(id);if(!Array.isArray(ids))return ['Deck invalide.'];const counts=new Map();for(const cardId of ids)counts.set(cardId,(counts.get(cardId)||0)+1);
      return [...counts].filter(([cardId,n])=>owned(id,cardId).filter(c=>!pending.has(c.id)).length<n).map(()=> 'Tu ne possedes pas tous les exemplaires disponibles de ce deck.');
    };
    const released=matchId=>getCache().registryMeta.some(m=>m.id==='lease-'+matchId);
    function validateGame(game,id,{historical=false}={}){
      known(id);const b=game.collection;
      if(!b||b.schema!==1||b.userId!==id||b.opponent!=='virtual'||!b.bindings||typeof b.bindings!=='object')fail('Partie liee a une autre collection.');
      const own=units(game),values=Object.values(b.bindings);
      if(values.length!==own.length||new Set(values).size!==own.length||values.some(v=>!publicId.test(v))||own.some(u=>!Object.hasOwn(b.bindings,u.instanceId)))fail('Exemplaires de partie invalides.');
      if(!historical){
        if(released(game.matchId))fail('Cette partie a ete abandonnee.');
        for(const u of own){const c=cards.find(c=>c.id===b.bindings[u.instanceId]);if(!c||c.cardId!==u.cardId||pending.has(c.id))fail('Un exemplaire de cette partie n est plus disponible.');}
      }
      return true;
    }
    const matches=id=>{known(id);return copy(getCache().matches).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));};
    const api={
      get initialized(){return isOpen();},update,owned,deckErrors,
      user:id=>{known(id);return {id,name:player.label,email:player.label,role:'user'};},
      users:()=>[{id:userId,name:player.label,role:'user'}],get:id=>copy(cards.find(c=>c.id===id)),
      transfers:()=>[...pending].map(id=>({collectibleId:id,status:'pending',fromUserId:userId})),events:()=>[],matches,
      activeGames:id=>matches(id).filter(m=>!m.finalized&&!released(m.id)),
      bindGame(id,value){
        known(id);const game=engine.restoreGame(value);
        if(game.collection){validateGame(game,id);return game;}
        const freshComposition=game.composition&&game.phase==='initiative'&&game.round===1&&game.duel===null&&game.initiative?.first===null&&game.initiative.rolls.length===0&&game.match?.events.length===0;
        if(game.phase!=='setup'&&!freshComposition)fail('Une partie ancienne doit etre migree avant reprise.');
        const errors=deckErrors(id,units(game).map(u=>u.cardId));if(errors.length)fail(errors[0]);
        const used=new Set(),bindings={};for(const u of units(game)){const c=cards.find(c=>c.cardId===u.cardId&&!used.has(c.id)&&!pending.has(c.id));used.add(c.id);bindings[u.instanceId]=c.id;}
        game.collection={schema:1,userId:id,bindings,opponent:'virtual'};return game;
      },
      validateGame:(game,id)=>validateGame(game,id,{historical:game.phase==='over'}),
      validateSave(game,old,{restoring=false}={}){
        if(old&&stable(old.state.collection)!==stable(game.collection))fail('La liaison des exemplaires est immuable.');
        validateGame(game,userId,{historical:restoring||game.phase==='over'});
      },
      releaseGame:(id,matchId)=>{known(id);return enqueue(()=>transaction((s,write)=>{const row={id:'lease-'+matchId,matchId,userId:id,releasedAt:new Date().toISOString()};write('registryMeta',row);return row;}));},
      refresh:()=>enqueue(refresh),
      career(id,cardId,selected=null){
        known(id);const T=globalThis.KalistarTrophies,result=T?T.empty():{games:0,wins:0,losses:0,draws:0,kills:0,holds:0,support:0,debuff:0,attack:0,defense:0,reraises:0,mvp:0,history:[]};
        const rows=new Map(getCache().matches.map(m=>[m.id,m]));
        for(const row of getCache().results){
          if(row.cardId!==cardId||row.side!==0||!row.participated||row.partial)continue;
          const m=rows.get(row.matchId),specimen=m?.state.collection?.bindings[row.instanceId];if(!m?.finalized||!specimen||selected&&selected!==specimen)continue;
          const trophies=T?.awards(m.summary)[row.uid]||[];
          if(T)T.add(result,row,trophies);else{result.games++;result[row.winner==='draw'?'draws':row.winner===row.side?'wins':'losses']++;for(const k of ['kills','holds','support','debuff','attack','defense','reraises'])result[k]+=row[k]||0;}
          result.history.push({...copy(row),trophies,publicId:specimen,seed:m.state.seed});
        }
        result.history.sort((a,b)=>b.finishedAt.localeCompare(a.finishedAt));return result;
      }
    };
    return api;
  }
  return {create};
});
