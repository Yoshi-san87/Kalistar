'use strict';
const assert=require('node:assert/strict');
const base=require('../2026-09-27-metal-gear-mines/model.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds;
const SET='2026-10-06-second-edition-scenes',KEYS=['2b-long-sword','balmhyr-fist'];
const PRESERVED=['name','element','race','faction'];
function validateSet(set){
 assert.equal(set.id,SET);assert.equal(set.officialCollaboration,false);
 assert.deepEqual(set.arenas,[]);assert.deepEqual(set.presets,[]);
 assert.deepEqual(set.cards.map(c=>c.key),KEYS);
 assert.deepEqual(set.cards.map(c=>c.id),['49900801','49900802']);
 assert.deepEqual(set.cards.map(c=>c.characterId),['2b-nier','balmhyr']);
 assert.deepEqual(set.cards.map(c=>c.weapon),['Epée longue','Poing']);
 assert.deepEqual(set.cards.map(c=>c.lineage),['45911726','30000007']);
 assert.deepEqual(set.cards.map(c=>c.role),[1,3]);
 for(const c of set.cards){
  assert(c.title.length<=35&&c.description.length>=160&&c.description.length<=190);
  assert(c.positions.includes(c.role));assert.equal(new Set(c.positions).size,c.positions.length);
  assert(c.positions.every(p=>Number.isInteger(p)&&p>=1&&p<=5));
  assert.match(c.art,/^Variants_[A-Za-z0-9_]+\.png$/);
  for(const side of ['atk','defense']){
   assert.equal(c[side].length,6);
   c[side].forEach((v,i)=>{
    if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[c.role][side][i+1]||0)&&v<=bounds[c.role][side][i],c.key+'.'+side+'.D'+(6-i));
    else assert((side==='atk'?['guard','buff_atk']:['dodge','retry']).includes(v));
   });
  }
  if(c.atk.includes('guard'))assert([1,5].includes(c.role));
  for(const [field,side]of [['magic','atk'],['barriers','defense']]){
   assert.equal(new Set(c[field]).size,c[field].length);
   assert(c[field].every(d=>Number.isInteger(d)&&d>=1&&d<=6&&typeof c[side][6-d]==='number'));
  }
 }
 return set;
}
function profile(c,D){return {...base.profile(c,D),source:c.collaboration?'Kalistar x NieR - fan crossover non officiel':'Variante narrative Kalistar, demande du 6 octobre 2026',visual_revision:'V4-'+SET};}
function qaDecks(data){
 const reserve=['49900708','49900709','49900710','49900707','49900711'];
 const decks=[['49900801','49900705','49900802','49900703','49900702',...reserve],['30000007','45911726','49900704','49900703','49900702',...reserve]];
 for(const ids of decks)for(const id of ids)assert(data.cards.some(c=>c.id===id),'Missing QA card '+id);
 return decks;
}
function validateGame(data,set,createEngine){
 validateSet(set);
 for(const c of set.cards){
  const p=data.cards.find(p=>p.id===c.id),old=data.cards.find(p=>p.id===c.lineage);assert(p&&old);
  for(const f of base.PRINTED)assert.deepEqual(p[f],c[f],c.key+'.'+f);
  for(const f of PRESERVED)assert.deepEqual(p[f],old[f],c.key+' identity '+f);
  assert.equal(p.characterId,old.characterId);assert.equal(p.sentry,old.sentry);
  for(const f of ['title','description','weapon','role','positions','atk','defense','magic','barriers'])assert.notDeepEqual(p[f],old[f],c.key+' new edition '+f);
  assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,false);
 }
 const E=createEngine(data),decks=qaDecks(data);
 for(const ids of decks)assert.deepEqual(E.validatePlayableDeck(ids),[]);
 for(const c of set.cards){const duplicate=[...decks[0]];duplicate[9]=c.lineage;assert(E.validatePlayableDeck(duplicate).length>0);}
 return {cards:data.cards.length,added:2,qaDecks:decks,newGameplayProfiles:true,noPresetInstalled:true};
}
module.exports={...base,SET,KEYS,PRESERVED,validateSet,profile,qaDecks,validateGame};
