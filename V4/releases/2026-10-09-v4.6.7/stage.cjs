'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),config=require('./release.json');
const git=(args,extra={})=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,...extra}).trim();
assert.equal(git(['remote','get-url','origin']),config.repository);assert.equal(git(['branch','--show-current']),'main');
assert.equal(git(['rev-parse','HEAD']),config.parent);assert.equal(git(['rev-parse','origin/main']),config.parent);
const revision='V4/revisions/2026-10-09-gotham-equipment',release='V4/releases/2026-10-09-v4.6.7';
const media=require(path.join(root,revision,'media-provenance.json'));
const paths=[...config.scope,...config.versionFiles,...new Set(media.assets.flatMap(a=>[a.source,a.file])),
  ...['README.md','art-plan.json','generation.json','definitions-draft.json','selection.json','build-assets.cjs','media-provenance.json','qa-release'].map(p=>revision+'/'+p),
  ...['README.md','release.json','verify.cjs','stage.cjs','isolate.cjs','publication-workflow.cjs','public-smoke.cjs','verification/publication','verification/build.json','verification/snapshot.json'].map(p=>release+'/'+p)];
const workflow='.github/workflows/pages.yml',scoped=p=>p===workflow||p.startsWith(release+'/verification/')||paths.some(r=>p===r||p.startsWith(r+'/'));
const prior=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
if(process.argv.includes('--refresh'))assert(prior.every(scoped));else assert.equal(prior.length,0,'Preserve unrelated index');
assert(require('./verification/publication/tests.json').passed);
assert(require(path.join(root,revision,'qa-release/results.json')).passed);
git(['add','--',...paths.filter(p=>!config.versionFiles.includes(p))]);
// Shared UI files may contain a different task's work; stage only their version delta.
for(const file of config.versionFiles){
  const before=execFileSync('git',['show','HEAD:'+file],{cwd:root,encoding:'utf8'});
  let after=before;
  for(const [old,value] of [[config.previousVersion,config.version],[config.previousVersion.replaceAll('.','\\.'),config.version.replaceAll('.','\\.')]])after=after.split(old).join(value);
  assert.notEqual(after,before,'Missing previous version in '+file);
  const oid=git(['hash-object','-w','--stdin'],{input:after});git(['update-index','--cacheinfo','100644',oid,file]);
}
const blob=git(['hash-object','-w','--stdin'],{input:require('./publication-workflow.cjs')(root)});
git(['update-index','--cacheinfo','100644',blob,workflow]);
const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);assert(staged.every(scoped));
fs.writeFileSync(path.join(__dirname,'verification/stage.json'),JSON.stringify({version:config.version,parent:config.parent,files:staged,unrelatedChangesPreserved:true},null,2)+'\n');
git(['add','--',release+'/verification/stage.json']);
console.log(JSON.stringify({version:config.version,files:staged.length,repository:config.repository}));
