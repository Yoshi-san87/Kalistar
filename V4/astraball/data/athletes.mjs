import { ORIGINAL_ATHLETES, COLLABORATION_STYLES } from './athlete-definitions.mjs';
import { ATHLETE_CHOICES } from './athlete-choices.mjs';

export const ATHLETE_VERSION = 2;
export const STAT_TITLES = Object.freeze({VIT:'Vitesse',MOB:'Mobilit\u00e9',FOR:'Force',PAS:'Passe',TIR:'Tir',DEF:'D\u00e9fense'});
const keys=Object.keys(STAT_TITLES);
// Shared allocation budget: VIT+FOR+PAS+TIR+DEF+2*MOB=38. Not a proof of balance.
const styles={
  orchestrator:['Chef d\u2019orchestre','meneur',[8,3,3,9,6,6]],
  strategist:['Strat\u00e8ge','meneur',[6,3,4,9,6,7]],
  playmaker:['Cr\u00e9ateur','meneur',[7,3,4,8,8,5]],
  courier:['Messager','sentry',[9,4,3,7,5,6]],
  scout:['\u00c9claireur','sentry',[9,4,3,5,8,5]],
  interceptor:['Intercepteur','sentry',[8,4,5,6,4,7]],
  finisher:['Finisseur','scoreur',[8,3,4,5,9,6]],
  sniper:['Pr\u00e9cision','scoreur',[6,3,4,7,9,6]],
  power:['Frappe lourde','scoreur',[5,3,8,5,9,5]],
  duelist:['Duelliste','middle',[7,3,7,5,7,6]],
  relay:['Relais','middle',[6,3,6,8,6,6]],
  ballwinner:['R\u00e9cup\u00e9rateur','middle',[7,3,7,5,5,8]],
  enforcer:['Impact','middle',[5,3,9,5,6,7]],
  wall:['Rempart','pilier',[4,2,9,6,6,9]],
  sweeper:['Gardien relanceur','pilier',[5,2,7,8,5,9]],
  keeper:['Gardien offensif','pilier',[4,2,8,5,8,9]],
};
const profiles=new Map();
function define(id,style,heightCm=null,weightKg=null,specialization=''){
  if(profiles.has(id)||!styles[style])throw Error('Invalid athlete definition: '+id);
  const [label,position,values]=styles[style],stats=Object.fromEntries(keys.map((k,i)=>[k,values[i]]));
  if(specialization){
    const [up,down]=specialization.split(':');
    if(!keys.includes(up)||!keys.includes(down)||up===down||up==='MOB'||down==='MOB')throw Error('Invalid specialization: '+id);
    // The 1..9 rating scale is strict; a capped specialty stays at its authored base.
    if(stats[up]<9&&stats[down]>1){stats[up]++;stats[down]--;}
  }
  const measurements=Object.freeze({heightCm,weightKg,status:heightCm===null?'unknown':'estimated',
    note:heightCm===null?'Non document\u00e9 de fa\u00e7on fiable.':'Estimation artistique, \u00e0 valider. Hors accessoires ; masse du corps (structure comprise pour robots).',
    heightKind:['ruby','sapphire','nereis-kalistar'].includes(id)?'length':'height'});
  const choice=ATHLETE_CHOICES[id];
  profiles.set(id,Object.freeze({id,version:ATHLETE_VERSION,style:label,position:choice?.position||position,
    stats:choice?.stats||Object.freeze(stats),measurements}));
}
for(const line of ORIGINAL_ATHLETES.split('\n')){
  const [id,style,h,w,specialization]=line.split('|');define(id,style,Number(h),Number(w),specialization);
}
for(const [style,ids] of Object.entries(COLLABORATION_STYLES))for(const id of ids.split(/\s+/))define(id,style);
export const ATHLETES=Object.freeze([...profiles.values()]);
export const getAthlete=id=>profiles.get(id)||null;
export const canPlayPosition=(athlete,role)=>!!athlete&&athlete.position===role;
export const ratingBudget=stats=>keys.reduce((sum,k)=>sum+stats[k]*(k==='MOB'?2:1),0);

export function athleteSnapshot(id,role){
  const profile=getAthlete(id);
  if(!canPlayPosition(profile,role))throw new TypeError('Character cannot play this position: '+id+' / '+role);
  return {id,version:profile.version,position:profile.position};
}
