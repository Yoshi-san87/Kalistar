'use strict';
const {assert,fs,path,read,hash,ROOT}=require('../../atelier/lib.cjs'),crypto=require('node:crypto');
const base='https://yoshi-san87.github.io/Kalistar/';
async function get(relative){const r=await fetch(base+relative+'?saga=20260930',{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,relative);return r;}
async function main(){
 const local=read(path.join(ROOT,'V4/deploy/dist/release.json')),remote=await (await get('release.json')).json();
 assert.equal(remote.cards,138);assert.equal(remote.assets.length,local.assets.length);
 const index=new Map(remote.assets.map(a=>[a.path,a]));
 for(const a of local.assets)assert.deepEqual(index.get(a.path),a,a.path);
 const catalogue=await (await get('jeu/catalogue.json')).json();assert.deepEqual(catalogue,read(path.join(ROOT,'V4/deploy/dist/jeu/catalogue.json')));
 for(const relative of ['media/created/49600101.png','media/created/49600108.png','media/created/49600119.png','media/created/49173082.png','jeu/assets/races/BUZZY.png','jeu/assets/races/SERPES.png','jeu/assets/factions/MGS3.png','jeu/assets/factions/MGS5.png']){
  const bytes=Buffer.from(await (await get(relative)).arrayBuffer());assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),index.get(relative).sha256,relative);
 }
 console.log(JSON.stringify({passed:true,cards:catalogue.cards.length,arenas:catalogue.arenas.length,matchingAssets:remote.assets.length,downloadedSamples:8,url:base+'jeu/'}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
