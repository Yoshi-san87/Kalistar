'use strict';
const assert=require('node:assert/strict');
const D=require('../../atelier/designer-core.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds;
const SET='2026-10-13-fourteen-new-voices';
const fields=['id','characterId','name','title','job','description','element','race','weapon','faction','role','positions','atk','defense','magic','barriers'];
const characterId=c=>c.characterId;
const donor=c=>D.validate(Object.fromEntries(D.FIELDS.filter(k=>k in c).map(k=>[k,c[k]])),{final:true});
function validateProfile(p,c){
  for(const f of fields)assert.deepEqual(p[f],c[f],p.name+' '+f);
  donor(p);assert(p.positions.includes(p.role));
  for(const side of ['atk','defense'])p[side].forEach((v,i)=>{
    if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[p.role][side][i+1]||0)&&v<=bounds[p.role][side][i],p.name+' '+side+' D'+(6-i));
  });
  assert.equal(p.canGuard,p.atk.includes('guard'));assert.equal(p.canHeal,p.atk.includes('revive'));
  if(p.canGuard)assert([1,5].includes(p.role));if(p.canHeal)assert.equal(p.role,5);
  if(p.element==='NONE'){assert.deepEqual(p.magic,[]);assert.deepEqual(p.barriers,[]);}
  return p;
}
function profile(c){return validateProfile({...D.profileCard(donor(c),c.id),role:c.role,characterId:c.characterId,artworkSource:c.artworkSource,
  source:'Original Kalistar, selection et retouches approuvees le 13 octobre 2026',visual_revision:'V4-'+SET},c);}
function validateSet(s){
  assert.equal(s.id,SET);assert.equal(s.cards.length,14);
  assert.deepEqual(s.cards.map(c=>c.id),Array.from({length:14},(_,i)=>String(49902601+i)));
  assert.equal(new Set(s.cards.map(c=>c.characterId)).size,14);
  assert.equal(s.cards.find(c=>c.key==='raskel').faction,'Durane');
  for(const c of s.cards)profile(c);return s;
}
function validateGame(data,s,createEngine){
  const E=createEngine(data),fixtures=require('./fixtures.cjs');
  for(const deck of fixtures.decks)assert.deepEqual(E.validatePlayableDeck(deck),[]);
  assert(s.cards.every(c=>fixtures.decks.some(d=>d.includes(c.id))));
  for(const c of s.cards)for(const f of fields.filter(f=>f!=='description'))assert.deepEqual(E.byId[c.id][f],c[f],c.key+' '+f);
  return {decks:fixtures.decks};
}
module.exports={SET,fields,characterId,donor,profile,validateProfile,validateSet,validateGame};
