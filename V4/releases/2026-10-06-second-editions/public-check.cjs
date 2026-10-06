'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/',tag='v4.5.35';
const set=require('../../expansions/2026-10-06-second-edition-scenes/set.json');
const git=args=>execFileSync('git',args,{cwd:root,maxBuffer:16*1024*1024});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function get(file){const response=await fetch(base+file+'?scenes4535='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200,file);return response;}
async function main(){
 const sha=git(['rev-parse',tag+'^{commit}']).toString().trim(),release=await(await get('release.json')).json();
 assert.equal(release.version,sha.slice(0,12));assert.equal(release.cards,232);
 const html=await(await get('jeu/index.html')).text();assert(html.includes('Kalistar V4.5.35'));assert(html.includes('VERSION 4.5.35'));
 assert((await(await get('jeu/v4.css')).text()).includes("content:'V4.5.35'"));
 const catalogue=await(await get('jeu/catalogue.json')).json(),results=[];
 for(const c of set.cards){
  const entry=catalogue.cards.find(p=>p.id===c.id);assert(entry,c.name);assert.equal(entry.characterId,c.characterId);assert.equal(entry.name,c.name);
  assert.deepEqual(entry.atk,c.atk);assert.deepEqual(entry.defense,c.defense);
  assert.equal(entry.title,c.title);assert.equal(entry.weapon,c.weapon);assert.equal(entry.role,c.role);
  assert.equal(catalogue.cards.filter(p=>p.characterId===c.characterId).length,2);
  assert(catalogue.cards.some(p=>p.id===c.lineage));
  const file='media/created/'+c.id+'.png',png=Buffer.from(await(await get(file)).arrayBuffer());
  const committed=git(['show',tag+':V4/creations/'+c.id+'/card.png']);
  const pointer=committed.length<1024&&committed.toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/);
  assert.equal(hash(png),pointer?pointer[1]:hash(committed));assert.equal(hash(png),release.assets.find(a=>a.path===file).sha256);
  results.push({id:c.id,name:c.name,sha256:hash(png)});
 }
 console.log(JSON.stringify({passed:true,version:'4.5.35',commit:sha,cards:release.cards,verified:results,url:base+'jeu/#collection'},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
