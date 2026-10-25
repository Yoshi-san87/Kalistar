import { SPRITE_CELL, SPRITE_FOOT } from './sprites.mjs';
import { measurementsFor } from '../data/athlete-measurements.mjs';

// World pixels, before camera zoom. This is presentation, never a hit/collision rule.
export const SPRITE_SIZE_LIMITS = Object.freeze({
  minCm:100, maxCm:300, fallbackCm:180,
  minPixels:70, maxPixels:154, restWidth:96, actionWidth:144, actionHeight:174,
});
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const half=SPRITE_CELL/2;

export function calibrationFromFrames(frames) {
  if(!Array.isArray(frames)||frames.length!==16)throw Error('Sixteen sprite bounds required');
  for(const [index,f] of frames.entries()){
    if(f.index!==index||!['left','top','width','height'].every(k=>Number.isInteger(f[k]))||
      f.left<0||f.top<0||f.width<1||f.height<1||f.left+f.width>SPRITE_CELL||
      f.top+f.height>SPRITE_FOOT)throw Error('Invalid sprite bounds: '+index);
  }
  const idle=frames.slice(0,4),heights=idle.map(f=>SPRITE_FOOT-f.top).sort((a,b)=>a-b);
  return Object.freeze({
    standingHeight:(heights[1]+heights[2])/2,
    restLeft:Math.min(...idle.map(f=>f.left)),restRight:Math.max(...idle.map(f=>f.left+f.width)),
    left:Math.min(...frames.map(f=>f.left)),right:Math.max(...frames.map(f=>f.left+f.width)),
    top:Math.min(...frames.map(f=>f.top)),
  });
}

export function validCalibration(c) {
  return !!c&&positive(c.standingHeight)&&c.standingHeight<=SPRITE_FOOT&&
    ['restLeft','restRight','left','right','top'].every(k=>Number.isInteger(c[k]))&&
    c.left>=0&&c.left<=c.restLeft&&c.restLeft<c.restRight&&c.restRight<=c.right&&
    c.right<=SPRITE_CELL&&c.top>=0&&c.top<SPRITE_FOOT&&
    c.standingHeight<=SPRITE_FOOT-c.top;
}

export function displayHeight(characterId,athlete) {
  const m=measurementsFor({id:characterId,measurements:athlete?.measurements});
  const available=m?.heightKind!=='length'&&positive(m?.heightCm),adapted=m?.heightStatus==='adapted';
  const cm=available?m.heightCm:SPRITE_SIZE_LIMITS.fallbackCm;
  return Object.freeze({source:available?(adapted?'adaptation':'measurement'):'neutral-presentation',
    measuredCm:available&&!adapted?cm:null,cm:clamp(cm,SPRITE_SIZE_LIMITS.minCm,SPRITE_SIZE_LIMITS.maxCm)});
}

export function spriteSizing(character) {
  const height=displayHeight(character.characterId,character.athlete),c=character.calibration;
  if(!validCalibration(c)){
    // Older/offline catalogues keep working without guessing their painted bounds.
    const scale=positive(character.scale)?Math.min(2,character.scale):1.4;
    return Object.freeze({scale,height,calibrated:false,standingHeight:76*scale,
      maxHeight:82*scale,restWidth:56*scale,actionWidth:SPRITE_CELL*scale,
      hitLeft:-28*scale,hitRight:28*scale,ballX:28,ballY:-51});
  }
  const limits=SPRITE_SIZE_LIMITS;
  const desired=limits.minPixels+(height.cm-limits.minCm)/(limits.maxCm-limits.minCm)*(limits.maxPixels-limits.minPixels);
  // One scale for all sixteen poses: a raised hand must not shrink the body.
  const restWidth=2*Math.max(Math.abs(c.restLeft-half),Math.abs(c.restRight-half));
  const actionWidth=2*Math.max(Math.abs(c.left-half),Math.abs(c.right-half));
  const scale=Math.min(desired/c.standingHeight,limits.restWidth/restWidth,
    limits.actionWidth/actionWidth,limits.actionHeight/(SPRITE_FOOT-c.top));
  const standingHeight=c.standingHeight*scale;
  return Object.freeze({scale,height,calibrated:true,standingHeight,
    maxHeight:(SPRITE_FOOT-c.top)*scale,restWidth:restWidth*scale,actionWidth:actionWidth*scale,
    hitLeft:Math.min(-18,(c.restLeft-half)*scale),hitRight:Math.max(18,(c.restRight-half)*scale),
    ballX:Math.max(20,Math.min(38,restWidth*scale*.38)),ballY:-standingHeight*.53});
}
