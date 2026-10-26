import { createMatch, activeUnit, getUnit, getInitiative, legalMoves, legalPlacements, controllingTeam, previewAction, applyCommand, restoreMatch } from './core/game.mjs';
import { inDefense } from './core/geometry.mjs';
import { skillFor, mobilityOf, defenseOf, passRange, shotRange, unitEffects } from './core/skills.mjs';
import { chooseTurn } from './core/ai.mjs';
import { CourtRenderer } from './renderer.mjs';
import { TEAMS } from '../data/teams.mjs';
import { getArena, normalizeAppearance } from './appearance.mjs';
import { createRoster } from './roster.mjs';
import { renderLocker, spriteBadge } from './locker.mjs';
import { getAthlete } from '../data/athletes.mjs';
import { renderMeasurements } from './athlete-view.mjs';
import { ActionWheel } from './action-wheel.mjs';
import { actionPreview, actionTargets, skillOptions, goalIcon } from './action-options.mjs';

if(window.KalistarCloudConfig)window.KalistarCloudConfig=Object.freeze({...window.KalistarCloudConfig,sdk:'/jeu/assets/supabase/supabase-2.118.0.js'});
if(!await window.KalistarAuthGuard?.ensure())throw Error('Connexion Kalistar requise.');

const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roleNames={meneur:'Meneur',scoreur:'Scoreur',middle:'Middle',sentry:'Sentry',pilier:'Pilier'};
const shortRoles={meneur:'MN',scoreur:'SC',middle:'MD',sentry:'ST',pilier:'PI'};
const statTitles={VIT:'Vitesse : ordre d’initiative',MOB:'Mobilité : cases de déplacement',FOR:'Force : chance de charge',PAS:'Passe : portée',TIR:'Tir : portée',DEF:'Défense : résistance aux charges'};
const errors={'ball-required':'Ce joueur ne porte pas le ballon.','out-of-range':'Cible hors de portée.','not-adjacent':'La charge demande une case voisine.','unreachable':'Cette case est inaccessible.','already-moved':'Déplacement déjà effectué.','teammate-required':'Choisis un partenaire.','enemy-required':'Choisis un adversaire.','opponent-goal-required':'Choisis une des trois cibles adverses.'};
Object.assign(errors,{'placement-required':'Valide les formations avant de jouer.','placement-team':'Choisis un joueur de ton équipe.','own-half-required':'Reste dans ta moitié de terrain ; la colonne centrale reste libre.','defense-capacity':'Zone défensive : le Pilier et un seul coéquipier maximum.','occupied':'Cette case est déjà occupée.'});
Object.assign(errors,{'sentry-required':'Compétence réservée au Sentry.','effect-active':'Effet déjà actif, non cumulable.','no-effect':'Mobilité déjà au minimum.'});
const effectLabels={relay:'Passe +1 case',cover:'DEF +2',jam:'MOB −1','charged-pass':'Tir +1 case'};
const actionLabel=type=>skillFor(type)?.label||{move:'Déplacement',pass:'Passe',shoot:'Tir',charge:'Charge',skills:'Compétences Sentry'}[type];
const targetAction=type=>['pass','charge'].includes(type)||!!skillFor(type);
const profile=window.KALISTAR_CLOUD_ACCESS?.localProfile;
const KEY='kalistar.astraball.match.v1'+(profile?'.'+profile:''), OPTIONS='kalistar.astraball.options.v1';
let libraryData;
try{
  const response=await fetch(new URL('../data/sprite-library.json',import.meta.url));
  if(response.ok)libraryData=await response.json();
}catch{}
let roster;
try{
  if(!libraryData)throw Error('Athlete catalogue unavailable');
  roster=createRoster(libraryData);roster.defaults();
}catch(error){
  const boot=$('#boot');boot.textContent='Le catalogue des personnages n\u2019a pas pu \u00eatre charg\u00e9.';
  const retry=document.createElement('button');retry.textContent='R\u00e9essayer';retry.onclick=()=>location.reload();boot.append(retry);
  throw error;
}
const portrait=u=>{
  const c=roster.forUnit(u);
  return c?.portrait?'<img src="'+c.portrait+'" alt="">':spriteBadge(c);
};
const headPortrait=u=>{
  const c=roster.forUnit(u),cal=c.calibration,scale=34/32;
  const left=((cal?(cal.restLeft+cal.restRight)/2:48)-16)*scale,top=(90-(cal?.standingHeight??76))*scale;
  return `<span class="wheel-portrait sprite-head" aria-hidden="true" style="background-image:url(&quot;${esc(c.url)}&quot;);background-size:${384*scale}px ${384*scale}px;background-position:${-left}px ${-top}px"></span>`;
};
const seed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let state,mode='move',pending=null,hoverKey='',busy=false,aiRunning=false,generation=0,inspecting=null,sound=false,audio=null,finishedShown=false,placementId=null;
let options={mode:'solo',motion:true,sound:false};
try{options={...options,...JSON.parse(localStorage.getItem(OPTIONS)||'{}')};}catch{}
options={...options,...normalizeAppearance(options)};
try{const raw=localStorage.getItem(KEY);if(raw&&raw.length<250000){const value=restoreMatch(JSON.parse(raw));if(['solo','hotseat'].includes(value.mode))state=value;}}catch{}
const needsKickoff=!state;
state ||= createMatch({seed:seed(),mode:['solo','hotseat'].includes(options.mode)?options.mode:'solo',teams:roster.teams(options.lineups)});
if(state.moved)mode=state.ball.holderId===state.activeId?'pass':'charge';
sound=options.sound===true;
const canInteract=()=>!busy&&!aiRunning&&!document.hidden&&!$('#modal').open&&state.status==='playing'&&(state.mode==='hotseat'||controllingTeam(state)===0);
const canPlay=()=>canInteract()&&state.phase!=='placement';
function selectedUnit(){
  if(state.phase!=='placement')return activeUnit(state)||state.units[0];
  if(getUnit(state,placementId)?.team!==state.placement.team)placementId=state.units.find(u=>u.team===state.placement.team&&u.role==='meneur').id;
  return getUnit(state,placementId);
}
const icons=()=>window.lucide?.createIcons();
let wheel;
const court=new CourtRenderer($('#canvas-host'),{onCell:selectCell,onUnit:selectUnit,onHover:hover,onViewChange:()=>wheel?.position(),appearance:options,roster});
wheel=new ActionWheel({root:$('#action-wheel'),host:$('.arena'),
  point:()=>{const unit=activeUnit(state);return unit&&court.scene?court.screenCell(unit.x,unit.y):null;},
  onToggle:()=>{renderTargets();highlight();},onBack:backAction});

function visibleEffects(unit){
  const effects=[...unitEffects(unit)];
  if(state.ball.holderId===unit.id&&state.ball.charge?.team===unit.team)effects.push(skillFor('charged-pass'));
  return effects;
}
function effectDescription(effect){
  return effect.id==='charged-pass'?'Ballon chargé : +1 case au prochain tir, points inchangés. Conservé sur les passes alliées ; consommé au tir ou à la perte du ballon.':effect.description+' Fin de la prochaine activation de la cible, pas au déplacement.';
}
function effectTag(effect,compact=false){
  return `<span class="unit-effect ${effect.id==='jam'?'harmful':''}" data-effect="${esc(effect.id)}" title="${esc(effect.label+' · '+effectDescription(effect))}" aria-label="${esc(effect.label+' · '+effectDescription(effect))}"><i data-lucide="${esc(effect.icon)}" aria-hidden="true"></i>${compact?'':`<span>${esc(effectLabels[effect.id])}</span>`}</span>`;
}
function effectMarkup(unit,compact=false){return visibleEffects(unit).map(effect=>effectTag(effect,compact)).join('');}
function renderEffects(unit){
  const host=$('#active-effects'),holder=getUnit(state,state.ball.holderId),otherCharged=holder&&holder.id!==unit.id&&state.ball.charge;
  host.innerHTML=effectMarkup(unit)+(otherCharged?`<span class="ball-owner">Balle · ${esc(holder.name)}</span>${effectTag(skillFor('charged-pass'))}`:'');
  host.hidden=!visibleEffects(unit).length&&!otherCharged;
}

function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('#save-status').textContent='Match sauvegardé sur cet appareil';}catch{$('#save-status').textContent='Sauvegarde indisponible';}}
function saveOptions(){try{localStorage.setItem(OPTIONS,JSON.stringify(options));}catch{}}
function ribbon(value){$('#event-ribbon').textContent=value;}
function eventLabel(e){
  const who=getUnit(state,e.unitId)?.name||'',target=getUnit(state,e.targetId)?.name||'';
  switch(e.type){
    case 'move':return who+' se replace'+(e.pickup?' et récupère le ballon.':'.');
    case 'pass':return e.success?who+' passe à '+target+'.':who+' tente une passe coupée.';
    case 'skill':return who+' · '+(skillFor(e.skill)?.label||'Compétence')+' → '+target+'.';
    case 'intercept':return who+' intercepte le ballon !';
    case 'charge':return e.success?who+' bouscule '+target+' · −3 VIT.':target+' résiste à la charge.';
    case 'shot':return e.success?who+' trouve le U !':e.blockerId?who+' : tir contré.':who+' : tir manqué.';
    case 'goal':return TEAMS[e.team].name+' · +'+e.points+' point'+(e.points>1?'s':'')+' !';
    case 'round':return 'Manche '+e.round+' · nouvelles initiatives.';
    case 'wait':return who+' termine son activation.';
    case 'end':return state.winner===null?'Match nul.':TEAMS[state.winner].name+' remporte le match.';
    case 'place':return who+' prend position.';
    case 'ready':return TEAMS[e.team].name+' · formation validée.';
    case 'kickoff':return 'Engagement · '+TEAMS[e.team].name;
    case 'placement':return e.reason==='rules-update'?'Nouvelles règles de placement · score et tours conservés.':'Replacement · '+TEAMS[e.team].name+' à l’engagement.';
    default:return '';
  }
}
function render(){
  const unit=selectedUnit(),color=TEAMS[unit.team].color,placing=state.phase==='placement';
  if(!busy)court.setSelection(state.status==='finished'?null:unit.id);
  court.setIdleEnabled(canInteract());
  $('#score-0').textContent=state.score[0];$('#score-1').textContent=state.score[1];$('#round-label').textContent='MANCHE '+String(state.round).padStart(2,'0');
  $('#mode-label').textContent=state.mode==='solo'?'Exhibition · Solo':'Exhibition · Deux joueurs';
  $('#turn-label').textContent=state.status==='finished'?'MATCH TERMINÉ':busy?'ACTION EN COURS':unit.team===1&&state.mode==='solo'?'OBSIDiENNE · IA'.toUpperCase():TEAMS[unit.team].name.toUpperCase()+' · À VOUS';
  if(placing)$('#turn-label').textContent=TEAMS[unit.team].name.toUpperCase()+' · PLACEMENT';
  $('#placement-controls').hidden=!placing;$('#actions').hidden=placing;$('.phase-track').hidden=placing;$('#wait').hidden=placing;
  $('#stats').hidden=placing;
  $('.tactics').classList.toggle('placing',placing);
  $('.initiative-title span').textContent=placing?'PLACEMENT':'INITIATIVE';
  if(placing){
    $('#placement-progress').innerHTML=TEAMS.map(t=>`<span style="--team:${t.color}" class="${t.id===state.placement.team?'current':''}">${esc(t.name)}<i data-lucide="${state.placement.ready[t.id]?'check':'users'}"></i></span>`).join('');
    const support=state.units.filter(u=>u.team===unit.team&&u.role!=='pilier'&&inDefense(unit.team,u.x,u.y)).length;
    $('#placement-summary').textContent='Zone défensive · Pilier + '+support+'/1 coéquipier';
    $('#formation-ready').disabled=!canInteract();
  }
  $('.turn-heading').style.color=color;
  $('#initiative').innerHTML=getInitiative(state).map(entry=>{
    const u=getUnit(state,entry.id),effects=visibleEffects(u),summary=effects.map(effect=>effect.label+' : '+effectLabels[effect.id]).join(', ');
    return `<button class="initiative-token ${entry.active?'active':''} ${entry.acted?'acted':''}" data-unit="${esc(u.id)}" style="--team:${TEAMS[u.team].color}" title="${esc(u.name)} · ${roleNames[u.role]} · VIT ${entry.speed}${entry.acted?' · A joué':''}${summary?' · '+esc(summary):''}" aria-label="${esc(u.name)} ${roleNames[u.role]}, vitesse ${entry.speed}${entry.active?', joueur actif':''}${summary?', '+esc(summary):''}"><span class="initiative-portrait">${portrait(u)}<span class="initiative-effects">${effectMarkup(u,true)}</span></span><span><b>${esc(u.name)}</b><small>${roleNames[u.role]}</small><span class="mini-role">${shortRoles[u.role]}</span></span><span class="speed">${entry.speed}</span></button>`;
  }).join('');
  if(placing)for(const token of $('#initiative').children){const u=getUnit(state,token.dataset.unit);token.classList.remove('acted');token.classList.toggle('active',u.id===placementId);token.disabled=!canInteract()||u.team!==unit.team;token.setAttribute('aria-pressed',String(u.id===placementId));}
  $('#player-summary').innerHTML=`<div class="player-identity" style="--team:${color}">${portrait(unit)}<div><h1>${esc(unit.name)}</h1><p>${roleNames[unit.role]}${unit.role==='scoreur'?' · U = 2 points':''}</p><small>${state.ball.holderId===unit.id?'Porteur du ballon':unit.role==='pilier'?'Gardien de la zone défensive':TEAMS[unit.team].name}</small></div></div>`;
  $('#stats').innerHTML=Object.entries(unit.stats).map(([key,value])=>`<dl class="stat ${key==='VIT'&&unit.penalty?'penalized':''}" title="${statTitles[key]}${key==='VIT'?'':' · valeur de base, effets séparés'}"><dt>${key}</dt><dd>${key==='VIT'?Math.max(0,value-unit.penalty):value}</dd></dl>`).join('');
  renderEffects(unit);
  $('#phase-move').className=state.moved?'complete':'current';$('#phase-action').className=state.moved?'current':'';
  for(const button of $('#actions').children){
    const type=button.dataset.mode;
    if(type==='skills'){
      button.hidden=unit.role!=='sentry'||state.phase!=='play';button.disabled=!canPlay();
      button.classList.toggle('selected',mode==='skills'||!!skillFor(mode));
      button.setAttribute('aria-pressed',String(mode==='skills'||!!skillFor(mode)));continue;
    }
    const available=canPlay()&&(type==='move'?legalMoves(state).length>0:type==='shoot'?[2,3,4].some(y=>previewAction(state,{type,x:unit.team===0?12:0,y}).legal):state.units.some(u=>previewAction(state,{type,targetId:u.id}).legal));
    button.classList.toggle('selected',type===mode);button.setAttribute('aria-pressed',String(type===mode));button.disabled=!available;
    const label={move:'Déplacer',pass:'Passer',shoot:'Tirer',charge:'Charger'}[type];
    const reason=type==='move'&&state.moved?'déplacement effectué':['pass','shoot'].includes(type)&&state.ball.holderId!==unit.id?'ballon requis':'aucune cible accessible';
    button.title=available?label:label+' · '+reason;
  }
  $('#wait').disabled=!canPlay();$('#wait span').textContent=state.status==='finished'?'Match terminé':'Terminer l’activation';
  $('#recent-events').innerHTML=state.log.filter(e=>!['move','wait'].includes(e.type)).slice(-4).reverse().map(e=>`<li>${esc(eventLabel(e))}</li>`).join('')||'<li>Les équipes prennent position.</li>';
  $('#camera-toggle').disabled=busy||aiRunning;
  updateCameraControls();
  wheel.update({id:unit.id,color,enabled:canPlay(),reduced:court.reduced});
  $('#action-toggle').setAttribute('aria-label','Actions de '+unit.name);
  renderTargets();icons();
}
function setMode(next){
  if(!canPlay()||((next==='skills'||skillFor(next))&&(activeUnit(state)?.role!=='sentry'||state.phase!=='play')))return;
  mode=next;pending=null;wheel.view=next;wheel.open=true;render();highlight();
  if(next==='move')court.app.canvas.focus({preventScroll:true});else wheel.toggle.focus({preventScroll:true});
}
function openActions(){if(!canPlay())return;pending=null;mode='move';wheel.view='actions';wheel.open=true;render();highlight();wheel.toggle.focus({preventScroll:true});}
function backAction(){if(skillFor(wheel.view))setMode('skills');else openActions();}
function basePrompt(){
  if(state.status==='finished')return 'La rencontre est terminée.';
  if(!canInteract())return busy?'Action en cours…':state.mode==='solo'&&controllingTeam(state)===1?'L’adversaire prépare son action…':'Match en pause.';
  if(state.phase==='placement')return selectedUnit().name+' · choisis une case dans ton camp.';
  const u=activeUnit(state),skill=skillFor(mode);
  if(mode==='skills')return state.ball.holderId!==u.id?'Passe chargée : ballon requis':state.ball.charge?'Ballon déjà chargé':'Sentry · une compétence termine l’activation';
  if(skill)return skill.label+' · '+(skill.id==='charged-pass'?'portée '+Math.max(1,passRange(u)-1):effectLabels[skill.id]);
  return {move:'Déplacement · '+mobilityOf(u)+' cases',pass:'Passe · portée '+passRange(u),shoot:'Tir · portée '+shotRange(state,u),charge:'Charge · FOR '+u.stats.FOR}[mode];
}
function renderTargets(){
  const description=$('#target-description'),confirm=$('#confirm-action');
  hoverKey='';
  description.textContent=basePrompt();description.classList.remove('danger');confirm.hidden=true;
  const skills=canPlay()&&wheel.view==='skills',targeting=canPlay()&&!skills&&wheel.view!=='actions',candidates=targeting?actionTargets(state,mode):[];
  $('#action-wheel').dataset.skillTarget=String(targeting&&!!skillFor(mode));
  const choices=skills?skillOptions(state):[];
  $('#skill-options').innerHTML=choices.map(skill=>{
    const reason=!skill.available?(skill.id==='charged-pass'&&skill.reason==='effect-active'?'Ballon déjà chargé.':errors[skill.reason]||'Aucune cible accessible.'):'',label=skill.label+(reason?' · '+reason:'');
    return `<button class="wheel-action wheel-skill" data-skill="${esc(skill.id)}" title="${esc(label+' · '+skill.description)}" aria-label="${esc(label)}" ${skill.available?'':'disabled'}><i data-lucide="${esc(skill.icon)}" aria-hidden="true"></i><span class="action-label">${esc(label)}</span></button>`;
  }).join('');
  for(const button of $('#skill-options').children){
    button.onclick=()=>setMode(button.dataset.skill);
    const preview=()=>{const skill=choices.find(s=>s.id===button.dataset.skill);description.textContent=skill.label+' · '+(skill.available?effectLabels[skill.id]:errors[skill.reason]||'Aucune cible');description.classList.toggle('danger',!skill.available);};
    const restore=()=>{description.textContent=basePrompt();description.classList.remove('danger');};
    button.onfocus=preview;button.onblur=restore;button.onpointerenter=e=>{if(e.pointerType!=='touch')preview();};button.onpointerleave=restore;
  }
  $('#target-options').innerHTML=candidates.map(({label,command,preview:p,targetId,side},i)=>{
    const detail=p.blockerId?'Interception de '+getUnit(state,p.blockerId).name:p.legal?p.chance+' %':errors[p.reason]||p.reason;
    return `<button class="wheel-action wheel-target ${p.blockerId?'is-blocked':''}" data-target="${i}" ${side?'data-goal-y="'+command.y+'"':'data-target-id="'+esc(targetId)+'"'} ${p.legal?'':'disabled'} title="${esc(label+' · '+detail)}" aria-label="${esc(label)}" aria-pressed="${JSON.stringify(pending)===JSON.stringify(command)}">${side?goalIcon(side):headPortrait(getUnit(state,targetId))}<span class="action-label">${esc(label)}</span></button>`;
  }).join('');
  for(const button of $('#target-options').children){
    const command=candidates[Number(button.dataset.target)].command;
    button.onclick=()=>chooseTarget(command);
    const preview=()=>{if(!pending&&canPlay()){highlight(null,actionPreview(state,command));renderAnalysis(command);}};
    const restore=()=>{if(!pending){highlight();renderAnalysis();}};
    button.onpointerenter=e=>{if(e.pointerType!=='touch')preview();};button.onpointerleave=restore;button.onfocus=preview;button.onblur=restore;
  }
  confirm.hidden=!targeting||(mode==='move'&&!pending);confirm.disabled=!pending||!actionPreview(state,pending).legal;
  const confirmLabel=skillFor(mode)?'Confirmer : '+skillFor(mode).label:{move:'Confirmer le déplacement',pass:'Confirmer la passe',shoot:'Confirmer le tir',charge:'Confirmer la charge'}[mode]||'Confirmer';
  confirm.title=confirmLabel;confirm.setAttribute('aria-label',confirmLabel);
  if(pending&&canPlay()){
    const p=actionPreview(state,pending);
    description.textContent=p.blockerId?'Interception certaine : '+getUnit(state,p.blockerId).name+(pending.type==='charged-pass'?' · aucun bonus':''):!p.legal?errors[p.reason]||'Action impossible.':skillFor(pending.type)?skillFor(pending.type).label+' · '+effectLabels[pending.type]:pending.type==='move'?'Déplacement · '+p.distance+' / '+p.range+' cases':pending.type==='pass'?'Ligne libre · passe certaine':pending.type==='shoot'?'Tir assuré · '+p.points+' point'+(p.points>1?'s':''):p.chance+' % · −3 VIT'+(p.pushLegal?' et recul':'');
    description.classList.toggle('danger',!!p.blockerId||!p.legal);
    if(p.blockerId){confirm.title='Confirmer malgré l’interception';confirm.setAttribute('aria-label',confirm.title);}
  }
  description.title=description.textContent;
  renderAnalysis();icons();wheel.position();
}
function renderAnalysis(command=pending){
  const unit=selectedUnit(),holder=getUnit(state,state.ball.holderId);
  const shots=canPlay()&&holder?.id===unit.id?[2,3,4].map(y=>previewAction(state,{type:'shoot',x:unit.team===0?12:0,y})):[];
  const facts=[['Déplacement',state.moved?0:mobilityOf(unit),'cases'],['Portée passe',passRange(unit),'cases'],['Portée tir',shotRange(state,unit),'cases'],['Tirs ouverts',shots.length?shots.filter(p=>p.legal&&!p.blockerId).length+' / 3':'—','']];
  $('#analysis-facts').innerHTML=facts.map(([label,value,suffix])=>`<div><dt>${label}</dt><dd>${value} <small>${suffix}</small></dd></div>`).join('');
  const detail=$('#analysis-detail'),p=command&&canPlay()?actionPreview(state,command):null;
  detail.classList.toggle('danger',!!p&&(!p.legal||!!p.blockerId));
  if(p){
    const label=actionLabel(command.type),skill=skillFor(command.type),target=getUnit(state,command.targetId);
    const result=!p.legal?errors[p.reason]||'Action impossible':p.blockerId?'Interception · '+getUnit(state,p.blockerId).name+(skill?.id==='charged-pass'?' · aucun bonus de tir':''):skill?skill.description:command.type==='move'?'Trajet accessible':command.type==='charge'?p.chance+' % · FOR contre DEF '+defenseOf(target):'Trajectoire libre';
    detail.innerHTML=`<strong>${esc(label)} · ${p.distance??0} / ${p.range??0} cases</strong>${esc(result)}${skill&&p.legal?'<br>Termine l’activation.':''}`;
  }else detail.innerHTML=`<strong>Possession</strong>${esc(holder?.name||'Ballon au sol')}<br>${holder?esc(TEAMS[holder.team].name):''}${state.ball.charge?'<br>Ballon chargé · +1 case au prochain tir, points inchangés.':''}`;
  if(unitEffects(unit).length)detail.innerHTML+=`<div class="analysis-effects"><strong>Effets temporaires</strong>${esc(unitEffects(unit).map(effect=>effect.label+' · '+effectLabels[effect.id]).join(' ; '))}<br>DEF actuelle ${defenseOf(unit)} · base ${unit.stats.DEF}</div>`;
}
function highlight(cell=null,preview=null){court.highlight(canInteract()&&state.phase==='placement'?legalPlacements(state,selectedUnit().id):canPlay()&&mode==='move'?legalMoves(state):[],canPlay()?(preview||(pending?actionPreview(state,pending):null)):null,cell);}
function chooseTarget(command){if(!canPlay())return;pending=command;mode=command.type;wheel.view=mode;wheel.open=true;renderTargets();highlight();if(!$('#confirm-action').hidden&&!$('#confirm-action').disabled)$('#confirm-action').focus({preventScroll:true});}
function selectCell(cell,spriteId=null){
  if(state.phase==='placement'){
    if(!canInteract())return;
    const occupant=state.units.find(u=>u.x===cell.x&&u.y===cell.y);
    if(occupant?.team===state.placement.team)return selectUnit(occupant.id);
    if(legalPlacements(state,selectedUnit().id).some(c=>c.x===cell.x&&c.y===cell.y))return void execute({type:'place',unitId:placementId,...cell});
    if(spriteId&&getUnit(state,spriteId)?.team===state.placement.team)return selectUnit(spriteId);
    return void execute({type:'place',unitId:placementId,...cell});
  }
  if(!canPlay())return;
  // A tall sprite can overlap the empty tile behind it in the horizontal view.
  if(mode==='move'&&legalMoves(state).some(c=>c.x===cell.x&&c.y===cell.y))return chooseTarget({type:'move',...cell});
  if(spriteId)return selectUnit(spriteId);
  const occupant=state.units.find(u=>u.x===cell.x&&u.y===cell.y);
  if(occupant)return selectUnit(occupant.id);
  if(mode==='move')ribbon('Case inaccessible.');
  else if(mode==='shoot')chooseTarget({type:'shoot',...cell});
}
function selectUnit(id){
  const target=getUnit(state,id),actor=activeUnit(state);if(!target)return;
  if(state.phase==='placement'){
    if(canInteract()&&target.team===state.placement.team){placementId=id;render();highlight();}
    return;
  }
  if(canPlay()&&id===actor?.id){openActions();return;}
  if(canPlay()&&targetAction(mode))chooseTarget({type:mode,targetId:id});
  else if(id!==actor?.id)showUnit(target);
}
function hover(cell,id){
  if(state.phase==='placement'){if(canInteract())highlight(cell);return;}
  if(!canPlay()||pending)return;
  const key=mode+':'+cell?.x+','+cell?.y+':'+id;if(key===hoverKey)return;hoverKey=key;
  let preview=null;const unit=id?getUnit(state,id):cell?state.units.find(u=>u.x===cell.x&&u.y===cell.y):null;
  if(cell&&mode==='move')preview=actionPreview(state,{type:'move',...cell});
  else if(unit&&targetAction(mode))preview=actionPreview(state,{type:mode,targetId:unit.id});
  else if(cell&&mode==='shoot'&&(cell.x===0||cell.x===12))preview=previewAction(state,{type:'shoot',...cell});
  highlight(cell,preview);
}
async function execute(command,byAI=false){
  if((!byAI&&!canInteract())||busy)return false;
  const before=structuredClone(state),result=applyCommand(state,command);
  if(!result.ok){ribbon(errors[result.error]||'Action impossible.');return false;}
  busy=true;pending=null;save();render();
  try{tone(command.type);await court.animate(result.events,before,state);
    const goal=result.events.find(e=>e.type==='goal');if(goal)await celebrate(goal);
    const message=result.events.filter(e=>e.type!=='round').at(-1);if(message)ribbon(eventLabel(message));
  }catch(error){console.error(error);court.sync(state);ribbon('Action résolue.');}
  finally{busy=false;mode=state.moved?(state.ball.holderId===state.activeId?'pass':'charge'):'move';wheel.open=true;wheel.view='actions';render();highlight();}
  if(state.status==='finished')showResult();else if(!byAI)void runAI();
  return true;
}
async function runAI(){
  if(aiRunning||busy||$('#modal').open||document.hidden||state.mode!=='solo'||controllingTeam(state)!==1)return;
  aiRunning=true;const epoch=generation;render();highlight();
  try{
    while(epoch===generation&&state.status==='playing'&&state.mode==='solo'&&controllingTeam(state)===1){
      if($('#modal').open||document.hidden)break;
      await sleep(500);if(epoch!==generation||$('#modal').open||document.hidden)break;
      const commands=chooseTurn(state);
      for(const command of commands){if(epoch!==generation||$('#modal').open||document.hidden)break;await execute(command,true);}
    }
  }catch(error){console.error(error);ribbon('IA interrompue. Reprends depuis les options.');}
  finally{aiRunning=false;render();highlight();}
}
async function celebrate(goal){
  $('#goal-caption').textContent=TEAMS[goal.team].name;$('#goal-title').textContent='U !';$('#goal-detail').textContent=getUnit(state,goal.unitId).name+' · +'+goal.points+' point'+(goal.points>1?'s':'');$('#celebration').hidden=false;
  tone('goal');await sleep(court.reduced?250:1350);$('#celebration').hidden=true;
}
function tone(kind){
  if(!sound)return;
  try{audio ||= new AudioContext();if(audio.state==='suspended')void audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';const now=audio.currentTime,base={move:260,pass:420,shoot:620,charge:120,goal:740}[kind]||300;o.frequency.setValueAtTime(base,now);o.frequency.exponentialRampToValueAtTime(base*(kind==='charge'?.6:1.5),now+.15);g.gain.setValueAtTime(.035,now);g.gain.exponentialRampToValueAtTime(.001,now+.25);o.connect(g);g.connect(audio.destination);o.start();o.stop(now+.26);}catch{}
}
function modal(title,html,kind=''){court.stopIdle();$('#modal').className=kind;$('#dialog-title').textContent=title;$('#dialog-content').innerHTML=html;$('#modal').showModal();render();icons();}
function showUnit(unit){
  inspecting=unit.id;
  modal(unit.name,`<div class="player-identity" style="--team:${TEAMS[unit.team].color}">${portrait(unit)}<div><h3>${roleNames[unit.role]} · ${TEAMS[unit.team].name}</h3><p>${unit.acted?'A déjà joué cette manche.':'Activation à venir.'}${unit.id===state.activeId?' Joueur actif.':''}</p></div></div><div class="stats">${Object.entries(unit.stats).map(([s,v])=>`<dl class="stat" title="${statTitles[s]}"><dt>${s}</dt><dd>${v}</dd></dl>`).join('')}</div><p>${unit.role==='pilier'?'Reste dans les trois colonnes de sa zone défensive. Sa position coupe les trajectoires qui le traversent.':unit.role==='scoreur'?'Chaque U marqué par ce joueur rapporte deux points.':'Peut se déplacer, porter, passer, tirer, charger et intercepter.'}</p>${unit.penalty||unit.nextPenalty?'<p>Retard : '+(unit.penalty||unit.nextPenalty)+' VIT '+(unit.penalty?'cette manche.':'la prochaine manche.')+'</p>':''}`);
  $('#dialog-content .stats').insertAdjacentHTML('beforebegin','<p class="base-stats-caption">Statistiques de base</p>');
  if(visibleEffects(unit).length){
    $('#dialog-content .stats').insertAdjacentHTML('afterend',`<section class="unit-effects"><h3>Effets temporaires</h3><div class="effect-list">${effectMarkup(unit)}</div><p>MOB ${mobilityOf(unit)} · DEF contre charge ${defenseOf(unit)} · portée passe ${passRange(unit)} · portée tir ${shotRange(state,unit)}.</p>${visibleEffects(unit).map(effect=>`<p><strong>${esc(effect.label)}</strong> : ${esc(effectDescription(effect))}</p>`).join('')}</section>`);
  }
  if(unit.role==='sentry')$('#dialog-content').insertAdjacentHTML('beforeend','<p>Relais, Couverture, Brouillage ou Passe chargée : une compétence remplace l’action et termine l’activation.</p>');
  if(unit.athlete){
    const profile=getAthlete(unit.athlete.id);
    if(profile)$('#dialog-content .base-stats-caption').insertAdjacentHTML('beforebegin','<p>'+roleNames[unit.role]+'</p>'+renderMeasurements(profile));
  }
  icons();
}
function showHelp(){modal('Les règles d’Astraball',`
<p>Deux équipes de cinq joueurs. La première à <strong>6 points</strong> gagne. Après la <strong>12e manche</strong>, le meilleur score gagne ; une égalité reste un match nul.</p>
<h3>Placer son équipe</h3><p>Avant l’engagement et après chaque but non final, les deux équipes choisissent puis valident leur formation. Choisis un joueur et une case de ton camp ; la colonne centrale reste libre. L’équipe qui reçoit le ballon se place en premier. En solo, l’IA valide sa formation.</p>
<h3>La zone défensive</h3><p>Dans sa zone colorée, une équipe peut garder son <strong>Pilier et un seul coéquipier maximum</strong>. Un deuxième soutien ne peut ni entrer, ni traverser, ni y être repoussé. Les adversaires ne consomment pas cette place. Le Pilier reste dans ses trois colonnes défensives et ne coupe que les trajectoires qui le traversent.</p>
<h3>Une activation, deux temps</h3><p>Un déplacement orthogonal, de zéro à MOB cases, puis une passe, un tir, une charge, une compétence Sentry ou une attente. L’action termine l’activation, même sans déplacement. Les joueurs bloquent le passage ; traverser un ballon au sol le ramasse.</p>
<h3>Le rythme du match</h3><p>Chaque joueur agit une fois par manche, par VIT décroissante. En cas d’égalité, la priorité d’équipe alterne chaque manche.</p>
<h3>Passer et tirer</h3><p>Portée de base : passe = 3 + moitié de PAS ; tir = 2 + moitié de TIR, arrondies en dessous. La distance se compte par les côtés, pas en diagonale. À portée et sans adversaire traversé, passe et tir sont certains. Un adversaire sur la ligne, même au coin d’une case, intercepte automatiquement ; le premier reçoit le ballon.</p><p>Choisis l’une des trois cibles du U adverse. Un U vaut <strong>1 point, ou 2 pour le Scoreur</strong>. Après le but, le Meneur adverse reçoit le ballon ; les tours utilisés et les pénalités restent conservés au replacement. Une interception ne provoque pas de replacement.</p>
<h3>La charge</h3><p>Contre un adversaire adjacent : 65 + 5 × (FOR − DEF) %, entre 30 et 95 %. Un succès repousse la cible d’une case libre et lui retire 3 VIT, sans lui retirer son activation. Si elle a déjà joué, ce retard vaut pour la manche suivante. Un recul impossible n’annule pas le retard. Le porteur lâche le ballon ; sans recul, il le ramasse sur place.</p>
<h3>Les compétences Sentry</h3><p>Réservées au Sentry pendant le jeu, elles remplacent son action et terminent son activation, y compris après un déplacement.</p>
<p><strong>Relais</strong> : un autre allié gagne <strong>1 case de portée de passe</strong>. <strong>Couverture</strong> : un autre allié gagne <strong>2 DEF contre les charges</strong>. <strong>Brouillage</strong> : un adversaire perd <strong>1 MOB</strong>, avec un minimum de 1. Ces trois auras portent à <strong>2 cases et traversent les joueurs</strong>. Elles réussissent à 100 %. Un effet identique déjà actif, ou un Brouillage sans effet, est refusé.</p>
<p>Les effets restent jusqu’à la <strong>fin de la prochaine activation de la cible</strong>, pas seulement son déplacement. Ils survivent au changement de manche et au but. Les valeurs de base restent inchangées.</p>
<p><strong>Passe chargée</strong> : ballon requis, portée de passe réduite d’une case (minimum 1), mêmes interceptions qu’une passe normale. Si elle arrive, le ballon donne <strong>+1 case au prochain tir</strong>, sans changer les points. Aucun bonus si elle est interceptée. La charge reste sur les passes alliées, puis disparaît au premier tir ou à la perte du ballon, même si le porteur le ramasse aussitôt. Elle ne se cumule pas ; une passe normale reste possible avec un ballon chargé. Tous les effets prennent fin avec le match.</p>
<h3>Cinq postes</h3><p><strong>Meneur</strong> : passe. <strong>Scoreur</strong> : tir et double point. <strong>Middle</strong> : polyvalence. <strong>Sentry</strong> : soutien et compétences. <strong>Pilier</strong> : défense et impact. Chaque personnage a ses propres statistiques et un seul poste commun à ses versions. Le vestiaire filtre ce poste. Taille et masse sont descriptives, sans bonus ; une rencontre commencée conserve ses valeurs.</p>
<h3>Commandes</h3><p>Choisis une action autour du joueur. Pour une passe, une charge ou une compétence, sélectionne une tête puis confirme avec la coche. Pour tirer, choisis une cible du U. Cliquer une case prépare le déplacement sans l’exécuter. Retour ou Échap annule sans rien dépenser ; depuis une compétence, le premier retour retrouve les quatre compétences. Glisse le terrain pour le déplacer ; + et − règlent le zoom. Au clavier : flèches, puis Entrée. Sauvegarde locale, sans récompense ni effet sur le jeu de cartes Kalistar.</p>`);}
function updateCameraControls(){
  const arena=getArena(options.arena);
  for(const button of document.querySelectorAll('#camera-panel [data-view]')){
    button.setAttribute('aria-pressed',String(button.dataset.view===options.view));
    button.disabled=busy||aiRunning||!!(arena.views&&!arena.views.includes(button.dataset.view));
  }
  $('#height-label').textContent=arena.pixel?'Cadrage vertical':'Hauteur';
  $('#camera-height').value=options.height;$('#height-value').value=options.height+' %';
  $('#camera-height').disabled=options.view==='isometric'||busy||aiRunning;
}
function changeCamera(value){
  if(busy||aiRunning)return;
  const appearance=normalizeAppearance({...options,...value});
  if(value.height!==undefined)court.pan.y=0;
  if(!court.setAppearance(appearance))return;
  options={...options,...appearance};saveOptions();updateCameraControls();highlight();
}
function showSettings(initial=false){
  modal(initial?'Avant le coup d\u2019envoi':'Le vestiaire','','locker');
  renderLocker({host:$('#dialog-content'),roster,options:{...options,mode:state.mode},lineups:roster.fromUnits(state.units),initial,icons,
    onSubmit:async(draft,newMatch)=>{
      const next=newMatch?createMatch({seed:seed(),mode:draft.mode,teams:roster.teams(draft.lineups)}):null;
      await court.prepareAssets(draft,next?.units||[]);
      // Load first: a failed asset must not replace the current saved match.
      if(next){generation++;state=next;mode='move';pending=null;placementId=null;finishedShown=false;court.replaceUnits(state.units);court.sync(state);}
      options={...draft};sound=options.sound;court.reduced=!options.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
      court.setAppearance(options);saveOptions();updateCameraControls();updateVenue();
      if(next){save();court.resetView(true);ribbon('Nouvelle rencontre \u00b7 Chroma \u00e0 l\u2019engagement');}
      $('#modal').close();render();highlight();
    }});
}
function updateVenue(){
  const arena=getArena(options.arena);
  $('.venue span').textContent=arena.region.toUpperCase();$('.venue small').textContent=arena.name;
}

function showResult(){
  if(finishedShown)return;finishedShown=true;
  modal('Fin de la rencontre',`<h3 class="final-heading">${state.winner===null?'Égalité':TEAMS[state.winner].name+' remporte la rencontre'}</h3><div class="final-score">${state.score[0]} : ${state.score[1]}</div><p class="final-heading">${state.round} manche${state.round>1?'s':''} · ${state.log.filter(e=>e.type==='intercept').length} interceptions · ${state.log.filter(e=>e.type==='charge'&&e.success).length} charges réussies</p><div class="dialog-actions"><button id="result-review">Revoir le terrain</button><button id="result-new">Retour au vestiaire</button></div>`);
  $('#result-review').onclick=()=>$('#modal').close();$('#result-new').onclick=()=>{$('#modal').close();showSettings();};
}
function bind(){
  $('#actions').onclick=e=>{const button=e.target.closest('[data-mode]');if(button&&!button.disabled)setMode(button.dataset.mode);};
  $('#initiative').onclick=e=>{const button=e.target.closest('[data-unit]');if(button&&!button.disabled){if(state.phase==='placement')selectUnit(button.dataset.unit);else showUnit(getUnit(state,button.dataset.unit));}};
  $('#formation-ready').onclick=()=>void execute({type:'ready',team:state.placement?.team});
  $('#confirm-action').onclick=()=>{if(pending)void execute(pending);};$('#wait').onclick=()=>void execute({type:'wait'});
  $('#help').onclick=showHelp;$('#settings').onclick=()=>{if(!busy)showSettings();};
  $('#close-dialog').onclick=()=>$('#modal').close();
  $('#modal').addEventListener('close',()=>{inspecting=null;render();highlight();void runAI();});
  $('#journal').onclick=()=>modal('Fil de la rencontre',`<ol>${state.log.map(e=>`<li><small>M${e.round}</small> ${esc(eventLabel(e))}</li>`).join('')||'<li>La rencontre commence.</li>'}</ol>`);
  $('#camera-toggle').onclick=()=>{const panel=$('#camera-panel');panel.hidden=!panel.hidden;$('#camera-toggle').setAttribute('aria-expanded',String(!panel.hidden));};
  for(const button of $('#camera-panel').querySelectorAll('[data-view]'))button.onclick=()=>changeCamera({view:button.dataset.view});
  $('#camera-height').oninput=event=>changeCamera({height:Number(event.target.value)});
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('.camera-controls')){$('#camera-panel').hidden=true;$('#camera-toggle').setAttribute('aria-expanded','false');}});
  $('#zoom-in').onclick=()=>court.zoomBy(.2);$('#zoom-out').onclick=()=>court.zoomBy(-.2);$('#zoom-reset').onclick=()=>court.resetView();
  $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{ribbon('Le plein écran n’est pas disponible ici.');}};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();void runAI();}else{audio?.suspend();render();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').open){backAction();}});
}
try{
  await court.init(state.units);court.reduced=!options.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  bind();updateCameraControls();updateVenue();court.sync(state);render();highlight();$('#boot').hidden=true;
  ribbon(state.phase==='placement'?(state.placement.reason==='rules-update'?'Nouvelles règles · score et tours conservés, replace ton équipe.':'Placement · '+TEAMS[state.placement.team].name):state.log.length?'Rencontre reprise · manche '+state.round:'Chroma à l’engagement');
  save();if(needsKickoff)showSettings(true);else if(state.status==='finished')showResult();else void runAI();
  // Read-only snapshots for browser QA, without production state mutation.
  window.Astraball=Object.freeze({snapshot:()=>structuredClone(state),cell:(x,y)=>court.screenCell(x,y),metrics:()=>({
    renders:court.renderCount,busy,aiRunning,zoom:court.zoom,reducedMotion:court.reduced,input:court.inputMetrics(),effectCount:court.effects?.children.length??0,ballCharged:!!court.ballCharged,
    appearance:{...court.appearance},arenaLines:getArena(court.appearance.arena).lines,arenaTextures:court.loadedArenas.size,flagCount:court.flags.children.length,
    rosterCount:roster.entries.length,floorLabels:court.floorLabels.children.length,goals:structuredClone(court.goalAnchors),
    viewport:structuredClone({...court.viewport,spec:court.viewportSpec(),sceneScale:{x:court.scene.scale.x,y:court.scene.scale.y}}),
    ballTexture:!!court.ballImage.texture.source,ballRotation:court.ballImage.rotation,sprites:court.spriteMetrics(),movementPreview:structuredClone(court.movementPreview||[]),
  }),ready:true});
}catch(error){console.error(error);$('#boot').innerHTML='<div class="no-webgl"><h2>La cour ne peut pas s’ouvrir</h2><p>Vérifie ta connexion et l’accélération graphique du navigateur.</p><button id="reload">Réessayer</button></div>';$('#reload').onclick=()=>location.reload();}
