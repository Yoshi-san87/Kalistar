'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync,execFileSync}=require('node:child_process');
const source=path.resolve(__dirname,'../../..'),root=process.env.KALISTAR_QA_ROOT||source;
const out=path.join(__dirname,'verification',process.argv[2]||'checks');
assert(!fs.existsSync(out),'Use a new verification directory');
fs.mkdirSync(out,{recursive:true});
const workflow=process.env.KALISTAR_QA_ROOT?fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8'):execFileSync('git',['show','HEAD:.github/workflows/pages.yml'],{cwd:root,encoding:'utf8'});
const commands=workflow.split(/\r?\n/).filter(l=>/^\s+node (?:--test |V4\/site\/)/.test(l)).map(l=>l.trim().slice(5).split(/\s+/));
commands.push(['-e',"const M=require('node:module'),load=M._load;M._load=function(id,...args){if(/designer-core|atelier[\\\\/]lib|^[A-Za-z]:[\\\\/]/.test(id))throw Error('Machine-specific dependency: '+id);return load.call(this,id,...args)};require('./V4/expansions/2026-10-09-final-fantasy-trilogy/integration.test.cjs');require('./V4/revisions/2026-10-09-ff-logo-banners/integration.test.cjs')"]);
commands.push(['V4/deploy/build.cjs']);
const results=[];
for(const [index,args]of commands.entries()){
 const run=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
 fs.writeFileSync(path.join(out,'check-'+String(index+1).padStart(2,'0')+'.txt'),(run.stdout||'')+(run.stderr||''));
 results.push({args,exitCode:run.status});
 console.log((run.status===0?'PASS ':'FAIL ')+args.join(' '));
 if(run.status!==0)console.error(run.stderr||run.stdout||run.error);
}
const report={passed:results.every(r=>r.exitCode===0),head:process.env.KALISTAR_QA_HEAD||execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),root,results};
fs.writeFileSync(path.join(out,'tests.json'),JSON.stringify(report,null,2)+'\n');
assert(report.passed);
