'use strict';
const assert=require('node:assert/strict'),D=require('../../atelier/designer-core.cjs');
const base=require('../2026-10-13-froz-five-soldiers/model.cjs');
const SET='2026-10-13-general-barok',characterId=c=>c.characterId;
const {donor,validateProfile}=base;
function profile(c){return validateProfile({...D.profileCard(donor(c),c.id),faction:c.faction,role:c.role,characterId:c.characterId,artworkSource:c.artworkSource,source:'Original Kalistar, approuve le 13 octobre 2026',visual_revision:'V4-'+SET},c);}
function validateSet(s){
 assert.equal(s.id,SET);assert.equal(s.cards.length,1);const c=s.cards[0];
 assert.equal(c.id,'49902501');assert.equal(c.characterId,'general-barok-kalistar');
 assert.equal(c.race,'OKAMI');assert.equal(c.faction,'Froz');assert.equal(c.element,'CRYO');
 assert.equal(c.weapon,'Katana');assert.equal(c.role,1);assert.deepEqual(c.positions,[1]);
 assert.equal(c.atk.filter(v=>v==='death').length,1);assert.equal(c.atk[1],'death');profile(c);return s;
}
function validateGame(data,s,createEngine){
 const E=createEngine(data),deck=require('./fixtures.cjs').deck;
 assert.deepEqual(E.validatePlayableDeck(deck),[]);
 for(const c of s.cards)for(const f of ['id','characterId','name','title','job','element','race','weapon','faction','role','positions','atk','defense','magic','barriers'])assert.deepEqual(E.byId[c.id][f],c[f],f);
 return {deck};
}
module.exports={SET,characterId,donor,profile,validateProfile,validateSet,validateGame};
