'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),config=require('./release.json');
const root=path.resolve(__dirname,'../../..'),release='V4/releases/2026-10-09-v4.6.9';
const git=(args,extra={})=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,...extra}).trim();
assert.equal(git(['remote','get-url','origin']),config.repository);assert.equal(git(['branch','--show-current']),'main');assert.equal(git(['rev-parse','HEAD']),config.parent);
const paths=[...config.scope,release],workflow='.github/workflows/pages.yml';
const scoped=p=>p===workflow||config.versionFiles.includes(p)||paths.some(x=>p===x||p.startsWith(x+'/'));
const prior=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
if(process.argv.includes('--refresh'))assert(prior.every(scoped));else assert.equal(prior.length,0);
git(['add','--',...paths]);
for(const f of config.versionFiles){
 const before=execFileSync('git',['show','HEAD:'+f],{cwd:root,encoding:'utf8'});
 const after=before.replaceAll(config.previousVersion,config.version).replaceAll(config.previousVersion.replaceAll('.','\\.'),config.version.replaceAll('.','\\.'));
 assert.notEqual(after,before);
 const oid=git(['hash-object','-w','--stdin'],{input:after});git(['update-index','--cacheinfo','100644',oid,f]);
}
const oid=git(['hash-object','-w','--stdin'],{input:require('./publication-workflow.cjs')(root)});
git(['update-index','--cacheinfo','100644',oid,workflow]);
const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);assert(staged.every(scoped));
fs.mkdirSync(path.join(__dirname,'qa'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'qa/stage.json'),JSON.stringify({version:config.version,parent:config.parent,files:staged,unrelatedChangesPreserved:true},null,2)+'\n');
git(['add','--',release+'/qa/stage.json']);console.log(JSON.stringify({files:staged.length,version:config.version}));
