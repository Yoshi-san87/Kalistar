'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
assert.equal(git(['rev-parse','--short=8','HEAD']),'cf03b29c','Concurrent release');
const paths=[
  "V4/propositions/2026-10-06-grivka-okami/Grivka-drapeau-02.png",
  "V4/propositions/2026-10-06-grivka-okami/Rhovan-02.png",
  "V4/propositions/2026-10-06-grivka-okami/Eyska-02.png",
  "V4/propositions/2026-10-06-grivka-okami/provenance-02.json",
  "V4/docs/PEUPLES_ET_REGIONS.md",
  "V4/site/index.html",
  "V4/site/v4.css",
  "V4/site/browser.test.cjs",
  "V4/site/weapons.browser.test.cjs",
  "V4/deploy/browser.test.cjs",
  "V4/deploy/build.test.cjs",
  "V4/releases/2026-10-06-grivka-forest"
];
const scoped=p=>paths.some(s=>p===s||p.startsWith(s+'/'));
const prior=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
if(process.argv[2]==='--refresh')assert(prior.every(scoped),'Preserve unrelated staging');else assert.equal(prior.length,0,'Index must be free');
git(['add','--',...paths]);
const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
assert(staged.every(scoped));console.log(JSON.stringify(staged,null,2));
