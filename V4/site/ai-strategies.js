(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarAI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const profiles=Object.freeze([
    {id:'kael',name:'Kael',title:'La Lance',style:'Assaut',icon:'swords',priorities:'Eliminations fiables, pression continue',kill:1.22,threat:.25,structure:.2,support:.72,potential:.6},
    {id:'maelis',name:'Ma\u00eblis',title:'Le Rempart',style:'Protection',icon:'shield',priorities:'Menaces prioritaires, compagnons prot\u00e9g\u00e9s',kill:1,threat:1.15,structure:.35,support:1.05,potential:.8},
    {id:'nox',name:'Nox',title:'Le Briseur',style:'Rupture',icon:'crosshair',priorities:'Capitaines, soutiens, synergies adverses',kill:1.02,threat:.5,structure:1.65,support:.8,potential:.8},
    {id:'lyra',name:'Lyra',title:'La Tisseuse',style:'Combinaisons',icon:'sparkles',priorities:'Soutiens utiles, ultimes, encha\u00eenements',kill:1,threat:.35,structure:.35,support:1.28,potential:1.5},
    {id:'soren',name:'Soren',title:'Le Strat\u00e8ge',style:'Adaptation',icon:'compass',priorities:'Occasions, \u00e9quilibre, \u00e9conomie des ressources',kill:1.08,threat:.7,structure:.7,support:1,potential:1}
  ].map(Object.freeze));
  const get=id=>profiles.find(p=>p.id===id)||null;
  const profile=(s,side=s.turn)=>get(s.ai?.profiles?.[side]);
  const name=s=>s.mode==='ai'?(profile(s,1)?.name||'Le Veilleur'):'Joueur 2';
  function validate(s){
    if(s.ai===undefined)return;
    const a=s.ai;
    if(!a||a.version!==1||!Array.isArray(a.profiles)||a.profiles.length!==2||a.profiles.some(id=>id!==null&&!get(id))||!a.profiles.some(Boolean)||Object.keys(a).some(k=>!['version','profiles'].includes(k)))throw Error('Profils IA incompatibles.');
  }
  const copy=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const board=(s,side)=>s.players[side].board.filter(Boolean);
  const phaseTrait={clover:'luck',potion:'mana',physical:'physical',heart:'reraise',guard:'ward'};
  const grant={clover:'grantClover',potion:'grantPotion',physical:'grantPhysical',heart:'grantReraise',guard:'grantGuard'};
  // Hypothetical branches share only immutable definitions and prior events.
  // They never read the live RNG; both outcomes of the coin are evaluated.
  function fork(s,rng=1){
    const q=s.equipment;
    const equipment=q?{...copy({...q,definitions:undefined,loadouts:undefined}),definitions:q.definitions,loadouts:q.loadouts}:undefined;
    return {...s,rng,players:copy(s.players),duel:copy(s.duel),lastDuel:null,log:[],kalistel:copy(s.kalistel),
      match:{...s.match,events:(s.match?.events||[]).slice(),...(s.match?.ultimateGrants?{ultimateGrants:s.match.ultimateGrants.slice()}: {})},
      ...(equipment?{equipment}:{})};
  }
  function prepare(s){
    const t=fork(s);
    if(t.equipment){
      const ids=new Set(t.equipment.loadouts.flatMap(l=>t.equipment.version===2?Object.values(l).flatMap(Object.values):Object.values(l)));
      // Unworn catalogue entries cannot affect a branch. Keep every equipped
      // definition (including donors in reserve/dead), never change its effect.
      t.equipment.definitions=t.equipment.definitions.filter(w=>ids.has(w.id));
    }
    return t;
  }
  function create(E){
    const numeric=(c,magic)=>c.atk.filter((v,i)=>Number.isFinite(v)&&(magic===undefined||c.magic.includes(6-i)===magic)).length/6;
    const relic=(s,u)=>E.equipmentView(s,u);
    function structure(s,u){
      const side=Number(u.uid[0]),p=s.players[side],without={...p,board:p.board.map(v=>v===u?null:v)};
      const lost=board(s,side).filter(v=>v!==u).reduce((n,v)=>n+E.synergy(p,v,'faction')-E.synergy(without,v,'faction')+E.synergy(p,v,'race')-E.synergy(without,v,'race'),0);
      const c=E.card(u),leader=E.captainUnit(s,side)?.uid===u.uid;
      return Math.min(42,lost*.3+(leader?12:0)+c.atk.filter(v=>['revive','guard','retry','mana','buff_atk'].includes(v)).length*3);
    }
    function threat(s,u){
      const c=E.card(u),foes=board(s,1-Number(u.uid[0]));
      if(!foes.length)return 0;
      const atk=E.mean(c.atk)+E.synergy(s.players[Number(u.uid[0])],u,'faction')+E.arenaBonuses(s,u).attack;
      return Math.max(...foes.map(v=>{
        const d=E.card(v),margin=atk-E.mean(d.defense)+(E.data.weapons[c.weapon]?.[d.weapon]||0)+E.elementModifier(c,d);
        return Math.max(0,Math.min(35,15+margin*.12))+(c.atk.includes('death')?6:0);
      }));
    }
    function traitValue(s,u,kind){
      const c=E.card(u),own=Number(u.uid[0]),foes=board(s,1-own),importance=structure(s,u)*.18+threat(s,u)*.15;
      if(kind==='mana'||kind==='physical')return numeric(c,kind==='mana')*(22+threat(s,u)*.25);
      if(kind==='reraise')return 37+importance;
      const pressure=foes.length?Math.max(...foes.map(v=>Math.max(0,Math.min(1,.5+(E.mean(E.card(v).atk)-E.mean(c.defense))/220)))):0;
      if(kind==='ward')return (10+18*pressure+importance)*(foes.length?foes.reduce((n,v)=>n+numeric(E.card(v),false),0)/foes.length:0);
      return 12+18*pressure+importance;
    }
    function supportScore(s,u,kind,p,sourceUid){
      if(u[kind])return -1000;
      let value=traitValue(s,u,kind);
      if(kind==='ward'||kind==='luck'||kind==='reraise')value+=p.id==='maelis'?structure(s,u)*.2:0;
      const source=board(s,Number(sourceUid?.[0])).find(v=>v.uid===sourceUid),w=source&&relic(s,source).weapon;
      const rec=s.equipment?.rituals?.records?.[sourceUid],e=w?.effect;
      if(u.uid!==sourceUid&&e?.event==='SUPPORT'&&(!e.traits||e.traits.includes(kind))&&(!rec||rec.status==='tracking')&&(!e.distinct||!rec?.progress.some(v=>v.recipient===u.uid)))value+=8*p.potential;
      return value;
    }
    function support(s,kind,p=profile(s)||get('soren')){
      return board(s,s.turn).map(u=>({uid:u.uid,score:supportScore(s,u,kind,p,s.duel?.attacker)})).sort((a,b)=>b.score-a.score||a.uid.localeCompare(b.uid))[0]?.uid;
    }
    function equipmentChoice(s){
      const ch=E.equipmentChoice(s);if(!ch)return undefined;
      const side=Number(ch.sourceUid[0]),p=profile(s,side)||get('soren');
      if(ch.mode==='parity'){
        const a=board(s,1-side).find(u=>u.uid===s.duel?.attacker),c=E.card(a);
        const value=parity=>c.atk.reduce((n,v,i)=>n+(Number.isFinite(v)&&(6-i)%2===parity?1:0),0);
        return value(1)>value(0)?'odd':'even';
      }
      const options=ch.options||ch.targets.map(uid=>({uid,value:uid}));
      return options.map(o=>{
        const u=s.players.flatMap(p=>p.board.filter(Boolean)).find(u=>u.uid===(o.uid||ch.targets[0]));
        if(!u)return {...o,score:-Infinity};
        const action=ch.weapon?.effect?.action;
        const kinds=ch.mode==='trait'?[o.value]:action?.traits||[ch.trait||'ward'];
        const score=Number(u.uid[0])!==side?threat(s,u)+structure(s,u)*.2:
          kinds.reduce((n,k)=>n+(u[k]?0:supportScore(s,u,k,p,ch.sourceUid)),0);
        return {...o,score};
      }).sort((a,b)=>b.score-a.score||a.value.localeCompare(b.value))[0]?.value;
    }
    function settleChoices(s){
      for(let i=0;E.equipmentChoice(s);i++){
        if(i>=64)throw Error('Choix IA non termine.');
        E.grantEquipment(s,equipmentChoice(s));
      }
    }
    function potential(s,side){
      let value=0;
      for(const u of board(s,side)){
        const v=relic(s,u),r=s.equipment?.rituals?.records?.[u.uid];
        if(!v.weapon)continue;
        if(v.ready)value+=12;
        else if(r?.status==='tracking')value+=Math.min(1,r.progress.length/(v.weapon.effect.count||1))*7;
      }
      return value;
    }
    function context(s,p,side=s.turn){
      const weights=p.id==='soren'?{...p,support:p.support+(board(s,side).length<board(s,1-side).length?.16:0)}:p;
      const values=new Map(),traits=new Map();
      for(let owner=0;owner<2;owner++)for(const u of board(s,owner)){
        values.set(u.uid,100*weights.kill+threat(s,u)*weights.threat+structure(s,u)*weights.structure);
        for(const kind of ['reraise','luck','ward','mana','physical'])traits.set(u.uid+kind,traitValue(s,u,kind)*weights.support);
      }
      const coin=s.players.some(p=>p.board.some(u=>u&&relic(s,u).weapon?.effect.action?.kind==='COIN'));
      return {p:weights,side,values,traits,potential:[potential(s,0),potential(s,1)],original:s,coin};
    }
    function resultValue(s,ctx){
      let value=0,kills=0;
      for(let owner=0;owner<2;owner++){
        const sign=owner===ctx.side?1:-1,before=board(ctx.original,owner),after=board(s,owner);
        for(const u of before){
          const now=after.find(v=>v.uid===u.uid);
          if(!now){value-=sign*ctx.values.get(u.uid);if(sign<0)kills++;}
          for(const kind of ['reraise','luck','ward','mana','physical'])value+=sign*(Number(!!now?.[kind])-Number(!!u[kind]))*ctx.traits.get(u.uid+kind);
        }
        value+=sign*(potential(s,owner)-ctx.potential[owner])*ctx.p.potential;
        if(before.length&&!after.length)value-=sign*(s.players[owner].reserve.length?70:1500);
      }
      return {score:value,kills};
    }
    function outcomes(s,ctx){
      settleChoices(s);
      if(grant[s.phase])E[grant[s.phase]](s,support(s,phaseTrait[s.phase],ctx.p));
      settleChoices(s);
      if(s.phase!=='defense')return resultValue(s,ctx);
      const c=E.card(s.players[1-s.duel.side].board[s.duel.targetSlot]);
      // Retry faces repeat the same DEF distribution. Condition on non-retry
      // faces, then enumerate the single possible clover reroll separately.
      const dice=c.defense.flatMap((v,i)=>v==='retry'?[]:[6-i]);
      if(!dice.length)return {score:0,kills:0};
      const total={score:0,kills:0};
      for(const die of dice){
        const t=fork(s,s.rng);E.rollDefense(t,die);settleChoices(t);
        const value=t.phase==='defense'?outcomes(t,ctx):resultValue(t,ctx);
        total.score+=value.score/dice.length;total.kills+=value.kills/dice.length;
      }
      return total;
    }
    function attackOutcomes(s,ctx,die,locked=false){
      const seeds=ctx.coin?[1,8192]:[1],total={score:0,kills:0};
      for(const rng of seeds){
        const t=fork(s,rng);
        if(!locked){E.rollAttack(t,die);if(t.phase==='kalistel')E.acceptAttack(t);}
        else if(die===null)E.acceptAttack(t);
        else E.useKalistel(t,die);
        const value=outcomes(t,ctx);
        total.score+=value.score/seeds.length;total.kills+=value.kills/seeds.length;
      }
      return total;
    }
    function* evaluate(s,p=profile(s)||get('soren')){
      s=prepare(s);
      const ctx=context(s,p);
      for(let i=0;i<5;i++)if(s.players[s.turn].board[i])for(let j=0;j<5;j++)if(s.players[1-s.turn].board[j]){
        const t=fork(s);E.lock(t,i,j);settleChoices(t);
        let score=0,kills=0;
        for(let die=1;die<=6;die++){const v=attackOutcomes(t,ctx,die);score+=v.score/6;kills+=v.kills/6;}
        yield {pair:[i,j],score,kills};
      }
    }
    const sort=rows=>rows.sort((a,b)=>b.score-a.score||b.kills-a.kills||a.pair[0]-b.pair[0]||a.pair[1]-b.pair[1]);
    const rank=(s,p)=>sort([...evaluate(s,p)]);
    async function chooseAsync(s,{cancelled=()=>false}={}){
      const rows=[],iterator=evaluate(fork(s));
      for(;;){
        if(cancelled())return null;
        const row=iterator.next();if(row.done)break;
        rows.push(row.value);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      return cancelled()?null:sort(rows)[0]?.pair||null;
    }
    function useKalistel(s){
      if(s.phase!=='kalistel'||!E.kalistelRemaining(s,s.turn))return false;
      s=prepare(s);
      const ctx=context(s,profile(s)||get('soren')),keep=attackOutcomes(s,ctx,null,true);
      let expected=0;for(let die=1;die<=6;die++)expected+=attackOutcomes(s,ctx,die,true).score/6;
      return expected-keep.score>18;
    }
    function deploymentScore(s,side,chosen){
      const t=fork(s),p=profile(s,side);if(!p)return 0;
      for(const [slot,uid] of chosen)t.players[side].board[slot]=t.players[side].reserve.find(u=>u.uid===uid);
      return board(t,side).reduce((n,u)=>n+threat(t,u)*p.kill+structure(t,u)*p.structure+E.mean(E.card(u).defense)*p.threat*.1,0);
    }
    return {rank,choose:s=>rank(s)[0]?.pair||null,chooseAsync,support,equipmentChoice,useKalistel,deploymentScore};
  }
  return {profiles,get,profile,name,validate,create};
});
