'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
assert.equal(git(['remote','get-url','origin']),'https://github.com/Yoshi-san87/Kalistar.git');
const checkOnly=process.argv[2]==='--check';
if(!checkOnly)assert.equal(git(['diff','--cached','--name-only']),'','Preserve any existing staged work');
const S=require('../../revisions/2026-10-04-guards-arborium/specs.cjs'),rev='V4/revisions/2026-10-04-guards-arborium';
const paths=[rev,'V4/releases/2026-10-04-v4.5.8','.github/workflows/pages.yml','V4/donnees/catalogue.json','V4/atelier/designer-assets/race-extensions.json','V4/atelier/designer-assets/extensions/race-CRUSTOS.png','V4/site/assets/races/CRUSTOS.png',
 'V4/site/index.html','V4/site/v4.css','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/browser.test.cjs','V4/deploy/build.test.cjs'];
for(const c of S.cards){paths.push('V4/creations/'+c.id);if(c.key!=='serya')paths.push('V4/Illustrations/'+c.art);}
const tracked=new Set(git(['ls-files','-z']).split('\0'));
const removed=JSON.parse(fs.readFileSync(path.join(root,rev,'removed-files.json'),'utf8').replace(/^\uFEFF/,''));
for(const f of removed)if(checkOnly||tracked.has(f.path))paths.push(f.path);
if(!checkOnly)git(['add','--',...paths]);
const staged=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);
assert.deepEqual(staged.filter(p=>!paths.some(scope=>p===scope||p.startsWith(scope+'/'))),[],'Unexpected staged scope');
console.log(JSON.stringify({staged:staged.length,paths}));
