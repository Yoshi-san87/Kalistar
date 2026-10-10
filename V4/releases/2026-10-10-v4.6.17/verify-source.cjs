'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),qa=path.join(__dirname,'qa'),report=JSON.parse(fs.readFileSync(path.join(qa,'publication.json'),'utf8'));
assert(report.passed,'Publication suite must pass');
const files=['V4/site/index.html','V4/site/v4.css','V4/site/lineup-intro.js','V4/site/lineup-intro.css','V4/site/lineup-mobile.browser.test.cjs','V4/site/lineup-intro.browser.test.cjs','V4/site/lineup-intro.test.cjs','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/build.test.cjs','V4/deploy/browser.test.cjs','V4/site/engine.js','V4/site/app.js','V4/site/boot.js','V4/site/turn-order.js','V4/site/local-db.js','V4/site/performance-index.js','V4/site/statistics.js','.github/workflows/pages.yml'];
const hashes={};
for(const file of files){
  const staged=execFileSync('git',['show',':'+file],{cwd:root,maxBuffer:16*1024*1024}),verified=fs.readFileSync(path.join(report.snapshot,file));
  assert(staged.equals(verified),'Staged source differs from verified snapshot: '+file);
  hashes[file]=crypto.createHash('sha256').update(staged).digest('hex');
}
assert(!fs.readFileSync(path.join(report.snapshot,'V4/site/index.html'),'utf8').includes('statistics-skin.css'),'Unrelated statistics work must stay out of this release');
const mobile=JSON.parse(fs.readFileSync(path.join(root,'V4/revisions/2026-10-10-mobile-lineup/qa/after/summary.json'),'utf8'));
assert(mobile.passed&&mobile.checks.length===6,'All six touch scenarios must pass');
const built=JSON.parse(fs.readFileSync(path.join(qa,'mobile-build/results.json'),'utf8'));assert(built.results[0]?.passed);assert.deepEqual(built.errors,[]);
const desktop=JSON.parse(fs.readFileSync(path.join(qa,'desktop/results.json'),'utf8'));assert.deepEqual(desktop.errors,[]);assert(desktop.steps.some(s=>s.position===5&&s.step==='reveal'));
fs.writeFileSync(path.join(qa,'stage.json'),JSON.stringify({passed:true,parent:report.parent,verifiedTree:report.tree,checkedAt:new Date().toISOString(),files:hashes},null,2)+'\n');
console.log('PASS: '+files.length+' staged sources match the isolated build; desktop and touch checks passed');
