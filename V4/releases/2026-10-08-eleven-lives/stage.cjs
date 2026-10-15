'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),git=(args,extra={})=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,...extra}).trim();
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
assert.equal(git(['rev-parse','HEAD']),'5d46d783d67a9ea9cf81c4cf0676293effde2c6f','Concurrent release');
const set=require('../../expansions/2026-10-08-eleven-lives/set.json');
const paths=[
 'V4/expansions/2026-10-08-eleven-lives',
 'V4/releases/2026-10-08-eleven-lives',
 'V4/donnees/catalogue.json','V4/atelier/designer-core.cjs','V4/atelier/designer-assets/race-extensions.json','V4/atelier/designer-assets/extensions/race-OKAMI.png',
 'V4/site/assets/races/OKAMI.png','V4/site/assets/factions/Grivka.png','V4/site/collaborations.js','V4/site/factions.test.cjs','V4/site/weapons-arsenal.test.cjs',
 'V4/docs/PEUPLES_ET_REGIONS.md','docs/GUIDE_REPRISE.md',
 'V4/site/arborium-weapons.test.cjs','V4/site/arborium-weapons.browser.test.cjs','V4/site/weapon-bearers.test.cjs','V4/site/weapon-bearers.browser.test.cjs',
 'V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs',
 ...set.cards.map(c=>set.sourceSet+'/'+c.art),...set.cards.map(c=>'V4/creations/'+c.id)
];
const workflow='.github/workflows/pages.yml';
const scoped=p=>p===workflow||paths.some(s=>p===s||p.startsWith(s+'/'));
const prior=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
if(process.argv[2]==='--refresh')assert(prior.every(scoped),'Preserve unrelated staging');else assert.equal(prior.length,0,'Index must be free');
git(['add','--',...paths]);
// Preserve the unrelated worktree performance test addition; stage only this set's CI line.
const before=git(['show','HEAD:'+workflow])+'\n';
const anchor='          node --test V4/expansions/2026-10-06-second-edition-scenes/integration.test.cjs\n';
assert(before.includes(anchor));
const next=before.replace(anchor,anchor+'          node --test V4/expansions/2026-10-08-eleven-lives/integration.test.cjs\n');
const blob=git(['hash-object','-w','--stdin'],{input:next});
git(['update-index','--cacheinfo','100644',blob,workflow]);
const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
assert(staged.every(scoped));
console.log(JSON.stringify({files:staged.length,release:'4.5.52',target:'Yoshi-san87/Kalistar',unrelatedWorkflowChangePreserved:true}));
