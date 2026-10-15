'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/';
const sha=execFileSync('git',['rev-parse','v4.5.20^{commit}'],{cwd:root,encoding:'utf8'}).trim();
const source=file=>execFileSync('git',['show',sha+':V4/site/'+file],{cwd:root});
async function get(file){const r=await fetch(base+file+'?scoreboard4520='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,file);return r;}
async function main(){
  const release=await(await get('release.json')).json();assert.equal(release.version,sha.slice(0,12));
  const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),assets=new Map(release.assets.map(a=>[a.path,a]));
  for(const file of ['app.js','scoreboard.css','turn-timeline.css','assets/ui/collection-reader-grimoire-v1.png','assets/navigation/kalistel-rainbow-v1.webp']){
    const bytes=Buffer.from(await(await get('jeu/'+file)).arrayBuffer()),original=source(file),pointer=original.subarray(0,200).toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f\d]{64})/);
    assert.equal(hash(bytes),pointer?pointer[1]:hash(original),file);assert.equal(hash(bytes),assets.get('jeu/'+file).sha256,file);
  }
  const html=await(await get('jeu/index.html')).text();assert(html.includes('Kalistar V4.5.20'));assert(html.includes('VERSION 4.5.20'));assert(html.includes('scoreboard.css?v='+release.version));
  assert((await(await get('jeu/v4.css')).text()).includes("content:'V4.5.20'"));
  console.log(JSON.stringify({passed:true,version:'4.5.20',commit:sha,cards:release.cards,url:base+'jeu/#arena'},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
