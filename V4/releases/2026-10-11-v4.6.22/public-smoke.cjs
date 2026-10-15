'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const check=require('../2026-10-09-public-cache-check/public-asset-check.cjs'),commit=process.argv[2],dist=process.env.KALISTAR_DIST;
const proof=require('../../revisions/2026-10-11-chrono-equipment/media-provenance.json');
assert(/^[a-f0-9]{40}$/.test(commit)&&dist);
const local=JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8')),base='https://yoshi-san87.github.io/Kalistar/';
async function bytes(name){const r=await fetch(base+name+'?equipment4622='+Date.now());assert.equal(r.status,200,name);return Buffer.from(await r.arrayBuffer());}
async function main(){
 const published=JSON.parse((await bytes('release.json')).toString());assert.equal(published.version,commit.slice(0,12));
 const names=['jeu/index.html','jeu/v4.css','jeu/weapons.js','jeu/weapon-art.js',...proof.assets.map(a=>a.file.replace('V4/site/','jeu/'))],checked=[];
 for(const name of names){
  const asset=local.assets.find(a=>a.path===name);assert(asset,name);const body=await bytes(name);
  check(asset,body,published,local.version);
  if(name==='jeu/index.html')assert(body.toString().includes('VERSION 4.6.22'));
  checked.push(name);
 }
 const catalogue=JSON.parse((await bytes('jeu/catalogue.json')).toString()),expected=JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8'));
 assert.deepEqual(catalogue,expected);
 const out=process.env.KALISTAR_VERIFICATION_DIR;assert(out);fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'public.json'),JSON.stringify({passed:true,version:'4.6.22',commit,checkedAt:new Date().toISOString(),checked,cards:catalogue.cards.length},null,2)+'\n');
 console.log('PASS public 4.6.22: complete catalogue and '+checked.length+' exact assets');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
