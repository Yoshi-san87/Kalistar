'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Intro=require('./login-intro.js');
class Element extends EventTarget{
  constructor(){super();this.attributes={};this.isConnected=true;this.hidden=false;this.signals=[];this.style={};}
  setAttribute(k,v){this.attributes[k]=v;}
  removeAttribute(k){delete this.attributes[k];if(k==='src')this.src='';}
  getAttribute(k){return this.attributes[k];}
  focus(){this.focused=true;}
  addEventListener(name,fn,options){if(options?.signal)this.signals.push(options.signal);super.addEventListener(name,fn,options);}
}
function fixture({phone=false,reduced=false,playError,blockSound=false}={}){
  let id=0;const timers=new Map(),classes=new Set(),nodes=[],media=new Element(),before=new Element();
  media.play=()=>{media.plays=(media.plays||0)+1;const error=playError||(blockSound&&!media.muted?'NotAllowedError':null);return error?Promise.reject(Object.assign(new Error('fixture'),{name:error})):Promise.resolve();};
  media.pause=()=>{media.paused=true;};media.load=()=>{media.loads=(media.loads||0)+1;};
  const lookup=Object.fromEntries(['.login-intro__sound','.login-intro__play','.login-intro__status','.login-intro__track span','.login-intro__skip'].map(k=>[k,new Element()]));
  const dialog=new Element();dialog.dataset={};dialog.querySelector=q=>q==='video'?media:lookup[q];
  dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new Event('close'));};dialog.remove=()=>{dialog.isConnected=false;};
  const doc=new Element();doc.activeElement=before;doc.documentElement={classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)}};
  doc.body={append:n=>nodes.push(n)};doc.createElement=()=>dialog;
  const reducedQuery=new Element();reducedQuery.matches=reduced;
  const host=new Element();host.document=doc;host.matchMedia=q=>q.includes('reduced')?reducedQuery:{matches:phone};
  host.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id;};host.clearTimeout=key=>timers.delete(key);
  const fire=(target,event)=>target.dispatchEvent(new Event(event,{cancelable:true}));
  const expire=ms=>{const item=[...timers].find(([,t])=>t.ms===ms);assert(item,'expected timer '+ms);timers.delete(item[0]);item[1].fn();};
  return {host,doc,dialog,media,lookup,timers,classes,nodes,reducedQuery,fire,expire,before};
}
test('Reduced Motion never creates a player or requests video',async()=>{
  const f=fixture({reduced:true});assert.equal(await Intro.play(f),'reduced-motion');assert.equal(f.nodes.length,0);assert.equal(f.media.src,undefined);
});
test('desktop starts with sound and a protected same-origin film, then releases every resource',async()=>{
  const f=fixture(),p=Intro.play(f);assert.equal(f.media.src,'assets/cinematics/kalistar-anime-v2.mp4');assert.equal(f.media.muted,false);
  assert.equal(f.lookup['.login-intro__sound'].getAttribute('aria-pressed'),'true');assert.equal(f.media.volume,.65);
  assert(f.dialog.open);assert(f.lookup['.login-intro__skip'].focused);f.fire(f.media,'ended');assert.equal(await p,'completed');
  assert.equal(f.dialog.isConnected,false);assert.equal(f.media.src,'');assert(f.media.paused);assert.equal(f.media.loads,1);assert.equal(f.timers.size,0);assert.equal(f.classes.size,0);
  for(const node of [f.host,f.doc,f.dialog,f.media,f.reducedQuery])assert(node.signals.every(signal=>signal.aborted));
});
test('portrait selects the separately framed phone cut',async()=>{
  const f=fixture({phone:true}),p=Intro.play(f);assert(f.media.src.endsWith('-phone.mp4'));assert(f.media.poster.endsWith('-phone-poster.webp'));f.fire(f.media,'ended');await p;
});
test('sound is an explicit toggle and skip always works',async()=>{
  const f=fixture(),p=Intro.play(f),button=f.lookup['.login-intro__sound'];f.fire(button,'click');assert.equal(f.media.muted,true);assert.equal(button.getAttribute('aria-pressed'),'false');
  f.fire(button,'click');assert.equal(f.media.muted,false);f.fire(f.lookup['.login-intro__skip'],'click');assert.equal(await p,'skipped');
});
test('native dialog cancel is a skip, not a failed authentication',async()=>{
  const f=fixture(),p=Intro.play(f);assert.equal(f.fire(f.dialog,'cancel'),false);assert.equal(await p,'skipped');
});
test('media error falls through and stale events cannot touch a later player',async()=>{
  const f=fixture(),p=Intro.play(f);f.fire(f.media,'error');assert.equal(await p,'unavailable');
  f.fire(f.lookup['.login-intro__sound'],'click');assert.equal(f.media.muted,false);f.fire(f.media,'playing');assert.equal(f.timers.size,0);
});
test('sound autoplay denied retries muted once and keeps the sound control truthful',async()=>{
  const f=fixture({blockSound:true}),p=Intro.play(f);await Promise.resolve();await Promise.resolve();
  assert.equal(f.media.plays,2);assert.equal(f.media.muted,true);assert.equal(f.lookup['.login-intro__sound'].getAttribute('aria-pressed'),'false');
  assert.equal(f.lookup['.login-intro__sound'].getAttribute('aria-label'),'Activer le son');
  f.fire(f.media,'playing');assert.equal(f.lookup['.login-intro__play'].hidden,true);
  f.fire(f.lookup['.login-intro__sound'],'click');assert.equal(f.media.muted,false);f.fire(f.media,'ended');assert.equal(await p,'completed');
});

test('blocked autoplay offers a keyboard-focusable manual play button',async()=>{
  const f=fixture({playError:'NotAllowedError'}),p=Intro.play(f);await Promise.resolve();await Promise.resolve();assert.equal(f.media.plays,2);assert.equal(f.lookup['.login-intro__play'].hidden,false);assert(f.lookup['.login-intro__play'].focused);
  assert(![...f.timers.values()].some(t=>t.ms===4500));f.expire(35000);assert.equal(await p,'timeout');
});
test('unsupported decoding does not hold up login',async()=>{
  const f=fixture({playError:'NotSupportedError'});assert.equal(await Intro.play(f),'unavailable');assert.equal(f.timers.size,0);
});
test('slow first frame is bounded',async()=>{
  const f=fixture(),p=Intro.play(f);f.expire(4500);assert.equal(await p,'slow-network');
});
test('playback watchdog covers stalls after the first frame',async()=>{
  const f=fixture(),p=Intro.play(f);f.fire(f.media,'playing');assert.equal(f.timers.size,1);f.expire(31500);assert.equal(await p,'timeout');
});
for(const reason of ['navigation','background','reduced-motion'])test(reason+' cancels playback and timers',async()=>{
  const f=fixture(),p=Intro.play(f);
  if(reason==='navigation')f.fire(f.host,'pagehide');
  if(reason==='background'){f.doc.hidden=true;f.fire(f.doc,'visibilitychange');}
  if(reason==='reduced-motion'){f.reducedQuery.matches=true;f.fire(f.reducedQuery,'change');}
  assert.equal(await p,reason);assert.equal(f.timers.size,0);assert(f.media.paused);
});
test('duplicate starts share the same film and a later login can start again',async()=>{
  const f=fixture(),p=Intro.play(f);assert.strictEqual(Intro.play(f),p);assert.equal(f.nodes.length,1);f.fire(f.media,'ended');await p;
  const next=fixture(),q=Intro.play(next);assert.notStrictEqual(p,q);next.fire(next.media,'ended');await q;
});
test('only an explicit successful password login awaits the intro; recovery and resume do not',()=>{
  const source=fs.readFileSync(path.join(__dirname,'login.js'),'utf8');
  assert.equal(source.match(/KalistarLoginIntro/g).length,1);assert(source.indexOf('session.login(')<source.indexOf('KalistarLoginIntro'));
  assert.match(source,/if\(s\.recovery\)[\s\S]*else if\(s\.user\)go\(\)/);
  assert.match(source,/session\.password[\s\S]*if\(s\.user\)go\(\)/);
  assert(source.indexOf("values.delete('password')")<source.indexOf('KalistarLoginIntro'));
  assert(source.includes('|journeys)'));
});
