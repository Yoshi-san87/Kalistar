'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const check=require('../2026-10-09-public-cache-check/public-asset-check.cjs'),commit=process.argv[2],dist=process.env.KALISTAR_DIST;
assert(/^[a-f0-9]{40}$/.test(commit)&&dist);
const local=JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8')),base='https://yoshi-san87.github.io/Kalistar/';
async function bytes(name){const r=await fetch(base+name+'?elyrane4625='+Date.now());assert.equal(r.status,200,name);return Buffer.from(await r.arrayBuffer());}
async function main(){
 const published=JSON.parse((await bytes('release.json')).toString());assert.equal(published.version,commit.slice(0,12));
 const checked=[],names=['jeu/index.html','jeu/v4.css','media/created/49902101.png'];
 for(const name of names){
  const asset=local.assets.find(a=>a.path===name);assert(asset,name);const body=await bytes(name);
  check(asset,body,published,local.version);if(name==='jeu/index.html')assert(body.toString().includes('VERSION 4.6.25'));checked.push(name);
 }
 const catalogue=JSON.parse((await bytes('jeu/catalogue.json')).toString()),expected=JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8'));
 assert.deepEqual(catalogue,expected);
 const card=catalogue.cards.find(c=>c.id==='49902101');assert(card);assert.equal(card.name,'ELYRANE');assert.equal(card.faction,'Grivka');assert.equal(card.element,'CRYO');
 const out=process.env.KALISTAR_VERIFICATION_DIR;assert(out);fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'public.json'),JSON.stringify({passed:true,version:'4.6.25',commit,checkedAt:new Date().toISOString(),checked,cards:catalogue.cards.length},null,2)+'\n');
 console.log('PASS public 4.6.25: Elyrane, complete catalogue and exact assets');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
