'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const plan=require('./plan.json'),catalogue=require('../../donnees/catalogue.json'),frozen=require('./before.json');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
test('22 FFIX flags preserve the latest profiles, artworks and prior revision chains',()=>{
 assert.equal(plan.cards.length,22);
 for(const c of plan.cards){
  const entry=catalogue.cards.find(e=>e.id===c.id),before=frozen.cards.find(e=>e.id===c.id).entry;
  assert.deepEqual(entry.profile,before.profile);
  assert.equal(entry.nativeRevision.id,plan.revision);
  assert.deepEqual(entry.nativeRevision.previous,before.nativeRevision||null);
  const dir=path.resolve(__dirname,'../../creations',c.id),proof=JSON.parse(fs.readFileSync(path.join(dir,'verification.json'),'utf8'));
  assert(proof.passed&&proof.barcode.passed);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.components.fixedDifferences,0);
  assert.equal(proof.scope.outside,0);assert(proof.scope.changed>0);assert.equal(proof.gameplayUnchanged,true);
  assert.deepEqual(proof.scope.rectangles,[[672,829,770,1052]]);
  assert.equal(hash(path.join(dir,'card.png')),proof.hashes['card.png']);
  assert.equal(hash(path.join(dir,'illustration.png')),frozen.observed['V4/creations/'+c.id+'/illustration.png']);
 }
});

