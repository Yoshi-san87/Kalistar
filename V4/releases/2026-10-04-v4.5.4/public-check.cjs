'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/';
async function get(file){
  const response=await fetch(base+file+'?release454='+Date.now(),{signal:AbortSignal.timeout(60000)});
  assert.equal(response.status,200,file);return response;
}
async function main(){
  const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const remote=await(await get('release.json')).json();assert.equal(remote.version,sha.slice(0,12));
  const assets=new Map(remote.assets.map(a=>[a.path,a]));
  const files=['jeu/base-weapons.js','jeu/card-media.js','jeu/collaborations.js','jeu/boot.js','jeu/assets/base-weapons/enamel.png',
    ...Array.from({length:20},(_,i)=>'jeu/assets/base-weapons/'+String(i).padStart(2,'0')+'.svg')];
  for(const file of files){
    const bytes=Buffer.from(await(await get(file)).arrayBuffer()),local=fs.readFileSync(path.join(root,'V4/site',file.slice(4)));
    const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
    assert.equal(hash(bytes),hash(local),file);assert.equal(hash(bytes),assets.get(file).sha256,file);
  }
  const html=await(await get('jeu/index.html')).text();
  assert(html.includes('Kalistar V4.5.4'));assert(html.includes('VERSION 4.5.4'));assert(html.includes('boot.js?v='+remote.version));
  assert((await(await get('jeu/v4.css')).text()).includes("content:'V4.5.4'"));
  console.log(JSON.stringify({passed:true,version:'4.5.4',commit:sha,cards:remote.cards,verifiedFiles:files.length,url:base+'jeu/'},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
