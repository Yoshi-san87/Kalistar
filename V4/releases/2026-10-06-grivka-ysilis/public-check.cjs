'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/',tag='v4.5.45';
const refs=require('../../atelier/data/references.json');
const git=args=>execFileSync('git',args,{cwd:root,maxBuffer:16*1024*1024});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function get(file){const r=await fetch(base+file+'?ysilis='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,file);return r;}
function committedHash(file){
  const bytes=git(['show',tag+':'+file]);
  const pointer=bytes.length<1024&&bytes.toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/);
  return pointer?pointer[1]:hash(bytes);
}
async function main(){
  const commit=git(['rev-parse',tag+'^{commit}']).toString().trim(),release=await(await get('release.json')).json();
  assert.equal(release.version,commit.slice(0,12));assert.equal(release.cards,232);
  assert((await(await get('jeu/index.html')).text()).includes('VERSION 4.5.45'));
  assert((await(await get('jeu/v4.css')).text()).includes("content:'V4.5.45'"));
  const data=await(await get('jeu/catalogue.json')).json(),cards=data.cards.filter(c=>c.faction==='Ysilis');
  assert.deepEqual(cards.map(c=>c.id).sort(),['30000005','49900701','49900707']);
  assert(!data.cards.some(c=>c.faction==='Niveria'||['OKAMI','LYCANOS','GAROU'].includes(c.race)));
  assert(data.arenas.some(a=>a.name==='Le lac de Niveria'));
  const checked=[];
  for(const c of cards){
    const source=refs.cards.find(r=>r.card.id===c.id)?.png||'V4/creations/'+c.id+'/card.png';
    const file=c.pngUrl.replace(/^\//,''),actual=hash(Buffer.from(await(await get(file)).arrayBuffer()));
    assert.equal(actual,committedHash(source));assert.equal(actual,release.assets.find(a=>a.path===file).sha256);
    checked.push({id:c.id,name:c.name,faction:c.faction,sha256:actual});
  }
  const flag=hash(Buffer.from(await(await get('jeu/shared/factions/Niveria.png')).arrayBuffer()));
  assert.equal(flag,committedHash('V3/assets/factions/Niveria.png'));
  assert((await(await get('jeu/boot.js')).text()).includes("'factions.js'"));
  assert.equal(hash(Buffer.from(await(await get('jeu/factions.js')).arrayBuffer())),committedHash('V4/site/factions.js'));
  console.log(JSON.stringify({passed:true,version:'4.5.45',commit,checked,flag,cards:release.cards,newPlayableCards:0},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
