'use strict';
const assert=require('node:assert/strict'),base=require('../2026-09-27-metal-gear-mines/model.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds,weapons=require('../../../V3/donnees/armes.json');
const SET='2026-10-04-city-guards';
const KEYS=['orven','serya','marel','veyr','isvel','torvan','eldra','brund','helvik','sovra','aeren','vessa','karrok','neryk','brask','maelka','tilko'];
function validateSet(set){
 assert.equal(set.id,SET);assert.equal(set.officialCollaboration,false);assert.deepEqual(set.arenas,[]);assert.deepEqual(set.presets,[]);
 assert.deepEqual(set.cards.map(c=>c.key),KEYS);assert.equal(new Set(set.cards.map(c=>c.characterId)).size,17);
 for(const [i,c] of set.cards.entries()){
  assert.equal(c.id,String(49900301+i));assert.equal(c.characterId,c.key+'-kalistar');assert.equal(c.collaboration,undefined);
  assert.equal(c.faction,i<5?'Draevenheim':i<10?'Durane':i<14?'Nestown':'Crabazar');
  assert.equal(c.race,i<3?'HUMAIN':i<5?'VAMP':i<7?'HUMAIN':i<10?'NAIN':i<12?'FALCO':i<14?'KORBOW':'CRUSTOS');
  if(i<5)assert.equal(c.element,i<3?'NONE':'HEMATO');
  assert(c.positions.includes(c.role));assert.equal(new Set(c.positions).size,c.positions.length);
  assert(c.positions.every(p=>Number.isInteger(p)&&p>=1&&p<=5));
  assert(c.name.length<=30&&c.title.length<=35&&c.description.length>=160&&c.description.length<=190,c.key+' text budget');
  assert(Object.hasOwn(weapons,c.weapon));assert.match(c.art,/^[A-Za-z0-9_]+\.png$/);
  for(const side of ['atk','defense']){
   assert.equal(c[side].length,6);
   c[side].forEach((v,n)=>{if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[c.role][side][n+1]??0)&&v<=bounds[c.role][side][n],c.key+'.'+side+'.'+n);
    else assert((side==='atk'?['guard','revive','retry','mana','buff_atk','death']:['retry','dodge']).includes(v));});
  }
  if(c.atk.includes('guard'))assert([1,5].includes(c.role));
  if(c.atk.includes('revive'))assert.equal(c.role,5);
  for(const [field,side] of [['magic','atk'],['barriers','defense']]){
   assert.equal(new Set(c[field]).size,c[field].length);
   assert(c[field].every(d=>Number.isInteger(d)&&d>=1&&d<=6&&typeof c[side][6-d]==='number'));
  }
  if(c.element==='NONE')assert.equal(c.magic.length+c.barriers.length,0);
 }
 return set;
}
function profile(c,D){return {...base.profile(c,D),source:'Personnage original Kalistar, demande du 4 octobre 2026',visual_revision:'V4-'+SET};}
function validateGame(data,set,createEngine){
 validateSet(set);
 for(const c of set.cards){
  const p=data.cards.find(p=>p.id===c.id);assert(p);
  for(const f of base.PRINTED)assert.deepEqual(p[f],c[f],c.key+'.'+f);
  assert.equal(p.characterId,c.characterId);assert.equal(p.role,c.role);
  assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,c.atk.includes('revive'));
 }
 const engine=createEngine(data);
 const decks=[set.cards.slice(0,10),[...set.cards.slice(10),...set.cards.slice(0,3)]].map(cards=>cards.map(c=>c.id));
 for(const ids of decks)assert.deepEqual(engine.validatePlayableDeck(ids),[]);
 return {cards:17,characters:17,qaDecks:decks,noPresetInstalled:true};
}
module.exports={...base,SET,KEYS,validateSet,profile,validateGame};
