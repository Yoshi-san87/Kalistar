'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'verification');fs.mkdirSync(out,{recursive:true});
const commands=[['--test','V4/deploy/build.test.cjs'],['V4/deploy/build.cjs'],['V4/deploy/browser.test.cjs']];
const results=[];
for(const [index,args] of commands.entries()){
 const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,KALISTAR_VERIFICATION_DIR:path.join(out,'browser')}});
 fs.writeFileSync(path.join(out,`check-${index+1}.txt`),(result.stdout||'')+(result.stderr||''));
 results.push({command:'node '+args.join(' '),exitCode:result.status});console.log((result.status===0?'PASS ':'FAIL ')+args.join(' '));
 if(result.status!==0)console.error(result.stderr||result.stdout||result.error);
}
fs.writeFileSync(path.join(out,'tests.json'),JSON.stringify({passed:results.every(r=>r.exitCode===0),results},null,2)+'\n');
assert(results.every(r=>r.exitCode===0));
