'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {plan}=require('../../deploy/build.cjs'),set=require('./set.json');
test('Two Riko editions published, existing Nestown banner and catalogue untouched',async()=>{
 const {catalogue,files}=await plan();
 for(const c of set.cards){
  const item=catalogue.cards.find(v=>v.id===c.id);assert(item);assert.equal(item.characterId,c.characterId);
  assert(files.some(f=>f.source==='V4/creations/'+c.id+'/card.png'));
 }
 assert(!files.some(f=>f.source.startsWith('V4/propositions/2026-10-20-kaylis-rencontres/')));
 const cat=require('../../revisions/2026-10-21-collab-kalistels/compatibility.cjs').previousCatalogue(require('../../donnees/catalogue.json'));
 for(const old of require('./before.json').catalogue.cards)assert.deepEqual(cat.cards.find(c=>c.id===old.id),old);
});
