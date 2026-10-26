import test from 'node:test';
import assert from 'node:assert/strict';
import {TEMPLATE,CLIPS,bodyHeight,frameRect,frameAt,socketTransform,createDraft,validateActor,familyFor} from '../animation-kit/template-v2.mjs';
const draft=()=>createDraft({characterId:'kaylis',modelId:'30000012',name:'KAYLIS',heightCm:164,weapon:'Epée courte'});
test('one pixel density, four spacious pages and fixed ground root for every body size',()=>{
  assert.equal(TEMPLATE.cell,320);assert.deepEqual(TEMPLATE.origin,{x:160,y:272});
  assert.equal(bodyHeight(100),64);assert.equal(bodyHeight(164),105);assert.equal(bodyHeight(182),116);
  assert.equal(bodyHeight(159),102);assert.equal(bodyHeight(300),192);assert.equal(bodyHeight(900),192);
  assert.equal(bodyHeight(95),64);assert.throws(()=>bodyHeight(null));assert.throws(()=>bodyHeight(Infinity));
});
test('64 unique frames have stable cells and no implicit repacking',()=>{
  const indexes=Object.values(CLIPS).flatMap(c=>c.frames.map(f=>f.index));
  assert.equal(Object.keys(CLIPS).length,14);assert.deepEqual(indexes,Array.from({length:64},(_,i)=>i));
  for(let i=0;i<64;i++){const r=frameRect(i);assert.equal(r.page,Math.floor(i/16));assert.ok(r.x+r.width<=1280&&r.y+r.height<=1280);}
  assert.throws(()=>frameRect(-1));assert.throws(()=>frameRect(64));assert.throws(()=>frameRect(1.2));
});
test('contract allocates six frames to run, jump and both attacks without certifying the drawings',()=>{
  for(const id of ['run','jump','physical','magic'])assert.equal(CLIPS[id].frames.length,6);
  assert.deepEqual(Array.from({length:6},(_,i)=>frameAt(CLIPS.run,i*80)),[4,5,6,7,8,9]);
  assert.equal(frameAt(CLIPS.run,480),4);
});

test('motion and fixed-root review are mandatory independently of distinct image indices',()=>{
  const actor=draft();actor.status='ready';
  actor.reviews={art:true,pixelGrid:true,anatomy:true,sockets:true};
  let errors=validateActor(actor,{ready:true});
  assert.ok(errors.includes('Manual review required: motion'));
  assert.ok(errors.includes('Manual review required: anchors'));
  actor.reviews.motion=actor.reviews.anchors=true;
  errors=validateActor(actor,{ready:true});
  assert.ok(!errors.some(e=>e.startsWith('Manual review required')));
  assert.ok(errors.length>0,'reviews alone cannot make missing art ready');
});
test('death is a dedicated non-looping sequence, never fall or automatic rise',()=>{
  assert.notDeepEqual(CLIPS.death.frames,CLIPS.fall.frames);assert.equal(CLIPS.death.loop,false);
  assert.equal(frameAt(CLIPS.death,0),60);assert.equal(frameAt(CLIPS.death,180),61);
  assert.equal(frameAt(CLIPS.death,999999),63);assert.equal(frameAt(CLIPS.death,NaN),60);
});
test('attachment mirroring reflects position and full orientation without swapping hands',()=>{
  const s={x:196,y:208,angleDeg:30,layer:'behind'},right=socketTransform(s,1),left=socketTransform(s,-1);
  assert.equal(left.x,-right.x);assert.equal(left.y,right.y);assert.equal(left.a,-right.a);
  assert.equal(left.b,right.b);assert.equal(left.c,-right.c);assert.equal(left.d,right.d);
  const p={x:17,y:3};assert.ok(Math.abs(left.a*p.x+left.c*p.y+(right.a*p.x+right.c*p.y))<1e-9);
  assert.throws(()=>socketTransform(s,0));assert.equal(left.layer,'behind');
});
test('every existing weapon has a deliberate gesture family, unknowns are not guessed',()=>{
  for(const w of ['Poing','Dague','Epée courte','Epée longue','Katana','Hache','Marteau','Masse','Lance','Faucille','Fléau','Fouet','Arc','Gun','Projectile','Sceptre','Bâton','Tome','Orbe','Instrument'])assert.ok(familyFor(w),w);
  assert.equal(familyFor('Invented'),null);assert.equal(familyFor('Katana'),'katana');
  assert.throws(()=>createDraft({...draft(),weapon:'Invented'}));
});
test('drafts are useful but never publishable without art, hands and anatomical review',()=>{
  const actor=draft();assert.deepEqual(validateActor(actor),[]);
  assert.ok(validateActor(actor,{ready:true}).some(e=>e.includes('not ready')));
  assert.ok(validateActor(actor,{ready:true}).some(e=>e.includes('Missing socket')));
  assert.equal(actor.frames[12].grounded,false);assert.equal(actor.frames[13].grounded,false);
  assert.equal(actor.frames[14].grounded,false);assert.equal(actor.frames[15].grounded,true);
  assert.equal(actor.frames[10].grounded,true);
  actor.scale=1.4;assert.ok(validateActor(actor).some(e=>e.includes('scaling')));
});

test('malformed pages report validation failures rather than throwing',()=>{
  for(const pages of [null,{},42,[null]]){
    const actor=draft();actor.pages=pages;
    assert.ok(validateActor(actor,{ready:true}).length);
  }
});
test('per-frame scale, root drift, skipped drawing and bad socket coordinates are rejected',()=>{
  for(const mutate of [a=>a.frames[3].scale=1.2,a=>a.frames[3].origin={x:10,y:20},a=>a.clips.run.frames[0].index=3,a=>a.clips.run.frames[0]=null,a=>a.frames[3].sockets.mainHand={x:-1,y:20,angleDeg:0,layer:'front'}]){
    const actor=draft();mutate(actor);assert.ok(validateActor(actor).length);
  }
});
