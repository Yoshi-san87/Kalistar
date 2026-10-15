'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),git=(args,options={})=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,...options}).trim();
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
assert.equal(git(['rev-parse','HEAD']),'e366b1e266b8dc047b4fa6c0a8afb5fbba18ab95');
assert.equal(git(['diff','--cached','--name-only']),'','Preserve any existing staged work');
const changed=git(['diff','--name-only','--','V4/site/*.js','V4/site/*.css','V4/site/*.cjs','V4/site/index.html','V4/site/README.md','V4/deploy/build.test.cjs','V4/deploy/browser.test.cjs']).split(/\r?\n/).filter(f=>f&&!['V4/site/equipment-presentation.js','V4/site/weapon-cards.js','V4/site/app.js','V4/site/weapons-ui.js','V4/site/weapons.css','V4/site/weapon-cards.css'].includes(f));
assert(changed.length===52,'Review changed files if the release scope changes');
const added=['V4/site/positions.js','V4/site/positions.css','V4/site/positions.test.cjs','V4/site/positions.browser.test.cjs','V4/site/position-identities.test.cjs','V4/site/position-identities.browser.test.cjs','V4/site/position-identities.fixture.cjs',...['p1','p2','p3','p4','p5'].map(p=>'V4/site/assets/positions/'+p+'-v1.webp')];
const revision='V4/revisions/2026-10-12-position-identity/';
added.push(...['README.md','prompts.json','build-media.cjs','menu-check.cjs','media-provenance.json','sources/approved-proposal.png','sources/position-atlas.png','qa/menu-before/results.json','qa/menu-before/short-desktop.jpg','qa/menu-before/short-window.jpg'].map(p=>revision+p));
added.push(...fs.readdirSync(__dirname).filter(f=>/\.(cjs|md)$/.test(f)).map(f=>'V4/releases/2026-10-12-v4.6.23/'+f));
for(const file of added)assert(fs.existsSync(path.join(root,file)),file);
git(['add','--',...changed,...added]);
// These files also contain another task's unfinished relic work; stage only our hunks.
for(const file of ['V4/site/app.js','V4/site/weapons-ui.js','V4/site/weapons.css','V4/site/weapon-cards.css']){
  const diff=git(['diff','--unified=0','--',file]),start=diff.indexOf('@@'),header=diff.slice(0,start);
  const hunks=diff.slice(start).split(/(?=^@@)/m).filter(Boolean);
  const own=hunks.filter(h=>file.endsWith('app.js')?/KalistarPositions|^[+-]  const roles=|^[+-]  const phoneQuery=|^[+-]    modal.*Cimetière/m.test(h):/^\+.*(?:pointer:coarse|matchMedia\('\(max-width:699px\))/m.test(h));
  assert(own.length,'Missing reviewed position/menu hunks: '+file);
  git(['apply','--cached','--unidiff-zero','-'],{input:header+own.join('')+'\n'});
}
const before=git(['show','HEAD:.github/workflows/pages.yml']),needle='          node --test V4/site/navigation.test.cjs';
assert(before.includes(needle));
const staged=before.replace(needle,needle+'\n          node --test V4/site/positions.test.cjs V4/site/position-identities.test.cjs');
const oid=git(['hash-object','-w','--stdin'],{input:staged+'\n'});
git(['update-index','--cacheinfo','100644,'+oid+',.github/workflows/pages.yml']);
console.log('Staged scoped position/menu release; unrelated performance CI line remains unstaged.');
