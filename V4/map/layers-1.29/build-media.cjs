'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..');
const sources={kalistopolis:'layers-1.15/icons/kalistopolis.png',durane:'layers-1.15/icons/durane.png',arborium:'layers-1.15/icons/arborium.png',velane:'layers-1.19/velane-icon.png',vulkar:'layers-1.25/vulkar-source.png',cryptown:'layers-1.27/cryptown-source.png'};
(async()=>{
 const assets=[];
 const atlas=path.join(root,'V4/site/assets/ui/kalistar-atlas-1.29.webp');
 await sharp(path.join(root,'V4/map/kalistar-map-1.26-base.png')).webp({lossless:true}).toFile(atlas);assets.push(atlas);
 for(const [id,source] of Object.entries(sources)){
  const file=path.join(root,'V4/site/assets/map',id+'-v2.webp');
  await sharp(path.join(root,'V4/map',source)).trim().resize({height:192}).webp({lossless:true}).toFile(file);assets.push(file);
 }
 const report={version:'1.29',terrainSource:'V4/map/kalistar-map-1.26-base.png',terrainUnchanged:true,citiesBakedIntoRuntime:false,landmarkHeight:192,assets:assets.map(file=>({file:path.relative(root,file).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}))};
 assert.deepEqual(await sharp(atlas).ensureAlpha().raw().toBuffer(),await sharp(path.join(root,report.terrainSource)).ensureAlpha().raw().toBuffer());
 fs.writeFileSync(path.join(__dirname,'published-media.json'),JSON.stringify(report,null,2)+'\n');
 const api=require('../layers-1.15/tooling/node_modules/ag-psd');
 api.initializeCanvas(()=>{throw Error('Canvas not used');},(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}));
 const pixels=async input=>{const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {width:info.width,height:info.height,data:new Uint8ClampedArray(data)};};
 const raster=image=>sharp(Buffer.from(image.data),{raw:{width:image.width,height:image.height,channels:4}});
 const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'V4/site/map-view.js'),'utf8'),sandbox);
 const cities=JSON.parse(JSON.stringify(sandbox.window.KalistarMap.cities));
 const parent=api.readPsd(fs.readFileSync(path.join(__dirname,'../layers-1.28/kalistar-map-1.28.psd')),{useImageData:true,skipThumbnail:true});
 const names=new Set(cities.map(city=>city.name)),oldCities=parent.children.filter(layer=>names.has(layer.name));
 const terrain=parent.children.filter(layer=>!names.has(layer.name)),groups=[],overlays=[];
 for(const city of cities){
  const icon=await pixels(await sharp(path.join(root,'V4/site/assets/map',city.id+'-v2.webp')).resize({height:city.symbolSize}).png().toBuffer());
  const left=Math.round(city.x-icon.width/2),top=Math.round(city.y-icon.height/2);
  const outline=await pixels(await raster(icon).extend({top:4,bottom:4,left:4,right:4,background:'#00000000'}).png().toBuffer());
  for(let i=0;i<outline.data.length;i+=4){outline.data[i]=236;outline.data[i+1]=214;outline.data[i+2]=174;}
  const edge=await pixels(await raster(outline).dilate(1).png().toBuffer());
  const dark={...outline,data:new Uint8ClampedArray(outline.data)};
  for(let i=0;i<dark.data.length;i+=4){dark.data[i]=37;dark.data[i+1]=24;dark.data[i+2]=14;dark.data[i+3]=Math.round(dark.data[i+3]*.85);}
  const shadow=await pixels(await raster(dark).blur(1.3).png().toBuffer());
  const label=await pixels(await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="150" height="28"><text x="75" y="19" text-anchor="middle" font-family="Georgia" font-size="17" font-weight="bold" font-style="italic" fill="#28170e" stroke="#f2dbad" stroke-width="2" paint-order="stroke fill">'+city.name+'</text></svg>')).png().toBuffer());
  const labelTop=top+icon.height+4;
  const group={name:city.name,opened:true,children:[
   {name:city.name+' - Ombre',left:left-4,top:top-2,imageData:shadow},
   {name:city.name+' - Filet parchemin',left:left-4,top:top-4,imageData:edge},
   {name:city.name+' - Embleme',left,top,imageData:icon},
   {name:city.name+' - Nom editable',left:city.x-75,top:labelTop,imageData:label,text:{text:city.name,transform:[1,0,0,1,city.x,labelTop+19],shapeType:'point',antiAlias:'smooth',style:{font:{name:'Georgia-BoldItalic'},fontSize:17,fillColor:{r:40,g:23,b:14},fillFlag:true,strokeFlag:true,strokeColor:{r:242,g:219,b:173},outlineWidth:2,fillFirst:false},paragraphStyle:{justification:'center'}}}
  ]};groups.push(group);for(const layer of group.children)overlays.push({input:await raster(layer.imageData).png().toBuffer(),left:layer.left,top:layer.top});
 }
 const preview=await sharp(path.join(root,report.terrainSource)).composite(overlays).png().toBuffer();
 fs.writeFileSync(path.join(__dirname,'kalistar-map-1.29-preview.png'),preview);
 parent.children=[...terrain,{name:'Anciennes villes 1.28 - Preservees',hidden:true,children:oldCities},...groups];parent.imageData=await pixels(preview);
 fs.writeFileSync(path.join(__dirname,'kalistar-map-1.29.psd'),api.writePsdBuffer(parent,{generateThumbnail:false}));
 const reopened=api.readPsd(fs.readFileSync(path.join(__dirname,'kalistar-map-1.29.psd')),{useImageData:true,skipThumbnail:true});
 assert.deepEqual(reopened.imageData.data,parent.imageData.data);
 for(let i=0;i<terrain.length;i++)assert.deepEqual(reopened.children[i],terrain[i]);
 assert.deepEqual(reopened.children[terrain.length].children,oldCities);
 const verification={terrainUnchanged:true,oldCityLayersPreserved:true,independentSymbolsAndNames:true,psdRoundTrip:true,nativePhotoshopTested:false,citiesBakedIntoRuntime:false};
 fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(verification,null,2)+'\n');
 const files=['build-media.cjs','kalistar-map-1.29-preview.png','kalistar-map-1.29.psd','verification.json','published-media.json'];
 fs.writeFileSync(path.join(__dirname,'provenance.json'),JSON.stringify({version:'1.29',parentVersion:'1.28',generator:'deterministic city layer export; responsive runtime symbols',files:files.map(file=>({file:'layers-1.29/'+file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex')}))},null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
