(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarRelicUltimates=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const is=w=>['OUTNUMBERED_GIFT','TACTICAL_REPRISAL'].includes(w?.effect?.trigger);
  const gift=w=>w?.effect?.trigger==='OUTNUMBERED_GIFT';
  const units=s=>s.players.flatMap(p=>[...p.board.filter(Boolean),...p.reserve,...p.dead]);
  const board=(s,uid)=>s.players[Number(uid[0])].board.filter(Boolean);
  const rows=s=>s.equipment?.ultimates?.records||[];
  const row=(s,uid)=>rows(s).find(r=>r.sourceUid===uid);
  const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const fail=()=>{throw new Error('Etat de relique ultime invalide.');};
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const round=(n,s)=>Number.isInteger(n)&&n>=1&&n<=s.round;
  const keys=(o,names)=>object(o)&&Object.keys(o).every(k=>names.includes(k));
  const hostile=d=>typeof d?.attackValue==='number'||d?.attackValue==='death';
  const outnumbered=(s,uid)=>board(s,uid).length<s.players[1-Number(uid[0])].board.filter(Boolean).length;
  const candidates=(s,u,w)=>board(s,u.uid).filter(v=>v!==u&&!v[w.effect.trait]);
  function validateEffect(w){
    const e=w.effect;
    if(w.rulesVersion!==2||w.slot!=='relic')fail();
    if(gift(w)){
      if(!keys(e,['trigger','event','trait','recipient','duration'])||e.duration!=='ONCE_MATCH'||
        !(e.event==='TARGETED'&&e.trait==='luck'&&e.recipient==='allies'||e.event==='ELIMINATED'&&e.trait==='reraise'&&e.recipient==='choice'))fail();
    }else if(!keys(e,['trigger','stat','value','duration','advantages'])||e.stat!=='ATK'||e.value!==60||e.duration!=='NEXT_TARGET_ATTACK'||
      !Array.isArray(e.advantages)||!e.advantages.length||new Set(e.advantages).size!==e.advantages.length||e.advantages.some(k=>!['weapon','element','faction','arenaAttack'].includes(k)))fail();
  }
  function view(s,u,w){
    const r=row(s,u.uid),live=board(s,u.uid).includes(u),playing=!['setup','initiative','over'].includes(s.phase);
    const ready=playing&&live&&(r?r.status==='ready':gift(w)&&outnumbered(s,u.uid));
    const used=s.duel?.relicEvents?.some(e=>e.kind==='riposte'&&e.sourceUid===u.uid)&&!['choose','replace','over'].includes(s.phase);
    return {weapon:w,active:!!(ready||used),ready:!!ready,status:r?.status||(ready?'prepared':'inactive'),targetUid:r?.targetUid||null};
  }
  function remember(s,u,w,extra){
    const r={sourceUid:u.uid,weaponId:w.id,round:s.round,...extra};
    (s.equipment.ultimates??={records:[]}).records.push(r);return r;
  }
  function visual(s,r,kind,extra={}){(s.duel.relicEvents??=[]).push({kind,weaponId:r.weaponId,sourceUid:r.sourceUid,...extra});}
  function lock(s,b,w){
    if(!gift(w))return;
    s.duel.relicContext={sourceUid:b.uid,weaponId:w.id,allies:board(s,b.uid).map(u=>u.uid),enemies:s.players[1-Number(b.uid[0])].board.filter(Boolean).map(u=>u.uid)};
  }
  function transfer(s,r,u,trait,grant){
    if(u[trait])return;
    grant(u,trait,r.sourceUid);
    const entry={weaponId:r.weaponId,sourceUid:r.sourceUid,recipient:u.uid,kind:trait};
    (s.duel.relicGrants??=[]).push(entry);(r.grants??=[]).push(u.uid);visual(s,r,trait,{recipient:u.uid});
  }
  function accepted(s,equipped,card,grant,threat){
    if(!s.equipment||!hostile(s.duel))return [];
    const d=s.duel,all=units(s),a=all.find(u=>u.uid===d.attacker),b=all.find(u=>u.uid===d.target),aw=equipped(s,a,card(a)),bw=equipped(s,b,card(b)),messages=[];
    if(aw?.effect.trigger==='TACTICAL_REPRISAL'&&typeof d.attackValue==='number'){
      const r=row(s,a.uid);
      if(r?.status==='ready'&&r.targetUid===b.uid){
        r.status='spent';r.consumedRound=s.round;
        d.equipment.attack={weaponId:aw.id,name:aw.name,stat:'ATK',value:aw.effect.value,sourceUid:a.uid};
        visual(s,r,'riposte',{targetUid:b.uid});messages.push(aw.name+' : +60 ATK sur la riposte contre '+card(b).name+'.');
      }
    }
    if(bw?.effect.trigger==='TACTICAL_REPRISAL'&&typeof d.attackValue==='number')d.relicThreat={...threat};
    const c=d.relicContext;
    if(gift(bw)&&bw.effect.event==='TARGETED'&&!row(s,b.uid)&&c?.allies.length<c?.enemies.length){
      const recipients=candidates(s,b,bw);
      if(recipients.length){
        const r=remember(s,b,bw,{status:'spent',context:c,grants:[]});
        for(const u of recipients)transfer(s,r,u,'luck',grant);
        messages.push(bw.name+' : un nouveau trefle pour '+recipients.map(u=>card(u).name).join(', ')+'. Une fois par partie.');
      }
    }
    return messages;
  }
  function after(s,equipped,card){
    if(!s.equipment)return [];
    const d=s.duel,ev=s.match?.events.find(e=>e.round===s.round),all=units(s),b=all.find(u=>u.uid===d.target),w=equipped(s,b,card(b)),messages=[];
    if(!ev)return messages;
    for(const r of rows(s))if(r.status==='ready'&&s.players[1-Number(r.sourceUid[0])].dead.some(u=>u.uid===r.targetUid)){
      r.status='lost';r.lostRound=s.round;
    }
    if(!is(w)||row(s,b.uid))return messages;
    if(gift(w)&&w.effect.event==='ELIMINATED'&&ev.kill&&d.relicContext?.allies.length<d.relicContext?.enemies.length&&candidates(s,b,w).length){
      const r=remember(s,b,w,{status:'choice',context:d.relicContext,grants:[]});visual(s,r,'sacrifice');
      messages.push(w.name+' : choisissez un compagnon pour recevoir le dernier coeur de '+card(b).name+'.');
    }else if(w.effect.trigger==='TACTICAL_REPRISAL'&&!ev.kill&&!ev.support&&typeof d.attackValue==='number'&&w.effect.advantages.some(k=>d.relicThreat?.[k]>0)){
      const r=remember(s,b,w,{status:'ready',targetUid:d.attacker,threat:d.relicThreat});visual(s,r,'mark',{targetUid:r.targetUid});
      messages.push(w.name+' : '+d.attackerName+' analyse. Prochaine attaque numerique contre lui : +60 ATK.');
    }
    return messages;
  }
  function choice(s){return s.phase==='result'?rows(s).find(r=>r.status==='choice')||null:null;}
  function targets(s,r=choice(s)){
    const w=r&&s.equipment.definitions.find(w=>w.id===r.weaponId),u=r&&units(s).find(u=>u.uid===r.sourceUid);
    return w&&u?candidates(s,u,w):[];
  }
  function choose(s,uid,grant){
    const r=choice(s),u=targets(s,r).find(u=>u.uid===uid);if(!r||!u)fail();
    transfer(s,r,u,'reraise',grant);r.status='spent';
    const event=s.match.events.find(e=>e.round===s.round);event.relicGrants=JSON.parse(JSON.stringify(s.duel.relicGrants));
    return r;
  }
  function validate(s,equipped,card,threatFor){
    const metadata=['relicContext','relicThreat','relicGrants','relicEvents','relicStrike'];
    if(!s.equipment?.definitions.some(is)){
      if(s.equipment?.ultimates!==undefined||[s.duel,s.lastDuel,...(s.match?.events||[])].some(d=>d&&metadata.some(k=>Object.hasOwn(d,k))))fail();
      return;
    }
    const all=units(s),byUid=new Map(all.map(u=>[u.uid,u])),x=s.equipment?.ultimates;
    const definition=r=>{const u=byUid.get(r?.sourceUid),w=u&&equipped(s,u,card(u));if(!is(w)||r.weaponId!==w.id)fail();return w;};
    const current=d=>(d===s.duel||s.phase==='result'&&d===s.lastDuel)&&['attack','kalistel','defense','result'].includes(s.phase);
    const lockedBoards=d=>{
      if(!current(d))return null;
      const rosters=s.players.map(p=>p.board.map(u=>u?.uid||null));
      // Result precedes replacements: restore only this duel's definitive victim.
      if(s.phase==='result'){
        const ev=s.match?.events.find(e=>e.round===s.round);
        if(!ev||ev.attacker!==d.attacker||ev.target!==d.target)fail();
        if(ev.kill){
          if(rosters[1-d.side]?.[d.targetSlot]!==null||!s.players[1-d.side].dead.some(u=>u.uid===d.target))fail();
          rosters[1-d.side][d.targetSlot]=d.target;
        }
      }
      if(rosters[d.side]?.[d.attackerSlot]!==d.attacker||rosters[1-d.side]?.[d.targetSlot]!==d.target)fail();
      return rosters.map(p=>p.filter(Boolean));
    };
    const validContext=(c,source,w)=>{
      if(!keys(c,['sourceUid','weaponId','allies','enemies'])||c.sourceUid!==source||c.weaponId!==w.id||![c.allies,c.enemies].every(a=>Array.isArray(a)&&a.length>=1&&a.length<=5&&new Set(a).size===a.length)||
        !c.allies.includes(source)||c.allies.some(uid=>!byUid.has(uid)||uid[0]!==source[0])||c.enemies.some(uid=>!byUid.has(uid)||uid[0]===source[0]))fail();
    };
    const validThreat=t=>keys(t,['weapon','element','faction','arenaAttack'])&&['weapon','element','faction','arenaAttack'].every(k=>Number.isInteger(t[k])&&Math.abs(t[k])<=100)&&t.faction>=0&&t.faction<=40&&t.arenaAttack>=0&&t.arenaAttack<=25;
    const checkThreat=(t,d,live)=>{
      if(!validThreat(t))fail();
      if(threatFor){
        const expected=threatFor(d);
        // Historical faction counts cannot be inferred from today's board.
        if(['weapon','element','arenaAttack',...(live?['faction']:[])].some(k=>t[k]!==expected[k]))fail();
      }
      for(const f of [d.formula,d.failedDefense])if(f&&Object.keys(t).some(k=>t[k]!==f[k]))fail();
    };
    if(x!==undefined){
      if(!keys(x,['records'])||!Array.isArray(x.records)||x.records.length>20||new Set(x.records.map(r=>r?.sourceUid)).size!==x.records.length||s.phase==='setup'&&x.records.length)fail();
      for(const r of x.records){
        const w=definition(r),ev=s.match?.events.find(e=>e.round===r.round),d=s.duel;
        if(!round(r.round,s)||!['ready','spent','choice','lost'].includes(r.status))fail();
        if(gift(w)){
          if(!keys(r,['sourceUid','weaponId','round','status','context','grants'])||!['choice','spent'].includes(r.status)||!Array.isArray(r.grants)||new Set(r.grants).size!==r.grants.length)fail();
          validContext(r.context,r.sourceUid,w);if(r.context.allies.length>=r.context.enemies.length)fail();
          if(r.round===s.round&&current(d)&&!same(r.context,d.relicContext))fail();
          if(w.effect.event==='TARGETED'){
            if(r.status!=='spent'||!r.grants.length||r.grants.length>4||!(ev?.target===r.sourceUid&&!ev.support||r.round===s.round&&d?.target===r.sourceUid&&s.phase==='defense'&&hostile(d)))fail();
          }else if(!ev?.kill||ev.target!==r.sourceUid||!s.players[Number(r.sourceUid[0])].dead.some(u=>u.uid===r.sourceUid)||
            r.status==='choice'&&(r.grants.length||r.round!==s.round||s.phase!=='result'||!targets(s,r).length)||r.status==='spent'&&r.grants.length!==1)fail();
          for(const uid of r.grants)if(uid===r.sourceUid||!r.context.allies.includes(uid))fail();
        }else{
          if(!keys(r,['sourceUid','weaponId','round','status','targetUid','threat','consumedRound','lostRound'])||r.status==='choice'||!byUid.has(r.targetUid)||r.targetUid[0]===r.sourceUid[0]||!validThreat(r.threat)||!w.effect.advantages.some(k=>r.threat[k]>0)||
            !ev||ev.kill||ev.support||ev.target!==r.sourceUid||ev.attacker!==r.targetUid||!same(ev.relicThreat,r.threat))fail();
          if(r.status==='spent'){
            const use=s.match.events.find(e=>e.round===r.consumedRound);
            if(!round(r.consumedRound,s)||r.consumedRound<=r.round||!(use?.relicStrike?.sourceUid===r.sourceUid||r.consumedRound===s.round&&d?.equipment?.attack?.sourceUid===r.sourceUid&&d.target===r.targetUid&&typeof d.attackValue==='number'&&s.phase==='defense'))fail();
          }else if(r.consumedRound!==undefined)fail();
          if(r.status==='lost'){if(!round(r.lostRound,s)||!s.match.events.some(e=>e.round===r.lostRound&&e.target===r.targetUid&&e.kill))fail();}
          else if(r.lostRound!==undefined||r.status==='ready'&&s.players[Number(r.targetUid[0])].dead.some(u=>u.uid===r.targetUid))fail();
        }
      }
    }
    // Every attributed native charge must originate in the one-use relic ledger.
    const grants=(list,n)=>{
      if(!Array.isArray(list)||list.length>4||new Set(list.map(g=>g?.recipient)).size!==list.length)fail();
      for(const g of list){
        const w=definition(g),r=row(s,g.sourceUid);
        if(!keys(g,['weaponId','sourceUid','recipient','kind'])||!gift(w)||w.effect.trait!==g.kind||r?.round!==n||!r.grants?.includes(g.recipient))fail();
      }
    };
    for(const ev of s.match?.events||[]){
      if(ev.relicGrants!==undefined)grants(ev.relicGrants,ev.round);
      if(ev.relicThreat!==undefined){
        const w=definition({sourceUid:ev.target,weaponId:equipped(s,byUid.get(ev.target),card(byUid.get(ev.target)))?.id});
        if(w.effect.trigger!=='TACTICAL_REPRISAL'||ev.support)fail();
        checkThreat(ev.relicThreat,ev,ev.round===s.round&&s.phase==='result');
      }
      if(ev.relicStrike!==undefined){const r=row(s,ev.attacker),w=definition(ev.relicStrike);if(w.effect.trigger!=='TACTICAL_REPRISAL'||r?.status!=='spent'||r.consumedRound!==ev.round||r.targetUid!==ev.target||ev.support)fail();}
    }
    for(const r of rows(s).filter(r=>r.grants)){
      const ev=s.match?.events.find(e=>e.round===r.round),list=ev?.relicGrants||(r.round===s.round?s.duel?.relicGrants:[])||[];
      if(!same(r.grants,list.filter(g=>g.sourceUid===r.sourceUid&&g.weaponId===r.weaponId).map(g=>g.recipient)))fail();
    }
    for(const d of [s.duel,s.lastDuel])if(d){
      const target=byUid.get(d.target),relic=equipped(s,target,card(target));
      if(gift(relic)&&d.relicContext===undefined)fail();
      if(d.relicContext!==undefined){
        const w=definition(d.relicContext);if(!gift(w)||d.relicContext.sourceUid!==d.target)fail();validContext(d.relicContext,d.target,w);
        const rosters=lockedBoards(d);
        if(rosters&&(!same(d.relicContext.allies,rosters[1-d.side])||!same(d.relicContext.enemies,rosters[d.side])))fail();
      }
      const accepted=d!==s.duel||!['attack','kalistel'].includes(s.phase);
      const needsThreat=relic?.effect.trigger==='TACTICAL_REPRISAL'&&accepted&&typeof d.attackValue==='number';
      if(needsThreat!==(d.relicThreat!==undefined))fail();
      if(needsThreat){
        checkThreat(d.relicThreat,d,current(d));
        const recorded=d===s.lastDuel||['result','replace','over'].includes(s.phase);
        if(recorded){
          const ev=s.match?.events.at(-1);
          if(!ev||ev.attacker!==d.attacker||ev.target!==d.target||!same(d.relicThreat,ev.relicThreat))fail();
        }
      }
      if(d.relicGrants!==undefined){
        const r=row(s,d.target);if(!r)fail();grants(d.relicGrants,r.round);
        if(d===s.duel&&s.phase==='result'&&!same(d.relicGrants,s.match.events.find(e=>e.round===s.round)?.relicGrants))fail();
      }
      if(d.relicEvents!==undefined){
        if(!Array.isArray(d.relicEvents)||d.relicEvents.length>6)fail();
        for(const e of d.relicEvents){
          const w=definition(e),r=row(s,e.sourceUid);
          if(!keys(e,['kind','weaponId','sourceUid','recipient','targetUid'])||!r)fail();
          if(['luck','reraise'].includes(e.kind)){if(!d.relicGrants?.some(g=>same(g,{weaponId:e.weaponId,sourceUid:e.sourceUid,recipient:e.recipient,kind:e.kind})))fail();}
          else if(e.kind==='sacrifice'){if(!gift(w)||w.effect.event!=='ELIMINATED'||d.target!==e.sourceUid)fail();}
          else if(e.kind==='mark'||e.kind==='riposte'){if(w.effect.trigger!=='TACTICAL_REPRISAL'||r.targetUid!==e.targetUid||e.kind==='mark'&&(d.target!==e.sourceUid||d.attacker!==e.targetUid)||e.kind==='riposte'&&(d.attacker!==e.sourceUid||d.target!==e.targetUid||typeof d.attackValue!=='number'))fail();}
          else fail();
        }
      }
      const bonus=d.equipment?.attack,w=bonus&&s.equipment?.definitions.find(w=>w.id===bonus.weaponId);
      if(w?.effect.trigger==='TACTICAL_REPRISAL'&&(!d.relicEvents?.some(e=>e.kind==='riposte'&&e.sourceUid===d.attacker)||bonus.sourceUid!==d.attacker||bonus.value!==60||bonus.stat!=='ATK'))fail();
    }
  }
  return {is,validateEffect,view,lock,accepted,after,choice,targets,choose,validate};
});
