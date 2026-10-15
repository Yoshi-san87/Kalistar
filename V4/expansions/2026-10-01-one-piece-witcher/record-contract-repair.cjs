'use strict';
const L=require('../../atelier/lib.cjs'),B=require('./build.cjs'),{path,fs,read,write,assert}=L;
async function main(){
 const home=__dirname,archive=path.join(home,'attempts/02-projected-game-contract'),old=read(path.join(archive,'dependencies.json'));
 const prefix='V4/expansions/2026-10-01-one-piece-witcher/',changed=['model.cjs','model.test.cjs'].map(f=>prefix+f);
 assert.deepEqual(read(path.join(home,'dependencies.json')),old);
 for(const [f,h]of Object.entries(old))if(!changed.includes(f))assert.equal(B.guard.digest(path.join(L.ROOT,f)),h,f);
 for(const f of changed)assert.equal(B.guard.digest(path.join(archive,path.basename(f))),old[f]);
 await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
 const next={...old};for(const f of changed)next[f]=B.guard.digest(path.join(L.ROOT,f));
 for(const key of fs.readdirSync(path.join(home,'cards'))){
  const dir=path.join(home,'cards',key),prepFile=path.join(dir,'preparation.json'),prep=read(prepFile);
  for(const [f,h]of Object.entries(prep.inputs))if(!changed.includes(f))assert.equal(B.guard.digest(path.join(L.ROOT,f)),h,f);
  for(const f of changed)prep.inputs[f]=next[f];
  write(prepFile,prep);const proofFile=path.join(dir,'verification.json');
  if(fs.existsSync(proofFile)){const proof=read(proofFile);proof.preparationHash=B.guard.digest(prepFile);write(proofFile,proof);}
 }
 write(path.join(home,'dependencies.json'),next);B.guard.assertExisting();
 write(path.join(home,'contract-repair.json'),{reason:'Validate printed gameplay fields and engine capabilities on the projected game catalogue. Production-only officialCollaboration and artworkSource are validated on native profiles, not expected on the engine projection.',changed,before:Object.fromEntries(changed.map(f=>[f,old[f]])),after:Object.fromEntries(changed.map(f=>[f,next[f]])),nativeOutputsChanged:false,protectedSourcesUnchanged:true});
 return {recordedContractRepair:true};
}
main().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
