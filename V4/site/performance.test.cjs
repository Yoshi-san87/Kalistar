'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
async function boot({invalid=false,missing='',preview=false}={}){
  const preload=[],executed=[],errors=[],nodes=[],listeners={};let requested=false;
  const document={currentScript:{src:'https://kalistar.test/jeu/boot.js?v=audit'},head:{append(node){
    nodes.push(node);if(node.tag==='link'){assert(requested,'catalogue starts before preloads');preload.push(node.href);}
    else{executed.push(node.src);queueMicrotask(()=>node.src.startsWith(missing)&&missing?node.onerror():node.onload());}
  }},createElement(tag){return {tag,append(){},remove(){this.removed=true;}};},getElementById(){return {replaceChildren(){errors.push('failed');},append(){}};}};
  const window={KalistarPhonePreview:preview?{isHost:true,mountHost(){window.KALISTAR_PREVIEW_READY=true;}}:null,addEventListener(name,fn){listeners[name]=fn;}};
  const fetch=()=>{requested=true;return Promise.resolve({ok:true,json:async()=>invalid?{version:3}:{version:4,edition:'V4',cards:[{edition:'V4',pngUrl:'card.png'}]}});};
  vm.runInNewContext(read('boot.js'),{window,document,fetch,URL,location:{href:'https://kalistar.test/jeu/'},encodeURIComponent,Error});
  for(let i=0;i<100;i++)await new Promise(resolve=>setImmediate(resolve));
  return {preload,executed,errors,nodes,window};
}
test('boot downloads concurrently but executes validated dependencies in order',async()=>{
  const result=await boot();assert.equal(result.preload.length,42);assert.deepEqual(result.executed,result.preload);
  const names=result.executed.map(src=>src.split('?')[0]);assert.equal(new Set(names).size,names.length);
  for(const name of ['team-composition.js','matchmaking.js','pre-match.js'])assert.ok(names.indexOf(name)<names.indexOf('app.js'));
  assert.ok(names.indexOf('engine.js')<names.indexOf('matchmaking.js'));
  assert(result.preload.every(url=>url.endsWith('?v=audit')));assert(result.nodes.filter(n=>n.tag==='link').every(n=>n.removed));
});
test('invalid catalogue and missing modules fail closed; preview hosts stay lightweight',async()=>{
  const invalid=await boot({invalid:true});assert.equal(invalid.executed.length,0);assert.equal(invalid.errors.length,1);
  const missing=await boot({missing:'engine.js'});assert(missing.executed.at(-1).startsWith('engine.js'));assert(!missing.executed.some(src=>src.startsWith('app.js')));assert.equal(missing.errors.length,1);assert(missing.nodes.filter(n=>n.tag==='link').every(n=>n.removed));
  const preview=await boot({preview:true});assert.deepEqual(preview.preload,[]);assert.deepEqual(preview.executed,['assets/lucide.min.js']);assert(preview.window.KALISTAR_PREVIEW_READY);
});
test('lossless grimoire derivatives are reproducible and preserve the source hashes',()=>{
  const manifest=JSON.parse(read('../deploy/lossless-grimoire.json')).assets;
  for(const item of manifest){
    const source=fs.readFileSync(path.join(__dirname,'../..',item.source)),target=fs.readFileSync(path.join(__dirname,'../..',item.target));
    const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha(source),item.sourceSha256);assert.equal(sha(target),item.sha256);assert(item.lossless);assert(target.length<source.length*.75);
    assert.equal(target.toString('ascii',8,12),'WEBP');assert.equal(target.toString('ascii',12,16),'VP8L');assert.equal(item.pixelsSha256.length,64);
  }
});
test('obsolete preview and affinity pagination are gone, live DNA pips remain',()=>{
  const js=read('deck-builder.js'),css=read('deck-builder.css');
  assert(!/function (?:groupHTML|previewHTML|linksHTML)|affinityPage|data-deck-preview-panel|kdb-links/.test(js));assert(css.includes('.kdb-link-pips'));
  assert(!/^\s*\.kdb-(?:affinity|preview)\s*\{/m.test(css));
  assert(!read('app.js').includes('${builder().render()}'));
});
