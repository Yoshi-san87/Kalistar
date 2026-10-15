'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const check=require('../2026-10-09-public-cache-check/public-asset-check.cjs'),commit=process.argv[2],dist=process.env.KALISTAR_DIST;
assert(/^[a-f0-9]{40}$/.test(commit));assert(dist);
const base='https://yoshi-san87.github.io/Kalistar/',local=JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8'));
async function bytes(name){const r=await fetch(base+name+'?rename469='+Date.now());assert.equal(r.status,200,name);return Buffer.from(await r.arrayBuffer());}
async function main(){
 const manifest=JSON.parse((await bytes('release.json')).toString());assert.equal(manifest.version,commit.slice(0,12));
 const checked=[];
 for(const name of ['jeu/index.html','jeu/v4.css','jeu/weapons.js','media/created/49901503.png']){
  const asset=local.assets.find(a=>a.path===name);assert(asset);const body=await bytes(name);check(asset,body,manifest,local.version);
  if(name==='jeu/index.html')assert(body.toString().includes('VERSION 4.6.9'));checked.push(name);
 }
 const cat=await bytes('jeu/catalogue.json'),digest=b=>crypto.createHash('sha256').update(b).digest('hex');
 assert.equal(digest(cat),digest(fs.readFileSync(path.join(dist,'jeu/catalogue.json'))));
 const c=JSON.parse(cat).cards.find(c=>c.id==='49901503');assert.equal(c.name,"L'HOMME MYST\u00c8RE");assert.equal(c.characterId,'sphinx-batman');
 const result={passed:true,version:'4.6.9',commit,checkedAt:new Date().toISOString(),checked,name:c.name,characterId:c.characterId,catalogueHash:digest(cat)};
 fs.writeFileSync(path.join(__dirname,'qa/public.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
