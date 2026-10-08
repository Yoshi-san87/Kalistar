'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const set=require('../../expansions/2026-10-08-eleven-lives/set.json');
const base='https://yoshi-san87.github.io/Kalistar/';
const commit=process.argv[2];assert(/^[a-f0-9]{40}$/.test(commit||''),'Provide the published commit SHA');
async function get(relative){
 const url=new URL(relative,base);url.searchParams.set('release-check',commit);
 const response=await fetch(url,{signal:AbortSignal.timeout(60000),cache:'no-store'});
 assert(response.ok,response.status+' '+url);return response;
}
async function main(){
 const html=await (await get('jeu/')).text();assert(html.includes('VERSION 4.5.52'));
 const release=await (await get('release.json')).json();assert.equal(release.version,commit.slice(0,12));assert.equal(release.cards,243);
 const catalogue=await (await get('jeu/catalogue.json')).json();assert.equal(catalogue.cards.length,243);
 const checked=[];
 for(const spec of set.cards){
  const card=catalogue.cards.find(c=>c.id===spec.id);assert(card,spec.key);
  assert.equal(card.characterId,spec.key+'-kalistar');
  const proof=require('../../creations/'+spec.id+'/verification.json');
  const bytes=Buffer.from(await (await get('media/created/'+spec.id+'.png')).arrayBuffer());
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),proof.hashes['card.png'],spec.key);
  assert.equal(bytes.readUInt32BE(16),897);assert.equal(bytes.readUInt32BE(20),1497);
  checked.push({id:spec.id,name:card.name,sha256:proof.hashes['card.png']});
 }
 console.log(JSON.stringify({passed:true,url:base+'jeu/',version:'4.5.52',commit,catalogue:243,checked},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
