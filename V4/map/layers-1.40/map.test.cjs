'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(modules,'__map140_test__.cjs'))('sharp');
const dir=__dirname,root=path.resolve(dir,'../../..'),json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const raw=file=>sharp(file).ensureAlpha().raw().toBuffer();
test('approved island proposal retains its exact generated source, prompt and native proofs',()=>{
  const proof=json(path.join(dir,'provenance.json'));
  for(const file of proof.files)assert.equal(sha(path.join(dir,file.file)),file.sha256,file.file);
  for(const source of proof.parentFiles){
    const snapshots={'V4/map/versions.json':'previous-versions.json','V4/site/site-config.js':'previous-site-config.js'};
    assert.equal(sha(snapshots[source.file]?path.join(dir,snapshots[source.file]):path.join(root,source.file)),source.sha256,source.file);
  }
  const approval=json(path.join(dir,'publication-approved.json'));assert.equal(approval.request,'parfait tu peux push cette version de la map sur le site');
  assert(approval.nativeSourcesBackedUp&&approval.backup.allHashesVerified&&approval.sourceProposalProvenancePreserved);
  for(const [file,key]of [[approval.terrain,'terrainSha256'],[approval.preview,'previewSha256'],[approval.psd,'psdSha256']])assert.equal(sha(path.join(dir,file)),approval[key]);
});
test('map 1.40 changes exactly 8237 pixels inside its island mask and no pixels elsewhere',async()=>{
  const zone=json(path.join(dir,'zone.json')),before=await raw(path.join(root,zone.parentBase)),after=await raw(path.join(dir,'kalistar-map-1.40-base.png'));
  const mask=await sharp(path.join(dir,'zone-mask.png')).extractChannel(0).raw().toBuffer();let count=0;
  for(let y=0;y<887;y++)for(let x=0;x<1774;x++){
    const i=(y*1774+x)*4;if(![0,1,2,3].some(c=>before[i+c]!==after[i+c]))continue;
    const lx=x-zone.crop.left,ly=y-zone.crop.top;assert(lx>=0&&ly>=0&&lx<zone.crop.width&&ly<zone.crop.height&&mask[ly*zone.crop.width+lx]>0,'Changed pixel outside island mask');
    for(const region of Object.values(zone.protectedRegions))assert(!(x>=region.left&&x<region.left+region.width&&y>=region.top&&y<region.top+region.height),'Protected landmark changed');count++;
  }
  assert.equal(count,8237);const report=json(path.join(dir,'verification.json'));assert.equal(report.changedInside,count);assert.equal(report.changedOutside,0);assert.equal(report.compositeChangedOutside,0);
});
test('the editable PSD preserves every prior layer and all eight independent cities',async()=>{
  const api=require('../layers-1.15/tooling/node_modules/ag-psd');
  api.initializeCanvas(()=>{throw Error('Canvas is not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
  const read=version=>api.readPsd(fs.readFileSync(path.join(dir,'../layers-'+version+'/kalistar-map-'+version+'.psd')),{useImageData:true,skipThumbnail:true});
  const before=read('1.39'),after=read('1.40'),name='Archipel et petits ponts - acces nord - 1.40';
  assert.equal(after.children.length,before.children.length+1);assert.deepEqual(after.children.filter(layer=>layer.name!==name),before.children);
  for(const city of ['Kalistopolis','Durane','Arborium','Velane','WoodLand','Vulkar','Cryptown','Thalassea'])assert.deepEqual(after.children.find(layer=>layer.name===city),before.children.find(layer=>layer.name===city));
  assert.deepEqual(Buffer.from(after.imageData.data),await raw(path.join(dir,'kalistar-map-1.40-preview.png')));
  assert.deepEqual(Buffer.from(after.children.find(layer=>layer.name===name).mask.imageData.data),await raw(path.join(dir,'zone-mask.png')));
});
test('current map is lossless, city assets are unchanged and publication adds only its single media',async()=>{
  const proof=json(path.join(dir,'published-media.json')),old=json(path.join(dir,'../layers-1.39/published-media.json'));
  assert.deepEqual(await raw(path.join(root,proof.assets[0].file)),await raw(path.join(root,proof.terrainSource)));
  for(const file of proof.assets)assert.equal(sha(path.join(root,file.file)),file.sha256,file.file);
  assert.deepEqual(proof.assets.slice(1),old.assets.slice(1));assert.equal(proof.cityCount,8);assert(!proof.citiesBakedIntoRuntime&&proof.collectionAlbumUnchanged);
  const versions=json(path.join(root,'V4/map/versions.json'));assert.equal(versions.latestVersion,'1.40');
  const current=versions.versions.find(v=>v.version===versions.latestVersion);assert.equal(current.status,'approved');assert.equal(current.publishedAsset,'../site/assets/ui/kalistar-atlas-1.40.webp');
  const delta=json(path.join(dir,'media-delta.json'));assert.deepEqual(delta.changed,[]);assert.deepEqual(delta.removed,[]);assert.equal(delta.added.length,1);assert.equal(delta.added[0].source,proof.assets[0].file);assert.equal(delta.added[0].sha256,proof.assets[0].sha256);
  const media=json(path.join(root,'V4/deploy/runtime-media.json'));assert.deepEqual(media.files.find(file=>file.source===proof.assets[0].file),delta.added[0]);
});
