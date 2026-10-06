'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Timeline=require('./combat-timeline.js'),Order=require('./turn-order.js');
function state(first=0,turn=1,phase='choose'){
  const initiative=Order.create('ROUND-QA');Order.roll(initiative,first?[1,6]:[6,1]);
  return {initiative,round:turn,turn:Order.sideAt(initiative,turn),phase};
}
for(const first of [0,1])test('a combat round advances only when the attacking side changes, opener '+first,()=>{
  const s=state(first),expected=[1,2,2,3,3,4,4,5,5,6,6,7];
  for(let turn=1;turn<=expected.length;turn++){
    const result=Timeline.position(s,turn);assert.equal(result.turn,turn);assert.equal(result.round,expected[turn-1]);
    assert.equal(result.side,Order.sideAt(s.initiative,turn));
  }
});
test('legacy alternating matches retain one action per combat round and their real opener',()=>{
  for(let turn=1;turn<=200;turn++){
    const s={round:turn,turn:(turn-1)%2,phase:'choose'};
    assert.deepEqual(Timeline.position(s),{turn,round:turn,side:s.turn});
    assert.equal(Timeline.position(s,1).side,0);
  }
});
test('the sliding track contains history, the current station and future, with no gaps or duplicates',()=>{
  for(const first of [0,1])for(let turn=1;turn<=200;turn++){
    const s=state(first,turn),before=structuredClone(s),steps=Timeline.view(s),phone=steps.filter(x=>x.phone);
    assert.equal(steps.length,11);assert.equal(phone.length,5);assert.equal(steps.filter(x=>x.current).length,1);
    assert(phone.some(x=>x.current));assert(steps.every(x=>x.turn>=1&&x.turn<=200));
    assert(steps.every((x,i)=>!i||x.turn===steps[i-1].turn+1));assert(steps.every(x=>x.past===(x.turn<turn)));
    for(const [scope,list]of [['desktop',steps],['phone',phone]]){
      const leads=list.filter(x=>x[scope+'Lead']);
      assert.equal(leads.reduce((n,x)=>n+x[scope+'Span'],0),list.length);
      assert.equal(new Set(leads.map(x=>x.round)).size,leads.length);
    }
    assert.deepEqual(s,before);
  }
});
test('dice, support, pending reinforcements and reload do not advance the round by themselves',()=>{
  for(const phase of ['choose','attack','kalistel','defense','clover','potion','physical','heart','guard','result','replace']){
    const s=state(1,3,phase),steps=Timeline.view(s),active=steps.find(x=>x.current);
    assert.equal(active.turn,3);assert.equal(active.round,2);assert.equal(active.side,0);
    assert.equal(active.resolved,phase==='result');assert.deepEqual(Timeline.view(JSON.parse(JSON.stringify(s))),steps);
  }
  assert.equal(Timeline.position(state(1,4)).round,3);
});
test('no track before the captains or after the match, and turn 200 stays bounded',()=>{
  for(const phase of ['setup','initiative','over'])assert.deepEqual(Timeline.view(state(0,1,phase)),[]);
  assert.equal(Timeline.position(state(0,1,'initiative')),null);
  assert.equal(Timeline.position(state(0,200)).round,101);
  assert.equal(Timeline.position(state(0,201,'over')).turn,200);
});
