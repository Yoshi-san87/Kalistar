'use strict';
const assert=require('node:assert/strict'),D=require('../../atelier/designer-core.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds;
const SET='2026-10-10-castlevania';
const KEYS=['trevor-belmont','alucard','simon-belmont','carmilla','isaac','hector','dracula-feu','sypha','dracula-sang'];
const PRINTED=['name','title','job','description','element','race','weapon','faction','positions','atk','defense','magic','barriers'];
const characterId=c=>c.characterId;
function donor(c){
 const input=Object.fromEntries(D.FIELDS.filter(k=>k in c).map(k=>[k,c[k]]));
 return D.validate({...input,faction:'Chroma'},{final:true});
}
function validateSet(s){
 assert.equal(s.id,SET);assert.equal(s.officialCollaboration,false);
 assert.deepEqual(s.arenas,[]);assert.deepEqual(s.presets,[]);
 assert.deepEqual(s.cards.map(c=>c.key),KEYS);assert.equal(new Set(s.cards.map(c=>c.characterId)).size,8);
 for(const [i,c]of s.cards.entries()){
  assert.equal(c.id,String(49901801+i));
  assert.equal(c.characterId,(c.key.startsWith('dracula-')?'dracula':c.key)+'-castlevania');
  assert.equal(c.faction,'CASTLEVANIA');assert.equal(c.collaboration,'CASTLEVANIA');
  assert(c.description.length>=160&&c.description.length<=200);assert(c.title.length<=35);
  assert(c.positions.includes(c.role));assert.notEqual(c.element,'NONE');donor(c);
  assert.equal(c.race,['alucard','carmilla','dracula-feu','dracula-sang'].includes(c.key)?'VAMP':'HUMAIN');
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
 assert.equal(s.cards[6].element,'PYRO');assert.equal(s.cards[8].element,'HEMATO');
 assert.notEqual(s.cards[6].artworkSource,s.cards[8].artworkSource);
 assert.equal(new Set(s.cards.map(c=>JSON.stringify([c.atk,c.defense]))).size,9);
 return s;
}
function profile(c){
 return {...D.profileCard(donor(c),c.id),...Object.fromEntries(PRINTED.map(k=>[k,c[k]])),
  role:c.role,characterId:c.characterId,collaboration:c.collaboration,officialCollaboration:false,
  canGuard:c.atk.includes('guard'),canHeal:c.atk.includes('revive'),sentry:true,advantage:30,disadvantage:30,
  source:'Kalistar x Castlevania - fan crossover non officiel',artworkSource:c.artworkSource,visual_revision:'V4-'+SET};
}
function validateProfile(p,c){
 for(const f of [...PRINTED,'id','characterId','role','collaboration','artworkSource'])assert.deepEqual(p[f],c[f],c.key+'.'+f);
 assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,c.atk.includes('revive'));
 assert.equal(p.sentry,true);assert.equal(p.officialCollaboration,false);assert.notEqual(p.testOnly,true);
}
function qaDecks(){
 const cards=require('./set.json').cards,common=cards.filter(c=>!c.key.startsWith('dracula-')).map(c=>c.id);
 // Eight new identities plus two existing characters: no artificial ten-card crossover preset.
 return ['49901807','49901809'].map(dracula=>[...common,dracula,'49901701','49901706']);
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
 const duplicate=decks[0].map(id=>id==='49901701'?'49901809':id);
 assert(E.validatePlayableDeck(duplicate).length>0,'Dracula variants cannot share a deck');
 return {qaDecks:decks,noPresetInstalled:true};
}
module.exports={SET,KEYS,PRINTED,characterId,donor,profile,validateProfile,validateSet,validateGame,qaDecks,formation};
