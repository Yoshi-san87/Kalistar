'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../../atelier/lib.cjs'),{fs,path,read,hash,sharp,ROOT}=L;
const file=n=>path.join(__dirname,n),before=read(file('before.json')),component=read(file('components.json'));
test('Native banner uses uniform scaling, original alpha contour and versioned web asset',async()=>{
 const {transform:t,fullGeometry:g,geometry:p}=component;
 assert.equal(t.fit,'cover');assert.equal(t.scaleX,t.scaleY);
 assert.equal(t.scaleX,Math.max(g.width/t.source.width,g.height/t.source.height));
 const original=await sharp(file('banner-source.png')).trim().png().toBuffer();
 const texture=await sharp(original).resize(g.width,g.height,{fit:'cover',position:'north'}).flatten({background:'#103331'}).png().toBuffer();
 const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
 const expected=await sharp(texture).ensureAlpha().composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
 assert.deepEqual(await sharp(file('flag.png')).raw().toBuffer(),await sharp(expected).raw().toBuffer());
 const alpha=f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 assert.deepEqual(await alpha(file('flag.png')),await alpha(outline));
 assert.deepEqual(await alpha(file('flag-packed.png')),await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
 assert.deepEqual(p,{left:672,top:829,width:98,height:223});
 assert.equal(await hash(path.join(ROOT,component.web)),component.fullHash);
 assert.equal(require('../../site/factions.js').assetName('TOMBRAIDER'),'TOMBRAIDER');
 assert.equal(require('../../site/collaborations.js').asset('factions','TOMBRAIDER'),'assets/factions/TOMBRAIDER-native-v2.png');
});
test('Five cards change only the banner; illustrations, editable texts and gameplay stay exact',async()=>{
 const current=require('../2026-10-21-collab-kalistels/compatibility.cjs').previousCatalogue(read(path.join(ROOT,'V4/donnees/catalogue.json'))),g=component.geometry;
 for(const c of before.cards){
  const dir=file('cards/'+c.key),prod=path.join(ROOT,'V4/creations',c.id),old=file('originals/'+c.key),entry=current.cards.find(v=>v.id===c.id);
  assert.deepEqual(entry.profile,c.entry.profile);assert.deepEqual(read(path.join(prod,'profile.json')),c.entry.profile);
  const restored=structuredClone(entry);delete restored.nativeRevision;assert.deepEqual(restored,c.entry);
  assert.deepEqual(entry.nativeRevision.changedFields,['factionBanner']);assert.equal(entry.nativeRevision.id,path.basename(__dirname));
  const proof=read(path.join(dir,'verification.json'));assert(proof.passed&&proof.gameplayUnchanged&&proof.barcode.passed);
  assert.equal(proof.components.fixedDifferences,0);assert.equal(proof.roundtrip.changed,0);
  const delta=await L.diff(path.join(old,'card.png'),path.join(prod,'card.png'),[[g.left,g.top,g.left+g.width,g.top+g.height]]);
  assert.deepEqual(delta,proof.bannerOnly);assert(delta.changed>1000);assert.equal(delta.outside,0);
  assert.equal(await hash(path.join(prod,'illustration.png')),await hash(path.join(old,'illustration.png')));
  for(const [n,h]of Object.entries(read(path.join(prod,'creation.json')).hashes))assert.equal(await hash(path.join(prod,n)),h);
  for(const n of ['card.png','card.psd'])assert.equal(await hash(path.join(prod,n)),proof.hashes[n]);
  const n=read(path.join(dir,'render/native.json')),prior=read(path.join(old,'render/native.json'));
  assert.deepEqual(n.layers.filter(l=>l.kind==='LayerKind.TEXT'),prior.layers.filter(l=>l.kind==='LayerKind.TEXT'));
  const plan=read(path.join(dir,'render/composition.json'));assert.deepEqual(plan,read(path.join(old,'render/composition.json')));
  for(const layer of plan.layers.filter(l=>l.name!=='FACTION - TOMBRAIDER'))assert.equal(await hash(path.join(dir,'render',layer.file)),await hash(path.join(ROOT,'V4/expansions/2026-10-18-lara-croft/cards',c.key,'render',layer.file)));
 }
 for(const c of before.catalogue.cards)if(!before.cards.some(n=>n.id===c.id))assert.deepEqual(current.cards.find(n=>n.id===c.id),c);
 const ids=new Set(before.catalogue.cards.map(c=>c.id)),build=require('../../atelier/game-catalog.cjs').buildCatalog;
 assert.deepEqual(await build({published:current.cards.filter(c=>ids.has(c.id)&&c.kind==='created')}),await build({published:before.catalogue.cards.filter(c=>c.kind==='created')}));
});
test('Frozen original sources and revision inputs are preserved without rewriting old locks',async()=>{
 for(const [f,h]of Object.entries(read(file('render-inputs.json'))))assert.equal(await hash(file(f)),h,f);
 for(const group of [before.inputs,before.backups,read(path.join(ROOT,'V4/expansions/2026-10-18-lara-croft/before.json')).inputs])for(const [f,h]of Object.entries(group))assert.equal(await hash(path.join(ROOT,f)),h,f);
});
