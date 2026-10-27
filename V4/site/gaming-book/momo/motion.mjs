import { clamp } from './model.mjs';
export const STEP=1000/60;
export function createMotion() { return { accumulator:0, distance:0, previous:null, current:null, moving:false }; }
export function advanceMotion(m, world, direction, ms) {
  m.accumulator+=Math.min(ms,100);
  let steps=0, travelled=0;
  while(m.accumulator>=STEP) {
    const old=m.current;
    m.previous=old;
    m.current=world.step(direction,STEP);
    travelled+=Math.abs(m.current.x-old.x);
    m.accumulator-=STEP;steps++;
  }
  m.distance+=travelled;
  if(steps) m.moving=!!direction&&travelled>.01;
  if(!direction) m.moving=false;
  const a=m.accumulator/STEP;
  return { x:m.previous.x+(m.current.x-m.previous.x)*a, y:m.previous.y+(m.current.y-m.previous.y)*a, steps };
}
export function resetMotion(m, p) { m.previous={...p};m.current={...p};m.accumulator=0;m.moving=false; }
export const walkFrame = distance => 200+Math.floor(distance/6)%8;
export function approachZoom(current,target,ms,settleMs,reduced=false){
  if(reduced)return 1;
  const next=current+(target-current)*(1-Math.exp(-Math.min(ms,100)/settleMs));
  return Math.abs(next-target)<.0001?target:next;
}
export function cameraLayout(width,height,world,x) {
  const zoom=Math.max(1.45,height/600,width/1100);
  const view={width:Math.ceil(width/zoom),height:Math.ceil(height/zoom),zoom};
  const anchor=width<650?(height<800?.59:.67):height<500?.73:.77;
  return {view, camera:{x:clamp(x-view.width*.46,0,Math.max(0,world.width-view.width)),y:clamp(world.groundY-view.height*anchor,0,world.height-view.height)}};
}
