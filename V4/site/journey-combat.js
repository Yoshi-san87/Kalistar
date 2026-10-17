(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./engine.js'):root.KalistarEngine,node?require('./team-composition.js'):root.KalistarTeamComposition,node?require('./journey-definitions.js'):root.KalistarJourneyDefinitions);if(node)module.exports=api;else root.KalistarJourneyCombat=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Engine,Composition,Definitions){
  'use strict';
  const methods=new Set(['rollInitiative','lock','rollAttack','rollDefense','useKalistel','acceptAttack','grantClover','grantPotion','grantPhysical','grantReraise','grantGuard','grantEquipment','deploy','autoDeploy','next']);
  const snapshots=new WeakMap();
  function freeze(data,state){
    const ids=new Set(state.players.flatMap(p=>[...p.board.filter(Boolean),...p.reserve,...p.dead].map(u=>u.cardId)));
    return structuredClone({version:4,edition:'V4',cards:data.cards.filter(c=>ids.has(c.id)),arenas:data.arenas.filter(a=>a.id===state.arenaId),elements:data.elements,weapons:data.weapons,rules:data.rules,demo:data.demo});
  }
  function engineFor(data,state){
    const saved=state?.journey?.snapshot;if(!saved)return null;
    if(!snapshots.has(data))snapshots.set(data,new WeakMap());
    const cached=snapshots.get(data);
    if(!cached.has(saved)){
      // Check current identities, but validate historical profiles with their own matrices.
      const frozen=structuredClone(saved);
      cached.set(saved,Engine.createArchiveEngine({...frozen,cards:data.cards},{profiles:frozen.cards,rules:frozen.demo,arenas:frozen.arenas}));
    }
    return cached.get(saved);
  }
  function create(data,{resume=false}={}){
    const E=Engine.createEngine(data),Team=Composition.create(E),books=resume?[]:Definitions.validate(data,E,Team);
    const fail=()=>{throw Error('Commande de parcours refusee.');};
    function initial(attempt){
      const book=books.find(b=>b.id===attempt.bookId),stage=book?.stages[attempt.stage];
      if(!stage||book.revision!==attempt.revision)throw Error('Edition de parcours indisponible.');
      const own=Team.normalize(attempt.deck),enemy=Team.fromPreset({name:book.subtitle,cards:stage.deck});enemy.captain=stage.captain;
      const game=E.newGame(own,enemy,{mode:'ai',seed:attempt.seed,arenaId:stage.arenaId,turnOrder:'ABBA',deckCoverage:2});
      const used=new Set(game.equipment.loadouts.flatMap(loadout=>Object.values(loadout).flatMap(items=>Object.values(items))));
      const definitions=game.equipment.definitions.filter(item=>used.has(item.id));
      // Keep every equipped definition frozen; unequipped catalogue entries do
      // not need to cross the network on each command. Legacy validation needs one.
      game.equipment.definitions=definitions.length?definitions:game.equipment.definitions.slice(0,1);
      game.matchId='match-'+attempt.id;
      const units=[...game.players[0].board.filter(Boolean),...game.players[0].reserve];
      const cards=attempt.cards,bindings={};
      for(const u of units){const specimen=cards.find(c=>c.modelId===u.cardId);if(!specimen)throw Error('Exemplaire de parcours absent.');bindings[u.instanceId]=specimen.id;}
      game.collection={schema:1,userId:attempt.localProfile,opponent:'virtual',bindings};
      game.journey={version:1,attemptId:attempt.id,bookId:book.id,stage:attempt.stage,revision:book.revision,sequence:1};
      game.journey.snapshot=freeze(data,game);
      E.assertState(game);return game;
    }
    function automatic(s,engine=engineFor(data,s)||E){
      const gift=engine.equipmentChoice(s);
      return gift?String(gift.sourceUid).startsWith('1-'):s.phase==='defense'?(s.duel.autoDefense||s.turn===0):s.phase==='replace'?s.replacing===1:['choose','attack','kalistel','clover','potion','physical','heart','guard'].includes(s.phase)&&s.turn===1;
    }
    function expectedAI(s,method,args,E){
      if(method==='lock')return JSON.stringify(args)===JSON.stringify(E.aiChoice(s));
      if(method==='grantEquipment')return args[0]===E.aiEquipmentChoice(s);
      if(method==='useKalistel'||method==='acceptAttack')return (method==='useKalistel')===E.aiUseKalistel(s);
      const support={grantClover:'aiCloverChoice',grantPotion:'aiPotionChoice',grantPhysical:'aiPhysicalChoice',grantReraise:'aiReraiseChoice',grantGuard:'aiGuardChoice'};
      if(support[method])return args[0]===E[support[method]](s);
      if(method==='autoDeploy')return args[0]===1;
      return method==='rollAttack'||method==='rollDefense';
    }
    function apply(value,commands){
      const engine=engineFor(data,value)||E;
      const s=engine.restoreGame(value);
      if(!s.journey||!Array.isArray(commands)||commands.length<1||commands.length>8)fail();
      for(const command of commands){
        const {method,args=[]}=command||{};
        if(!methods.has(method)||!Array.isArray(args)||args.length>3||args.some(v=>typeof v!=='string'&&!Number.isInteger(v)))fail();
        if(s.phase==='over')fail();
        if(method==='next'){if(s.phase!=='result'||args.length)fail();}
        else if(method==='rollInitiative'){if(s.phase!=='initiative'||args.length)fail();}
        else if(automatic(s,engine)){if(!expectedAI(s,method,args,engine))fail();}
        else{
          const allowed={choose:['lock'],attack:['rollAttack'],defense:['rollDefense'],kalistel:['useKalistel','acceptAttack'],clover:['grantClover'],potion:['grantPotion'],physical:['grantPhysical'],heart:['grantReraise'],guard:['grantGuard'],replace:['deploy','autoDeploy']};
          if(engine.equipmentChoice(s)){if(method!=='grantEquipment')fail();}
          else if(!allowed[s.phase]?.includes(method))fail();
          if(method==='deploy'&&args[0]!==0||method==='autoDeploy'&&args[0]!==0)fail();
        }
        if(['rollAttack','rollDefense','acceptAttack','useKalistel','rollInitiative','next'].includes(method)&&args.length)fail();
        engine[method](s,...args);engine.assertState(s);
      }
      s.journey.sequence++;return s;
    }
    return {initial,apply,automatic,engine:E,books};
  }
  return {create,freeze,engineFor,methods:[...methods]};
});
