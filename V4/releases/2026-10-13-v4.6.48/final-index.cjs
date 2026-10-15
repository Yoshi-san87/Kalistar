'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),report=require('./qa/publication.json'),snapshot=report.snapshot;
const git=(args,options={})=>execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024,...options});
assert(report.passed);assert.equal(git(['rev-parse','HEAD']).toString().trim(),report.parent);
git(['diff','--cached','--check']);
const paths=git(['diff','--cached','--name-only','-z']).toString().split('\0').filter(Boolean),checked=[];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const browserProof=require('./qa/browser/results.json');assert(browserProof.passed);
assert.equal(sha(fs.readFileSync(path.join(snapshot,'V4/deploy/dist/release.json'))),browserProof.buildHash);
for(const name of paths){
 if(name.startsWith('V4/releases/2026-10-13-v4.6.48/'))continue;
 const before=fs.readFileSync(path.join(snapshot,name)),staged=git(['show',':'+name]);
 if(name==='V4/propositions/2026-10-13-froz-general/README.md'){
  // Only a trailing blank line in this new provenance note was removed.
  assert.equal(before.toString().trimEnd(),staged.toString().trimEnd());checked.push(name);continue;
 }
 // The browser driver was verified separately against this exact built release.
 if(name==='V4/expansions/2026-10-13-general-barok/browser.test.cjs'){
  assert.equal(sha(staged),browserProof.driverHash);checked.push(name);continue;
 }
 const pointer=staged.length<1024&&/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(staged.toString());
 assert(pointer?(before.equals(staged)||sha(before)===pointer[1]):before.equals(staged),'Tested snapshot differs from staged '+name);
 checked.push(name);
}
const html=git(['show',':V4/site/index.html']).toString(),driver=git(['show',':V4/site/weapons.browser.test.cjs']).toString();
assert(html.includes('VERSION 4.6.48'));assert(driver.includes('VERSION 4.6.48'));
const result={passed:true,tree:git(['write-tree']).toString().trim(),parent:report.parent,checked,
 note:'Runtime and Froz sources match the tested publication snapshot.'};
fs.writeFileSync(path.join(__dirname,'qa/final-index.json'),JSON.stringify(result,null,2)+'\n');
console.log('PASS: '+checked.length+' staged source files match the tested snapshot');
