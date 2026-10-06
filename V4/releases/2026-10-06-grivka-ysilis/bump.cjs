'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
assert.equal(execFileSync('git',['rev-parse','--short=8','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'791d287e','Review concurrent releases first');
for(const relative of ["V4/site/index.html","V4/site/v4.css","V4/site/browser.test.cjs","V4/site/weapons.browser.test.cjs","V4/deploy/browser.test.cjs","V4/deploy/build.test.cjs"]){
 const file=path.join(root,relative),before=fs.readFileSync(file,'utf8');
 const escaped=v=>v.replaceAll('.',String.fromCharCode(92)+'.');
 assert(before.includes('4.5.44')||before.includes(escaped('4.5.44')),relative);
 const after=before.replaceAll('4.5.44','4.5.45').replaceAll(escaped('4.5.44'),escaped('4.5.45'));
 fs.writeFileSync(file,after);console.log(relative);
}
