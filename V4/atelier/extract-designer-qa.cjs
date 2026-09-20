const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=path.join(__dirname,'designer-assets');
const m=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
const label=(text,w,h=32)=>({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="8" y="23" fill="white" font-family="Arial" font-size="14">${text}</text></svg>`)});
async function scene(layers){return sharp({create:{width:897,height:1497,channels:4,background:'#15191b'}}).composite(layers.filter(Boolean).map(d=>({input:path.join(out,d.file),left:d.left,top:d.top}))).png().toBuffer();}
async function main(){
  const ids=[...Object.keys(m.effects.atk).map(id=>['atk',id]),...Object.keys(m.effects.def).map(id=>['def',id])];
  const tiles=[],contours=[];
  for(let col=0;col<ids.length;col++){
    const [side,id]=ids[col];tiles.push({...label(side+' '+id,150),left:col*150,top:0});
    for(let die=6;die>=1;die--){
      const d=m.effects[side][id][die],{data,info}=await sharp(path.join(out,d.file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      let radius=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=32)radius=Math.max(radius,Math.hypot(d.left+x+.5-d.center[0],d.top+y+.5-d.center[1]));
      assert.ok(radius<=d.safeRadius+1,'Contour outside rim: '+side+' '+id+' '+die);contours.push({side,id,die,radius,safeRadius:d.safeRadius});
      const base=side==='atk'?m.stats.atk.ELECTRO[die].physical:m.stats.def[die].effectBackground;
      const image=await scene([m.frame.electro,base,d]);
      const crop={left:Math.round(d.center[0])-72,top:Math.round(d.center[1])-72,width:144,height:144};
      tiles.push({input:await sharp(image).extract(crop).png().toBuffer(),left:col*150+3,top:(6-die)*150+35});
    }
  }
  await sharp({create:{width:ids.length*150,height:935,channels:4,background:'#15191b'}}).composite(tiles).png().toFile(path.join(out,'proof/effects-contact.png'));
  const elements=Object.keys(m.elements),familyTiles=[];
  for(let i=0;i<elements.length;i++){
    const element=elements[i],left=(i%5)*260,top=Math.floor(i/5)*290;
    familyTiles.push({...label(element,260),left,top});
    const frame=element==='ELECTRO'?m.frame.electro:m.frame;
    for(let mode=0;mode<2;mode++){
      const d=m.stats.atk[element][6][mode?'magic':'physical'];if(!d)continue;
      const card=await scene([frame,d]);
      familyTiles.push({input:await sharp(card).extract({left:48,top:47,width:192,height:192}).resize(124,124).png().toBuffer(),left:left+mode*130,top:top+35});
    }
    const card=await scene([frame,m.elements[element].branch,m.elements[element].crystal]);
    familyTiles.push({input:await sharp(card).extract({left:176,top:1116,width:536,height:160}).resize(252,75).png().toBuffer(),left:left+4,top:top+180});
  }
  await sharp({create:{width:1300,height:Math.ceil(elements.length/5)*290,channels:4,background:'#15191b'}}).composite(familyTiles).png().toFile(path.join(out,'proof/elements-contact.png'));
  fs.writeFileSync(path.join(out,'proof/optical-verification.json'),JSON.stringify({passed:true,count:contours.length,contours},null,2));
  console.log(JSON.stringify({passed:true,effects:contours.length,elements:elements.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
