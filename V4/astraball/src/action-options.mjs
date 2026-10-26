import {activeUnit, legalMoves, previewAction} from './core/game.mjs';
import {SENTRY_SKILLS, skillFor, mobilityOf} from './core/skills.mjs';

export function actionPreview(state, command){
  if(command?.type!=='move')return previewAction(state,command);
  const unit=activeUnit(state),move=legalMoves(state).find(c=>c.x===command.x&&c.y===command.y);
  return {kind:'move',legal:!!move,reason:move?null:'unreachable',cells:move?[{x:unit.x,y:unit.y},...move.path]:[],
    from:unit&&{x:unit.x,y:unit.y},to:{x:command.x,y:command.y},distance:move?.path.length??0,range:unit?mobilityOf(unit):0};
}

export function actionTargets(state, type){
  const unit=activeUnit(state);if(!unit)return [];
  if(type==='shoot')return ['left','center','right'].map((side,i)=>{
    const command={type,x:unit.team===0?12:0,y:unit.team===0?2+i:4-i};
    return {side,label:{left:'Viser à gauche',center:'Viser au centre',right:'Viser à droite'}[side],command,preview:actionPreview(state,command)};
  });
  const skill=skillFor(type);
  if(skill&&(unit.role!=='sentry'||state.phase!=='play'))return [];
  if(!skill&&!['pass','charge'].includes(type))return [];
  const enemy=type==='charge'||type==='jam';
  return state.units.filter(u=>u.id!==unit.id&&(enemy?u.team!==unit.team:u.team===unit.team)).map(u=>{
    const command={type,targetId:u.id};return {label:u.name,targetId:u.id,command,preview:actionPreview(state,command)};
  }).filter(option=>option.preview.legal);
}

export function skillOptions(state){
  const unit=activeUnit(state);
  if(unit?.role!=='sentry'||state.phase!=='play')return [];
  return SENTRY_SKILLS.map(skill=>{
    const targets=actionTargets(state,skill.id);
    const previews=state.units.filter(u=>u.id!==unit.id&&(skill.id==='jam'?u.team!==unit.team:u.team===unit.team))
      .map(u=>actionPreview(state,{type:skill.id,targetId:u.id}));
    const reason=targets.length?null:previews.find(p=>['ball-required','effect-active','no-effect'].includes(p.reason))?.reason||previews[0]?.reason||'out-of-range';
    return {...skill,targets,reason,available:targets.length>0};
  });
}

// Front-facing U: the lit point denotes the target, never a numbered lane.
export function goalIcon(side){
  const x={left:7,center:16,right:25}[side]??16;
  return `<svg class="goal-icon" viewBox="0 0 32 32" aria-hidden="true"><path class="goal-frame" d="M5 6V25H27V6"/><path class="goal-floor" d="M5 25L10 20H22L27 25"/><circle class="goal-aim" cx="${x}" cy="20" r="3.5"/></svg>`;
}
