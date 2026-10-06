'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const files=['V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs'];
for(const relative of files){
 const file=path.join(root,relative),before=fs.readFileSync(file,'utf8');
 const after=before.replaceAll('4.5.25','4.5.26').replaceAll('4\\.5\\.25','4\\.5\\.26');
 assert.notEqual(before,after,'Expected version not found: '+relative);
 fs.writeFileSync(file,after);console.log(relative);
}
