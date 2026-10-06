'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/',version='4.5.31',tag='v'+version;
const git=args=>execFileSync('git',args,{cwd:root,maxBuffer:8*1024*1024});
async function get(file){const r=await fetch(base+file+'?bearers='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,file);return r;}
async function main(){
  const sha=git(['rev-parse',tag+'^{commit}']).toString().trim(),release=await(await get('release.json')).json();assert.equal(release.version,sha.slice(0,12));
  const manifest=new Map(release.assets.map(a=>[a.path,a])),files=['weapons.js','equipment.js','weapons-ui.js','weapon-cards.js','weapon-cards.css','base-weapons.js','assets/base-weapons/09.svg'];
  const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  for(const file of files){const bytes=Buffer.from(await(await get('jeu/'+file)).arrayBuffer()),source=git(['show',tag+':V4/site/'+file]);assert.equal(hash(bytes),hash(source),file);assert.equal(hash(bytes),manifest.get('jeu/'+file).sha256,file);}
  const html=await(await get('jeu/index.html')).text();assert(html.includes('Kalistar V'+version));assert(html.includes('VERSION '+version));assert(html.includes('boot.js?v='+release.version));
  assert((await(await get('jeu/v4.css')).text()).includes("content:'V"+version+"'"));
  console.log(JSON.stringify({passed:true,version,commit:sha,cards:release.cards,verifiedFiles:files.length,url:base+'jeu/#weapons'},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
