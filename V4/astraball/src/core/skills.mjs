export const SENTRY_SKILLS=Object.freeze([
  {id:'relay',label:'Relais',icon:'radio',short:'+1 PAS',color:0x78ead1,description:'Un alli\u00e9 gagne 1 case de port\u00e9e de passe jusqu\u2019\u00e0 la fin de sa prochaine activation.'},
  {id:'cover',label:'Couverture',icon:'shield-plus',short:'+2 DEF',color:0x8ccfff,description:'Un alli\u00e9 gagne 2 DEF contre les charges jusqu\u2019\u00e0 la fin de sa prochaine activation.'},
  {id:'jam',label:'Brouillage',icon:'footprints',short:'-1 MOB',color:0xeaa3da,description:'Un adversaire perd 1 case de d\u00e9placement \u00e0 sa prochaine activation, sans descendre sous 1.'},
  {id:'charged-pass',label:'Passe charg\u00e9e',icon:'sparkles',short:'+1 TIR',color:0xffd98b,description:'Passe avec 1 case de port\u00e9e en moins. Le ballon gagne 1 case au prochain tir, sans changer les points.'},
].map(Object.freeze));
export const skillFor=type=>SENTRY_SKILLS.find(skill=>skill.id===type)||null;
export const unitEffects=unit=>SENTRY_SKILLS.filter(skill=>skill.id!=='charged-pass'&&unit?.effects?.[skill.id]);
export const mobilityOf=unit=>unit.stats.MOB-(unit.effects?.jam&&unit.stats.MOB>1?1:0);
export const defenseOf=unit=>unit.stats.DEF+(unit.effects?.cover?2:0);
export const passRange=unit=>3+Math.floor(unit.stats.PAS/2)+(unit.effects?.relay?1:0);
export const shotRange=(state,unit)=>2+Math.floor(unit.stats.TIR/2)+(state.ball.holderId===unit.id&&state.ball.charge?.team===unit.team?1:0);
