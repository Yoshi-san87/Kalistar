'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(reduce=false){
  const listeners={},tasks=new Map(),classes=new Set(),busy=[];let clock=0;
  const target={isConnected:true,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}};
  const dialog={open:true,querySelectorAll:()=>[target],addEventListener:(n,fn)=>listeners[n]=fn,removeEventListener:n=>delete listeners[n]};
  const context={setTimeout:fn=>{tasks.set(++clock,fn);return clock;},clearTimeout:id=>tasks.delete(id),matchMedia:()=>({matches:reduce})};
  vm.runInNewContext(fs.readFileSync(require.resolve('./pre-match.js'),'utf8'),context);
  const controller=context.KalistarPreMatch.create(dialog,x=>busy.push(x));
  const tick=()=>{const [id,fn]=tasks.entries().next().value;tasks.delete(id);fn();};
  return {controller,dialog,target,tasks,classes,busy,listeners,tick};
}
test('shuffle settles once, prevents overlapping requests and clears all timers',async()=>{
  const f=fixture(),frames=[];let settled=0;
  const p=f.controller.shuffle(f.target,n=>frames.push(n),()=>settled++);
  assert.equal(f.controller.busy,true);assert.equal(await f.controller.shuffle(f.target,()=>{},()=>{}),false);
  while(f.tasks.size)f.tick();assert.equal(await p,true);assert.equal(settled,1);
  assert.deepEqual(frames,[0,1,2,3,4,5]);assert.deepEqual(f.busy,[true,false]);assert.equal(f.classes.size,0);
});
test('close, cancel, disconnected targets and destruction never settle a discarded draw',async()=>{
  for(const event of ['close','cancel','disconnect','destroy']){
    const f=fixture();let settled=0;
    const p=f.controller.shuffle(f.target,()=>{},()=>settled++);f.tick();
    if(event==='disconnect'){f.target.isConnected=false;f.tick();}
    else if(event==='destroy')f.controller.destroy();else f.listeners[event]();
    assert.equal(await p,false);assert.equal(settled,0);assert.equal(f.tasks.size,0);assert.equal(f.classes.size,0);
    if(event==='destroy')assert.equal(Object.keys(f.listeners).length,0);
  }
});
test('Reduced Motion skips all shuffle frames and settles quickly',async()=>{
  const f=fixture(true);let frames=0,settled=0;
  const p=f.controller.shuffle(f.target,()=>frames++,()=>settled++);f.tick();
  assert.equal(await p,true);assert.equal(frames,0);assert.equal(settled,1);assert.equal(f.tasks.size,0);
});
