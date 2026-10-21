'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const plan=require('./plan.json'),before=require('./before.json'),root=path.resolve(__dirname,'../../..');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
test('Eleven editable PSDs, exact reopen, fixed pixels and four barcode reads',()=>{
 for(const s of plan.cards){
  const dir=path.join(__dirname,'cards',s.key),p=require(dir+'/profile.json'),v=require(dir+'/verification.json');
  assert(v.passed&&v.barcode.passed&&v.numericFacesAndEffectsUnchanged);
  assert.equal(v.roundtrip.changed,0);assert.equal(v.components.fixedDifferences,0);assert.equal(v.scope.outside,0);assert(v.scope.changed>0);
  assert.deepEqual(v.elementChange,{from:'NONE',to:s.element});
  for(const f of ['card.png','card.psd'])assert.equal(hash(path.join(root,'V4/creations',s.id,f)),v.hashes[f]);
  assert.deepEqual(require(path.join(root,'V4/creations',s.id,'profile.json')),p);
  const native=require(dir+'/render/native.json');assert.deepEqual([native.width,native.height,native.resolution],[897,1497,300]);
  assert(native.layers.some(l=>l.name==='CRISTAL '+s.element&&l.kind==='LayerKind.SMARTOBJECT'));
  const previous=require('./originals/'+s.id+'/render/native.json');
  for(const l of previous.layers.filter(l=>l.kind==='LayerKind.TEXT')){
   const next=native.layers.find(n=>n.name===l.name);assert.equal(next.text,l.text);assert.deepEqual(next.ink,l.ink);
  }
 }
});
test('Frozen originals, illustrations, protected sources and Koby stay byte-identical',()=>{
 for(const group of ['inputs','backups','exceptionFiles'])for(const [f,h]of Object.entries(before[group]))assert.equal(hash(path.join(root,f)),h,f);
 for(const s of plan.cards)assert.equal(hash(path.join(root,'V4/creations',s.id,'illustration.png')),hash(path.join(__dirname,'originals',s.id,'illustration.png')));
 const prior=before.otherEntries.find(c=>c.id===plan.exception.id),current=require('../../donnees/catalogue.json').cards.find(c=>c.id===plan.exception.id);assert.deepEqual(current,prior);
});
