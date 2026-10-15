'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),base=process.argv[2]||'https://kalistar.pages.dev/';
const expected=require('../../revisions/2026-10-13-froz-grivka-equipment/media-provenance.json').assets;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function bytes(relative){
  const url=new URL(relative,base);url.searchParams.set('release','4.6.51');
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,url.href);return Buffer.from(await response.arrayBuffer());
}
async function main(){
  assert.match((await bytes('jeu/')).toString(),/VERSION 4\.6\.51/);
  const report={base,version:'4.6.51',passed:false,checked:[]};
  for(const asset of expected){
    const relative=asset.file.replace('V4/site/','jeu/');
    assert.equal(hash(await bytes(relative)),asset.sha256,relative);
    report.checked.push(relative);
  }
  for(const file of ['weapons.js','weapon-art.js','ultimate-ui.js']){
    const relative='jeu/'+file,local=fs.readFileSync(path.join(root,'V4/deploy/dist',relative));
    assert.equal(hash(await bytes(relative)),hash(local),relative);report.checked.push(relative);
  }
  report.passed=true;
  fs.writeFileSync(path.join(__dirname,'qa','public-'+new URL(base).hostname+'.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:true,base,version:report.version,checked:report.checked.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
