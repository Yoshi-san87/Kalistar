'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),set=require('./set.json');
const root=path.resolve(__dirname,'../../..'),digest=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
test('45 native proofs, approved art, current weapon glyphs and preserved catalogue',()=>{
 const cat=require('../../donnees/catalogue.json'),seen=new Set();
 for(const c of set.cards){
  const dir=path.join(__dirname,'cards',c.key),v=require(path.join(dir,'verification.json'));
  assert(v.passed&&v.barcode.passed);assert.equal(v.components.fixedDifferences,0);assert.equal(v.roundtrip.changed,0);
  assert.equal(v.verificationPolicyHash,digest(path.join(__dirname,'verification-policy.json')));
  assert.equal(digest(path.join(root,c.artworkSource)),c.artworkSha256);
  assert.equal(digest(path.join(dir,'illustration.png')),c.artworkSha256);seen.add(c.artworkSha256);
  for(const f of ['card.png','card.psd'])assert.equal(digest(path.join(dir,f)),v.hashes[f]);
  const w=require('./weapon-components.json').find(w=>w.id===c.id);assert(w);
  assert.equal(digest(path.join(root,w.source)),w.sourceHash);
  const flag=require('./faction-components.json').find(f=>f.id===c.id);assert(flag);
  assert.equal(digest(path.join(root,flag.source)),flag.sourceHash);
 }
 assert.equal(seen.size,45);
 for(const old of require('./before.json').catalogue.cards)assert.deepEqual(cat.cards.find(c=>c.id===old.id),old);
});
test('Dagga text correction preserves the rejected preparation and every other profile',()=>{
 const revision=require('./revisions/01-dagga-text/revision.json'),before=require('./before.json');
 assert.equal(digest(path.join(__dirname,'before.json')),revision.originalManifestHash);
 for(const entry of revision.files){
  const file=path.join(__dirname,entry.relative),key=path.relative(root,file).replaceAll('\\','/');
  assert.equal(entry.before,before.inputs[key]);
  assert.equal(digest(path.join(__dirname,'revisions/01-dagga-text/previous',entry.relative)),entry.before);
  assert.equal(digest(file),entry.after);
 }
 const original=structuredClone(require('./revisions/01-dagga-text/previous/set.json'));
 original.cards.find(c=>c.key==='dagga-renouveau').description=set.cards.find(c=>c.key==='dagga-renouveau').description;
 assert.deepEqual(original,set);
});
