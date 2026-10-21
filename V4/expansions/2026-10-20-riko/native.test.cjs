'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),set=require('./set.json');
const root=path.resolve(__dirname,'../../..'),digest=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
test('Two native proofs, editable text, current glyphs and exact approved art',async()=>{
 // Verify frozen inputs and approved artwork without changing historical locks.
 const L=require('../../atelier/lib.cjs');await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
 const frozen=require('./before.json'),cat=require('../../revisions/2026-10-21-collab-kalistels/compatibility.cjs').previousCatalogue(require('../../donnees/catalogue.json'));
 for(const [f,h]of Object.entries(frozen.inputs))assert.equal(digest(path.join(root,f)),h,'Frozen input changed: '+f);
 for(const c of frozen.catalogue.cards)assert.deepEqual(cat.cards.find(n=>n.id===c.id),c);
 const seen=new Set();
 for(const c of set.cards){
  const dir=path.join(__dirname,'cards',c.key),v=require(path.join(dir,'verification.json'));
  assert(v.passed&&v.barcode.passed);assert.equal(v.components.fixedDifferences,0);assert.equal(v.roundtrip.changed,0);
  const art=digest(path.join(root,c.artworkSource));assert.equal(digest(path.join(dir,'illustration.png')),art);seen.add(art);
  for(const f of ['card.png','card.psd'])assert.equal(digest(path.join(dir,f)),v.hashes[f]);
  const w=require('./weapon-components.json').find(w=>w.id===c.id);assert(w);assert.equal(digest(path.join(root,w.source)),w.sourceHash);
  const native=require(path.join(dir,'render/native.json'));
  require('../2026-10-06-fifteen-faces/accent-typography.cjs').verify(native);
  assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
 }
 assert.equal(seen.size,2);
});
