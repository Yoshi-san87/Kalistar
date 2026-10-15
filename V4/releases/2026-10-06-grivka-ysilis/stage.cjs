'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),git=(args,input)=>execFileSync('git',args,{cwd:root,input,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
assert.equal(git(['rev-parse','--short=8','HEAD']),'791d287e','Concurrent release');
const paths=[
  "V4/site/factions.js",
  "V4/site/factions.test.cjs",
  "V4/site/boot.js",
  "V4/site/equipment.js",
  "V4/site/weapons.js",
  "V4/site/collaborations.js",
  "V4/atelier/game-catalog.cjs",
  "V4/atelier/game-catalog.test.cjs",
  "V4/expansions/2026-10-06-fifteen-faces/model.cjs",
  "V4/docs/PEUPLES_ET_REGIONS.md",
  "docs/GUIDE_REPRISE.md",
  "V4/propositions/2026-10-06-grivka-okami",
  "V4/revisions/2026-10-06-ysilis",
  "V4/releases/2026-10-06-grivka-ysilis",
  "V4/site/index.html",
  "V4/site/v4.css",
  "V4/site/browser.test.cjs",
  "V4/site/weapons.browser.test.cjs",
  "V4/deploy/browser.test.cjs",
  "V4/deploy/build.test.cjs"
];
const workflow='.github/workflows/pages.yml',scoped=p=>[...paths,workflow].some(s=>p===s||p.startsWith(s+'/'));
if(process.argv[2]!=='--check'){
 const prior=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
 if(process.argv[2]==='--refresh')assert(prior.every(scoped),'Preserve unrelated staged work');else assert.equal(prior.length,0,'Preserve unrelated staged work');
 git(['add','--',...paths]);
 const before=execFileSync('git',['show','HEAD:'+workflow],{cwd:root,encoding:'utf8'}),line='          node --test V4/site/navigation.test.cjs';
 assert(before.includes(line));const newline=before.includes('\r\n')?'\r\n':'\n';
 const after=before.replace(line,line+newline+'          node --test V4/site/factions.test.cjs');
 const hash=git(['hash-object','-w','--stdin'],after);git(['update-index','--cacheinfo','100644',hash,workflow]);
}
const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
assert(staged.every(scoped));console.log(JSON.stringify({staged:staged.length,scope:paths},null,2));
