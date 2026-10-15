'use strict';
const L=require('../../../atelier/lib.cjs');
const {fs,path,sharp,assert,read,write,hash,ROOT}=L;
const file=n=>path.join(__dirname,n);
const generated={MGS1:'exec-e68560af-01ee-45f8-b4c3-761289284ce9.png',MGS2:'exec-1c444250-202c-4f98-8f97-7f4a3228d66e.png',MGS4:'exec-08091d20-d269-4c6c-addb-3f8ac5e2f67e.png'};
async function main(){
  const geometry=read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json')).factions.Chroma;
  const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
  const packedOutline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png');
  const alpha=p=>sharp(p).ensureAlpha().extractChannel(3).raw().toBuffer();
  const entries=[];
  for(const id of Object.keys(generated)){
    const source=file('source-'+id+'.png');
    const request=read(file(id+'.request.json'));
    const reference=request.referenced_image_paths[1],referenceName='reference-'+id+'.png';
    if(!fs.existsSync(file(referenceName)))fs.copyFileSync(reference,file(referenceName));
    const texture=await sharp(source).flatten({background:'#f5f4f1'}).resize(geometry.width,geometry.height,{fit:'fill'}).png().toBuffer();
    const flag=await sharp(texture).composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
    const packedGeometry={left:672,top:829,width:98,height:223};
    const packed=await sharp(flag).extract({left:packedGeometry.left-geometry.left,top:packedGeometry.top-geometry.top,width:98,height:223}).png().toBuffer();
    assert.deepEqual(await alpha(flag),await alpha(outline));
    assert.deepEqual(await alpha(packed),await alpha(packedOutline));
    fs.writeFileSync(file('flag-'+id+'.png'),flag);fs.writeFileSync(file('flag-'+id+'-packed.png'),packed);
    const entry={id,label:'Metal Gear Solid '+id.slice(3),flag:'flag-'+id+'.png',packedFlag:'flag-'+id+'-packed.png',packedGeometry,sourceHash:await hash(source),flagHash:await hash(file('flag-'+id+'.png'))};
    entries.push(entry);write(file(id+'.provenance.json'),{tool:'built-in imagegen',request,generatedFile:generated[id],sourceHash:entry.sourceHash,reference:referenceName,referenceHash:await hash(file(referenceName)),originalPreserved:true,approvedOutlineAlphaUnchanged:true});
  }
  write(file('factions.json'),{schemaVersion:1,officialCollaboration:false,factions:entries});
  await sharp({create:{width:327,height:230,channels:4,background:'#242424'}}).composite(entries.map((e,i)=>({input:file(e.flag),left:109*i,top:0}))).png().toFile(file('preview.png'));
  console.log('3 flags ready; original native outline alpha unchanged.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
