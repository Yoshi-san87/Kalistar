'use strict';
const assert=require('node:assert/strict'),D=require('../../atelier/designer-core.cjs');
const base=require('../2026-10-13-fourteen-new-voices/model.cjs');
const SET='2026-10-14-kaylis-edris',characterId=c=>c.characterId;
const {fields,donor,validateProfile}=base;
function profile(c){return validateProfile({...D.profileCard(donor(c),c.id),role:c.role,characterId:c.characterId,artworkSource:c.artworkSource,source:'Original Kalistar, selection du 14 octobre 2026',visual_revision:'V4-'+SET},c);}
function validateSet(s){
 assert.equal(s.id,SET);assert.equal(s.cards.length,2);
 assert.deepEqual(s.cards.map(c=>c.id),['49902701','49902702']);
 assert.equal(s.cards[0].characterId,'kaylis');assert.equal(s.cards[1].characterId,'edris-7f-kalistar');
 assert.equal(s.cards[1].name,'EDRIS-7F');assert.equal(s.cards[1].job,'ESPIONNE');
 for(const c of s.cards)profile(c);return s;
}
function validateGame(data,s,createEngine){
 const E=createEngine(data),{decks}=require('./fixtures.cjs');
 for(const d of decks)assert.deepEqual(E.validatePlayableDeck(d),[]);
 for(const c of s.cards)for(const f of fields.filter(f=>f!=='description'))assert.deepEqual(E.byId[c.id][f],c[f],c.key+' '+f);
 return {decks};
}
module.exports={SET,fields,characterId,donor,profile,validateProfile,validateSet,validateGame};
