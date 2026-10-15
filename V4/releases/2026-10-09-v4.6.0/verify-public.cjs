'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const check=require('../2026-10-09-public-cache-check/public-asset-check.cjs');
const base='https://yoshi-san87.github.io/Kalistar/';
function cardPath(url){
  assert(/^\/media\/(?:reference|created)\/[-a-z0-9]+\.png$/.test(url),'Catalogue card path');
  return url.slice(1);
}
async function request(relative,commit){
  const url=new URL(relative,base);url.searchParams.set('release-check',commit);
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(60000)});
  assert(response.ok,response.status+' '+url);return response;
}
async function main(commit,local,version='4.6.0'){
  assert(/^[a-f0-9]{40}$/.test(commit||''),'Provide the release commit');
  const get=relative=>request(relative,commit);
  const published=await(await get('release.json')).json();
  assert.equal(published.version,commit.slice(0,12));assert.equal(published.cards,local.cards);
  const data=await(await get('jeu/catalogue.json')).json();assert.equal(data.cards.length,local.cards);
  const native=new Set(['balmhyr','momo'].map(id=>{
    const card=data.cards.find(c=>c.characterId===id);assert(card,id);
    return cardPath(card.pngUrl);
  }));
  for(const name of native)assert(local.assets.some(a=>a.path===name),'Native card in verified build: '+name);
  const assets=local.assets.filter(a=>/^jeu\/[^/]+\.(?:html|js|css|webmanifest)$/.test(a.path)||native.has(a.path)||
    a.path.startsWith('jeu/assets/')&&/(?:fallen-king-axe|little-joys-flute|durane-rampart|exiled-king-seal)/.test(path.basename(a.path)));
  assert(native.size===2&&assets.some(a=>a.path==='jeu/engine.js'));
  const verified=[];
  for(const asset of assets){
    const bytes=Buffer.from(await(await get(asset.path)).arrayBuffer());
    check(asset,bytes,published,local.version);
    if(asset.path==='jeu/index.html')assert(bytes.toString().includes('VERSION '+version));
    verified.push(asset.path);
  }
  console.log(JSON.stringify({passed:true,version,commit,cards:data.cards.length,verified,url:base+'jeu/#weapons'},null,2));
}
module.exports={cardPath,main};
if(require.main===module)main(process.argv[2],require(process.env.KALISTAR_BUILD_PROOF||'./qa/build.json'),process.env.KALISTAR_RELEASE_VERSION||'4.6.0').catch(e=>{console.error(e);process.exitCode=1;});
