'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const api=require('../layers-1.15/tooling/node_modules/ag-psd');
const dir=__dirname,root=path.resolve(dir,'../../..'),zone=JSON.parse(fs.readFileSync(path.join(dir,'zone.json'),'utf8'));
const names=new Set(['Kalistopolis','Durane','Arborium','Velane','WoodLand','Vulkar','Cryptown','Thalassea']);
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
    const t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy));result=Math.min(result,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }
  return result;
}
function contains(x,y,rect){return x>=rect.left&&y>=rect.top&&x<rect.left+rect.width&&y<rect.top+rect.height;}
function changed(a,b,i){return [0,1,2,3].some(c=>a.data[i+c]!==b.data[i+c]);}
async function main(){
  const parentBase=path.join(root,zone.parentBase),parentPsd=path.join(root,zone.parentPsd);
  const protectedSources=[parentBase,parentPsd,path.join(root,'V4/map/kalistar-map-1.0.png'),path.join(root,'V4/site/assets/ui/kalistar-atlas-1.36.webp'),...zone.sourceProtectionMasks.map(item=>path.join(root,item.file))]
    .map(file=>({file:path.relative(root,file).replaceAll('\\','/'),sha256:sha(file)}));
  const base=await pixels(parentBase),terrain={...base,data:new Uint8ClampedArray(base.data)};
  const parent=api.readPsd(fs.readFileSync(parentPsd),{useImageData:true,skipThumbnail:true}),originals=structuredClone(parent.children);
  const groups=parent.children.filter(child=>names.has(child.name));assert.equal(groups.length,8);
  const guards=[];
  const guardBits=new Uint8Array(base.width*base.height);
  for(const source of zone.sourceProtectionMasks){
    const data=await sharp(path.join(root,source.file)).extractChannel(0).raw().toBuffer();guards.push({...source,data});
    for(let y=0;y<source.crop.height;y++)for(let x=0;x<source.crop.width;x++)if(data[y*source.crop.width+x])guardBits[(y+source.crop.top)*base.width+x+source.crop.left]=1;
  }
  function guardWeight(x,y){
    if(guardBits[y*base.width+x])return 0;
    let minimum=zone.sourceProtectionFeather;
    for(let dy=-minimum;dy<=zone.sourceProtectionFeather;dy++)for(let dx=-zone.sourceProtectionFeather;dx<=zone.sourceProtectionFeather;dx++){
      const d=Math.hypot(dx,dy);if(d>=minimum)continue;
      if(x+dx>=0&&y+dy>=0&&x+dx<base.width&&y+dy<base.height&&guardBits[(y+dy)*base.width+x+dx])minimum=d;
    }
    return minimum/zone.sourceProtectionFeather;
  }
  const patches=[],editReports=[];
  for(const edit of zone.edits){
    const {crop}=edit,before=await pixels(await raster(base).extract(crop).png().toBuffer());
    const file=path.join(dir,edit.id+'-generated.png'),metadata=await sharp(file).metadata();
    assert(Math.abs(metadata.width/metadata.height-crop.width/crop.height)<.02);
    const patch=await pixels(await sharp(file).resize(crop.width,crop.height).png().toBuffer());
    const differences=[[],[],[]],anchor=edit.colorAnchor;
    for(let y=anchor.top;y<anchor.top+anchor.height;y++)for(let x=anchor.left;x<anchor.left+anchor.width;x++){
      const i=(y*crop.width+x)*4;for(let c=0;c<3;c++)differences[c].push(before.data[i+c]-patch.data[i+c]);
    }
    const colorOffsets=differences.map(values=>Math.max(-edit.colorLimit,Math.min(edit.colorLimit,values.sort((a,b)=>a-b)[Math.floor(values.length/2)])));
    for(let i=0;i<patch.data.length;i+=4)for(let c=0;c<3;c++)patch.data[i+c]=Math.max(0,Math.min(255,patch.data[i+c]+colorOffsets[c]));
    const mask={width:crop.width,height:crop.height,data:new Uint8ClampedArray(patch.data.length)};
    let changedInside=0,warmRedPixels=0;
    for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++){
      let t=inside(x,y,edit.polygon)?Math.min(1,distance(x,y,edit.polygon)/edit.feather):0;
      const gx=x+crop.left,gy=y+crop.top,from=(y*crop.width+x)*4,to=(gy*base.width+gx)*4;
      if(t)t=Math.min(t,guardWeight(gx,gy));
      for(const rect of Object.values(zone.protectedRegions)){
        const dx=Math.max(rect.left-gx,0,gx-(rect.left+rect.width-1)),dy=Math.max(rect.top-gy,0,gy-(rect.top+rect.height-1));
        t=Math.min(t,clamp(Math.hypot(dx,dy)/edit.feather));
      }
      for(const circle of edit.preserveCircles||[])t=Math.min(t,clamp((Math.hypot(x-circle.x,y-circle.y)-circle.radius)/circle.feather));
      const a=Math.round(255*t*t*(3-2*t));mask.data[from]=mask.data[from+1]=mask.data[from+2]=a;mask.data[from+3]=255;
      if(a)for(let c=0;c<3;c++)terrain.data[to+c]=Math.round((patch.data[from+c]*a+terrain.data[to+c]*(255-a))/255);
      if(changed(base,terrain,to)){
        changedInside++;
        const [r,g,b]=terrain.data.slice(to,to+3);if(r>100&&r>g*1.45&&r-g>32&&g>b+8)warmRedPixels++;
      }
    }
    assert(changedInside>300);if(edit.id==='eruption')assert(warmRedPixels>10);
    patches.push({edit,patch,mask});editReports.push({id:edit.id,generationId:edit.generationId,crop,changedInside,colorOffsets,...(edit.id==='eruption'?{warmRedPixelSignal:warmRedPixels}:{} )});
    for(const [suffix,image]of [['before',before],['fitted',patch],['mask',mask]])await raster(image).png().toFile(path.join(dir,edit.id+'-'+suffix+'.png'));
    await raster(terrain).extract(crop).png().toFile(path.join(dir,edit.id+'-after.png'));
  }
  const active=(x,y)=>patches.some(({edit,mask})=>contains(x,y,edit.crop)&&mask.data[((y-edit.crop.top)*edit.crop.width+x-edit.crop.left)*4]>0);
  const protectedRegions=Object.fromEntries(Object.keys(zone.protectedRegions).map(name=>[name,0]));
  const sourceProtectionChanges=Object.fromEntries(guards.map(guard=>[guard.file,0]));
  let changedInside=0,changedOutside=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++){
    const i=(y*base.width+x)*4;if(!changed(base,terrain,i))continue;
    if(active(x,y))changedInside++;else changedOutside++;
    for(const [name,rect]of Object.entries(zone.protectedRegions))if(contains(x,y,rect))protectedRegions[name]++;
    for(const guard of guards)if(contains(x,y,guard.crop)&&guard.data[(y-guard.crop.top)*guard.crop.width+x-guard.crop.left])sourceProtectionChanges[guard.file]++;
  }
  assert.equal(changedOutside,0);for(const count of [...Object.values(protectedRegions),...Object.values(sourceProtectionChanges)])assert.equal(count,0);
  const overlays=[];
  for(const group of groups)for(const layer of group.children)overlays.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
  const rebuilt=await pixels(await raster(base).composite(overlays).png().toBuffer());assert.deepEqual(rebuilt.data,parent.imageData.data);
  const preview=await raster(terrain).composite(overlays).png().toBuffer(),finalImage=await pixels(preview);
  let compositeChangedOutside=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++)if(!active(x,y)&&changed(parent.imageData,finalImage,(y*base.width+x)*4))compositeChangedOutside++;
  assert.equal(compositeChangedOutside,0);
  await raster(terrain).png().toFile(path.join(dir,'kalistar-map-1.38-base.png'));
  fs.writeFileSync(path.join(dir,'kalistar-map-1.38-preview.png'),preview);
  await raster(finalImage).extract(zone.detailCrop).resize({width:1180}).png().toFile(path.join(dir,'vulkar-detail.png'));
  const index=parent.children.findIndex(child=>names.has(child.name));
  parent.children.splice(index,0,...patches.map(({edit,mask,patch})=>({name:edit.name,left:edit.crop.left,top:edit.crop.top,imageData:patch,mask:{left:edit.crop.left,top:edit.crop.top,defaultColor:0,positionRelativeToLayer:false,imageData:mask}})));
  parent.imageData=finalImage;
  const psdFile=path.join(dir,'kalistar-map-1.38.psd');fs.writeFileSync(psdFile,api.writePsdBuffer(parent,{generateThumbnail:false}));
  const reopened=api.readPsd(fs.readFileSync(psdFile),{useImageData:true,skipThumbnail:true});assert.deepEqual(reopened.imageData.data,finalImage.data);
  for(let i=0;i<patches.length;i++)assert.deepEqual(reopened.children[index+i].mask.imageData.data,patches[i].mask.data);
  for(let i=0;i<originals.length;i++)assert.deepEqual(reopened.children[i+(i>=index?patches.length:0)],originals[i]);
  for(const source of protectedSources)assert.equal(sha(path.join(root,source.file)),source.sha256);
  const report={version:zone.version,parentVersion:zone.parentVersion,status:'proposal',runtimePublished:false,width:base.width,height:base.height,
    changedInside,changedOutside,compositeChangedOutside,edits:editReports,protectedRegions,sourceProtectionChanges,
    cityCount:8,cityGroupsUnchanged:true,originalLayersUnchanged:true,editableMasksRoundTrip:true,compositeRoundTrip:true,nativePhotoshopTested:false,protectedSources};
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'provenance.json'),JSON.stringify({version:zone.version,parentVersion:zone.parentVersion,status:'proposal',runtimePublished:false,
    generator:'built-in image_gen; deterministic masked terrain compositing',generations:zone.edits.map(edit=>({id:edit.id,generationId:edit.generationId,prompt:edit.id+'.prompt.txt',selectedOutput:edit.id+'-generated.png'})),parentFiles:protectedSources,
    files:fs.readdirSync(dir).filter(file=>file!=='provenance.json').map(file=>({file,sha256:sha(path.join(dir,file))}))},null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
