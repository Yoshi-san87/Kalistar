'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),config=require('./release.json');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
assert.equal(git(['branch','--show-current']),'main');
assert.equal(git(['rev-parse','HEAD']),config.parent);
assert.equal(git(['diff','--cached','--name-only']),'');
if(process.argv.includes('--stage')){
 assert.equal(git(['ls-remote','origin','refs/heads/main']).split(/\s/)[0],config.parent);
 const roots=[config.proposalDirectory,'V4/releases/2026-10-09-final-fantasy-proposals',...config.versionFiles];
 git(['add','--',...roots]);
 const files=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
 assert(files.every(f=>roots.some(r=>f===r||f.startsWith(r+'/'))));
 assert(!files.some(f=>f.startsWith('V4/creations/')||f==='V4/donnees/catalogue.json'));
 console.log(JSON.stringify({version:config.version,staged:files.length,catalogueChanged:false}));
}else{
 assert.equal(git(['diff','--name-only','--',...config.versionFiles]),'','Preserve concurrent edits');
 const changes=config.versionFiles.map(name=>{
  const file=path.join(root,name),before=fs.readFileSync(file,'utf8'),escape=s=>s.replaceAll('.','\\.');
  assert(before.includes(config.previousVersion)||before.includes(escape(config.previousVersion)));
  const after=before.replaceAll(config.previousVersion,config.version).replaceAll(escape(config.previousVersion),escape(config.version));
  assert.notEqual(after,before);return {file,after};
 });
 for(const {file,after}of changes)fs.writeFileSync(file,after);
 console.log(JSON.stringify({version:config.version,files:changes.length}));
}
