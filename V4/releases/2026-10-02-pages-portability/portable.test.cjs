'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../../..');
const lots=['2026-10-02-serpes-geralt','2026-10-02-serpes-mirelle'].map(name=>{
  const home=path.join(ROOT,'V4/expansions',name);
  return {model:require(path.join(home,'model.cjs')),set:require(path.join(home,'set.json'))};
});
const json=file=>JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8'));
test('published Geralt and Serpes profiles match every printed and gameplay field',()=>{
  for(const {model,set} of lots){
    model.validateSet(set);
    for(const card of set.cards){
      const profile=json('V4/creations/'+card.id+'/profile.json');
      model.validateProfile(profile,card);
      const proof=json('V4/creations/'+card.id+'/verification.json');
      assert.equal(proof.passed,true);
      assert.equal(proof.roundtrip.changed,0);
      assert.equal(proof.components.fixedDifferences,0);
      assert.equal(proof.barcode.passed,true);
    }
  }
});
test('new card limits and special-face overlays remain enforced without native dependencies',()=>{
  for(const {model,set} of lots){
    const bad=structuredClone(set);bad.cards.at(-1).atk[0]=999;
    assert.throws(()=>model.validateSet(bad));
    const overlay=structuredClone(set),card=overlay.cards.at(-1);
    card.barriers=[6-card.defense.findIndex(v=>typeof v!=='number')];
    assert.throws(()=>model.validateSet(overlay));
  }
});
test('actual portable game catalogue retains the original profiles and only the approved Geralt V2',async()=>{
  const published=json('V4/donnees/catalogue.json').cards.filter(c=>c.kind==='created');
  const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published});
  const engine=require('../../site/engine.js').createEngine;
  for(const {model,set} of lots)model.validateGame(data,set,engine);
  const second=data.cards.find(c=>c.id==='49900102');
  assert(second);assert.equal(second.characterId,data.cards.find(c=>c.id==='49900101').characterId);
  const spec=require('../../expansions/2026-10-09-crossover-crystals/set.json').cards.find(c=>c.id===second.id);
  for(const key of ['name','title','element','race','weapon','positions','atk','defense','magic','barriers'])assert.deepEqual(second[key],spec[key]);
  assert.equal(published.find(c=>c.id===second.id).publicationSource,'V4/expansions/2026-10-09-crossover-crystals');
  for(const id of ['49900101','49900201','49900202'])assert(data.cards.some(c=>c.id===id));
});
