'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),before=require('./originals/profile.json'),after=require('./work/profile.json');
test('Luffy requested light and DEF clover preserve his identity, illustration source and numerical faces',()=>{
 assert.equal(after.id,before.id);assert.equal(after.characterId,before.characterId);assert.deepEqual(after.positions,before.positions);
 assert.equal(after.artworkSource,before.artworkSource);assert.deepEqual(after.atk,before.atk);assert.deepEqual(after.defense.slice(0,5),before.defense.slice(0,5));
 assert.equal(after.defense[5],'retry');assert.equal(after.element,'LUXO');assert.deepEqual(after.magic,[4]);assert.deepEqual(after.barriers,[]);
});
test('Luffy native evidence preserves remaining text and all pixels outside requested regions',()=>{
 const proof=require('./work/verification.json');assert(proof.passed&&proof.barcode.passed);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.components.fixedDifferences,0);
 assert.equal(proof.revision.outside,0);assert(proof.revision.allRemainingNativeTextUnchanged&&proof.revision.artworkPreserved);
});
