(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarJourneyClient=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  function create({data,player,sync,onUpdate=()=>{},fetcher=root.fetch,localAdmin=false}){
    const definitions=root.KalistarJourneyDefinitions.catalogue(data);
    let state={status:'loading',error:'',isAdmin:false,books:definitions,progress:{}},destroyed=false,generation=0,libraryEpoch=0;
    const requests=new Set();
    const snapshot=()=>structuredClone(state);
    function update(value){if(destroyed)return;state={...state,...value};onUpdate(snapshot());}
    async function request(action,input={}){
      const ticket=generation;if(destroyed)throw Error('Parcours interrompu.');
      if(!player)throw Error('Les parcours avec recompense necessitent le compte Kalistar en ligne.');
      const identity=await player.client.auth.getSession(),session=identity.data?.session;
      if(destroyed||ticket!==generation)throw Error('Parcours interrompu.');
      if(identity.error||session?.user?.id!==player.userId)throw Error('Reconnecte-toi pour retrouver ton parcours.');
      const controller=new AbortController();requests.add(controller);const timer=setTimeout(()=>controller.abort(),20000);
      try{
        const response=await fetcher('/api/journeys/'+action,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(input),signal:controller.signal});
        const result=await response.json();
        if(destroyed||ticket!==generation)throw Error('Parcours interrompu.');
        if(!response.ok)throw Object.assign(Error(result.error||'Parcours indisponible.'),{code:result.code,attempt:result.attempt});
        return result;
      }finally{clearTimeout(timer);requests.delete(controller);}
    }
    function project(result){
      if(!Array.isArray(result.books)||typeof result.isAdmin!=='boolean')throw Error('Story indisponible : donnees incompatibles.');
      const progress={};
      for(const book of result.books){
        const definition=definitions.find(b=>b.id===book.id);
        if(!definition||book.revision!==definition.revision||!Number.isInteger(book.cleared)||book.cleared<0||book.cleared>4+(definition.bonusStages?.length||0))throw Error('Edition de livre incompatible.');
        const reward=data.cards.find(card=>card.id===book.rewardModelId);
        if(typeof book.rewardModelId!=='string'||!(/^[34][0-9]{7}$/).test(book.rewardModelId)||
          data.cards.length&&(!reward||reward.characterId!==definition.characterId)||
          book.claimedRewardModelId!==undefined&&(book.claimed?book.claimedRewardModelId!==book.rewardModelId:book.claimedRewardModelId!==null))throw Error('Recompense de livre incompatible.');
        const claims=book.equipmentClaims===undefined?[]:book.equipmentClaims;
        if(!Array.isArray(claims)||claims.length>3||claims.some(c=>!c||typeof c!=='object')||new Set(claims.map(c=>c.stage)).size!==claims.length||claims.some(c=>{
          const stage=definition.bonusStages?.[c.stage-4];
          return !Number.isInteger(c.stage)||!stage||stage.rewardEquipmentId!==c.equipmentId||stage.rewardKind!==c.kind||c.stage>=book.cleared||typeof c.acknowledged!=='boolean'||typeof c.alreadyOwned!=='boolean';
        }))throw Error('Recompenses de livre incompatibles.');
        progress[book.id]=book;
      }
      // A receipt can name an older print. Never replace that earned card with a later reward definition.
      update({status:'ready',error:'',isAdmin:result.isAdmin,books:definitions.filter(b=>Object.hasOwn(progress,b.id)).map(b=>({...b,rewardModelId:progress[b.id].rewardModelId})),progress});
    }
    async function refresh(){
      const ticket=++libraryEpoch;
      if(!player){update({status:'ready',isAdmin:localAdmin,error:'',progress:Object.fromEntries(definitions.map(b=>[b.id,{cleared:0,completed:false,claimed:false,acknowledged:false,activeAttempt:null}]))});return snapshot();}
      try{const result=await request('library');if(ticket===libraryEpoch)project(result);}catch(error){if(ticket!==libraryEpoch)return snapshot();update({status:'error',error:error.message,isAdmin:false});throw error;}
      return snapshot();
    }
    async function device(){
      if(destroyed)throw Error('Parcours interrompu.');const current=await sync.flush();if(destroyed)throw Error('Parcours interrompu.');if(!current.canWrite||current.pending)throw Error('Reprends la sauvegarde sur cet appareil avant de jouer.');return current.deviceId;
    }
    const check=attempt=>{
      if(!attempt?.state||attempt.localProfile!==player.player.localProfile||attempt.state.journey?.attemptId!==attempt.id||attempt.state.journey?.sequence!==attempt.sequence)throw Error('Sauvegarde de parcours incompatible.');
      return attempt.state;
    };
    async function start(bookId,deck){return check((await request('start',{bookId,deck,deviceId:await device()})).attempt);}
    async function resume(attemptId){return check((await request('context',{attemptId,deviceId:await device()})).attempt);}
    async function move(game,commands){
      const deviceId=sync.snapshot().deviceId;
      if(!sync.snapshot().canWrite)throw Error('Reprends ce parcours sur cet appareil avant de jouer.');
      const input={attemptId:game.journey.attemptId,sequence:game.journey.sequence,commands,deviceId};
      let result;
      try{result=await request('move',input);}catch(error){
        // Do not repeat a random draw after an acknowledgement is lost.
        if(error.attempt?.sequence===game.journey.sequence+1)result={attempt:error.attempt};
        else if(!error.code&&!error.attempt){
          const recovered=await request('context',{attemptId:input.attemptId,deviceId});
          if(recovered.attempt.sequence!==game.journey.sequence+1)throw error;result=recovered;
        }else throw error;
      }
      const next=check(result.attempt);if(next.phase==='over')void refresh().catch(()=>{});return next;
    }
    async function abandon(attemptId){libraryEpoch++;const result=await request('abandon',{attemptId,deviceId:await device()});libraryEpoch++;project(result);}
    async function claim(bookId){libraryEpoch++;const result=await request('claim',{bookId});libraryEpoch++;await player.refresh();await refresh();return result;}
    async function acknowledge(bookId){libraryEpoch++;const result=await request('ack',{bookId});libraryEpoch++;project(result);}
    async function claimEquipment(bookId,stage){
      libraryEpoch++;const result=await request('equipment-claim',{bookId,stage});libraryEpoch++;
      const expected=definitions.find(b=>b.id===bookId)?.bonusStages?.[stage-4];
      if(!Number.isInteger(stage)||!expected||result.equipmentId!==expected.rewardEquipmentId||result.kind!==expected.rewardKind||result.stage!==stage||typeof result.alreadyOwned!=='boolean'||typeof result.replayed!=='boolean')throw Error('Recompense de livre incompatible.');
      await player.refresh();await refresh();return result;
    }
    async function acknowledgeEquipment(bookId,stage){libraryEpoch++;const result=await request('equipment-ack',{bookId,stage});libraryEpoch++;project(result);}
    return {snapshot,refresh,start,resume,move,abandon,claim,acknowledge,claimEquipment,acknowledgeEquipment,destroy(){destroyed=true;generation++;for(const controller of requests)controller.abort();requests.clear();}};
  }
  return {create};
});
