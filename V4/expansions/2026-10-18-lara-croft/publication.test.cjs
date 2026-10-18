'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {plan}=require('../../deploy/build.cjs'),set=require('./set.json');
test('Five Lara editions and new banner published, previous catalogue untouched',async()=>{
 const {catalogue,files}=await plan();
 for(const c of set.cards){
  const item=catalogue.cards.find(v=>v.id===c.id);assert(item);assert.equal(item.characterId,c.characterId);
  assert(files.some(f=>f.source==='V4/creations/'+c.id+'/card.png'));
 }
 assert(files.some(f=>f.source==='V4/site/assets/factions/TOMBRAIDER.png'));
 assert(!files.some(f=>f.source.startsWith('V4/propositions/2026-10-18-lara-croft-five-eras/')));
 const cat=require('../../donnees/catalogue.json');
 for(const old of require('./before.json').catalogue.cards)assert.deepEqual(cat.cards.find(c=>c.id===old.id),old);
});
