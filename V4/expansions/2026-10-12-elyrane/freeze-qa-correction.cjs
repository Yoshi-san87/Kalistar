'use strict';
const L=require('../../atelier/lib.cjs'),{fs,path,read,hash,write,assert}=L,home=__dirname;
async function main(){
 const original=path.join(home,'before.json'),next=path.join(home,'before-02.json');
 assert(!fs.existsSync(next),'Never replace a frozen manifest');
 const before=read(original);
 for(const [file,expected]of Object.entries(before.inputs))assert.equal(await hash(path.join(L.ROOT,file)),expected);
 const inputs={...before.inputs};
 for(const name of ['fixtures-02.cjs','model-02.cjs','build-02.cjs']){
  const file=path.join(home,name);inputs[path.relative(L.ROOT,file).replaceAll('\\','/')]=await hash(file);
 }
 write(next,{...before,inputs,correction:{previousManifestHash:await hash(original),reason:'The initial QA fixture copied a dated dependency incorrectly. Versioned drivers correct the import. Initial inputs, illustration, profile, native PSD/PNG and proofs stay untouched.'}});
 console.log('QA driver correction frozen additively; native production untouched.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
