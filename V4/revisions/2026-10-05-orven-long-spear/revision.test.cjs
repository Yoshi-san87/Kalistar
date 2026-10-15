'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const S=require('./specs.cjs'),before=require('./before.json'),current=require('../../donnees/catalogue.json');
const {buildCatalog}=require('../../atelier/game-catalog.cjs');
// Compare the original cohort without rejecting later, independently tested additions.
const baselineIds=new Set(before.catalogue.cards.map(c=>c.id));
const {entryBeforeRevision}=require('../2026-10-08-resident-evil-faces/historical-cohort.cjs');
const originalCohort=cat=>({...cat,cards:cat.cards.filter(c=>baselineIds.has(c.id)).map(entryBeforeRevision)});
test('Orven shield and spear artwork preserves every playable rule and identity',async()=>{
  const build=cat=>buildCatalog({published:cat.cards.filter(c=>c.kind==='created')});
  assert.deepEqual(await build(originalCohort(current)),await build(before.catalogue));
  const c=S.cards[0],p=current.cards.find(p=>p.id===c.id).profile,old=before.catalogue.cards.find(p=>p.id===c.id).profile;
  const {artworkSource,visual_revision,...rest}=p,{artworkSource:oldArt,visual_revision:oldRevision,...oldRest}=old;
  assert.deepEqual(rest,oldRest);assert.equal(artworkSource,'V4/Illustrations/'+c.art);assert.notEqual(artworkSource,oldArt);
  assert.equal(visual_revision,'V4-2026-10-05-orven-long-spear');assert.equal(p.element,'NONE');assert.deepEqual(p.magic,[]);assert.deepEqual(p.barriers,[]);
});
test('Updated Orven and the other five refined armors retain native verification',()=>{
  for(const c of require('../2026-10-04-armor-refinement/specs.cjs').cards){
    const dir=path.resolve(__dirname,'../../creations',c.id),proof=JSON.parse(fs.readFileSync(path.join(dir,'verification.json'),'utf8'));
    assert(proof.passed&&proof.barcode.passed);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.components.fixedDifferences,0);assert.equal(proof.artOnly.outside,0);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'card.png'))).digest('hex'),proof.hashes['card.png']);
  }
  const checks=require('./native-checks.json');assert.equal(checks.length,1);assert.equal(checks[0].key,'orven');assert.equal(checks[0].outside,0);
});
test('All other original catalogue entries remain identical; Aeren stays retired and Vessa stays available',()=>{
  const unchanged=cat=>originalCohort(cat).cards.filter(c=>c.id!==S.cards[0].id);
  assert.deepEqual(unchanged(current),unchanged(before.catalogue));
  assert(!current.cards.some(c=>c.id==='49900311'));assert(!fs.existsSync(path.resolve(__dirname,'../../creations/49900311')));
  assert(current.cards.some(c=>c.id==='49900312'));assert.equal(originalCohort(current).cards.length,before.catalogue.cards.length);
  assert.equal(new Set(current.cards.map(c=>c.id)).size,current.cards.length);
});
