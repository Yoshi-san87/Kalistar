'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..');
const api=require(path.join(root,'V4/map/layers-1.15/tooling/node_modules/ag-psd'));
const dir=path.join(root,'V4/map/layers-1.31');
const generated='C:/Users/guill/.codex/generated_images/01a12863-205a-7172-9800-7c1a7d0b723c';
const baseFile=path.join(root,'V4/map/kalistar-map-1.30-base.png');
const psdFile=path.join(root,'V4/map/layers-1.30/kalistar-map-1.30.psd');
const location=JSON.parse(fs.readFileSync(path.join(dir,'zone.json'),'utf8'));
const {crop}=location;
const names=new Set(['Kalistopolis','Durane','Arborium','Velane','WoodLand','Vulkar','Cryptown']);
const wallPolygon=location.wallPolygon;
const landPolygon=location.landPolygon;
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
api.initializeCanvas(()=>{throw Error('Canvas is not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
async function pixels(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {width:info.width,height:info.height,data:new Uint8ClampedArray(data)};}
const raster=image=>sharp(Buffer.from(image.data),{raw:{width:image.width,height:image.height,channels:4}});
function inside(x,y,polygon){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;}
function distance(x,y,polygon){let result=Infinity;for(let i=0;i<polygon.length;i++){const [ax,ay]=polygon[i],[bx,by]=polygon[(i+1)%polygon.length],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));result=Math.min(result,Math.hypot(x-ax-t*dx,y-ay-t*dy));}return result;}
function maskFor(polygon,feather){const mask={width:crop.width,height:crop.height,data:new Uint8ClampedArray(crop.width*crop.height*4)};for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++){const t=inside(x,y,polygon)?Math.min(1,distance(x,y,polygon)/feather):0,a=Math.round(255*t*t*(3-2*t)),i=(y*crop.width+x)*4;mask.data[i]=mask.data[i+1]=mask.data[i+2]=a;mask.data[i+3]=255;}return mask;}
function blend(base,patch,mask){const next={...base,data:new Uint8ClampedArray(base.data)};for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++){const from=(y*crop.width+x)*4,to=((y+crop.top)*base.width+crop.left+x)*4,a=mask.data[from]/255;if(!a)continue;for(let c=0;c<3;c++)next.data[to+c]=Math.round(patch.data[from+c]*a+base.data[to+c]*(1-a));}return next;}
function countChanges(before,after,active){let changedInside=0,changedOutside=0;for(let y=0;y<before.height;y++)for(let x=0;x<before.width;x++){const i=(y*before.width+x)*4;if([0,1,2,3].some(c=>before.data[i+c]!==after.data[i+c])){if(active(x,y))changedInside++;else changedOutside++;}}return {changedInside,changedOutside};}
function riverCenter(image,y){let sum=0,weight=0;for(let x=105;x<139;x++){const i=(y*image.width+x)*4,r=image.data[i],g=image.data[i+1],b=image.data[i+2];if(r>55&&r<170&&r-g<25&&g-b<37&&r-g>0){const w=1/(1+Math.abs(r-g-9));sum+=x*w;weight+=w;}}if(weight>0)return sum/weight;let best={score:Infinity,x:0};for(let x=110;x<139;x++){const i=(y*image.width+x)*4,score=image.data[i]+image.data[i+1]+image.data[i+2];if(score<best.score)best={score,x};}return best.x;}
async function main(){
  fs.mkdirSync(dir,{recursive:true});
  const parentFiles=[baseFile,psdFile,path.join(root,'V4/map/versions.json'),path.join(root,'V4/site/map-view.js'),path.join(root,'V4/site/assets/ui/kalistar-atlas-1.30.webp'),path.join(root,'V4/deploy/runtime-media.json')];
  const protectedBefore=parentFiles.map(file=>({file:path.relative(root,file).replaceAll('\\','/'),sha256:sha(file)}));
  const base=await pixels(baseFile),before=await pixels(await raster(base).extract(crop).png().toBuffer());
  const parent=api.readPsd(fs.readFileSync(psdFile),{useImageData:true,skipThumbnail:true}),originals=structuredClone(parent.children);
  const cityGroups=parent.children.filter(child=>names.has(child.name));assert.equal(cityGroups.length,7);
  const inputs=[['wall-generated.png','exec-7b8fc1d1-d80b-4845-985a-38b83a4dd24a.png'],['land-generated.png','exec-a39e38b6-6a6e-466f-8869-9c231928d38d.png']];
  const sources=[];
  for(const [target,name] of inputs){const saved=path.join(dir,target),file=fs.existsSync(saved)?saved:path.join(generated,name),meta=await sharp(file).metadata();assert(Math.abs(meta.width/meta.height-crop.width/crop.height)<.02,'Generation framing');if(file!==saved)fs.copyFileSync(file,saved);sources.push(await pixels(await sharp(file).resize(crop.width,crop.height).png().toBuffer()));}
  const wall=sources[0],land=sources[1];
  // One restrained color calibration is shared by both edits, preserving the approved masonry.
  const old=[[],[],[]],fresh=[[],[],[]];
  for(let y=8;y<145;y++)for(let x=3;x<24;x++){const i=(y*crop.width+x)*4;for(let c=0;c<3;c++){old[c].push(before.data[i+c]);fresh[c].push(wall.data[i+c]);}}
  const quantile=(values,p)=>values.sort((a,b)=>a-b)[Math.floor((values.length-1)*p)];
  const colorMatch=old.map((values,c)=>{const lo=quantile(values,.1),hi=quantile(values,.9),a=quantile(fresh[c],.1),b=quantile(fresh[c],.9),scale=Math.max(.9,Math.min(1.1,(hi-lo)/Math.max(1,b-a)));return {scale,offset:Math.max(-14,Math.min(14,hi-b*scale))};});
  for(const image of sources)for(let i=0;i<image.data.length;i+=4)for(let c=0;c<3;c++)image.data[i+c]=Math.max(0,Math.min(255,Math.round(image.data[i+c]*colorMatch[c].scale+colorMatch[c].offset)));
  // Register the lower river outlet to the preserved context; the wall is outside this warp.
  const riverSamples=[144,146,148,150,152].map(y=>({y,before:riverCenter(before,y),after:riverCenter(land,y)}));
  const riverShift=riverSamples.length?Math.max(-16,Math.min(16,riverSamples.reduce((n,item)=>n+item.before-item.after,0)/riverSamples.length)):0;
  const fittedLand={...land,data:new Uint8ClampedArray(land.data)};
  for(let y=96;y<crop.height;y++)for(let x=1;x<crop.width-1;x++){
    const t=Math.max(0,Math.min(1,(y-100)/45)),edge=Math.max(0,Math.min(1,(x-50)/30,(220-x)/30));
    const sx=Math.max(0,Math.min(crop.width-1,x-riverShift*t*edge)),a=Math.floor(sx),b=Math.min(crop.width-1,a+1),f=sx-a;
    for(let c=0;c<3;c++)fittedLand.data[(y*crop.width+x)*4+c]=Math.round(land.data[(y*crop.width+a)*4+c]*(1-f)+land.data[(y*crop.width+b)*4+c]*f);
  }
  const wallMask=maskFor(wallPolygon,6),landMask=maskFor(landPolygon,6);
  const foundations=[[25,69],[55,80],[80,84],[105,84],[122,87],[140,92],[160,92],[180,90],[207,84]];
  for(let y=0;y<crop.height;y++)for(let x=25;x<=207;x++){
    let limit=0;
    for(let j=1;j<foundations.length;j++)if(x>=foundations[j-1][0]&&x<=foundations[j][0]){const [ax,ay]=foundations[j-1],[bx,by]=foundations[j];limit=ay+(by-ay)*(x-ax)/(bx-ax);break;}
    if(y<=limit+1){const i=(y*crop.width+x)*4;landMask.data[i]=landMask.data[i+1]=landMask.data[i+2]=0;}
  }
  const wallTerrain=blend(base,wall,wallMask),terrain=blend(wallTerrain,fittedLand,landMask);
  const active=(x,y)=>{const a=x-crop.left,b=y-crop.top;if(a<0||b<0||a>=crop.width||b>=crop.height)return false;const i=(b*crop.width+a)*4;return wallMask.data[i]>0||landMask.data[i]>0;};
  const changes=countChanges(base,terrain,active);assert.equal(changes.changedOutside,0);assert(changes.changedInside>5000);
  const overlays=[];for(const group of cityGroups)for(const layer of group.children)overlays.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
  const rebuilt=await pixels(await raster(base).composite(overlays).png().toBuffer());assert.deepEqual(rebuilt.data,parent.imageData.data);
  const preview=await raster(terrain).composite(overlays).png().toBuffer(),finalImage=await pixels(preview);
  const fullChanges=countChanges(parent.imageData,finalImage,active);assert.equal(fullChanges.changedOutside,0);
  const preservation=countChanges(wallTerrain,terrain,(x,y)=>{const a=x-crop.left,b=y-crop.top;return a>=0&&b>=0&&a<crop.width&&b<crop.height&&landMask.data[(b*crop.width+a)*4]>0;});assert.equal(preservation.changedOutside,0);
  let gateChangedPixels=0;for(let y=56;y<=85;y++)for(let x=103;x<=132;x++){const i=((y+crop.top)*base.width+x+crop.left)*4;if([0,1,2,3].some(c=>wallTerrain.data[i+c]!==terrain.data[i+c]))gateChangedPixels++;}assert.equal(gateChangedPixels,0);
  await raster(terrain).png().toFile(path.join(dir,'kalistar-map-1.31-base.png'));
  fs.writeFileSync(path.join(dir,'kalistar-map-1.31-preview.png'),preview);
  await raster(terrain).extract(crop).resize({width:1100}).png().toFile(path.join(dir,'wall-detail.png'));
  await raster(terrain).extract(crop).png().toFile(path.join(dir,'zone-after.png'));
  for(const [name,image] of [['wall-fitted.png',wall],['land-fitted.png',fittedLand],['wall-mask.png',wallMask],['land-mask.png',landMask]])await raster(image).png().toFile(path.join(dir,name));
  await raster(base).extract(crop).png().toFile(path.join(dir,'zone-before.png'));
  assert(fs.existsSync(path.join(root,location.reference)),'Preserved user location reference');
  const insertIndex=parent.children.findIndex(child=>names.has(child.name));
  const layers=[['Mur et porte - zone locale',wall,wallMask],['Versant terre - vallon et berges',fittedLand,landMask]].map(([name,imageData,mask])=>({name,left:crop.left,top:crop.top,imageData,mask:{left:crop.left,top:crop.top,defaultColor:0,positionRelativeToLayer:false,imageData:mask}}));
  parent.children.splice(insertIndex,0,...layers);parent.imageData=finalImage;
  const outputPsd=path.join(dir,'kalistar-map-1.31.psd');fs.writeFileSync(outputPsd,api.writePsdBuffer(parent,{generateThumbnail:false}));
  const reopened=api.readPsd(fs.readFileSync(outputPsd),{useImageData:true,skipThumbnail:true});assert.deepEqual(reopened.imageData.data,finalImage.data);
  for(let i=0;i<originals.length;i++)assert.deepEqual(reopened.children[i+(i>=insertIndex?2:0)],originals[i]);
  for(let i=0;i<2;i++)assert.deepEqual(reopened.children[insertIndex+i].mask.imageData.data,layers[i].mask.imageData.data);
  for(const item of protectedBefore)assert.equal(sha(path.join(root,item.file)),item.sha256,item.file+' changed');
  const report={version:'1.31',parentVersion:'1.30',status:'proposal',runtimePublished:false,date:'2026-10-15',crop,locationMatch:location.match,changes,fullChanges,foregroundChanges:preservation,gateChangedPixels,riverSamples,riverShift,colorMatch,cityCount:7,originalLayersUnchanged:true,cityGroupsUnchanged:true,editableMasksRoundTrip:true,compositeRoundTrip:true,nativePhotoshopTested:false,protectedSources:protectedBefore};
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');
  const files=fs.readdirSync(dir).filter(file=>file!=='provenance.json').map(file=>({file,sha256:sha(path.join(dir,file))}));
  const provenance={version:'1.31',parentVersion:'1.30',status:'proposal',runtimePublished:false,generator:'built-in image_gen; deterministic local masks and original independent city groups',generationIds:{wall:'exec-7b8fc1d1-d80b-4845-985a-38b83a4dd24a',foreground:'exec-a39e38b6-6a6e-466f-8869-9c231928d38d'},styleReference:{file:'V4/map/kalistar-map-1.0.png',sha256:sha(path.join(root,'V4/map/kalistar-map-1.0.png'))},parentFiles:protectedBefore,files};
  fs.writeFileSync(path.join(dir,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
