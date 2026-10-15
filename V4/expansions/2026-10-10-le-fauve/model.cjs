'use strict';
const assert=require('node:assert/strict'),D=require('../../atelier/designer-core.cjs');
const {donor,PRINTED}=require('../2026-10-09-gotham/model.cjs');
const {validate}=require('../2026-10-09-crossover-crystals/model.cjs');
const SET='2026-10-10-le-fauve',characterId=c=>c.characterId;
function profile(c){
  validate(c);
  return {...D.profileCard(donor(c),c.id),...Object.fromEntries(PRINTED.map(k=>[k,c[k]])),
    role:c.role,characterId:c.characterId,collaboration:'XMEN',officialCollaboration:false,
    canGuard:false,canHeal:false,sentry:true,advantage:30,disadvantage:30,
    source:'Kalistar x X-Men, creation de fan non officielle, illustration fournie par l auteur',
    artworkSource:c.artworkSource,visual_revision:'V4-'+SET};
}
function validateProfile(p,c){
  validate(p);
  for(const f of [...PRINTED,'id','characterId','role','collaboration','artworkSource'])assert.deepEqual(p[f],c[f],f);
  assert.equal(p.canGuard,false);assert.equal(p.canHeal,false);assert(p.sentry);
  assert.equal(p.officialCollaboration,false);assert.notEqual(p.testOnly,true);
}
function validateSet(s){
  assert.equal(s.id,SET);assert.equal(s.cards.length,1);assert.equal(s.cards[0].id,'49901901');
  assert.equal(s.cards[0].race,'FELINEUS');assert.equal(s.cards[0].faction,'XMEN');
  assert.deepEqual(s.arenas,[]);assert.deepEqual(s.presets,[]);
  validateProfile(profile(s.cards[0]),s.cards[0]);return s;
}
function validateGame(data,s,createEngine){
  const E=createEngine(data),{deck}=require('./fixtures.cjs');assert.deepEqual(E.validatePlayableDeck(deck),[]);
  for(const c of s.cards)for(const f of [...PRINTED,'characterId','role'])assert.deepEqual(E.byId[c.id][f],c[f],f);
  return {deck};
}
module.exports={SET,characterId,donor,profile,validateProfile,validateSet,validateGame};
