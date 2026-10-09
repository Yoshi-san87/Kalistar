'use strict';
const assert=require('node:assert/strict'),D=require('../../atelier/designer-core.cjs');
const {PRINTED,donor,formation}=require('../2026-10-09-gotham/model.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds,set=require('./set.json');
const all=()=>[...set.cards,...set.revisions];
function validate(p){
  donor(p);assert(p.positions.includes(p.role));assert.notEqual(p.element,'NONE');
  assert(p.description.length>=155&&p.description.length<=195,p.name+' description');assert(p.title.length<=35);
  for(const side of ['atk','defense'])p[side].forEach((v,i)=>{
    if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[p.role][side][i+1]||0)&&v<=bounds[p.role][side][i],p.name+' '+side+' D'+(6-i));
    else assert((side==='atk'?['guard','retry','mana','revive','buff_atk','death']:['retry','dodge']).includes(v));
  });
  if(p.atk.includes('guard'))assert([1,5].includes(p.role));
  if(p.atk.includes('revive'))assert.equal(p.role,5);
  for(const [list,side]of [['magic','atk'],['barriers','defense']])for(const die of p[list])assert(Number.isInteger(die)&&die>=1&&die<=6&&typeof p[side][6-die]==='number');
  return p;
}
function profile(c){
  validate(c);
  return {...D.profileCard(donor(c),c.id),...Object.fromEntries(PRINTED.map(k=>[k,c[k]])),role:c.role,
    characterId:c.characterId,collaboration:c.faction,officialCollaboration:false,canGuard:c.atk.includes('guard'),
    canHeal:c.atk.includes('revive'),sentry:true,advantage:30,disadvantage:30,
    source:'Collaboration fan Kalistar non officielle, illustrations validees par l auteur',
    artworkSource:c.artworkSource,visual_revision:'V4-'+set.id};
}
function validateSet(){
  assert.equal(set.cards.length,9);assert.equal(set.revisions.length,6);
  assert.equal(new Set(all().map(c=>c.id)).size,15);
  set.cards.forEach(validate);return set;
}
const decks=[Array.from({length:10},(_,i)=>String(49901501+i)),
  [...set.cards.map(c=>c.id),'49901401']];
function validateGame(data,createEngine){
  const E=createEngine(data);for(const ids of decks)assert.deepEqual(E.validatePlayableDeck(ids),[]);
  for(const spec of all()){
    const c=E.byId[spec.id];assert(c);assert.notEqual(c.element,'NONE');
    formation(data.cards,decks.find(ids=>ids.includes(c.id)),c.id,c.role-1);
  }
  return E;
}
module.exports={set,all,validate,profile,validateSet,validateGame,donor,formation,decks,PRINTED};
