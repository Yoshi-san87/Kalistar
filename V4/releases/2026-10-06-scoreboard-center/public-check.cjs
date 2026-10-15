'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/',version='4.5.29';
const sha=execFileSync('git',['rev-parse','v'+version+'^{commit}'],{cwd:root,encoding:'utf8'}).trim();
async function get(file){const response=await fetch(base+file+'?scorecenter4529='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200,file);return response;}
async function main(){
  const release=await(await get('release.json')).json();assert.equal(release.version,sha.slice(0,12));
  const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),assets=new Map(release.assets.map(a=>[a.path,a]));
  const files=['app.js','scoreboard.css','duel-console.css'];
  for(const file of files){
    const bytes=Buffer.from(await(await get('jeu/'+file)).arrayBuffer()),source=execFileSync('git',['show',sha+':V4/site/'+file],{cwd:root});
    assert.equal(hash(bytes),hash(source),file);assert.equal(hash(bytes),assets.get('jeu/'+file).sha256,file);
  }
  const html=await(await get('jeu/index.html')).text();assert(html.includes('Kalistar V'+version));assert(html.includes('VERSION '+version));assert(html.includes('boot.js?v='+release.version));
  assert((await(await get('jeu/v4.css')).text()).includes("content:'V"+version+"'"));
  console.log(JSON.stringify({passed:true,version,commit:sha,cards:release.cards,files,url:base+'jeu/'},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
