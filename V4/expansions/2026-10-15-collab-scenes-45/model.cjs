'use strict';
const assert=require('node:assert/strict'),D=require('../../atelier/designer-core.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds;
const SET='2026-10-15-collab-scenes-45',characterId=c=>c.characterId;
const fields=['id','characterId','name','title','job','description','element','race','weapon','faction','role','positions','atk','defense','magic','barriers'];
function donor(c){return D.validate({...Object.fromEntries(D.FIELDS.filter(k=>k in c).map(k=>[k,c[k]])),faction:'Chroma'},{final:true});}
function validateProfile(p,c){
 for(const f of fields)assert.deepEqual(p[f],c[f],p.name+' '+f);
 donor(p);assert(p.positions.includes(p.role));
 for(const side of ['atk','defense'])p[side].forEach((v,i)=>{
  if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[p.role][side][i+1]||0)&&v<=bounds[p.role][side][i],p.name+' '+side+' D'+(6-i));
 });
 assert.equal(p.canGuard,p.atk.includes('guard'));assert.equal(p.canHeal,p.atk.includes('revive'));
 if(p.canGuard)assert([1,5].includes(p.role));if(p.canHeal)assert.equal(p.role,5);
 assert.equal(p.collaboration,c.collaboration);assert.equal(p.officialCollaboration,false);
 assert.equal(p.variantOf,c.baseId);assert.notEqual(p.id,c.baseId);
 assert.notEqual(p.element,'NONE','Collaboration with Kalistel');
 assert.equal(p.atk.filter(v=>v==='death').length<=1,true);
 assert(p.atk.filter(v=>typeof v==='string').length<=3);
 assert(p.defense.filter(v=>typeof v==='string').length<=1);
 return p;
}
function profile(c){return validateProfile({...D.profileCard(donor(c),c.id),faction:c.faction,role:c.role,characterId:c.characterId,variantOf:c.baseId,
 collaboration:c.collaboration,officialCollaboration:false,artworkSource:c.artworkSource,
 source:'Kalistar x collaborations - scenes cultes, variantes non officielles',visual_revision:'V4-'+SET},c);}
function validateSet(s){
 assert.equal(s.id,SET);assert.equal(s.cards.length,45);
 assert.deepEqual(s.cards.map(c=>c.id),Array.from({length:45},(_,i)=>String(49902801+i)));
 assert.deepEqual(s.excluded.map(c=>c.number),[15,20,27,29,50]);
 assert.equal(new Set(s.cards.map(c=>c.characterId)).size,45);
 for(const c of s.cards){assert(!s.excluded.some(e=>e.number===c.proposalNumber));profile(c);}
 return s;
}
function validateGame(data,s,createEngine){
 const E=createEngine(data),decks=require('./fixtures.cjs').decks(s);
 for(const d of decks)assert.deepEqual(E.validatePlayableDeck(d),[]);
 for(const c of s.cards){
  const p=E.byId[c.id],old=E.byId[c.baseId];assert(p&&old);
  for(const f of fields.filter(f=>f!=='description'))assert.deepEqual(p[f],c[f],c.key+' '+f);
  for(const f of ['characterId','race','faction','collaboration'])assert.equal(p[f],old[f],c.key+' identity '+f);
 }
 return {decks};
}
module.exports={SET,fields,characterId,donor,profile,validateProfile,validateSet,validateGame};
