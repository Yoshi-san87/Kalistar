'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const api=require('../layers-1.15/tooling/node_modules/ag-psd');
api.initializeCanvas(()=>{throw Error('Canvas not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
async function pixels(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {width:info.width,height:info.height,data:new Uint8ClampedArray(data)};}
const raster=image=>sharp(Buffer.from(image.data),{raw:{width:image.width,height:image.height,channels:4}});
(async()=>{
 const parent=api.readPsd(fs.readFileSync(path.join(__dirname,'../layers-1.26/kalistar-map-1.26.psd')),{useImageData:true,skipThumbnail:true});
 const originals=structuredClone(parent.children),oldComposite=parent.imageData;
 const previous=api.readPsd(fs.readFileSync(path.join(__dirname,'../layers-1.27/kalistar-map-1.27.psd')),{useImageData:true,skipThumbnail:true});
 assert.deepEqual(previous.children.slice(0,-1),originals);
 const icon=await sharp(path.join(__dirname,'../layers-1.27/cryptown-source.png')).trim().resize({height:32}).png().toBuffer();
 fs.writeFileSync(path.join(__dirname,'cryptown-icon.png'),icon);
 const image=await pixels(icon);assert(image.data.some((v,i)=>i%4===3&&v===0));
 const left=Math.round(108-image.width/2),top=611;
 const shadowImage=await pixels(await sharp(icon).extend({top:4,bottom:4,left:4,right:4,background:'#00000000'}).png().toBuffer());
 for(let i=0;i<shadowImage.data.length;i+=4){shadowImage.data[i]=40;shadowImage.data[i+1]=27;shadowImage.data[i+2]=16;shadowImage.data[i+3]=Math.round(shadowImage.data[i+3]*.8);}
 const shadow=await pixels(await raster(shadowImage).blur(1).png().toBuffer());
 const label=await pixels(await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="110" height="26"><text x="55" y="18" text-anchor="middle" font-family="Times New Roman" font-size="15" font-weight="bold" font-style="italic" fill="#392612" stroke="#dfbf8b" stroke-width="1.8" paint-order="stroke fill">Cryptown</text></svg>')).png().toBuffer());
 const group={name:'Cryptown',opened:true,children:[
  {name:'Cryptown - Ombre portee',left:left-3,top:top-3,imageData:shadow},
  {name:'Cryptown - Croix funeraire et tombes',left,top,imageData:image},
  {name:'Cryptown - Nom editable',left:53,top:653,imageData:label,text:{text:'Cryptown',transform:[1,0,0,1,108,671],shapeType:'point',antiAlias:'smooth',style:{font:{name:'TimesNewRomanPS-BoldItalicMT'},fontSize:15,fillColor:{r:57,g:38,b:18},fillFlag:true,strokeFlag:true,strokeColor:{r:223,g:191,b:139},outlineWidth:1.8,fillFirst:false},paragraphStyle:{justification:'center'}}}
 ]};
 const overlays=[];for(const layer of group.children)overlays.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
 const preview=await raster(oldComposite).composite(overlays).png().toBuffer(),merged=await pixels(preview);
 let changedOutsideCity=0;
 for(let y=0;y<merged.height;y++)for(let x=0;x<merged.width;x++){
  const active=group.children.some(layer=>{const dx=x-layer.left,dy=y-layer.top;return dx>=0&&dy>=0&&dx<layer.imageData.width&&dy<layer.imageData.height&&layer.imageData.data[(dy*layer.imageData.width+dx)*4+3]>0;});
  const i=(y*merged.width+x)*4;if(!active&&[0,1,2,3].some(c=>merged.data[i+c]!==oldComposite.data[i+c]))changedOutsideCity++;
 }
 assert.equal(changedOutsideCity,0);parent.children.push(group);parent.imageData=merged;
 fs.writeFileSync(path.join(__dirname,'kalistar-map-1.28-preview.png'),preview);
 fs.writeFileSync(path.join(__dirname,'kalistar-map-1.28.psd'),api.writePsdBuffer(parent,{generateThumbnail:false}));
 const check=api.readPsd(fs.readFileSync(path.join(__dirname,'kalistar-map-1.28.psd')),{useImageData:true,skipThumbnail:true});
 assert.deepEqual(check.imageData.data,merged.data);for(let i=0;i<originals.length;i++)assert.deepEqual(check.children[i],originals[i]);
 assert.equal(check.children.at(-1).children[2].text.text.trim(),'Cryptown');
 await sharp(preview).extract({left:45,top:550,width:160,height:155}).resize(640,620).png().toFile(path.join(__dirname,'cryptown-closeup.png'));
 const report={terrainUnchanged:true,previousLayersUnchanged:true,changedOutsideCity,cryptownMovedNotDuplicated:true,independentIconShadowAndEditableName:true,psdRoundTrip:true,nativePhotoshopTested:false,anchor:{x:108,y:627}};
 fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(report,null,2)+'\n');
 const files=['cryptown-icon.png','build-cryptown.cjs','kalistar-map-1.28-preview.png','kalistar-map-1.28.psd','cryptown-closeup.png','verification.json'];
 const proof={version:'1.28',parentVersion:'1.27',generator:'deterministic city layer repositioning',sourceIcon:'layers-1.27/cryptown-source.png',files:files.map(file=>({file:'layers-1.28/'+file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex')}))};
 fs.writeFileSync(path.join(__dirname,'provenance.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1;});
