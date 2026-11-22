'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Audio=require('./arena-audio.js');
function fixture({blocked=false,deferred=false,missing=false}={}){
  const host=new EventTarget(),doc=new EventTarget(),timers=new Map(),nodes=[],values=new Map(),resumes=[],requests=[];let id=0;
  const context={state:'suspended',sampleRate:44100,currentTime:10,destination:{},resume(){if(blocked)return Promise.reject(Error('blocked'));this.state='running';return deferred?new Promise(r=>resumes.push(r)):Promise.resolve();},suspend(){this.state='suspended';return Promise.resolve();},close(){this.state='closed';return Promise.resolve();},decodeAudioData:async()=>({duration:1.35,length:59535,numberOfChannels:1}),createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};},createDynamicsCompressor(){return {threshold:{},knee:{},ratio:{},attack:{},release:{},connect(){},disconnect(){}};},createBufferSource(){const n={playbackRate:{value:1},connect(){},disconnect(){n.disconnected=true;},start(){n.started=true;},stop(){}};nodes.push(n);return n;}};
  let created=0;host.AudioContext=function(){created++;return context;};host.document=doc;host.location={hash:'#arena'};
  host.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};host.setTimeout=fn=>{timers.set(++id,fn);return id;};host.clearTimeout=id=>timers.delete(id);
  host.fetch=async url=>{requests.push(url);return {ok:!missing,arrayBuffer:async()=>new ArrayBuffer(30)};};
  doc.hidden=false;doc.covered=false;doc.querySelector=()=>doc.covered;doc.querySelectorAll=()=>[];
  const fire=(target,name,fields={})=>target.dispatchEvent(Object.assign(new Event(name),fields));
  // Node's Event.isTrusted is non-configurable: retain the browser gesture gate and unlock via a controlled EventTarget adapter.
  const add=doc.addEventListener.bind(doc);doc.addEventListener=(name,fn,options)=>add(name,event=>fn(name==='pointerdown'?{isTrusted:true}:event),options);
  return {host,doc,context,nodes,timers,requests,fire,async settle(){for(let i=0;i<15;i++)await Promise.resolve();},resolve(){for(const fn of resumes.splice(0))fn();},get created(){return created;},finish(){for(const n of [...nodes])n.onended?.();},expire(){for(const [id,fn]of [...timers]){timers.delete(id);fn();}}};
}
test('arena audio stays dormant before activation and a gesture; preferences are bounded',async()=>{
  assert.deepEqual(Audio.preference(),{enabled:true,volume:.3});assert.equal(Audio.preference({volume:7}).volume,.4);
  const f=fixture(),audio=Audio.create(f);assert.equal(await audio.play('strike'),false);audio.activate();assert.equal(await audio.play('strike'),false);assert.equal(f.created,0);audio.destroy();
});
test('one bounded context, at most four concurrent cues, nodes disconnect and idle suspends',async()=>{
  const f=fixture(),audio=Audio.create(f);audio.activate();f.fire(f.doc,'pointerdown');
  for(let i=0;i<4;i++)assert.equal(await audio.play('strike'),true);assert.equal(await audio.play('strike'),false);assert.equal(f.created,1);assert.equal(audio.snapshot().voices,4);
  f.finish();assert(f.nodes.every(n=>n.disconnected));f.expire();assert.equal(audio.snapshot().voices,0);assert.equal(f.context.state,'suspended');assert.equal(f.timers.size,0);
  assert.equal(f.requests.filter(url=>url.endsWith('/strike.mp3')).length,1,'one fetch and decode shared by all strikes');audio.destroy();
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
  const g=fixture({deferred:true}),b=Audio.create(g);b.activate();g.fire(g.doc,'pointerdown');const pending=b.play('roll');await g.settle();g.host.location.hash='#home';g.fire(g.host,'hashchange');g.resolve();assert.equal(await pending,false);g.expire();assert.equal(g.nodes.length,0);b.destroy();
  const h=fixture({blocked:true}),d=Audio.create(h);d.activate();h.fire(h.doc,'pointerdown');assert.equal(await d.play('roll'),false);d.destroy();
});
test('all twelve elements select distinct recorded impacts; unknown inputs cannot create asset paths',async()=>{
  assert.equal(new Set(Audio.elements.map(e=>Audio.resolve('magic',e).asset)).size,12);assert.equal(Audio.resolve('magic','../../secret').asset,'RAINBOW');assert.equal(Audio.resolve('__proto__'),null);assert.equal(Audio.resolve('toString'),null);
  const f=fixture(),audio=Audio.create(f);audio.activate();f.fire(f.doc,'pointerdown');
  for(const element of Audio.elements){assert(await audio.play('magic',{element}));f.finish();}assert.equal(new Set(f.requests).size,18);audio.destroy();
});
test('failed media stays silent without repeated requests, and destruction cannot revive a decode',async()=>{
  const f=fixture({missing:true}),audio=Audio.create(f);audio.activate();f.fire(f.doc,'pointerdown');await f.settle();assert.equal(await audio.play('strike'),false);assert.equal(await audio.play('strike'),false);assert.equal(f.requests.filter(u=>u.endsWith('/strike.mp3')).length,1);audio.destroy();assert.equal(f.timers.size,0);
  const g=fixture(),b=Audio.create(g);b.activate();g.fire(g.doc,'pointerdown');const p=b.play('magic',{element:'PYRO'});b.destroy();assert.equal(await p,false);assert.equal(g.nodes.length,0);assert.equal(g.context.state,'closed');await g.settle();assert.equal(g.timers.size,0);
});
test('bfcache suspends without a second context and normal pagehide releases it',async()=>{
  const f=fixture(),audio=Audio.create(f);audio.activate();f.fire(f.doc,'pointerdown');await audio.play('shield');f.fire(f.host,'pagehide',{persisted:true});assert.equal(audio.snapshot().voices,0);assert.equal(await audio.play('roll'),false);
  f.fire(f.host,'pageshow',{persisted:true});assert(await audio.play('roll'));assert.equal(f.created,1);f.fire(f.host,'pagehide',{persisted:false});assert.equal(f.context.state,'closed');assert.equal(await audio.play('roll'),false);
});

test('mix trim preserves preferences; impacts replace buildup and departure has its own asset',async()=>{
  assert.equal(Audio.MIX_TRIM,.42);assert.equal(Audio.url('departure'),'assets/audio/arena-departure-v1.mp3');
  assert.equal(Audio.resolve('departure').asset,'departure');
  const f=fixture(),audio=Audio.create(f);audio.set({volume:.11});audio.activate();f.fire(f.doc,'pointerdown');
  assert(await audio.play('roll'));assert(await audio.play('cast'));assert.equal(audio.snapshot().voices,2);
  assert(await audio.play('magic',{element:'PYRO'}));assert.equal(audio.snapshot().voices,1);
  assert.equal(audio.snapshot().volume,.11);f.finish();assert(await audio.play('departure'));assert(f.requests.some(u=>u===Audio.url('departure')));audio.destroy();
});

test('compact menu and account controls use the same bounded values and data contract',()=>{
  for(const menu of [false,true]){
    const html=Audio.controls({enabled:false,volume:.13},{menu});
    assert(html.includes('data-arena-sound-volume'));assert(html.includes('value="13"'));
    assert(html.includes('data-arena-sound-enabled'));assert(!html.includes('checked'));
    assert(html.includes('max="40"'));assert.equal(html.includes('navigation-audio-control'),menu);
  }
});
