'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('./model.cjs'),set=require('./set.json');
test('17 exact models, distinct numeric personalities and requested abilities',()=>M.validateSet(set));
test('reject illegal support, NONE magic and duplicate IDs',()=>{
 for(const mutate of [s=>s.cards[5].magic=[6],s=>s.cards[0].atk[0]=301,s=>s.cards[10].atk[5]='revive',s=>s.cards[11].characterId='geralt-other',s=>s.cards[9].race='HUMAIN',s=>s.cards[16].atk[2]=120,s=>s.cards[0].id=s.cards[1].id]){
  const bad=structuredClone(set);mutate(bad);assert.throws(()=>M.validateSet(bad));
 }
});
test('the new collaboration maps to its own playable filter and media',()=>{
 const C=require('../../site/collaborations.js'),B=require('../../site/collection-binder.js');
 assert.equal(C.of(set.cards[10]).id,'witcher');assert.equal(C.asset('factions','WITCHER'),'assets/factions/WITCHER.png');
 assert(B.matchesScope(set.cards[10],'witcher'));assert(!B.matchesScope(set.cards[10],'kalistar'));assert(!B.matchesScope(set.cards[0],'witcher'));
});
test('validate the actual game projection, which omits production metadata',()=>{
 const D=require('../../atelier/designer-core.cjs'),G=require('../../atelier/game-catalog.cjs');
 const cards=set.cards.map(c=>G.profileCard(M.profile(c,D),{}, {id:c.id,pngUrl:'/media/created/'+c.id+'.png',origin:'published'},require('../../../V3/donnees/elements.json'),require('../../../V3/donnees/armes.json')));
 cards.push({...cards[0],id:'49800103'});
 assert.equal(cards[0].officialCollaboration,undefined);
 const run=()=>M.validateGame({cards},set,require('../../site/engine.js').createEngine);
 assert.equal(run().cards,17);cards[0].atk=[301,...cards[0].atk.slice(1)];assert.throws(run);
});
