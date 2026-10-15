'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=process.cwd(),version=process.argv[2];
assert(/^4\.6\.\d+$/.test(version),'Explicit coordinated version required');
const release='V4/releases/2026-10-14-v'+version;
const out=path.join(root,release,'qa');fs.mkdirSync(out,{recursive:true});
const git=args=>execFileSync('git',['-c','filter.lfs.process=','-c','filter.lfs.required=false',...args],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,GIT_LFS_SKIP_SMUDGE:'1'}}).trim();
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
const files=git(['diff','--cached','--name-only']).split(/\r?\n/).filter(Boolean);
const allowed=['V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs','V4/site/map-view.js','V4/site/map-view.test.cjs','V4/site/map-view.browser.test.cjs','V4/map/versions.json','V4/map/DIRECTION_ARTISTIQUE.md','V4/map/kalistar-map-1.30-base.png','V4/site/assets/ui/kalistar-atlas-1.30.webp','V4/site/assets/map/woodland-v1.webp','V4/site/assets/map/woodland-v2.webp','docs/GUIDE_REPRISE.md'];
const own=file=>allowed.includes(file)||file.startsWith('V4/map/layers-1.30/')||file.startsWith(release+'/');
assert(files.length>20&&files.every(own),'Unexpected or incomplete staged scope');
const prefix=path.join(os.tmpdir(),'kalistar-map-'+version.replaceAll('.','')+'-');
const previous=process.argv.includes('--reuse')?JSON.parse(fs.readFileSync(path.join(out,'publication.json'),'utf8')):null;
const dest=previous?.snapshot||fs.mkdtempSync(prefix),tree=git(['write-tree']);
assert(dest.startsWith(prefix)&&!fs.lstatSync(dest).isSymbolicLink(),'Only the owned snapshot may be reused');
if(previous){
  assert.equal(previous.parent,git(['rev-parse','HEAD']));
  const changed=git(['diff','--name-only',previous.tree,tree]).split(/\r?\n/).filter(Boolean);
  assert(changed.every(own),'Foreign snapshot changes');
  if(changed.length)git(['checkout-index','--force','--prefix='+dest.replaceAll('\\','/')+'/','--',...changed]);
}else git(['-c','core.longpaths=true','checkout-index','--all','--prefix='+dest.replaceAll('\\','/')+'/']);
if(!fs.existsSync(path.join(dest,'.git')))execFileSync('git',['-c','init.defaultBranch=qa','init','--quiet'],{cwd:dest});
const workflow=fs.readFileSync(path.join(dest,'.github/workflows/pages.yml'),'utf8');
const globs=[...workflow.matchAll(/--include="([^"]+)"/g)].map(match=>match[1]).filter(value=>!value.includes('$('));
globs.push(execFileSync(process.execPath,['V4/deploy/build.cjs','--lfs-paths'],{cwd:dest,encoding:'utf8',maxBuffer:8*1024*1024}).trim());
globs.push('V4/map/layers-1.30/**','V4/map/kalistar-map-1.30-base.png','V4/map/kalistar-map-1.26-base.png','V4/map/layers-1.29/**');
let hydrated=0;
for(const file of new Set(globs.flatMap(value=>value.split(',')).flatMap(pattern=>fs.globSync(pattern,{cwd:dest})))){
  const target=path.join(dest,file);if(!fs.statSync(target).isFile())continue;
  const bytes=fs.readFileSync(target);if(bytes.length>1024)continue;
  const match=/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(bytes.toString());if(!match)continue;
  const oid=match[1],object=path.join(root,'.git/lfs/objects',oid.slice(0,2),oid.slice(2,4),oid),source=fs.existsSync(object)?object:path.join(root,file);
  assert(fs.existsSync(source),'Missing LFS '+file);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),oid,'LFS identity '+file);
  fs.copyFileSync(source,target);hydrated++;
}
const report={version,tree,parent:git(['rev-parse','HEAD']),snapshot:dest,hydrated,files,passed:false,tests:0,commands:[]};
fs.writeFileSync(path.join(out,'snapshot.json'),JSON.stringify(report,null,2)+'\n');
try{
  const section=workflow.slice(workflow.indexOf('- name: Check catalogue'),workflow.indexOf('- name: Build playable release'));
  const commands=[...section.matchAll(/^\s+node (.+)$/gm)].map(match=>match[1].trim().split(/\s+/));assert(commands.length>60);
  commands.push(['--test','V4/map/layers-1.30/map.test.cjs','V4/map/layers-1.29/map.test.cjs']);
  for(const [index,args]of commands.entries()){
    let log;try{log=execFileSync(process.execPath,args,{cwd:dest,encoding:'utf8',maxBuffer:16*1024*1024});}catch(error){fs.writeFileSync(path.join(out,'failed-test.txt'),String(error.stdout||'')+String(error.stderr||''));throw error;}
    const tests=Number(log.match(/(?:# |\u2139 )tests (\d+)/)?.[1]||0);report.tests+=tests;report.commands.push({args,passed:true,tests});console.log((index+1)+'/'+commands.length+' passed: '+args.at(-1));
  }
  fs.writeFileSync(path.join(out,'build.txt'),execFileSync(process.execPath,['V4/deploy/build.cjs'],{cwd:dest,encoding:'utf8',maxBuffer:8*1024*1024}));
  const manifest=JSON.parse(fs.readFileSync(path.join(dest,'V4/deploy/dist/release.json'),'utf8'));
  report.build={cards:manifest.cards,files:manifest.assets.length,bytes:manifest.bytes,mib:manifest.bytes/1024**2};report.passed=true;
}finally{fs.writeFileSync(path.join(out,'publication.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,tests:report.tests,snapshot:dest,tree,build:report.build}));
