export const SPRITE_CELL=96;
export const SPRITE_FOOT=90;
export const SPRITES=Object.freeze(Object.fromEntries(Object.entries({
  momo:1.1,kaylis:1.4,taulio:1.48,cana:1.4,balmhyr:1.32,
  voloden:1.5,lok:1.32,darnako:1.5,iliane:1.45,valazar:1.5,
}).map(([id,scale])=>[id,Object.freeze({url:'assets/sprites-v1/'+id+'.png',scale})])));

const clips={
  idle:{frames:[0,1,0,2,3,0],fps:4,loop:true},
  run:{frames:[4,5,6,7],fps:12,loop:true},
  throw:{frames:[8,9,10,11],fps:8,loop:false},
  guard:{frames:[12],fps:1,loop:false},
  charge:{frames:[8,12,9,12],fps:9,loop:false},
  hit:{frames:[13,13,12,0],fps:7,loop:false},
  celebrate:{frames:[14,15,14,15],fps:5,loop:true},
};
export const CLIPS=Object.freeze(Object.fromEntries(Object.entries(clips).map(([key,value])=>[key,Object.freeze({...value,frames:Object.freeze(value.frames)})])));
// A validated future atlas may provide magic; never index V2 frames in V1 art.
export function magicPose(frameCount,clips=CLIPS){
  const frames=clips.magic?.frames;
  return Array.isArray(frames)&&frames.length>0&&frames.every(i=>Number.isInteger(i)&&i>=0&&i<frameCount)?'magic':'guard';
}
export function frameAt(pose,elapsed=0){
  const clip=CLIPS[pose];if(!clip)throw new Error('Unknown sprite pose: '+pose);
  const index=Math.floor(Math.max(0,Number.isFinite(elapsed)?elapsed:0)*clip.fps/1000);
  return clip.frames[clip.loop?index%clip.frames.length:Math.min(index,clip.frames.length-1)];
}
export function spriteKey(unit){
  const key=unit.id.split('-')[1];if(!SPRITES[key])throw new Error('Missing Astraball sprite: '+key);return key;
}
export function facing(from,to,fallback=1){return Math.abs(to.x-from.x)<.01?fallback:to.x>from.x?1:-1;}
