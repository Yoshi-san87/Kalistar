'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),cat=require('../../donnees/catalogue.json'),set=require('./set.json'),M=require('./model.cjs');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
test('Nine Castlevania native cards are published with unchanged approved art',()=>{
 const rows=cat.cards.filter(c=>c.profile.collaboration==='CASTLEVANIA');assert.deepEqual(rows.map(c=>c.id),set.cards.map(c=>c.id));
 for(const spec of set.cards){
  const e=rows.find(c=>c.id===spec.id),folder='V4/creations/'+e.id;
  const p=read(folder+'/profile.json'),proof=read(folder+'/verification.json');
  M.validateProfile(p,spec);assert.deepEqual(e.profile,p);
  assert.equal(proof.passed,true);assert.equal(proof.profileHash,hash(folder+'/profile.json'));
  assert.equal(proof.hashes['card.png'],hash(folder+'/card.png'));
  assert.equal(proof.components.fixedDifferences,0);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.barcode.passed,true);assert.equal(proof.barcode.expected,e.id);
  const image=fs.readFileSync(path.join(root,folder,'card.png'));assert.equal(image.readUInt32BE(16),897);assert.equal(image.readUInt32BE(20),1497);
  {assert.equal(p.artworkSource,spec.artworkSource);assert.equal(hash(folder+'/illustration.png'),hash(spec.artworkSource));}
 }
});
test('The previous catalogue is preserved by additive publication',()=>{
 const old=require('./before.json').catalogue.cards;
 for(const c of old)assert.deepEqual(cat.cards.find(n=>n.id===c.id),c);
 for(const c of set.cards)assert(cat.cards.some(n=>n.id===c.id));
});
test('The Castlevania banner has its own working asset and collection scope',()=>{
 const C=require('../../site/collaborations.js'),binder=require('../../site/collection-binder.js');
 const image=fs.readFileSync(path.join(root,'V4/site/assets/factions/CASTLEVANIA.png'));assert.equal(image.subarray(1,4).toString(),'PNG');
 for(const c of set.cards){assert(C.matches(c,'castlevania'));assert(binder.matchesScope(c,'castlevania'));assert(!binder.matchesScope(c,'batman'));}
});
