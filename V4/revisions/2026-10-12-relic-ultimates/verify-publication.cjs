'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'qa'));
const git=(args,options={})=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,...options}).trim();
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
const tree=git(['write-tree']),parent=git(['rev-parse','HEAD']),snapshot=fs.mkdtempSync(path.join(os.tmpdir(),'kalistar-relics-'));
fs.mkdirSync(out,{recursive:true});
git(['-c','core.longpaths=true','checkout-index','--all','--prefix='+snapshot.replaceAll('\\','/')+'/'],{env:{...process.env,GIT_LFS_SKIP_SMUDGE:'1'}});
const workflow=fs.readFileSync(path.join(snapshot,'.github/workflows/pages.yml'),'utf8');
const includes=[...workflow.matchAll(/--include="([^"]+)"/g)].map(m=>m[1]).filter(x=>!x.includes('$('));
includes.push(execFileSync(process.execPath,['V4/deploy/build.cjs','--lfs-paths'],{cwd:snapshot,encoding:'utf8',maxBuffer:8*1024*1024}).trim());
let hydrated=0;
for(const file of new Set(includes.flatMap(s=>s.split(',')).flatMap(pattern=>fs.globSync(pattern,{cwd:snapshot})))){
  const target=path.join(snapshot,file),bytes=fs.readFileSync(target);if(bytes.length>1024)continue;
  const pointer=/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(bytes.toString());if(!pointer)continue;
  const oid=pointer[1],object=path.join(root,'.git/lfs/objects',oid.slice(0,2),oid.slice(2,4),oid),source=fs.existsSync(object)?object:path.join(root,file);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),oid,file+' LFS identity');
  fs.copyFileSync(source,target);hydrated++;
}
const report={tree,parent,snapshot,hydrated,passed:false,tests:0,commands:[]};
fs.writeFileSync(path.join(out,'snapshot.json'),JSON.stringify(report,null,2)+'\n');
try{
  const block=workflow.slice(workflow.indexOf('- name: Check catalogue'),workflow.indexOf('- name: Build playable release'));
  const commands=[...block.matchAll(/^\s+node (.+)$/gm)].map(m=>m[1].trim().split(/\s+/));
  assert(commands.some(args=>args.includes('V4/site/relic-ultimates-integrity.test.cjs')),'Missing ultimate integrity CI coverage');
  for(const [i,args]of commands.entries()){
    let log;
    try{log=execFileSync(process.execPath,args,{cwd:snapshot,encoding:'utf8',maxBuffer:16*1024*1024});}
    catch(error){fs.writeFileSync(path.join(out,'failed-publication-test.txt'),String(error.stdout||'')+String(error.stderr||''));throw error;}
    const tests=Number(log.match(/(?:# |\u2139 )tests (\d+)/)?.[1]||0);report.tests+=tests;report.commands.push({args,tests,passed:true});
    console.log((i+1)+'/'+commands.length+' '+args.at(-1));
  }
  const build=execFileSync(process.execPath,['V4/deploy/build.cjs'],{cwd:snapshot,encoding:'utf8',maxBuffer:8*1024*1024});
  fs.writeFileSync(path.join(out,'build.json'),build);report.passed=true;
}finally{fs.writeFileSync(path.join(out,'publication.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
