import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutWheel} from '../src/action-wheel.mjs';

test('context wheel keeps five separate 44px actions inside the court at edges and after pan',()=>{
  for(const width of [320,360,412,645,1140,1580])for(const height of [215,240,282,500,708]){
    for(const x of [-300,0,30,width/2,width-30,width,width+300])for(const y of [-100,0,40,height/2,height-30,height,height+300]){
      const point={x,y},before={...point},layout=layoutWheel(point,{width,height});
      assert.deepEqual(point,before);assert.equal(layout.items.length,5);
      const points=[layout.origin,...layout.items];
      for(const p of points){assert.ok(p.x>=22&&p.x<=width-22,JSON.stringify({width,height,point,p}));assert.ok(p.y>=22&&p.y<=height-22,JSON.stringify({width,height,point,p}));}
      for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.ok(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)>=44);
      assert.match(layout.arc,/^M .+ A /);
    }
  }
});

test('a centered wheel stays at the feet; collapsed launcher remains bounded above targeting controls',()=>{
  const center=layoutWheel({x:400,y:300},{width:900,height:700});
  assert.deepEqual(center.origin,{x:400,y:324});
  assert.ok(center.items.every(p=>p.y>center.origin.y));
  for(const point of [{x:-500,y:-500},{x:360,y:800},{x:180,y:300}]){
    const result=layoutWheel(point,{width:360,height:500,bottom:130},false);
    assert.equal(result.items.length,0);assert.equal(result.arc,'');
    assert.ok(result.origin.x>=30&&result.origin.x<=330);
    assert.ok(result.origin.y>=86&&result.origin.y<=348);
  }
});
