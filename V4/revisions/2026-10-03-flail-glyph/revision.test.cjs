'use strict';
const { test } = require('node:test'), L = require('../../atelier/lib.cjs');
const { read, path, ROOT, hash, sharp, assert } = L;
const { circularDiff, nativeLayers } = require('../2026-09-27-weapon-optics/proof.cjs');
const file = n => path.join(__dirname, n);
test('every current Fléau card receives the same native glyph without profile, frame or text drift', async () => {
  const before=read(file('before.json')), proof=read(file('verification.json')), catalogue=read(path.join(ROOT,'V4/donnees/catalogue.json'));
  assert.equal(proof.passed,true);assert.equal(catalogue.cards.length,before.catalogueCount);
  assert.deepEqual(catalogue.cards.filter(c=>c.profile.weapon==='Fléau').map(c=>c.id).sort(),before.items.map(i=>i.id).sort());
  for(const item of before.items){
    const result=proof.results.find(r=>r.id===item.id);
    assert.equal(await hash(path.join(ROOT,item.profile)),before.observed[item.profile]);
    assert.equal(await hash(path.join(ROOT,item.png)),result.pngHash);assert.equal(await hash(path.join(ROOT,item.psd)),result.psdHash);
    const actual=await circularDiff(file('originals/'+item.png),path.join(ROOT,item.png));assert(actual.changed>0);assert.equal(actual.outside,0);
    assert.equal(result.roundtrip.changed,0);assert.equal(result.barcode.passed,true);assert.equal(Object.keys(result.barcode.cases).length,4);
    const native=read(file('staged/'+item.key+'/native.json'));nativeLayers(native,item.layer);
  }
});
test('only the Fléau bank changes and both future designer routes use its audited source', async () => {
  const proof=read(file('verification.json'));
  for(const name of ['manifest.json','manifest.raw.json']){
    const relative='V4/atelier/designer-assets/'+name,old=read(file('originals/'+relative)),current=read(path.join(ROOT,relative));
    for(const [weapon,bank]of Object.entries(old.weapons))if(weapon!=='Fléau')assert.deepEqual(current.weapons[weapon],bank);
    assert.equal(await hash(path.join(ROOT,'V4/atelier/designer-assets/'+current.weapons['Fléau'].file)),proof.bankHash);
  }
  const layouts=read(path.join(ROOT,'V4/template-stable/icon-layouts.json')),glyph=layouts.weapon['Fléau'];
  assert.equal(await hash(path.join(ROOT,glyph.source)),glyph.sourceHash);
  assert(read(file('bank-source.json')).contour.fullRadius<=44);
  const C=require('../../site/collaborations.js');assert.equal(C.asset('armes','04'),'assets/ui/flail-white-v1.png');assert.equal(C.asset('armes','03'),'shared/armes/03.png');
});
test('the explicit reference migration preserves every unrelated protection and the unchanged reference profiles',()=>{
  const old=read(file('originals/V4/atelier/data/references.json')),current=L.baseline(),plan=read(file('published.json'));
  const changed=new Set(plan.changes.map(c=>c.file));
  assert.equal(current.parentReferenceId,old.id);assert.deepEqual(current.cards,old.cards);
  for(const [file,expected]of Object.entries(old.protectedFiles)){
    assert(file in current.protectedFiles);if(!changed.has(file))assert.equal(current.protectedFiles[file],expected);
  }
});
