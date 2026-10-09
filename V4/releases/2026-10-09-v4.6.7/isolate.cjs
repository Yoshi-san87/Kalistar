'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),dest=path.join(root,'paquets-transfert/qa-v4.6.7-staged');
const git=(args,options={})=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,...options}).trim();
assert(!fs.existsSync(dest),'Never overwrite an isolated source tree');fs.mkdirSync(dest,{recursive:true});
const tree=git(['write-tree']);
git(['-c','core.longpaths=true','checkout-index','--all','--prefix='+dest.replaceAll('\\','/')+'/'],{env:{...process.env,GIT_LFS_SKIP_SMUDGE:'1'}});
const workflow=fs.readFileSync(path.join(dest,'.github/workflows/pages.yml'),'utf8');
const globs=[...workflow.matchAll(/--include="([^"]+)"/g)].map(m=>m[1]).filter(s=>!s.includes('$('));
globs.push(execFileSync(process.execPath,['V4/deploy/build.cjs','--lfs-paths'],{cwd:dest,encoding:'utf8',maxBuffer:8*1024*1024}).trim());
let hydrated=0;
for(const file of new Set(globs.flatMap(s=>s.split(',')).flatMap(pattern=>fs.globSync(pattern,{cwd:dest})))){
  const target=path.join(dest,file),bytes=fs.readFileSync(target);if(bytes.length>1024)continue;
  const match=/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(bytes.toString());if(!match)continue;
  const oid=match[1],object=path.join(root,'.git/lfs/objects',oid.slice(0,2),oid.slice(2,4),oid);assert(fs.existsSync(object),'Missing LFS '+file);fs.copyFileSync(object,target);hydrated++;
}
fs.writeFileSync(path.join(__dirname,'verification/snapshot.json'),JSON.stringify({tree,parent:git(['rev-parse','HEAD']),hydrated,source:'paquets-transfert/qa-v4.6.7-staged'},null,2)+'\n');
console.log(JSON.stringify({tree,hydrated,dest}));
