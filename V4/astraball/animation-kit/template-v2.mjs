// Shared authoring contract. No per-character or per-frame rendering scale.
export const TEMPLATE = Object.freeze({
  id:'kalistar-actor-v2', schemaVersion:2, cell:320, columns:4, rows:4,
  pageSize:1280, origin:Object.freeze({x:160,y:272}), pixelsPerMetre:64,
  minHeightCm:100, maxHeightCm:300, margin:4,
});
const definitions = [
  ['idle','Repos',0,4,160,true], ['run','Course',4,6,80,true], ['jump','Saut',10,6,100,false],
  ['win','Victoire',16,4,140,true], ['push','Pousser',20,4,100,false],
  ['crouch','Se baisser',24,4,120,false], ['block','Blocage physique',28,4,100,false],
  ['hit','Impact',32,4,90,false], ['fall','Chute',36,4,120,false],
  ['rise','Se relever',40,4,120,false], ['throw','Lancer',44,4,110,false],
  ['physical','Attaque physique',48,6,90,false], ['magic','Incantation',54,6,120,false],
  ['death','Mort',60,4,180,false],
];
export const CLIPS = Object.freeze(Object.fromEntries(definitions.map(([id,label,start,count,durationMs,loop])=>[
  id,Object.freeze({id,label,loop,frames:Object.freeze(Array.from({length:count},(_,i)=>Object.freeze({index:start+i,durationMs})))})
])));
export const SOCKETS = Object.freeze(['mainHand','offHand','head','chest']);
export const REVIEWS = Object.freeze(['art','pixelGrid','anatomy','sockets','motion','anchors']);
export const FAMILIES = Object.freeze({
  unarmed:'Poing ferme, bras libres ; aucun objet.',
  thrust:'Main principale fermee en prise fine ; estoc puis retrait.',
  slash:'Coupe avec une main, coude et poignet alignes.',
  katana:'Prise a deux mains sur un meme axe ; coupe diagonale et retour en garde.',
  heavy:'Prise a deux mains ; preparation haute, frappe lourde et recuperation.',
  polearm:'Deux mains espacees sur un axe rigide commun ; estoc et retrait.',
  flexible:'Preparation du bras, fouette du poignet, suivi ; chaine ou laniere separee.',
  bow:'Main principale tient la poignee ; autre main arme puis relache la corde.',
  firearm:'Prise et visee stables ; recul corporel modere, sans projectile.',
  projectile:'Prise de precision, arme le bras puis relache la main.',
  staff:'Maintenir une hampe verticale, incliner puis conduire le geste.',
  book:'Main secondaire ouverte sous le livre, principale au-dessus pour incanter.',
  orb:'Paumes ouvertes autour du volume vide, puis projection des mains.',
  instrument:'Position de jeu definie par l\u2019instrument exact, jamais devinee.',
});
const families = {
  Poing:'unarmed',Dague:'thrust','Epée courte':'thrust','Epée longue':'slash',Katana:'katana',
  Hache:'heavy',Marteau:'heavy',Masse:'heavy',Lance:'polearm',Faucille:'polearm',
  Fléau:'flexible',Fouet:'flexible',Arc:'bow',Gun:'firearm',Projectile:'projectile',
  Sceptre:'staff','Bâton':'staff',Tome:'book',Orbe:'orb',Instrument:'instrument',
};
export function familyFor(weapon){return families[weapon]||null;}
export function bodyHeight(heightCm){
  if(!Number.isFinite(heightCm)||heightCm<=0)throw Error('A positive authored height is required');
  return Math.round(Math.min(TEMPLATE.maxHeightCm,Math.max(TEMPLATE.minHeightCm,heightCm))*TEMPLATE.pixelsPerMetre/100);
}
export function frameRect(index){
  if(!Number.isInteger(index)||index<0||index>=64)throw Error('Invalid frame');
  const local=index%16;
  return {page:Math.floor(index/16),x:(local%4)*320,y:Math.floor(local/4)*320,width:320,height:320};
}
export function frameAt(clip,elapsed=0){
  if(!clip?.frames?.length)throw Error('Missing clip');
  const total=clip.frames.reduce((n,f)=>n+f.durationMs,0);
  let time=Math.max(0,Number.isFinite(elapsed)?elapsed:0);
  time=clip.loop?time%total:Math.min(time,total-1);
  for(const frame of clip.frames){if(time<frame.durationMs)return frame.index;time-=frame.durationMs;}
  return clip.frames.at(-1).index;
}
export function socketTransform(socket,facing=1){
  if(!socket||![1,-1].includes(facing))throw Error('Invalid socket transform');
  const angle=socket.angleDeg*Math.PI/180;
  // Mirror the whole local attachment, not the two anatomical hand identities.
  return {x:(socket.x-TEMPLATE.origin.x)*facing,y:socket.y-TEMPLATE.origin.y,
    a:facing*Math.cos(angle),b:Math.sin(angle),c:-facing*Math.sin(angle),d:Math.cos(angle),layer:socket.layer};
}
export function createDraft({characterId,modelId,name,heightCm,weapon}){
  if(!familyFor(weapon))throw Error('Weapon family needs explicit authoring: '+weapon);
  return {schemaVersion:2,templateId:TEMPLATE.id,id:`actor.${characterId}.${modelId}.v2`,
    characterId,modelId:String(modelId),name,status:'draft',heightCm,bodyPixels:bodyHeight(heightCm),
    weapon,physicalFamily:familyFor(weapon),magicFamily:['staff','book','orb','instrument'].includes(familyFor(weapon))?familyFor(weapon):'orb',
    camera:'three-quarter-right',handedness:'right',pages:[],clips:structuredClone(CLIPS),
    landmarks:{crown:null,sole:null},reviews:Object.fromEntries(REVIEWS.map(name=>[name,false])),
    frames:Array.from({length:64},(_,index)=>({index,grounded:![12,13,14].includes(index),sockets:Object.fromEntries(SOCKETS.map(name=>[name,null])),events:[]}))};
}
export function validateActor(actor,{ready=false}={}){
  const errors=[],check=(ok,message)=>{if(!ok)errors.push(message);};
  check(actor?.schemaVersion===2&&actor?.templateId===TEMPLATE.id,'Unsupported template');
  if(!actor||typeof actor!=='object')return errors;
  check(/^[a-z0-9.-]+$/.test(actor.id||''),'Invalid appearance id');
  check(/^[a-z0-9-]+$/.test(actor.characterId||'')&&/^[34]\d{7}$/.test(actor.modelId||''),'Invalid character/model identity');
  check(typeof actor.name==='string'&&actor.name.trim().length>0,'Missing name');
  check(['draft','review','ready'].includes(actor.status),'Invalid status');
  check(Number.isFinite(actor.heightCm)&&actor.heightCm>0,'Missing authored height');
  if(Number.isFinite(actor.heightCm)&&actor.heightCm>0)check(actor.bodyPixels===bodyHeight(actor.heightCm),'Wrong authored body height');
  check(actor.camera==='three-quarter-right'&&['right','left'].includes(actor.handedness),'Camera/handedness required');
  check(Object.hasOwn(FAMILIES,actor.physicalFamily)&&Object.hasOwn(FAMILIES,actor.magicFamily),'Unknown attack family');
  check(!('scale' in actor)&&!('calibration' in actor),'Per-character scaling is forbidden');
  check(Array.isArray(actor.pages),'Pages must be an array');
  check(Array.isArray(actor.frames)&&actor.frames.length===64,'Exactly 64 frames required');
  for(const [i,f] of (Array.isArray(actor.frames)?actor.frames:[]).entries()){
    check(f?.index===i&&typeof f.grounded==='boolean','Frame order/contact '+i);
    check(f&&!( 'scale' in f)&&!('origin' in f),'No frame scale or changing origin '+i);
    for(const name of SOCKETS){
      const s=f?.sockets?.[name];
      if(s==null){if(ready)errors.push('Missing socket '+i+'/'+name);continue;}
      check(Number.isInteger(s.x)&&Number.isInteger(s.y)&&s.x>=4&&s.x<316&&s.y>=4&&s.y<316&&Number.isFinite(s.angleDeg)&&['behind','front'].includes(s.layer),'Invalid socket '+i+'/'+name);
    }
    check(Array.isArray(f?.events)&&f.events.every(e=>['release','contact','takeoff','land','recover'].includes(e)),'Unknown visual event '+i);
  }
  for(const [id,base] of Object.entries(CLIPS)){
    const clip=actor.clips?.[id];
    check(clip&&clip.loop===base.loop&&Array.isArray(clip.frames)&&clip.frames.length===base.frames.length&&clip.frames.every((f,i)=>f?.index===base.frames[i].index&&Number.isInteger(f.durationMs)&&f.durationMs>=40&&f.durationMs<=2000),'Invalid clip '+id);
  }
  if(ready){
    check(actor.status==='ready','Appearance is not ready');
    for(const name of REVIEWS)check(actor.reviews?.[name]===true,'Manual review required: '+name);
    const {crown,sole}=actor.landmarks||{};
    check(Number.isInteger(crown?.x)&&Number.isInteger(crown?.y)&&Number.isInteger(sole?.x)&&sole?.y===272&&sole.y-crown.y===actor.bodyPixels,'First idle anatomical landmarks required');
    check(Array.isArray(actor.pages)&&actor.pages.length===4,'Four native pages required');
    for(const p of Array.isArray(actor.pages)?actor.pages:[])check(/^[a-z0-9-]+\.png$/.test(p?.file||'')&&/^[a-f0-9]{64}$/.test(p?.sha256||'')&&/^[a-z0-9-]+\.png$/.test(p?.handsFile||'')&&/^[a-f0-9]{64}$/.test(p?.handsSha256||''),'Native body and front-hand page integrity required');
  }
  return errors;
}
