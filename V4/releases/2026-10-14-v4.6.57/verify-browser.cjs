'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const qa=path.join(__dirname,'qa'),report=JSON.parse(fs.readFileSync(path.join(qa,'publication.json'),'utf8'));assert(report.passed);
const suites={collection:'V4/site/collection-map.browser.test.cjs',filters:'V4/site/collaborations.browser.test.cjs',navigation:'V4/site/navigation.browser.test.cjs',pages:'V4/deploy/browser.test.cjs'};
const selected=process.argv[2]?[process.argv[2]]:Object.keys(suites);
for(const suite of selected){
  assert(suites[suite]);const dest=path.join(qa,suite);fs.mkdirSync(dest,{recursive:true});
  const env={...process.env,KALISTAR_DIST:path.join(report.snapshot,'V4/deploy/dist'),KALISTAR_BUILT_SITE:'1',KALISTAR_VERIFICATION_DIR:dest,KALISTAR_GUIDE_QA:dest,KALISTAR_LIBRARY_QA:dest};delete env.KALISTAR_URL;
  try{
    const log=execFileSync(process.execPath,[suites[suite]],{cwd:report.snapshot,env,encoding:'utf8',maxBuffer:16*1024*1024});
    fs.writeFileSync(path.join(dest,'run.txt'),log);fs.writeFileSync(path.join(dest,'passed.json'),JSON.stringify({passed:true,suite,snapshot:report.snapshot},null,2)+'\n');console.log(log);
  }catch(error){fs.writeFileSync(path.join(dest,'failed.txt'),String(error.stdout||'')+String(error.stderr||''));throw error;}
}
