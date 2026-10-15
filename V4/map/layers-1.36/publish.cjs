'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..'),dir=__dirname;
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main(){
  const backup=JSON.parse(fs.readFileSync(path.join(root,'work/qa/map-4.6.71/backup.json'),'utf8'));
  assert(backup.allHashesVerified);
  for(const version of ['1.34','1.35','1.36']){
    const folder=path.join(dir,'../layers-'+version);
    for(const entry of JSON.parse(fs.readFileSync(path.join(folder,'provenance.json'),'utf8')).files){
      const file=path.join(folder,entry.file);assert.equal(sha(file),entry.sha256);
      const relative=path.relative(root,file).replaceAll('\\','/');
      const saved=backup.files.find(item=>item.file===relative);assert(saved,relative);
      assert.equal(saved.sha256,entry.sha256);assert.equal(sha(path.join(backup.destination,relative)),entry.sha256);
    }
  }
  const previous=JSON.parse(fs.readFileSync(path.join(dir,'../layers-1.33/published-media.json'),'utf8'));
  for(const entry of previous.assets)assert.equal(sha(path.join(root,entry.file)),entry.sha256);
  const terrain='V4/site/assets/ui/kalistar-atlas-1.36.webp';
  await sharp(path.join(dir,'kalistar-map-1.36-base.png')).webp({lossless:true}).toFile(path.join(root,terrain));
  const raw=file=>sharp(file).ensureAlpha().raw().toBuffer();
  assert.deepEqual(await raw(path.join(root,terrain)),await raw(path.join(dir,'kalistar-map-1.36-base.png')));
  const files=[terrain,...previous.assets.filter(entry=>entry.file.includes('/map/')).map(entry=>entry.file)];
  const report={version:'1.36',authorApprovedOn:'2026-10-15',appRelease:'4.6.71',
    terrainSource:'V4/map/layers-1.36/kalistar-map-1.36-base.png',terrainChangedOnlyInsideMask:true,
    previousCityAssetsUnchanged:true,citiesBakedIntoRuntime:false,landmarkHeight:192,cityCount:8,
    includedVersions:['1.34','1.35','1.36'],assets:files.map(file=>({file,sha256:sha(path.join(root,file)),bytes:fs.statSync(path.join(root,file)).size}))};
  fs.writeFileSync(path.join(dir,'published-media.json'),JSON.stringify(report,null,2)+'\n');
  const approval={version:'1.36',authorApprovedOn:'2026-10-15',request:'ok push la map',
    appRelease:'4.6.71',includedVersions:report.includedVersions,terrain:'kalistar-map-1.36-base.png',
    terrainSha256:sha(path.join(dir,'kalistar-map-1.36-base.png')),psd:'kalistar-map-1.36.psd',
    psdSha256:sha(path.join(dir,'kalistar-map-1.36.psd')),sourceProposalProvenancePreserved:true,
    nativeSourcesBackedUp:true,backup:{destination:backup.destination,files:backup.count,bytes:backup.bytes,allHashesVerified:true}};
  fs.writeFileSync(path.join(dir,'publication-approved.json'),JSON.stringify(approval,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
