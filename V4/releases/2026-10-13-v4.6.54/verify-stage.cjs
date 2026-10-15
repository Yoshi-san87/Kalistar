'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),qa=path.join(__dirname,'qa');
const git=args=>execFileSync('git',['-c','filter.lfs.process=','-c','filter.lfs.required=false',...args],{cwd:root,maxBuffer:16*1024*1024});
const report=JSON.parse(fs.readFileSync(path.join(qa,'publication.json'),'utf8'));assert(report.passed);
assert.equal(git(['rev-parse','HEAD']).toString().trim(),report.parent,'Concurrent release changed HEAD');
const files=git(['diff','--cached','--name-only']).toString().trim().split(/\r?\n/),allowed=new Set(report.files),checked=[];
const release='V4/releases/2026-10-13-v4.6.54/';
for(const f of report.files)if(!f.startsWith(release))assert(files.includes(f),'Verified file unstaged '+f);
for(const file of files){
 if(file.startsWith(release))continue;assert(allowed.has(file),'Foreign staged file '+file);
 const bytes=git(['show',':'+file]),verified=fs.readFileSync(path.join(report.snapshot,file));
 const lfs=/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)/.exec(bytes.toString());
 if(lfs&&!bytes.equals(verified)){
  assert.equal(verified.length,Number(lfs[2]),'LFS size '+file);
  assert.equal(crypto.createHash('sha256').update(verified).digest('hex'),lfs[1],'LFS identity '+file);
 }else assert(bytes.equals(verified),'Staged source differs from verified snapshot '+file);
 checked.push({file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
for(const suite of ['game','gallery'])assert(JSON.parse(fs.readFileSync(path.join(root,'V4/expansions/2026-10-13-fourteen-new-voices/qa',suite,'results.json'),'utf8')).passed);
const result={passed:true,parent:report.parent,tests:report.tests,checked,initialTree:report.tree,stagedTree:git(['write-tree']).toString().trim()};
fs.writeFileSync(path.join(qa,'staging.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,files:checked.length,tests:report.tests}));
