'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const S=require('./specs.cjs'),before=require('./before.json');
const current=require('../../donnees/catalogue.json'),{buildCatalog}=require('../../atelier/game-catalog.cjs');
test('Kalistel armor artwork does not alter any playable rule or identity',async()=>{
  const build=cat=>buildCatalog({published:cat.cards.filter(c=>c.kind==='created')});
  const expected=structuredClone(before.catalogue);expected.cards=expected.cards.filter(c=>!S.removed.includes(c.id));
  assert.deepEqual(await build(current),await build(expected));
  for(const c of S.cards){
    const p=current.cards.find(p=>p.id===c.id).profile,old=before.catalogue.cards.find(p=>p.id===c.id).profile;
    const {artworkSource,visual_revision,...rest}=p;
    const {artworkSource:oldArt,visual_revision:oldRevision,...oldRest}=old;
    assert.deepEqual(rest,oldRest);assert.notEqual(artworkSource,oldArt);
    assert.equal(artworkSource,'V4/Illustrations/'+c.art);
    assert.equal(visual_revision,'V4-2026-10-04-armor-refinement');
  }
  for(const id of ['49900301','49900317','49900402']){
    const p=current.cards.find(c=>c.id===id).profile;
    assert.equal(p.element,'NONE');assert.deepEqual(p.magic,[]);assert.deepEqual(p.barriers,[]);
  }
});
test('Six published card images match their native verification and art-only proof',()=>{
  assert.equal(S.cards.length,6);
  const checks=require('./native-checks.json');assert.equal(checks.length,6);
  for(const c of S.cards){
    const dir=path.resolve(__dirname,'../../creations',c.id),proof=JSON.parse(fs.readFileSync(path.join(dir,'verification.json'),'utf8'));
    assert(proof.passed&&proof.barcode.passed);assert.equal(proof.roundtrip.changed,0);
    assert.equal(proof.components.fixedDifferences,0);assert.equal(proof.artOnly.outside,0);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'card.png'))).digest('hex'),proof.hashes['card.png']);
    assert.equal(checks.find(v=>v.key===c.key).outside,0);
  }
});


test('Aeren is absent from the active catalogue and creation tree; Vessa remains',()=>{
  for(const id of S.removed){assert(!current.cards.some(c=>c.id===id));assert(!fs.existsSync(path.resolve(__dirname,'../../creations',id)));}
  assert(current.cards.some(c=>c.id==='49900312'));assert.equal(current.cards.length,before.catalogue.cards.length-1);
});
