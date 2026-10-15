'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),files=["V4/site/index.html","V4/site/v4.css","V4/site/browser.test.cjs","V4/site/weapons.browser.test.cjs","V4/deploy/browser.test.cjs","V4/deploy/build.test.cjs"];
assert.equal(execFileSync('git',['rev-parse','--short=8','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'cf03b29c','Review concurrent releases first');
const escaped=v=>v.replaceAll('.',String.fromCharCode(92)+'.');
for(const relative of files){
 const file=path.join(root,relative),before=fs.readFileSync(file,'utf8');
 assert(before.includes('4.5.45')||before.includes(escaped('4.5.45')),relative);
 fs.writeFileSync(file,before.replaceAll('4.5.45','4.5.46').replaceAll(escaped('4.5.45'),escaped('4.5.46')));
 console.log(relative);
}
