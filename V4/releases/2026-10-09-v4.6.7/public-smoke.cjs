'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const check=require('../2026-10-09-public-cache-check/public-asset-check.cjs');
const root=path.resolve(__dirname,'../../..'),revision='V4/revisions/2026-10-09-gotham-equipment';
const expected=process.argv[2];assert(/^[a-f0-9]{40}$/.test(expected),'Pass published commit SHA');
const dist=process.env.KALISTAR_DIST||path.join(root,'V4/deploy/dist'),local=JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8'));
const base='https://yoshi-san87.github.io/Kalistar/',cache='gotham='+Date.now();
async function fetchBytes(name){const r=await fetch(base+name+'?'+cache);assert.equal(r.status,200,name);return Buffer.from(await r.arrayBuffer());}
async function main(){
  const published=JSON.parse((await fetchBytes('release.json')).toString());assert.equal(published.version,expected.slice(0,12));
  const wanted=['jeu/index.html','jeu/weapons.js','jeu/weapon-art.js','jeu/equipment.js','jeu/v4.css',...require(path.join(root,revision,'media-provenance.json')).assets.map(a=>'jeu/'+a.file.slice('V4/site/'.length))];
  const checked=[];
  for(const name of wanted){const asset=local.assets.find(a=>a.path===name);assert(asset,name);const bytes=await fetchBytes(name);check(asset,bytes,published,local.version);
    if(name==='jeu/index.html')assert(bytes.toString().includes('4.6.7'));checked.push({path:name,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
  const report={passed:true,commit:expected,version:'4.6.7',checkedAt:new Date().toISOString(),files:checked};
  fs.writeFileSync(path.join(__dirname,'verification/public.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS public v4.6.7: '+checked.length+' verified assets');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
