'use strict';
const L=require('../../atelier/lib.cjs'),M=require('./model.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,home=__dirname;
async function main(){
 const set=M.validateSet(read(path.join(home,'set.json'))),cards=[];
 for(const c of set.cards){
  const file=path.join(home,'art-prompts',c.key+'.json'),p=read(file),generated=path.join(home,'art-prompts',c.key+'.generated.json');
  const art=path.join(ROOT,M.artPath(c));assert(fs.existsSync(art),'Missing final artwork '+c.key);
  if(fs.existsSync(generated)){
   const g=read(generated);assert(g.status.startsWith('selected'));assert.equal(g.selectedPath,M.artPath(c));
   assert.equal(await hash(g.generatedPath),await hash(art),'Generated original mismatch '+c.key);
   p.prompt=g.prompt;p.references=g.references;p.generationMethod='built-in image_gen.imagegen';p.status='selected-awaiting-card-QA';
   p.selectedOutput={path:M.artPath(c),sha256:await hash(art),originalByteIdentity:true,generatedSource:g.generatedPath};
   p.referenceHashes={};for(const f of p.references)p.referenceHashes[f]=await hash(path.join(ROOT,f));
   p.approval='Assistant visual QA only; no fabricated human approval; final native card QA pending';
   write(file,p);
  }
  assert.equal(p.generationMethod,'built-in image_gen.imagegen');assert.equal(p.selectedOutput.path,M.artPath(c));
  assert.equal(p.selectedOutput.sha256,await hash(art));assert(!p.prompt.includes('Subject and moment: undefined'));
  for(const f of p.references)assert.equal(p.referenceHashes[f],await hash(path.join(ROOT,f)));
  const meta=await sharp(art).metadata();assert(meta.width>=737&&meta.height>=921);assert(meta.width/meta.height>.7&&meta.width/meta.height<.9);
  cards.push({key:c.key,id:c.id,path:M.artPath(c),sha256:p.selectedOutput.sha256,width:meta.width,height:meta.height,status:p.status});
 }
 const result={passed:true,count:cards.length,generationMethod:'built-in image_gen.imagegen',cards,excludedLocalOnly:['V4/expansions/'+M.SET+'/rejected-jill1-subject-error.png']};
 write(path.join(home,'art-audit.json'),result);return result;
}
module.exports={main};if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
