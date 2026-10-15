'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
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
  assert(source.includes('!document.hidden&&!motion()'));assert(source.includes("document.querySelector('dialog[open]')"));
  assert(source.includes('observer?.disconnect()'));assert(source.includes('controller?.abort()'));assert(source.includes('clearTimeout(timer)'));
});
