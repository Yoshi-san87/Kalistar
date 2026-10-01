'use strict';
const L=require('../../atelier/lib.cjs'),{assert,path,read,ROOT,write}=L;
const base='https://yoshi-san87.github.io/Kalistar/';
async function get(relative){const r=await fetch(base+relative+'?v43='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,relative);return r;}
async function main(){
 const local=read(path.join(ROOT,'V4/deploy/dist/release.json')),remote=await(await get('release.json')).json();
 assert.equal(remote.cards,189);assert.equal(remote.assets.length,local.assets.length);
 const index=new Map(remote.assets.map(a=>[a.path,a]));for(const a of local.assets)assert.deepEqual(index.get(a.path),a,a.path);
 const cat=await(await get('jeu/catalogue.json')).json();assert.deepEqual(cat,read(path.join(ROOT,'V4/deploy/dist/jeu/catalogue.json')));
 const samples=require('./audit.cjs').ids.map(id=>'media/created/'+id+'.png');
 for(const f of samples){const bytes=Buffer.from(await(await get(f)).arrayBuffer());assert.equal(L.crypto.createHash('sha256').update(bytes).digest('hex'),index.get(f).sha256,f);}
 const html=await(await get('jeu/index.html')).text();assert.match(html,/VERSION 4\.3/);assert.match(html,/<title>Kalistar V4\.3/);
 const result={passed:true,totalCards:189,arenas:cat.arenas.length,matchingAssets:remote.assets.length,downloadedSamples:samples.length,url:base+'jeu/'};
 write(path.join(__dirname,'publication/public-check.json'),result);return result;
}
if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});module.exports={main};
