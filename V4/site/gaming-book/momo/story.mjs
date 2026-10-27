import { clamp } from './model.mjs';

// Each page owns its cue and minimum staging time, never a reading deadline.
export const passages = {
  introBlack: [
    {text:'Du métal froid contre sa joue.',min:1200},
    {text:'Avant même d’ouvrir l’œil, Momo attendit un ordre.'},
  ],
  introLight: [
    {text:'Momo ouvrit un œil.',min:2000},
    {text:'Sa petite lumière bleue trembla. Le monde, lui, ne répondit pas.'},
  ],
  introReveal: [
    {text:'Autour de lui, des carcasses. Des choses que personne ne venait chercher.',min:3000},
    {text:'Partout, des mains immobiles. Des visages éteints.'},
    {text:'Il attendit qu’une voix prononce son nom.'},
    {text:'Personne ne l’avait rappelé.'},
  ],
  waking: [
    {text:'Alors, lentement, il se releva.',min:4200},
    {text:'Rester couché ne ferait revenir personne.'},
  ],
  road: [
    {text:'Il devait bien rester quelque chose, quelque part.'},
    {text:'Il connaissait les gestes pour ranger une maison. Pas ceux pour rentrer seul.'},
  ],
  search: [
    {text:'Des vis. Un cadran brisé.',min:3000},
    {text:'Il souleva chaque pièce avec soin. On lui avait appris à ne rien abîmer.'},
    {text:'Il chercha encore, comme si quelqu’un avait pu laisser un mot.'},
  ],
  afterCrate: [{text:'Rien qui puisse lui dire comment rentrer.'}],
  abandoned: [
    {text:'Il se retourna. Le chemin était vide.',min:1400},
    {text:'Il attendit encore. Peut-être fallait-il seulement être patient.'},
    {text:'On ne l’avait pas perdu.',min:1800},
    {text:'Ses maîtres l’avaient jeté ici.',min:1600},
    {text:'Cela ne ressemblait à aucune panne. Pourtant, quelque chose en lui faisait mal.'},
  ],
  roadToFlute: [{text:'Il n’avait plus de maison. Mais ses petits pas continuaient.'}],
  finding: [
    {text:'Sous la poussière, un éclat d’argent.',min:2600},
    {text:'Une flûte. Presque intacte.',min:1400},
    {text:'Il ne savait pas encore quoi en faire.'},
    {text:'Il savait seulement qu’il ne voulait pas la laisser.'},
  ],
  firstNote: [
    {text:'Ses doigts connaissaient déjà le geste.'},
    {text:'Il n’avait jamais reçu l’ordre de jouer.'},
    {text:'D’où lui venait cette mélodie ?'},
  ],
  playing: [{text:'Une note s’éleva entre les carcasses.'}],
  surprised: [
    {text:'La lumière venait de lui. Momo recula, stupéfait.',min:2400},
    {text:'Il regarda l’instrument, puis ses doigts.'},
    {text:'Ce n’était pas prévu.'},
  ],
  journey: [
    {text:'Pour la première fois depuis longtemps, le silence ne lui faisait plus aussi peur.'},
    {text:'La casse était toujours la casse. Mais il n’y était plus tout à fait seul.'},
  ],
  nightfall: [
    {text:'Le jour s’effaçait. Dans sa main, la flûte gardait un peu de lumière.',min:4200},
    {text:'Cette fois, personne ne viendrait lui demander de se taire.'},
  ],
  climbing: [{text:'Une marche. Un endroit où s’arrêter.',min:2200}],
  seating: [
    {text:'Momo se retourna vers la casse.',min:1400},
    {text:'Il n’avait plus envie de fuir le silence.'},
  ],
  seated: [{text:'Cette fois, il joua pour lui.'}],
  finalPlaying: [{text:'Et la nuit écouta.',min:1700}],
};
export const lines = Object.fromEntries(Object.entries(passages).flatMap(([phase,pages])=>pages.map((page,i)=>[`${phase}:${i}`,page.text])));
lines.ending='Ce n’était pas un défaut. Quelque chose, en lui, se souvenait.';
const nextPhase={introBlack:'introLight',introLight:'introReveal',introReveal:'waking',waking:'road',search:'afterCrate',abandoned:'roadToFlute',finding:'firstNote',surprised:'journey',nightfall:'nightWalk',climbing:'seating',seating:'seated',finalPlaying:'film'};
const cueDuration={introLight:2000,introReveal:3000,waking:4200,search:3000,roadToFlute:1500,finding:2600,surprised:2400,climbing:2200,seating:1400,finalPlaying:1700};
const openingPhases=['introBlack','introLight','introReveal'];
export const hasDialogue=s=>!!passages[s.phase]&&!s.acknowledged;
export const canMove=s=>['road','afterCrate','roadToFlute','journey','nightWalk'].includes(s.phase)&&!hasDialogue(s);
export const canPlay=s=>s.hasFlute&&['firstNote','journey','nightWalk','seated'].includes(s.phase)&&!hasDialogue(s);
export const canContinue=s=>hasDialogue(s)&&s.beatElapsed>=(passages[s.phase][s.beat].min||1100)&&(s.phase!=='playing'||s.performanceComplete);
export function createStory(){
  return {phase:'introBlack',elapsed:0,beat:0,beatElapsed:0,acknowledged:false,performanceComplete:false,revision:0,hasFlute:false,firstMagic:false,night:0,nightStarted:false,history:['introBlack'],readHistory:[],returnPhase:null};
}
export function enterStory(s,phase){
  s.phase=phase;s.elapsed=0;s.beat=0;s.beatElapsed=0;s.acknowledged=!passages[phase];s.performanceComplete=false;s.revision++;s.history.push(phase);
  if(phase==='firstNote')s.hasFlute=true;
  if(phase==='journey')s.firstMagic=true;
  if(phase==='nightfall')s.nightStarted=true;
}
export function continueStory(s){
  if(!canContinue(s))return false;
  s.readHistory.push(`${s.phase}:${s.beat}`);
  if(s.beat+1<passages[s.phase].length){
    s.beat++;s.beatElapsed=0;s.revision++;
    if(s.phase==='finding')s.hasFlute=true;
  }else if(s.phase==='playing'){
    enterStory(s,s.returnPhase==='firstNote'?'surprised':s.returnPhase||'journey');
  }else if(nextPhase[s.phase])enterStory(s,nextPhase[s.phase]);
  else{s.acknowledged=true;s.revision++;}
  return true;
}
export function advanceStory(s,ms,x,route){
  s.elapsed+=ms;s.beatElapsed+=ms;
  if(s.nightStarted)s.night=clamp(s.night+ms/route.nightDuration,0,1);
  if(!canMove(s))return;
  if(s.phase==='road'&&x>=route.crateX)enterStory(s,'search');
  else if(s.phase==='afterCrate'&&x>=route.memoryX)enterStory(s,'abandoned');
  else if(s.phase==='roadToFlute'&&x>=route.fluteX)enterStory(s,'finding');
  else if(s.phase==='journey'&&x>=route.nightX)enterStory(s,'nightfall');
  else if(s.phase==='nightWalk'&&x>=route.stairTriggerX)enterStory(s,'climbing');
}
export function beginPlay(s){
  if(!canPlay(s))return false;
  if(s.phase==='seated')enterStory(s,'finalPlaying');
  else{s.returnPhase=s.phase;enterStory(s,'playing');}
  return true;
}
export function finishPlay(s){
  if(s.phase!=='playing')return;
  s.performanceComplete=true;s.revision++;
}
export function narrative(s){
  return passages[s.phase]?.[s.beat]?.text||(s.phase==='ending'?lines.ending:'');
}
export function storyFrame(s,idle){
  const t=s.elapsed;
  if(openingPhases.includes(s.phase))return s.phase==='introBlack'?40:41;
  if(s.phase==='waking')return [41,41,42,43,0][Math.min(4,Math.floor(t/840))];
  if(s.phase==='search'||s.phase==='finding'){
    if(s.phase==='finding'&&s.beat>0)return 100;
    return [24,25,26,27,25,24][Math.min(5,Math.floor(t/500))];
  }
  if(s.phase==='abandoned')return s.beat<2?idle:2;
  if(s.phase==='surprised')return s.beat===1?100:[33,32,35,0][Math.min(3,Math.floor(t/600))];
  if(s.phase==='seating')return t<500?210:t<950?211:212;
  if(s.phase==='seated'||s.phase==='ending')return 212;
  if(s.phase==='finalPlaying'||s.phase==='film')return t<450?213:214;
  return idle;
}
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function cinematicState(s,reduced=false){
  const opening=openingPhases.includes(s.phase);
  const reveal=s.phase==='introBlack'||s.phase==='introLight'?0:s.phase==='introReveal'?(reduced?1:smooth(s.elapsed/3000)):1;
  const actor=s.phase==='introBlack'?0:s.phase==='introLight'?(reduced?1:smooth(s.elapsed/2000)):1;
  const mood=s.phase==='abandoned'?(s.beat<2?.1*(reduced?1:smooth(s.elapsed/1400)):s.beat===2?.1+.15*(reduced?1:smooth(s.beatElapsed/1600)):.25):s.phase==='roadToFlute'?.25*(reduced?0:1-smooth(s.elapsed/1500)):0;
  const fluteFocus=s.phase==='playing'?(reduced?1:smooth(s.elapsed/1000)):s.phase==='surprised'?(reduced?0:1-smooth(s.elapsed/1600)):s.phase==='finalPlaying'||s.phase==='film'?(reduced?1:smooth(s.elapsed/900)):0;
  return {opening,captionCentered:s.phase==='introBlack'||s.phase==='introLight',reveal,actor,spot:opening?actor*(1-reveal):0,mood,fluteFocus};
}
export function storyAnimating(s){
  return s.elapsed<(cueDuration[s.phase]||0)||(hasDialogue(s)&&!canContinue(s));
}
