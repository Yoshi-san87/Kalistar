'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const check=require('../2026-10-09-public-cache-check/public-asset-check.cjs'),commit=process.argv[2];
assert(/^[a-f0-9]{40}$/.test(commit));
const dist=process.env.KALISTAR_DIST,out=process.env.KALISTAR_VERIFICATION_DIR;
assert(dist&&out);
const base=process.env.KALISTAR_PUBLIC_BASE||'https://yoshi-san87.github.io/Kalistar/';
assert(['https://yoshi-san87.github.io/Kalistar/','https://kalistar.pages.dev/'].includes(base));
const local=JSON.parse(fs.readFileSync(path.join(dist,'release.json'))),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function bytes(name){const r=await fetch(base+name+'?cards4661='+Date.now());assert.equal(r.status,200,name);return Buffer.from(await r.arrayBuffer());}
async function main(){
 const published=JSON.parse(await bytes('release.json'));
 if(base.includes('github.io'))assert.equal(published.version,commit.slice(0,12));
 const cat=JSON.parse(await bytes('jeu/catalogue.json'));assert.equal(cat.cards.length,379);
 for(const [id,identity]of [['49902701','kaylis'],['49902702','edris-7f-kalistar']]){
  const c=cat.cards.find(c=>c.id===id);assert(c);assert.equal(c.characterId,identity);assert.deepEqual(c.positions,[2,3]);
 }
 const checked=[];
 for(const name of ['jeu/index.html','jeu/engine.js','jeu/equipment.js','jeu/weapons.js','media/created/49902701.png','media/created/49902702.png']){
  const asset=local.assets.find(a=>a.path===name);assert(asset,name);
  const body=await bytes(name);check(asset,body,published,local.version);
  if(name==='jeu/index.html')assert(body.toString().includes('VERSION 4.6.61'));
  checked.push({name,bytes:body.length,sha256:sha(body)});
 }
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'public.json'),JSON.stringify({passed:true,version:'4.6.61',commit,base,checkedAt:new Date().toISOString(),cards:cat.cards.length,checked},null,2));
 console.log('PASS public 4.6.61: 379 cards and both new native PNGs verified.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
