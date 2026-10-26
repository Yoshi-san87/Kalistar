'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../../..'),OUT=path.join(ROOT,'work/astraball-v2/ten-characters');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const save=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const IDS=['kaylis','momo','balmhyr','gen','lanio','taulio','voloden','rikka','cana','general-barok-kalistar'];
const subjects={
  kaylis:'Adult athletic woman, warm brown skin, curly dark brown hair tied up, black sleeveless crop top, black cargo trousers and black boots. Tiny rainbow markings on her arms, no detached glow.',
  momo:'Small brass and dark steel domestic robot, round mechanical head, two cyan eyes, broad worn brown straw hat, short ochre poncho, jointed metal hands and short mechanical legs. Hat stays on. No flute drawn anywhere.',
  balmhyr:'Stocky older dwarf, long silver-white hair and braided white beard with gold rings, dark bronze lamellar armour, rust-orange scarf and tabard, ivory fur edging, heavy boots. No crown, no axe, no companion.',
  gen:'Lean young adult man with tousled short dark hair, black sleeveless fitted shirt, brown leather belts, black cargo trousers, brown boots. His mechanical forearm is part of his anatomy, not a separate held weapon. Preserve the reference identity.',
  lanio:'Athletic lean blond young adult man, messy short golden hair, cheerful confident face, sleeveless brick-red shirt, charcoal trousers, leather wrist bands, brown boots. Human hands, no horn, no tattoo.',
  taulio:'Large broad dark petrol-green metal robot, heavy domed shoulders, cylindrical helmet with one green eye, golden HEART window in chest, thick fists and mechanical boots, rusty bronze edge wear. No human skin.',
  voloden:'Tall slender pale aristocratic man, long straight silver-white hair, black high-collar coat with subtle antique-gold embroidery, black trousers and boots. Coat allows readable leg movement. No crown, no scythe.',
  rikka:'Adult leopard Felineus woman, warm golden spotted skin, feline ears and long spotted tail, short dark hair, black fitted outfit with burgundy accents, dark boots, leather fingerless gloves. Preserve feline facial features and confident athletic silhouette. No whip painted.',
  cana:'Young adult slim human-faced winged messenger, chestnut short hair, cream folded feathered wings, blue tunic, short cream cloak, brown belt, gloves and boots. Compact wings remain folded and are attached behind shoulders. No bow, arrows or other characters.',
  'general-barok-kalistar':'Large intimidating adult black wolf humanoid general with black fur, red military beret, red eyepatch, large facial scar, long red military coat trimmed in black fur, black armour and boots. Two crossing black bandoliers with small icy-blue crystals and blue luminous edging, matching blue crystal belt. No swords drawn anywhere; empty gloved hands. No scenery or smoke.'
};
const pages=[
  'ROW 1: four IDLE breathing drawings, neutral / inhale / exhale / neutral, both feet at the same ground level.\nROW 2: RUN frames 1-4: right leg forward contact with left arm forward; right leg supports under body while left heel folds; left leg passes forward; LEFT leg forward contact with RIGHT arm forward (opposite limbs to run frame 1).\nROW 3: RUN frames 5-6: left leg supports while right heel folds; right leg passes back toward first contact. Then JUMP frames 1-2: shallow anticipation crouch; deeper load with both feet planted.\nROW 4: JUMP frames 3-6: takeoff with body rising; apex with knees tucked and body clearly higher; descent with legs extending; landing crouch. Six actual run phases, not six near-copies. Running in place.',
  'ROW 1: four WIN celebration drawings: neutral upright anticipation; arm rising; one fist proudly raised; settle with fist still raised.\nROW 2: four PUSH drawings: hands near chest; brace and lean; extend both open palms forward; recover to a ready stance.\nROW 3: four CROUCH drawings: slight bend; half squat; low squat; stable low squat. Head/body visibly descend while feet stay at one ground level.\nROW 4: four PHYSICAL BLOCK drawings: forearms begin rising; forearms cross in front of face; brace behind forearms; hold guarded posture. No shield or effects.',
  'ROW 1: four HIT drawings: upright brace; recoil from a light impact; regain balance; return upright. Keep character alive and standing.\nROW 2: four FALL drawings: stumble; knee gives way; fall sideways toward the right; lie on the ground.\nROW 3: four RISE drawings: lie on ground; hands push up; one knee under body; stand fully upright. Do not repeat attack poses here.\nROW 4: four THROW drawings: cock one arm back; torso winds; release the open hand forward; follow through. Throw an invisible ball, no ball or weapon painted.',
  'ROW 1: PHYSICAL ATTACK frames 1-4: guard; anticipation; acceleration; full extension/contact.\nROW 2: PHYSICAL ATTACK frames 5-6: withdraw; return guard. Then MAGIC frames 1-2: prepare hands or grip; gather close to torso.\nROW 3: MAGIC frames 3-6: deliberate windup; extend/release gesture; sustain empty hands; recover neutral. No VFX.\nROW 4: DEATH frames 1-4: knees lose strength; collapse onto knees; fall onto side; final motionless body lying flat. Maintain clear space between all four prone silhouettes.'
];
const physical={thrust:'A short blade thrust: closed leading fist, elbow aligned with wrist, rear hand protects body; step into a straight stab then withdraw. NO BLADE DRAWN.',heavy:'A two-handed axe strike: two closed grips on the same imaginary shaft, high preparation, downward diagonal blow, heavy follow-through and recovery. NO AXE DRAWN.',projectile:'A precision throwing motion: fingers pinch an absent small projectile, arm cocks near shoulder, snaps forward and opens, then recoils. No projectile.',polearm:'A long-shaft weapon motion: two hands spaced along one imaginary rigid axis, pull back, thrust or sweep forward, then recover. No shaft or blade.',unarmed:'A strong fist attack: wind up rear fist, rotate hips, punch forward, retract and return guard. No weapon.',flexible:'A whip attack: one empty closed grip, raised elbow, sweeping arm and wrist snap, follow-through then recover. No lash or handle drawn.',bow:'An archery shot: one arm extends an empty bow grip while the other hand pulls an absent string beside the cheek, then releases and relaxes. No bow or arrow.',katana:'A double-katana attack for Barok: one closed empty grip in each hand, crossed guard, a diagonal cut with one arm and supporting guard from the other, follow-through and recover. No blades drawn.',instrument:'A transverse flute gesture: both hands position along the SAME invisible horizontal flute beside the mouth, fingers move deliberately, body leans, then lowers hands. NO FLUTE DRAWN.'};
function makePrompt(entry,page){
  return 'Use case: stylized-concept. NEW Kalistar game pixel-art animation source page '+(page+1)+' of 4. Exactly SIXTEEN full-body drawings in FOUR COLUMNS and FOUR ROWS. Each cell has one isolated sprite; wide clear transparent gutters. No cell may overlap another, including lying bodies. The references supply identity and pixel-art visual style, NOT the old animation order. Draw the requested NEW poses.\n'+
    'Premium deliberate JRPG pixel art, readable small faces, solid colour clusters, restrained dark outline, not a smooth painting. Locked three-quarter SIDE view facing RIGHT, adult anatomy as appropriate to the character. Entire body including hair/hat/feet visible. Same upright anatomical size and costume throughout, no changing head size. Keep about 15 percent transparent space around every pose; maintain the same imaginary ground across each row except airborne drawings. Empty hands, NO WEAPONS even on the back, no ball, no VFX, no ground shadow, no labels, no grid.\nCHARACTER: '+entry.subject+'\n'+
    pages[page]+(page===3?'\nPHYSICAL MOTION: '+physical[entry.physicalFamily]+'\nMAGIC MOTION: '+(entry.magicFamily==='instrument'?'mime playing the absent transverse flute, then lower hands; no instrument or effect.':'cupped empty hands gather near waist, draw toward torso, extend forward, recover. No energy effect.'):'')+
    '\nConsistency is essential: one head, two arms, two legs, same joints and clothing. The near arm and far arm have consistent lighting so alternating limbs remain readable. Do not merely translate/rotate one drawing to fake an animation. Do not copy poses from the reference instead of the requested sequence.';
}
function plan(){
  const prod=read(path.join(ROOT,'V4/astraball/sources/sprites-v3/production.json'));
  const inventory=read(path.join(ROOT,'work/astraball-v2/inventory.json'));
  const entries=IDS.map(id=>{
    const c=prod.characters.find(c=>c.characterId===id),base=inventory.entries.find(e=>e.characterId===id&&e.modelId===c.modelId);
    if(!base)throw Error('Missing exact model '+id);
    const sprite=path.join(ROOT,'V4/astraball',c.file),ref=fs.existsSync(sprite)?sprite:path.join(ROOT,c.reference);
    const entry={...base,subject:subjects[id],reference:ref,cardReference:c.reference,status:'planned',sources:[]};
    entry.prompts=pages.map((_,p)=>makePrompt(entry,p));return entry;
  });
  const file=path.join(OUT,'production.json');if(fs.existsSync(file))throw Error('Preserve existing production plan');
  save(file,{schemaVersion:1,templateId:'kalistar-actor-v2',authorization:'Offline native conversion explicitly approved by user on 2026-10-26; no per-character runtime scaling.',entries});
  return entries;
}
function record(id,page,source,prompt){
  const file=path.join(OUT,'production.json'),manifest=read(file),entry=manifest.entries.find(e=>e.characterId===id);
  if(!entry||!Number.isInteger(page)||page<0||page>3)throw Error('Unknown production page');
  const existing=entry.sources.filter(s=>s.page===page),revision=existing.length+1;
  const relative=`${id}/source-${page}-r${revision}.png`,dest=path.join(OUT,relative);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);
  entry.sources.push({page,revision,file:relative,sha256:hash(dest),tool:'image_gen.imagegen',prompt:prompt||entry.prompts[page],status:'generated'});
  entry.status='generated';save(file,manifest);return dest;
}
async function main(){const [cmd,id,page,file,prompt]=process.argv.slice(2);if(cmd==='plan')console.log(JSON.stringify(plan().map(({characterId,modelId,heightCm,bodyPixels,reference})=>({characterId,modelId,heightCm,bodyPixels,reference})),null,2));else if(cmd==='record')console.log(record(id,Number(page),file,prompt));else if(cmd==='prompts')console.log(JSON.stringify(read(path.join(OUT,'production.json')).entries));else throw Error('Use plan | prompts | record <id> <page> <PNG> [exact prompt]');}
module.exports={ROOT,OUT,read,save,hash,record,makePrompt};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
