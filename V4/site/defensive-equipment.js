(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarDefensiveEquipment=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const types=['DEFENSE','BLOCK','DODGE','ALLY_FALL','SUPPORT','DEPLOY','ALLY_DEPLOY'];
  const supports=['luck','mana','reraise','ward','physical'];
  const is=w=>w?.effect.trigger==='ONCE_DEFENSE';
  const side=u=>Number(u.uid[0]);
  const live=(s,u)=>s.players[side(u)].board.includes(u);
  const units=s=>s.players.flatMap(p=>[...p.board.filter(Boolean),...p.reserve,...p.dead]);
  const rows=s=>s.equipment?.defensive?.grants||[];
  const sources=(s,uid)=>rows(s).filter(r=>r.status==='ready'&&r.recipient===uid).map(r=>r.sourceUid);
  const state=s=>s.equipment.defensive||(s.equipment.defensive={grants:[],deployments:[]});
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const fail=()=>{throw new Error('Charge defensive invalide.');};
  function validateEffect(e){
    if(e.stat!=='DEF'||e.duration!=='NEXT_DEFENSE'||!types.includes(e.event)||!object(e.when)||!['self','support','ally','deployed'].includes(e.recipient))fail();
    if(e.recipient==='support'&&e.event!=='SUPPORT'||e.recipient==='deployed'&&e.event!=='ALLY_DEPLOY'||e.recipient==='ally'&&!['BLOCK','ALLY_FALL'].includes(e.event))fail();
    if(e.event==='DEFENSE'&&e.recipient!=='self'||e.event==='ALLY_DEPLOY'&&e.recipient!=='deployed')fail();
    for(const [key,value] of Object.entries(e.when)){
      if(key==='attack'){if(e.event!=='DEFENSE'||!['physical','magic'].includes(value))fail();}
      else if(key==='activeAtMost'){if(e.event!=='DEFENSE'||!Number.isInteger(value)||value<1||value>4)fail();}
      else if(key==='outnumbered'){if(e.event!=='DEFENSE'||value!==true)fail();}
      else if(['alliedFaction','alliedCharacter','opponentElement'].includes(key)){if(e.event!=='DEFENSE'||typeof value!=='string'||!value.length||value.length>80)fail();}
      else if(key==='supports'){if(e.event!=='SUPPORT'||!Array.isArray(value)||!value.length||value.some(v=>!supports.includes(v)))fail();}
      else fail();
    }
    if(e.event==='SUPPORT'&&!e.when.supports)fail();
  }
  function condition(s,u,w,card){
    const team=s.players[side(u)],d=s.duel,enemy=units(s).find(v=>v.uid===d?.attacker);
    return Object.entries(w.effect.when).every(([key,value])=>{
      if(key==='activeAtMost')return team.board.filter(Boolean).length<=value;
      if(key==='outnumbered')return team.board.filter(Boolean).length<s.players[1-side(u)].board.filter(Boolean).length;
      if(key==='alliedFaction')return team.board.some(v=>v&&v!==u&&card(v).faction===value);
      if(key==='alliedCharacter')return team.board.some(v=>v&&v!==u&&card(v).characterId===value);
      if(key==='opponentElement')return d?.target===u.uid&&enemy&&card(enemy).element===value;
      if(key==='attack')return d?.target===u.uid&&typeof d.attackValue==='number'&&d.magic===(value==='magic');
      return false;
    });
  }
  function ownReady(s,u,w){
    if(!is(w)||!live(s,u)||['setup','initiative','over'].includes(s.phase))return false;
    const row=rows(s).find(r=>r.sourceUid===u.uid);
    return row?.status==='ready'||false;
  }
  function bonus(s,u,equipped,card){
    if(!live(s,u)||['setup','initiative','over'].includes(s.phase))return null;
    let best=null;
    for(const r of rows(s).filter(r=>r.status==='ready'&&r.recipient===u.uid)){
      const w=s.equipment.definitions.find(w=>w.id===r.weaponId);
      const entry={weaponId:w.id,name:w.name,stat:'DEF',value:w.effect.value,sourceUid:r.sourceUid};
      if(!best||entry.value>best.value)best=entry;
    }
    return best;
  }
  function grant(s,u,w,recipient,event){
    if(rows(s).some(r=>r.sourceUid===u.uid))return;
    const r={sourceUid:u.uid,weaponId:w.id,recipient:recipient?.uid||null,round:s.round,event,status:recipient?'ready':'choice'};
    state(s).grants.push(r);
    return r;
  }
  function prepare(s,equipped,card){
    if(!s.equipment)return;
    const d=s.duel,u=units(s).find(u=>u.uid===d.target),w=equipped(s,u,card(u));
    if(is(w)&&w.effect.event==='DEFENSE'&&!rows(s).some(r=>r.sourceUid===u.uid)&&condition(s,u,w,card))grant(s,u,w,u,'DEFENSE');
    d.equipment.defensiveSources=sources(s,u.uid);
  }
  function after(s,equipped,card){
    if(!s.equipment)return [];
    const d=s.duel,event=s.match?.events.find(e=>e.round===s.round),messages=[];
    if(!event)return messages;
    // Consume the captured charges before evaluating new triggers from this duel.
    for(const uid of d.equipment.defensiveSources||[]){
      const r=rows(s).find(r=>r.sourceUid===uid);
      if(r&&d.defenseRolls.length){r.status='spent';r.spentRound=s.round;}
    }
    for(const p of s.players)for(const u of p.board.filter(Boolean)){
      const w=equipped(s,u,card(u));if(!is(w)||rows(s).some(r=>r.sourceUid===u.uid))continue;
      const e=w.effect;
      const triggered=e.event==='BLOCK'?event.target===u.uid&&event.hold:
        e.event==='DODGE'?event.target===u.uid&&event.dodge:
        e.event==='ALLY_FALL'?event.kill&&event.target[0]===u.uid[0]&&event.target!==u.uid:
        e.event==='SUPPORT'?event.attacker===u.uid&&!event.refresh&&e.when.supports.includes(event.support):false;
      if(!triggered)continue;
      const recipient=e.recipient==='self'?u:e.recipient==='support'?p.board.find(v=>v?.uid===event.recipient):null;
      if(e.recipient==='support'&&!recipient||e.recipient==='ally'&&!p.board.some(v=>v&&v!==u))continue;
      grant(s,u,w,recipient,e.event);
      messages.push(`${w.name} : +${e.value} DEF ${recipient?'pour la prochaine defense de '+card(recipient).name:'a attribuer a un allie'}. Une fois par partie.`);
    }
    for(const r of rows(s))if(r.status==='ready'&&s.players[Number(r.recipient[0])].dead.some(u=>u.uid===r.recipient)){r.status='spent';r.spentRound=s.round;}
    return messages;
  }
  function deployed(s,u,equipped,card){
    if(!s.equipment)return [];
    const candidates=s.players[side(u)].board.filter(Boolean).map(v=>({u:v,w:equipped(s,v,card(v))})).filter(({u:v,w})=>
      is(w)&&!rows(s).some(r=>r.sourceUid===v.uid)&&(w.effect.event==='DEPLOY'&&v===u||w.effect.event==='ALLY_DEPLOY'&&v!==u));
    if(!candidates.length)return [];
    const x=state(s),messages=[];
    x.deployments.push({uid:u.uid,round:s.round});
    for(const {u:v,w} of candidates){
      grant(s,v,w,u,w.effect.event);
      messages.push(`${w.name} : +${w.effect.value} DEF pour la prochaine defense de ${card(u).name}.`);
    }
    return messages;
  }
  function choice(s){return s.phase==='result'?rows(s).find(r=>r.status==='choice')||null:null;}
  function targets(s,r=choice(s)){return r?s.players[Number(r.sourceUid[0])].board.filter(u=>u&&u.uid!==r.sourceUid):[];}
  function choose(s,uid){
    const r=choice(s),u=targets(s,r).find(u=>u.uid===uid);if(!r||!u)fail();
    r.recipient=u.uid;r.status='ready';
    return {weaponId:r.weaponId,sourceUid:r.sourceUid,recipient:uid};
  }
  function validate(s,equipped,card){
    const x=s.equipment?.defensive;if(x===undefined)return;
    if(!object(x)||!Array.isArray(x.grants)||x.grants.length>20||!Array.isArray(x.deployments)||x.deployments.length>10||s.phase==='setup'&&(x.grants.length||x.deployments.length))fail();
    const all=units(s),byUid=new Map(all.map(u=>[u.uid,u])),seen=new Set();
    for(const dep of x.deployments){if(!object(dep)||!byUid.has(dep.uid)||!Number.isInteger(dep.round)||dep.round<2||dep.round>s.round||seen.has(dep.uid))fail();seen.add(dep.uid);}
    seen.clear();
    for(const r of x.grants){
      const u=byUid.get(r?.sourceUid),w=u&&equipped(s,u,card(u));
      if(!object(r)||!is(w)||w.id!==r.weaponId||seen.has(u.uid)||!Number.isInteger(r.round)||r.round<1||r.round>s.round||w.effect.event!==r.event||!['ready','choice','spent'].includes(r.status))fail();seen.add(u.uid);
      if(r.status==='choice'){if(r.recipient!==null||w.effect.recipient!=='ally'||s.phase!=='result'||r.round!==s.round||!targets(s,r).length)fail();}
      else if(!byUid.has(r.recipient)||r.recipient[0]!==u.uid[0]||w.effect.recipient==='self'&&r.recipient!==u.uid||w.effect.recipient==='ally'&&r.recipient===u.uid)fail();
      if(r.status==='spent'){
        if(!Number.isInteger(r.spentRound)||r.spentRound<r.round||r.spentRound>s.round)fail();
        const e=s.match?.events.find(e=>e.round===r.spentRound);
        if(!e||e.target!==r.recipient||!e.defenseRolls)fail();
      }else if(r.spentRound!==undefined)fail();
      const e=s.match?.events.find(e=>e.round===r.round),d=s.duel;
      if(r.event==='DEFENSE'){
        if(!(e&&e.target===u.uid&&e.defenseRolls)&&!(d?.target===u.uid&&r.round===s.round&&s.phase==='defense'))fail();
        if(w.effect.when.attack&&!(e?e.support===null&&e.magic===(w.effect.when.attack==='magic'):typeof d.attackValue==='number'&&d.magic===(w.effect.when.attack==='magic')))fail();
      }else if(r.event==='BLOCK'){if(!e?.hold||e.target!==u.uid)fail();}
      else if(r.event==='DODGE'){if(!e?.dodge||e.target!==u.uid)fail();}
      else if(r.event==='ALLY_FALL'){if(!e?.kill||e.target===u.uid||e.target[0]!==u.uid[0])fail();}
      else if(r.event==='SUPPORT'){if(!e||e.attacker!==u.uid||e.refresh||!w.effect.when.supports.includes(e.support)||w.effect.recipient==='support'&&r.recipient!==e.recipient)fail();}
      else if(!x.deployments.some(dep=>dep.uid===r.recipient&&dep.round===r.round)||r.event==='ALLY_DEPLOY'&&r.recipient===u.uid)fail();
      if(r.status==='ready'&&s.players[Number(r.recipient[0])].dead.some(u=>u.uid===r.recipient))fail();
      if(r.recipient){
        const consumed=s.match?.events.find(e=>e.target===r.recipient&&e.defenseRolls&&(e.round>r.round||e.round===r.round&&['DEFENSE','DEPLOY','ALLY_DEPLOY'].includes(r.event)));
        if(consumed&&(r.status!=='spent'||r.spentRound!==consumed.round)||!consumed&&r.status==='spent')fail();
      }
    }
    for(const d of [s.duel,s.lastDuel])if(d?.equipment?.defensiveSources!==undefined){
      const ids=d.equipment.defensiveSources;
      if(!Array.isArray(ids)||ids.length>10||new Set(ids).size!==ids.length||ids.some(uid=>!x.grants.some(r=>r.sourceUid===uid&&r.recipient===d.target)))fail();
    }
  }
  return {is,validateEffect,ownReady,bonus,prepare,after,deployed,choice,targets,choose,validate,sources};
});
