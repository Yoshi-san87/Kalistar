'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('./model.cjs'),set=require('./set.json');
test('25 requested RE cards and shared identities',()=>M.validateSet(set));
test('reject identity drift, ID collision, role overflow, magic on effects and incorrect requests',()=>{
 for(const mutate of [s=>s.cards[0].characterId='jill-other',s=>s.cards[0].id=s.cards[1].id,s=>s.cards[0].atk[0]=301,s=>s.cards[0].magic=[1],s=>s.cards[6].weapon='Gun',s=>s.cards[18].race='HUMAIN',s=>s.cards[21].element='PYRO']){const copy=structuredClone(set);mutate(copy);assert.throws(()=>M.validateSet(copy));}
});
test('native donor and profile preserve printed values',()=>{const D=require('../../atelier/designer-core.cjs');for(const c of set.cards)M.validateProfile(M.profile(c,D),c);});
test('real RE-only deck coverage, family duplicate rejection and episode synergy',async()=>{const data=await require('./build.cjs').game();const proof=M.validateGame(data,set,require('../../site/engine.js').createEngine);assert.deepEqual(proof.coverage,{1:2,2:2,3:5,4:3,5:2});});
