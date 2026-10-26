'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,OUT,read,save,hash}=require('./sprite-v2-production.cjs');
const {audit,validate}=require('./sprite-template-v2.cjs');
const sharp=require(path.join(process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','sharp'));
async function review(){
  const {CLIPS,bodyHeight,frameRect}=await import('../animation-kit/template-v2.mjs');
  const library=read(path.join(OUT,'library.json')),production=read(path.join(OUT,'production.json'));
  assert.equal(library.entries.length,10,'The requested review lot contains ten characters');
  assert.equal(new Set(library.entries.map(e=>e.characterId)).size,10);
  const actors=[],lineup=[],motions={run:[],physical:[],death:[]};
  const qa=path.join(OUT,'qa');fs.mkdirSync(qa,{recursive:true});
  for(const [row,entry] of library.entries.entries()){
    const file=path.join(OUT,entry.manifest),actor=read(file),directory=path.dirname(file),authoring=read(path.join(directory,'authoring.json'));
    const checked=await validate(file);assert.deepEqual(checked.errors,[],entry.characterId);
    assert.equal(actor.status,'review');assert.equal(actor.bodyPixels,bodyHeight(actor.heightCm));assert.equal(actor.pages.length,4);
    assert.equal(actor.reviews.sockets,false);assert.equal(actor.landmarks.crown,null,'Never invent approved anatomy points');
    const frames=[];
    for(const [page,p] of actor.pages.entries()){
      assert.equal(hash(path.join(directory,p.file)),p.sha256);
      const result=await audit(path.join(directory,p.file));assert.deepEqual(result.errors,[]);
      frames.push(...result.frames.map(f=>({...f,index:page*16+f.index})));
    }
    for(const [id,clip] of Object.entries(CLIPS)){
      const count=new Set(clip.frames.map(f=>frames[f.index].pixelHash)).size;
      assert.ok(count>1,entry.characterId+' '+id+' is not a static repeated drawing');
      if(id==='run')assert.equal(count,6,entry.characterId+' requires six distinct running drawings');
    }
    for(const source of authoring.sourcePages)assert.equal(hash(path.join(OUT,source.file)),source.sha256);
    assert.ok(authoring.palette.colors<=127);assert.equal(authoring.frames.length,64);
    assert.ok(authoring.frames.every(f=>f.root.x===160&&f.root.y===272));
    const take=async index=>{const rect=frameRect(index);return sharp(path.join(directory,actor.pages[rect.page].file)).extract({left:rect.x,top:rect.y,width:320,height:320}).png().toBuffer();};
    lineup.push({input:await take(0),left:row%5*320,top:Math.floor(row/5)*320});
    for(const [id,items] of Object.entries(motions))for(const [col,f] of CLIPS[id].frames.entries())items.push({input:await take(f.index),left:col*320,top:row*320});
    const origin=production.entries.find(e=>e.characterId===entry.characterId);
    assert.equal(origin.modelId,actor.modelId);
    actors.push({characterId:entry.characterId,name:entry.name,heightCm:actor.heightCm,targetBodyPixels:actor.bodyPixels,frames:64,pages:4,palette:authoring.palette.colors,manifest:entry.manifest,maxColors:Math.max(...frames.map(f=>f.colors)),minPixels:Math.min(...frames.map(f=>f.pixels)),reviews:actor.reviews});
  }
  await sharp({create:{width:1600,height:640,channels:4,background:'#17251e'}}).composite(lineup).png().toFile(path.join(qa,'lineup.png'));
  for(const [id,items] of Object.entries(motions))await sharp({create:{width:CLIPS[id].frames.length*320,height:3200,channels:4,background:'#17251e'}}).composite(items).png().toFile(path.join(qa,id+'-contact.png'));
  const result={status:'technical-review-pass',characters:actors.length,frames:640,pages:40,generatedWith:'image_gen.imagegen',nativeConversion:'One source-page calibration, shared palette, binary alpha, fixed roots; no runtime scaling.',notCertified:['artistic approval','frame-by-frame anatomical anchors','hand sockets and front-finger masks','production game integration'],actors};
  save(path.join(qa,'native-audit.json'),result);console.log(JSON.stringify(result,null,2));return result;
}
module.exports={review};
if(require.main===module)review().catch(error=>{console.error(error);process.exitCode=1;});
