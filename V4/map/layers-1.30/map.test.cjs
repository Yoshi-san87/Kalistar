'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=__dirname;
const proof=JSON.parse(fs.readFileSync(path.join(dir,'provenance.json'),'utf8'));
const report=JSON.parse(fs.readFileSync(path.join(dir,'verification.json'),'utf8'));
const zone=JSON.parse(fs.readFileSync(path.join(dir,'zone.json'),'utf8'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
test('all proposal sources and preserved parent files match their hashes',()=>{
  for(const item of proof.files)assert.equal(sha(path.resolve(dir,'..',item.file)),item.sha256,item.file);
  for(const item of proof.parentFiles)assert.equal(sha(path.resolve(dir,item.file)),item.sha256,item.file);
});
test('terrain really preserves every pixel outside the editable mask',async()=>{
  const before=await sharp(path.resolve(dir,zone.parentBase)).ensureAlpha().raw().toBuffer();
  const after=await sharp(path.join(dir,'../kalistar-map-1.30-base.png')).ensureAlpha().raw().toBuffer();
  const mask=await sharp(path.join(dir,'zone-mask.png')).extractChannel(0).raw().toBuffer();
  let changed=0;
  for(let y=0;y<887;y++)for(let x=0;x<1774;x++){
    const lx=x-zone.crop.left,ly=y-zone.crop.top,i=(y*1774+x)*4;
    const active=lx>=0&&ly>=0&&lx<zone.crop.width&&ly<zone.crop.height&&mask[ly*zone.crop.width+lx]>0;
    const different=[0,1,2,3].some(c=>before[i+c]!==after[i+c]);
    if(!active)assert.equal(different,false,'Outside pixel '+x+','+y);
    else if(different)changed++;
  }
  assert.equal(changed,report.changedInside);
  assert.equal(report.changedOutside,0);
  assert.equal(report.compositeChangedOutsideAllowed,0);
});
test('editable terrain mask, parent layers and all six cities survived PSD reopening',()=>{
  assert.equal(report.oldCityCount,6);
  assert(report.cityGroupsUnchanged&&report.originalLayersUnchanged);
  assert(report.editableMaskRoundTrip&&report.compositeRoundTrip&&report.independentCityAndName);
  assert.equal(report.nativePhotoshopTested,false);
});
test('WoodLand is a true alpha emblem and stays right of the heart lake',async()=>{
  const metadata=await sharp(path.join(dir,'woodland-icon.png')).metadata();
  assert(metadata.hasAlpha);
  assert(report.icon.transparent>report.icon.width*report.icon.height*.1);
  assert.equal(report.icon.visibleRed,0);
  assert.equal(zone.city.name,'WoodLand');assert.equal(zone.city.people,'Cerelf');
  assert(zone.city.x>zone.lake.centerX);
  const exported=await sharp(path.join(dir,'woodland-v2.webp')).metadata();
  assert.equal(exported.height,192);assert(exported.hasAlpha);
});
test('the ready terrain WebP is pixel-identical and contains no baked-in city',async()=>{
  const png=await sharp(path.join(dir,'../kalistar-map-1.30-base.png')).ensureAlpha().raw().toBuffer();
  const webp=await sharp(path.join(dir,'kalistar-atlas-1.30.webp')).ensureAlpha().raw().toBuffer();
  assert.deepEqual(webp,png);
});
test('approved map is registered and explicitly integrated into the runtime',()=>{
  const registry=JSON.parse(fs.readFileSync(path.join(dir,'../versions.json'),'utf8'));
  assert.equal(registry.latestVersion,'1.30');
  const entry=registry.versions.find(item=>item.version==='1.30');
  assert.equal(entry.runtimePublished,true);assert.equal(entry.authorApprovedOn,'2026-10-14');
  assert.equal(entry.sha256,sha(path.join(dir,'kalistar-map-1.30-preview.png')));
  assert.equal(report.runtimePublished,true);
  const runtime=fs.readFileSync(path.resolve(dir,'../../site/map-view.js'),'utf8');
  assert(runtime.includes('kalistar-atlas-1.30.webp'));
  assert(runtime.includes("id:'woodland'"));
});
