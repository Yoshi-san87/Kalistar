'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),qa=path.join(__dirname,'qa');
const git=args=>execFileSync('git',['-c','filter.lfs.process=','-c','filter.lfs.required=false',...args],{cwd:root,maxBuffer:8*1024*1024});
const report=JSON.parse(fs.readFileSync(path.join(qa,'publication.json'),'utf8'));assert(report.passed);
assert.equal(git(['rev-parse','HEAD']).toString().trim(),report.parent,'Concurrent release changed HEAD');
const files=git(['diff','--cached','--name-only']).toString().trim().split(/\r?\n/),allowed=new Set(report.files);
const checked=[];
for(const file of files){
  if(file.startsWith('V4/releases/2026-10-13-v4.6.50/'))continue;
  assert(allowed.has(file),'Foreign staged file '+file);
  const bytes=git(['show',':'+file]);assert(bytes.equals(fs.readFileSync(path.join(report.snapshot,file))),'Staged source differs from verified snapshot '+file);
  checked.push({file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
for(const suite of ['collection','filters','navigation','pages'])assert(JSON.parse(fs.readFileSync(path.join(qa,suite,'passed.json'),'utf8')).passed,suite);
const result={passed:true,parent:report.parent,tests:report.tests,checked,initialTree:report.tree,stagedTree:git(['write-tree']).toString().trim(),browserSuites:['collection','filters','navigation','pages']};
fs.writeFileSync(path.join(qa,'staging.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
