const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const api=require('../layers-1.15/tooling/node_modules/ag-psd');
const root=__dirname;
api.initializeCanvas(()=>{throw Error('Canvas not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
async function pixels(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});return{width:info.width,height:info.height,data:new Uint8ClampedArray(data)};}
function raster(image){return sharp(Buffer.from(image.data),{raw:{width:image.width,height:image.height,channels:4}});}
async function main(){
  const parent=api.readPsd(fs.readFileSync(path.join(root,'../layers-1.17/kalistar-map-1.17.psd')),{useImageData:true,skipThumbnail:true});
  const layout=JSON.parse(fs.readFileSync(path.join(root,'../layers-1.15/layout.json'),'utf8'));
  const composite=[];
  for(const city of layout.cities){
    const group=parent.children.find(layer=>layer.name===city.name);
    const name=group.children.find(layer=>layer.text),originalName=structuredClone(name);
    const height={kalistopolis:58,durane:48,arborium:42}[city.id];
    const source=path.join(root,'../layers-1.15/icons',city.id+'.png');
    const icon=await sharp(source).trim().resize({height}).png().toBuffer();
    const image=await pixels(icon),left=Math.round(city.centerX-image.width/2),top=city.bottomY-height;
    const padded=await sharp(icon).extend({top:5,bottom:8,left:5,right:8,background:{r:0,g:0,b:0,alpha:0}}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let i=0;i<padded.data.length;i+=4){padded.data[i]=27;padded.data[i+1]=18;padded.data[i+2]=10;padded.data[i+3]=Math.round(padded.data[i+3]*.9);}
    const shadow=await sharp(padded.data,{raw:{width:padded.info.width,height:padded.info.height,channels:4}}).blur(1.25).png().toBuffer();
    const shadowLayer={name:city.name+' - Ombre portee',left:left-3,top:top-3,imageData:await pixels(shadow)};
    const monument={name:city.name+' - Monument',left,top,imageData:image};
    group.children=[shadowLayer,monument,name];
    assert.deepEqual(name,originalName);
    for(const layer of group.children)composite.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
  }
  const base=path.join(root,'../kalistar-map-1.17-base.png');
  const preview=await sharp(base).composite(composite).png().toBuffer();
  fs.writeFileSync(path.join(root,'kalistar-map-1.18-preview.png'),preview);
  parent.imageData=await pixels(preview);
  const output=path.join(root,'kalistar-map-1.18.psd');
  fs.writeFileSync(output,api.writePsdBuffer(parent,{generateThumbnail:false}));
  const check=api.readPsd(fs.readFileSync(output),{useImageData:true,skipThumbnail:true});
  assert.deepEqual(check.imageData.data,parent.imageData.data);
  for(let i=0;i<3;i++)assert.deepEqual(check.children[i].imageData.data,parent.children[i].imageData.data);
  for(const city of layout.cities){const group=check.children.find(layer=>layer.name===city.name);assert.equal(group.children.length,3);assert.equal(group.children[2].text.text.trim(),city.name);}
  await sharp(preview).webp({lossless:true}).toFile(path.join(root,'../../site/assets/ui/kalistar-atlas-1.18.webp'));
  const report={terrainUnchanged:true,namesUnchanged:true,cityShadows:3,monumentHeights:[58,48,42],psdRoundTrip:true,nativePhotoshopTested:false};
  fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
