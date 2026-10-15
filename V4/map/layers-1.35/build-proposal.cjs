'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const api=require('../layers-1.15/tooling/node_modules/ag-psd');
const dir=__dirname,root=path.resolve(dir,'../../..'),zone=JSON.parse(fs.readFileSync(path.join(dir,'zone.json'),'utf8'));
const {crop,polygon,feather}=zone,names=new Set(['Kalistopolis','Durane','Arborium','Velane','WoodLand','Vulkar','Cryptown','Thalassea']);
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
api.initializeCanvas(()=>{throw Error('Canvas is not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
async function pixels(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {width:info.width,height:info.height,data:new Uint8ClampedArray(data)};}
const raster=image=>sharp(Buffer.from(image.data),{raw:{width:image.width,height:image.height,channels:4}});
function inside(x,y){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;}
function distance(x,y){let result=Infinity;for(let i=0;i<polygon.length;i++){const [ax,ay]=polygon[i],[bx,by]=polygon[(i+1)%polygon.length],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));result=Math.min(result,Math.hypot(x-ax-t*dx,y-ay-t*dy));}return result;}
async function main(){
  const baseFile=path.join(root,zone.parentBase),psdFile=path.join(root,zone.parentPsd);
  const protectedSources=[baseFile,psdFile].map(file=>({file:path.relative(root,file).replaceAll('\\','/'),sha256:sha(file)}));
  const base=await pixels(baseFile),before=await pixels(await raster(base).extract(crop).png().toBuffer());
  const parent=api.readPsd(fs.readFileSync(psdFile),{useImageData:true,skipThumbnail:true}),originals=structuredClone(parent.children);
  const groups=parent.children.filter(child=>names.has(child.name));assert.equal(groups.length,8);
  const generated=path.join(dir,'zone-generated.png'),meta=await sharp(generated).metadata();
  assert(Math.abs(meta.width/meta.height-crop.width/crop.height)<.02);
  const patch=await pixels(await sharp(generated).resize(crop.width,crop.height).png().toBuffer());
  const differences=[[],[],[]];
  for(let y=8;y<30;y++)for(let x=175;x<235;x++){const i=(y*crop.width+x)*4;for(let c=0;c<3;c++)differences[c].push(before.data[i+c]-patch.data[i+c]);}
  const colorOffsets=differences.map(values=>Math.max(-10,Math.min(10,values.sort((a,b)=>a-b)[Math.floor(values.length/2)])));
  for(let i=0;i<patch.data.length;i+=4)for(let c=0;c<3;c++)patch.data[i+c]=Math.max(0,Math.min(255,patch.data[i+c]+colorOffsets[c]));
  const mask={width:crop.width,height:crop.height,data:new Uint8ClampedArray(patch.data.length)},terrain={...base,data:new Uint8ClampedArray(base.data)};
  const basin=zone.protectBasin,volcano=zone.protectVolcano,opening=zone.basinOpening;
  function protectedAt(x,y){return ((x-basin.x)/basin.rx)**2+((y-basin.y)/basin.ry)**2<=1||x<=volcano.right&&y>=volcano.top;}
  for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++){
    const rimDistance=(Math.hypot((x-basin.x)/basin.rx,(y-basin.y)/basin.ry)-1)*Math.min(basin.rx,basin.ry);
    const openingDistance=(1-Math.hypot((x-opening.x)/opening.rx,(y-opening.y)/opening.ry))*Math.min(opening.rx,opening.ry);
    const trailT=inside(x,y)&&!protectedAt(x,y)?Math.min(1,distance(x,y)/feather,Math.max(0,rimDistance/feather)):0;
    const coreDistance=(Math.hypot((x-basin.x)/18,(y-basin.y)/16)-1)*16;
    const t=Math.max(trailT,Math.max(0,Math.min(1,openingDistance/feather)))*Math.max(0,Math.min(1,coreDistance/3));
    const a=Math.round(255*t*t*(3-2*t)),from=(y*crop.width+x)*4,to=((y+crop.top)*base.width+x+crop.left)*4;
    mask.data[from]=mask.data[from+1]=mask.data[from+2]=a;mask.data[from+3]=255;
    if(a)for(let c=0;c<3;c++)terrain.data[to+c]=Math.round((patch.data[from+c]*a+base.data[to+c]*(255-a))/255);
  }
  const changed=(a,b,i)=>[0,1,2,3].some(c=>a.data[i+c]!==b.data[i+c]);
  function active(x,y){const a=x-crop.left,b=y-crop.top;return a>=0&&b>=0&&a<crop.width&&b<crop.height&&mask.data[(b*crop.width+a)*4]>0;}
  let changedInside=0,changedOutside=0,basinChangedPixels=0,basinCoreChangedPixels=0,northernWallChangedPixels=0,thalasseaRegionChangedPixels=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++){
    const i=(y*base.width+x)*4;if(!changed(base,terrain,i))continue;
    if(active(x,y))changedInside++;else changedOutside++;
    if(((x-crop.left-basin.x)/basin.rx)**2+((y-crop.top-basin.y)/basin.ry)**2<=1)basinChangedPixels++;
    if(((x-crop.left-basin.x)/18)**2+((y-crop.top-basin.y)/16)**2<=1)basinCoreChangedPixels++;
    if(x>=199&&x<460&&y>=63&&y<163)northernWallChangedPixels++;
    if(x>=754&&x<1035&&y>=571&&y<837)thalasseaRegionChangedPixels++;
  }
  assert(changedInside>5000);assert.equal(changedOutside,0);assert(basinChangedPixels>100);assert.equal(basinCoreChangedPixels,0);assert.equal(northernWallChangedPixels,0);assert.equal(thalasseaRegionChangedPixels,0);
  const overlays=[];for(const group of groups)for(const layer of group.children)overlays.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
  const rebuilt=await pixels(await raster(base).composite(overlays).png().toBuffer());assert.deepEqual(rebuilt.data,parent.imageData.data);
  const preview=await raster(terrain).composite(overlays).png().toBuffer(),finalImage=await pixels(preview);
  let compositeChangedOutside=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++)if(!active(x,y)&&changed(parent.imageData,finalImage,(y*base.width+x)*4))compositeChangedOutside++;
  assert.equal(compositeChangedOutside,0);
  await raster(terrain).png().toFile(path.join(dir,'kalistar-map-1.35-base.png'));fs.writeFileSync(path.join(dir,'kalistar-map-1.35-preview.png'),preview);
  await raster(finalImage).extract(crop).resize({width:1200}).png().toFile(path.join(dir,'crater-detail.png'));
  await raster(terrain).extract(crop).png().toFile(path.join(dir,'zone-after.png'));
  for(const [name,image]of [['zone-before.png',before],['zone-fitted.png',patch],['zone-mask.png',mask]])await raster(image).png().toFile(path.join(dir,name));
  const index=parent.children.findIndex(child=>names.has(child.name));
  parent.children.splice(index,0,{name:zone.layerName,left:crop.left,top:crop.top,imageData:patch,mask:{left:crop.left,top:crop.top,defaultColor:0,positionRelativeToLayer:false,imageData:mask}});parent.imageData=finalImage;
  const psd=path.join(dir,'kalistar-map-1.35.psd');fs.writeFileSync(psd,api.writePsdBuffer(parent,{generateThumbnail:false}));
  const reopened=api.readPsd(fs.readFileSync(psd),{useImageData:true,skipThumbnail:true});assert.deepEqual(reopened.imageData.data,finalImage.data);assert.deepEqual(reopened.children[index].mask.imageData.data,mask.data);
  for(let i=0;i<originals.length;i++)assert.deepEqual(reopened.children[i+(i>=index?1:0)],originals[i]);
  for(const item of protectedSources)assert.equal(sha(path.join(root,item.file)),item.sha256);
  const report={version:zone.version,parentVersion:zone.parentVersion,status:'proposal',runtimePublished:false,changedInside,changedOutside,compositeChangedOutside,basinChangedPixels,basinCoreChangedPixels,northernWallChangedPixels,thalasseaRegionChangedPixels,colorOffsets,cityCount:8,cityGroupsUnchanged:true,originalLayersUnchanged:true,editableMaskRoundTrip:true,compositeRoundTrip:true,nativePhotoshopTested:false,protectedSources};
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'provenance.json'),JSON.stringify({version:zone.version,parentVersion:zone.parentVersion,status:'proposal',runtimePublished:false,generator:'built-in image_gen; deterministic masked terrain compositing',generationId:zone.generationId,parentFiles:protectedSources,files:fs.readdirSync(dir).filter(file=>file!=='provenance.json').map(file=>({file,sha256:sha(path.join(dir,file))}))},null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
