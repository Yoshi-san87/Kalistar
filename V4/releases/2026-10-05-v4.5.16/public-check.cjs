'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),base='https://yoshi-san87.github.io/Kalistar/';
async function get(file){const r=await fetch(base+file+'?release4516='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,file);return r;}
async function main(){
  const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),remote=await(await get('release.json')).json();assert.equal(remote.version,sha.slice(0,12));
  const assets=new Map(remote.assets.map(a=>[a.path,a])),files=['equipment.js','weapons.js','weapons-ui.js','weapon-cards.js','weapon-art.js'];
  for(const id of ['arborium-twinstring-bow','arborium-thorn-dagger'])files.push('assets/equipment/'+id+'-v1.webp','assets/equipment/'+id+'-ring-v1.webp','assets/weapon-cards/'+id+'-v1.webp','assets/weapon-cards/'+id+'-scene-v1.webp');
  const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  for(const file of files){const bytes=Buffer.from(await(await get('jeu/'+file)).arrayBuffer()),local=fs.readFileSync(path.join(root,'V4/site',file));assert.equal(hash(bytes),hash(local),file);assert.equal(hash(bytes),assets.get('jeu/'+file).sha256,file);}
  const html=await(await get('jeu/index.html')).text();assert(html.includes('Kalistar V4.5.16'));assert(html.includes('VERSION 4.5.16'));assert(html.includes('boot.js?v='+remote.version));
  assert((await(await get('jeu/v4.css')).text()).includes("content:'V4.5.16'"));
  console.log(JSON.stringify({passed:true,version:'4.5.16',commit:sha,cards:remote.cards,verifiedFiles:files.length,url:base+'jeu/#weapons'},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
