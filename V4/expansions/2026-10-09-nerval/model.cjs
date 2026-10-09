'use strict';
const assert = require('node:assert/strict');
const D = require('../../atelier/designer-core.cjs');
const bounds = require('../../../V3/donnees/regles_demo.json').roleBounds;
const SET = '2026-10-09-nerval';
const fields = ['id','characterId','name','title','job','description','element','race','weapon','faction','role','positions','atk','defense','magic','barriers'];
const characterId = c => c.characterId;
const donor = c => D.validate(Object.fromEntries(D.FIELDS.filter(k => k in c).map(k => [k,c[k]])), {final:true});
function validateProfile(p,c) {
  for (const f of fields) assert.deepEqual(p[f],c[f],f);
  donor(p); assert(p.positions.includes(p.role));
  for (const side of ['atk','defense']) p[side].forEach((v,i) => {
    if (typeof v === 'number') assert(Number.isInteger(v) && v >= (bounds[p.role][side][i+1] || 0) && v <= bounds[p.role][side][i]);
  });
  assert.equal(p.canGuard,p.atk.includes('guard')); assert.equal(p.canHeal,p.atk.includes('revive'));
  return p;
}
function profile(c) {
  return validateProfile({...D.profileCard(donor(c),c.id),role:c.role,characterId:c.characterId,
    artworkSource:c.artworkSource,source:'Original Kalistar, illustration approuvee le 9 octobre 2026',visual_revision:'V4-'+SET},c);
}
function validateSet(s) {
  assert.equal(s.id,SET); assert.equal(s.cards.length,1); assert.equal(s.cards[0].id,'49901402');
  profile(s.cards[0]); return s;
}
function validateGame(data,s,createEngine) {
  const E=createEngine(data),ids=require('./fixtures.cjs').deck;
  assert.deepEqual(E.validatePlayableDeck(ids),[]);
  for (const c of s.cards) for (const f of ['characterId','element','weapon','role','positions','atk','defense','magic','barriers']) assert.deepEqual(E.byId[c.id][f],c[f]);
  return {deck:ids};
}
module.exports={SET,characterId,donor,profile,validateProfile,validateSet,validateGame};
