'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const check=require('../2026-10-09-public-cache-check/public-asset-check.cjs'),commit=process.argv[2];
assert(/^[a-f0-9]{40}$/.test(commit),'Pass the published commit SHA');
const dist=process.env.KALISTAR_DIST;assert(dist,'Pass the verified snapshot dist');
const local=JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8'));
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'qa'),base='https://yoshi-san87.github.io/Kalistar/';
async function bytes(name){const r=await fetch(base+name+'?index4613='+Date.now());assert.equal(r.status,200,name);return Buffer.from(await r.arrayBuffer());}
async function main(){
  const published=JSON.parse((await bytes('release.json')).toString());assert.equal(published.version,commit.slice(0,12));
  const checked=[];
  for(const name of ['jeu/index.html','jeu/app.js','jeu/local-db.js','jeu/engine.js','jeu/boot.js','jeu/performance-index.js','jeu/match-metrics.js','jeu/trophies.js','jeu/match-report.js','jeu/match-report.css','jeu/statistics.js','jeu/catalogue.js','jeu/catalogue.css','jeu/v4.css']){
    const asset=local.assets.find(a=>a.path===name);assert(asset,name);const body=await bytes(name);check(asset,body,published,local.version);
    if(name==='jeu/index.html')assert(body.toString().includes('VERSION 4.6.13'));checked.push(name);
  }
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'public.json'),JSON.stringify({passed:true,version:'4.6.13',commit,checkedAt:new Date().toISOString(),checked},null,2)+'\n');
  console.log('PASS public v4.6.13: '+checked.length+' verified assets');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
