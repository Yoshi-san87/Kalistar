'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/';
async function get(file){const r=await fetch(base+file+'?release453='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,file);return r;}
async function main(){
  assert(process.env.KALISTAR_RELEASE_DIST,'Provide the isolated built release');
  const dist=path.resolve(process.env.KALISTAR_RELEASE_DIST),local=JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8'));
  const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();assert.equal(local.version,sha.slice(0,12));
  const remote=await(await get('release.json')).json();assert.deepEqual(remote,local);
  const assets=new Map(remote.assets.map(a=>[a.path,a]));
  const files=new Set(['jeu/weapon-art.js','jeu/weapon-cards.js','jeu/equipment-presentation.js','jeu/weapons.css','jeu/weapons.js']);
  for(const a of Object.values(require('../../site/weapon-art.js').entries)){
    files.add('jeu/assets/weapon-cards/'+a.scene);files.add('jeu/assets/equipment/'+a.rim);files.add('jeu/assets/equipment/'+a.body);
  }
  for(const file of files){
    assert(assets.has(file));const bytes=Buffer.from(await(await get(file)).arrayBuffer());
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),assets.get(file).sha256,file);
  }
  const html=await(await get('jeu/index.html')).text();assert.match(html,/<title>Kalistar V4\.5\.3/);assert.match(html,/VERSION 4\.5\.3/);
  assert(html.includes('boot.js?v='+remote.version));
  assert((await(await get('jeu/v4.css')).text()).includes("content:'V4.5.3'"));
  console.log(JSON.stringify({passed:true,version:'4.5.3',commit:sha,cards:remote.cards,verifiedFiles:files.size,url:base+'jeu/#weapons'},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
