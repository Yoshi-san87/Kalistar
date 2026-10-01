'use strict';
const L=require('../../atelier/lib.cjs'),B=require('./build.cjs'),{path,fs,read,write,assert}=L;
async function main(){
 const home=__dirname,attempt=process.argv[2]||'03-test-public-api';assert(/^(03-test-public-api|04-portable-projection)$/.test(attempt));
 const old=read(path.join(home,'attempts',attempt,'dependencies.json')),f='V4/expansions/2026-10-01-one-piece-witcher/model.test.cjs';
 assert.deepEqual(read(path.join(home,'dependencies.json')),old);
 for(const [key,h]of Object.entries(old))if(key!==f)assert.equal(B.guard.digest(path.join(L.ROOT,key)),h);
 assert.equal(B.guard.digest(path.join(home,'attempts',attempt,'model.test.cjs')),old[f]);
 await L.protectedCheck();const h=B.guard.digest(path.join(L.ROOT,f));
 for(const key of fs.readdirSync(path.join(home,'cards'))){const dir=path.join(home,'cards',key),file=path.join(dir,'preparation.json'),p=read(file);
  for(const [input,hash]of Object.entries(p.inputs))if(input!==f)assert.equal(B.guard.digest(path.join(L.ROOT,input)),hash);
  p.inputs[f]=h;write(file,p);const v=path.join(dir,'verification.json');if(fs.existsSync(v)){const proof=read(v);proof.preparationHash=B.guard.digest(file);write(v,proof);}
 }
 write(path.join(home,'dependencies.json'),{...old,[f]:h});B.guard.assertExisting();
 write(path.join(home,'test-repair-'+attempt+'.json'),{reason:attempt==='04-portable-projection'?'Use the real portable buildCatalog API with authored gameplay profiles, without importing the Windows-only native designer runtime in Linux CI.':'Exercise the public async buildCatalog API rather than its unexported internal profileCard helper.',source:f,before:old[f],after:h,nativeOutputsChanged:false});
 return {recordedTestRepair:true};
}
main().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
