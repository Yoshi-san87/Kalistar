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
        const preferences=defaults()||{};
        equipment=Object.fromEntries([...new Set(ids.map(id=>byId[id].characterId))].filter(id=>preferences[id]).map(id=>[id,preferences[id]]));
        captain=null;
      }else{
        formation=clone(value.formation);equipment=clone(value.equipment);captain=value.captain;
      }
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
      return normalize({name:value.name,cards:value.cards.slice(),formation,captain:formation[0],equipment:{}});
    }
    function edit(team,values){
      const next=clone(team);next.cards=values.slice();next.formation=values.slice(0,5);
      if(!next.formation.includes(next.captain))next.captain=null;
      const members=new Set(values.filter(Boolean).map(id=>byId[id].characterId));
      next.equipment=Object.fromEntries(Object.entries(next.equipment).filter(([id])=>members.has(id)));
      return normalize(next);
    }
    function equip(team,cardId,weaponId){
      const c=byId[cardId];if(!c||!team.cards.includes(cardId))throw new Error('Choisissez un personnage de cette equipe.');
      const next=clone(team),profile=Q.profile('deck-loadout',{weapon:next.equipment});
      if(weaponId===null)delete next.equipment[c.characterId];
      else next.equipment=Q.equipProfile(profile,c.characterId,weaponId,team.cards.filter(Boolean).map(id=>byId[id]),{expected:next.equipment[c.characterId]||null}).slots.weapon;
      return normalize(next);
    }
    return Object.freeze({normalize,fromPreset,slots,edit,equip,clone});
  }
  return Object.freeze({create,clone});
});
