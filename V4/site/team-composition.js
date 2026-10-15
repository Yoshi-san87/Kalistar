(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./equipment.js'):root.KalistarEquipment);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KalistarTeamComposition=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Q){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function create(engine,defaults=()=>({})){
    const byId=engine.byId;
    function legacyFormation(ids){
      const full=engine.lineup(ids);
      if(full)return full.map(i=>ids[i]);
      let best=Array(5).fill(null),size=-1;
      function match(slot,used,chosen){
        if(slot===5){if(used.size>size){size=used.size;best=chosen.slice();}return;}
        for(let i=0;i<ids.length;i++)if(!used.has(i)&&byId[ids[i]].positions.includes(slot+1)){
          used.add(i);chosen[slot]=ids[i];match(slot+1,used,chosen);used.delete(i);
        }
        chosen[slot]=null;match(slot+1,used,chosen);
      }
      match(0,new Set(),Array(5).fill(null));
      const remaining=ids.slice();for(const id of best.filter(Boolean))remaining.splice(remaining.indexOf(id),1);
      // Keep every legacy draft card visible, even when its formation needs repair.
      for(let i=0;i<5&&remaining.length>5;i++)if(!best[i])best[i]=remaining.shift();
      return best;
    }
    function normalize(value){
      if(!value||typeof value.name!=='string'||value.name.length>50||/[\x00-\x1f\x7f]/.test(value.name)||!Array.isArray(value.cards)||value.cards.length>10||value.cards.some(id=>id!==null&&!byId[id]))throw new Error('Composition V4 invalide.');
      const cards=value.cards.concat(Array(10-value.cards.length).fill(null));
      let formation,equipment,captain;
      if(!Object.hasOwn(value,'formation')){
        const ids=cards.filter(Boolean);
        formation=legacyFormation(ids);
        const preferences=Q.reconcileLoadout(defaults()||{},Object.values(byId)),members=new Set(ids.map(id=>byId[id].characterId));
        equipment=Object.fromEntries(Object.entries(preferences).map(([slot,items])=>[slot,Object.fromEntries(Object.entries(items).filter(([id])=>members.has(id)))]));
        captain=null;
      }else{
        formation=clone(value.formation);equipment=clone(value.equipment);captain=value.captain;
      }
      equipment=Q.reconcileLoadout(equipment,cards.filter(Boolean).map(id=>byId[id]));
      const result={name:value.name,cards,formation,captain,equipment};
      const errors=engine.validateComposition(result,{draft:true});
      if(errors.length)throw new Error(errors.join(' '));
      return result;
    }
    function slots(team){
      const reserve=team.cards.filter(Boolean);
      for(const id of team.formation.filter(Boolean))reserve.splice(reserve.indexOf(id),1);
      return team.formation.concat(reserve,Array(Math.max(0,5-reserve.length)).fill(null));
    }
    function fromPreset(value){
      const errors=engine.validatePlayableDeck(value?.cards);if(errors.length)throw new Error(errors.join(' '));
      const formation=engine.lineup(value.cards).map(i=>value.cards[i]);
      return normalize({name:value.name,cards:value.cards.slice(),formation,captain:formation[0],equipment:Q.emptyLoadout()});
    }
    function edit(team,values){
      const next=normalize(team);next.cards=values.slice();next.formation=values.slice(0,5);
      if(!next.formation.includes(next.captain))next.captain=null;
      const members=new Set(values.filter(Boolean).map(id=>byId[id].characterId));
      next.equipment=Object.fromEntries(Object.entries(next.equipment).map(([slot,items])=>[slot,Object.fromEntries(Object.entries(items).filter(([id,itemId])=>{
        const item=Q.catalogue.weapons.find(w=>w.id===itemId);
        return members.has(id)&&values.some(cardId=>byId[cardId]?.characterId===id&&Q.compatible(item,byId[cardId]));
      }))]));
      return normalize(next);
    }
    function equip(team,cardId,weaponId,{slot='weapon',expected,expectedLoadout}={}){
      const c=byId[cardId];if(!c||!team.cards.includes(cardId))throw new Error('Choisissez un personnage de cette equipe.');
      const next=normalize(team),profile=Q.profile('deck-loadout',next.equipment),item=Q.catalogue.weapons.find(w=>w.id===weaponId);
      if(weaponId!==null)slot=item?.slot;
      if(!Object.hasOwn(next.equipment,slot))throw new Error('Emplacement d\u2019equipement invalide.');
      const current=next.equipment[slot][c.characterId]||null;
      if(expected!==undefined&&expected!==current||expectedLoadout&&JSON.stringify(next.equipment)!==JSON.stringify(expectedLoadout))throw new Error('La composition a change.');
      if(weaponId===null)delete next.equipment[slot][c.characterId];
      else next.equipment=Q.equipProfile(profile,c.characterId,weaponId,team.cards.filter(Boolean).map(id=>byId[id]),{expected:current}).slots;
      return normalize(next);
    }
    return Object.freeze({normalize,fromPreset,slots,edit,equip,clone});
  }
  return Object.freeze({create,clone});
});
