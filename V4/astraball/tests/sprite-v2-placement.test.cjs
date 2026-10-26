'use strict';

const test=require('node:test'),assert=require('node:assert/strict');
const {validate,solve}=require('../tools/sprite-v2-placement.cjs');

function fixture({flight=true}={}){
  const order=Array.from({length:16},(_,i)=>i);
  const parts=order.map(i=>({left:(i%4)*150+30,top:Math.floor(i/4)*150+20,width:80,height:100,label:i+1,count:4000}));
  const context={sourceSha256:'a'.repeat(64),width:600,height:600,page:0,parts,order,pageScale:.5};
  const frames=parts.map((p,sourceLocal)=>({sourceLocal,
    pelvis:{x:p.left+40,y:p.top+45,uncertaintyPx:3},
    contact:{x:p.left+40,y:p.top+100,uncertaintyPx:1}}));
  const preset={id:'biped-two-flight-v1',status:'authored-proposal',note:'Shared authored phases, not measured support or approved motion.',
    horizontalPolicy:'pelvis-to-root',contactPolicy:'observed-sole-to-ground',
    frames:order.map(i=>({phase:'contact-'+i,mode:'contact'}))};
  if(flight){
    for(const i of [6,9])preset.frames[i]={phase:'passing-flight',mode:'flight',curve:'constant'};
    for(const [i,t] of [[12,.15],[13,.5],[14,.85]])preset.frames[i]={phase:'jump-flight',mode:'flight',curve:'parabola',t};
    for(const i of [6,9,12,13,14])frames[i].contact=null;
    preset.flight={baselineFrames:[0,1,2,3],constantRisePx:8,parabolaPeakRisePx:32,minimumClearancePx:4};
  }
  return {context,authored:{schemaVersion:1,status:'authored-proposal',
    source:{sha256:context.sourceSha256,width:600,height:600,page:0,order:[...order]},
    observations:{method:'manual',coordinateSpace:'source-pixels',status:'proposed',note:'Manual pelvis and sole boundary estimates; support remains an author choice.',frames},preset}};
}
function rejects(edit,pattern=/Authored placement:/,options){
  const data=fixture(options);edit(data.authored,data.context);
  assert.throws(()=>solve(data.authored,data.context),pattern);
}
function freeze(value){
  if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}
  return value;
}

test('only an absent contract opts out without touching historical context',()=>{
  const untouched=new Proxy({}, {get(){throw Error('Historical context must not be accessed');}});
  assert.equal(validate(undefined,untouched),null);assert.equal(solve(undefined,untouched),null);
  for(const invalid of [null,false,0,'',[],{}]){
    assert.throws(()=>validate(invalid,undefined),/Authored placement:/);
    assert.throws(()=>solve(invalid,undefined),/Authored placement:/);
  }
});

test('contact-only authoring is valid without any trajectory settings',()=>{
  const {authored,context}=fixture({flight:false});
  assert.equal(validate(authored,context),authored);
  const result=solve(authored,context);
  assert.equal(result.baselineHeightPx,null);
  for(const f of result.frames){
    assert.deepEqual([f.left,f.top,f.w,f.h],[140,222,40,50]);
    assert.equal(f.contactNative.y,272);assert.equal(f.clearancePx,0);
    assert.equal(f.risePx,null);assert.equal(f.targetPelvisY,null);assert.equal(f.airborne,false);
  }
  rejects(a=>{a.preset.flight={};},/flight settings/,{flight:false});
});

test('contact, constant flight and parabola use explicit native constants and deterministic rounding',()=>{
  const {authored,context}=fixture(),r=solve(authored,context);
  assert.equal(r.baselineHeightPx,27.5);
  assert.deepEqual([r.frames[0].top,r.frames[6].top,r.frames[13].top],[222,214,190]);
  assert.deepEqual([r.frames[0].clearancePx,r.frames[6].clearancePx,r.frames[13].clearancePx],[0,8,32]);
  assert.equal(r.frames[6].targetPelvisY,236.5);assert.equal(r.frames[6].pelvisNative.y,237);
  assert.equal(r.frames[12].risePx,32*4*.15*.85);
  assert.equal(r.frames[14].risePx,32*4*.85*(1-.85));
  for(const f of r.frames){
    assert.deepEqual(f.root,{x:160,y:272});assert.equal(f.pelvisNative.x,160);
    assert.equal(f.status,'authored-proposal');assert.equal(f.supportIsMeasuredFact,false);
    assert.equal(f.supportChoice,authored.preset.frames[f.local].mode==='contact');
    assert.equal(f.airborne,!f.supportChoice);
  }
});

test('schema, statuses and coordinate semantics cannot imply approval',()=>{
  for(const edit of [
    a=>{a.schemaVersion=2;},a=>{a.status='ready';},a=>{a.preset.status='approved';},
    a=>{a.observations.status='measured';},a=>{a.observations.method='automatic';},
    a=>{a.observations.coordinateSpace='native-pixels';},a=>{a.observations.note='short';},
    a=>{a.preset.note='';},a=>{a.preset.id='';},a=>{a.preset.frames[0].phase=' ';},
  ])rejects(edit);
});

test('unknown fields reject character offsets, frame scaling, sockets and approvals at every level',()=>{
  const locations=[a=>a,a=>a.source,a=>a.observations,a=>a.observations.frames[0],
    a=>a.observations.frames[0].pelvis,a=>a.observations.frames[0].contact,a=>a.preset,a=>a.preset.frames[0],a=>a.preset.flight];
  for(const location of locations)for(const key of ['characterId','overrides','scale','dx','dy','sockets','review','approved']){
    rejects(a=>{location(a)[key]=1;},/unknown field/);
  }
  rejects((a,c)=>{c.offset=2;},/unknown field/);
  rejects((a,c)=>{c.parts[0].scale=2;},/unknown field/);
});

test('required keys, dense arrays and plain data are enforced without invoking getters',()=>{
  for(const edit of [a=>{delete a.source;},a=>{delete a.observations.frames[0].contact;},a=>{delete a.preset.horizontalPolicy;}])rejects(edit,/needs/);
  for(const edit of [
    a=>{a.source.order.pop();},a=>{delete a.source.order[0];},a=>{a.source.order.extra=0;},
    a=>{a.observations.frames.push(a.observations.frames[0]);},a=>{delete a.observations.frames[0];},
    a=>{a.preset.frames=[];},(a,c)=>{c.parts.pop();},
    a=>{a.preset.flight.baselineFrames.extra=0;},
  ])rejects(edit);
  let accessed=false;
  rejects(a=>Object.defineProperty(a.preset,'id',{get(){accessed=true;return 'hidden';}}),/accessors/);
  rejects(a=>Object.defineProperty(a.source.order,'0',{get(){accessed=true;return 0;}}),/contain data/);
  assert.equal(accessed,false);
  rejects(a=>{Object.setPrototypeOf(a.preset,{dx:7});},/plain object/);
  rejects(a=>{a.preset[Symbol('offset')]=7;},/unknown field/);
  rejects(a=>Object.defineProperty(a.preset,'offset',{value:7}),/unknown field/);
});

test('source binding refuses stale SHA, dimensions, page and drawing permutation',()=>{
  rejects(a=>{a.source.sha256='b'.repeat(64);},/stale source SHA/);
  for(const field of ['width','height','page'])rejects(a=>{a.source[field]++;},/stale source dimensions\/page/);
  rejects(a=>{[a.source.order[0],a.source.order[1]]=[1,0];},/stale source order/);
  rejects(a=>{a.source.order[1]=0;},/every source drawing/);
  rejects(a=>{a.source.order[0]=16;},/integer/);
  rejects(a=>{a.observations.frames[0].sourceLocal=1;},/scanner order/);
  for(const bad of ['a'.repeat(63),'A'.repeat(64),'z'.repeat(64),null])rejects((a,c)=>{c.sourceSha256=bad;},/actual source SHA/);
});

test('nonidentity order maps observations and baseline from scanner order into output order',()=>{
  const {authored:a,context:c}=fixture({flight:false});
  c.order=[...c.order].reverse();a.source.order=[...c.order];
  a.observations.frames[15].pelvis.y=c.parts[15].top+40;
  a.preset.frames[4]={phase:'flight',mode:'flight',curve:'constant'};
  a.preset.flight={baselineFrames:[0],constantRisePx:8,parabolaPeakRisePx:32,minimumClearancePx:4};
  const r=solve(a,c);
  assert.equal(r.frames[0].sourceLocal,15);assert.equal(r.frames[4].sourceLocal,11);
  assert.equal(r.baselineHeightPx,30);assert.equal(r.frames[0].pelvisNative.y,242);
  assert.equal(r.frames[4].targetPelvisY,234);assert.equal(r.frames[4].top,211);
  assert.equal(r.frames[4].contactNative,null);
});

test('context scan geometry and common scale must be finite positive and inside the source',()=>{
  for(const scale of [0,-1,NaN,Infinity,'0.5',null])rejects((a,c)=>{c.pageScale=scale;},/pageScale/);
  for(const edit of [
    (a,c)=>{c.width=0;},(a,c)=>{c.height=NaN;},(a,c)=>{c.page=4;},
    (a,c)=>{c.parts[0].left=-1;},(a,c)=>{c.parts[0].width=0;},
    (a,c)=>{c.parts[0].height=.5;},(a,c)=>{c.parts[15].width=150;},
    (a,c)=>{c.parts[15].height=150;},(a,c)=>{c.order[0]=c.order[1];},
  ])rejects(edit);
});

test('observed landmarks cannot leave the source or their associated drawing',()=>{
  for(const landmark of ['pelvis','contact'])for(const [key,value] of [['x',-1],['x',600],['y',600],['y',NaN],['x',40.5],['uncertaintyPx',-1],['uncertaintyPx',Infinity]]){
    rejects(a=>{a.observations.frames[0][landmark][key]=value;},/pelvis|contact/);
  }
  rejects(a=>{a.observations.frames[0].pelvis.x=400;},/outside its source drawing/);
  rejects(a=>{a.observations.frames[0].contact.y=150;},/outside its source drawing/);
  rejects(a=>{a.observations.frames[0].pelvis.y=120;},/outside its source drawing/);
  const {authored,context}=fixture();
  assert.equal(authored.observations.frames[0].contact.y,context.parts[0].top+context.parts[0].height);
  assert.ok(solve(authored,context)); // A sole edge can coincide with the crop's exclusive bottom.
});

test('contacts require a source landmark, but the contact versus flight choice is never inferred',()=>{
  rejects(a=>{a.observations.frames[4].contact=null;},/missing observed contact/);
  const {authored:a,context:c}=fixture();
  a.observations.frames[6].contact={x:c.parts[6].left+40,y:c.parts[6].top+100,uncertaintyPx:1};
  const chosen=solve(a,c).frames[6];
  assert.equal(chosen.airborne,true);assert.equal(chosen.contactNative,null);
  rejects(a=>{a.preset.frames[6].mode='grounded';},/unknown phase mode/);
  rejects(a=>{a.preset.frames[0].curve='constant';},/contact phase cannot/);
  rejects(a=>{a.preset.frames[0].t=.5;},/contact phase cannot/);
});

test('horizontal policy is explicit and never silently locks or repairs the support foot',()=>{
  rejects(a=>{a.preset.horizontalPolicy='support-foot-lock';},/unsupported horizontalPolicy/);
  rejects(a=>{a.preset.contactPolicy='auto-bottom';},/unsupported contactPolicy/);
  const {authored:a,context:c}=fixture();
  a.observations.frames[0].contact.x=c.parts[0].left+65;
  const f=solve(a,c).frames[0];
  assert.equal(f.left,140);assert.equal(f.pelvisNative.x,160);assert.equal(f.contactNative.x,173);
});

test('flight requires explicit curves, parameters and contact baseline selection',()=>{
  for(const edit of [
    a=>{delete a.preset.flight;},a=>{a.preset.frames[6].curve='automatic';},
    a=>{a.preset.frames[6].t=.5;},a=>{delete a.preset.frames[13].t;},
    a=>{a.preset.frames[13].t=-.1;},a=>{a.preset.frames[13].t=1.1;},a=>{a.preset.frames[13].t=NaN;},
    a=>{a.preset.flight.baselineFrames=[];},a=>{a.preset.flight.baselineFrames=[0,0];},
    a=>{a.preset.flight.baselineFrames=[6];},a=>{a.preset.flight.baselineFrames=[16];},
    a=>{a.observations.frames[0].contact.y=a.observations.frames[0].pelvis.y;},
    a=>{a.preset.flight.constantRisePx=-1;},a=>{a.preset.flight.parabolaPeakRisePx=Infinity;},
    a=>{a.preset.flight.minimumClearancePx=0;},a=>{a.preset.flight.minimumClearancePx=1.5;},
  ])rejects(edit);
});

test('baseline is a median of explicit source distances, not bbox-derived or per-character height',()=>{
  const {authored:a,context:c}=fixture();
  for(const [i,dy] of [40,50,60,90].entries())a.observations.frames[i].pelvis.y=c.parts[i].top+100-dy;
  assert.equal(solve(a,c).baselineHeightPx,27.5);
  a.preset.flight.baselineFrames=[0,1,2];
  assert.equal(solve(a,c).baselineHeightPx,25);
});

test('common scale alone fixes dimensions for every pose, independent of placement, labels and author trajectory',()=>{
  const {authored:a,context:c}=fixture();
  for(let i=0;i<16;i++){c.parts[i].width=80+i;c.parts[i].height=100+i;}
  c.pageScale=.43;
  a.preset.flight.minimumClearancePx=1;a.preset.flight.constantRisePx=20;
  const before=solve(a,c);
  a.preset.id='unrelated-preset-label';a.preset.frames[6].phase='renamed phase';
  a.preset.flight.constantRisePx+=5;
  const after=solve(a,c);
  for(let i=0;i<16;i++){
    for(const r of [before,after])assert.deepEqual([r.frames[i].w,r.frames[i].h],[Math.round(c.parts[i].width*.43),Math.round(c.parts[i].height*.43)]);
    assert.equal(after.frames[i].left,before.frames[i].left);
    assert.equal(after.frames[i].top-before.frames[i].top,[6,9].includes(i)?-5:0);
  }
});

test('identifier and label values cannot select hidden character offsets',()=>{
  const {authored:a,context:c}=fixture();
  const before=solve(a,c);
  for(const id of ['meryl-mgs','tazrik','unknown-model-123']){
    a.preset.id=id;
    for(const p of c.parts){p.label=987;p.count=1;}
    const after=solve(a,c);
    assert.deepEqual(after.frames,before.frames);assert.equal(after.baselineHeightPx,before.baselineHeightPx);
  }
});

test('native sizing and all four margins fail strictly without clamp, resize, fallback or clipping',()=>{
  rejects((a,c)=>{c.pageScale=.00001;},/native width/);
  rejects((a,c)=>{c.pageScale=4;},/native width/);
  rejects((a,c)=>{c.parts[0].height=400;c.pageScale=1;},/native height/);
  rejects((a,c)=>{c.pageScale=1;c.parts[0].width=300;a.observations.frames[0].pelvis.x=c.parts[0].left+200;},/native bounds overflow/);
  rejects((a,c)=>{c.pageScale=1;c.parts[0].width=300;},/native bounds overflow/);
  rejects(a=>{a.preset.flight.constantRisePx=219;},/native bounds overflow/);
  rejects(a=>{a.observations.frames[4].contact.y=20+150;},/native bounds overflow/);
  const {authored:a,context:c}=fixture();
  a.preset.flight.constantRisePx=218;
  assert.equal(solve(a,c).frames[6].top,4);
  assert.equal(validate(a,c),a);
  a.preset.flight.constantRisePx=219;
  assert.equal(validate(a,c),a); // Schema validation is intentionally separate from derived bounds.
  assert.throws(()=>solve(a,c),/native bounds overflow/);
});

test('exact horizontal and bottom native gutter boundaries are accepted',()=>{
  const {authored:a,context:c}=fixture({flight:false});c.pageScale=1;
  c.parts[0].width=200;a.observations.frames[0].pelvis.x=c.parts[0].left+156;
  c.parts[1].width=300;a.observations.frames[1].pelvis.x=c.parts[1].left+144;
  a.observations.frames[4].contact.y=c.parts[4].top+56;
  const r=solve(a,c);
  assert.equal(r.frames[0].left,4);assert.equal(r.frames[1].left+r.frames[1].w,316);
  assert.equal(r.frames[4].top+r.frames[4].h,316);
  assert.equal(r.frames[4].clearancePx,-44); // No repair of a poorly chosen contact below-ground silhouette.
});

test('flight clearance is checked after rounding, including zero-rise arc endpoints',()=>{
  const {authored:a,context:c}=fixture();
  a.preset.flight.minimumClearancePx=8;assert.equal(solve(a,c).frames[6].clearancePx,8);
  a.preset.flight.minimumClearancePx=9;assert.throws(()=>solve(a,c),/insufficient flight clearance/);
  for(const t of [0,1])rejects(a=>{a.preset.frames[13].t=t;},/insufficient flight clearance/);
  rejects(a=>{a.preset.flight.constantRisePx=0;},/insufficient flight clearance/);
  rejects(a=>{a.preset.flight.parabolaPeakRisePx=Number.MAX_VALUE;},/derived rise/);
});

test('virtual affine origins may exceed the source but never become sampling coordinates',()=>{
  const {authored,context}=fixture(),r=solve(authored,context),f=r.frames[13],p=context.parts[13];
  assert.ok(f.virtualOrigin.y>=context.height);assert.equal(f.virtualOrigin.outsideSource,true);
  for(const frame of r.frames){
    assert.equal(frame.virtualOrigin.sampling,false);assert.equal(frame.virtualOrigin.coordinateSpace,'source-affine');
    const part=context.parts[frame.sourceLocal];
    assert.ok(Math.abs(frame.left+(frame.virtualOrigin.x-part.left)*context.pageScale-160)<1e-9);
    assert.ok(Math.abs(frame.top+(frame.virtualOrigin.y-part.top)*context.pageScale-272)<1e-9);
    assert.ok(frame.left>=4&&frame.top>=4&&frame.left+frame.w<=316&&frame.top+frame.h<=316);
  }
  assert.equal(f.virtualOrigin.y,p.top+(272-f.top)/context.pageScale);
  rejects(a=>{a.observations.frames[13].pelvis.y=634;},/pelvis/);
});

test('pure deterministic output owns its geometry and carries no invented sockets or approvals',()=>{
  const data=freeze(fixture()),snapshot=JSON.stringify(data),a=solve(data.authored,data.context),b=solve(data.authored,data.context);
  assert.deepEqual(a,b);assert.equal(JSON.stringify(data),snapshot);
  assert.equal(a.status,'authored-proposal');
  assert.ok(!/"(?:sockets|reviews|review|approved|ready|sourceOrigins|grounded)"/.test(JSON.stringify(a)));
  a.source.order[0]=15;a.native.root.x=7;a.frames[0].root.y=7;a.frames[0].pelvisNative.x=7;
  assert.equal(JSON.stringify(data),snapshot);assert.equal(b.source.order[0],0);
  assert.equal(b.native.root.x,160);assert.equal(a.frames[1].root.y,272);
});

test('global frame indexing and native constants agree with the existing template',async()=>{
  const {TEMPLATE}=await import('../animation-kit/template-v2.mjs');
  for(const page of [0,1,2,3]){
    const {authored:a,context:c}=fixture();a.source.page=c.page=page;
    const r=solve(a,c);
    assert.deepEqual(r.native,{cell:TEMPLATE.cell,margin:TEMPLATE.margin,root:TEMPLATE.origin});
    assert.deepEqual(r.frames.map(f=>f.index),Array.from({length:16},(_,i)=>page*16+i));
  }
});
