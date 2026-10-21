'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {plan}=require('../../deploy/build.cjs'),set=require('./set.json'),before=require('./before.json');
test('All sixteen Octopath cards and native banner are published without prototypes',async()=>{
 const {catalogue,files}=await plan();
 for(const c of set.cards){const actual=catalogue.cards.find(n=>n.id===c.id);assert(actual,c.key);assert.equal(actual.characterId,c.characterId);assert.equal(actual.faction,'OCTOPATH');assert(files.some(f=>f.source==='V4/creations/'+c.id+'/card.png'));}
 assert(files.some(f=>f.source==='V4/site/assets/factions/OCTOPATH.png'));
 assert(!files.some(f=>f.source.startsWith('V4/propositions/2026-10-20-octopath-traveler/')));
 const entries=require('../../revisions/2026-10-21-collab-kalistels/compatibility.cjs').previousCatalogue(require('../../donnees/catalogue.json')).cards;
 for(const old of before.catalogue.cards)assert.deepEqual(entries.find(c=>c.id===old.id),old);
});
