'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),root=path.resolve(__dirname,'../../..');
assert.equal(execFileSync('git',['rev-parse','--short=8','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'5e8e115b','Review any concurrent release first');
for(const relative of ['V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs']){
 const file=path.join(root,relative),before=fs.readFileSync(file,'utf8');
 // The prior Story release left three browser assertions at 4.5.33.
 let after=before;
 for(const old of ['4.5.33','4.5.34']){
  after=after.replaceAll(old,'4.5.35').replaceAll(old.replaceAll('.',String.fromCharCode(92)+'.'),'4.5.35'.replaceAll('.',String.fromCharCode(92)+'.'));
 }
 assert(after.includes('4.5.35')||after.includes('4.5.35'.replaceAll('.',String.fromCharCode(92)+'.')),'Version missing: '+relative);
 if(after!==before)fs.writeFileSync(file,after);console.log(relative);
}
