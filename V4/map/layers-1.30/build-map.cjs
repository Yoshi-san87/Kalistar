'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const api = require('../layers-1.15/tooling/node_modules/ag-psd');
const dir = __dirname;
const zone = JSON.parse(fs.readFileSync(path.join(dir,'zone.json'),'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
api.initializeCanvas(() => { throw Error('Canvas is not used'); }, (width,height) => ({width,height,data:new Uint8ClampedArray(width*height*4)}));
async function pixels(input) {
  const {data,info} = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  return {width:info.width,height:info.height,data:new Uint8ClampedArray(data)};
}
function raster(image) { return sharp(Buffer.from(image.data),{raw:{width:image.width,height:image.height,channels:4}}); }
function inside(x,y,polygon) {
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [a,b]=polygon[i],[c,d]=polygon[j];
    if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)result=!result;
  }
  return result;
}
function distance(x,y,polygon) {
  let result=Infinity;
  for(let i=0;i<polygon.length;i++) {
    const [ax,ay]=polygon[i],[bx,by]=polygon[(i+1)%polygon.length];
    const dx=bx-ax,dy=by-ay;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    result=Math.min(result,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }
  return result;
}
function blend(base,patch,alpha) {
  const result={...base,data:new Uint8ClampedArray(base.data)};
  for(let y=0;y<patch.height;y++)for(let x=0;x<patch.width;x++) {
    const a=alpha[y*patch.width+x];
    if(!a)continue;
    const from=(y*patch.width+x)*4,to=((y+zone.crop.top)*base.width+x+zone.crop.left)*4;
    for(let c=0;c<3;c++)result.data[to+c]=Math.round((patch.data[from+c]*a+base.data[to+c]*(255-a))/255);
  }
  return result;
}
async function main() {
  const basePath=path.resolve(dir,zone.parentBase),psdPath=path.resolve(dir,zone.parentPsd);
  const base=await pixels(basePath),parent=api.readPsd(fs.readFileSync(psdPath),{useImageData:true,skipThumbnail:true});
  const originals=structuredClone(parent.children);
  const fitted=await sharp(path.join(dir,'zone-generated.png')).resize(zone.crop.width,zone.crop.height,{fit:'fill'}).png().toBuffer();
  const patch=await pixels(fitted),alpha=new Uint8Array(patch.width*patch.height);
  // Match paper and canopy tones to the unchanged forest along the left join.
  const before=[[],[],[]],after=[[],[],[]];
  for(let y=65;y<130;y++)for(let x=3;x<23;x++) {
    const a=(y*patch.width+x)*4,b=((y+zone.crop.top)*base.width+x+zone.crop.left)*4;
    for(let c=0;c<3;c++){before[c].push(base.data[b+c]);after[c].push(patch.data[a+c]);}
  }
  const quantile=(values,p)=>values.sort((a,b)=>a-b)[Math.floor((values.length-1)*p)];
  const colorMatch=before.map((values,c)=>{
    const lo=quantile(values,.1),hi=quantile(values,.9),sourceLo=quantile(after[c],.1),sourceHi=quantile(after[c],.9);
    const scale=Math.max(.85,Math.min(1.15,(hi-lo)/Math.max(1,sourceHi-sourceLo)));
    return {scale,offset:Math.max(-20,Math.min(20,hi-sourceHi*scale))};
  });
  for(let i=0;i<patch.data.length;i+=4)for(let c=0;c<3;c++)patch.data[i+c]=Math.max(0,Math.min(255,Math.round(patch.data[i+c]*colorMatch[c].scale+colorMatch[c].offset)));
  await raster(patch).png().toFile(path.join(dir,'zone-fitted.png'));
  const mask={width:patch.width,height:patch.height,data:new Uint8ClampedArray(patch.data.length)};
  for(let y=0;y<patch.height;y++)for(let x=0;x<patch.width;x++) {
    const t=inside(x,y,zone.polygon)?Math.min(1,distance(x,y,zone.polygon)/zone.feather):0;
    const a=Math.round(255*t*t*(3-2*t));
    alpha[y*patch.width+x]=a;
    const i=(y*patch.width+x)*4;
    mask.data[i]=mask.data[i+1]=mask.data[i+2]=a;mask.data[i+3]=255;
  }
  await raster(mask).png().toFile(path.join(dir,'zone-mask.png'));
  const terrain=blend(base,patch,alpha);
  let changedInside=0,changedOutside=0,outsidePixels=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++) {
    const lx=x-zone.crop.left,ly=y-zone.crop.top;
    const active=lx>=0&&ly>=0&&lx<patch.width&&ly<patch.height&&alpha[ly*patch.width+lx]>0;
    const i=(y*base.width+x)*4,changed=[0,1,2,3].some(c=>base.data[i+c]!==terrain.data[i+c]);
    if(active&&changed)changedInside++;
    if(!active){outsidePixels++;if(changed)changedOutside++;}
  }
  assert.equal(changedOutside,0);assert(changedInside>3000);
  const baseOutput=path.join(dir,'../kalistar-map-1.30-base.png');
  await raster(terrain).png().toFile(baseOutput);
  await raster(terrain).extract(zone.crop).png().toFile(path.join(dir,'zone-after.png'));
  await raster(terrain).webp({lossless:true}).toFile(path.join(dir,'kalistar-atlas-1.30.webp'));
  const city=zone.city;
  const iconOutput=path.join(dir,'woodland-icon.png');
  await sharp(path.join(dir,'woodland-source.png')).trim().png().toFile(iconOutput);
  const source=await pixels(iconOutput);
  let transparent=0,opaque=0,visibleRed=0;
  for(let i=0;i<source.data.length;i+=4) {
    if(source.data[i+3]===0)transparent++;
    if(source.data[i+3]>200)opaque++;
    if(source.data[i+3]>80&&source.data[i]>150&&source.data[i+1]<90&&source.data[i+2]<90)visibleRed++;
  }
  assert(transparent>source.width*source.height*.1);assert(opaque>source.width*source.height*.15);
  assert.equal(visibleRed,0,'Unexpected red matte in visible icon pixels');
  await sharp(iconOutput).resize({height:192}).webp({lossless:true}).toFile(path.join(dir,'woodland-v2.webp'));
  await sharp(iconOutput).resize({height:128}).webp({lossless:true}).toFile(path.join(dir,'woodland-v1.webp'));
  const icon=await pixels(await sharp(iconOutput).resize({height:city.symbolSize}).png().toBuffer());
  const left=Math.round(city.x-icon.width/2),top=Math.round(city.y-icon.height/2);
  const underprint=await pixels(await raster(icon).extend({top:4,bottom:4,left:4,right:4,background:'#00000000'}).png().toBuffer());
  for(let i=0;i<underprint.data.length;i+=4){underprint.data[i]=236;underprint.data[i+1]=214;underprint.data[i+2]=174;}
  const edge={...underprint,data:new Uint8ClampedArray(underprint.data)};
  const edgeAlpha=await raster(underprint).extractChannel(3).dilate(1).raw().toBuffer();
  for(let i=0;i<edgeAlpha.length;i++)edge.data[i*4+3]=edgeAlpha[i];
  const dark={...underprint,data:new Uint8ClampedArray(underprint.data)};
  for(let i=0;i<dark.data.length;i+=4){dark.data[i]=37;dark.data[i+1]=24;dark.data[i+2]=14;dark.data[i+3]=Math.round(dark.data[i+3]*.85);}
  const shadow=await pixels(await raster(dark).blur(1.3).png().toBuffer());
  const labelTop=top+icon.height+4;
  const label=await pixels(await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="150" height="28"><text x="75" y="19" text-anchor="middle" font-family="Georgia" font-size="17" font-weight="bold" font-style="italic" fill="#28170e" stroke="#f2dbad" stroke-width="2" paint-order="stroke fill">'+city.name+'</text></svg>')).png().toBuffer());
  const group={name:city.name,opened:true,children:[
    {name:city.name+' - Ombre',left:left-4,top:top-2,imageData:shadow},
    {name:city.name+' - Filet parchemin',left:left-4,top:top-4,imageData:edge},
    {name:city.name+' - Embleme',left,top,imageData:icon},
    {name:city.name+' - Nom editable',left:city.x-75,top:labelTop,imageData:label,text:{text:city.name,transform:[1,0,0,1,city.x,labelTop+19],shapeType:'point',antiAlias:'smooth',style:{font:{name:'Georgia-BoldItalic'},fontSize:17,fillColor:{r:40,g:23,b:14},fillFlag:true,strokeFlag:true,strokeColor:{r:242,g:219,b:173},outlineWidth:2,fillFirst:false},paragraphStyle:{justification:'center'}}}
  ]};
  const cityNames=new Set(['Kalistopolis','Durane','Arborium','Velane','Vulkar','Cryptown']);
  const existingGroups=parent.children.filter(layer=>cityNames.has(layer.name));
  assert.equal(existingGroups.length,6);
  const existingOverlays=[];
  for(const oldCity of existingGroups)for(const layer of oldCity.children)existingOverlays.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
  const rebuiltParent=await pixels(await raster(base).composite(existingOverlays).png().toBuffer());
  assert.deepEqual(rebuiltParent.data,parent.imageData.data,'Existing landmarks must reproduce the parent exactly');
  const newOverlays=[];
  for(const layer of group.children)newOverlays.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
  const preview=await raster(terrain).composite([...existingOverlays,...newOverlays]).png().toBuffer();
  const finalImage=await pixels(preview);
  let compositeChangedOutsideAllowed=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++) {
    const lx=x-zone.crop.left,ly=y-zone.crop.top;
    const active=lx>=0&&ly>=0&&lx<patch.width&&ly<patch.height&&alpha[ly*patch.width+lx]>0;
    const cityPixel=group.children.some(item=>x>=item.left&&y>=item.top&&x<item.left+item.imageData.width&&y<item.top+item.imageData.height);
    if(!active&&!cityPixel) {
      const i=(y*base.width+x)*4;
      if([0,1,2,3].some(c=>finalImage.data[i+c]!==parent.imageData.data[i+c]))compositeChangedOutsideAllowed++;
    }
  }
  assert.equal(compositeChangedOutsideAllowed,0);
  fs.writeFileSync(path.join(dir,'kalistar-map-1.30-preview.png'),preview);
  await sharp(preview).extract({left:450,top:430,width:180,height:165}).resize({width:900}).png().toFile(path.join(dir,'woodland-detail.png'));
  const layer={name:zone.layerName,left:zone.crop.left,top:zone.crop.top,imageData:patch,mask:{left:zone.crop.left,top:zone.crop.top,defaultColor:0,positionRelativeToLayer:false,imageData:mask}};
  const insertIndex=parent.children.findIndex(child=>cityNames.has(child.name));
  parent.children.splice(insertIndex,0,layer);parent.children.push(group);parent.imageData=finalImage;
  const psdOutput=path.join(dir,'kalistar-map-1.30.psd');
  fs.writeFileSync(psdOutput,api.writePsdBuffer(parent,{generateThumbnail:false}));
  const reopened=api.readPsd(fs.readFileSync(psdOutput),{useImageData:true,skipThumbnail:true});
  assert.deepEqual(reopened.imageData.data,finalImage.data);
  assert.deepEqual(reopened.children[insertIndex].mask.imageData.data,mask.data);
  for(let i=0;i<originals.length;i++)assert.deepEqual(reopened.children[i+(i>=insertIndex?1:0)],originals[i]);
  assert.equal(reopened.children.at(-1).children.at(-1).text.text,'WoodLand');
  assert.equal(reopened.children.at(-1).children.at(-1).text.paragraphStyle.justification,'center');
  const report={version:'1.30',changedInside,changedOutside,outsidePixels,compositeChangedOutsideAllowed,colorMatch,oldCityCount:6,cityGroupsUnchanged:true,originalLayersUnchanged:true,editableMaskRoundTrip:true,compositeRoundTrip:true,independentCityAndName:true,city:zone.city,lake:zone.lake,cityRightOfLake:city.x>zone.lake.centerX,width:base.width,height:base.height,icon:{width:source.width,height:source.height,transparent,opaque,visibleRed},authorApprovedOn:zone.authorApprovedOn||null,runtimePublished:Boolean(zone.runtimePublished),nativePhotoshopTested:false};
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');
  const files=['../kalistar-map-1.30-base.png','kalistar-map-1.30-preview.png','kalistar-map-1.30.psd','kalistar-atlas-1.30.webp','zone.json','zone.prompt.txt','zone-final.prompt.txt','woodland.prompt.txt','prepare-zone.cjs','build-map.cjs','publish.cjs','published-media.json','map.test.cjs','README.md','user-zone-reference.png','woodland-architecture-reference.png','zone-before.png','zone-before-large.png','zone-generated.png','zone-fitted.png','zone-mask.png','zone-after.png','woodland-source.png','woodland-icon.png','woodland-v1.webp','woodland-v2.webp','woodland-detail.png','verification.json'];
  const provenance={version:'1.30',parentVersion:'1.29',generator:'built-in image_gen; deterministic masked compositing and independent city layer',generationIds:{terrain:'exec-b6a13314-d98b-4cfc-9aef-e350b2afb5af',woodland:'exec-adc70883-5086-4857-bcdb-5d85ea1805e3',rejectedTerrain:'exec-d61ba6c0-92e7-4ace-ba71-2a4ca391f6c0'},rejectedReason:'Portrait framing distorted the crop; not composited or published.',parentFiles:[{file:zone.parentBase,sha256:sha(basePath)},{file:zone.parentPsd,sha256:sha(psdPath)}],files:files.map(file=>({file:path.relative(path.resolve(dir,'..'),path.resolve(dir,file)).replaceAll('\\','/'),sha256:sha(path.resolve(dir,file))})),authorApprovedOn:zone.authorApprovedOn||null,runtimePublished:Boolean(zone.runtimePublished)};
  fs.writeFileSync(path.join(dir,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
