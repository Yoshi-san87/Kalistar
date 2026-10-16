'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const api=require('../layers-1.15/tooling/node_modules/ag-psd');
const dir=__dirname,root=path.resolve(dir,'../../..'),zone=JSON.parse(fs.readFileSync(path.join(dir,'zone.json'),'utf8'));
const {crop}=zone,names=new Set(['Kalistopolis','Durane','Arborium','Velane','WoodLand','Vulkar','Cryptown','Thalassea']);
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const clamp=value=>Math.max(0,Math.min(1,value));
const raster=image=>sharp(Buffer.from(image.data),{raw:{width:image.width,height:image.height,channels:4}});
api.initializeCanvas(()=>{throw Error('Canvas is not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
async function pixels(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {width:info.width,height:info.height,data:new Uint8ClampedArray(data)};}
function inside(x,y,polygon){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;}
function distance(x,y,polygon){let result=Infinity;for(let i=0;i<polygon.length;i++){const [ax,ay]=polygon[i],[bx,by]=polygon[(i+1)%polygon.length],dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy));result=Math.min(result,Math.hypot(x-ax-t*dx,y-ay-t*dy));}return result;}
function contains(x,y,rect){return x>=rect.left&&y>=rect.top&&x<rect.left+rect.width&&y<rect.top+rect.height;}
function changed(a,b,i){return [0,1,2,3].some(c=>a.data[i+c]!==b.data[i+c]);}
async function main(){
  const parentBase=path.join(root,zone.parentBase),parentPsd=path.join(root,zone.parentPsd);
  const protectedSources=[parentBase,parentPsd,path.join(root,'V4/map/kalistar-map-1.0.png'),path.join(root,'V4/site/assets/ui/kalistar-atlas-1.36.webp')]
    .map(file=>({file:path.relative(root,file).replaceAll('\\','/'),sha256:sha(file)}));
  const base=await pixels(parentBase),terrain={...base,data:new Uint8ClampedArray(base.data)},before=await pixels(await raster(base).extract(crop).png().toBuffer());
  const parent=api.readPsd(fs.readFileSync(parentPsd),{useImageData:true,skipThumbnail:true}),originals=structuredClone(parent.children);
  const groups=parent.children.filter(child=>names.has(child.name));assert.equal(groups.length,8);
  const file=path.join(dir,'zone-generated.png'),metadata=await sharp(file).metadata();
  assert(Math.abs(metadata.width/metadata.height-crop.width/crop.height)<.02);
  const patch=await pixels(await sharp(file).resize(crop.width,crop.height).png().toBuffer());
  const differences=[[],[],[]],anchor=zone.colorAnchor;
  for(let y=anchor.top;y<anchor.top+anchor.height;y++)for(let x=anchor.left;x<anchor.left+anchor.width;x++){
    const i=(y*crop.width+x)*4;for(let c=0;c<3;c++)differences[c].push(before.data[i+c]-patch.data[i+c]);
  }
  const colorOffsets=differences.map(values=>Math.max(-zone.colorLimit,Math.min(zone.colorLimit,values.sort((a,b)=>a-b)[Math.floor(values.length/2)])));
  for(let i=0;i<patch.data.length;i+=4)for(let c=0;c<3;c++)patch.data[i+c]=Math.max(0,Math.min(255,patch.data[i+c]+colorOffsets[c]));
  const edits=[];
  for(const region of zone.regions){
    const mask={width:crop.width,height:crop.height,data:new Uint8ClampedArray(patch.data.length)};
    let changedPixels=0;
    for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++){
      let t=inside(x,y,region.polygon)?Math.min(1,distance(x,y,region.polygon)/zone.feather):0;
      if(inside(x,y,zone.mainlandProtection))t=0;
      else t=Math.min(t,clamp(distance(x,y,zone.mainlandProtection)/zone.mainlandFeather));
      const a=Math.round(255*t*t*(3-2*t)),from=(y*crop.width+x)*4,to=((y+crop.top)*base.width+x+crop.left)*4;
      mask.data[from]=mask.data[from+1]=mask.data[from+2]=a;mask.data[from+3]=255;
      if(a){for(let c=0;c<3;c++)terrain.data[to+c]=Math.round((patch.data[from+c]*a+terrain.data[to+c]*(255-a))/255);if(changed(base,terrain,to))changedPixels++;}
    }
    assert(changedPixels>15,region.id);edits.push({region,mask,changedPixels});
    await raster(mask).png().toFile(path.join(dir,region.id+'-mask.png'));
  }
  const active=(x,y)=>contains(x,y,crop)&&edits.some(({mask})=>mask.data[((y-crop.top)*crop.width+x-crop.left)*4]>0);
  const protectedRegions=Object.fromEntries(Object.keys(zone.protectedRegions).map(name=>[name,0]));
  let changedInside=0,changedOutside=0,mainlandChangedPixels=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++){
    const i=(y*base.width+x)*4;if(!changed(base,terrain,i))continue;
    if(active(x,y))changedInside++;else changedOutside++;
    if(contains(x,y,crop)&&inside(x-crop.left,y-crop.top,zone.mainlandProtection))mainlandChangedPixels++;
    for(const [name,rect]of Object.entries(zone.protectedRegions))if(contains(x,y,rect))protectedRegions[name]++;
  }
  assert.equal(changedOutside,0);assert.equal(mainlandChangedPixels,0);for(const count of Object.values(protectedRegions))assert.equal(count,0);
  const overlays=[];
  for(const group of groups)for(const layer of group.children)overlays.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
  const rebuilt=await pixels(await raster(base).composite(overlays).png().toBuffer());assert.deepEqual(rebuilt.data,parent.imageData.data);
  const preview=await raster(terrain).composite(overlays).png().toBuffer(),finalImage=await pixels(preview);
  let compositeChangedOutside=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++)if(!active(x,y)&&changed(parent.imageData,finalImage,(y*base.width+x)*4))compositeChangedOutside++;
  assert.equal(compositeChangedOutside,0);
  await raster(terrain).png().toFile(path.join(dir,'kalistar-map-1.39-base.png'));fs.writeFileSync(path.join(dir,'kalistar-map-1.39-preview.png'),preview);
  await raster(finalImage).extract(crop).resize({width:825}).png().toFile(path.join(dir,'islands-detail.png'));
  await raster(finalImage).extract({left:38,top:235,width:337,height:310}).resize({width:1180}).png().toFile(path.join(dir,'vulkar-detail.png'));
  await raster(terrain).extract(crop).png().toFile(path.join(dir,'zone-after.png'));
  for(const [name,image]of [['zone-before.png',before],['zone-fitted.png',patch]])await raster(image).png().toFile(path.join(dir,name));
  const index=parent.children.findIndex(child=>names.has(child.name));
  parent.children.splice(index,0,...edits.map(({region,mask})=>({name:region.name,left:crop.left,top:crop.top,imageData:patch,mask:{left:crop.left,top:crop.top,defaultColor:0,positionRelativeToLayer:false,imageData:mask}})));
  parent.imageData=finalImage;
  const psdFile=path.join(dir,'kalistar-map-1.39.psd');fs.writeFileSync(psdFile,api.writePsdBuffer(parent,{generateThumbnail:false}));
  const reopened=api.readPsd(fs.readFileSync(psdFile),{useImageData:true,skipThumbnail:true});assert.deepEqual(reopened.imageData.data,finalImage.data);
  for(let i=0;i<edits.length;i++)assert.deepEqual(reopened.children[index+i].mask.imageData.data,edits[i].mask.data);
  for(let i=0;i<originals.length;i++)assert.deepEqual(reopened.children[i+(i>=index?edits.length:0)],originals[i]);
  for(const source of protectedSources)assert.equal(sha(path.join(root,source.file)),source.sha256);
  const report={version:zone.version,parentVersion:zone.parentVersion,status:zone.status,runtimePublished:false,width:base.width,height:base.height,
    changedInside,changedOutside,compositeChangedOutside,mainlandChangedPixels,protectedRegions,colorOffsets,islandCount:edits.length,regions:edits.map(({region,changedPixels})=>({id:region.id,changedPixels})),
    cityCount:8,cityGroupsUnchanged:true,originalLayersUnchanged:true,editableMasksRoundTrip:true,compositeRoundTrip:true,nativePhotoshopTested:false,protectedSources};
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'provenance.json'),JSON.stringify({version:zone.version,parentVersion:zone.parentVersion,status:zone.status,runtimePublished:false,
    generator:'built-in image_gen; deterministic six-island masked compositing',generationId:zone.generationId,parentFiles:protectedSources,
    files:fs.readdirSync(dir).filter(file=>file!=='provenance.json').map(file=>({file,sha256:sha(path.join(dir,file))}))},null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
