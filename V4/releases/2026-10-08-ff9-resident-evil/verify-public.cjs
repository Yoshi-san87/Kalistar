'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const config=require('./release.json'),{set}=require('../../expansions/2026-10-08-final-fantasy-ix/current.cjs'),re=require('../../revisions/2026-10-08-resident-evil-faces/plan.json');
const base='https://yoshi-san87.github.io/Kalistar/',commit=process.argv[2];
assert(/^[a-f0-9]{40}$/.test(commit||''));
async function get(relative){
 const url=new URL(relative,base);url.searchParams.set('release-check',commit);
 const response=await fetch(url,{signal:AbortSignal.timeout(90000),cache:'no-store'});assert(response.ok,response.status+' '+url);return response;
}
async function main(){
 const html=await(await get('jeu/')).text();assert(html.includes('VERSION '+config.version));
 const release=await(await get('release.json')).json();assert.equal(release.version,commit.slice(0,12));assert.equal(release.cards,265);
 const data=await(await get('jeu/catalogue.json')).json();assert.equal(data.cards.length,265);
 const checked=[],sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 for(const spec of [...set.cards,...re.cards]){
  const card=data.cards.find(c=>c.id===spec.id),local=require('../../creations/'+spec.id+'/profile.json'),proof=require('../../creations/'+spec.id+'/verification.json');
  assert(card,spec.id);
  for(const k of ['name','title','description','characterId','race','positions','atk','defense','magic','barriers'])assert.deepEqual(card[k],local[k],spec.id+'.'+k);
  const bytes=Buffer.from(await(await get('media/created/'+spec.id+'.png')).arrayBuffer());
  assert.equal(sha(bytes),proof.hashes['card.png'],spec.id);assert.equal(bytes.readUInt32BE(16),897);assert.equal(bytes.readUInt32BE(20),1497);
  checked.push({id:spec.id,name:card.name,sha256:proof.hashes['card.png']});
 }
 for(const p of ['factions/FF9.png',...['MICE','BATRA','RATZ','MACAKO'].map(r=>'races/'+r+'.png')]){
  const remote=Buffer.from(await(await get('jeu/assets/'+p)).arrayBuffer()),local=fs.readFileSync(path.resolve(__dirname,'../../site/assets',p));
  assert.equal(sha(remote),sha(local));checked.push({asset:p,sha256:sha(local)});
 }
 console.log(JSON.stringify({passed:true,version:config.version,commit,cards:265,checked,url:base+'jeu/#collection'},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
