'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),before=require('./before.json'),catalogue=require('../../donnees/catalogue.json');
const digest=f=>{const b=fs.readFileSync(f),p=b.length<1024&&/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(b.toString());return p?p[1]:crypto.createHash('sha256').update(b).digest('hex');};
test('14 native medallions use the current screen glyphs without changing any profile or artwork',()=>{
 assert.equal(before.cards.length,14);assert.equal(require('./verification.json').passed,true);
 for(const [f,h]of Object.entries(require('./render-driver.json').hashes))assert.equal(digest(path.join(__dirname,f)),h);
 for(const c of before.cards){
  const dir=path.join(__dirname,'cards',c.key),prod=path.join(root,'V4/creations',c.id),current=catalogue.cards.find(x=>x.id===c.id),v=require(path.join(dir,'verification.json'));
  assert(v.passed&&v.weaponOnly&&v.profileUnchanged);assert.equal(v.scope.outside,0);assert(v.scope.changed>0);assert.equal(v.roundtrip.changed,0);assert.equal(v.components.fixedDifferences,0);assert(v.barcode.passed);
  assert.deepEqual(current.profile,c.entry.profile);assert.deepEqual(require(path.join(prod,'profile.json')),c.entry.profile);
  assert.equal(current.nativeRevision.id,path.basename(__dirname));assert.deepEqual(current.nativeRevision.changedFields,['weaponGlyph']);
  for(const f of ['card.png','card.psd']){assert.equal(digest(path.join(dir,f)),v.hashes[f]);assert.equal(digest(path.join(prod,f)),v.hashes[f]);}
  for(const f of ['profile.json','illustration.png'])assert.equal(digest(path.join(prod,f)),digest(path.join(__dirname,'originals',c.key,f)));
  const glyph=before.glyphs.find(g=>g.id===c.id);assert.equal(digest(path.join(root,glyph.source)),glyph.sourceHash);
  const n=require(path.join(dir,'render/native.json')),old=require(path.join(__dirname,'originals',c.key,'render/native.json'));
  assert.deepEqual(n.layers.filter(l=>l.kind==='LayerKind.TEXT'),old.layers.filter(l=>l.kind==='LayerKind.TEXT'));
 }
 for(const c of before.catalogue.cards)if(!before.cards.some(n=>n.id===c.id))assert.deepEqual(catalogue.cards.find(n=>n.id===c.id),c);
});
test('Projectile is the upright throwing star in both native cards',()=>{
 const glyphs=before.glyphs.filter(g=>g.family==='Projectile');assert.deepEqual(glyphs.map(g=>g.key),['kessaro','ithrek']);
 for(const g of glyphs){assert.equal(g.source,'V4/site/assets/base-weapons/09.svg');assert.equal(g.sourceHash,'37ebc05b21557f8967a072c2b019729e22f58268395d3ceebeb063b526c5557b');}
});
test('Native adapter keeps alpha and dimensions, uses all twenty validated white vectors',async()=>{
 const {sharp}=require('../../atelier/lib.cjs'),W=require('../../site/base-weapons.js'),N=require('../../scripts/stable/white-weapon-component.cjs');
 const {metrics}=require('../2026-09-27-weapon-optics/calibrate.cjs');
 for(const height of [95,97]){
  const top=1116-(height-95)/2,mask=await sharp(Buffer.from('<svg width="96" height="'+height+'"><ellipse cx="48" cy="'+height/2+'" rx="48" ry="47.5" fill="#0c2030"/></svg>')).png().toBuffer();
  const alpha=await sharp(mask).ensureAlpha().extractChannel(3).raw().toBuffer();
  for(const family of W.families){
   const {input,source}=await N.component(family,mask,{left:89,top});const m=await sharp(input).metadata();assert.deepEqual([m.width,m.height],[96,height]);
   assert((await sharp(input).extractChannel(3).raw().toBuffer()).equals(alpha));
   const pixels=await sharp(path.join(root,source)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),metric=metrics(pixels,.25,[48,47.5]);assert(metric.fullRadius<=44);assert(metric.opticalError<.8);
   // Instrument deliberately retains its dark bridge inside the white silhouette.
   let visible=0,white=0;
   for(let i=0;i<pixels.data.length;i+=4)if(pixels.data[i+3]){visible++;if([...pixels.data.subarray(i,i+3)].every(v=>v>=240))white++;}
   assert(visible>0&&white>visible*.8,'Predominantly white approved silhouette: '+family);
  }
 }
 await assert.rejects(N.component('Unknown',Buffer.alloc(0)),/Unknown weapon family/);
});
