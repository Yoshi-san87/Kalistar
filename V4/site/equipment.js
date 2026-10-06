(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./weapons.js'):root.KalistarWeapons,node?require('./defensive-equipment.js'):root.KalistarDefensiveEquipment,node?require('./factions.js'):root.KalistarFactions);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarEquipment=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(catalogue,defensive,factions){
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v)),object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const fail=()=>{throw new Error('\u00c9quipement invalide.');};
  const allUnits=s=>s.players.flatMap(p=>[...p.board.filter(Boolean),...p.reserve,...p.dead]);
  const once=w=>['FIRST_DEFENSE','AFTER_BLOCK'].includes(w?.effect.trigger);
  const ready=(s,u,w)=>w.effect.trigger==='FIRST_DEFENSE'?s.equipment?.charges?.[u.uid]?.status!=='spent':s.equipment?.charges?.[u.uid]?.status==='ready';
  function compatible(w,c){
    if(!w||!c)return false;
    return Object.entries(w.restrictions).every(([key,values])=>key==='factions'
      ?values.some(value=>factions.same(value,c.faction))
      :values.includes(c[{characterIds:'characterId',jobs:'job',families:'weapon',races:'race'}[key]]));
  }
  function validateDefinition(w){
    if(!object(w)||!/^[-a-z0-9]{1,80}$/.test(w.id)||w.slot!=='weapon'||!['axe','flute'].includes(w.visual)||
      ['name','family','condition','lore'].some(k=>typeof w[k]!=='string'||!w[k].length||w[k].length>2000)||w.changesFamily)fail();
    if(w.art!==undefined&&!catalogue.weapons.some(item=>item.art===w.art))fail();
    if(!Object.hasOwn(catalogue.categories,catalogue.kind(w)))fail();
    if(!object(w.restrictions)||!Object.keys(w.restrictions).length||Object.entries(w.restrictions).some(([k,v])=>!['characterIds','jobs','families','factions','races'].includes(k)||!Array.isArray(v)||!v.length||v.length>100||v.some(x=>typeof x!=='string'||!x.length||x.length>80)))fail();
    const e=w.effect;
    if(!object(e)||!['ATK','DEF'].includes(e.stat)||!Number.isInteger(e.value)||e.value<1||e.value>40)fail();
    if(defensive.is(w))defensive.validateEffect(e);
    else if(e.trigger==='LAST_STANDING'){if(e.duration!=='WHILE_TRUE')fail();}
    else if(e.trigger==='TEAM_STATE'){
      if(e.duration!=='WHILE_TRUE'||!object(e.when)||!Object.keys(e.when).length)fail();
      for(const [key,value] of Object.entries(e.when)){
        if(key==='outnumbered'){if(value!==true)fail();}
        else if(key==='activeAtMost'){if(!Number.isInteger(value)||value<1||value>4)fail();}
        else if(key==='reserveAtMost'){if(!Number.isInteger(value)||value<0||value>4)fail();}
        else fail();
      }
    }
    else if(e.trigger==='AFTER_SUPPORT'){if(e.duration!=='NEXT_DUEL'||!Array.isArray(e.supports)||!e.supports.length||e.supports.some(x=>!['luck','mana'].includes(x)))fail();}
    else if(once(w)){if(e.duration!=='NEXT_DEFENSE'||e.stat!=='DEF')fail();}
    else fail();
    return w;
  }
  function validateLoadout(loadout,cards,definitions=catalogue.weapons){
    if(!object(loadout)||Object.keys(loadout).length>cards.length)fail();
    const used=new Set();
    for(const [characterId,id] of Object.entries(loadout)){
      const w=definitions.find(w=>w.id===id),versions=cards.filter(c=>c.characterId===characterId);
      if(!versions.length||!versions.some(c=>compatible(w,c))||used.has(id))fail();used.add(id);
    }
    return loadout;
  }
  function profile(id,slots={weapon:{}}){return {id,version:1,slots:clone(slots)};}
  function validateProfile(row,cards,definitions=catalogue.weapons){
    if(!object(row)||typeof row.id!=='string'||!row.id.length||row.id.length>100||row.version!==1||!object(row.slots)||Object.keys(row.slots).some(k=>k!=='weapon'))fail();
    validateLoadout(row.slots.weapon,cards,definitions);return row;
  }
  function reconcileLoadout(loadout,cards){
    // Keep the exact former restrictions; future weapons are never relaxed.
    const previous=catalogue.weapons.map(w=>({...w,restrictions:catalogue.legacyRestrictions[w.id]||w.restrictions}));
    validateLoadout(loadout,cards,previous);
    return Object.fromEntries(Object.entries(loadout).filter(([characterId,id])=>
      cards.some(c=>c.characterId===characterId&&compatible(catalogue.weapons.find(w=>w.id===id),c))));
  }
  function reconcileProfile(row,cards){
    if(!object(row)||!object(row.slots))fail();
    const next=clone(row);next.slots.weapon=reconcileLoadout(row.slots.weapon,cards);
    return validateProfile(next,cards);
  }
  function equipProfile(row,characterId,weaponId,cards,{expected=null,expectedProfile=null}={},definitions=catalogue.weapons){
    const next=clone(row),w=definitions.find(w=>w.id===weaponId);
    if(!cards.some(c=>c.characterId===characterId&&compatible(w,c)))throw new Error('Porteur incompatible.');
    if((next.slots.weapon[characterId]||null)!==expected||expectedProfile&&JSON.stringify(next)!==JSON.stringify(expectedProfile))throw new Error('L\u2019\u00e9quipement a chang\u00e9 dans un autre onglet.');
    for(const [id,value] of Object.entries(next.slots.weapon))if(value===weaponId)delete next.slots.weapon[id];
    next.slots.weapon[characterId]=weaponId;validateProfile(next,cards,definitions);return next;
  }
  function snapshot(loadouts,cards){
    if(!Array.isArray(loadouts)||loadouts.length!==2)fail();
    loadouts.forEach(l=>validateLoadout(l,cards));
    return {version:1,definitions:clone(catalogue.weapons),loadouts:clone(loadouts),pending:{}};
  }
  function equipped(s,u,card){
    const id=s.equipment?.loadouts[Number(u?.uid?.[0])]?.[card?.characterId];
    const w=s.equipment?.definitions.find(w=>w.id===id);
    return compatible(w,card)?w:null;
  }
  function view(s,u,card){
    const w=equipped(s,u,card);if(!w||s.phase==='setup'||s.phase==='over')return {weapon:w,active:false};
    const p=s.players[Number(u.uid[0])];
    const active=p.board.includes(u)&&(defensive.is(w)?defensive.ownReady(s,u,w):
      w.effect.trigger==='LAST_STANDING'?p.board.filter(Boolean).length===1:
      w.effect.trigger==='TEAM_STATE'?teamCondition(s,Number(u.uid[0]),w.effect.when):
      once(w)?ready(s,u,w)&&(w.effect.trigger!=='FIRST_DEFENSE'||s.duel?.target===u.uid&&s.phase==='defense'):
      Object.values(s.equipment.pending).some(b=>b.sourceUid===u.uid&&b.weaponId===w.id));
    return {weapon:w,active};
  }
  function teamCondition(s,side,when){
    const team=s.players[side],active=team.board.filter(Boolean).length;
    return Object.entries(when).every(([key,value])=>key==='outnumbered'?active<s.players[1-side].board.filter(Boolean).length:
      key==='activeAtMost'?active<=value:key==='reserveAtMost'?team.reserve.length<=value:false);
  }
  function modifier(s,u,card,stat){
    if(!u)return null;
    const {weapon:w,active}=view(s,u,card);
    const available=w&&(once(w)?s.phase!=='setup'&&s.phase!=='over'&&s.players[Number(u.uid[0])].board.includes(u)&&ready(s,u,w):active);
    const own=available&&!defensive.is(w)&&w.effect.trigger!=='AFTER_SUPPORT'&&w.effect.stat===stat?entry(w,u.uid):null;
    const pending=s.equipment?.pending[u.uid],source=pending&&s.equipment.definitions.find(w=>w.id===pending.weaponId);
    const gift=source?.effect.stat===stat?entry(source,pending.sourceUid):null;
    // Do not stack equipment bonuses, or let a smaller personal bonus erase Momo's gift.
    const best=gift&&(!own||gift.value>own.value)?gift:own;
    const protection=stat==='DEF'?defensive.bonus(s,u,equipped,card):null;
    return protection&&(!best||protection.value>best.value)?protection:best;
  }
  function entry(w,sourceUid){return {weaponId:w.id,name:w.name,stat:w.effect.stat,value:w.effect.value,sourceUid};}
  function lock(s,a,b,card){
    if(!s.equipment)return;
    s.duel.equipment={attack:modifier(s,a,card(a),'ATK'),defense:modifier(s,b,card(b),'DEF'),expires:[a,b].filter(u=>s.equipment.pending[u.uid]).map(u=>u.uid)};
    if(s.equipment.defensive)s.duel.equipment.defensiveSources=defensive.sources(s,b.uid);
  }
  function support(s,a,u,card,kind,refreshed){
    const w=equipped(s,a,card(a));
    if(refreshed||w?.effect.trigger!=='AFTER_SUPPORT'||!w.effect.supports.includes(kind)||s.equipment.pending[u.uid])return null;
    s.equipment.pending[u.uid]={weaponId:w.id,sourceUid:a.uid,grantedRound:s.round};
    return s.duel.equipmentTransfer={...entry(w,a.uid),recipient:u.uid};
  }
  function finish(s,card){
    if(!s.equipment)return;
    for(const uid of s.duel.equipment?.expires||[])delete s.equipment.pending[uid];
    for(const p of s.players)for(const u of p.dead)delete s.equipment.pending[u.uid];
    // Charge lifetime follows a real defense, not merely a targeted support action.
    const d=s.duel,u=allUnits(s).find(u=>u.uid===d.target),w=u&&equipped(s,u,card(u));
    const messages=defensive.after(s,equipped,card);
    if(!once(w)||!d.defenseRolls.length)return messages.join(' ');
    const charges=s.equipment.charges||(s.equipment.charges={});
    if(ready(s,u,w))charges[u.uid]={weaponId:w.id,status:'spent',round:s.round};
    else if(w.effect.trigger==='AFTER_BLOCK'&&!charges[u.uid]&&s.match?.events.find(e=>e.round===s.round)?.hold){
      charges[u.uid]={weaponId:w.id,status:'ready',round:s.round};
      messages.push(`${w.name} : +${w.effect.value} DEF pr\u00e9par\u00e9s pour la prochaine d\u00e9fense.`);
    }
    return messages.join(' ');
  }
  function validate(s,cards){
    const x=s.equipment;
    if(x===undefined){if([s.duel,s.lastDuel].some(d=>d?.equipment||d?.equipmentTransfer))fail();return;}
    if(!object(x)||x.version!==1||!Array.isArray(x.definitions)||x.definitions.length>100||!x.definitions.length||new Set(x.definitions.map(w=>w?.id)).size!==x.definitions.length||!Array.isArray(x.loadouts)||x.loadouts.length!==2||!object(x.pending))fail();
    x.definitions.forEach(validateDefinition);x.loadouts.forEach(l=>validateLoadout(l,cards,x.definitions));
    const units=allUnits(s),byUid=new Map(units.map(u=>[u.uid,u])),card=u=>cards.find(c=>c.id===u?.cardId);
    defensive.validate(s,equipped,card);
    if(x.charges!==undefined){
      if(!object(x.charges)||s.phase==='setup'&&Object.keys(x.charges).length)fail();
      for(const [uid,b] of Object.entries(x.charges)){
        const u=byUid.get(uid),w=u&&equipped(s,u,card(u));
        if(!object(b)||!once(w)||b.weaponId!==w.id||!['ready','spent'].includes(b.status)||w.effect.trigger==='FIRST_DEFENSE'&&b.status!=='spent'||!Number.isInteger(b.round)||b.round<1||b.round>s.round)fail();
        const event=s.match?.events.find(e=>e.round===b.round);
        if(!event||event.target!==uid||!event.defenseRolls||b.status==='ready'&&!event.hold)fail();
      }
    }
    const validateEntry=e=>{
      if(!object(e))fail();const w=x.definitions.find(w=>w.id===e.weaponId),u=byUid.get(e.sourceUid);
      if(!w||!u||equipped(s,u,card(u))?.id!==w.id||e.name!==w.name||e.stat!==w.effect.stat||e.value!==w.effect.value)fail();return w;
    };
    for(const [uid,b] of Object.entries(x.pending)){
      const u=byUid.get(uid),source=byUid.get(b?.sourceUid),w=x.definitions.find(w=>w.id===b?.weaponId);
      if(!u||!source||uid[0]!==source.uid[0]||s.players[Number(uid[0])].dead.includes(u)||!w||equipped(s,source,card(source))?.id!==w.id||w.effect.trigger!=='AFTER_SUPPORT'||!Number.isInteger(b.grantedRound)||b.grantedRound<1||b.grantedRound>s.round||s.phase==='setup')fail();
    }
    for(const d of [s.duel,s.lastDuel])if(d){
      if(!object(d.equipment)||!Array.isArray(d.equipment.expires)||d.equipment.expires.length>2||new Set(d.equipment.expires).size!==d.equipment.expires.length||d.equipment.expires.some(uid=>![d.attacker,d.target].includes(uid)))fail();
      for(const [key,stat] of [['attack','ATK'],['defense','DEF']])if(d.equipment[key]!==null){
        const e=d.equipment[key],w=validateEntry(e),uid=key==='attack'?d.attacker:d.target;
        if(e.stat!==stat||uid[0]!==e.sourceUid[0]||(once(w)||['LAST_STANDING','TEAM_STATE'].includes(w.effect.trigger))&&uid!==e.sourceUid||w.effect.trigger==='AFTER_SUPPORT'&&!d.equipment.expires.includes(uid))fail();
        if(defensive.is(w)&&(!d.equipment.defensiveSources?.includes(e.sourceUid)||!x.defensive?.grants.some(r=>r.sourceUid===e.sourceUid&&r.recipient===uid&&r.weaponId===w.id)))fail();
      }
      if(d.equipmentTransfer){const w=validateEntry(d.equipmentTransfer);if(w.effect.trigger!=='AFTER_SUPPORT'||d.equipmentTransfer.sourceUid!==d.attacker||d.equipmentTransfer.recipient!==(d.cloverGranted||d.manaGranted)||d.traitRefreshed||!w.effect.supports.includes(d.cloverGranted?'luck':'mana'))fail();}
    }
  }
  function validateFormula(s,d,f){
    for(const [key,stat,part] of [['equipmentAttack','ATK','attack'],['equipmentDefense','DEF','defense']]){
      const value=f[key]??0,expected=d.equipment?.[part]?.value||0;
      if(!Number.isInteger(value)||value!==expected||!s.equipment&&Object.hasOwn(f,key))fail();
    }
  }
  function prepareDefense(s,card){
    if(!s.equipment)return;
    defensive.prepare(s,equipped,card);
    const u=allUnits(s).find(u=>u.uid===s.duel.target);
    s.duel.equipment.defense=modifier(s,u,card(u),'DEF');
  }
  const deployed=(s,u,card)=>defensive.deployed(s,u,equipped,card);
  return {catalogue,compatible,validateDefinition,validateLoadout,profile,validateProfile,reconcileLoadout,reconcileProfile,equipProfile,snapshot,equipped,view,modifier,lock,support,finish,validate,validateFormula,prepareDefense,deployed,defensive};
});
