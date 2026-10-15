'use strict';
const L=require('../../atelier/lib.cjs'),M=require('./model.cjs'),set=require('./set.json');
const {path,read,write,hash,assert}=L;
async function main(){
 const source=path.join(L.ROOT,set.sourceSet),plan=read(path.join(source,'prompts.json')),proof=read(path.join(source,'verification.json'));
 const entries=[];
 for(const c of M.validateSet(set).cards){
  const original=plan.items.find(i=>i.number===c.number),selected=proof.selected.find(i=>i.number===c.number);
  assert.equal(original.slug,c.key);assert.equal(selected.file,c.art);
  assert.equal(await hash(path.join(source,c.art)),selected.sha256);
  entries.push({number:c.number,key:c.key,id:c.id,characterId:c.characterId,artworkSource:M.artPath(c),sha256:selected.sha256,width:selected.width,height:selected.height,prompt:original.prompt,userApproved:'2026-10-08',illustrationModified:false});
 }
 write(path.join(__dirname,'art-selection.json'),{date:'2026-10-08',sourceSet:set.sourceSet,originalTool:plan.tool,referenceFilesViewed:plan.referenceFilesViewed,entries});
 console.log('Eleven approved original illustrations verified byte-identical.');
}
main().catch(e=>{console.error(e);process.exitCode=1});

