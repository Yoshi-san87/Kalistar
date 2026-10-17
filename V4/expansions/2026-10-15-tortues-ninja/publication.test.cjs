'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {plan}=require('../../deploy/build.cjs'),set=require('./set.json');
test('Ten TMNT cards, faction and race assets in runtime; old catalogue untouched',async()=>{
 const {catalogue,files}=await plan();
 for(const c of set.cards){
  const item=catalogue.cards.find(v=>v.id===c.id);assert(item);assert.equal(item.characterId,c.characterId);
  assert(files.some(f=>f.source==='V4/creations/'+c.id+'/card.png'));
 }
 for(const asset of ['factions/TMNT.png','races/FACOCHE.png','races/TORTUGA.png'])assert(files.some(f=>f.source==='V4/site/assets/'+asset));
 assert(!files.some(f=>f.source.startsWith('V4/propositions/2026-10-15-tortues-ninja/')));
 const cat=require('../../revisions/2026-10-17-nestown-manteau-rempart/compatibility.cjs').previousCatalogue(require('../../donnees/catalogue.json'));
 for(const old of require('./before.json').catalogue.cards)assert.deepEqual(cat.cards.find(c=>c.id===old.id),old);
});
