'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'verification','workflow');
fs.mkdirSync(out,{recursive:true});
const commands=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8').split(/\r?\n/).map(s=>s.trim().replace(/^run:\s*/, '')).filter(s=>s.startsWith('node '));
const results=[];
for(const [i,command]of commands.entries()){
  const run=spawnSync(process.execPath,command.split(/\s+/).slice(1),{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
  const log=String(i+1).padStart(2,'0')+'.log',output=(run.stdout||'')+(run.stderr||'')+(run.error?String(run.error):'');
  fs.writeFileSync(path.join(out,log),output);
  results.push({command,status:run.status,log,tests:Number(output.match(/(?:tests|# tests) (\d+)/)?.[1]||0)});
  console.log(run.status===0?'PASS':'FAIL',command);
}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:results.every(r=>r.status===0),tests:results.reduce((n,r)=>n+r.tests,0),results},null,2));
assert(results.every(r=>r.status===0),'Regression failures; inspect this revision verification/workflow logs.');
