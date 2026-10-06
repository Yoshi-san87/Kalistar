'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const git=(args,input)=>execFileSync('git',args,{cwd:root,input,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
const parent=git(['rev-parse','v4.5.48^{commit}']);
assert.equal(git(['rev-parse','HEAD']),parent,'Concurrent release: review before proceeding');
assert.equal(git(['ls-remote','origin','refs/heads/main']).split(/\s/)[0],parent,'Remote release changed');
assert.equal(git(['diff','--cached','--name-only']),'','Index must be free');
const versions=['V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs'];
const escaped=v=>v.replaceAll('.',String.fromCharCode(92)+'.');
const bump=(text,relative)=>{
 let next=text.replaceAll('4.5.48','4.5.49').replaceAll(escaped('4.5.48'),escaped('4.5.49'));
 if(relative==='V4/site/weapons.browser.test.cjs')next=next.replaceAll(escaped('4.5.47'),escaped('4.5.49'));
 return next;
};
const changes=versions.map(relative=>{
 const file=path.join(root,relative),working=fs.readFileSync(file,'utf8');
 const committed=execFileSync('git',['show','HEAD:'+relative],{cwd:root,encoding:'utf8'});
 assert(bump(committed,relative)!==committed,relative+' missing committed version');
 assert(bump(working,relative)!==working,relative+' missing working version');
 return {relative,file,working,committed};
});
const authored=['V4/propositions/2026-10-06-grivka-okami/Rhovan-03.png','V4/propositions/2026-10-06-grivka-okami/provenance-03.json','V4/docs/PEUPLES_ET_REGIONS.md','V4/releases/2026-10-06-rhovan-spear/README.md','V4/releases/2026-10-06-rhovan-spear/prepare-release.cjs'];
git(['add','--',...authored]);
for(const {relative,file,working,committed} of changes){
 fs.writeFileSync(file,bump(working,relative));
 // Stage only the version substitution; preserve unrelated working edits.
 const hash=git(['hash-object','-w','--stdin'],bump(committed,relative));
 git(['update-index','--cacheinfo','100644',hash,relative]);
}
const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
assert(staged.every(p=>[...authored,...versions].includes(p)));
console.log(JSON.stringify({version:'4.5.49',parent,staged},null,2));
