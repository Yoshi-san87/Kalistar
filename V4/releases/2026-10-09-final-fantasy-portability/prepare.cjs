'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const config=require('./release.json'),root=path.resolve(__dirname,'../../..');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}).trim();
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
assert.equal(git(['branch','--show-current']),'main');assert.equal(git(['rev-parse','HEAD']),config.parent);
assert.equal(git(['diff','--cached','--name-only']),'','Preserve the shared index');
assert.equal(git(['ls-remote','origin','refs/heads/main']).split(/\s/)[0],config.parent);
if(process.argv.includes('--stage')){
 const checks=require('./verification/isolated/tests.json').results;
 assert(checks.filter(r=>!r.args.includes('V4/deploy/build.cjs')).every(r=>r.exitCode===0));
 assert(require('../../revisions/2026-10-09-umaro-macako/browser-proof/results.json').passed);
 assert.equal(require('../../creations/49901114/profile.json').race,'MACAKO');
 const files=[...config.scope,...config.versionFiles];git(['add','--',...files]);
 const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
 assert(staged.every(f=>files.some(p=>f===p||f.startsWith(p+'/'))));
 console.log(JSON.stringify({version:config.version,staged:staged.length}));
}else{
 assert.equal(git(['diff','--name-only','--',...config.versionFiles]),'','Preserve concurrent edits');
 for(const f of config.versionFiles){
  const full=path.join(root,f),before=fs.readFileSync(full,'utf8'),escaped=s=>s.replaceAll('.','\\.');
  const after=before.replaceAll(config.previousVersion,config.version).replaceAll(escaped(config.previousVersion),escaped(config.version));
  assert.notEqual(after,before);fs.writeFileSync(full,after);
 }
 console.log(JSON.stringify({version:config.version,files:config.versionFiles.length}));
}
