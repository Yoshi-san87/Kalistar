import {createStory,enterStory,passages} from './story.mjs';
import {clamp} from './model.mjs';
const phases=['introBlack','introLight','introReveal','waking','road','search','afterCrate','abandoned','roadToFlute','finding','firstNote','playing','surprised','journey','nightfall','nightWalk','climbing','seating','seated','finalPlaying','film','ending'];
export function checkpoint(story,actor){
  return {version:1,phase:story.phase,beat:story.beat,acknowledged:story.acknowledged,returnPhase:story.returnPhase,x:actor.x};
}
export function restore(value,config){
  const story=createStory(),actor={x:config.world.startX,y:config.world.groundY,facing:1};
  if(value?.version!==1||!phases.includes(value.phase)||!Number.isInteger(value.beat)||typeof value.acknowledged!=='boolean'||!Number.isFinite(value.x))return {story,actor};
  let phase=value.phase,beat=value.beat,ack=value.acknowledged;
  // Resume a musical gesture from its invitation, never halfway through audio/video.
  if(phase==='playing'){phase=value.returnPhase==='journey'?'journey':'firstNote';beat=0;ack=false;}
  if(['film','finalPlaying'].includes(phase)){phase='seated';beat=0;ack=false;}
  const pages=passages[phase];
  if(beat<0||beat>=(pages?.length||1))return {story,actor};
  enterStory(story,phase);story.beat=beat;story.acknowledged=pages?ack:true;
  const index=phases.indexOf(phase);
  story.hasFlute=index>=phases.indexOf('firstNote')||phase==='finding'&&beat>0;
  story.firstMagic=index>=phases.indexOf('journey');
  story.nightStarted=index>=phases.indexOf('nightfall');story.night=story.nightStarted?1:0;
  actor.x=clamp(value.x,config.world.startX,config.route.seatX);
  if(['seating','seated','ending'].includes(phase)){actor.x=config.route.seatX;actor.facing=-1;}
  if(phase==='seating'){actor.x=config.route.climbX;actor.y=config.route.stepY;}
  return {story,actor};
}
