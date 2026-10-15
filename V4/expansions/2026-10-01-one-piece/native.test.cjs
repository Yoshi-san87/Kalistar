'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('./model.cjs'),set=require('./set.json');
test('native donor and profile preserve all printed fields',()=>{const D=require('../../atelier/designer-core.cjs');for(const c of set.cards)M.validateProfile(M.profile(c,D),c);});
test('real catalogue adapter preserves pure One Piece gameplay',async()=>{
 const data=await require('./build.cjs').game();
 assert.deepEqual(M.validateGame(data,set,require('../../site/engine.js').createEngine).coverage,{1:3,2:3,3:4,4:2,5:2});
});
