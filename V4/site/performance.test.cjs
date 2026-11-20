'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
async function boot({invalid=false,missing='',preview=false}={}){
  const preload=[],styles=[],executed=[],errors=[],nodes=[],listeners={},readings=[];let requested=false;
  const document={currentScript:{src:'https://kalistar.test/jeu/boot.js?v=audit'},head:{append(node){
    nodes.push(node);if(node.tag==='link'&&node.rel==='stylesheet'){styles.push(node.href);}
    else if(node.tag==='link'){assert.equal(node.rel,'preload');assert.equal(node.as,'script');assert(requested,'catalogue starts before preloads');preload.push(node.href);}
    else{executed.push(node.src);queueMicrotask(()=>node.src.startsWith(missing)&&missing?node.onerror():node.onload());}
  }},createElement(tag){return {tag,append(){},remove(){this.removed=true;}};},getElementById(){return {replaceChildren(){errors.push('failed');},append(){}};}};
  const window={KalistarStartupReading:{create:()=>({setCards:cards=>readings.push(cards)})},KalistarStartup:{create:()=>({fail:fn=>fn()})},KalistarPhonePreview:preview?{isHost:true,mountHost(){window.KALISTAR_PREVIEW_READY=true;}}:null,addEventListener(name,fn){listeners[name]=fn;}};
  const fetch=()=>{requested=true;return Promise.resolve({ok:true,json:async()=>invalid?{version:3}:{version:4,edition:'V4',cards:[{edition:'V4',pngUrl:'card.png'}]}});};
  vm.runInNewContext(read('boot.js'),{window,document,fetch,URL,location:{href:'https://kalistar.test/jeu/'},encodeURIComponent,Error});
  for(let i=0;i<100;i++)await new Promise(resolve=>setImmediate(resolve));
  return {preload,styles,executed,errors,nodes,window,readings};
}
test('boot downloads concurrently but executes validated dependencies in order',async()=>{
  const result=await boot();assert.equal(result.preload.length,74);assert.deepEqual(result.executed,result.preload);
  assert.deepEqual(result.readings,[[{edition:'V4',pngUrl:'card.png'}]],'only the validated catalogue supplies the reading card');
  assert.deepEqual(result.styles,['ultimate-ui.css?v=audit']);
  const names=result.executed.map(src=>src.split('?')[0]);assert.equal(new Set(names).size,names.length);
  for(const name of ['team-composition.js','matchmaking.js','pre-match.js','positions.js','home-screen.js','page-transitions.js','map-view.js','guide-scenario.js','guide-view.js','rules-documents.js','library-view.js']){assert.ok(names.includes(name));assert.ok(names.indexOf(name)<names.indexOf('app.js'));}
  assert.ok(names.indexOf('guide-scenario.js')<names.indexOf('guide-view.js'));
  assert.ok(names.indexOf('rules-documents.js')<names.indexOf('library-view.js'));
  for(const name of ['journey-definitions.js','journey-combat.js','journey-client.js','journey-view.js','gaming-book.js'])assert.ok(names.indexOf(name)>names.indexOf('engine.js')&&names.indexOf(name)<names.indexOf('app.js'));
  assert.ok(names.indexOf('journey-definitions.js')<names.indexOf('journey-combat.js'));
  for(const name of ['cloud-config.js','cloud-session.js','cloud-registry.js','cloud-registry-ui.js'])assert.ok(names.indexOf(name)>=0&&names.indexOf(name)<names.indexOf('app.js'));
  assert.ok(names.indexOf('cloud-config.js')<names.indexOf('cloud-registry-ui.js'));
  assert.ok(names.indexOf('cloud-archives.js')>=0&&names.indexOf('cloud-archives.js')<names.indexOf('cloud-player.js'));
  assert.ok(names.indexOf('theme-music.js')>=0&&names.indexOf('theme-music.js')<names.indexOf('app.js'));
  assert.ok(names.indexOf('arena-audio.js')>=0&&names.indexOf('arena-audio.js')<names.indexOf('combat-effects.js'));
  const app=read('app.js'),theme=read('theme-music.js');
  assert(app.indexOf('await startup.ready()')<app.indexOf('KalistarThemeMusic.create()'),'music is constructed after explicit entry');
  assert(app.indexOf('window.KALISTAR_READY=true')<app.indexOf('themeMusic.activate()'),'music starts only when the view is active');
  assert(theme.length<10000&&!/setInterval|requestAnimationFrame|AudioContext|AnalyserNode/.test(theme),'bounded native player without a permanent processing loop');
  assert(!names.some(name=>name.startsWith('assets/supabase/')),'the official Auth SDK is loaded by the session controller, never as a game dependency');
  assert.ok(names.indexOf('engine.js')<names.indexOf('matchmaking.js'));
  assert.ok(names.includes('ai-strategies.js'));assert.ok(names.indexOf('ai-strategies.js')<names.indexOf('engine.js'));
  assert.ok(names.indexOf('relic-ultimates.js')<names.indexOf('equipment.js'));
  for(const [before,after] of [['ultimate-definitions.js','weapons.js'],['ultimate-runtime.js','equipment.js'],['ultimate-ui.js','equipment-presentation.js'],['ultimate-ui.js','weapon-cards.js']])assert.ok(names.indexOf(before)>=0&&names.indexOf(before)<names.indexOf(after));
  assert(result.preload.every(url=>url.endsWith('?v=audit')));assert(result.nodes.filter(n=>n.rel==='preload').every(n=>n.removed));assert(result.nodes.filter(n=>n.rel==='stylesheet').every(n=>!n.removed));
});
test('invalid catalogue and missing modules fail closed; preview hosts stay lightweight',async()=>{
  const invalid=await boot({invalid:true});assert.equal(invalid.executed.length,0);assert.equal(invalid.errors.length,1);assert.equal(invalid.readings.length,0);
  const missing=await boot({missing:'engine.js'});assert(missing.executed.at(-1).startsWith('engine.js'));assert(!missing.executed.some(src=>src.startsWith('app.js')));assert.equal(missing.errors.length,1);assert(missing.nodes.filter(n=>n.rel==='preload').every(n=>n.removed));
  const missingAI=await boot({missing:'ai-strategies.js'});assert(missingAI.executed.at(-1).startsWith('ai-strategies.js'));assert(!missingAI.executed.some(src=>src.startsWith('engine.js')));assert.equal(missingAI.errors.length,1);assert(missingAI.nodes.filter(n=>n.rel==='preload').every(n=>n.removed));
  const preview=await boot({preview:true});assert.deepEqual(preview.preload,[]);assert.deepEqual(preview.styles,[]);assert.deepEqual(preview.executed,['assets/lucide.min.js']);assert(preview.window.KALISTAR_PREVIEW_READY);
  const missingArchives=await boot({missing:'cloud-archives.js'});assert.equal(missingArchives.errors.length,1);assert(!missingArchives.executed.some(src=>src.startsWith('cloud-player.js')));
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

test('the seventeen JRPG samples are short mono assets, registered and peak-controlled',()=>{
  const spec=JSON.parse(read('../revisions/2026-11-17-arena-jrpg/exports.json')),registry=JSON.parse(read('../deploy/runtime-media.json'));
  assert.equal(spec.items.length,17);assert.equal(spec.creditsUsed,34);assert.equal(spec.channels,1);assert.equal(spec.sampleRate,44100);
  assert(spec.items.reduce((n,item)=>n+item.bytes,0)<500000);
  assert.equal(new Set(spec.items.map(item=>item.sha256)).size,17);
  for(const item of spec.items){const bytes=fs.readFileSync(path.join(__dirname,'../..',item.path));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);assert.equal(bytes.length,item.bytes);assert(item.durationSeconds<=1.4&&item.peak<.95&&item.rms>.025);assert(registry.files.some(f=>f.source===item.path&&f.sha256===item.sha256));}
  assert(!/createOscillator|createScriptProcessor|AudioWorklet|setInterval|requestAnimationFrame/.test(read('arena-audio.js')),'decoded samples, not another procedural audio loop');
});
