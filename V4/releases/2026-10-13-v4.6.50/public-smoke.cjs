'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const check=require('../2026-10-09-public-cache-check/public-asset-check.cjs'),commit=process.argv[2];
assert(/^[a-f0-9]{40}$/.test(commit));const dist=process.env.KALISTAR_DIST;assert(dist);
const local=JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8')),out=process.env.KALISTAR_VERIFICATION_DIR,base='https://yoshi-san87.github.io/Kalistar/';assert(out);
async function bytes(name){const r=await fetch(base+name+'?pedestal4650='+Date.now());assert.equal(r.status,200,name);return Buffer.from(await r.arrayBuffer());}
async function main(){
  const published=JSON.parse((await bytes('release.json')).toString());assert.equal(published.version,commit.slice(0,12));const checked=[];
  for(const name of ['jeu/index.html','jeu/boot.js','jeu/v4.css','jeu/collection-binder.js','jeu/collection-pedestal.css','jeu/collection-binder.css','jeu/assets/navigation/collection-v1.webp','jeu/assets/navigation/decks-v1.webp','jeu/engine.js','jeu/positions.css']){
    const asset=local.assets.find(a=>a.path===name);assert(asset,name);const body=await bytes(name);check(asset,body,published,local.version);
    if(name==='jeu/index.html')assert(body.toString().includes('VERSION 4.6.50'));checked.push(name);
  }
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'public.json'),JSON.stringify({passed:true,version:'4.6.50',commit,checkedAt:new Date().toISOString(),checked},null,2)+'\n');console.log('PASS public 4.6.50: '+checked.length+' verified assets');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
