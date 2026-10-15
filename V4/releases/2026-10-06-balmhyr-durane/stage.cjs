'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),git=(args,input)=>execFileSync('git',args,{cwd:root,input,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
const revision='V4/revisions/2026-10-06-balmhyr-durane';
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
assert.equal(git(['rev-parse','--short=8','HEAD']),'a9945d84','Concurrent release');
const paths=[revision,'V4/releases/2026-10-06-balmhyr-durane','V4/donnees/catalogue.json','V4/creations/49900802','V4/Illustrations/Variants_Balmhyr_Fist_03.png','V4/expansions/2026-10-06-second-edition-scenes/integration.test.cjs',
 'V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs'];
for(const n of ['Balmhyr_Durane_Poing-de-Fer_05.png','Balmhyr_Durane_Poing-de-Fer_06.png','provenance-05.json','provenance-06.json'])paths.push('V4/propositions/2026-10-06-balmhyr-durane/'+n);
const workflow='.github/workflows/pages.yml',scoped=p=>[...paths,workflow].some(s=>p===s||p.startsWith(s+'/'));
if(process.argv[2]!=='--check'){
 const prior=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
 if(process.argv[2]==='--refresh')assert(prior.every(scoped),'Preserve unrelated staged work');
 else assert.equal(prior.length,0,'Preserve unrelated staged work');
 git(['add','--',...paths]);
 // Keep the unrelated local performance workflow change out of this release.
 const before=execFileSync('git',['show','HEAD:'+workflow],{cwd:root,encoding:'utf8'});
 const line='          node --test V4/expansions/2026-10-06-second-edition-scenes/integration.test.cjs';
 assert(before.includes(line));const newline=before.includes('\r\n')?'\r\n':'\n';
 const after=before.replace(line,line+newline+'          node --test '+revision+'/revision.test.cjs');
 const hash=git(['hash-object','-w','--stdin'],after);git(['update-index','--cacheinfo','100644',hash,workflow]);
}
const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
assert(staged.every(scoped));console.log(JSON.stringify({staged:staged.length,scope:paths},null,2));
