import { createMatch, activeUnit, getUnit, getInitiative, legalMoves, legalPlacements, controllingTeam, previewAction, applyCommand, restoreMatch } from './core/game.mjs';
import { inDefense } from './core/geometry.mjs';
import { chooseTurn } from './core/ai.mjs';
import { CourtRenderer } from './renderer.mjs';
import { TEAMS } from '../data/teams.mjs';
import { getArena, normalizeAppearance } from './appearance.mjs';
import { createRoster } from './roster.mjs';
import { renderLocker, spriteBadge } from './locker.mjs';
import { getAthlete } from '../data/athletes.mjs';
import { renderMeasurements } from './athlete-view.mjs';

if(window.KalistarCloudConfig)window.KalistarCloudConfig=Object.freeze({...window.KalistarCloudConfig,sdk:'/jeu/assets/supabase/supabase-2.118.0.js'});
if(!await window.KalistarAuthGuard?.ensure())throw Error('Connexion Kalistar requise.');

const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roleNames={meneur:'Meneur',scoreur:'Scoreur',middle:'Middle',sentry:'Sentry',pilier:'Pilier'};
const shortRoles={meneur:'MN',scoreur:'SC',middle:'MD',sentry:'ST',pilier:'PI'};
const statTitles={VIT:'Vitesse : ordre d’initiative',MOB:'Mobilité : cases de déplacement',FOR:'Force : chance de charge',PAS:'Passe : portée',TIR:'Tir : portée',DEF:'Défense : résistance aux charges'};
const errors={'ball-required':'Ce joueur ne porte pas le ballon.','out-of-range':'Cible hors de portée.','not-adjacent':'La charge demande une case voisine.','unreachable':'Cette case est inaccessible.','already-moved':'Déplacement déjà effectué.','teammate-required':'Choisis un partenaire.','enemy-required':'Choisis un adversaire.','opponent-goal-required':'Choisis une des trois cibles adverses.'};
Object.assign(errors,{'placement-required':'Valide les formations avant de jouer.','placement-team':'Choisis un joueur de ton équipe.','own-half-required':'Reste dans ta moitié de terrain ; la colonne centrale reste libre.','defense-capacity':'Zone défensive : le Pilier et un seul coéquipier maximum.','occupied':'Cette case est déjà occupée.'});
const profile=window.KALISTAR_CLOUD_ACCESS?.localProfile;
const KEY='kalistar.astraball.match.v1'+(profile?'.'+profile:''), OPTIONS='kalistar.astraball.options.v1';
let libraryData;
try{
  const response=await fetch(new URL('../data/sprite-library.json',import.meta.url));
  if(response.ok)libraryData=await response.json();
}catch{}
const roster=createRoster(libraryData);
const portrait=u=>{
  const c=roster.forUnit(u);
  return c?.portrait?'<img src="'+c.portrait+'" alt="">':spriteBadge(c);
};
const seed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let state,mode='move',pending=null,busy=false,aiRunning=false,generation=0,inspecting=null,sound=false,audio=null,finishedShown=false,placementId=null;
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
const court=new CourtRenderer($('#canvas-host'),{onCell:selectCell,onUnit:selectUnit,onHover:hover,appearance:options,roster});

function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('#save-status').textContent='Match sauvegardé sur cet appareil';}catch{$('#save-status').textContent='Sauvegarde indisponible';}}
function saveOptions(){try{localStorage.setItem(OPTIONS,JSON.stringify(options));}catch{}}
function ribbon(value){$('#event-ribbon').textContent=value;}
function eventLabel(e){
  const who=getUnit(state,e.unitId)?.name||'',target=getUnit(state,e.targetId)?.name||'';
  switch(e.type){
    case 'move':return who+' se replace'+(e.pickup?' et récupère le ballon.':'.');
    case 'pass':return e.success?who+' passe à '+target+'.':who+' tente une passe coupée.';
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
  $('#initiative').innerHTML=getInitiative(state).map(entry=>{const u=getUnit(state,entry.id);return `<button class="initiative-token ${entry.active?'active':''} ${entry.acted?'acted':''}" data-unit="${esc(u.id)}" style="--team:${TEAMS[u.team].color}" title="${esc(u.name)} · ${roleNames[u.role]} · VIT ${entry.speed}${entry.acted?' · A joué':''}" aria-label="${esc(u.name)} ${roleNames[u.role]}, vitesse ${entry.speed}${entry.active?', joueur actif':''}">${portrait(u)}<span><b>${esc(u.name)}</b><small>${roleNames[u.role]}</small><span class="mini-role">${shortRoles[u.role]}</span></span><span class="speed">${entry.speed}</span></button>`;}).join('');
  if(placing)for(const token of $('#initiative').children){const u=getUnit(state,token.dataset.unit);token.classList.remove('acted');token.classList.toggle('active',u.id===placementId);token.disabled=!canInteract()||u.team!==unit.team;token.setAttribute('aria-pressed',String(u.id===placementId));}
  $('#player-summary').innerHTML=`<div class="player-identity" style="--team:${color}">${portrait(unit)}<div><h1>${esc(unit.name)}</h1><p>${roleNames[unit.role]}${unit.role==='scoreur'?' · U = 2 points':''}</p><small>${state.ball.holderId===unit.id?'Porteur du ballon':unit.role==='pilier'?'Gardien de la zone défensive':TEAMS[unit.team].name}</small></div></div>`;
  $('#stats').innerHTML=Object.entries(unit.stats).map(([key,value])=>`<dl class="stat ${key==='VIT'&&unit.penalty?'penalized':''}" title="${statTitles[key]}"><dt>${key}</dt><dd>${key==='VIT'?Math.max(0,value-unit.penalty):value}</dd></dl>`).join('');
  $('#phase-move').className=state.moved?'complete':'current';$('#phase-action').className=state.moved?'current':'';
  for(const button of $('#actions').children){const type=button.dataset.mode;button.classList.toggle('selected',type===mode);button.setAttribute('aria-pressed',String(type===mode));button.disabled=!canPlay()||(type==='move'&&state.moved)||(['pass','shoot'].includes(type)&&state.ball.holderId!==unit.id);}
  $('#wait').disabled=!canPlay();$('#wait span').textContent=state.status==='finished'?'Match terminé':'Terminer l’activation';
  $('#recent-events').innerHTML=state.log.filter(e=>!['move','wait'].includes(e.type)).slice(-4).reverse().map(e=>`<li>${esc(eventLabel(e))}</li>`).join('')||'<li>Les équipes prennent position.</li>';
  $('#camera-toggle').disabled=busy||aiRunning;
  updateCameraControls();
  renderTargets();icons();
}
function setMode(next){if(!canPlay())return;mode=next;pending=null;render();highlight();}
function basePrompt(){if(state.status==='finished')return 'La rencontre est terminée.';if(!canInteract())return busy?'Action en cours…':state.mode==='solo'&&controllingTeam(state)===1?'L’adversaire prépare son action…':'Match en pause.';if(state.phase==='placement')return selectedUnit().name+' · choisis une case dans ton camp.';return {move:'Choisis une case accessible.',pass:'Choisis un partenaire.',shoot:'Choisis une zone du but adverse.',charge:'Choisis un adversaire adjacent.'}[mode];}
function renderTargets(){
  const unit=activeUnit(state),description=$('#target-description'),confirm=$('#confirm-action');
  description.textContent=basePrompt();description.classList.remove('danger');confirm.hidden=true;
  const candidates=[];
  if(canPlay()&&unit){
    if(mode==='pass')for(const u of state.units.filter(u=>u.team===unit.team&&u.id!==unit.id))candidates.push({label:u.name,command:{type:'pass',targetId:u.id}});
    if(mode==='charge')for(const u of state.units.filter(u=>u.team!==unit.team&&Math.abs(u.x-unit.x)+Math.abs(u.y-unit.y)===1))candidates.push({label:u.name,command:{type:'charge',targetId:u.id}});
    if(mode==='shoot')for(const y of [2,3,4])candidates.push({label:'U '+(y-1),command:{type:'shoot',x:unit.team===0?12:0,y}});
  }
  $('#target-options').innerHTML=candidates.map(({label,command},i)=>{const p=previewAction(state,command);return `<button data-target="${i}" ${p.legal?'':'disabled'} title="${p.blockerId?'Interception de '+esc(getUnit(state,p.blockerId).name):p.legal?p.chance+' %':errors[p.reason]||p.reason}" aria-pressed="${JSON.stringify(pending)===JSON.stringify(command)}">${esc(label)}${p.blockerId?' ×':''}</button>`;}).join('');
  for(const button of $('#target-options').children)button.onclick=()=>chooseTarget(candidates[Number(button.dataset.target)].command);
  if(pending&&canPlay()){
    const p=previewAction(state,pending);
    description.textContent=p.blockerId?'Interception certaine : '+getUnit(state,p.blockerId).name:p.legal?pending.type==='pass'?'Ligne libre · passe certaine':pending.type==='shoot'?'Tir assuré · '+p.points+' point'+(p.points>1?'s':''):p.chance+' % · −3 VIT'+(p.pushLegal?' et recul':''):errors[p.reason]||'Action impossible.';
    description.classList.toggle('danger',!!p.blockerId||!p.legal);
    confirm.hidden=!p.legal;confirm.textContent=p.blockerId?'Tenter malgré le blocage':{pass:'Faire la passe',shoot:'Tirer !',charge:'Charger !'}[pending.type];
  }
}
function highlight(cell=null,preview=null){court.highlight(canInteract()&&state.phase==='placement'?legalPlacements(state,selectedUnit().id):canPlay()&&mode==='move'?legalMoves(state):[],preview||(pending?previewAction(state,pending):null),cell);}
function chooseTarget(command){if(!canPlay())return;pending=command;renderTargets();highlight();}
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
  if(mode==='move'&&legalMoves(state).some(c=>c.x===cell.x&&c.y===cell.y))return void execute({type:'move',...cell});
  if(spriteId)return selectUnit(spriteId);
  const occupant=state.units.find(u=>u.x===cell.x&&u.y===cell.y);
  if(occupant)return selectUnit(occupant.id);
  if(mode==='move'){if(legalMoves(state).some(c=>c.x===cell.x&&c.y===cell.y))void execute({type:'move',...cell});else ribbon('Case inaccessible.');}
  else if(mode==='shoot')chooseTarget({type:'shoot',...cell});
}
function selectUnit(id){
  const target=getUnit(state,id),actor=activeUnit(state);if(!target)return;
  if(state.phase==='placement'){
    if(canInteract()&&target.team===state.placement.team){placementId=id;render();highlight();}
    return;
  }
  if(canPlay()&&mode==='pass')chooseTarget({type:'pass',targetId:id});
  else if(canPlay()&&mode==='charge')chooseTarget({type:'charge',targetId:id});
  else if(id!==actor?.id)showUnit(target);
}
function hover(cell,id){
  if(state.phase==='placement'){if(canInteract())highlight(cell);return;}
  if(!canPlay()||pending)return;
  let preview=null;const unit=id?getUnit(state,id):cell?state.units.find(u=>u.x===cell.x&&u.y===cell.y):null;
  if(unit&&['pass','charge'].includes(mode))preview=previewAction(state,{type:mode,targetId:unit.id});
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
  finally{busy=false;mode=state.moved?(state.ball.holderId===state.activeId?'pass':'charge'):'move';render();highlight();}
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
  if(unit.athlete){
    const profile=getAthlete(unit.athlete.id);
    if(profile)$('#dialog-content .stats').insertAdjacentHTML('beforebegin','<p>'+roleNames[unit.athlete.primary]+' principal \u00b7 '+roleNames[unit.athlete.secondary]+' secondaire</p>'+renderMeasurements(profile));
    icons();
  }
}
function showHelp(){modal('Les règles d’Astraball',`<p>Deux équipes de cinq joueurs. La première à <strong>6 points</strong> gagne. Au terme de la <strong>12e manche</strong>, le meilleur score gagne ; une égalité reste un match nul.</p><h3>Placer son équipe</h3><p>Avant le premier engagement et après chaque but, chaque équipe choisit sa formation puis la valide. Sélectionne un personnage sur le terrain ou dans la rangée du haut, puis une case éclairée de ton camp. La colonne centrale reste libre pendant le placement. L’équipe qui reçoit le ballon se place en premier ; en solo, l’IA valide automatiquement sa formation.</p><h3>La zone défensive</h3><p>Dans sa zone colorée, une équipe peut garder son <strong>Pilier et un seul coéquipier maximum</strong>. Cette limite vaut aussi pendant le match : un deuxième soutien ne peut pas entrer, traverser la zone ou y être repoussé. Les attaquants adverses ne consomment pas cette place.</p><h3>Une activation, deux temps</h3><p>Déplace ton joueur une seule fois, de zéro à MOB cases par les côtés, puis passe, tire, charge ou termine son activation. Une action termine le tour. Les autres joueurs bloquent le déplacement. Un ballon au sol est récupéré en le traversant.</p><h3>Le rythme du match</h3><p>Chaque joueur agit une fois par manche, par VIT décroissante. Deux coéquipiers peuvent donc jouer à la suite. En cas d’égalité de vitesse, la priorité d’équipe alterne chaque manche.</p><h3>Passer ou intercepter</h3><p>Une passe à portée, sans adversaire sur sa ligne, réussit. Tout adversaire sur une case traversée, même au coin d’une case, l’intercepte automatiquement. La ligne rouge indique le premier intercepteur. PAS augmente la portée : 3 + la moitié de PAS, arrondie en dessous.</p><h3>Trois cibles, un U</h3><p>Choisis l’une des trois cibles adverses. Tout adversaire traversé bloque le tir. Le Pilier ne couvre que les trajectoires qui le croisent. À portée et sans adversaire sur la trajectoire, le tir est assuré : aucun jet de chance. TIR détermine la portée : 2 + la moitié de TIR, arrondie en dessous. La distance se compte par les côtés des cases, pas en diagonale.</p><p>Un U vaut <strong>1 point</strong>, ou <strong>2 avec le Scoreur</strong>. Après un U, les équipes se replacent dans leur camp et le Meneur de l’équipe qui a encaissé reçoit le ballon. Le jeu reprend après les deux validations, avec les tours déjà utilisés et les pénalités conservés. Aucun nouveau placement n’est demandé si le match est terminé. Un tir intercepté donne le ballon au premier adversaire sur sa ligne, sans replacement.</p><h3>La charge change le tempo</h3><p>Charge un adversaire adjacent : 65 + 5 × (FOR − DEF) %, entre 30 et 95 %. Si elle réussit, la cible recule d’une case libre et perd 3 VIT, sans perdre son activation. Si elle a déjà joué, le retard s’applique à la manche suivante. Le porteur lâche le ballon ; si son recul est bloqué, il reste sur place et le récupère.</p><h3>Cinq postes, toutes les actions</h3><p><strong>Meneur</strong> : passe. <strong>Scoreur</strong> : tir et double point. <strong>Middle</strong> : polyvalence. <strong>Sentry</strong> : vitesse et mobilité. <strong>Pilier</strong> : défense et impact ; il reste dans ses trois colonnes défensives. Chaque personnage a ses propres statistiques et deux postes autorisés : un principal et un secondaire. Ses valeurs restent identiques sur ces deux postes, sans malus caché. La taille et la masse sont descriptives : elles ne donnent aucun bonus. Une rencontre déjà commencée conserve ses valeurs jusqu’à sa fin.</p><h3>Commandes</h3><p>Clique une case pour te déplacer. Pour une passe, un tir ou une charge, choisis l’action puis la cible et confirme. Fais glisser le terrain pour le déplacer ; + et − règlent le zoom. Au clavier : flèches sur le terrain, puis Entrée. Le match se sauvegarde sur cet appareil ; il n’attribue pas de carte et n’affecte pas le jeu Kalistar.</p>`);}
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
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();void runAI();}else audio?.suspend();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').open){pending=null;renderTargets();highlight();}});
}
try{
  await court.init(state.units);court.reduced=!options.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  bind();updateCameraControls();updateVenue();court.sync(state);render();highlight();$('#boot').hidden=true;
  ribbon(state.phase==='placement'?(state.placement.reason==='rules-update'?'Nouvelles règles · score et tours conservés, replace ton équipe.':'Placement · '+TEAMS[state.placement.team].name):state.log.length?'Rencontre reprise · manche '+state.round:'Chroma à l’engagement');
  save();if(needsKickoff)showSettings(true);else if(state.status==='finished')showResult();else void runAI();
  // Read-only snapshots for browser QA, without production state mutation.
  window.Astraball=Object.freeze({snapshot:()=>structuredClone(state),cell:(x,y)=>court.screenCell(x,y),metrics:()=>({
    renders:court.renderCount,busy,aiRunning,zoom:court.zoom,reducedMotion:court.reduced,input:court.inputMetrics(),
    appearance:{...court.appearance},arenaLines:getArena(court.appearance.arena).lines,arenaTextures:court.loadedArenas.size,flagCount:court.flags.children.length,
    rosterCount:roster.entries.length,floorLabels:court.floorLabels.children.length,goals:structuredClone(court.goalAnchors),
    viewport:structuredClone({...court.viewport,spec:court.viewportSpec(),sceneScale:{x:court.scene.scale.x,y:court.scene.scale.y}}),
    ballTexture:!!court.ballImage.texture.source,ballRotation:court.ballImage.rotation,sprites:court.spriteMetrics(),
  }),ready:true});
}catch(error){console.error(error);$('#boot').innerHTML='<div class="no-webgl"><h2>La cour ne peut pas s’ouvrir</h2><p>Vérifie ta connexion et l’accélération graphique du navigateur.</p><button id="reload">Réessayer</button></div>';$('#reload').onclick=()=>location.reload();}
