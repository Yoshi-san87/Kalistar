'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'qa');fs.mkdirSync(out,{recursive:true});
const git=(args,options={})=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,...options}).trim();
const prefix=path.join(os.tmpdir(),'kalistar-lineup-4617-'),reuse=process.argv.includes('--reuse');
const previous=reuse?JSON.parse(fs.readFileSync(path.join(out,'snapshot.json'),'utf8')):null;
const dest=previous?.snapshot||fs.mkdtempSync(prefix),tree=git(['write-tree']);
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
const options={env:{...process.env,GIT_LFS_SKIP_SMUDGE:'1'}};
if(reuse){
  assert(dest.startsWith(prefix)&&!fs.lstatSync(dest).isSymbolicLink(),'Only this release owned snapshot may be reused');
  assert.equal(previous.parent,git(['rev-parse','HEAD']),'Snapshot parent changed');
  const changed=git(['diff','--name-only',previous.tree,tree]).split(/\r?\n/).filter(Boolean);
  const source=['V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs','V4/site/lineup-intro.js','V4/site/lineup-mobile.browser.test.cjs'];
  assert(changed.every(file=>source.includes(file)||file.startsWith('V4/releases/2026-10-10-v4.6.17/')||file.startsWith('V4/revisions/2026-10-10-mobile-lineup/')),'Unexpected change to reused snapshot');
  if(changed.length)git(['checkout-index','--force','--prefix='+dest.replaceAll('\\','/')+'/','--',...changed],options);
}else git(['-c','core.longpaths=true','checkout-index','--all','--prefix='+dest.replaceAll('\\','/')+'/'],options);
const workflow=fs.readFileSync(path.join(dest,'.github/workflows/pages.yml'),'utf8');
const globs=[...workflow.matchAll(/--include="([^"]+)"/g)].map(m=>m[1]).filter(s=>!s.includes('$('));
globs.push(execFileSync(process.execPath,['V4/deploy/build.cjs','--lfs-paths'],{cwd:dest,encoding:'utf8',maxBuffer:8*1024*1024}).trim());
let hydrated=0;
for(const file of new Set(globs.flatMap(s=>s.split(',')).flatMap(pattern=>fs.globSync(pattern,{cwd:dest})))){
  const target=path.join(dest,file),bytes=fs.readFileSync(target);if(bytes.length>1024)continue;
  const match=/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(bytes.toString());if(!match)continue;
  const oid=match[1],object=path.join(root,'.git/lfs/objects',oid.slice(0,2),oid.slice(2,4),oid),source=fs.existsSync(object)?object:path.join(root,file);
  assert(fs.existsSync(source),'Missing LFS '+file);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),oid,'LFS identity '+file);
  fs.copyFileSync(source,target);hydrated++;
}
const report={tree,parent:git(['rev-parse','HEAD']),snapshot:dest,hydrated,passed:false,tests:0,commands:[]};
fs.writeFileSync(path.join(out,'snapshot.json'),JSON.stringify(report,null,2)+'\n');
try{
  const section=workflow.slice(workflow.indexOf('- name: Check catalogue'),workflow.indexOf('- name: Build playable release'));
  const commands=[...section.matchAll(/^\s+node (.+)$/gm)].map(m=>m[1].trim().split(/\s+/));
  if(!commands.some(args=>args.includes('V4/site/performance.test.cjs')))commands.push(['--test','V4/site/performance.test.cjs']);
  assert(commands.length>30,'Expected complete publication suite');
  for(const [i,args]of commands.entries()){
    const log=execFileSync(process.execPath,args,{cwd:dest,encoding:'utf8',maxBuffer:16*1024*1024});
    fs.writeFileSync(path.join(out,'tests-'+String(i+1).padStart(2,'0')+'.txt'),log);
    const total=Number(log.match(/(?:# |\u2139 )tests (\d+)/)?.[1]||0);report.tests+=total;report.commands.push({args,passed:true,tests:total});
    console.log((i+1)+'/'+commands.length+' passed: '+args.at(-1));
  }
  const build=execFileSync(process.execPath,['V4/deploy/build.cjs'],{cwd:dest,encoding:'utf8',maxBuffer:8*1024*1024});
  fs.writeFileSync(path.join(out,'build.txt'),build);report.passed=true;
}finally{fs.writeFileSync(path.join(out,'publication.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,tests:report.tests,snapshot:dest,tree}));
