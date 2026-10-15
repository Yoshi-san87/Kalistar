'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/',tag='v4.5.27';
const git=args=>execFileSync('git',args,{cwd:root,maxBuffer:8*1024*1024});
async function get(file){const r=await fetch(base+file+'?release4527='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,file);return r;}
async function main(){
  const sha=git(['rev-parse',tag+'^{commit}']).toString().trim(),remote=await(await get('release.json')).json();assert.equal(remote.version,sha.slice(0,12));
  const assets=new Map(remote.assets.map(a=>[a.path,a])),files=['weapons.js','weapon-art.js','equipment.js','weapon-cards.js','weapons-ui.js'];
  for(const id of ['rhinoz-ancestral-horn'])files.push('assets/equipment/'+id+'-v2.webp','assets/equipment/'+id+'-ring-v1.webp','assets/weapon-cards/'+id+'-v2.webp','assets/weapon-cards/'+id+'-scene-v1.webp');
  const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  for(const file of files){
    const bytes=Buffer.from(await(await get('jeu/'+file)).arrayBuffer()),committed=git(['show',tag+':V4/site/'+file]);
    const pointer=committed.length<1024&&committed.toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/);
    assert.equal(hash(bytes),pointer?pointer[1]:hash(committed),file);assert.equal(hash(bytes),assets.get('jeu/'+file).sha256,file);
  }
  const html=await(await get('jeu/index.html')).text();assert(html.includes('Kalistar V4.5.27'));assert(html.includes('VERSION 4.5.27'));assert(html.includes('boot.js?v='+remote.version));
  assert((await(await get('jeu/v4.css')).text()).includes("content:'V4.5.27'"));
  console.log(JSON.stringify({passed:true,version:'4.5.27',commit:sha,cards:remote.cards,verifiedFiles:files.length,url:base+'jeu/#weapons'},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
