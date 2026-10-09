'use strict';
const L=require('../../atelier/lib.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs'),M=require('./model.cjs');
const {fs,path,read,write,assert,hash}=L;
async function main(){return B.locked(async()=>{
 await require('./build.cjs').stable();
 const complete=[],pending=[];
 for(const c of require('./set.json').cards){
  const dir=path.join(__dirname,'cards',c.key);
  if(!fs.existsSync(path.join(dir,'render/native.json'))){pending.push(c.key);continue;}
  const p=read(path.join(dir,'profile.json'));M.validateProfile(p,c);
  const proof=await B.verifyNative(dir,p),native=read(path.join(dir,'render/native.json'));
  require('../../collaborations/nier-pilot-01/typography.cjs').verify(native);
  assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
  complete.push({key:c.key,id:c.id,proof});
 }
 await require('./build.cjs').stable();
 const result={published:false,inputManifestHash:await hash(path.join(__dirname,'before.json')),complete,pending,blocker:'Photoshop scratch disk full; no source cleanup authorized.',feiLongFinalArtwork:'V4/propositions/2026-10-09-street-fighter/images/fei-long-v3.png'};
 write(path.join(__dirname,'partial-checks.json'),result);
 return {verified:complete.map(c=>c.key),pending};
});}
main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
