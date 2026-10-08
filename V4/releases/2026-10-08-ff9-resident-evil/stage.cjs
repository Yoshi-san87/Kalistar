'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),git=(args,extra={})=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,...extra}).trim();
const config=require('./release.json'),ff9=require('../../expansions/2026-10-08-final-fantasy-ix/set.json'),re=require('../../revisions/2026-10-08-resident-evil-faces/plan.json');
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
assert.equal(git(['branch','--show-current']),'main');
assert.equal(git(['rev-parse','HEAD']),config.parent,'Concurrent release: recheck version');
assert.equal(git(['rev-parse','origin/main']),config.parent);
const roots=[
 'V4/releases/2026-10-08-ff9-resident-evil',
 'V4/expansions/2026-10-08-final-fantasy-ix','V4/propositions/2026-10-08-ff9',
 'V4/revisions/2026-10-08-ff9-art-direction','V4/revisions/2026-10-08-resident-evil-faces',
 'V4/atelier/designer-core.cjs','V4/atelier/designer-assets/race-extensions.json',
 'V4/donnees/catalogue.json','V4/site/collaborations.js','V4/site/collection-binder.js',
 'V4/docs/PEUPLES_ET_REGIONS.md','docs/GUIDE_REPRISE.md',
 'V4/revisions/2026-10-05-orven-long-spear/revision.test.cjs','V4/revisions/2026-10-06-balmhyr-durane/revision.test.cjs',
 'V4/site/assets/factions/FF9.png',
 ...['MICE','BATRA','RATZ','MACAKO'].flatMap(r=>['V4/site/assets/races/'+r+'.png','V4/atelier/designer-assets/extensions/race-'+r+'.png']),
 ...ff9.cards.map(c=>'V4/creations/'+c.id),...re.cards.flatMap(c=>['profile.json','card.png','card.psd','verification.json','creation.json'].map(n=>'V4/creations/'+c.id+'/'+n)),
 ...config.versionFiles
];
const workflow='.github/workflows/pages.yml',scoped=p=>p===workflow||roots.some(r=>p===r||p.startsWith(r+'/'));
const prior=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
if(process.argv.includes('--refresh'))assert(prior.every(scoped));else assert.equal(prior.length,0,'Preserve unrelated index');
git(['add','--',...roots]);
// Stage the FFIX/RE checks only; leave the unrelated performance experiment in the worktree.
const before=execFileSync('git',['show','HEAD:'+workflow],{cwd:root,encoding:'utf8'}),eol=before.includes('\r\n')?'\r\n':'\n';
const anchor='          node --test V4/expansions/2026-10-08-eleven-lives/integration.test.cjs'+eol;
const line='          node --test V4/expansions/2026-10-08-final-fantasy-ix/integration.test.cjs V4/revisions/2026-10-08-resident-evil-faces/integration.test.cjs'+eol;
assert(before.includes(anchor));assert(!before.includes(line));
const blob=git(['hash-object','-w','--stdin'],{input:before.replace(anchor,anchor+line)});
git(['update-index','--cacheinfo','100644',blob,workflow]);
const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
assert(staged.every(scoped));
fs.writeFileSync(path.join(__dirname,'verification/stage.json'),JSON.stringify({version:config.version,parent:config.parent,files:staged,unrelatedChangesPreserved:true},null,2)+'\n');
git(['add','--','V4/releases/2026-10-08-ff9-resident-evil/verification/stage.json']);
console.log(JSON.stringify({files:staged.length,version:config.version,target:'Yoshi-san87/Kalistar'}));
