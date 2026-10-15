'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const check=require('../2026-10-09-public-cache-check/public-asset-check.cjs'),commit=process.argv[2];
assert(/^[a-f0-9]{40}$/.test(commit));const dist=process.env.KALISTAR_DIST;assert(dist);
const local=JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8')),out=process.env.KALISTAR_VERIFICATION_DIR,base=process.env.KALISTAR_PUBLIC_BASE||'https://yoshi-san87.github.io/Kalistar/';assert(out);
assert(['https://yoshi-san87.github.io/Kalistar/','https://kalistar.pages.dev/'].includes(base));
async function bytes(name){const r=await fetch(base+name+'?glyphs4655='+Date.now());assert.equal(r.status,200,name);return Buffer.from(await r.arrayBuffer());}
async function main(){
  const published=JSON.parse((await bytes('release.json')).toString());
  if(base==='https://yoshi-san87.github.io/Kalistar/')assert.equal(published.version,commit.slice(0,12));
  else assert.match(published.version,/^[a-f0-9]{12}$/);
  assert.equal(published.cards,377);
  const catalogue=JSON.parse((await bytes('jeu/catalogue.json')).toString());
  const specs=require('../../expansions/2026-10-13-fourteen-new-voices/set.json').cards;
  for(const s of specs){const c=catalogue.cards.find(c=>c.id===s.id);assert(c,s.key);for(const field of ['name','characterId','race','faction','weapon','atk','defense','magic','barriers'])assert.deepEqual(c[field],s[field],s.key+' '+field);}
  const checked=[];
  for(const name of ["jeu/index.html","jeu/boot.js","jeu/v4.css","jeu/engine.js","media/created/49902601.png","media/created/49902602.png","media/created/49902603.png","media/created/49902604.png","media/created/49902605.png","media/created/49902606.png","media/created/49902607.png","media/created/49902608.png","media/created/49902609.png","media/created/49902610.png","media/created/49902611.png","media/created/49902612.png","media/created/49902613.png","media/created/49902614.png"]){
    const asset=local.assets.find(a=>a.path===name);assert(asset,name);const body=await bytes(name);check(asset,body,published,local.version);
    if(name==='jeu/index.html')assert(body.toString().includes('VERSION 4.6.55'));checked.push(name);
  }
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'public.json'),JSON.stringify({passed:true,version:'4.6.55',commit,buildVersion:published.version,base,checkedAt:new Date().toISOString(),checked},null,2)+'\n');console.log('PASS public 4.6.55: '+checked.length+' verified assets at '+base);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
