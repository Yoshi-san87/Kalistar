'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Sync=require('./cloud-sync.js');
const PARIS='10000000-0000-4000-8000-000000000001',TOKYO='10000000-0000-4000-8000-000000000002';
const PC='20000000-0000-4000-8000-000000000001',PHONE='20000000-0000-4000-8000-000000000002';
const copy=value=>JSON.parse(JSON.stringify(value));
const progress=n=>({schema:1,edition:'V4',progress:{chapter:n},deckLibrary:[]});
const wait=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
function memory(){
  const values=new Map();let fail=false;
  return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(fail)throw Error('quota');values.set(key,value);},fail:()=>{fail=true;}};
}
function time(){
  let ms=Date.parse('2026-10-16T01:00:00Z'),sequence=0;const jobs=new Map();
  return {now:()=>ms,setTimeout:(fn,delay)=>{const id=++sequence;jobs.set(id,{fn,at:ms+delay});return id;},clearTimeout:id=>jobs.delete(id),jobs,
    advance:async delta=>{ms+=delta;for(let pass=0;pass<20;pass++){const ready=[...jobs].filter(([,j])=>j.at<=ms);if(!ready.length)break;for(const [id,j] of ready){jobs.delete(id);j.fn();}await wait();}}};
}
function server(clock=time()){
  const records=new Map(),calls=[];let connected=true,before=null;
  const get=id=>{if(!records.has(id))records.set(id,{revision:0,updatedAt:null,payload:null,lease:{deviceId:null,until:null}});return records.get(id);};
  const read=id=>copy(get(id));
  function client(userId){
    let identity=userId;const listeners=new Set();
    return {auth:{getSession:async()=>({data:{session:identity?{user:{id:identity},access_token:'never-persist-this-token',refresh_token:'never-persist-this-refresh'}:null}}),
      onAuthStateChange:fn=>{listeners.add(fn);return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};}},
      switchUser:id=>{identity=id;for(const fn of listeners)fn(id?'SIGNED_IN':'SIGNED_OUT',id?{user:{id}}:null);},listeners,
      rpc:async(name,args)=>{
        const actor=identity;calls.push({actor,name,args:copy(args??null)});
        if(!connected)throw TypeError('Failed to fetch');
        if(before)await before(name,args,actor);
        const record=get(actor),verb=name.replace('kalistar_sync_','');
        if(verb==='read')return {data:read(actor)};
        if(verb==='release'){if(record.lease.deviceId===args.p_device_id)record.lease={deviceId:null,until:null};return {data:{ok:true}};}
        if(args.p_expected_revision!==record.revision)return {data:{ok:false,code:'conflict',current:read(actor)}};
        const busy=record.lease.deviceId&&record.lease.deviceId!==args.p_device_id&&Date.parse(record.lease.until)>clock.now();
        if(verb==='claim'){
          if(busy&&!args.p_takeover)return {data:{ok:false,code:'busy',current:read(actor)}};
          record.lease={deviceId:args.p_device_id,until:new Date(clock.now()+120000).toISOString()};return {data:{ok:true,...read(actor)}};
        }
        assert.equal(verb,'write');
        if(record.lease.deviceId!==args.p_device_id||Date.parse(record.lease.until)<=clock.now())return {data:{ok:false,code:'busy',current:read(actor)}};
        record.revision++;record.updatedAt=new Date(clock.now()).toISOString();record.payload=copy(args.p_payload);
        return {data:{ok:true,...read(actor)}};
      }};
  }
  return {clock,client,calls,records,read,get,online:value=>{connected=value;},hook:fn=>{before=fn;},
    seed:(user,payload,revision=1)=>records.set(user,{revision,updatedAt:new Date(clock.now()).toISOString(),payload:copy(payload),lease:{deviceId:null,until:null}})};
}
function host(s,options={}){
  let value=options.payload??progress(0),meaningful=options.meaningful??true;
  const storage=options.storage??memory(),events=new EventTarget(),doc=new EventTarget(),backups=[],applied=[],notified=[];
  doc.visibilityState='visible';
  const userId=options.userId??PARIS,client=options.client??s.client(userId);
  const api=Sync.create({client,userId,storage,deviceId:options.deviceId??PC,capture:async()=>({payload:copy(value),meaningful,access_token:'capture-envelope-must-not-be-stored'}),
    apply:async(payload,ctx)=>{assert(ctx.isCurrent());assert(!ctx.signal.aborted);value=copy(payload);applied.push(copy(payload));},
    backup:async reason=>backups.push({reason,payload:copy(value)}),onApplied:(payload,ctx)=>notified.push({payload:copy(payload),initial:ctx.initial,reason:ctx.reason}),
    now:s.clock.now,timers:s.clock,eventTarget:events,document:doc,...options.overrides});
  return {api,client,storage,events,doc,backups,applied,notified,read:()=>copy(value),edit:(next,m=true)=>{value=copy(next);meaningful=m;},
    record:()=>JSON.parse(storage.getItem(Sync.storageKey(userId,options.deviceId??PC)))};
}
function storageText(store){return [...store.values.values()].join('');}

test('compact revision responses reuse only the matching known payload, including the write acknowledgement',async()=>{
  const s=server(),client=s.client(PARIS),full=client.rpc.bind(client);let omitted=0;
  client.rpc=async(name,args)=>{
    const response=await full(name,args),data=response.data;
    if(data.ok===true&&name!=='kalistar_sync_release'||name==='kalistar_sync_read'&&data.revision===args.p_known_revision){omitted++;return {data:{...data,payload:null,unchanged:true}};}
    return response;
  };
  const h=host(s,{client,meaningful:false});assert.equal((await h.api.start()).status,'synced');
  assert.equal((await h.api.flush()).status,'synced');assert(omitted>=4);assert.deepEqual(s.read(PARIS).payload,progress(0));
  h.edit(progress(5));await h.api.changed();assert.equal((await h.api.flush()).status,'synced');assert.deepEqual(s.read(PARIS).payload,progress(5));h.api.destroy();
});

test('empty remote: backup precedes CAS initialization and a valid default payload is supported',async()=>{
  const s=server(),h=host(s,{meaningful:false});
  assert.equal((await h.api.start()).status,'synced');
  assert.equal(h.backups[0].reason,'cloud-initialize');assert.deepEqual(s.read(PARIS).payload,progress(0));
  assert.deepEqual(s.calls.map(c=>c.name),['kalistar_sync_read','kalistar_sync_claim','kalistar_sync_write']);
  assert.equal(h.record().base.revision,1);assert.equal(h.record().outbox,null);h.api.destroy();
});

test('an existing cloud save is backed up and applied on an empty device; onApplied sees durable metadata',async()=>{
  const s=server();s.seed(PARIS,progress(7));const h=host(s,{meaningful:false});
  assert.equal((await h.api.start()).status,'synced');assert.deepEqual(h.read(),progress(7));
  assert.deepEqual(h.backups,[{reason:'cloud-apply',payload:progress(0)}]);
  assert.equal(h.notified[0].initial,true);assert.equal(h.record().base.revision,1);
  assert.equal(s.calls.filter(c=>c.name.endsWith('_write')).length,0);h.api.destroy();
});

test('new device with meaningful divergent progress returns promptly in conflict without a write',async()=>{
  const s=server();s.seed(PARIS,progress(7));const h=host(s,{payload:progress(3)});
  const state=await h.api.start();assert.equal(state.status,'conflict');assert.equal(state.conflict,'initial');
  assert.deepEqual(h.read(),progress(3));assert.deepEqual(h.record().outbox.payload,progress(3));
  assert.equal(s.calls.length,1);await h.api.flush();assert.equal(s.calls.length,1);
  assert.equal((await h.api.resolve('cloud')).status,'synced');assert.deepEqual(h.read(),progress(7));
  assert.equal(h.notified.at(-1).initial,false);assert.equal(h.backups.length,1);h.api.destroy();
});

test('explicit local choice uses the revision actually shown; a newer cloud save is not overwritten',async()=>{
  const s=server();s.seed(PARIS,progress(7));const h=host(s,{payload:progress(3)});await h.api.start();
  s.seed(PARIS,progress(8),2);
  assert.equal((await h.api.resolve('local')).status,'conflict');assert.deepEqual(s.read(PARIS).payload,progress(8));
  assert.deepEqual(h.record().outbox.payload,progress(3));assert.equal(h.backups[0].reason,'choose-local');
  assert.equal((await h.api.resolve('local')).status,'synced');assert.deepEqual(s.read(PARIS).payload,progress(3));h.api.destroy();
});

test('a busy lease needs explicit takeover, and the former writer retains its divergent draft',async()=>{
  const s=server(),a=host(s);await a.api.start();
  const b=host(s,{deviceId:PHONE,meaningful:false});assert.equal((await b.api.start()).status,'busy');
  b.edit(progress(2));await b.api.changed();assert.equal((await b.api.flush()).status,'busy');
  assert.equal((await b.api.resolve('takeover')).status,'synced');assert.deepEqual(s.read(PARIS).payload,progress(2));
  a.edit(progress(1));await a.api.changed();assert.equal((await a.api.flush()).status,'conflict');
  assert.deepEqual(a.record().outbox.payload,progress(1));assert.deepEqual(s.read(PARIS).payload,progress(2));
  a.api.destroy();b.api.destroy();
});

test('takeover never implicitly resolves a revision conflict',async()=>{
  const s=server(),a=host(s);await a.api.start();
  const b=host(s,{deviceId:PHONE,meaningful:false});await b.api.start();
  a.edit(progress(1));await a.api.changed();await a.api.flush();
  b.edit(progress(2));await b.api.changed();assert.equal((await b.api.resolve('takeover')).status,'conflict');
  assert.deepEqual(s.read(PARIS).payload,progress(1));a.api.destroy();b.api.destroy();
});

test('offline draft survives controller destruction/reload and recovers before network upload',async()=>{
  const s=server(),store=memory(),a=host(s,{storage:store});await a.api.start();s.online(false);
  a.edit(progress(9));await a.api.changed();assert.equal((await a.api.flush()).status,'offline');a.api.destroy();
  assert.deepEqual(a.record().outbox.payload,progress(9));s.online(true);
  const b=host(s,{storage:store,payload:progress(0)});assert.equal((await b.api.start()).status,'synced');
  assert.deepEqual(b.read(),progress(9));assert.equal(b.backups[0].reason,'outbox-recovery');
  assert.deepEqual(s.read(PARIS).payload,progress(9));assert.equal(b.record().outbox,null);b.api.destroy();
});

test('two differing local copies on reload require a choice and keep the original outbox intact',async()=>{
  const s=server(),store=memory(),a=host(s,{storage:store});await a.api.start();s.online(false);
  a.edit(progress(9));await a.api.changed();await a.api.flush();a.api.destroy();s.online(true);
  const b=host(s,{storage:store,payload:progress(8)});assert.equal((await b.api.start()).status,'conflict');
  assert.deepEqual(b.record().outbox.payload,progress(9));assert.deepEqual(b.read(),progress(8));
  await b.api.resolve('local');assert.deepEqual(s.read(PARIS).payload,progress(8));b.api.destroy();
});

test('Auth UUID and tab device keys isolate two accounts, drafts and baselines',async()=>{
  const s=server(),store=memory(),a=host(s,{storage:store});await a.api.start();s.online(false);
  a.edit(progress(12));await a.api.changed();await a.api.flush();a.api.destroy();s.online(true);
  const b=host(s,{userId:TOKYO,storage:store,payload:progress(2)});await b.api.start();
  assert.deepEqual(s.read(TOKYO).payload,progress(2));assert.deepEqual(a.record().outbox.payload,progress(12));
  assert.equal(store.values.size,2);assert(s.calls.filter(c=>c.actor===TOKYO).every(c=>!JSON.stringify(c.args).includes('12')));b.api.destroy();
});

test('identity switch while capture or RPC is pending cannot apply or upload under the new account',async()=>{
  const s=server(),gate=deferred(),client=s.client(PARIS);let entered=false;
  const h=host(s,{client,overrides:{capture:async()=>{entered=true;await gate.promise;return {payload:progress(5),meaningful:true};}}});
  const pending=h.api.start();await wait();assert(entered);client.switchUser(TOKYO);gate.resolve();
  assert.equal((await pending).status,'unauthorized');assert.equal(s.calls.length,0);assert.equal(h.storage.values.size,0);
  h.api.destroy();
  const slow=deferred(),j=host(s,{meaningful:false});s.seed(PARIS,progress(7));s.hook(async name=>{if(name.endsWith('_read'))await slow.promise;});
  const reading=j.api.start();await wait();j.client.switchUser(null);slow.resolve();await reading;
  assert.equal(j.api.snapshot().status,'unauthorized');assert.equal(j.applied.length,0);j.api.destroy();
});

test('authorization is distinct from offline and no payload or SDK credentials appear in snapshots or metadata',async()=>{
  const s=server(),h=host(s);await h.api.start();
  h.client.rpc=async()=>({error:{code:'42501',message:'never-store-this-server-secret'}});
  h.edit(progress(5));await h.api.changed();assert.equal((await h.api.flush()).status,'unauthorized');
  const persisted=storageText(h.storage),shown=JSON.stringify(h.api.snapshot());
  for(const secret of ['never-persist-this-token','never-persist-this-refresh','capture-envelope','never-store-this-server-secret']){
    assert(!persisted.includes(secret));assert(!shown.includes(secret));
  }
  assert(!shown.includes('deckLibrary'));assert.deepEqual(h.record().outbox.payload,progress(5));h.api.destroy();
});

test('credential-bearing or oversized payloads are rejected without persisting or uploading them',async()=>{
  for(const payload of [{schema:1,access_token:'fixture-token'},{schema:1,nested:{secret:'fixture-secret'}},{schema:1,data:'x'.repeat(200)}]){
    const s=server(),h=host(s,{payload,overrides:{maxPayloadBytes:128}});
    assert.equal((await h.api.start()).status,'error');assert.equal(h.storage.values.size,0);assert.equal(s.calls.length,0);h.api.destroy();
  }
});

test('storage failure blocks any cloud write and preserves the existing cloud payload',async()=>{
  const s=server(),store=memory();store.fail();const h=host(s,{storage:store});
  assert.equal((await h.api.start()).error,'storage');assert.equal(s.calls.length,0);h.api.destroy();
});

test('a lost write acknowledgement is reconciled by content without incrementing twice',async()=>{
  const s=server(),h=host(s),rpc=h.client.rpc;let lost=false;
  h.client.rpc=async(...args)=>{const result=await rpc(...args);if(args[0].endsWith('_write')&&!lost){lost=true;throw TypeError('lost reply');}return result;};
  assert.equal((await h.api.start()).status,'offline');assert(h.record().outbox);
  assert.equal((await h.api.retry()).status,'synced');assert.equal(s.read(PARIS).revision,1);assert.equal(h.record().outbox,null);h.api.destroy();
});

test('debounce coalesces changes; heartbeat renews only while visible and pause releases the lease',async()=>{
  const s=server(),h=host(s);await h.api.start();
  h.edit(progress(1));await h.api.changed();h.edit(progress(2));await h.api.changed();
  await s.clock.advance(999);assert.equal(s.read(PARIS).revision,1);
  await s.clock.advance(1);assert.deepEqual(s.read(PARIS).payload,progress(2));
  const claims=()=>s.calls.filter(c=>c.name.endsWith('_claim')).length,initial=claims();
  await s.clock.advance(45000);assert.equal(claims(),initial+1);
  h.doc.visibilityState='hidden';h.doc.dispatchEvent(new Event('visibilitychange'));await s.clock.advance(45000);assert.equal(claims(),initial+1);
  h.doc.visibilityState='visible';h.doc.dispatchEvent(new Event('visibilitychange'));await wait();assert.equal(claims(),initial+2);
  assert.equal((await h.api.pause()).status,'paused');assert.equal(s.read(PARIS).lease.deviceId,null);
  assert.equal(s.clock.jobs.size,0);assert.equal((await h.api.retry()).status,'synced');h.api.destroy();assert.equal(s.clock.jobs.size,0);
});

test('returning online retries a durable pending save, while a timeout does not block start forever',async()=>{
  const s=server(),h=host(s);s.online(false);assert.equal((await h.api.start()).status,'offline');
  s.online(true);h.events.dispatchEvent(new Event('online'));await wait();assert.equal(h.api.snapshot().status,'synced');h.api.destroy();
  const clock=time(),slow=host(server(clock));slow.client.rpc=()=>new Promise(()=>{});
  const timed=slow.api.start();await wait();await clock.advance(15000);assert.equal((await timed).status,'offline');slow.api.destroy();
});

test('destroy detaches listeners and prevents late reads, applies, notifications and timers',async()=>{
  const s=server(),gate=deferred(),h=host(s,{meaningful:false});s.seed(PARIS,progress(7));
  s.hook(async()=>gate.promise);let notifications=0;h.api.subscribe(()=>notifications++);
  const pending=h.api.start();await wait();h.api.destroy();const count=notifications;gate.resolve();await pending;
  assert.equal(h.applied.length,0);assert.equal(notifications,count);assert.equal(h.client.listeners.size,0);assert.equal(s.clock.jobs.size,0);
  h.events.dispatchEvent(new Event('online'));h.doc.dispatchEvent(new Event('visibilitychange'));await h.api.changed();assert.equal(s.calls.length,1);
});

test('an edit during a remote read is not overwritten by automatic cloud apply',async()=>{
  const s=server(),h=host(s,{meaningful:false}),gate=deferred();s.seed(PARIS,progress(7));s.hook(async()=>gate.promise);
  const pending=h.api.start();await wait();h.edit(progress(3));const changed=h.api.changed();gate.resolve();
  await pending;await changed;assert.equal(h.api.snapshot().status,'conflict');assert.deepEqual(h.read(),progress(3));assert.equal(h.applied.length,0);h.api.destroy();
});

test('default device identity survives a tab reload but is never shared with another Auth account',async()=>{
  const s=server(),sessionStorage=memory(),storage=memory();
  const make=userId=>Sync.create({client:s.client(userId),userId,storage,sessionStorage,capture:async()=>({payload:progress(0),meaningful:false}),apply:async()=>{},backup:async()=>{},timers:s.clock,now:s.clock.now});
  const a=make(PARIS),id=a.snapshot().deviceId;a.destroy();const b=make(PARIS),c=make(TOKYO);
  assert.equal(b.snapshot().deviceId,id);assert.notEqual(c.snapshot().deviceId,id);b.destroy();c.destroy();
});

test('async IndexedDB-style storage completes before upload and before onApplied notification',async()=>{
  const s=server(),store=memory(),order=[];
  const storage={getItem:async key=>{await wait();return store.getItem(key);},setItem:async(key,value)=>{await wait();store.setItem(key,value);order.push('persist');}};
  s.hook(async name=>{if(name.endsWith('_write')){assert(store.values.size);order.push('write');}});
  const h=host(s,{storage});assert.equal((await h.api.start()).status,'synced');assert(order.indexOf('persist')<order.indexOf('write'));h.api.destroy();
  s.seed(TOKYO,progress(4));let notified=false;
  const j=host(s,{storage,userId:TOKYO,meaningful:false,overrides:{onApplied:()=>{
    const record=JSON.parse(store.getItem(Sync.storageKey(TOKYO,PC)));assert.equal(record.base.revision,1);assert.equal(record.outbox,null);notified=true;
  }}});
  await j.api.start();assert(notified);j.api.destroy();
});

test('offline reload with two local drafts cannot erase its durable outbox during retry or further edits',async()=>{
  const s=server(),store=memory(),a=host(s,{storage:store});await a.api.start();s.online(false);
  a.edit(progress(9));await a.api.changed();await a.api.flush();a.api.destroy();
  const b=host(s,{storage:store,payload:progress(8)});assert.equal((await b.api.start()).status,'offline');
  assert.deepEqual(b.record().outbox.payload,progress(9));s.online(true);
  assert.equal((await b.api.retry()).status,'conflict');assert.deepEqual(b.record().outbox.payload,progress(9));
  b.edit(progress(10));await b.api.changed();assert.deepEqual(b.record().outbox.payload,progress(9));
  await b.api.resolve('cloud');assert.deepEqual(b.read(),progress(0));assert.equal(b.record().outbox,null);b.api.destroy();
});

test('a clean device applies newer cloud progress with a non-bootstrap callback',async()=>{
  const s=server(),h=host(s);await h.api.start();s.seed(PARIS,progress(4),2);
  assert.equal((await h.api.flush()).status,'synced');assert.deepEqual(h.read(),progress(4));assert.equal(h.notified.at(-1).initial,false);h.api.destroy();
});

test('CAS conflict between claim and write retains the local draft and never retries a blind write',async()=>{
  const s=server(),h=host(s);await h.api.start();h.edit(progress(2));await h.api.changed();
  let raced=false;s.hook(async name=>{if(name.endsWith('_write')&&!raced){raced=true;s.seed(PARIS,progress(3),2);}});
  assert.equal((await h.api.flush()).status,'conflict');assert.deepEqual(s.read(PARIS).payload,progress(3));
  assert.deepEqual(h.record().outbox.payload,progress(2));const calls=s.calls.length;await h.api.flush();assert.equal(s.calls.length,calls);h.api.destroy();
});

test('lease loss without a revision change becomes busy; expiry allows an ordinary claim',async()=>{
  const s=server(),a=host(s);await a.api.start();
  const b=host(s,{deviceId:PHONE,meaningful:false});await b.api.start();await b.api.resolve('takeover');
  assert.equal((await a.api.flush()).status,'busy');assert.equal(a.api.snapshot().canWrite,false);
  b.api.destroy();await s.clock.advance(120001);assert.equal(a.api.snapshot().status,'synced');assert.equal(s.read(PARIS).lease.deviceId,PC);a.api.destroy();
});

test('concurrent flushes are single-flight and edits during a write are eventually uploaded',async()=>{
  const s=server(),h=host(s);await h.api.start();h.edit(progress(1));await h.api.changed();
  const gate=deferred();let entered=false;s.hook(async name=>{if(name.endsWith('_write')&&!entered){entered=true;await gate.promise;}});
  const first=h.api.flush(),second=h.api.flush();assert.equal(first,second);await wait();assert(entered);
  h.edit(progress(2));const changed=h.api.changed();await s.clock.advance(1000);gate.resolve();await first;await changed;
  await s.clock.advance(1000);assert.deepEqual(s.read(PARIS).payload,progress(2));assert.equal(h.record().outbox,null);h.api.destroy();
});

test('changes during capture are captured again before changed() reports a durable outbox',async()=>{
  const s=server(),gate=deferred();let value=progress(1),calls=0;
  const store=memory(),client=s.client(TOKYO),api=Sync.create({client,userId:TOKYO,deviceId:PC,storage:store,now:s.clock.now,timers:s.clock,
    capture:async()=>{const captured=copy(value);if(++calls===1)await gate.promise;return {payload:captured,meaningful:true};},apply:async()=>{},backup:async()=>{}});
  const staging=api.changed();await wait();value=progress(2);api.changed();gate.resolve();await staging;
  assert.deepEqual(JSON.parse(store.getItem(Sync.storageKey(TOKYO,PC))).outbox.payload,progress(2));api.destroy();
});

test('logout during a backup aborts its context and never starts cloud apply',async()=>{
  const s=server(),gate=deferred();s.seed(PARIS,progress(8));let ctx;
  const h=host(s,{meaningful:false,overrides:{backup:async(_,context)=>{ctx=context;await gate.promise;}}});
  const pending=h.api.start();await wait();assert(ctx.isCurrent());h.client.switchUser(null);assert(ctx.signal.aborted);assert(!ctx.isCurrent());gate.resolve();await pending;
  assert.equal(h.applied.length,0);assert.equal(h.api.snapshot().status,'unauthorized');h.api.destroy();
});

test('destroy aborts even a promise-only RPC and clears its timeout immediately',async()=>{
  const s=server(),h=host(s);h.client.rpc=()=>new Promise(()=>{});const pending=h.api.start();await wait();assert.equal(s.clock.jobs.size,1);
  h.api.destroy();assert.equal((await pending).status,'destroyed');assert.equal(s.clock.jobs.size,0);
});

test('metadata from another identity and inconsistent server revisions are refused',async()=>{
  const s=server(),store=memory();store.setItem(Sync.storageKey(PARIS,PC),JSON.stringify({schema:1,userId:TOKYO,base:null,outbox:null}));
  const h=host(s,{storage:store});assert.equal((await h.api.start()).error,'storage');assert.equal(s.calls.length,0);h.api.destroy();
  const j=host(s);await j.api.start();s.get(PARIS).payload=progress(99);
  assert.equal((await j.api.flush()).status,'conflict');assert.deepEqual(j.read(),progress(0));j.api.destroy();
});

test('canonical JSON key ordering does not create a false conflict',async()=>{
  const s=server();s.seed(PARIS,{progress:{chapter:2},edition:'V4',deckLibrary:[],schema:1});const h=host(s,{payload:progress(2)});
  assert.equal((await h.api.start()).status,'synced');assert.equal(h.backups.length,0);h.api.destroy();
});

test('an edit while IndexedDB persists cannot be mistaken for an empty device during bootstrap',async()=>{
  const s=server(),store=memory(),gate=deferred();s.seed(PARIS,progress(7));let persisting=false;
  const storage={getItem:store.getItem,setItem:async(key,value)=>{if(!persisting){persisting=true;await gate.promise;}store.setItem(key,value);}};
  const h=host(s,{storage,meaningful:false});const pending=h.api.start();await wait();assert(persisting);
  h.edit(progress(3));const changed=h.api.changed();gate.resolve();await pending;await changed;
  assert.equal(h.api.snapshot().status,'conflict');assert.deepEqual(h.read(),progress(3));assert.equal(h.applied.length,0);h.api.destroy();
});

test('destroy also settles a pending host capture and aborts its context',async()=>{
  const s=server(),gate=deferred();let ctx;
  const h=host(s,{overrides:{capture:async context=>{ctx=context;await gate.promise;return {payload:progress(9),meaningful:true};}}});
  const pending=h.api.start();await wait();h.api.destroy();assert.equal((await pending).status,'destroyed');assert(ctx.signal.aborted);
  gate.resolve();await wait();assert.equal(s.calls.length,0);assert.equal(h.storage.values.size,0);
});
