const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const api=require('../layers-1.15/tooling/node_modules/ag-psd'),root=__dirname;
const zone=JSON.parse(fs.readFileSync(path.join(root,'zone.json'),'utf8'));
api.initializeCanvas(()=>{throw Error('Canvas not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
async function pixels(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});return{width:info.width,height:info.height,data:new Uint8ClampedArray(data)};}
function raster(image){return sharp(Buffer.from(image.data),{raw:{width:image.width,height:image.height,channels:4}});}
function weight(x,y){let inside=false,distance=Infinity;const p=zone.polygon;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const [ax,ay]=p[i],[bx,by]=p[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
    const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    distance=Math.min(distance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }
  const t=inside?Math.min(1,distance/zone.feather):0;return Math.round(255*t*t*(3-2*t));
}
async function main(){
  const parent=api.readPsd(fs.readFileSync(path.join(root,'../layers-1.18/kalistar-map-1.18.psd')),{useImageData:true,skipThumbnail:true});
  const originals=structuredClone(parent.children);
  const base=await pixels(path.resolve(root,zone.parentBase)),updated={...base,data:new Uint8ClampedArray(base.data)};
  const fitted=await sharp(path.join(root,'zone-generated.png')).resize(zone.crop.width,zone.crop.height,{fit:'fill'}).png().toBuffer();
  fs.writeFileSync(path.join(root,'zone-fitted.png'),fitted);const patch=await pixels(fitted),mask={...patch,data:new Uint8ClampedArray(patch.data.length)};
  const alpha=new Uint8Array(patch.width*patch.height);let changedInside=0;
  for(let y=0;y<patch.height;y++)for(let x=0;x<patch.width;x++){
    const a=weight(x,y),i=(y*patch.width+x)*4,target=((y+zone.crop.top)*base.width+x+zone.crop.left)*4;alpha[y*patch.width+x]=a;
    mask.data[i]=mask.data[i+1]=mask.data[i+2]=a;mask.data[i+3]=255;
    for(let c=0;c<3;c++)updated.data[target+c]=Math.round((patch.data[i+c]*a+base.data[target+c]*(255-a))/255);
    if(a&&[0,1,2].some(c=>updated.data[target+c]!==base.data[target+c]))changedInside++;
  }
  const forest={name:'Foret de Velane - Lisiere et sentiers',left:zone.crop.left,top:zone.crop.top,imageData:patch,mask:{left:zone.crop.left,top:zone.crop.top,defaultColor:0,positionRelativeToLayer:false,imageData:mask}};
  parent.children.splice(3,0,forest);
  const icon=await sharp(path.join(root,'velane-icon.png')).trim().resize({height:50}).png().toBuffer(),image=await pixels(icon);
  assert(image.data.some((v,i)=>i%4===3&&v===0),'Real alpha transparency required');
  const left=Math.round(292-image.width/2),top=495-image.height;
  const padded=await sharp(icon).extend({top:5,bottom:8,left:5,right:8,background:{r:0,g:0,b:0,alpha:0}}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let i=0;i<padded.data.length;i+=4){padded.data[i]=27;padded.data[i+1]=18;padded.data[i+2]=10;padded.data[i+3]=Math.round(padded.data[i+3]*.9);}
  const shadow=await sharp(padded.data,{raw:{width:padded.info.width,height:padded.info.height,channels:4}}).blur(1.25).png().toBuffer();
  const label=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="110" height="26"><text x="55" y="18" text-anchor="middle" font-family="Times New Roman" font-size="15" font-weight="bold" font-style="italic" fill="#392612" stroke="#dfbf8b" stroke-width="1.8" paint-order="stroke fill">Velane</text></svg>')).png().toBuffer();
  const village={name:'Velane',opened:true,children:[
    {name:'Velane - Ombre portee',left:left-3,top:top-3,imageData:await pixels(shadow)},
    {name:'Velane - Arbre et cabane',left,top,imageData:image},
    {name:'Velane - Nom editable',left:237,top:492,imageData:await pixels(label),text:{text:'Velane',transform:[1,0,0,1,292,510],shapeType:'point',antiAlias:'smooth',style:{font:{name:'TimesNewRomanPS-BoldItalicMT'},fontSize:15,fillColor:{r:57,g:38,b:18},fillFlag:true,strokeFlag:true,strokeColor:{r:223,g:191,b:139},outlineWidth:1.8,fillFirst:false},paragraphStyle:{justification:'center'}}}
  ]};parent.children.push(village);
  const overlays=[];for(const group of parent.children.filter(layer=>layer.children))for(const layer of group.children)overlays.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
  const preview=await raster(updated).composite(overlays).png().toBuffer(),merged=await pixels(preview);
  let changedOutsideTerrain=0,changedOutsideAuthorized=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++){
    const lx=x-zone.crop.left,ly=y-zone.crop.top;
    const active=lx>=0&&ly>=0&&lx<patch.width&&ly<patch.height&&alpha[ly*patch.width+lx]>0;
    const addedCity=village.children.some(layer=>{const dx=x-layer.left,dy=y-layer.top;return dx>=0&&dy>=0&&dx<layer.imageData.width&&dy<layer.imageData.height&&layer.imageData.data[(dy*layer.imageData.width+dx)*4+3]>0;});
    const i=(y*base.width+x)*4;
    if(!active&&[0,1,2,3].some(c=>updated.data[i+c]!==base.data[i+c]))changedOutsideTerrain++;
    if(!active&&!addedCity&&[0,1,2,3].some(c=>merged.data[i+c]!==parent.imageData.data[i+c]))changedOutsideAuthorized++;
  }
  assert.equal(changedOutsideTerrain,0);assert.equal(changedOutsideAuthorized,0);assert(changedInside>1000);
  await raster(updated).png().toFile(path.join(root,'../kalistar-map-1.19-base.png'));
  await raster(mask).png().toFile(path.join(root,'zone-mask.png'));
  await raster(updated).extract(zone.crop).png().toFile(path.join(root,'zone-after.png'));
  fs.writeFileSync(path.join(root,'kalistar-map-1.19-preview.png'),preview);parent.imageData=merged;
  const output=path.join(root,'kalistar-map-1.19.psd');fs.writeFileSync(output,api.writePsdBuffer(parent,{generateThumbnail:false}));
  const check=api.readPsd(fs.readFileSync(output),{useImageData:true,skipThumbnail:true});
  assert.equal(check.children.length,8);assert.deepEqual(check.imageData.data,merged.data);
  for(let i=0;i<originals.length;i++)assert.deepEqual(check.children[i+(i>=3?1:0)],originals[i]);
  assert.equal(check.children.at(-1).children[2].text.text.trim(),'Velane');assert.deepEqual(check.children[3].mask.imageData.data,mask.data);
  await sharp(preview).webp({lossless:true}).toFile(path.join(root,'../../site/assets/ui/kalistar-atlas-1.19.webp'));
  const report={changedInside,changedOutsideTerrain,changedOutsideAuthorized,previousLayersUnchanged:true,velaneIndependent:true,psdRoundTrip:true,nativePhotoshopTested:false};
  fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
