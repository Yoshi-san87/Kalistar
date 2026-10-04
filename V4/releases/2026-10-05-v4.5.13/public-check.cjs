'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/';
const set=require('../../revisions/2026-10-05-orven-long-spear/specs.cjs');
async function get(file){const r=await fetch(base+file+'?release4513='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,file);return r;}
async function main(){
 const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const remote=await(await get('release.json')).json();assert.equal(remote.version,sha.slice(0,12));assert.equal(remote.cards,211);
 const assets=new Map(remote.assets.map(a=>[a.path,a])),catalogue=await(await get('jeu/catalogue.json')).json();
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 for(const c of set.cards){
  const published=catalogue.cards.find(p=>p.id===c.id);assert(published);assert.equal(published.characterId,c.characterId);
  const file='media/created/'+c.id+'.png',bytes=Buffer.from(await(await get(file)).arrayBuffer());
  assert.equal(hash(bytes),hash(fs.readFileSync(path.join(root,'V4/creations',c.id,'card.png'))));assert.equal(hash(bytes),assets.get(file).sha256);
 }
 const html=await(await get('jeu/index.html')).text();assert(html.includes('Kalistar V4.5.13'));assert(html.includes('VERSION 4.5.13'));
 assert((await(await get('jeu/v4.css')).text()).includes("content:'V4.5.13'"));
 console.log(JSON.stringify({passed:true,version:'4.5.13',commit:sha,cards:remote.cards,verifiedCards:set.cards.length,url:base+'jeu/'},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
