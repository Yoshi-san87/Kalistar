'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),dist=path.join(root,'V4/deploy/dist');
const base='https://yoshi-san87.github.io/Kalistar/';
async function get(relative){const r=await fetch(base+relative+'?release444='+Date.now(),{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,relative);return r;}
async function main(){
  const local=JSON.parse(fs.readFileSync(path.join(dist,'release.json'),'utf8'));
  const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root}).toString().trim();
  assert.equal(local.version,sha.slice(0,12),'build must use the published commit');
  const remote=await(await get('release.json')).json();assert.deepEqual(remote,local,'every release entry matches');
  const proof=JSON.parse(fs.readFileSync(path.join(root,'V4/revisions/2026-10-03-menu-identity/media-provenance.json'),'utf8'));
  const assets=new Map(remote.assets.map(a=>[a.path,a]));
  const samples=[...proof.assets,...proof.fonts].map(a=>a.file.replace('V4/site/','jeu/'));
  samples.push('jeu/assets/equipment/fallen-king-axe-v3.webp','jeu/assets/equipment/little-joys-flute-v3.webp','jeu/assets/logo.webp');
  for(const relative of samples){
    assert(assets.has(relative));const bytes=Buffer.from(await(await get(relative)).arrayBuffer());
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),assets.get(relative).sha256,relative);
  }
  const html=await(await get('jeu/index.html')).text();assert.match(html,/<title>Kalistar V4\.4\.4/);assert.match(html,/VERSION 4\.4\.4/);
  assert(html.includes('navigation.css?v='+remote.version));assert(html.includes('class="kalistar-nav-icon"'));
  const css=await(await get('jeu/v4.css')).text();assert(css.includes("content:'V4.4.4'"));
  const nav=await(await get('jeu/navigation.css')).text();assert(nav.includes('kalistel-rainbow-v1.webp'));assert(nav.includes('cinzel-v26-latin.woff2'));
  assert(nav.includes('margin:8px 0 -1px; border-bottom:0'));
  assert(nav.includes('position:relative; z-index:30; overflow:visible'));
  assert(nav.includes('--navigation-header-height:110px'));
  const catalogue=await(await get('jeu/catalogue.json')).json();assert.deepEqual(catalogue,JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8')));
  return {passed:true,version:'4.4.4',commit:sha,cards:remote.cards,assets:remote.assets.length,matchingSamples:samples.length,url:base+'jeu/'};
}
if(require.main===module)main().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error);process.exitCode=1;});
module.exports={main};
