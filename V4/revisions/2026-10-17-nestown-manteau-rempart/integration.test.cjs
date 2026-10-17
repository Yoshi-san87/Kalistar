'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const before=require('./before.json'),catalogue=require('../../donnees/catalogue.json'),root=path.resolve(__dirname,'../../..'),REV=path.basename(__dirname);
const digest=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const rules=p=>Object.fromEntries(Object.entries(p).filter(([k])=>!['artworkSource','visual_revision'].includes(k)));
test('Historical projection rejects unrelated edits instead of weakening old snapshots',()=>{
 const {previousEntry}=require('./compatibility.cjs');
 for(const c of before.cards){
  const actual=catalogue.cards.find(v=>v.id===c.id);assert.deepEqual(previousEntry(actual),c.entry);
  for(const change of [p=>p.profile.atk[0]++,p=>p.profile.weapon='Gun',p=>p.name='Changed',p=>p.profile.characterId='other',p=>p.nativeRevision.previous=null,p=>p.profile.artworkSource='wrong.png']){
   const bad=structuredClone(actual);change(bad);
   if(c.key==='karrok'&&bad.nativeRevision.previous===null&&JSON.stringify(bad)===JSON.stringify(actual))continue;
   assert.throws(()=>previousEntry(bad));
  }
 }
 const untouched=catalogue.cards.find(c=>!before.cards.some(v=>v.id===c.id));assert.equal(previousEntry(untouched),untouched);
});
test('Four approved Nestown illustrations replace existing models without changing identities or gameplay',async()=>{
 assert.deepEqual(before.cards.map(c=>c.id),['49900312','49900313','49900314','49902608']);
 for(const c of before.cards){
  const current=catalogue.cards.find(v=>v.id===c.id),dir=path.join(root,'V4/creations',c.id);
  assert.deepEqual(rules(current.profile),rules(c.entry.profile));assert.deepEqual(require(path.join(dir,'profile.json')),current.profile);
  assert.equal(current.nativeRevision.id,REV);assert.deepEqual(current.nativeRevision.previous,c.entry.nativeRevision||null);
  assert.deepEqual(current.nativeRevision.changedFields,['artwork']);
  assert.equal(digest(path.join(dir,'illustration.png')),c.approvedArtHash);
 }
 const ids=new Set(before.catalogue.cards.map(c=>c.id)),build=require('../../atelier/game-catalog.cjs').buildCatalog;
 assert.deepEqual(await build({published:catalogue.cards.filter(c=>ids.has(c.id)&&c.kind==='created')}),await build({published:before.catalogue.cards.filter(c=>c.kind==='created')}));
});
test('Native artwork-only replacement preserves frame pixels, editable text, barcode and reopened PSD',async()=>{
 const {diff}=require('../../atelier/lib.cjs');
 for(const c of before.cards){
  const dir=path.join(__dirname,'cards',c.key),prod=path.join(root,'V4/creations',c.id),old=path.join(__dirname,'originals',c.key);
  const proof=require(path.join(dir,'verification.json'));assert(proof.passed&&proof.barcode.passed&&proof.gameplayUnchanged);
  assert.equal(proof.components.fixedDifferences,0);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.artOnly.outside,0);assert(proof.artOnly.changed>400000);
  assert.deepEqual(await diff(path.join(old,'card.png'),path.join(prod,'card.png'),[[80,156,817,1077]]),proof.artOnly);
  for(const [file,h]of Object.entries(require(path.join(prod,'creation.json')).hashes))assert.equal(digest(path.join(prod,file)),h);
  for(const file of ['card.png','card.psd']){assert.equal(digest(path.join(dir,file)),proof.hashes[file]);assert.equal(digest(path.join(prod,file)),proof.hashes[file]);}
  const native=require(path.join(dir,'render/native.json')),prior=require(path.join(old,'render/native.json'));
  assert.deepEqual(native.layers.filter(l=>l.kind==='LayerKind.TEXT'),prior.layers.filter(l=>l.kind==='LayerKind.TEXT'));
  const plan=require(path.join(dir,'render/composition.json'));
  for(const l of plan.layers.filter(l=>!l.name.startsWith('ILLUSTRATION - '))){
   const a=prior.components.find(v=>v.name===l.name);assert.deepEqual(l,a);
  }
 }
});
test('Original native sources and all non-target catalogue entries remain preserved',()=>{
 for(const [f,h]of Object.entries(before.backups))assert.equal(digest(path.join(root,f)),h,f);
 for(const c of before.catalogue.cards)if(!before.cards.some(v=>v.id===c.id))assert.deepEqual(catalogue.cards.find(v=>v.id===c.id),c);
});
