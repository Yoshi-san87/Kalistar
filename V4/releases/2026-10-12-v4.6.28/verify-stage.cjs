'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),qa=path.join(__dirname,'qa'),report=JSON.parse(fs.readFileSync(path.join(qa,'publication.json'),'utf8'));
const git=args=>execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024});assert(report.passed);
assert.equal(git(['rev-parse','HEAD']).toString().trim(),report.parent,'Release parent changed');
const staged=git(['diff','--cached','--name-only']).toString().trim().split(/\r?\n/).filter(Boolean);
const driverUpdates=new Set(['V4/site/guide.browser.test.cjs','V4/site/navigation.browser.test.cjs','V4/site/team-composition.browser.test.cjs']);
const allowed=new Set(['.github/workflows/pages.yml','docs/GUIDE_REPRISE.md','V4/site/README.md','V4/site/app.js','V4/site/boot.js','V4/site/index.html','V4/site/v4.css','V4/site/performance.test.cjs','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/site/map-view.test.cjs','V4/deploy/build.cjs','V4/deploy/build.test.cjs','V4/deploy/browser.test.cjs','V4/site/guide-scenario.js','V4/site/guide-scenario.test.cjs','V4/site/guide-view.js','V4/site/guide-view.css','V4/site/guide.browser.test.cjs','V4/site/library-view.js','V4/site/library-view.css','V4/site/rules-documents.cjs','V4/site/rules-documents.js','V4/site/library.test.cjs','V4/site/library.browser.test.cjs','V4/site/assets/ui/library-parchment-v1.webp']);
assert(staged.every(f=>allowed.has(f)||driverUpdates.has(f)||f.startsWith('V4/releases/2026-10-12-v4.6.28/')),'Unrelated files staged');
const runtime=git(['ls-files','--cached','V4/site']).toString().trim().split(/\r?\n/).filter(f=>/^V4\/site\/[^/]+\.(js|css|html|webmanifest)$/.test(f));
runtime.push('.github/workflows/pages.yml','V4/deploy/build.cjs','V4/site/assets/ui/library-parchment-v1.webp','V4/site/guide-scenario.test.cjs','V4/site/library.test.cjs','V4/site/guide.browser.test.cjs','V4/site/library.browser.test.cjs','V4/site/navigation.browser.test.cjs','V4/site/team-composition.browser.test.cjs','V4/site/razr-shell.browser.test.cjs','V4/site/card-detail.browser.test.cjs','V4/site/lineup-mobile.browser.test.cjs','V4/deploy/browser.test.cjs');
const hashes={};
for(const file of runtime){
  const source=git(['show',':'+file]),verified=fs.readFileSync(path.join(report.snapshot,file)),pointer=/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(source.toString());
  if(pointer)assert.equal(crypto.createHash('sha256').update(verified).digest('hex'),pointer[1],file);else assert(source.equals(verified),'Staged source differs from tested source: '+file);
  hashes[file]=crypto.createHash('sha256').update(source).digest('hex');
}
for(const file of ['V4/site/engine.js','V4/site/local-db.js','V4/site/equipment.js','V4/site/weapons.js','V4/site/relic-ultimates.js','V4/site/performance-index.js','V4/site/turn-order.js','V4/atelier/data/references.json','V4/donnees/catalogue.json'])assert(git(['show',':'+file]).equals(git(['show','HEAD:'+file])),'Protected gameplay changed: '+file);
for(const suite of ['guide','library','navigation','composition','shell','detail','lineup','pages']){const b=JSON.parse(fs.readFileSync(path.join(qa,suite,'passed.json'),'utf8'));assert(b.passed&&b.tree===report.tree,'Browser verification source: '+suite);}
fs.writeFileSync(path.join(qa,'stage.json'),JSON.stringify({passed:true,parent:report.parent,verifiedTree:report.tree,tests:report.tests,driverUpdates:[...driverUpdates],files:hashes},null,2)+'\n');console.log('PASS exact staged runtime and eight browser suites; gameplay and native registry unchanged');
