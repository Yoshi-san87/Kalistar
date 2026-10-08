'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),workflow=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8'),results=[];
const commands=workflow.split(/\r?\n/).map(l=>l.trim()).filter(l=>/^node (?:--test |V4\/site\/.+\.test\.cjs$)/.test(l)&&!l.includes('V4/site/performance.test.cjs'));
const out=path.join(__dirname,'verification');fs.mkdirSync(out,{recursive:true});
for(const [index,command]of commands.entries()){
 const args=command.split(/\s+/).slice(1),r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
 fs.writeFileSync(path.join(out,'tests-'+String(index+1).padStart(2,'0')+'.txt'),(r.stdout||'')+(r.stderr||''));
 const count=(r.stdout||'').match(/(?:# |ℹ )tests (\d+)/);
 results.push({command,exitCode:r.status,tests:count?Number(count[1]):null});
 console.log((r.status===0?'PASS ':'FAIL ')+command);
 if(r.status!==0)console.error('Details: verification/tests-'+String(index+1).padStart(2,'0')+'.txt');
}
fs.writeFileSync(path.join(out,'tests.json'),JSON.stringify({passed:results.length===commands.length&&results.every(r=>r.exitCode===0),results},null,2)+'\n');
assert.equal(results.length,commands.length);assert(results.every(r=>r.exitCode===0));
