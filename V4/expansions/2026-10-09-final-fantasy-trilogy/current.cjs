'use strict';
const assert=require('node:assert/strict'),M=require('./model.cjs'),initial=require('./set.json');
const revision=require('../../revisions/2026-10-09-umaro-macako/plan.json'),set=structuredClone(initial);
for(const change of revision.cards)set.cards.find(c=>c.id===change.id).race=change.race;
function validateSet(candidate){
 const historical=structuredClone(candidate);
 for(const change of revision.cards){
  assert.equal(candidate.cards.find(c=>c.id===change.id)?.race,change.race);
  historical.cards.find(c=>c.id===change.id).race=initial.cards.find(c=>c.id===change.id).race;
 }
 M.validateSet(historical);return candidate;
}
function validateGame(data,candidate,createEngine){
 validateSet(candidate);
 for(const spec of candidate.cards){
  const card=data.cards.find(c=>c.id===spec.id);assert(card);
  for(const field of M.PRINTED)assert.deepEqual(card[field],spec[field],spec.key+'.'+field);
  assert.equal(card.characterId,spec.characterId);assert.equal(card.role,spec.role);
 }
 const E=createEngine(data),decks=M.qaDecks();
 for(const ids of decks)assert.deepEqual(E.validatePlayableDeck(ids),[]);
 assert.equal(new Set(decks.flat()).size,29);
 const variants=candidate.cards.filter(c=>c.characterId==='terra-ff6'),bad=decks[0].slice();
 bad[bad.findIndex(id=>!variants.some(c=>c.id===id))]=variants[1].id;
 assert(E.validatePlayableDeck(bad).length,'Terra variants must share one deck identity');
 return {cards:data.cards.length,added:29,qaDecks:decks,noPresetInstalled:true};
}
module.exports={...M,set,initial,revision,validateSet,validateGame};
