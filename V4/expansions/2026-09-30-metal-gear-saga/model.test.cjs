'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('./model.cjs'),set=require('./set.json');
test('19 requested profiles, role ranges and distinct Snake identities',()=>M.validateSet(set));
test('reject overflow, special/magic overlap and identity merges',()=>{
 for(const mutate of [s=>s.cards[0].atk[0]=301,s=>s.cards[0].magic=[1],s=>s.cards[5].characterId='solid-snake-mgs',s=>s.cards[11].atk[0]=160,s=>s.cards[7].race='HUMAIN']){
  const copy=structuredClone(set);mutate(copy);assert.throws(()=>M.validateSet(copy));
 }
});
test('new factions and races resolve to additive V4 assets',()=>{
 const C=require('../../site/collaborations.js'),Binder=require('../../site/collection-binder.js');
 for(const id of ['MGS3','MGS5']){const c={faction:id,collaboration:id};assert.equal(C.universe(c),id);assert.equal(C.asset('factions',id),'assets/factions/'+id+'.png');assert(Binder.matchesScope(c,'metal-gear'));}
 for(const race of ['BUZZY','SERPES'])assert.equal(C.asset('races',race),'assets/races/'+race+'.png');
});
