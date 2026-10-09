'use strict';
const L=require('../../atelier/lib.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs'),R=require('../../atelier/designer-render.cjs'),base=require('./build.cjs');
const {fs,path,assert,write,hash}=L,home=__dirname;
async function main(){return B.locked(async()=>{
 await base.stable();
 const set=require('./set.json'),keys=process.argv.slice(2);
 assert(keys.length&&keys.length<=4);assert.equal(new Set(keys).size,keys.length);
 for(const key of keys){
  assert(set.cards.some(c=>c.key===key),'Known card');
  for(const n of ['card.psd','card.png','render/native.json'])assert(!fs.existsSync(path.join(home,'cards',key,n)),'Preserve existing output '+key+'/'+n);
 }
 const request=path.join(home,'resume-request.json');write(request,{keys});
 const requestHash=await hash(request);
 const result=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',path.join(home,'resume.ps1')],path.join(home,'resume-'+keys[0]+'.log'));
 assert.equal(await hash(request),requestHash);await base.stable();
 write(path.join(home,'resumed-'+keys[0]+'.json'),{keys,inputManifestHash:await hash(path.join(home,'before.json')),requestHash,result});
 return result;
});}
main().then(console.log).catch(e=>{console.error(e);process.exitCode=1;});
