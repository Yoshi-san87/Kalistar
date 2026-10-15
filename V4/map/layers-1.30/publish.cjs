'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const zone=JSON.parse(fs.readFileSync(path.join(__dirname,'zone.json'),'utf8'));
assert(zone.runtimePublished&&zone.authorApprovedOn,'Runtime publication requires author approval');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const previous=JSON.parse(fs.readFileSync(path.join(__dirname,'../layers-1.29/published-media.json'),'utf8'));
for(const item of previous.assets)assert.equal(sha(path.join(root,item.file)),item.sha256,item.file);
for(const [source,destination] of [
  ['kalistar-atlas-1.30.webp','V4/site/assets/ui/kalistar-atlas-1.30.webp'],
  ['woodland-v1.webp','V4/site/assets/map/woodland-v1.webp'],
  ['woodland-v2.webp','V4/site/assets/map/woodland-v2.webp']
])fs.copyFileSync(path.join(__dirname,source),path.join(root,destination));
const files=[
  'V4/site/assets/ui/kalistar-atlas-1.30.webp',
  ...previous.assets.filter(item=>item.file.includes('/map/')).map(item=>item.file),
  'V4/site/assets/map/woodland-v1.webp','V4/site/assets/map/woodland-v2.webp'
];
const report={version:'1.30',terrainSource:'V4/map/kalistar-map-1.30-base.png',terrainChangedOnlyInsideMask:true,previousCityAssetsUnchanged:true,citiesBakedIntoRuntime:false,landmarkHeight:192,cityCount:7,assets:files.map(file=>({file,sha256:sha(path.join(root,file)),bytes:fs.statSync(path.join(root,file)).size}))};
fs.writeFileSync(path.join(__dirname,'published-media.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
