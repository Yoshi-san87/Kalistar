'use strict';
const {fs,path,crypto,ROOT,read,write,sharp,assert}=require('../../atelier/lib.cjs');
const home=__dirname,hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function record(key,source,revision){
 const card=read(path.join(home,'set.json')).cards.find(c=>c.key===key);assert(card);
 assert(['luffy','zoro','sanji','nami','usopp','chopper-small','chopper-heavy'].includes(key),'Other artist owns this asset');
 const requestFile=path.join(home,'art-prompts',key+(revision?'-'+revision:'')+'.json'),request=read(requestFile);
 const target=path.join(ROOT,'V4/Illustrations',card.art),archive=path.join(home,'generated',key+(revision?'-'+revision:'-initial')+'.png');
 fs.mkdirSync(path.dirname(archive),{recursive:true});
 if(fs.existsSync(archive))assert.equal(hash(archive),hash(source),'Do not overwrite an archived generation');
 else fs.copyFileSync(source,archive);
 if(fs.existsSync(target)&&hash(target)!==hash(source))assert(revision,'Replacement needs an explicit revision');
 fs.copyFileSync(source,target);assert.equal(hash(source),hash(target));
 request.status='selected-awaiting-native-QA';request.generationMethod='built-in image_gen.imagegen';
 request.selectedOutput={path:'V4/Illustrations/'+card.art,sha256:hash(target),generatedSource:source,retainedOriginal:path.relative(ROOT,archive).replace(/\\/g,'/'),originalByteIdentity:true};
 request.referenceHashes=Object.fromEntries(request.references.map(f=>[f,hash(path.join(ROOT,f))]));
 const meta=await sharp(target).metadata();request.dimensions={width:meta.width,height:meta.height};request.nativeQA='pending';
 write(requestFile,request);
 if(revision){const primaryFile=path.join(home,'art-prompts',key+'.json'),primary=read(primaryFile);primary.status='superseded-by-authorized-face-revision';primary.activeRevision=path.relative(ROOT,requestFile).replace(/\\/g,'/');write(primaryFile,primary);}
 return {key,...request.selectedOutput,...request.dimensions};
}
module.exports={record};
if(require.main===module)record(...process.argv.slice(2)).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
