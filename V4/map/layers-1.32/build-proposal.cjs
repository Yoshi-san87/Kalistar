'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..');
const api=require('../layers-1.15/tooling/node_modules/ag-psd');
const dir=__dirname,zone=JSON.parse(fs.readFileSync(path.join(dir,'zone.json'),'utf8'));
const {crop,polygon,feather}=zone;
const names=new Set(['Kalistopolis','Durane','Arborium','Velane','WoodLand','Vulkar','Cryptown']);
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
api.initializeCanvas(()=>{throw Error('Canvas is not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
async function pixels(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {width:info.width,height:info.height,data:new Uint8ClampedArray(data)};}
const raster=image=>sharp(Buffer.from(image.data),{raw:{width:image.width,height:image.height,channels:4}});
function inside(x,y){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;}
function distance(x,y){let result=Infinity;for(let i=0;i<polygon.length;i++){const [ax,ay]=polygon[i],[bx,by]=polygon[(i+1)%polygon.length],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));result=Math.min(result,Math.hypot(x-ax-t*dx,y-ay-t*dy));}return result;}
async function main(){
  const baseFile=path.join(root,zone.parentBase),psdFile=path.join(root,zone.parentPsd);
  const preserve=[baseFile,psdFile,path.join(root,'V4/map/versions.json'),path.join(root,'V4/site/map-view.js'),path.join(root,'V4/site/assets/ui/kalistar-atlas-1.30.webp'),path.join(root,'V4/deploy/runtime-media.json')];
  const protectedSources=preserve.map(file=>({file:path.relative(root,file).replaceAll('\\','/'),sha256:sha(file)}));
  const base=await pixels(baseFile),before=await pixels(await raster(base).extract(crop).png().toBuffer());
  const parent=api.readPsd(fs.readFileSync(psdFile),{useImageData:true,skipThumbnail:true}),originals=structuredClone(parent.children);
  const groups=parent.children.filter(child=>names.has(child.name));assert.equal(groups.length,7);
  const generated=path.join(dir,'zone-generated.png'),meta=await sharp(generated).metadata();
  assert(Math.abs(meta.width/meta.height-crop.width/crop.height)<.02,'Generated framing must match context');
  const patch=await pixels(await sharp(generated).resize(crop.width,crop.height).png().toBuffer());
  // Match only untouched northern ocean paper; retain the intended darker central bathymetry.
  const differences=[[],[],[]];
  for(let y=22;y<54;y++)for(let x=42;x<240;x++){const i=(y*crop.width+x)*4;for(let c=0;c<3;c++)differences[c].push(before.data[i+c]-patch.data[i+c]);}
  const colorOffsets=differences.map(values=>Math.max(-10,Math.min(10,values.sort((a,b)=>a-b)[Math.floor(values.length/2)])));
  for(let i=0;i<patch.data.length;i+=4)for(let c=0;c<3;c++)patch.data[i+c]=Math.max(0,Math.min(255,patch.data[i+c]+colorOffsets[c]));
  const mask={width:crop.width,height:crop.height,data:new Uint8ClampedArray(patch.data.length)};
  const terrain={...base,data:new Uint8ClampedArray(base.data)};
  for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++){
    const t=inside(x,y)?Math.min(1,distance(x,y)/feather):0,a=Math.round(255*t*t*(3-2*t)),from=(y*crop.width+x)*4,to=((y+crop.top)*base.width+x+crop.left)*4;
    mask.data[from]=mask.data[from+1]=mask.data[from+2]=a;mask.data[from+3]=255;
    if(a)for(let c=0;c<3;c++)terrain.data[to+c]=Math.round((patch.data[from+c]*a+base.data[to+c]*(255-a))/255);
  }
  function active(x,y){const a=x-crop.left,b=y-crop.top;return a>=0&&b>=0&&a<crop.width&&b<crop.height&&mask.data[(b*crop.width+a)*4]>0;}
  function changes(before,after){let changedInside=0,changedOutside=0;for(let y=0;y<before.height;y++)for(let x=0;x<before.width;x++){const i=(y*before.width+x)*4;if([0,1,2,3].some(c=>before.data[i+c]!==after.data[i+c])){if(active(x,y))changedInside++;else changedOutside++;}}return {changedInside,changedOutside};}
  const terrainChanges=changes(base,terrain);assert.equal(terrainChanges.changedOutside,0);assert(terrainChanges.changedInside>10000);
  const overlays=[];for(const group of groups)for(const layer of group.children)overlays.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
  const rebuilt=await pixels(await raster(base).composite(overlays).png().toBuffer());assert.deepEqual(rebuilt.data,parent.imageData.data);
  const preview=await raster(terrain).composite(overlays).png().toBuffer(),finalImage=await pixels(preview);
  const fullChanges=changes(parent.imageData,finalImage);assert.equal(fullChanges.changedOutside,0);
  let northernWallChangedPixels=0;for(let y=63;y<228;y++)for(let x=199;x<460;x++){const i=(y*base.width+x)*4;if([0,1,2,3].some(c=>base.data[i+c]!==terrain.data[i+c]))northernWallChangedPixels++;}assert.equal(northernWallChangedPixels,0);
  await raster(terrain).png().toFile(path.join(dir,'kalistar-map-1.32-base.png'));
  fs.writeFileSync(path.join(dir,'kalistar-map-1.32-preview.png'),preview);
  await raster(terrain).extract(crop).png().toFile(path.join(dir,'zone-after.png'));
  await raster(terrain).extract(crop).resize({width:1100}).png().toFile(path.join(dir,'island-barrier-detail.png'));
  for(const [name,image] of [['zone-before.png',before],['zone-fitted.png',patch],['zone-mask.png',mask]])await raster(image).png().toFile(path.join(dir,name));
  const index=parent.children.findIndex(child=>names.has(child.name));
  const layer={name:'Archipel - barriere et bassin profond',left:crop.left,top:crop.top,imageData:patch,mask:{left:crop.left,top:crop.top,defaultColor:0,positionRelativeToLayer:false,imageData:mask}};
  parent.children.splice(index,0,layer);parent.imageData=finalImage;
  const psdOutput=path.join(dir,'kalistar-map-1.32.psd');fs.writeFileSync(psdOutput,api.writePsdBuffer(parent,{generateThumbnail:false}));
  const reopened=api.readPsd(fs.readFileSync(psdOutput),{useImageData:true,skipThumbnail:true});assert.deepEqual(reopened.imageData.data,finalImage.data);
  assert.deepEqual(reopened.children[index].mask.imageData.data,mask.data);
  for(let i=0;i<originals.length;i++)assert.deepEqual(reopened.children[i+(i>=index?1:0)],originals[i]);
  for(const item of protectedSources)assert.equal(sha(path.join(root,item.file)),item.sha256,item.file+' changed');
  const report={version:zone.version,parentVersion:zone.parentVersion,status:'proposal',runtimePublished:false,date:zone.date,crop,terrainChanges,fullChanges,northernWallChangedPixels,colorOffsets,cityCount:7,originalLayersUnchanged:true,cityGroupsUnchanged:true,editableMaskRoundTrip:true,compositeRoundTrip:true,nativePhotoshopTested:false,protectedSources};
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');
  const provenance={version:zone.version,parentVersion:zone.parentVersion,status:'proposal',runtimePublished:false,generator:'built-in image_gen; deterministic masked compositing; original independent city groups',generationId:zone.generationId,parentFiles:protectedSources,files:fs.readdirSync(dir).filter(file=>file!=='provenance.json').map(file=>({file,sha256:sha(path.join(dir,file))}))};
  fs.writeFileSync(path.join(dir,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
