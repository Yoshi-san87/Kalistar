'use strict';
const assert=require('node:assert/strict'),D=require('../../atelier/designer-core.cjs');
const base=require('../2026-10-12-grivka-white-guard/model.cjs');
const SET='2026-10-12-froz-vaerok',fields=['id','characterId','name','title','job','element','race','weapon','faction','role','positions','atk','defense','magic','barriers'];
const donor=base.donor,validateProfile=base.validateProfile,characterId=c=>c.characterId;
function profile(c){return validateProfile({...D.profileCard(donor(c),c.id),faction:c.faction,role:c.role,characterId:c.characterId,artworkSource:c.artworkSource,source:'Original Kalistar, illustration approuvee le 12 octobre 2026',visual_revision:'V4-'+SET},c);}
function validateSet(s){
 assert.equal(s.id,SET);assert.equal(s.cards.length,1);
 const c=s.cards[0];assert.equal(c.id,'49902301');assert.equal(c.race,'OKAMI');assert.equal(c.faction,'Froz');assert.equal(c.element,'HEMATO');assert.equal(c.role,2);assert.deepEqual(c.positions,[2]);profile(c);return s;
}
function validateGame(data,s,createEngine){
 const E=createEngine(data),deck=require('./fixtures.cjs').deck;assert.deepEqual(E.validatePlayableDeck(deck),[]);
 for(const c of s.cards)for(const f of fields)assert.deepEqual(E.byId[c.id][f],c[f],f);
 assert(data.cards.some(c=>c.faction==='Grivka'));assert(data.cards.some(c=>c.faction==='Froz'));
 return {deck};
}
module.exports={SET,characterId,donor,profile,validateProfile,validateSet,validateGame};
