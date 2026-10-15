'use strict';
const L=require('../../atelier/lib.cjs'),{assert,path,read,ROOT}=L;
const base='https://yoshi-san87.github.io/Kalistar/';
async function get(relative){const r=await fetch(base+relative+'?one-piece=20261001',{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,relative);return r;}
async function main(){
 const local=read(path.join(ROOT,'V4/deploy/dist/release.json')),remote=await(await get('release.json')).json();
 assert.equal(remote.cards,174);assert.equal(remote.assets.length,local.assets.length);
 const index=new Map(remote.assets.map(a=>[a.path,a]));for(const a of local.assets)assert.deepEqual(index.get(a.path),a,a.path);
 const catalogue=await(await get('jeu/catalogue.json')).json();assert.deepEqual(catalogue,read(path.join(ROOT,'V4/deploy/dist/jeu/catalogue.json')));
 const set=read(path.join(ROOT,'V4/expansions/2026-10-01-one-piece/set.json'));
 const samples=[...set.cards.map(c=>'media/created/'+c.id+'.png'),...require('./audit.cjs').targetIds.map(id=>'media/created/'+id+'.png'),'jeu/assets/factions/ONEPIECE.png'];
 for(const relative of samples){const bytes=Buffer.from(await(await get(relative)).arrayBuffer());assert.equal(L.crypto.createHash('sha256').update(bytes).digest('hex'),index.get(relative).sha256,relative);}
 const summary={passed:true,cards:catalogue.cards.length,arenas:catalogue.arenas.length,matchingAssets:remote.assets.length,downloadedSamples:samples.length,url:base+'jeu/'};
 return summary;
}
if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
