'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Home=require('./home-screen.js');
test('home routes keep collection and all three real equipment slots',()=>{
  assert.deepEqual(Home.entries.map(e=>e.id),['collection','weapon','shield','relic']);
  for(const e of Home.entries)assert(fs.existsSync(__dirname+'/assets/'+e.image));
});
test('showcase is bounded, unique, randomized and does not mutate the catalogue',()=>{
  const cards=Array.from({length:343},(_,id)=>({id})),before=structuredClone(cards);
  const first=Home.selection(cards,()=>0),last=Home.selection(cards,()=>.999);
  assert.equal(first.length,8);assert.equal(new Set(first.map(c=>c.id)).size,8);
  assert.deepEqual(first.map(c=>c.id),[0,1,2,3,4,5,6,7]);assert.equal(last[0].id,342);
  assert.deepEqual(cards,before);assert.equal(Home.selection([]).length,0);
});
test('home timers respect reduced motion, dialogs and visibility and are cancelled on destroy',()=>{
  const source=fs.readFileSync(__dirname+'/home-screen.js','utf8');
  assert(source.includes('document.hidden||motion()'));assert(source.includes("document.querySelector('dialog[open]')"));
  assert(source.includes('observer?.disconnect()'));assert(source.includes('controller?.abort()'));assert(source.includes('clearTimeout(timer)'));
  assert(source.includes('intersect?.disconnect()'));assert(source.includes('cancelAnimationFrame(frame)'));
  assert(source.includes('if(!event.persisted){destroy();return;}'));
  assert(source.includes("addEventListener('pageshow',schedule"));
});

test('selection handles tiny catalogues and out-of-range random sources without undefined cards',()=>{
  const cards=[{id:1},{id:2}];
  for(const value of [-1,1,Infinity,NaN])assert.deepEqual(new Set(Home.selection(cards,()=>value)),new Set(cards));
  assert.deepEqual(Home.selection([cards[0]]),[cards[0]]);
  assert(Home.interval>=8000,'leave time to read a real card');
});

test('home deck summary reflects existing state without inventing progress or mutating a save',()=>{
  const state={deckName:'Les premiers Sentry',deckCount:8,resume:true},before=structuredClone(state);
  assert.deepEqual(Home.deckStatus(state),{name:state.deckName,count:8,resume:true});assert.deepEqual(state,before);
  assert.deepEqual(Home.deckStatus(null),{name:'Ma composition',count:0,resume:false});
  assert.equal(Home.deckStatus({deckCount:Infinity}).count,0);
  assert.equal(Home.deckStatus({deckCount:20.4}).count,10);
  assert.equal(Home.deckStatus({deckCount:-1}).count,0);
  assert.equal(Home.deckStatus({deckCount:4.9,resume:'true'}).count,4);
  assert.equal(Home.deckStatus({resume:'true'}).resume,false);
});

test('the painted backdrop has bounded desktop/phone exports and a preserved original',()=>{
  const root=path.resolve(__dirname,'../..'),proof=JSON.parse(fs.readFileSync(path.join(root,'V4/revisions/2026-10-15-home-sanctum/media-provenance.json'),'utf8'));
  assert.equal(proof.tool,'image_gen.imagegen');assert.equal(proof.assets.length,2);
  for(const record of [proof.original,...proof.assets]){
    const bytes=fs.readFileSync(path.join(root,record.source));assert.equal(bytes.length,record.bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),record.sha256);
  }
  assert(proof.assets[0].bytes<500000);assert(proof.assets[1].bytes<180000);
  assert(proof.assets[1].width<proof.assets[1].height);
});

test('home controller is safe to construct and destroy before a view exists',()=>{
  const instance=Home.create({data:{cards:[],elements:{}},image:()=>''});
  assert.equal(typeof instance.mount,'function');assert.doesNotThrow(()=>{instance.destroy();instance.destroy();});
});
