'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'verification',process.argv[2]||'checks');
assert(!fs.existsSync(out),'Use a new verification directory');fs.mkdirSync(out,{recursive:true});
const workflow=require('./publication-workflow.cjs')(root);
const commands=workflow.split(/\r?\n/).filter(l=>/^\s+node (?:--test |V4\/site\/)/.test(l)).map(l=>l.trim().slice(5).split(/\s+/));
const results=[];
for(const [index,args]of commands.entries()){
  if(args[0]==='--test')args.splice(1,0,'--test-reporter=tap');
  const run=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
  const log=(run.stdout||'')+(run.stderr||'');fs.writeFileSync(path.join(out,'check-'+String(index+1).padStart(2,'0')+'.txt'),log);
  results.push({args,exitCode:run.status,passed:Number(log.match(/# pass (\d+)/)?.[1]||0)});
  console.log((run.status===0?'PASS ':'FAIL ')+args.join(' '));
  if(run.status!==0)console.error(log||run.error);
}
const report={passed:results.every(r=>r.exitCode===0),tests:results.reduce((s,r)=>s+r.passed,0),results};
fs.writeFileSync(path.join(out,'tests.json'),JSON.stringify(report,null,2)+'\n');assert(report.passed);console.log(report.tests+' tests passed');
