'use strict';
const assert=require('node:assert/strict'),D=require('../../atelier/designer-core.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds;
const {formation,deploy}=require('../2026-10-09-skaern-luxo/fixtures.cjs');
const SET='2026-10-18-vulkar-black-guard',KEYS=['zhaerik','syrkha','dhorven','nessyra','orzhan'];
const PRINTED=['name','title','job','description','element','race','weapon','faction','positions','atk','defense','magic','barriers'];
const characterId=c=>c.characterId;
const donor=c=>D.validate(Object.fromEntries(D.FIELDS.filter(k=>k in c).map(k=>[k,c[k]])),{final:true});
function validateSet(s){
 assert.equal(s.id,SET);assert.deepEqual(s.arenas,[]);assert.deepEqual(s.presets,[]);
 assert.deepEqual(s.cards.map(c=>c.key),KEYS);
 assert.equal(new Set(s.cards.map(c=>c.characterId)).size,5);
 for(const [i,c]of s.cards.entries()){
  assert.equal(c.id,String(49903001+i));assert.equal(c.characterId,c.key+'-kalistar');
  assert.equal(c.faction,'Vulkar');assert.equal(c.race,'DRAX');assert.equal(c.element,'PYRO');
  assert(c.description.length>=150&&c.description.length<=205);assert(c.title.length<=35);
  assert(c.positions.includes(c.role));donor(c);
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
 assert.equal(new Set(s.cards.map(c=>JSON.stringify([c.atk,c.defense]))).size,5);return s;
}
function profile(c){
 return {...D.profileCard(donor(c),c.id),...Object.fromEntries(PRINTED.map(k=>[k,c[k]])),
  role:c.role,characterId:c.characterId,canGuard:c.atk.includes('guard'),canHeal:c.atk.includes('revive'),
  sentry:true,advantage:30,disadvantage:30,source:'Original Kalistar, illustration approuvee le 18 octobre 2026',
  artworkSource:c.artworkSource,visual_revision:'V4-'+SET};
}
function validateProfile(p,c){
 for(const f of [...PRINTED,'id','characterId','role','artworkSource'])assert.deepEqual(p[f],c[f],c.key+'.'+f);
 assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,c.atk.includes('revive'));
 assert.equal(p.sentry,true);assert.notEqual(p.testOnly,true);
}
function qaDecks(){
 const ids=require('./set.json').cards.map(c=>c.id).concat(['49902401','49902402','49902403','49902404','49902405']);
 return [ids,ids.slice().reverse()];
}
function validateGame(data,s,createEngine){
 validateSet(s);const E=createEngine(data),decks=qaDecks();
 for(const ids of decks)assert.deepEqual(E.validatePlayableDeck(ids),[]);
 for(const c of s.cards){
  const p=E.byId[c.id];assert(p);
  for(const f of [...PRINTED.filter(f=>f!=='description'),'role','characterId'])assert.deepEqual(p[f],c[f],c.key+'.'+f);
  for(const pos of c.positions)formation(data.cards,decks[0],c.id,pos-1);
 }
 return {qaDecks:decks,noPresetInstalled:true};
}
module.exports={SET,KEYS,PRINTED,characterId,donor,profile,validateProfile,validateSet,validateGame,qaDecks,formation,deploy};
