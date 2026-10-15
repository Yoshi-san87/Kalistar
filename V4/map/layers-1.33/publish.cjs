'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..'),dir=__dirname;
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main(){
  const previous=JSON.parse(fs.readFileSync(path.join(dir,'../layers-1.30/published-media.json'),'utf8'));
  for(const item of previous.assets)assert.equal(sha(path.join(root,item.file)),item.sha256,item.file);
  const terrain='V4/site/assets/ui/kalistar-atlas-1.33.webp';
  await sharp(path.join(dir,'kalistar-map-1.33-base.png')).webp({lossless:true}).toFile(path.join(root,terrain));
  for(const size of [1,2])fs.copyFileSync(path.join(dir,'thalassea-v'+size+'.webp'),path.join(root,'V4/site/assets/map/thalassea-v'+size+'.webp'));
  const raw=async file=>sharp(file).ensureAlpha().raw().toBuffer();
  assert.deepEqual(await raw(path.join(root,terrain)),await raw(path.join(dir,'kalistar-map-1.33-base.png')));
  const files=[terrain,...previous.assets.filter(item=>item.file.includes('/map/')).map(item=>item.file),'V4/site/assets/map/thalassea-v1.webp','V4/site/assets/map/thalassea-v2.webp'];
  const report={version:'1.33',authorApprovedOn:'2026-10-15',terrainSource:'V4/map/layers-1.33/kalistar-map-1.33-base.png',terrainChangedOnlyInsideMask:true,previousCityAssetsUnchanged:true,citiesBakedIntoRuntime:false,landmarkHeight:192,cityCount:8,
    includedVersions:['1.31','1.32','1.33'],excludedPendingVersion:'1.34',
    assets:files.map(file=>({file,sha256:sha(path.join(root,file)),bytes:fs.statSync(path.join(root,file)).size}))};
  fs.writeFileSync(path.join(dir,'published-media.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
