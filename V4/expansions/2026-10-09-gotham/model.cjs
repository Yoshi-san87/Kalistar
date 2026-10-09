'use strict';
const assert=require('node:assert/strict');
const D=require('../../atelier/designer-core.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds;
const SET='2026-10-09-gotham';
const KEYS=['double-face','poison-ivy','sphinx','epouvantail','mr-freeze','catwoman','ras-al-ghul','pingouin'];
const PRINTED=['name','title','job','description','element','race','weapon','faction','positions','atk','defense','magic','barriers'];
const characterId=c=>c.characterId;
function donor(c){
  const input=Object.fromEntries(D.FIELDS.filter(k=>k in c).map(k=>[k,c[k]]));
  return D.validate({...input,faction:'Chroma'},{final:true});
}
function validateSet(s){
  assert.equal(s.id,SET);assert.equal(s.officialCollaboration,false);
  assert.deepEqual(s.arenas,[]);assert.deepEqual(s.presets,[]);
  assert.deepEqual(s.cards.map(c=>c.key),KEYS);
  assert.equal(new Set(s.cards.map(c=>c.characterId)).size,8);
  for(const [i,c]of s.cards.entries()){
    assert.equal(c.id,String(49901501+i));assert.equal(c.characterId,c.key+'-batman');
    assert.equal(c.faction,'Gotham');assert.equal(c.collaboration,'Gotham');
    assert(c.description.length>=160&&c.description.length<=195);
    assert(c.title.length<=35);assert(c.positions.includes(c.role));donor(c);
    for(const side of ['atk','defense']){
      assert.equal(c[side].length,6);assert(c[side].filter(v=>typeof v==='number').length>=3);
      c[side].forEach((v,j)=>{
        if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[c.role][side][j+1]||0)&&v<=bounds[c.role][side][j],c.key+' '+side+' D'+(6-j));
        else assert((side==='atk'?['guard','retry','mana','revive','buff_atk','death']:['retry','dodge']).includes(v));
      });
    }
    if(c.atk.includes('guard'))assert([1,5].includes(c.role));
    if(c.atk.includes('revive'))assert.equal(c.role,5);
    if(c.element==='NONE')assert.equal(c.magic.length+c.barriers.length,0);
  }
  assert.equal(s.cards[1].race,'TOXINAR');assert.equal(s.cards[5].race,'FELINEUS');
  for(const c of s.cards.filter(c=>!['poison-ivy','catwoman'].includes(c.key)))assert.equal(c.race,'HUMAIN');
  return s;
}
function profile(c){
  return {...D.profileCard(donor(c),c.id),...Object.fromEntries(PRINTED.map(k=>[k,c[k]])),
    role:c.role,characterId:c.characterId,collaboration:'Gotham',officialCollaboration:false,
    canGuard:c.atk.includes('guard'),canHeal:c.atk.includes('revive'),sentry:c.element!=='NONE',
    advantage:30,disadvantage:30,source:'Kalistar x Batman - fan crossover non officiel',
    artworkSource:c.artworkSource,visual_revision:'V4-'+SET};
}
function validateProfile(p,c){
  for(const f of [...PRINTED,'id','characterId','role','collaboration','artworkSource'])assert.deepEqual(p[f],c[f],c.key+'.'+f);
  assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,c.atk.includes('revive'));
  assert.equal(p.sentry,c.element!=='NONE');assert.equal(p.officialCollaboration,false);
  assert.notEqual(p.testOnly,true);
}
const deck=()=>[...KEYS.map((_,i)=>String(49901501+i)),'49901401','49901402'];
function formation(cards,ids,target,position){
  const byId=new Map(cards.map(c=>[c.id,c])),slots=Array(5).fill(null),used=new Set();
  if(target){assert(byId.get(target).positions.includes(position+1));slots[position]=target;used.add(target);}
  function visit(slot){
    if(slot===5)return true;if(slots[slot])return visit(slot+1);
    for(const id of ids)if(!used.has(id)&&byId.get(id).positions.includes(slot+1)){
      slots[slot]=id;used.add(id);if(visit(slot+1))return true;used.delete(id);slots[slot]=null;
    }return false;
  }
  assert(visit(0),'Complete formation required');return slots;
}
function validateGame(data,s,createEngine){
  validateSet(s);const E=createEngine(data),ids=deck();
  assert.deepEqual(E.validatePlayableDeck(ids),[]);
  for(const c of s.cards){
    const p=E.byId[c.id];assert(p);
    for(const f of [...PRINTED.filter(f=>f!=='description'),'role','characterId'])assert.deepEqual(p[f],c[f]);
    formation(data.cards,ids,c.id,c.role-1);
  }
  return {deck:ids,noPresetInstalled:true};
}
module.exports={SET,KEYS,PRINTED,characterId,donor,profile,validateProfile,validateSet,validateGame,deck,formation};
