'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const check=require('../2026-10-09-public-cache-check/public-asset-check.cjs'),commit=process.argv[2];
assert(/^[a-f0-9]{40}$/.test(commit),'Pass the published commit SHA');
const dist=process.env.KALISTAR_DIST;assert(dist,'Pass the verified snapshot dist');
const local=JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8'));
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'qa'),base='https://yoshi-san87.github.io/Kalistar/';
async function bytes(name){const r=await fetch(base+name+'?lineup4617='+Date.now());assert.equal(r.status,200,name);return Buffer.from(await r.arrayBuffer());}
async function main(){
  const published=JSON.parse((await bytes('release.json')).toString());assert.equal(published.version,commit.slice(0,12));
  const checked=[];
  for(const name of ['jeu/index.html','jeu/lineup-intro.js','jeu/lineup-intro.css','jeu/app.js','jeu/engine.js','jeu/v4.css','jeu/pwa.js','jeu/manifest.webmanifest']){
    const asset=local.assets.find(a=>a.path===name);assert(asset,name);const body=await bytes(name);check(asset,body,published,local.version);
    if(name==='jeu/index.html')assert(body.toString().includes('VERSION 4.6.17'));checked.push(name);
  }
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'public.json'),JSON.stringify({passed:true,version:'4.6.17',commit,checkedAt:new Date().toISOString(),checked},null,2)+'\n');
  console.log('PASS public v4.6.17: '+checked.length+' verified assets');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
