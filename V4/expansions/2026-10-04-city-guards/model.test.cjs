'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./model.cjs'),set=require('./set.json'),ROOT=path.resolve(__dirname,'../../..');
test('17 distinct city guards preserve requested faction and race distribution',()=>{
 M.validateSet(set);assert.equal(new Set(set.cards.map(c=>c.id)).size,17);
 const count=field=>set.cards.reduce((a,c)=>(a[c[field]]=(a[c[field]]||0)+1,a),{});
 assert.deepEqual(count('faction'),{Draevenheim:5,Durane:5,Nestown:4,Crabazar:3});
 assert.deepEqual(count('race'),{HUMAIN:5,VAMP:2,NAIN:3,FALCO:2,KORBOW:2,CRUSTOS:3});
 assert.deepEqual(set.cards.slice(0,5).map(c=>c.element),['NONE','NONE','NONE','HEMATO','HEMATO']);
});
test('Caps, unique identities, support restrictions and crystal modes reject invalid profiles',()=>{
 for(const mutate of [
  s=>{s.cards[0].atk[0]=999;},s=>{s.cards[0].magic=[6];},
  s=>{s.cards[0].barriers=[5];},s=>{s.cards[0].positions=[1,1];},
  s=>{s.cards[1].atk[1]='guard';},s=>{s.cards[1].atk[2]='revive';},
  s=>{s.cards[1].characterId=s.cards[0].characterId;},
  s=>{s.cards[14].race='HUMAIN';},s=>{s.cards[4].element='NONE';}
 ]){const bad=structuredClone(set);mutate(bad);assert.throws(()=>M.validateSet(bad));}
});
test('CRUSTOS calibrated extension preserves all prior race entries and native geometry',()=>{
 const before=require('./references/race-extensions-before.json'),after=require('../../atelier/designer-assets/race-extensions.json');
 for(const [name,p]of Object.entries(before.races))assert.deepEqual(after.races[name],p,name);
 const c=after.races.CRUSTOS,p=require('./race-components.json').races.CRUSTOS;
 assert.deepEqual([c.left,c.top,c.width,c.height],[711,1116,96,95]);
 assert(p.metrics.fullAlphaRadius<=39);assert(p.metrics.opticalError<=.75);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'V4/atelier/designer-assets',c.file))).digest('hex'),c.sha256);
 assert.equal(require('../../site/collaborations.js').asset('races','CRUSTOS'),'assets/races/CRUSTOS.png');
});
test('Every selected illustration and exact generation prompt is preserved locally',()=>{
 const selection=require('./art-selection.json');
 for(const c of set.cards){
  assert(selection.selection[c.key]);assert(fs.statSync(path.join(ROOT,M.artPath(c))).size>100000);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,M.artPath(c)))).digest('hex'),
   crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'selected-art',c.key+'.png'))).digest('hex'));
 }
});
