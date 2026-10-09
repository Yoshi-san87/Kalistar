'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'qa',process.env.KALISTAR_QA_RUN||'final');
fs.mkdirSync(out,{recursive:true});
const workflow=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
const commands=workflow.split(/\r?\n/).map(s=>s.trim().replace(/^run:\s*/, '')).filter(s=>s.startsWith('node '));
const results=[];
for(const [i,command]of commands.entries()){
 const args=command.split(/\s+/).slice(1),r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
 const log=String(i+1).padStart(2,'0')+'.log';fs.writeFileSync(path.join(out,log),(r.stdout||'')+(r.stderr||'')+(r.error?String(r.error):''));
 results.push({command,status:r.status,log});console.log(r.status===0?'PASS':'FAIL',command);
}
fs.writeFileSync(path.join(out,'workflow-tests.json'),JSON.stringify({passed:results.every(r=>r.status===0),results},null,2));
assert(results.every(r=>r.status===0),'Workflow regression failures; see qa logs');
