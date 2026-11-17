'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Audio=require('./arena-audio.js');
function fixture({blocked=false,deferred=false}={}){
  const host=new EventTarget(),doc=new EventTarget(),timers=new Map(),nodes=[],values=new Map();let id=0,resolve;
  const context={state:'suspended',sampleRate:8000,currentTime:10,destination:{},resume(){if(blocked)return Promise.reject(Error('blocked'));this.state='running';return deferred?new Promise(r=>resolve=r):Promise.resolve();},suspend(){this.state='suspended';return Promise.resolve();},close(){this.state='closed';return Promise.resolve();},createBuffer:(_c,n)=>({getChannelData:()=>new Float32Array(n)}),createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};},createOscillator(){const n={frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){n.disconnected=true;},start(){},stop(){}};nodes.push(n);return n;},createBufferSource(){return this.createOscillator();}};
  let created=0;host.AudioContext=function(){created++;return context;};host.document=doc;host.location={hash:'#arena'};
  host.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};host.setTimeout=fn=>{timers.set(++id,fn);return id;};host.clearTimeout=id=>timers.delete(id);
  doc.hidden=false;doc.covered=false;doc.querySelector=()=>doc.covered;doc.querySelectorAll=()=>[];
  const fire=(target,name,fields={})=>target.dispatchEvent(Object.assign(new Event(name),fields));
  // Node's Event.isTrusted is non-configurable: retain the browser gesture gate and unlock via a controlled EventTarget adapter.
  const add=doc.addEventListener.bind(doc);doc.addEventListener=(name,fn,options)=>add(name,event=>fn(name==='pointerdown'?{isTrusted:true}:event),options);
  return {host,doc,context,nodes,timers,fire,resolve:()=>resolve?.(),get created(){return created;},finish(){for(const n of [...nodes])n.onended?.();},expire(){for(const [id,fn]of [...timers]){timers.delete(id);fn();}}};
}
test('arena audio stays dormant before activation and a gesture; preferences are bounded',async()=>{
  assert.deepEqual(Audio.preference(),{enabled:true,volume:.2});assert.equal(Audio.preference({volume:7}).volume,.4);
  const f=fixture(),audio=Audio.create(f);assert.equal(await audio.play('strike'),false);audio.activate();assert.equal(await audio.play('strike'),false);assert.equal(f.created,0);audio.destroy();
});
test('one bounded context, at most four concurrent cues, nodes disconnect and idle suspends',async()=>{
  const f=fixture(),audio=Audio.create(f);audio.activate();f.fire(f.doc,'pointerdown');
  for(let i=0;i<4;i++)assert.equal(await audio.play('strike'),true);assert.equal(await audio.play('strike'),false);assert.equal(f.created,1);assert.equal(audio.snapshot().voices,4);
  f.finish();assert(f.nodes.every(n=>n.disconnected));f.expire();assert.equal(audio.snapshot().voices,0);assert.equal(f.context.state,'suspended');assert.equal(f.timers.size,0);audio.destroy();
});
test('hidden, modal, other routes, mute and zero volume suppress cues and cancel pending work',async()=>{
  const f=fixture(),audio=Audio.create(f);audio.activate();f.fire(f.doc,'pointerdown');assert(await audio.play('magic'));
  f.doc.hidden=true;f.fire(f.doc,'visibilitychange');assert.equal(audio.snapshot().voices,0);assert.equal(f.timers.size,0);assert.equal(await audio.play('roll'),false);f.doc.hidden=false;
  f.doc.covered=true;assert.equal(await audio.play('roll'),false);f.doc.covered=false;
  f.host.location.hash='#home';f.fire(f.host,'hashchange');assert.equal(await audio.play('roll'),false);f.host.location.hash='#arena';
  audio.set({enabled:false});assert.equal(await audio.play('roll'),false);audio.set({enabled:true,volume:0});assert.equal(await audio.play('roll'),false);audio.destroy();assert.equal(f.context.state,'closed');assert.equal(f.timers.size,0);
});
test('abort releases voices; delayed resume cannot play after leaving; refused autoplay is harmless',async()=>{
  const f=fixture(),audio=Audio.create(f);audio.activate();f.fire(f.doc,'pointerdown');const c=new AbortController();assert(await audio.play('support',{signal:c.signal}));c.abort();assert.equal(audio.snapshot().voices,0);audio.destroy();assert.equal(f.timers.size,0);
  const g=fixture({deferred:true}),b=Audio.create(g);b.activate();g.fire(g.doc,'pointerdown');const pending=b.play('roll');g.host.location.hash='#home';g.fire(g.host,'hashchange');g.resolve();assert.equal(await pending,false);g.expire();assert.equal(g.nodes.length,0);b.destroy();
  const h=fixture({blocked:true}),d=Audio.create(h);d.activate();h.fire(h.doc,'pointerdown');assert.equal(await d.play('roll'),false);d.destroy();
});
test('bfcache suspends without a second context and normal pagehide releases it',async()=>{
  const f=fixture(),audio=Audio.create(f);audio.activate();f.fire(f.doc,'pointerdown');await audio.play('shield');f.fire(f.host,'pagehide',{persisted:true});assert.equal(audio.snapshot().voices,0);assert.equal(await audio.play('roll'),false);
  f.fire(f.host,'pageshow',{persisted:true});assert(await audio.play('roll'));assert.equal(f.created,1);f.fire(f.host,'pagehide',{persisted:false});assert.equal(f.context.state,'closed');assert.equal(await audio.play('roll'),false);
});
