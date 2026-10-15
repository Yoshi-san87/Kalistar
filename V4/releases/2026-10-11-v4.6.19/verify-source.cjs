'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),qa=path.join(__dirname,'qa'),report=JSON.parse(fs.readFileSync(path.join(qa,'publication.json'),'utf8'));
assert(report.passed,'The complete publication suite must pass');
const git=args=>execFileSync('git',args,{cwd:root,maxBuffer:16*1024*1024});
const staged=git(['diff','--cached','--name-only']).toString().trim().split(/\r?\n/).filter(Boolean);
assert(staged.every(f=>f==='.github/workflows/pages.yml'||/^V4\/site\/[^/]+\.(js|css|html|cjs|md)$/.test(f)||['V4/deploy/build.test.cjs','V4/deploy/browser.test.cjs'].includes(f)||f.startsWith('V4/releases/2026-10-11-v4.6.19/')||f.startsWith('V4/revisions/2026-10-11-razr-experience/')),'Only this release may be staged');
const files=fs.readdirSync(path.join(root,'V4/site')).filter(f=>/\.(js|css|html|webmanifest)$/.test(f)).map(f=>'V4/site/'+f);
files.push('.github/workflows/pages.yml','V4/site/performance.test.cjs','V4/deploy/build.cjs','V4/deploy/build.test.cjs','V4/deploy/browser.test.cjs','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs');
files.push('V4/site/razr-shell.browser.test.cjs','V4/site/statistics-accordion.browser.test.cjs','V4/site/card-detail.browser.test.cjs','V4/site/lineup-mobile.browser.test.cjs','V4/site/lineup-intro.browser.test.cjs');
files.push('V4/site/arena-prompts.browser.test.cjs','V4/site/arena-prompts.test.cjs');
const hashes={};
for(const file of files){
  const source=git(['show',':'+file]),verified=fs.readFileSync(path.join(report.snapshot,file));assert(source.equals(verified),'Staged source differs from verified snapshot: '+file);
  hashes[file]=crypto.createHash('sha256').update(source).digest('hex');
}
for(const file of ['V4/site/engine.js','V4/site/local-db.js','V4/site/performance-index.js','V4/site/turn-order.js','V4/site/weapons.js','V4/atelier/data/references.json','V4/donnees/catalogue.json'])assert(git(['show',':'+file]).equals(git(['show','HEAD:'+file])),'Gameplay/native registry changed: '+file);
for(const name of ['shell','statistics','detail','lineup','desktop','pages','prompts']){
  const check=JSON.parse(fs.readFileSync(path.join(qa,name,'passed.json'),'utf8'));assert(check.passed&&check.tree===report.tree,'Browser suite must verify the same staged build: '+name);
}
const lineups=JSON.parse(fs.readFileSync(path.join(qa,'lineup/summary.json'),'utf8'));assert(lineups.passed&&lineups.checks.length===11);
fs.writeFileSync(path.join(qa,'stage.json'),JSON.stringify({passed:true,checkedAt:new Date().toISOString(),parent:report.parent,verifiedTree:report.tree,tests:report.tests,files:hashes},null,2)+'\n');
console.log('PASS: '+files.length+' exact staged runtime sources; unchanged gameplay and eleven touch scenarios');
