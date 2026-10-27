import { clamp, duration, sampleSequence, instrumentPose } from './model.mjs';
import { createWorld } from './physics.mjs';
import { createStory, advanceStory, enterStory, canMove, canPlay, beginPlay, finishPlay, narrative, storyFrame, hasDialogue, canContinue, continueStory, cinematicState, storyAnimating } from './story.mjs';
import { createMotion, advanceMotion, resetMotion, walkFrame, cameraLayout, approachZoom } from './motion.mjs';
import { createFilm } from './film.mjs';
import { playFluteNote } from './audio.mjs';
import { createNarrator, formatNarration } from './narration.mjs';
import { searchSiteLayout, stairLandingLayout } from './props.mjs';
import { connect, notify, embedded } from './host.mjs';
import { checkpoint, restore } from './checkpoint.mjs';

const $=id=>document.getElementById(id);
const canvas=$('world'), ctx=canvas.getContext('2d',{alpha:false});
const media=matchMedia('(prefers-reduced-motion: reduce)');
const keys=new Set(), pointers=new Map(), voices=new Set();
const motion=createMotion();
let config,world,assets,actor,camera,view,pose,story,film,narrator;
let ready=false,disposed=false,paused=false,background=document.hidden,reduced=media.matches;
let sound=true,clock=0,sequence=null,completed=0,frame=40,lastNote=-1,soundContext;
let timer=0,raf=0,lastTime=0,nextRender=0,loopActive=false;
let particles=[],particleBudget=0,particleId=0,revision=-1,scriptStart;
let shotZoom=1;
const finished=()=>['ending','exited'].includes(story?.phase);
const cinematicOnly=()=>story?.phase==='film'||finished();
const metrics={renders:0,physicsSteps:0,maxParticles:0,renderMs:[],maxWalkDelta:0};
const icon=(element,name)=>{element.innerHTML='<i data-lucide="'+name+'"></i>';globalThis.lucide?.createIcons({nodes:[element]});};
async function image(path) {const img=new Image();img.src=path;await img.decode();return img;}
const ease=t=>t*t*(3-2*t);

function direction() {
  let left=keys.has('ArrowLeft')||keys.has('a')||keys.has('q'),right=keys.has('ArrowRight')||keys.has('d');
  for(const d of pointers.values()){left||=d<0;right||=d>0;}
  return Number(right)-Number(left);
}
function clearInput() {
  keys.clear();pointers.clear();
  $('left').setAttribute('aria-pressed','false');$('right').setAttribute('aria-pressed','false');
}
function stopVoices(){for(const v of voices){try{v.stop();}catch{}}voices.clear();}
function unlockAudio(){
  if(!sound)return;
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(Audio){soundContext||=new Audio();soundContext.resume().catch(()=>{});}
}
function note(index){
  if(!sound||soundContext?.state!=='running')return;
  playFluteNote(soundContext,index,config.audio,voices);
}
function trigger(){
  if(!ready||paused||background||!beginPlay(story))return;
  unlockAudio();clearInput();lastNote=-1;particleBudget=0;particleId=0;
  if(story.phase==='playing')sequence=0;
  syncStory();wake();
}
function continueReading(){
  if(!ready||paused||background||!continueStory(story))return;
  unlockAudio();clearInput();syncStory();wake();
}
function primaryAction(){
  if(!ready||paused||background)return;
  if(hasDialogue(story))continueReading();else trigger();
}
function syncReading(){
  $('continue').disabled=!canContinue(story)||paused||background;
}
function cancelLoop(){clearTimeout(timer);cancelAnimationFrame(raf);timer=raf=0;}
function schedule(delay=0){
  if(!ready||disposed||paused||background||cinematicOnly()||timer||raf)return;
  if(delay)timer=setTimeout(()=>{timer=0;raf=requestAnimationFrame(tick);},delay);
  else raf=requestAnimationFrame(tick);
}
function wake(){
  if(!ready||disposed||paused||background||cinematicOnly())return;
  // Discard idle wall time when input wakes the simulation. Never cancel an active RAF.
  if(!loopActive){clearTimeout(timer);timer=0;lastTime=0;nextRender=0;loopActive=true;}
  schedule();
}
function setPaused(value){
  if(cinematicOnly())return;
  paused=value;clearInput();stopVoices();$('paused').hidden=!value;
  narrator?.suspend(value||background);
  $('pause').setAttribute('aria-pressed',String(value));$('pause').setAttribute('aria-label',value?'Reprendre':'Mettre en pause');icon($('pause'),value?'play':'pause');
  if(value)cancelLoop();else{lastTime=0;nextRender=0;wake();}
}
function suspend(value){
  background=value;clearInput();stopVoices();
  $('scene').classList.toggle('is-suspended',value);
  narrator?.suspend(value||paused||story?.phase==='film');
  if(value){cancelLoop();soundContext?.suspend().catch(()=>{});film?.suspend();}
  else{lastTime=0;nextRender=0;if(sound)soundContext?.resume().catch(()=>{});wake();}
}
function resize(){
  if(!ready)return;
  const layout=cameraLayout($('scene').clientWidth,$('scene').clientHeight,config.world,actor.x);
  view=layout.view;camera=layout.camera;
  canvas.width=view.width;canvas.height=view.height;ctx.imageSmoothingEnabled=false;
  render();wake();
}

function syncStory(){
  if(revision===story.revision)return;
  revision=story.revision;
  notify('checkpoint',checkpoint(story,actor));
  const {opening,captionCentered}=cinematicState(story);
  narrator.show(finished()?'':narrative(story),{cut:$('scene').classList.contains('is-blackout')!==captionCentered});narrator.suspend(paused||background||cinematicOnly());
  $('scene').dataset.phase=story.phase;
  $('scene').classList.toggle('is-opening',opening);
  $('scene').classList.toggle('is-blackout',captionCentered);
  $('scene').classList.toggle('is-finished',finished());
  for(const element of document.querySelectorAll('.scene-header,.scene-footer,#world'))element.inert=finished();
  $('scene').classList.toggle('is-reading',hasDialogue(story));
  $('continue').hidden=!hasDialogue(story);syncReading();
  $('left').disabled=$('right').disabled=!canMove(story);
  $('flute').hidden=!story.hasFlute;$('flute').disabled=!canPlay(story);
  const playing=story.phase==='playing'||story.phase==='finalPlaying';
  $('flute').classList.toggle('playing',playing);$('flute').setAttribute('aria-busy',String(playing));
  $('flute').classList.toggle('invitation',story.phase==='firstNote'||story.phase==='seated');
  if(!canMove(story)){clearInput();world.place(actor.x,actor.y,true);resetMotion(motion,actor);}
  else{world.place(actor.x,actor.y);resetMotion(motion,actor);}
  if(story.phase==='climbing'||story.phase==='seating')scriptStart={...actor};
  if(story.phase==='seating')actor.facing=-1;
  if(story.phase==='abandoned')actor.facing=story.beat<2?-1:1;
  if(story.phase==='seated'){actor.x=config.route.seatX;actor.y=config.world.groundY;actor.facing=-1;frame=212;}
  if(story.nightStarted)film.prepare();
  if(story.phase==='film'){frame=214;stopVoices();particles=[];cancelLoop();render();film.open();}
  $('ending').hidden=story.phase!=='ending';
  $('rest').hidden=story.phase!=='exited';
  if(finished()){
    cancelLoop();clearInput();stopVoices();sequence=null;particles=[];loopActive=false;
    render();$(story.phase==='ending'?'exit':'restart').focus({preventScroll:true});
  }
  frame=storyFrame(story,frame);
}
function exitScene(){
  if(story.phase!=='ending')return;
  if(embedded){notify('complete');return;}
  film.close();enterStory(story,'exited');syncStory();soundContext?.suspend().catch(()=>{});
}
function restart(){
  cancelLoop();stopVoices();clearInput();film.close();
  sequence=null;completed=0;particles=[];particleBudget=0;clock=0;shotZoom=1;frame=40;story=createStory();revision=-1;
  actor={x:config.world.startX,y:config.world.groundY,facing:1};resetMotion(motion,actor);motion.distance=0;
  world.place(actor.x,actor.y,true);lastTime=nextRender=0;paused=false;syncStory();resize();wake();
}
function scriptedPose(){
  const route=config.route;
  if(story.phase==='climbing'){
    const t=clamp(story.elapsed/2200,0,1);
    // Raise the leading foot, then cross the visible riser.
    actor.y=config.world.groundY-(config.world.groundY-route.stepY)*ease(clamp(t/.42,0,1));
    actor.x=scriptStart.x+(route.climbX-scriptStart.x)*ease(clamp((t-.25)/.75,0,1));
    actor.facing=1;frame=walkFrame(t*48);
  }else if(story.phase==='seating'){
    const t=ease(clamp(story.elapsed/1400,0,1));
    actor.x=scriptStart.x+(route.seatX-scriptStart.x)*t;
    actor.y=scriptStart.y+(config.world.groundY-scriptStart.y)*t;
  }
}

function drawActor(target,p,index,equipped=story.hasFlute){
  const sprite=assets.frames[index],instrument=instrumentPose(config,index,p);
  target.save();target.translate(Math.round(p.x),Math.round(p.y));target.scale(p.facing,1);
  target.drawImage(sprite,-64,-104);
  if(equipped){
    target.save();target.translate(instrument.anchor[0]-64,instrument.anchor[1]-104);target.rotate(instrument.socket.angle);
    target.drawImage(assets.flute,-instrument.pivot[0],-instrument.pivot[1]);target.restore();
    for(const [x,y,w,h] of instrument.socket.masks)target.drawImage(sprite,x,y,w,h,x-64,y-104,w,h);
  }
  target.restore();return instrument;
}
function sampleMagic(){
  if(sequence!==null)return sampleSequence(sequence,config.timing,reduced);
  if(story.phase==='finalPlaying')return {intensity:clamp((story.elapsed-400)/850,0,1)*clamp((2300-story.elapsed)/800,0,1),emitting:story.elapsed>500&&story.elapsed<1500};
  return null;
}
function drawMagic(sample){
  const intensity=sample?.intensity||0;
  if(intensity>0){
    const x=pose.emitter.x-camera.x,y=pose.emitter.y-camera.y;
    ctx.globalCompositeOperation='screen';ctx.globalAlpha=intensity*.5;ctx.drawImage(assets.glow,Math.round(x-20),Math.round(y-20));
    for(let n=0;n<(reduced?1:3);n++){
      ctx.fillStyle=[config.palette.cyan,config.palette.light,config.palette.blue][n];
      const reach=clamp((sequence??story.elapsed)/1600,0,1);
      for(let j=0;j<60*reach;j+=2){
        const phase=reduced?0:clock*.0016;
        const dx=actor.facing*(j*.65+Math.sin(j*.09-phase+n)*j*.22),dy=-j*.75+Math.sin(j*.13-phase+n)*(j/15);
        ctx.globalAlpha=intensity*(1-j/90)*(n===0?1:.6);ctx.fillRect(Math.round(x+dx),Math.round(y+dy),n===0?2:1,1);
      }
    }
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  }
  for(const p of particles){
    ctx.globalAlpha=(1-p.age/p.life)*.9;ctx.fillStyle=p.color;
    ctx.fillRect(Math.round(p.x-camera.x),Math.round(p.y-camera.y),p.size,p.size);
  }
  ctx.globalAlpha=1;
}
function render(){
  if(!view||!assets)return;
  ctx.setTransform(1,0,0,1,0,0);
  if(finished()){ctx.fillStyle='#000';ctx.fillRect(0,0,view.width,view.height);return;}
  const started=performance.now(),cx=Math.round(camera.x),cy=Math.round(camera.y),night=ease(story.night),cinema=cinematicState(story,reduced);
  // One camera transform for the whole world: body, flute, lights and ground stay attached.
  const focusX=clamp(actor.x-camera.x,0,view.width),focusY=clamp(actor.y-camera.y-38,0,view.height);
  ctx.save();ctx.translate(focusX,focusY);ctx.scale(shotZoom,shotZoom);ctx.translate(-focusX,-focusY);
  const dx=Math.round(-camera.x*(reduced?1:.96));
  ctx.fillStyle='#202c35';ctx.fillRect(0,0,view.width,view.height);
  if(night<1)ctx.drawImage(assets.day,dx,-cy);
  if(night){ctx.globalAlpha=night;ctx.drawImage(assets.night,dx,-cy);ctx.globalAlpha=1;}
  if(night<1)ctx.drawImage(assets.groundDay,-cx,532-cy);
  if(night){ctx.globalAlpha=night;ctx.drawImage(assets.groundNight,-cx,532-cy);ctx.globalAlpha=1;}
  ctx.drawImage(assets.stairs,config.route.stairsX-cx,config.world.groundY-assets.stairs.height-cy);
  const landing=stairLandingLayout(config);
  for(let offset=0;offset<landing.width;offset+=config.stairs.repeatWidth){
    const width=Math.min(config.stairs.repeatWidth,landing.width-offset);
    ctx.drawImage(assets.stairs,config.stairs.repeatX,0,width,landing.height,landing.x+offset-cx,landing.y-cy,width,landing.height);
  }
  // Search piles sit behind the walking lane, so their bases never contradict its collisions.
  for(const site of config.searchSites){
    const p=searchSiteLayout(config,site,assets.scrap);
    ctx.fillStyle='#14211b80';ctx.beginPath();ctx.ellipse(p.x+p.width/2-cx,p.y+p.height-1-cy,p.width*.45,3,0,0,Math.PI*2);ctx.fill();
    ctx.drawImage(assets.scrap,p.x-cx,p.y-cy);
    if(p.flute&&!story.hasFlute){
      ctx.drawImage(assets.flute,p.flute.x-cx,p.flute.y-cy);
      ctx.fillStyle='#fff8db';ctx.fillRect(p.flute.x+10-cx,p.flute.y-1-cy,2,2);
    }
  }
  // Darken scenery first; Momo and his local light remain legible in the night.
  if(night){
    ctx.fillStyle='rgba(4,12,26,'+(night*.3)+')';ctx.fillRect(0,0,view.width,view.height);
    ctx.globalAlpha=night*.7;ctx.globalCompositeOperation='screen';
    ctx.drawImage(assets.spot,Math.round(actor.x-camera.x-120),Math.round(actor.y-camera.y-145));
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  }
  const p={x:Math.round(actor.x-camera.x),y:Math.round(actor.y-camera.y),facing:actor.facing};
  if(cinema.reveal<1){ctx.fillStyle='#000';ctx.globalAlpha=1-cinema.reveal;ctx.fillRect(0,0,view.width,view.height);ctx.globalAlpha=1;}
  if(cinema.mood){ctx.fillStyle='rgba(4,12,26,'+cinema.mood+')';ctx.fillRect(0,0,view.width,view.height);}
  if(cinema.fluteFocus){
    ctx.fillStyle='rgba(2,8,20,'+cinema.fluteFocus*.52+')';ctx.fillRect(0,0,view.width,view.height);
    ctx.globalCompositeOperation='screen';ctx.globalAlpha=cinema.fluteFocus*.9;
    ctx.drawImage(assets.spot,p.x-120,p.y-150);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  }
  if(cinema.spot){ctx.globalAlpha=cinema.spot;ctx.globalCompositeOperation='screen';ctx.drawImage(assets.spot,p.x-120,p.y-145);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;}
  ctx.globalAlpha=cinema.actor;
  ctx.fillStyle='#12231d79';ctx.beginPath();ctx.ellipse(p.x,p.y-1,18,2.5,0,0,Math.PI*2);ctx.fill();
  drawActor(ctx,p,frame);
  ctx.globalAlpha=1;
  pose=instrumentPose(config,frame,{x:p.x+camera.x,y:p.y+camera.y,facing:actor.facing});
  drawMagic(sampleMagic());
  ctx.restore();
  metrics.renders++;metrics.renderMs.push(performance.now()-started);if(metrics.renderMs.length>240)metrics.renderMs.shift();
}
function updateParticles(ms,sample){
  for(const p of particles){p.age+=ms;p.x+=p.vx*ms;p.y-=p.vy*ms;}
  particles=particles.filter(p=>p.age<p.life);
  if(!sample?.emitting||reduced)return;
  particleBudget+=ms;
  const origin=instrumentPose(config,frame,actor).emitter;
  while(particleBudget>=85&&particles.length<28){
    particleBudget-=85;const id=particleId++;
    particles.push({x:origin.x,y:origin.y,age:0,life:650+id%4*90,vx:actor.facing*(.018+Math.sin(id*4.7)*.013),vy:.025+id%5*.004,size:id%4===0?2:1,color:[config.palette.cyan,config.palette.light,config.palette.gold][id%3]});
  }
  metrics.maxParticles=Math.max(metrics.maxParticles,particles.length);
}
function tick(now){
  raf=0;if(disposed||paused||background||cinematicOnly())return;
  const cadence=1000/60;
  if(now+.5<nextRender){schedule(Math.max(1,nextRender-now-1));return;}
  if(now-nextRender>cadence)nextRender=now;nextRender+=cadence;
  const ms=lastTime?Math.min(loopActive?50:100,now-lastTime):cadence;lastTime=now;clock+=ms;
  const movement=canMove(story)?direction():0;
  if(movement)actor.facing=Math.sign(movement);
  if(canMove(story)&&(movement||Math.abs(world.body.velocity.x)>.001||Math.abs(actor.y-config.world.groundY)>.1)){
    const oldX=actor.x;
    const p=advanceMotion(motion,world,movement,ms);
    actor.x=p.x;actor.y=p.y;metrics.physicsSteps+=p.steps;
    metrics.maxWalkDelta=Math.max(metrics.maxWalkDelta,Math.abs(actor.x-oldX));
  }
  frame=motion.moving&&movement?walkFrame(motion.distance):reduced?0:Math.floor(clock/260)%4;
  advanceStory(story,ms,actor.x,config.route);syncStory();syncReading();
  if(cinematicOnly())return;
  frame=storyFrame(story,frame);scriptedPose();
  if(sequence!==null){
    sequence+=ms;const sample=sampleSequence(sequence,config.timing,reduced);frame=sample.frame;
    $('flute').style.setProperty('--progress',String(Math.min(1,sequence/duration(config.timing))));
    if(sample.phase==='sustain'){
      const n=Math.min(6,Math.floor(sample.local/600));if(n!==lastNote){lastNote=n;note(n);}
    }
    if(sample.complete){sequence=null;particles=[];completed++;stopVoices();finishPlay(story);syncStory();}
  }
  if(story.phase==='finalPlaying'){
    $('flute').style.setProperty('--progress',String(story.elapsed/1500));
    if(story.elapsed>500&&lastNote<0){lastNote=0;note(0);}
  }
  const target=clamp(actor.x-view.width*.46,0,Math.max(0,config.world.width-view.width));
  camera.x=reduced?target:camera.x+(target-camera.x)*(1-Math.exp(-ms/160));
  const zoomTarget=reduced?1:config.cinematicCamera[story.phase]||1;
  shotZoom=approachZoom(shotZoom,zoomTarget,ms,config.cinematicCamera.settleMs,reduced);
  updateParticles(ms,sampleMagic());render();
  const timed=storyAnimating(story)||sequence!==null;
  loopActive=!!(movement||timed||particles.length||(story.nightStarted&&story.night<1)||Math.abs(camera.x-target)>.25||shotZoom!==zoomTarget);
  if(loopActive)schedule();else if(!reduced&&story.phase!=='introBlack')schedule(150);
}

for(const [id,dir] of [['left',-1],['right',1]]){
  const button=$(id);
  button.addEventListener('pointerdown',e=>{
    if(paused||!ready||!canMove(story))return;
    e.preventDefault();if(!direction()){lastTime=0;motion.accumulator=0;}button.setPointerCapture(e.pointerId);pointers.set(e.pointerId,dir);button.setAttribute('aria-pressed','true');wake();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>{pointers.delete(e.pointerId);button.setAttribute('aria-pressed','false');wake();});
}
document.addEventListener('keydown',e=>{
  if(!ready||story.phase==='film')return;
  if(finished()){if(e.key==='Escape')exitScene();return;}
  const key=e.key.length===1?e.key.toLowerCase():e.key;
  if(e.target.closest('button')&&(key===' '||key==='Enter')&&!['continue','flute'].includes(e.target.id))return;
  if(['ArrowLeft','ArrowRight','a','q','d',' ','e','Enter','Escape'].includes(key)){
    e.preventDefault();if(e.repeat)return;
    if(key==='Escape')setPaused(!paused);
    else if(key===' '||key==='e'||key==='Enter')primaryAction();
    else if(!paused&&canMove(story)){if(!direction()){lastTime=0;motion.accumulator=0;}keys.add(key);wake();}
  }
});
document.addEventListener('keyup',e=>{keys.delete(e.key.length===1?e.key.toLowerCase():e.key);wake();});
$('flute').addEventListener('click',trigger);
$('continue').addEventListener('click',continueReading);
$('narration').addEventListener('click',continueReading);
canvas.addEventListener('click',()=>{if(hasDialogue(story))continueReading();});
$('pause').addEventListener('click',()=>setPaused(!paused));$('resume').addEventListener('click',()=>setPaused(false));
$('restart').addEventListener('click',restart);
$('exit').addEventListener('click',exitScene);
$('sound').addEventListener('click',()=>{
  sound=!sound;if(sound)unlockAudio();else stopVoices();
  $('sound').setAttribute('aria-label',sound?'Couper le son':'Activer le son');$('sound').title=sound?'Couper le son':'Activer le son';$('sound').setAttribute('aria-pressed',String(!sound));icon($('sound'),sound?'volume-2':'volume-x');
});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('scene').requestFullscreen();}catch{$('fullscreen').hidden=true;}});
document.addEventListener('fullscreenchange',()=>{icon($('fullscreen'),document.fullscreenElement?'minimize':'maximize');resize();});
document.addEventListener('visibilitychange',()=>suspend(document.hidden));
window.addEventListener('blur',()=>suspend(true));window.addEventListener('focus',()=>suspend(document.hidden));
media.addEventListener('change',()=>{reduced=media.matches;if(reduced)shotZoom=1;particles=[];narrator?.reduce(reduced);resize();});
const observer=new ResizeObserver(resize);observer.observe($('scene'));
window.addEventListener('pagehide',()=>suspend(true));window.addEventListener('pageshow',()=>suspend(document.hidden));
window.addEventListener('unload',()=>{disposed=true;cancelLoop();clearInput();stopVoices();particles=[];observer.disconnect();narrator?.dispose();world?.dispose();soundContext?.close().catch(()=>{});},{once:true});

try{
  config=await fetch('scene.json').then(r=>{if(!r.ok)throw new Error('scene.json');return r.json();});
  const card=await fetch('card.json').then(r=>{if(!r.ok)throw new Error('ending card');return r.json();});
  $('ending-name').textContent=card.name;$('ending-title').textContent=card.title;
  $('ending-quote').textContent=formatNarration(card.description);await $('ending-card').decode();
  assets={frames:{}};
  for(const [key,file] of Object.entries({day:'scene/route-day.png',night:'scene/route-night.png',groundDay:'scene/ground-day.png',groundNight:'scene/ground-night.png',stairs:'scene/stairs.png',scrap:'scene/scrap-pile.png',flute:'equipment/flute-r3.png'}))assets[key]=await image('../../assets/gaming-book/momo/'+file);
  for(const n of new Set([...Object.keys(config.sockets),...config.extraFrames]))assets.frames[n]=await image('../../assets/gaming-book/momo/momo/'+(config.frameSources[n]||n+'.png'));
  function glow(size,stops){
    const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),radial=g.createRadialGradient(size/2,size/2,1,size/2,size/2,size/2);
    for(const [at,color] of stops)radial.addColorStop(at,color);g.fillStyle=radial;g.fillRect(0,0,size,size);return c;
  }
  assets.glow=glow(40,[[0,'#a6fffad0'],[.25,'#69d9ed55'],[1,'#69d9ed00']]);
  assets.spot=glow(240,[[0,'#c5e6f161'],[.35,'#b6dbed35'],[1,'#82b4d000']]);
  world=createWorld(globalThis.Matter,config);actor={x:config.world.startX,y:config.world.groundY,facing:1};
  const saved=restore(await connect(),config);story=saved.story;actor=saved.actor;
  world.place(actor.x,actor.y,true);resetMotion(motion,actor);camera={x:0,y:0};
  narrator=createNarrator($('narration'),{reduced});
  film=createFilm({sound:()=>sound,finish:()=>{enterStory(story,'ending');syncStory();lastTime=0;wake();},returnToScene:()=>{enterStory(story,'seated');syncStory();lastTime=0;wake();}});
  ready=true;syncStory();resize();globalThis.lucide?.createIcons();
  if(!document.fullscreenEnabled)$('fullscreen').hidden=true;
  $('loading').classList.add('leaving');setTimeout(()=>{$('loading').hidden=true;},reduced?0:650);
  globalThis.KalistarMomoScene=Object.freeze({
    snapshot:()=>({ready,actor:{...actor},camera:{...camera,shotZoom},view:{...view},frame,sequence,phase:sequence===null?story.phase:sampleSequence(sequence,config.timing,reduced).phase,story:{...story,history:[...story.history]},canMove:canMove(story),canPlay:canPlay(story),canContinue:canContinue(story),cinema:cinematicState(story,reduced),emitter:pose?.emitter,particles:particles.length,paused,background,completed,reduced,scheduled:!!(timer||raf),voices:voices.size,film:film.snapshot(),narration:narrator.snapshot(),searchSites:config.searchSites.map(s=>searchSiteLayout(config,s,assets.scrap)),metrics:{...metrics,renderMs:[...metrics.renderMs]}}),
    renderPose:(target,index,facing=1)=>drawActor(target,{x:64,y:104,facing},index,true),
  });
  wake();
}catch(error){$('loading').hidden=true;$('error').hidden=false;$('error').textContent='La scène n’a pas pu se charger. Retourne à Story pour réessayer.';notify('error');console.error(error);cancelLoop();}
