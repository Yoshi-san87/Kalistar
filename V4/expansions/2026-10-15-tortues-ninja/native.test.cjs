'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),set=require('./set.json');
const root=path.resolve(__dirname,'../../..'),digest=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
test('Ten native proofs, editable text, current glyphs and exact approved art',async()=>{
 await require('./build.cjs').stable();
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
 assert.equal(seen.size,10);
});
test('Facoche and Tortuga motifs remain inside native medallions and optically centred',()=>{
 const components=require('./components/components.json');
 for(const race of ['FACOCHE','TORTUGA']){
  const c=components.races[race];assert(c.metrics.fullAlphaRadius<=c.radiusLimit);assert(c.metrics.opticalError<=c.opticalTolerance);
  assert.equal(digest(path.join(root,c.motif)),c.motifHash);
  assert.equal(digest(path.join(root,'V4/atelier/designer-assets/extensions/race-'+race+'.png')),c.sha256);
 }
 const r=require('../../atelier/designer-assets/race-extensions.json'),old=require('./race-extensions-before.json');
 for(const [key,value]of Object.entries(old.races))assert.deepEqual(r.races[key],value);
});
