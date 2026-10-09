'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),cat=require('../../donnees/catalogue.json'),set=require('./set.json'),M=require('./model.cjs');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
test('18 Street Fighter native cards are published, Rose and Dan excluded',()=>{
 const rows=cat.cards.filter(c=>c.profile.collaboration==='STREETFIGHTER');assert.deepEqual(rows.map(c=>c.id),set.cards.map(c=>c.id));
 for(const spec of set.cards){
  const e=rows.find(c=>c.id===spec.id),folder='V4/creations/'+e.id;
  const p=read(folder+'/profile.json'),proof=read(folder+'/verification.json');
  M.validateProfile({...p,artworkSource:spec.artworkSource},spec);assert.deepEqual(e.profile,p);
  assert.equal(proof.passed,true);assert.equal(proof.profileHash,hash(folder+'/profile.json'));
  assert.equal(proof.hashes['card.png'],hash(folder+'/card.png'));
  assert.equal(proof.components.fixedDifferences,0);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.barcode.passed,true);assert.equal(proof.barcode.expected,e.id);
  const image=fs.readFileSync(path.join(root,folder,'card.png'));assert.equal(image.readUInt32BE(16),897);assert.equal(image.readUInt32BE(20),1497);
  if(spec.key!=='fei-long'){assert.equal(p.artworkSource,spec.artworkSource);assert.equal(hash(folder+'/illustration.png'),hash(spec.artworkSource));}
 }
});
test('Fei Long uses the approved midpoint correction, only artwork differs',()=>{
 const f='V4/revisions/2026-10-09-fei-long-final/',p=read('V4/creations/49901717/profile.json'),old=read(f+'originals/profile.json'),proof=read(f+'work/verification.json');
 assert.equal(p.artworkSource,'V4/propositions/2026-10-09-street-fighter/images/fei-long-v3.png');
 assert.deepEqual({...p,artworkSource:old.artworkSource},old);assert.equal(proof.scope.outside,0);assert(proof.scope.changed>0);
 assert.equal(hash('V4/creations/49901717/illustration.png'),hash(p.artworkSource));
 assert.equal(cat.cards.find(c=>c.id===p.id).nativeRevision.id,'2026-10-09-fei-long-final');
});
test('The previous catalogue remains identical, including the later authorized rename',()=>{
 const old=require('./before.json').catalogue.cards,{previousEntry}=require('../../revisions/2026-10-09-homme-mystere/compatibility.cjs');
 for(const c of old)assert.deepEqual(previousEntry(cat.cards.find(n=>n.id===c.id)),c);
 assert.equal(cat.cards.length,old.length+18);
});
test('The Street Fighter banner has its own working asset and collection scope',()=>{
 const C=require('../../site/collaborations.js'),binder=require('../../site/collection-binder.js');
 const image=fs.readFileSync(path.join(root,'V4/site/assets/factions/STREETFIGHTER.png'));assert.equal(image.subarray(1,4).toString(),'PNG');
 for(const c of set.cards){assert(C.matches(c,'street-fighter'));assert(binder.matchesScope(c,'street-fighter'));assert(!binder.matchesScope(c,'batman'));}
});
