'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..'),dir=__dirname;
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
test('approved scar, crater, dam and fog preserve the original generation provenance',()=>{
  for(const version of ['1.34','1.35','1.36']){
    const folder=path.join(dir,'../layers-'+version),proof=json(path.join(folder,'provenance.json'));
    for(const entry of proof.files)assert.equal(sha(path.join(folder,entry.file)),entry.sha256,version+'/'+entry.file);
    const report=json(path.join(folder,'verification.json'));
    assert(report.originalLayersUnchanged&&report.cityGroupsUnchanged&&report.compositeRoundTrip);
    assert.equal(report.changedOutside,0);assert.equal(report.compositeChangedOutside,0);
  }
});
test('all three terrain revisions preserve exact pixels outside their local masks',async()=>{
  for(const version of ['1.34','1.35','1.36']){
    const folder=path.join(dir,'../layers-'+version),zone=json(path.join(folder,'zone.json'));
    const before=await sharp(path.join(root,zone.parentBase)).ensureAlpha().raw().toBuffer();
    const after=await sharp(path.join(folder,'kalistar-map-'+version+'-base.png')).ensureAlpha().raw().toBuffer();
    const edits=zone.edits||[{id:'zone',crop:zone.crop}],masks=[];
    for(const edit of edits)masks.push(await sharp(path.join(folder,edit.id+'-mask.png')).extractChannel(0).raw().toBuffer());
    let changed=0;
    for(let y=0;y<887;y++)for(let x=0;x<1774;x++){
      const i=(y*1774+x)*4;
      if(![0,1,2,3].some(c=>before[i+c]!==after[i+c]))continue;
      assert(edits.some((edit,n)=>{
        const lx=x-edit.crop.left,ly=y-edit.crop.top;
        return lx>=0&&ly>=0&&lx<edit.crop.width&&ly<edit.crop.height&&masks[n][ly*edit.crop.width+lx]>0;
      }),'Outside '+version+' mask at '+x+','+y);changed++;
    }
    assert(changed>5000);
  }
});
test('eight independent native city groups remain byte-identical and Durane stays on its fixed anchor',()=>{
  const api=require('../layers-1.15/tooling/node_modules/ag-psd');
  api.initializeCanvas(()=>{throw Error('Canvas is not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
  const read=version=>api.readPsd(fs.readFileSync(path.join(dir,'../layers-'+version+'/kalistar-map-'+version+'.psd')),{useImageData:true,skipThumbnail:true});
  const old=read('1.33'),current=read('1.36');
  for(const name of ['Kalistopolis','Durane','Arborium','Velane','WoodLand','Vulkar','Cryptown','Thalassea']){
    assert.deepEqual(current.children.find(layer=>layer.name===name),old.children.find(layer=>layer.name===name));
  }
  const anchor=json(path.join(dir,'zone.json')).edits.find(edit=>edit.id==='crater').duraneAnchor;
  assert.deepEqual([anchor.globalX,anchor.globalY],[449,393]);assert(anchor.cityPositionUnchanged);
  const proof=json(path.join(dir,'verification.json'));assert(proof.atmosphereIndependent&&proof.editableMasksRoundTrip);
  for(const count of [proof.abyssChangedPixels,proof.fogNeighborChangedPixels,proof.navigationHubChangedPixels,proof.geometryFogRegionChanges,...Object.values(proof.protectedRegions)])assert.equal(count,0);
});
test('published 1.36 terrain is lossless and all city assets are unchanged',async()=>{
  const proof=json(path.join(dir,'published-media.json')),approval=json(path.join(dir,'publication-approved.json'));
  assert.equal(approval.request,'ok push la map');assert(approval.nativeSourcesBackedUp);
  assert.equal(approval.terrainSha256,sha(path.join(dir,'kalistar-map-1.36-base.png')));
  assert.equal(approval.psdSha256,sha(path.join(dir,'kalistar-map-1.36.psd')));
  const raw=file=>sharp(file).ensureAlpha().raw().toBuffer();
  assert.deepEqual(await raw(path.join(root,proof.assets[0].file)),await raw(path.join(root,proof.terrainSource)));
  for(const entry of proof.assets)assert.equal(sha(path.join(root,entry.file)),entry.sha256);
  assert.deepEqual(proof.assets.slice(1),json(path.join(dir,'../layers-1.33/published-media.json')).assets.slice(1));
  assert.equal(json(path.join(root,'V4/map/versions.json')).latestVersion,'1.36');
});
