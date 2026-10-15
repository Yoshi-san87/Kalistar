'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),git=(args,input)=>execFileSync('git',args,{cwd:root,input,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
const home='V4/expansions/2026-10-06-second-edition-scenes',set=require('../../expansions/2026-10-06-second-edition-scenes/set.json');
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
assert.equal(git(['rev-parse','--short=8','HEAD']),'5e8e115b','Concurrent release');
const paths=[home,'V4/releases/2026-10-06-second-editions','V4/donnees/catalogue.json','V4/site/weapon-bearers.test.cjs',
 'V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs'];
for(const c of set.cards)paths.push('V4/creations/'+c.id,'V4/Illustrations/'+c.art);
const workflow='.github/workflows/pages.yml';
if(process.argv[2]!=='--check'){
 const current=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
 if(process.argv[2]==='--refresh')assert.deepEqual(current.filter(p=>![...paths,workflow].some(scope=>p===scope||p.startsWith(scope+'/'))),[],'Preserve staged work');
 else assert.equal(current.length,0,'Preserve staged work');
 git(['add','--',...paths]);
 // Only the new test entry is staged, preserving the unrelated local workflow edit.
 const before=execFileSync('git',['show','HEAD:'+workflow],{cwd:root,encoding:'utf8'});
 const line='          node --test V4/expansions/2026-10-06-fifteen-faces/integration.test.cjs V4/expansions/2026-10-06-fifteen-faces/accent-typography.test.cjs';
 const newline=before.includes('\r\n')?'\r\n':'\n';assert(before.includes(line));
 const after=before.replace(line,line+newline+'          node --test '+home+'/integration.test.cjs');
 const hash=git(['hash-object','-w','--stdin'],after);git(['update-index','--cacheinfo','100644',hash,workflow]);
}
paths.push(workflow);
const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
assert.deepEqual(staged.filter(p=>!paths.some(scope=>p===scope||p.startsWith(scope+'/'))),[]);
console.log(JSON.stringify({staged:staged.length,scope:paths},null,2));
