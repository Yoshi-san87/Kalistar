'use strict';
const L=require('../../atelier/lib.cjs'),M=require('./model.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,home=__dirname;
async function audit(keys){
 const set=M.validateSet(read(path.join(home,'set.json'))),cards=[];
 if(keys){assert(keys.length>0);assert(keys.every(k=>set.cards.some(c=>c.key===k)));}
 for(const c of set.cards.filter(c=>!keys||keys.includes(c.key))){
  const art=path.join(ROOT,M.artPath(c));assert(fs.existsSync(art),'Missing artwork '+c.key);
  let source=path.join(home,'art-prompts',c.key+'.json'),request;
  if(fs.existsSync(source)){
   request=read(source);if(request.activeRevision){source=path.join(ROOT,request.activeRevision);request=read(source);}
   assert.equal(request.selectedOutput.path,M.artPath(c));assert.equal(request.selectedOutput.sha256,await hash(art));
   assert(request.prompt&&request.prompt.length>100);assert(request.generationMethod.includes('image_gen'));
   for(const [f,digest] of Object.entries(request.referenceHashes))assert.equal(await hash(path.join(ROOT,f)),digest);
   if(request.selectedOutput.retainedOriginal)assert.equal(await hash(path.join(ROOT,request.selectedOutput.retainedOriginal)),await hash(art));
  }else{
   source=path.join(ROOT,'V4/collaborations/one-piece-assets-01/provenance.json');
   assert(fs.existsSync(source),'Waiting for collaborating artist provenance');
   const provenance=read(source);request=provenance.assets.find(a=>a.id===c.key);
   assert(request,'Missing collaborating artist record '+c.key);
   assert.equal(request.output,M.artPath(c));assert.equal(request.sha256,await hash(art));
   const promptsFile=path.join(path.dirname(source),request.promptFile),prompts=read(promptsFile);
   assert.equal(await hash(promptsFile),provenance.requestHash);
   const [section,id]=request.promptKey.split('.'),prompt=prompts[section].find(p=>p.id===id);
   assert(prompt&&prompt.prompt.length>100,'Missing exact generation prompt '+c.key);
   assert.equal(L.crypto.createHash('sha256').update(prompt.prompt).digest('hex'),request.promptSha256);
   for(const ref of request.references)assert.equal(await hash(path.join(ROOT,ref.file)),ref.sha256);
   assert.equal(await hash(path.join(ROOT,request.retainedOriginal)),await hash(art));
   const entry=provenance.entries.find(e=>e.id===request.entryId);assert(entry.selected&&entry.tool==='built-in image_gen');
  }
  const meta=await sharp(art).metadata();assert(meta.width>=737&&meta.height>=921);assert(meta.width/meta.height>.7&&meta.width/meta.height<.9);
  cards.push({key:c.key,id:c.id,path:M.artPath(c),sha256:await hash(art),width:meta.width,height:meta.height,provenance:path.relative(ROOT,source).replace(/\\/g,'/')});
 }
 return {passed:true,count:cards.length,cards,visualApproval:'Separate parent review; hashes do not imply approval'};
}
module.exports={audit};
if(require.main===module)audit().then(r=>{write(path.join(home,'art-audit.json'),r);console.log(JSON.stringify(r,null,2));}).catch(e=>{console.error(e);process.exitCode=1;});
