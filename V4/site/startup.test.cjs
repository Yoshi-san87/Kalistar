'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Startup=require('./startup.js');
function fixture(reading=null){
  const host=new EventTarget(),doc=new EventTarget(),nodes=[],surfaces=[{inert:false},{inert:true}],marks=[];
  doc.documentElement={dataset:{}};doc.querySelectorAll=()=>surfaces;doc.hidden=false;
  doc.head={append:node=>nodes.push(node)};doc.createElement=()=>({remove(){this.removed=true;}});
  host.document=doc;host.location=new URL('https://kalistar.test/jeu/');host.performance={mark:name=>marks.push(name)};
  let finish,reject;const presentation=new Promise((yes,no)=>{finish=yes;reject=no;});
  return {host,doc,nodes,surfaces,marks,finish,reject,startup:Startup.create({host,doc,presentation,reading})};
}
const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('preparation caches bounded same-origin images without activating the shell',async()=>{
  const f=fixture();f.startup.preloadImages(['https://other.test/private.png','a.png','a.png',...Array.from({length:12},(_,i)=>i+'.png')]);
  assert.equal(f.nodes.length,8);assert(f.nodes.every(n=>n.as==='image'&&n.fetchPriority==='low'&&n.href.startsWith(f.host.location.origin)));
  assert(f.surfaces.every(s=>s.inert));let ready=false;
  const waiting=f.startup.ready().then(value=>{ready=value;});await turn();
  assert(f.host.KALISTAR_PREPARED);assert.equal(ready,false);assert.equal(f.startup.state,'prepared');
  f.finish('skipped');await waiting;assert.equal(ready,true);assert.equal(f.startup.state,'activating');
  assert(f.surfaces.every(s=>s.inert));f.startup.activate();assert.equal(f.startup.state,'active');
  assert.deepEqual(f.surfaces.map(s=>s.inert),[false,true]);assert(f.nodes.every(n=>n.removed));
  assert.deepEqual(f.marks,['kalistar:prepared','kalistar:active']);f.startup.destroy();
});
test('a finished movie does not start an unprepared application',async()=>{
  const f=fixture();f.finish();await turn();assert.equal(f.startup.state,'preparing');assert(f.surfaces.every(s=>s.inert));
  assert(await f.startup.ready());f.startup.activate();f.startup.destroy();
});
test('hidden tab stays dormant after the film; foreground activates once',async()=>{
  const f=fixture();f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));
  let starts=0;const p=f.startup.ready().then(ok=>{if(ok)starts++;});f.finish('background');await turn();
  assert.equal(starts,0);assert.equal(f.doc.documentElement.dataset.runtimeVisibility,'hidden');
  f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));await p;assert.equal(starts,1);
  f.startup.activate();f.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(starts,1);f.startup.destroy();
});
test('navigation cancels pending activation without firing views or notifications',async()=>{
  const f=fixture(),p=f.startup.ready();f.host.dispatchEvent(new Event('pagehide'));f.finish();
  assert.equal(await p,false);assert.equal(f.startup.state,'closed');assert.equal(await f.startup.ready(),false);
  let shown=false;await f.startup.fail(()=>{shown=true;});assert.equal(shown,false);
});
test('bfcache return releases a dormant app only after pageshow',async()=>{
  const f=fixture(),event=new Event('pagehide');Object.defineProperty(event,'persisted',{value:true});
  f.host.dispatchEvent(event);f.finish();let done=false;const p=f.startup.ready().then(ok=>{done=ok;});await turn();assert.equal(done,false);
  f.host.dispatchEvent(new Event('pageshow'));await p;assert.equal(done,true);f.startup.destroy();
});
test('media failure still permits activation, boot failure stays outside the film',async()=>{
  const f=fixture();f.reject(Error('decoder'));assert(await f.startup.ready());f.startup.destroy();
  const bad=fixture();let shown=0;const pending=bad.startup.ready(),p=bad.startup.fail(()=>shown++);await turn();assert.equal(shown,0);
  bad.finish();await p;assert.equal(await pending,false);assert.equal(shown,1);assert.equal(bad.startup.state,'failed');
  assert.equal(bad.surfaces[0].inert,false);bad.startup.activate();assert.equal(bad.startup.state,'failed');bad.startup.destroy();
});

function readingFixture(){
  let enter,shown=0,ready=0,destroyed=0;
  const entry=new Promise(resolve=>{enter=resolve;});
  return {enter,get shown(){return shown;},get ready(){return ready;},get destroyed(){return destroyed;},
    view:{show(){shown++;},ready(){ready++;return entry;},destroy(){destroyed++;enter(false);}}};
}
test('reading requires both prepared data and explicit entry after the film',async()=>{
  const reading=readingFixture(),f=fixture(reading.view);let starts=0;
  const pending=f.startup.ready().then(ok=>{if(ok)starts++;return ok;});await turn();
  assert.equal(reading.shown,0);assert.equal(reading.ready,0);assert.equal(starts,0);
  f.finish();await turn();assert.equal(reading.shown,1);assert.equal(reading.ready,1);assert.equal(starts,0);
  assert.equal(f.startup.state,'prepared');assert(f.surfaces.every(s=>s.inert));
  reading.enter(true);assert(await pending);assert.equal(starts,1);f.startup.activate();
  assert.equal(reading.destroyed,1);assert.equal(f.startup.state,'active');f.startup.destroy();
});
test('background and page navigation remain guarded while reading',async()=>{
  const reading=readingFixture(),f=fixture(reading.view);f.finish();const pending=f.startup.ready();await turn();
  f.doc.hidden=true;reading.enter(true);let active=false;pending.then(ok=>{active=ok;});await turn();assert.equal(active,false);
  f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));assert(await pending);f.startup.destroy();
  const second=readingFixture(),cancelled=fixture(second.view);cancelled.finish();const p=cancelled.startup.ready();await turn();
  cancelled.host.dispatchEvent(new Event('pagehide'));assert.equal(await p,false);assert.equal(second.destroyed,1);
});
test('a failed boot cancels reading without waiting for Enter',async()=>{
  const reading=readingFixture(),f=fixture(reading.view);f.finish();const pending=f.startup.ready();await turn();
  let errors=0;await f.startup.fail(()=>errors++);assert.equal(await pending,false);assert.equal(errors,1);assert.equal(reading.destroyed,1);f.startup.destroy();
});
