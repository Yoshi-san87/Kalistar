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
function distance(x,y,polygon){
  let result=Infinity;
  for(let i=0;i<polygon.length;i++){
    const [ax,ay]=polygon[i],[bx,by]=polygon[(i+1)%polygon.length],dx=bx-ax,dy=by-ay;
    const t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy));
    result=Math.min(result,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }
  return result;
}
function contains(x,y,rect){return x>=rect.left&&y>=rect.top&&x<rect.left+rect.width&&y<rect.top+rect.height;}
function changed(a,b,i){return [0,1,2,3].some(c=>a.data[i+c]!==b.data[i+c]);}

// Distance to the union of approved scar/crater pixels adds a soft outer guard
// without weakening the exact protection of any previously edited pixel.
function guardDistances(bits,width,height){
  const d=Float32Array.from(bits,value=>value?0:1e9),diag=Math.SQRT2;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x;
    if(x)d[i]=Math.min(d[i],d[i-1]+1);
    if(y){d[i]=Math.min(d[i],d[i-width]+1);if(x)d[i]=Math.min(d[i],d[i-width-1]+diag);if(x+1<width)d[i]=Math.min(d[i],d[i-width+1]+diag);}
  }
  for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
    const i=y*width+x;
    if(x+1<width)d[i]=Math.min(d[i],d[i+1]+1);
    if(y+1<height){d[i]=Math.min(d[i],d[i+width]+1);if(x)d[i]=Math.min(d[i],d[i+width-1]+diag);if(x+1<width)d[i]=Math.min(d[i],d[i+width+1]+diag);}
  }
  return d;
}
async function main(){
  const parentBase=path.join(root,zone.parentBase),parentPsd=path.join(root,zone.parentPsd);
  const protectedSources=[parentBase,parentPsd,path.join(root,'V4/map/kalistar-map-1.0.png'),path.join(root,'V4/site/assets/ui/kalistar-atlas-1.36.webp'),...zone.sourceProtectionMasks.map(item=>path.join(root,item.file))]
    .map(file=>({file:path.relative(root,file).replaceAll('\\','/'),sha256:sha(file)}));
  const base=await pixels(parentBase),before=await pixels(await raster(base).extract(crop).png().toBuffer());
  const parent=api.readPsd(fs.readFileSync(parentPsd),{useImageData:true,skipThumbnail:true}),originals=structuredClone(parent.children);
  const groups=parent.children.filter(child=>names.has(child.name));assert.equal(groups.length,8);
  const metadata=await sharp(path.join(dir,'zone-generated.png')).metadata();
  assert(Math.abs(metadata.width/metadata.height-crop.width/crop.height)<.02);
  const patch=await pixels(await sharp(path.join(dir,'zone-generated.png')).resize(crop.width,crop.height).png().toBuffer());
  const differences=[[],[],[]],anchor=zone.colorAnchor;
  for(let y=anchor.top;y<anchor.top+anchor.height;y++)for(let x=anchor.left;x<anchor.left+anchor.width;x++){
    const i=(y*crop.width+x)*4;for(let c=0;c<3;c++)differences[c].push(before.data[i+c]-patch.data[i+c]);
  }
  const colorOffsets=differences.map(values=>Math.max(-zone.colorLimit,Math.min(zone.colorLimit,values.sort((a,b)=>a-b)[Math.floor(values.length/2)])));
  for(let i=0;i<patch.data.length;i+=4)for(let c=0;c<3;c++)patch.data[i+c]=Math.max(0,Math.min(255,patch.data[i+c]+colorOffsets[c]));
  const guards=[];
  for(const source of zone.sourceProtectionMasks)guards.push({...source,data:await sharp(path.join(root,source.file)).extractChannel(0).raw().toBuffer()});
  function guarded(x,y,guard){return contains(x,y,guard.crop)&&guard.data[(y-guard.crop.top)*guard.crop.width+x-guard.crop.left]>0;}
  const guardBits=new Uint8Array(crop.width*crop.height);
  for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++)if(guards.some(guard=>guarded(x+crop.left,y+crop.top,guard)))guardBits[y*crop.width+x]=1;
  const guardDistance=guardDistances(guardBits,crop.width,crop.height);
  const mask={width:crop.width,height:crop.height,data:new Uint8ClampedArray(patch.data.length)},terrain={...base,data:new Uint8ClampedArray(base.data)};
  for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++){
    let t=inside(x,y,zone.polygon)?Math.min(1,distance(x,y,zone.polygon)/zone.feather):0;
    t=Math.min(t,clamp(guardDistance[y*crop.width+x]/zone.sourceProtectionFeather));
    if(inside(x,y,zone.forestProtection))t=0;
    else t=Math.min(t,clamp(distance(x,y,zone.forestProtection)/zone.forestFeather));
    for(const rect of Object.values(zone.protectedRegions)){
      const gx=x+crop.left,gy=y+crop.top;
      const dx=Math.max(rect.left-gx,0,gx-(rect.left+rect.width-1)),dy=Math.max(rect.top-gy,0,gy-(rect.top+rect.height-1));
      t=Math.min(t,clamp(Math.hypot(dx,dy)/zone.feather));
    }
    const water=zone.waterFade;
    if(x>water.left&&y>water.top)t*=1-clamp((y-water.top)/water.featherTop)*(1-clamp((water.right-x)/(water.right-water.left)));
    const a=Math.round(255*t*t*(3-2*t)),from=(y*crop.width+x)*4,to=((y+crop.top)*base.width+x+crop.left)*4;
    mask.data[from]=mask.data[from+1]=mask.data[from+2]=a;mask.data[from+3]=255;
    if(a)for(let c=0;c<3;c++)terrain.data[to+c]=Math.round((patch.data[from+c]*a+base.data[to+c]*(255-a))/255);
  }
  const active=(x,y)=>contains(x,y,crop)&&mask.data[((y-crop.top)*crop.width+x-crop.left)*4]>0;
  const protectedRegions=Object.fromEntries(Object.keys(zone.protectedRegions).map(name=>[name,0]));
  const sourceProtectionChanges=Object.fromEntries(guards.map(guard=>[guard.file,0]));
  let changedInside=0,changedOutside=0,forestPolygonChangedPixels=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++){
    const i=(y*base.width+x)*4;if(!changed(base,terrain,i))continue;
    if(active(x,y))changedInside++;else changedOutside++;
    for(const [name,rect]of Object.entries(zone.protectedRegions))if(contains(x,y,rect))protectedRegions[name]++;
    for(const guard of guards)if(guarded(x,y,guard))sourceProtectionChanges[guard.file]++;
    if(inside(x-crop.left,y-crop.top,zone.forestProtection))forestPolygonChangedPixels++;
  }
  assert(changedInside>10000);assert.equal(changedOutside,0);assert.equal(forestPolygonChangedPixels,0);
  for(const count of [...Object.values(protectedRegions),...Object.values(sourceProtectionChanges)])assert.equal(count,0);
  const overlays=[];
  for(const group of groups)for(const layer of group.children)overlays.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
  const rebuilt=await pixels(await raster(base).composite(overlays).png().toBuffer());assert.deepEqual(rebuilt.data,parent.imageData.data);
  const preview=await raster(terrain).composite(overlays).png().toBuffer(),finalImage=await pixels(preview);
  let compositeChangedOutside=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++)if(!active(x,y)&&changed(parent.imageData,finalImage,(y*base.width+x)*4))compositeChangedOutside++;
  assert.equal(compositeChangedOutside,0);
  await raster(terrain).png().toFile(path.join(dir,'kalistar-map-1.37-base.png'));
  fs.writeFileSync(path.join(dir,'kalistar-map-1.37-preview.png'),preview);
  await raster(finalImage).extract(crop).resize({width:1180}).png().toFile(path.join(dir,'vulkar-detail.png'));
  await raster(terrain).extract(crop).png().toFile(path.join(dir,'zone-after.png'));
  for(const [name,image]of [['zone-before.png',before],['zone-fitted.png',patch],['zone-mask.png',mask]])await raster(image).png().toFile(path.join(dir,name));
  const index=parent.children.findIndex(child=>names.has(child.name));
  parent.children.splice(index,0,{name:zone.layerName,left:crop.left,top:crop.top,imageData:patch,mask:{left:crop.left,top:crop.top,defaultColor:0,positionRelativeToLayer:false,imageData:mask}});
  parent.imageData=finalImage;
  const psdFile=path.join(dir,'kalistar-map-1.37.psd');fs.writeFileSync(psdFile,api.writePsdBuffer(parent,{generateThumbnail:false}));
  const reopened=api.readPsd(fs.readFileSync(psdFile),{useImageData:true,skipThumbnail:true});
  assert.deepEqual(reopened.imageData.data,finalImage.data);assert.deepEqual(reopened.children[index].mask.imageData.data,mask.data);
  for(let i=0;i<originals.length;i++)assert.deepEqual(reopened.children[i+(i>=index?1:0)],originals[i]);
  for(const source of protectedSources)assert.equal(sha(path.join(root,source.file)),source.sha256);
  const report={version:zone.version,parentVersion:zone.parentVersion,status:'proposal',runtimePublished:false,width:base.width,height:base.height,
    changedInside,changedOutside,compositeChangedOutside,forestPolygonChangedPixels,protectedRegions,sourceProtectionChanges,colorOffsets,
    cityCount:8,cityGroupsUnchanged:true,originalLayersUnchanged:true,editableMaskRoundTrip:true,compositeRoundTrip:true,nativePhotoshopTested:false,protectedSources};
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'provenance.json'),JSON.stringify({version:zone.version,parentVersion:zone.parentVersion,status:'proposal',runtimePublished:false,
    generator:'built-in image_gen; deterministic masked terrain compositing',generationId:zone.generationId,parentFiles:protectedSources,
    files:fs.readdirSync(dir).filter(file=>file!=='provenance.json').map(file=>({file,sha256:sha(path.join(dir,file))}))},null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
