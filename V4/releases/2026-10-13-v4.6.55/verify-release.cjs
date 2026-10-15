'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'qa');fs.mkdirSync(out,{recursive:true});
const git=args=>execFileSync('git',['-c','filter.lfs.process=','-c','filter.lfs.required=false',...args],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,GIT_LFS_SKIP_SMUDGE:'1'}}).trim();
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
const files=git(['diff','--cached','--name-only']).split(/\r?\n/).filter(Boolean);
const allowed=["V4/site/index.html","V4/site/v4.css","V4/site/browser.test.cjs","V4/site/weapons.browser.test.cjs","V4/deploy/browser.test.cjs","V4/deploy/build.test.cjs",".github/workflows/pages.yml","V4/donnees/catalogue.json","V4/AGENTS.md","V4/scripts/stable/white-weapon-component.cjs","V4/expansions/2026-10-13-fourteen-new-voices/index.html"];
const ids=["49902601","49902602","49902603","49902604","49902605","49902606","49902607","49902608","49902609","49902610","49902611","49902612","49902613","49902614"];
const own=f=>allowed.includes(f)||f.startsWith('V4/revisions/2026-10-13-voices-weapon-glyphs/')||f.startsWith('V4/releases/2026-10-13-v4.6.55/')||ids.some(id=>f.startsWith('V4/creations/'+id+'/'));
assert(files.every(own),'Foreign work staged');
const prefix=path.join(os.tmpdir(),'kalistar-glyphs-4655-'),previous=process.argv.includes('--reuse')?JSON.parse(fs.readFileSync(path.join(out,'publication.json'),'utf8')):null;
const dest=previous?.snapshot||fs.mkdtempSync(prefix),tree=git(['write-tree']);
assert(dest.startsWith(prefix)&&!fs.lstatSync(dest).isSymbolicLink(),'Only this release owned snapshot can be reused');
if(previous){
  assert.equal(previous.parent,git(['rev-parse','HEAD']));
  const changed=git(['diff','--name-only',previous.tree,tree]).split(/\r?\n/).filter(Boolean);
  assert(changed.every(own),'Unexpected snapshot changes');
  if(changed.length)git(['checkout-index','--force','--prefix='+dest.replaceAll('\\','/')+'/','--',...changed]);
}else git(['-c','core.longpaths=true','checkout-index','--all','--prefix='+dest.replaceAll('\\','/')+'/']);
// The LFS clone-policy test needs a repository, confined to this disposable snapshot.
if(!fs.existsSync(path.join(dest,'.git')))execFileSync('git',['-c','init.defaultBranch=qa','init','--quiet'],{cwd:dest});
const workflow=fs.readFileSync(path.join(dest,'.github/workflows/pages.yml'),'utf8');
const globs=[...workflow.matchAll(/--include="([^"]+)"/g)].map(m=>m[1]).filter(s=>!s.includes('$('));
globs.push(execFileSync(process.execPath,['V4/deploy/build.cjs','--lfs-paths'],{cwd:dest,encoding:'utf8',maxBuffer:8*1024*1024}).trim());
let hydrated=0;
for(const file of new Set(globs.flatMap(s=>s.split(',')).flatMap(pattern=>fs.globSync(pattern,{cwd:dest})))){
  const target=path.join(dest,file),bytes=fs.readFileSync(target);if(bytes.length>1024)continue;
  const match=/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(bytes.toString());if(!match)continue;
  const oid=match[1],object=path.join(root,'.git/lfs/objects',oid.slice(0,2),oid.slice(2,4),oid),source=fs.existsSync(object)?object:path.join(root,file);
  assert(fs.existsSync(source),'Missing LFS '+file);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),oid,'LFS identity '+file);fs.copyFileSync(source,target);hydrated++;
}
const report={tree,parent:git(['rev-parse','HEAD']),snapshot:dest,hydrated,files,passed:false,tests:0,commands:[]};
fs.writeFileSync(path.join(out,'snapshot.json'),JSON.stringify(report,null,2)+'\n');
try{
  const section=workflow.slice(workflow.indexOf('- name: Check catalogue'),workflow.indexOf('- name: Build playable release'));
  const commands=[...section.matchAll(/^\s+node (.+)$/gm)].map(m=>m[1].trim().split(/\s+/));assert(commands.length>60);
  for(const [i,args]of commands.entries()){
    let log;try{log=execFileSync(process.execPath,args,{cwd:dest,encoding:'utf8',maxBuffer:16*1024*1024});}catch(error){fs.writeFileSync(path.join(out,'failed-test.txt'),String(error.stdout||'')+String(error.stderr||''));throw error;}
    const tests=Number(log.match(/(?:# |\u2139 )tests (\d+)/)?.[1]||0);report.tests+=tests;report.commands.push({args,passed:true,tests});console.log((i+1)+'/'+commands.length+' passed: '+args.at(-1));
  }
  fs.writeFileSync(path.join(out,'build.txt'),execFileSync(process.execPath,['V4/deploy/build.cjs'],{cwd:dest,encoding:'utf8',maxBuffer:8*1024*1024}));report.passed=true;
}finally{fs.writeFileSync(path.join(out,'publication.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,tests:report.tests,snapshot:dest,tree}));
