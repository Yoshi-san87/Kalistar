'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/';
async function get(file){const r=await fetch(base+file+'?grivka='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,file);return r;}
async function main(){
 const sha=execFileSync('git',['rev-parse','v4.5.46^{commit}'],{cwd:root,encoding:'utf8'}).trim();
 const release=await(await get('release.json')).json();
 assert.equal(release.version,sha.slice(0,12));assert.equal(release.cards,232);
 assert((await(await get('jeu/index.html')).text()).includes('VERSION 4.5.46'));
 assert((await(await get('jeu/v4.css')).text()).includes("content:'V4.5.46'"));
 const catalogue=await(await get('jeu/catalogue.json')).json();
 assert.equal(catalogue.cards.length,232);
 assert(!catalogue.cards.some(c=>['OKAMI','LYCANOS','GAROU'].includes(c.race)));
 console.log(JSON.stringify({passed:true,version:'4.5.46',commit:sha,cards:232,newPlayableCards:0},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
