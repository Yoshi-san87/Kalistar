'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'5d46d783d67a9ea9cf81c4cf0676293effde2c6f','Concurrent release: recheck before choosing a number');
const files=['V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs'];
for(const relative of files){
 const file=path.join(root,relative),before=fs.readFileSync(file,'utf8');
 assert(before.includes('4.5.51')||before.includes('4\\.5\\.51'),relative);
 fs.writeFileSync(file,before.replaceAll('4.5.51','4.5.52').replaceAll('4\\.5\\.51','4\\.5\\.52'));
}
console.log('Release labels and assertions: 4.5.52. Native card edition and saves remain V4.');

