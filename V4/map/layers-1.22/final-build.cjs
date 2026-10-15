'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const api=require('../layers-1.15/tooling/node_modules/ag-psd');
api.initializeCanvas(()=>{throw Error('Canvas not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
async function pixels(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {width:info.width,height:info.height,data:new Uint8ClampedArray(data)};}
const raster=image=>sharp(Buffer.from(image.data),{raw:{width:image.width,height:image.height,channels:4}});
(async()=>{
  const parent=api.readPsd(fs.readFileSync(path.join(__dirname,'../layers-1.20/kalistar-map-1.20.psd')),{useImageData:true,skipThumbnail:true});
  const base=await pixels(path.join(__dirname,'../kalistar-map-1.22-base.png'));
  assert.equal(base.width,parent.width);assert.equal(base.height,parent.height);
  const cities=parent.children.filter(layer=>layer.children),terrain=parent.children.filter(layer=>!layer.children);
  const overlays=cities.flatMap(group=>group.children);
  const preview=await raster(base).composite(await Promise.all(overlays.map(async layer=>({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top})))).png().toBuffer();
  const merged=await pixels(preview);
  parent.children=[{name:'Historique terrain 1.20 - Preserve',hidden:true,children:terrain},{name:'Terrain 1.22 - Rendu coherent',left:0,top:0,imageData:base},...cities];
  parent.imageData=merged;
  const target=path.join(__dirname,'kalistar-map-1.22.psd');fs.writeFileSync(target,api.writePsdBuffer(parent,{generateThumbnail:false}));
  const reopened=api.readPsd(fs.readFileSync(target),{useImageData:true,skipThumbnail:true});
  assert.deepEqual(reopened.imageData.data,merged.data);
  for(let i=0;i<cities.length;i++)assert.deepEqual(reopened.children[i+2],cities[i]);
  fs.writeFileSync(path.join(__dirname,'kalistar-map-1.22-preview.png'),preview);
  const report={method:'whole-map imagegen refinement; independent original city layers',pixelIdentityOutsideZone:false,cityLayersUnchanged:true,psdRoundTrip:true,nativePhotoshopTested:false,width:base.width,height:base.height};
  fs.writeFileSync(path.join(__dirname,'final-verification.json'),JSON.stringify(report,null,2)+'\n');
  const files=['../kalistar-map-1.22-base.png','kalistar-map-1.22-preview.png','kalistar-map-1.22.psd','final.prompt.txt','final-build.cjs','final-verification.json'];
  const proof={version:'1.22',parentVersion:'1.20',rejectedVersion:'1.21',generator:'built-in image_gen',generationId:'exec-93bbcb53-e56b-4a4e-8fc2-b5d2d3233111',files:files.map(file=>({file:path.relative(path.join(__dirname,'..'),path.resolve(__dirname,file)).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,file))).digest('hex')}))};
  fs.writeFileSync(path.join(__dirname,'final-provenance.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1;});
