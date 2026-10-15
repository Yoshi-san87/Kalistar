'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..'),dir=__dirname;
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
test('wall and Thalassea selected sources retain their exact provenance',()=>{
  for(const version of ['1.31','1.32','1.33']){
    const folder=path.join(dir,'../layers-'+version),proof=json(path.join(folder,'provenance.json'));
    for(const entry of proof.files)assert.equal(sha(path.join(folder,entry.file)),entry.sha256,version+'/'+entry.file);
    const report=json(path.join(folder,'verification.json'));assert(report.originalLayersUnchanged&&report.cityGroupsUnchanged&&report[version==='1.31'?'editableMasksRoundTrip':'editableMaskRoundTrip']&&report.compositeRoundTrip);
  }
});
test('each local terrain patch preserves all pixels outside its editable mask',async()=>{
  for(const version of ['1.31','1.32','1.33']){
    const folder=path.join(dir,'../layers-'+version),zone=json(path.join(folder,'zone.json'));
    const parent=version==='1.31'?'V4/map/kalistar-map-1.30-base.png':zone.parentBase;
    const before=await sharp(path.join(root,parent)).ensureAlpha().raw().toBuffer();
    const after=await sharp(path.join(folder,'kalistar-map-'+version+'-base.png')).ensureAlpha().raw().toBuffer();
    const masks=[];for(const file of version==='1.31'?['wall-mask.png','land-mask.png']:['zone-mask.png'])masks.push(await sharp(path.join(folder,file)).extractChannel(0).raw().toBuffer());
    let count=0;for(let y=0;y<887;y++)for(let x=0;x<1774;x++){
      const lx=x-zone.crop.left,ly=y-zone.crop.top,i=(y*1774+x)*4;
      const active=lx>=0&&ly>=0&&lx<zone.crop.width&&ly<zone.crop.height&&masks.some(mask=>mask[ly*zone.crop.width+lx]>0);
      const changed=[0,1,2,3].some(c=>before[i+c]!==after[i+c]);
      if(!active)assert.equal(changed,false,'Outside '+version+' mask at '+x+','+y);else if(changed)count++;
    }
    assert(count>10000);
  }
});
test('Thalassea remains a true alpha emblem and native editable city group',async()=>{
  const icon=await sharp(path.join(dir,'thalassea-icon.png')).metadata();assert(icon.hasAlpha);
  const report=json(path.join(dir,'verification.json'));assert.equal(report.icon.visibleRed,0);assert.equal(report.oldCityCount,7);assert.equal(report.cityCount,8);assert(report.independentCityAndName);
  const api=require('../layers-1.15/tooling/node_modules/ag-psd');
  api.initializeCanvas(()=>{throw Error('Canvas is not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
  const psd=api.readPsd(fs.readFileSync(path.join(dir,'kalistar-map-1.33.psd')),{useImageData:true,skipThumbnail:true});
  const city=psd.children.find(layer=>layer.name==='Thalassea');assert.equal(city.children.length,4);assert.equal(city.children.at(-1).text.text,'Thalassea');
});
test('approved runtime terrain is lossless and excludes the pending crater proposal',async()=>{
  const proof=json(path.join(dir,'published-media.json'));assert.equal(proof.version,'1.33');assert.equal(proof.excludedPendingVersion,'1.34');assert.equal(proof.authorApprovedOn,'2026-10-15');
  const png=await sharp(path.join(dir,'kalistar-map-1.33-base.png')).ensureAlpha().raw().toBuffer();
  const webp=await sharp(path.join(root,proof.assets[0].file)).ensureAlpha().raw().toBuffer();assert.deepEqual(webp,png);
  for(const entry of proof.assets)assert.equal(sha(path.join(root,entry.file)),entry.sha256);
  assert(proof.previousCityAssetsUnchanged&&!proof.citiesBakedIntoRuntime);
});
test('Thalassea is additive and all seven original landmark positions are fixed',()=>{
  const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'V4/site/map-view.js'),'utf8'),sandbox);
  const cities=JSON.parse(JSON.stringify(sandbox.window.KalistarMap.cities));assert.equal(cities.length,8);assert.equal(new Set(cities.map(c=>c.id)).size,8);
  const expected={kalistopolis:[881,403,62],durane:[449,355,76],arborium:[391,531,60],velane:[292,475,60],woodland:[529,490,44],vulkar:[181,330,56],cryptown:[108,627,42],thalassea:[897,717,50]};
  for(const [id,values]of Object.entries(expected)){const c=cities.find(c=>c.id===id);assert.deepEqual([c.x,c.y,c.symbolSize],values);}
  const city=cities.find(c=>c.id==='thalassea');assert.equal(city.name,'Thalassea');assert(city.text.includes('sous-marine'));
});
