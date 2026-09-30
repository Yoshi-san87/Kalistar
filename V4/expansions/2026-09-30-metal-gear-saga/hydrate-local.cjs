'use strict';
// Restore LFS pointers only when an existing local source matches the committed object.
const L=require('../../atelier/lib.cjs'),{fs,path,ROOT,hash}=L;
const originalRoot=path.resolve(ROOT,'../..');
async function main(){
 const restored=[],missing=[];
 async function visit(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
   if(['.git','node_modules','dist','verification'].includes(e.name))continue;
   const f=path.join(dir,e.name);if(e.isSymbolicLink())continue;if(e.isDirectory()){await visit(f);continue;}
   if(fs.statSync(f).size>200)continue;
   const body=fs.readFileSync(f,'utf8');if(!body.startsWith('version https://git-lfs.github.com/spec/v1'))continue;
   const match=body.match(/oid sha256:([a-f0-9]{64})/);if(!match)continue;
   const rel=path.relative(ROOT,f),source=path.join(originalRoot,rel);
   if(fs.existsSync(source)&&await hash(source)===match[1]){fs.copyFileSync(source,f);restored.push(rel);}else missing.push(rel);
  }
 }
 for(const d of ['V3','V4'])await visit(path.join(ROOT,d));
 console.log(JSON.stringify({restored:restored.length,missing},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
