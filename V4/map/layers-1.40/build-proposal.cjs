'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(modules,'__map_140__.cjs'))('sharp');
const api=require('../layers-1.15/tooling/node_modules/ag-psd');
const dir=__dirname,root=path.resolve(dir,'../../..'),zone=JSON.parse(fs.readFileSync(path.join(dir,'zone.json'),'utf8'));
const {crop}=zone,names=new Set(['Kalistopolis','Durane','Arborium','Velane','WoodLand','Vulkar','Cryptown','Thalassea']);
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const clamp=n=>Math.max(0,Math.min(1,n));
const raster=image=>sharp(Buffer.from(image.data),{raw:{width:image.width,height:image.height,channels:4}});
const changed=(a,b,i)=>[0,1,2,3].some(c=>a.data[i+c]!==b.data[i+c]);
const contains=(x,y,r)=>x>=r.left&&y>=r.top&&x<r.left+r.width&&y<r.top+r.height;
api.initializeCanvas(()=>{throw Error('Canvas is not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
async function pixels(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {width:info.width,height:info.height,data:new Uint8ClampedArray(data)};}
function inside(x,y,polygon){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;}
function distance(x,y,polygon){let result=Infinity;for(let i=0;i<polygon.length;i++){const [ax,ay]=polygon[i],[bx,by]=polygon[(i+1)%polygon.length],dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy));result=Math.min(result,Math.hypot(x-ax-t*dx,y-ay-t*dy));}return result;}
async function main(){
  assert.equal(zone.runtimePublished,false,'A local proposal must not silently publish the atlas');
  const sources=[zone.parentBase,zone.parentPsd,'V4/map/kalistar-map-1.0.png','V4/map/versions.json','V4/site/assets/ui/kalistar-atlas-1.39.webp','V4/site/site-config.js'];
  const protectedSources=sources.map(file=>({file,sha256:sha(path.join(root,file))}));
  const base=await pixels(path.join(root,zone.parentBase)),terrain={...base,data:new Uint8ClampedArray(base.data)};
  const parent=api.readPsd(fs.readFileSync(path.join(root,zone.parentPsd)),{useImageData:true,skipThumbnail:true}),originals=structuredClone(parent.children);
  const groups=parent.children.filter(child=>names.has(child.name));assert.equal(groups.length,zone.cityCount);
  const before=await pixels(await raster(base).extract(crop).png().toBuffer()),generated=path.join(dir,'zone-generated.png');
  const metadata=await sharp(generated).metadata();assert(Math.abs(metadata.width/metadata.height-crop.width/crop.height)<.02,'The generated crop must keep its framing');
  const patch=await pixels(await sharp(generated).resize(crop.width,crop.height).png().toBuffer());
  const differences=[[],[],[]],anchor=zone.colorAnchor;
  for(let y=anchor.top;y<anchor.top+anchor.height;y++)for(let x=anchor.left;x<anchor.left+anchor.width;x++){
    const i=(y*crop.width+x)*4;for(let c=0;c<3;c++)differences[c].push(before.data[i+c]-patch.data[i+c]);
  }
  const colorOffsets=differences.map(values=>Math.max(-zone.colorLimit,Math.min(zone.colorLimit,values.sort((a,b)=>a-b)[Math.floor(values.length/2)])));
  for(let i=0;i<patch.data.length;i+=4)for(let c=0;c<3;c++)patch.data[i+c]=Math.max(0,Math.min(255,patch.data[i+c]+colorOffsets[c]));
  const mask={width:crop.width,height:crop.height,data:new Uint8ClampedArray(patch.data.length)};
  for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++){
    // A contour around the actual islands/bridges keeps the surrounding sea intact.
    const t=Math.max(...zone.polygons.map(p=>inside(x,y,p)?Math.min(1,distance(x,y,p)/zone.feather):0));
    const protectedPixel=Object.values(zone.protectedRegions).some(r=>contains(x+crop.left,y+crop.top,r));
    const a=protectedPixel?0:Math.round(255*t*t*(3-2*t)),from=(y*crop.width+x)*4,to=((y+crop.top)*base.width+x+crop.left)*4;
    mask.data[from]=mask.data[from+1]=mask.data[from+2]=a;mask.data[from+3]=255;
    if(a)for(let c=0;c<3;c++)terrain.data[to+c]=Math.round((patch.data[from+c]*a+base.data[to+c]*(255-a))/255);
  }
  const active=(x,y)=>contains(x,y,crop)&&mask.data[((y-crop.top)*crop.width+x-crop.left)*4]>0;
  const protectedRegions=Object.fromEntries(Object.keys(zone.protectedRegions).map(name=>[name,0]));
  let changedInside=0,changedOutside=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++){
    if(!changed(base,terrain,(y*base.width+x)*4))continue;
    if(active(x,y))changedInside++;else changedOutside++;
    for(const [name,rect]of Object.entries(zone.protectedRegions))if(contains(x,y,rect))protectedRegions[name]++;
  }
  assert(changedInside>3000);assert.equal(changedOutside,0);for(const count of Object.values(protectedRegions))assert.equal(count,0);
  const overlays=[];for(const group of groups)for(const layer of group.children)overlays.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
  const rebuilt=await pixels(await raster(base).composite(overlays).png().toBuffer());assert.deepEqual(rebuilt.data,parent.imageData.data,'Original city composition must reproduce the approved PSD');
  const preview=await raster(terrain).composite(overlays).png().toBuffer(),finalImage=await pixels(preview);
  let compositeChangedOutside=0;for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++)if(!active(x,y)&&changed(parent.imageData,finalImage,(y*base.width+x)*4))compositeChangedOutside++;
  assert.equal(compositeChangedOutside,0);
  await raster(terrain).png().toFile(path.join(dir,'kalistar-map-1.40-base.png'));
  fs.writeFileSync(path.join(dir,'kalistar-map-1.40-preview.png'),preview);
  await raster(finalImage).extract(crop).resize({width:1100}).png().toFile(path.join(dir,'islands-detail.png'));
  await raster(finalImage).extract({left:405,top:300,width:300,height:290}).resize({width:1050}).png().toFile(path.join(dir,'coastal-context.png'));
  await raster(terrain).extract(crop).png().toFile(path.join(dir,'zone-after.png'));
  await raster(before).png().toFile(path.join(dir,'zone-before.png'));
  await raster(patch).png().toFile(path.join(dir,'zone-fitted.png'));
  await raster(mask).png().toFile(path.join(dir,'zone-mask.png'));
  const index=parent.children.findIndex(child=>names.has(child.name));
  parent.children.splice(index,0,{name:'Archipel et petits ponts - acces nord - 1.40',left:crop.left,top:crop.top,imageData:patch,
    mask:{left:crop.left,top:crop.top,defaultColor:0,positionRelativeToLayer:false,imageData:mask}});
  parent.imageData=finalImage;
  const psdFile=path.join(dir,'kalistar-map-1.40.psd');fs.writeFileSync(psdFile,api.writePsdBuffer(parent,{generateThumbnail:false}));
  const reopened=api.readPsd(fs.readFileSync(psdFile),{useImageData:true,skipThumbnail:true});assert.deepEqual(reopened.imageData.data,finalImage.data);
  assert.deepEqual(reopened.children[index].mask.imageData.data,mask.data);
  for(let i=0;i<originals.length;i++)assert.deepEqual(reopened.children[i+(i>=index?1:0)],originals[i]);
  for(const source of protectedSources)assert.equal(sha(path.join(root,source.file)),source.sha256);
  const report={version:zone.version,parentVersion:zone.parentVersion,status:zone.status,runtimePublished:false,width:base.width,height:base.height,
    changedInside,changedOutside,compositeChangedOutside,protectedRegions,colorOffsets,cityCount:groups.length,cityGroupsUnchanged:true,originalLayersUnchanged:true,
    editableMaskRoundTrip:true,compositeRoundTrip:true,nativePhotoshopTested:false,protectedSources};
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');
  const files=fs.readdirSync(dir,{withFileTypes:true}).filter(entry=>entry.isFile()&&entry.name!=='provenance.json').map(entry=>({file:entry.name,sha256:sha(path.join(dir,entry.name))}));
  fs.writeFileSync(path.join(dir,'provenance.json'),JSON.stringify({version:zone.version,parentVersion:zone.parentVersion,status:zone.status,runtimePublished:false,
    generator:'built-in image_gen; local masked compositing using Sharp and ag-psd',generationId:zone.generationId,parentFiles:protectedSources,files},null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
