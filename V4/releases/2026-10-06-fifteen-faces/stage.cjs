'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const git=(args,input)=>execFileSync('git',args,{cwd:root,input,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
const home='V4/expansions/2026-10-06-fifteen-faces',set=require('../../expansions/2026-10-06-fifteen-faces/set.json');
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
assert.equal(git(['rev-parse','--short=8','HEAD']),'f488fdd5','Concurrent release');
const paths=[home,'V4/releases/2026-10-06-fifteen-faces','V4/donnees/catalogue.json',
 'V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs','V4/site/rhinoz-weapon.test.cjs'];
for(const c of set.cards){paths.push('V4/creations/'+c.id,'V4/Illustrations/'+c.art);paths.push('V4/Illustrations/Faces_'+c.key[0].toUpperCase()+c.key.slice(1)+'_01.png');}
const workflow='.github/workflows/pages.yml';
if(process.argv[2]!=='--check'){
 assert.equal(git(['diff','--cached','--name-only']),'','Preserve staged work');
 git(['add','--',...new Set(paths)]);
 // Stage only this batch's workflow entry, retaining unrelated local edits.
 const before=execFileSync('git',['show','HEAD:'+workflow],{cwd:root,encoding:'utf8'});
 const line='          node --test V4/expansions/2026-10-06-cryptown-scythe/integration.test.cjs';
 const newline=before.includes('\r\n')?'\r\n':'\n';assert(before.includes(line));
 const after=before.replace(line,line+newline+'          node --test '+home+'/integration.test.cjs '+home+'/accent-typography.test.cjs');
 const hash=git(['hash-object','-w','--stdin'],after);git(['update-index','--cacheinfo','100644',hash,workflow]);
}
paths.push(workflow);
const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
assert.deepEqual(staged.filter(p=>!paths.some(scope=>p===scope||p.startsWith(scope+'/'))),[],'Unexpected staged scope');
console.log(JSON.stringify({staged:staged.length,scope:paths},null,2));
