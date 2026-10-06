'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
assert.equal(execFileSync('git',['rev-parse','--short=8','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'f488fdd5','A concurrent release must be reviewed first');
const files=['V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs'];
for(const relative of files){
 const file=path.join(root,relative),before=fs.readFileSync(file,'utf8');
 const after=before.replaceAll('4.5.31','4.5.32').replaceAll('4\\.5\\.31','4\\.5\\.32');
 assert.notEqual(before,after,'Expected prior version missing: '+relative);
 fs.writeFileSync(file,after);console.log(relative);
}
