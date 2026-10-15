'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),qa=path.join(__dirname,'qa'),report=JSON.parse(fs.readFileSync(path.join(qa,'publication.json'),'utf8'));
assert(report.passed,'The publication suite and build must pass first');
const suites={
  shell:['V4/site/razr-shell.browser.test.cjs'],
  statistics:['V4/site/statistics-accordion.browser.test.cjs'],
  detail:['V4/site/card-detail.browser.test.cjs'],
  lineup:['V4/site/lineup-mobile.browser.test.cjs','--all'],
  desktop:['V4/site/lineup-intro.browser.test.cjs'],
  prompts:['V4/site/arena-prompts.browser.test.cjs'],
  pages:['V4/deploy/browser.test.cjs']
};
const selected=process.argv[2]||'shell';assert(suites[selected],'Unknown browser suite');
const dest=path.join(qa,selected);fs.mkdirSync(dest,{recursive:true});
const env={...process.env,KALISTAR_DIST:path.join(report.snapshot,'V4/deploy/dist'),KALISTAR_BUILT_SITE:'1',KALISTAR_VERIFICATION_DIR:dest};
delete env.KALISTAR_URL;delete env.KALISTAR_LINEUP_SCENARIO;delete env.KALISTAR_LINEUP_SOURCE;
try{
  const log=execFileSync(process.execPath,suites[selected],{cwd:root,env,encoding:'utf8',maxBuffer:16*1024*1024});
  fs.writeFileSync(path.join(dest,'run.txt'),log);fs.writeFileSync(path.join(dest,'passed.json'),JSON.stringify({passed:true,suite:selected,tree:report.tree,snapshot:report.snapshot,checkedAt:new Date().toISOString()},null,2)+'\n');
  console.log(log);
}catch(error){fs.writeFileSync(path.join(dest,'failed.txt'),String(error.stdout||'')+String(error.stderr||''));throw error;}
