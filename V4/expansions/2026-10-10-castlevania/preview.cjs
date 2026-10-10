'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),scope=require('./scope.json'),out=path.join(__dirname,'preview-proof');
fs.mkdirSync(out,{recursive:true});
const dest=fs.mkdtempSync(path.join(os.tmpdir(),'kalistar-castlevania-preview-'));
const env={...process.env,GIT_INDEX_FILE:path.join(dest,'isolated-index'),GIT_LFS_SKIP_SMUDGE:'1'};
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',env,maxBuffer:32*1024*1024}).trim();
const parent=git(['rev-parse','HEAD']);
git(['read-tree',parent]);
git(['-c','core.longpaths=true','checkout-index','--all','--prefix='+dest.replaceAll('\\','/')+'/']);
fs.unlinkSync(env.GIT_INDEX_FILE);
for(const file of scope){
 const source=path.join(root,file),target=path.join(dest,file);
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.cpSync(source,target,{recursive:true,filter:p=>!p.endsWith('.psd')&&!p.includes(path.sep+'preview-proof')&&!p.includes(path.sep+'browser-proof')});
}
const workflow=require('./workflow.cjs')(root);
fs.writeFileSync(path.join(dest,'.github/workflows/pages.yml'),workflow);
const patterns=[...workflow.matchAll(/--include="([^"]+)"/g)].map(m=>m[1]).filter(s=>!s.includes('$('));
patterns.push(execFileSync(process.execPath,['V4/deploy/build.cjs','--lfs-paths'],{cwd:dest,encoding:'utf8',maxBuffer:8*1024*1024}).trim());
let hydrated=0;
for(const file of new Set(patterns.flatMap(s=>s.split(',')).flatMap(p=>fs.globSync(p,{cwd:dest})))){
 const target=path.join(dest,file),bytes=fs.readFileSync(target);
 if(bytes.length>1024)continue;
 const match=/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(bytes.toString());
 if(!match)continue;
 const oid=match[1],object=path.join(root,'.git/lfs/objects',oid.slice(0,2),oid.slice(2,4),oid);
 const source=fs.existsSync(object)?object:path.join(root,file);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),oid,'LFS '+file);
 fs.copyFileSync(source,target);hydrated++;
}
const report={parent,snapshot:dest,hydrated,passed:false,commands:[]};
fs.writeFileSync(path.join(out,'snapshot.json'),JSON.stringify(report,null,2)+'\n');
try{
 const section=workflow.slice(workflow.indexOf('- name: Check catalogue'),workflow.indexOf('- name: Build playable release'));
 const commands=[...section.matchAll(/^\s+node (.+)$/gm)].map(m=>m[1].trim().split(/\s+/));
 for(const [i,args]of commands.entries()){
  const log=execFileSync(process.execPath,args,{cwd:dest,encoding:'utf8',maxBuffer:16*1024*1024});
  fs.writeFileSync(path.join(out,'test-'+(i+1)+'.txt'),log);
  report.commands.push({args,passed:true});console.log((i+1)+'/'+commands.length+' passed');
 }
 const build=execFileSync(process.execPath,['V4/deploy/build.cjs'],{cwd:dest,encoding:'utf8',maxBuffer:8*1024*1024});
 fs.writeFileSync(path.join(out,'build.txt'),build);report.passed=true;
}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
