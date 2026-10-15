'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),G=require('./guard.cjs'),P=require('./allowed-changes.json');
const entry=(id)=>({id,kind:'created',profile:{characterId:id,name:id,atk:[1],defense:[2]},png:'unchanged.png'});
const before={cards:[entry('49800101'),entry('45951088'),entry('unrelated')]};
test('explicit concurrent stats and Kaine evidence are accepted without a new baseline',()=>{
  const current=structuredClone(before);current.cards[0].profile.atk=[294];current.cards[0].nativeRevision={id:'selected-stats'};
  current.cards[1].nativeRevision={id:'kaine-framing'};current.cards.push(entry('49800201'));
  G.checkCatalogue(current,before,P);
});
test('reject unrelated cards, original identity changes and Kaine stat changes',()=>{
  for(const change of [c=>c.cards[2].profile.atk=[2],c=>c.cards[0].profile.name='changed',
    c=>c.cards[1].profile.atk=[2],c=>c.cards.pop(),c=>c.cards.push(entry('unexpected'))]){
    const current=structuredClone(before);change(current);assert.throws(()=>G.checkCatalogue(current,before,P));
  }
});
test('whitelist matches the authorized stats plan and excludes original Rikka',()=>{
  const plan=require('../../revisions/2026-10-01-stat-personality/plan.cjs');
  assert.deepEqual([...P.statsIds].sort(),plan.map(c=>c.id).sort());
  assert(!P.statsIds.includes('40000042'));assert.deepEqual(P.framingIds,['45951088']);
});
