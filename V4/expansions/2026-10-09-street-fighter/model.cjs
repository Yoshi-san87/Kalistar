'use strict';
const assert=require('node:assert/strict'),D=require('../../atelier/designer-core.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds;
const SET='2026-10-09-street-fighter';
const KEYS=["ryu","ken","chun-li","guile","cammy","zangief","dhalsim","blanka","vega","m-bison","akuma","juri","balrog","sagat","e-honda","dee-jay","fei-long","t-hawk"];
const PRINTED=['name','title','job','description','element','race','weapon','faction','positions','atk','defense','magic','barriers'];
const requested={ryu:['CRYO',2],ken:['PYRO',2],guile:['AERO'], 'chun-li':['HYDRO'],zangief:['MINERO'],dhalsim:['PYRO'],blanka:['ELECTRO'],'m-bison':['NECRO'],akuma:['HEMATO'],'e-honda':['HYDRO',1],'t-hawk':['GEO']};
const characterId=c=>c.characterId;
function donor(c){
 const input=Object.fromEntries(D.FIELDS.filter(k=>k in c).map(k=>[k,c[k]]));
 return D.validate({...input,faction:'Chroma'},{final:true});
}
function validateSet(s){
 assert.equal(s.id,SET);assert.equal(s.officialCollaboration,false);
 assert.deepEqual(s.arenas,[]);assert.deepEqual(s.presets,[]);assert.deepEqual(s.excluded,['rose','dan']);
 assert.deepEqual(s.cards.map(c=>c.key),KEYS);assert.equal(new Set(s.cards.map(c=>c.characterId)).size,18);
 for(const [i,c]of s.cards.entries()){
  assert.equal(c.id,String(49901701+i));assert.equal(c.characterId,c.key+'-street-fighter');
  assert.equal(c.faction,'STREETFIGHTER');assert.equal(c.collaboration,'STREETFIGHTER');
  assert(c.description.length>=160&&c.description.length<=200);assert(c.title.length<=35);
  assert(c.positions.includes(c.role));assert.notEqual(c.element,'NONE');donor(c);
  assert.equal(c.race,c.key==='blanka'?'MACAKO':'HUMAIN');
  assert.equal(c.weapon,c.key==='vega'?'Dague':'Poing');
  if(requested[c.key]){assert.equal(c.element,requested[c.key][0]);if(requested[c.key][1])assert.equal(c.role,requested[c.key][1]);}
  for(const side of ['atk','defense']){
   assert.equal(c[side].length,6);assert(c[side].filter(v=>typeof v==='number').length>=3);
   c[side].forEach((v,j)=>{
    if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[c.role][side][j+1]||0)&&v<=bounds[c.role][side][j],c.key+' '+side+' D'+(6-j));
    else assert((side==='atk'?['guard','retry','mana','revive','buff_atk','death']:['retry','dodge']).includes(v));
   });
  }
  if(c.atk.includes('guard'))assert([1,5].includes(c.role));
  if(c.atk.includes('revive'))assert.equal(c.role,5);
  for(const [field,side]of [['magic','atk'],['barriers','defense']]){
   assert.equal(new Set(c[field]).size,c[field].length);
   assert(c[field].every(d=>Number.isInteger(d)&&d>=1&&d<=6&&typeof c[side][6-d]==='number'));
  }
 }
 assert.equal(new Set(s.cards.map(c=>JSON.stringify([c.atk,c.defense]))).size,18);
 return s;
}
function profile(c){
 return {...D.profileCard(donor(c),c.id),...Object.fromEntries(PRINTED.map(k=>[k,c[k]])),
  role:c.role,characterId:c.characterId,collaboration:c.collaboration,officialCollaboration:false,
  canGuard:c.atk.includes('guard'),canHeal:c.atk.includes('revive'),sentry:true,advantage:30,disadvantage:30,
  source:'Kalistar x Street Fighter - fan crossover non officiel',artworkSource:c.artworkSource,visual_revision:'V4-'+SET};
}
function validateProfile(p,c){
 for(const f of [...PRINTED,'id','characterId','role','collaboration','artworkSource'])assert.deepEqual(p[f],c[f],c.key+'.'+f);
 assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,c.atk.includes('revive'));
 assert.equal(p.sentry,true);assert.equal(p.officialCollaboration,false);assert.notEqual(p.testOnly,true);
}
function qaDecks(){
 const cards=require('./set.json').cards;
 return cards.map((target,index)=>{
  const selected=[target],used=new Set([target.characterId]);
  for(let role=1;role<=5;role++){
   const pool=cards.filter(c=>c.role===role),rotated=pool.slice(index%pool.length).concat(pool.slice(0,index%pool.length));
   for(const c of rotated)if(selected.filter(p=>p.role===role).length<2&&!used.has(c.characterId)){selected.push(c);used.add(c.characterId);}
   assert.equal(selected.filter(c=>c.role===role).length,2);
  }
  return selected.map(c=>c.id);
 });
}
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
 validateSet(s);const E=createEngine(data),decks=qaDecks();
 for(const ids of decks)assert.deepEqual(E.validatePlayableDeck(ids),[]);
 for(const c of s.cards){
  const p=E.byId[c.id];assert(p);
  for(const f of [...PRINTED.filter(f=>f!=='description'),'role','characterId'])assert.deepEqual(p[f],c[f],c.key+'.'+f);
  formation(data.cards,decks.find(ids=>ids.includes(c.id)),c.id,c.role-1);
 }
 assert.equal(new Set(decks.flat()).size,18);
 return {qaDecks:decks,noPresetInstalled:true};
}
module.exports={SET,KEYS,PRINTED,characterId,donor,profile,validateProfile,validateSet,validateGame,qaDecks,formation};
