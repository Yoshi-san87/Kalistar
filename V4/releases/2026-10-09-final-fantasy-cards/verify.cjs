'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync,execFileSync}=require('node:child_process');
const early=process.argv.includes('--mechanics-only');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'verification',early?'before-publication':'');fs.mkdirSync(out,{recursive:true});
const workflow=execFileSync('git',['show','HEAD:.github/workflows/pages.yml'],{cwd:root,encoding:'utf8'});
const commands=workflow.split(/\r?\n/).filter(l=>/^\s+node (?:--test |V4\/site\/)/.test(l)).map(l=>l.trim().slice(5).split(/\s+/));
if(!early)commands.push(['--test','V4/expansions/2026-10-09-final-fantasy-trilogy/integration.test.cjs','V4/revisions/2026-10-09-ff-logo-banners/integration.test.cjs'],
 ['--test','V4/expansions/2026-10-09-final-fantasy-trilogy/assets.test.cjs'],
 ['V4/deploy/build.cjs'],['V4/expansions/2026-10-09-final-fantasy-trilogy/browser.test.cjs'],['V4/deploy/browser.test.cjs']);
const results=[];
for(const [index,args]of commands.entries()){
 const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,KALISTAR_VERIFICATION_DIR:path.join(out,'browser')}});
 fs.writeFileSync(path.join(out,'check-'+String(index+1).padStart(2,'0')+'.txt'),(result.stdout||'')+(result.stderr||''));
 results.push({command:'node '+args.join(' '),exitCode:result.status});console.log((result.status===0?'PASS ':'FAIL ')+args.join(' '));
 if(result.status!==0)console.error(result.stderr||result.stdout||result.error);
 if(args.includes('V4/deploy/build.cjs')&&result.status!==0)break;
}
fs.writeFileSync(path.join(out,'tests.json'),JSON.stringify({passed:results.every(r=>r.exitCode===0),results},null,2)+'\n');
assert(results.every(r=>r.exitCode===0));
