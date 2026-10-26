import {activeUnit, legalMoves, previewAction} from './core/game.mjs';

export function actionPreview(state, command){
  if(command?.type!=='move')return previewAction(state,command);
  const unit=activeUnit(state),move=legalMoves(state).find(c=>c.x===command.x&&c.y===command.y);
  return {kind:'move',legal:!!move,reason:move?null:'unreachable',cells:move?[{x:unit.x,y:unit.y},...move.path]:[],
    from:unit&&{x:unit.x,y:unit.y},to:{x:command.x,y:command.y},distance:move?.path.length??0,range:unit?.stats.MOB??0};
}

export function actionTargets(state, type){
  const unit=activeUnit(state);if(!unit)return [];
  if(type==='shoot')return ['left','center','right'].map((side,i)=>{
    const command={type,x:unit.team===0?12:0,y:unit.team===0?2+i:4-i};
    return {side,label:{left:'Viser à gauche',center:'Viser au centre',right:'Viser à droite'}[side],command,preview:actionPreview(state,command)};
  });
  if(!['pass','charge'].includes(type))return [];
  return state.units.filter(u=>u.id!==unit.id&&(type==='pass'?u.team===unit.team:u.team!==unit.team)).map(u=>{
    const command={type,targetId:u.id};return {label:u.name,targetId:u.id,command,preview:actionPreview(state,command)};
  }).filter(option=>option.preview.legal);
}

// Front-facing U: the lit point denotes the target, never a numbered lane.
export function goalIcon(side){
  const x={left:7,center:16,right:25}[side]??16;
  return `<svg class="goal-icon" viewBox="0 0 32 32" aria-hidden="true"><path class="goal-frame" d="M5 6V25H27V6"/><path class="goal-floor" d="M5 25L10 20H22L27 25"/><circle class="goal-aim" cx="${x}" cy="20" r="3.5"/></svg>`;
}
