'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(modules,'__map_140_publish__.cjs'))('sharp');
const dir=__dirname,root=path.resolve(dir,'../../..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main(){
  const proposal=JSON.parse(fs.readFileSync(path.join(dir,'provenance.json'),'utf8'));
  const backup=JSON.parse(fs.readFileSync(path.join(root,'work/qa/map-1.40/backup.json'),'utf8'));assert(backup.allHashesVerified);
  for(const file of [...proposal.files,{file:'provenance.json',sha256:sha(path.join(dir,'provenance.json'))}]){
    assert.equal(sha(path.join(dir,file.file)),file.sha256,file.file);
    const relative='V4/map/layers-1.40/'+file.file,saved=backup.files.find(entry=>entry.file===relative);assert(saved,relative);
    assert.equal(saved.sha256,file.sha256);assert.equal(sha(path.join(backup.destination,relative)),file.sha256);
  }
  const previous=JSON.parse(fs.readFileSync(path.join(dir,'../layers-1.39/published-media.json'),'utf8'));
  for(const file of previous.assets)assert.equal(sha(path.join(root,file.file)),file.sha256,file.file);
  const terrainSource='V4/map/layers-1.40/kalistar-map-1.40-base.png',terrain='V4/site/assets/ui/kalistar-atlas-1.40.webp';
  await sharp(path.join(root,terrainSource)).webp({lossless:true}).toFile(path.join(root,terrain));
  const raw=file=>sharp(file).ensureAlpha().raw().toBuffer();
  assert.deepEqual(await raw(path.join(root,terrain)),await raw(path.join(root,terrainSource)));
  const cityAssets=previous.assets.filter(file=>file.file.includes('/map/'));
  const report={version:'1.40',parentVersion:'1.39',authorApprovedOn:'2026-11-22',appRelease:'4.7.36',terrainSource,
    terrainChangedOnlyInsideMask:true,previousCityAssetsUnchanged:true,citiesBakedIntoRuntime:false,landmarkHeight:192,cityCount:8,
    collectionAlbumUnchanged:true,assets:[terrain,...cityAssets.map(file=>file.file)].map(file=>({file,sha256:sha(path.join(root,file)),bytes:fs.statSync(path.join(root,file)).size}))};
  assert.deepEqual(report.assets.slice(1),cityAssets);
  const approval={version:'1.40',authorApprovedOn:'2026-11-22',request:'parfait tu peux push cette version de la map sur le site',appRelease:'4.7.36',
    terrain:'kalistar-map-1.40-base.png',terrainSha256:sha(path.join(root,terrainSource)),preview:'kalistar-map-1.40-preview.png',previewSha256:sha(path.join(dir,'kalistar-map-1.40-preview.png')),
    psd:'kalistar-map-1.40.psd',psdSha256:sha(path.join(dir,'kalistar-map-1.40.psd')),sourceProposalProvenancePreserved:true,nativeSourcesBackedUp:true,
    backup:{destination:backup.destination,files:backup.count,bytes:backup.bytes,allHashesVerified:true}};
  fs.writeFileSync(path.join(dir,'published-media.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'publication-approved.json'),JSON.stringify(approval,null,2)+'\n');
  console.log(JSON.stringify({version:report.version,asset:terrain,sha256:report.assets[0].sha256,bytes:report.assets[0].bytes,cities:report.cityCount,nativeSourcesBackedUp:true},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
