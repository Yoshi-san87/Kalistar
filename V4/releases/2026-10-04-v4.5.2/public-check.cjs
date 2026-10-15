'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/';
async function get(relative){
  const r=await fetch(base+relative+'?release452='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,relative);return r;
}
async function main(){
  assert(process.env.KALISTAR_RELEASE_DIST,'Use the isolated release build');
  const dist=path.resolve(process.env.KALISTAR_RELEASE_DIST),local=JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8'));
  const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();assert.equal(local.version,sha.slice(0,12));
  const remote=await(await get('release.json')).json();assert.deepEqual(remote,local);
  const assets=new Map(remote.assets.map(a=>[a.path,a]));
  const samples=['jeu/weapons.js','jeu/equipment.js','jeu/weapon-cards.js','jeu/weapon-cards.css','jeu/ui-system.js',
    'jeu/assets/weapon-cards/white-oath-rapier-v1.webp','jeu/assets/equipment/socom-v1.webp',
    'jeu/assets/weapon-cards/backgrounds/postal-relay-v1.webp','media/created/49055457.png'];
  for(const file of samples){
    assert(assets.has(file),file);const bytes=Buffer.from(await(await get(file)).arrayBuffer());
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),assets.get(file).sha256,file);
  }
  const html=await(await get('jeu/index.html')).text();assert.match(html,/<title>Kalistar V4\.5\.2/);assert.match(html,/VERSION 4\.5\.2/);
  assert(html.includes('weapon-cards.css?v='+remote.version));assert(html.includes('ui-system.css?v='+remote.version));
  assert((await(await get('jeu/v4.css')).text()).includes("content:'V4.5.2'"));
  const manuscript=await(await get('jeu/story-content.json')).json();
  assert.deepEqual(manuscript,JSON.parse(fs.readFileSync(path.join(dist,'jeu/story-content.json'),'utf8')));
  const words=manuscript.sections.reduce((sum,s)=>sum+s.paragraphs.reduce((n,p)=>n+(p.match(/\S+/g)||[]).length,0),0);assert.equal(words,80144);
  const catalogue=await(await get('jeu/catalogue.json')).json();
  assert.deepEqual(catalogue,JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8')));
  console.log(JSON.stringify({passed:true,version:'4.5.2',commit:sha,cards:remote.cards,words,assets:remote.assets.length,url:base+'jeu/'},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
