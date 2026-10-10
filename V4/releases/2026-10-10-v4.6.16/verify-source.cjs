'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),qa=path.join(__dirname,'qa'),report=JSON.parse(fs.readFileSync(path.join(qa,'publication.json'),'utf8'));
assert(report.passed,'Publication suite must pass first');
const files=['V4/site/index.html','V4/site/v4.css','V4/site/engine.js','V4/site/performance-index.js','V4/site/trophies.js','V4/site/match-metrics.js','V4/site/match-report.js','V4/site/statistics.js','V4/site/catalogue.js','V4/site/boot.js','V4/site/app.js','V4/site/local-db.js','V4/site/equipment.js','V4/site/weapons.js','V4/site/turn-order.js','V4/site/performance-index.test.cjs','V4/site/performance-index.browser.test.cjs','V4/site/statistics.test.cjs','V4/site/match-metrics.test.cjs','V4/site/career-statistics.test.cjs','V4/site/browser.test.cjs','V4/site/weapons.browser.test.cjs','V4/deploy/build.test.cjs','V4/deploy/browser.test.cjs','.github/workflows/pages.yml'];
const hashes={};
for(const file of files){
  const staged=execFileSync('git',['show',':'+file],{cwd:root,maxBuffer:16*1024*1024}),verified=fs.readFileSync(path.join(report.snapshot,file));
  assert(staged.equals(verified),'Staged source differs from verified snapshot: '+file);
  hashes[file]=crypto.createHash('sha256').update(staged).digest('hex');
}
const simulation=JSON.parse(fs.readFileSync(path.join(root,'V4/revisions/2026-10-10-performance-useful/qa/simulation.json'),'utf8'));
for(const [file,hash] of Object.entries(simulation.summary.sourceHashes))assert.equal(hashes['V4/site/'+file],hash,'Simulation source: '+file);
const result={passed:true,parent:report.parent,verifiedTree:report.tree,checkedAt:new Date().toISOString(),files:hashes};
fs.writeFileSync(path.join(qa,'stage.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS: '+files.length+' staged sources and simulation hashes match the isolated verification');
