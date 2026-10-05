'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
async function get(file){const response=await fetch(base+file+'?catalogue-fix='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200,file);return response;}
async function main(){
  const sha=git('rev-parse','HEAD'),html=git('show','HEAD:V4/site/index.html'),version=html.match(/Kalistar V([\d.]+)/)[1];
  const release=await(await get('release.json')).json();assert.equal(release.version,sha.slice(0,12));
  const assets=new Map(release.assets.map(a=>[a.path,a])),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
  const files=['catalogue-updates.js','app.js','accounts-ui.js','boot.js'];
  for(const file of files){
    const bytes=Buffer.from(await(await get('jeu/'+file)).arrayBuffer()),source=execFileSync('git',['show','HEAD:V4/site/'+file],{cwd:root});
    assert.equal(hash(bytes),hash(source),file);assert.equal(hash(bytes),assets.get('jeu/'+file).sha256,file);
  }
  const served=await(await get('jeu/index.html')).text();assert(served.includes('Kalistar V'+version));assert(served.includes('VERSION '+version));assert(served.includes('boot.js?v='+release.version));
  assert((await(await get('jeu/v4.css')).text()).includes("content:'V"+version+"'"));
  console.log(JSON.stringify({passed:true,version,commit:sha,cards:release.cards,verifiedFiles:files.length,url:base+'jeu/'},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
