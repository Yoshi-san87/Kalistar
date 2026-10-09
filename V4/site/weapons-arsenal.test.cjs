'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Q=require('./equipment.js'),{createEngine}=require('./engine.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const rows=require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created');
// State conditions and non-stacking below belong to archived 4.5.64 matches.
// Current D6 mechanics have separate coverage; never evaluate old rules from today's definitions.
const archive=require('./fixtures/equipment-v4.5.64.json');
const weapons=archive.weapons.filter(w=>Q.catalogue.kind(w)==='weapon'&&!w.id.startsWith('ff9-'));
const dataPromise=buildCatalog({published:rows}),additions=weapons.filter(w=>w.collectible);
const {legacyGame,weapons:previous}=require('./fixtures/legacy-equipment.cjs');
const unmatched=['commanders-sabre','draevenheim-crimson-crossbow','rhinoz-ancestral-horn'];
function deckFor(E,data,carrier){
  const base=data.decks.player;
  for(let i=0;i<base.length;i++){
    const ids=base.slice();ids[i]=carrier.id;
    if(!E.validatePlayableDeck(ids).length)return ids;
  }
  throw Error('No valid fixture deck for '+carrier.id);
}
async function fixture(w,side=0){
  const data=await dataPromise,E=createEngine(data),current=data.cards.find(c=>Q.compatible(w,c)),c=current||data.cards.find(c=>Q.compatible(previous.find(p=>p.id===w.id),c));assert(c,w.id+' has a current or historical carrier');
  const deck=deckFor(E,data,c),loadout={[c.characterId]:w.id},s=(current?E.newGame.bind(E):legacyGame.bind(null,E))(deck,deck,{seed:w.id,mode:'local',kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
  const unit=s.players[side].reserve.find(u=>u.cardId===c.id);
  E.autoDeploy(s,0);E.autoDeploy(s,1);
  if(!s.players[side].board.includes(unit)){const slot=c.positions[0]-1;E.recall(s,side,slot);E.deploy(s,side,unit.uid,slot);}
  E.start(s);
  return {E,s,c,unit,side,data};
}
function activate(f,w){
  const p=f.s.players[f.side],when=w.effect.when;
  if(when.outnumbered||when.activeAtMost){
    const keep=when.activeAtMost||2;let count=1;
    p.board=p.board.map(u=>{if(!u||u===f.unit)return u;if(count++<keep)return u;p.reserve.push(u);return null;});
  }
  if(when.reserveAtMost===0){for(const u of p.reserve)u.entered=true;p.dead.push(...p.reserve);p.reserve=[];}
}
test('archived 4.5.64: 31 additions keep identities, restrictions and bounded state effects',async()=>{
  const data=await dataPromise;assert.equal(additions.length,31);assert.equal(weapons.length,33);
  assert.equal(archive.release,'v4.5.64');assert.equal(archive.sourceHash,'4ae84b53545d6221492000d90b58ae94513a60d39baf0ae271844a5b97938f84');
  assert.deepEqual(Q.catalogue.legacyWeapons,archive.weapons);
  assert.equal(new Set(weapons.map(w=>w.id)).size,33);
  assert.equal(additions.filter(w=>w.restrictions.jobs).length,3);
  assert.equal(additions.filter(w=>w.restrictions.factions).length,7);
  assert.equal(additions.filter(w=>w.restrictions.races).length,1);
  for(const w of additions){Q.validateDefinition(w);assert(w.effect.value>=15&&w.effect.value<=25);assert.equal(data.cards.some(c=>Q.compatible(w,c)),!unmatched.includes(w.id),w.id);assert.equal(w.changesFamily,undefined);}
  const thorn=additions.find(w=>w.id==='arborium-thorn-dagger'),maelor=data.cards.find(c=>c.id==='49900908');
  assert(maelor);assert.equal(maelor.characterId,'maelor-kalistar');assert(Q.compatible(thorn,maelor));
  assert(!Q.compatible(thorn,{...maelor,faction:'Durane'}));
  assert(!Q.compatible(thorn,{...maelor,weapon:'Arc'}));
  const rapier=additions.find(w=>w.id==='white-oath-rapier');
  assert(Q.compatible(rapier,data.cards.find(c=>c.id==='49055457')));
  assert(!Q.compatible(rapier,data.cards.find(c=>c.id==='30000012')));
  assert(!Q.compatible(rapier,{...data.cards.find(c=>c.id==='49055457'),characterId:'someone-else',name:'KAYLIS'}));
  for(const [key,value]of [['activeAtMost',0],['reserveAtMost',-1],['outnumbered',false],['freeWin',true]])assert.throws(()=>Q.validateDefinition({...rapier,effect:{...rapier.effect,when:{[key]:value}}}));
  const guardian=additions.find(w=>w.id==='wardens-spear');
  const guard=data.cards.find(c=>Q.compatible(guardian,c));
  for(const job of ['GARDIEN','GARDIENNE'])assert(Q.compatible(guardian,{...guard,job}));
  assert(!Q.compatible(guardian,{job:'SOLDAT'}));
});
for(const w of additions)test('archived 4.5.64: '+w.id+(unmatched.includes(w.id)?' (earlier bearer snapshot)':'')+': inactive, active, real formula, log and reload on either side',async()=>{
  for(const side of [0,1]){
    const f=await fixture(w,side),{E,s,unit,c}=f;
    assert.equal(E.equipmentView(s,unit).active,false);assert.equal(E.equipmentModifier(s,unit,w.effect.stat),null);
    activate(f,w);assert.equal(E.equipmentView(s,unit).active,true);E.assertState(s);
    assert.equal(E.equipmentModifier(s,unit,w.effect.stat).value,w.effect.value);
    const enemy=s.players[1-side].board.find(Boolean),attack=w.effect.stat==='ATK';s.turn=attack?side:1-side;
    const a=attack?unit:enemy,b=attack?enemy:unit;
    E.lock(s,s.players[s.turn].board.indexOf(a),s.players[1-s.turn].board.indexOf(b));
    assert.equal(s.duel.equipment[attack?'attack':'defense'].weaponId,w.id);
    E.rollAttack(s,6-E.card(a).atk.findIndex(v=>typeof v==='number'));
    E.rollDefense(s,6-E.card(b).defense.findIndex(v=>typeof v==='number'));E.assertState(s);
    const form=s.duel.formula;assert(form,'numeric dice stay numeric');assert.equal(form[attack?'equipmentAttack':'equipmentDefense'],w.effect.value);
    assert.equal(form.weapon,f.data.weapons[E.card(a).weapon][E.card(b).weapon]);
    assert(s.log.some(l=>l.text.includes(w.name)&&l.text.includes('+'+w.effect.value+' '+w.effect.stat)));
    assert.equal(c.weapon,E.card(unit).weapon);assert.deepEqual(E.restoreGame(s),s);
    // Captured modifiers remain immutable even if the snapshot roster is later evaluated differently.
    const captured=structuredClone(s.duel.equipment);s.phase='over';assert.equal(E.equipmentView(s,unit).active,false);assert.deepEqual(s.duel.equipment,captured);
  }
});
test('archived 4.5.64: team conditions deactivate when formation or reserve recovers',async()=>{
  for(const w of additions){
    const f=await fixture(w),before=structuredClone(f.s.players);activate(f,w);assert(f.E.equipmentView(f.s,f.unit).active);
    f.s.players=before;const restored=before[0].board.find(u=>u.uid===f.unit.uid);
    assert.equal(f.E.equipmentView(f.s,restored).active,false);assert.deepEqual(f.s.equipment.pending,{});
  }
});
test('archived 4.5.64: Momo gift beats a smaller active DEF weapon without stacking, then expires',async()=>{
  const w=additions.find(w=>w.id==='mythic-iron-gauntlet'),f=await fixture(w),{E,s,unit}=f;
  activate(f,w);
  const source=[...s.players[0].board.filter(Boolean),...s.players[0].reserve].find(u=>E.card(u).characterId==='momo');assert(source);
  s.equipment.loadouts[0].momo='little-joys-flute';
  s.equipment.pending[unit.uid]={weaponId:'little-joys-flute',sourceUid:source.uid,grantedRound:s.round};
  E.assertState(s);assert.equal(E.equipmentModifier(s,unit,'DEF').value,30);
  const enemy=s.players[1].board.find(Boolean);s.turn=1;E.lock(s,s.players[1].board.indexOf(enemy),s.players[0].board.indexOf(unit));
  E.rollAttack(s,6);E.rollDefense(s,6);assert.equal(s.duel.formula.equipmentDefense,30);assert.equal(s.duel.equipment.defense.weaponId,'little-joys-flute');
  assert(!s.equipment.pending[unit.uid]);assert.deepEqual(E.restoreGame(s),s);
});
test('archived 4.5.64: scythe bonus never converts Voloden printed Mort into numeric damage',async()=>{
  const w=additions.find(w=>w.id==='violet-reaping'),f=await fixture(w),{E,s,unit}=f;activate(f,w);s.turn=0;
  const die=6-E.card(unit).atk.indexOf('death');assert(die>=1&&die<=6);
  E.lock(s,s.players[0].board.indexOf(unit),0);E.rollAttack(s,die);E.rollDefense(s,6);
  assert.equal(s.duel.formula,undefined);assert.deepEqual(E.restoreGame(s),s);
});
test('archived 4.5.64: original arsenal completes real matches and restores every exchange',async()=>{
  for(const w of additions){
    const f=await fixture(w),E=f.E;let s=f.s;
    for(let n=0;s.phase!=='over'&&n<2000;n++){
      if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
      else if(s.phase==='attack')E.rollAttack(s);
      else if(s.phase==='kalistel')E.acceptAttack(s);
      else if(s.phase==='defense')E.rollDefense(s);
      else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
      else if(s.phase==='result')E.next(s);
      else{const choices={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']},[grant,choose]=choices[s.phase];E[grant](s,E[choose](s));}
      E.assertState(s);s=E.restoreGame(s);
    }
    assert.equal(s.phase,'over',w.id);assert.deepEqual(s.equipment.pending,{});
  }
});
test('4.6 compatible weapon alternatives replace atomically without altering the other slots',async()=>{
  const data=await dataPromise;let p=Q.profile('arsenal-qa');
  for(const [characterId,first,next]of [['2b-nier','virtuous-contract','virtuous-treaty'],['geralt-witcher','wolf-steel','wolf-silver'],['balmhyr','fallen-king-axe','mythic-iron-gauntlet']]){
    p=Q.equipProfile(p,characterId,first,data.cards);assert.throws(()=>Q.equipProfile(p,characterId,next,data.cards));
    if(unmatched.includes(next)){assert.throws(()=>Q.equipProfile(p,characterId,next,data.cards,{expected:first,expectedProfile:p}));assert.equal(p.slots.weapon[characterId],first);continue;}
    p=Q.equipProfile(p,characterId,next,data.cards,{expected:first,expectedProfile:p});assert.equal(p.slots.weapon[characterId],next);
  }
  assert.equal(Object.keys(p.slots.weapon).length,3);
  assert.deepEqual(p.slots.shield,{});assert.deepEqual(p.slots.relic,{});
});

test('4.6 original arsenal keeps metadata and values, with ATK-six weapons and Momo support relic',()=>{
  for(const old of weapons){
    const current=Q.catalogue.weapons.find(w=>w.id===old.id);Q.validateDefinition(current);
    for(const key of ['id','name','family','art','visual','restrictions','collectible','lore'])assert.deepEqual(current[key],old[key],old.id+' '+key);
    assert.equal(current.rulesVersion,2);
    if(old.id==='little-joys-flute'){
      assert.equal(current.slot,'relic');assert.equal(current.kind,'relic');assert.deepEqual(current.effect,old.effect);
    }else{
      assert.equal(current.slot,'weapon');assert.deepEqual(current.effect,{trigger:'RETAINED_SIX',stat:'ATK',value:old.effect.value,duration:'DUEL'});
    }
  }
});
test('all generated assets are versioned, hashed, have alpha and remain inside medallion',async()=>{
  const {createRequire}=require('node:module'),proof=require('../weapon-cards/media-provenance.json');
  const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const sharp=createRequire(path.resolve(runtime,'_arsenal_media_qa.cjs'))('sharp');
  for(const w of additions){
    const file='V4/site/assets/equipment/'+w.art+'.webp',record=proof.assets.find(a=>a.file===file);assert(record);
    const full=path.join(__dirname,'../..',file),bytes=fs.readFileSync(full);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),record.sha256);
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,488);let count=0;
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]){count++;assert(Math.hypot(x-244,y-242)<=171,w.id+' remains inside native rim');}
    assert(count>100,w.id+' nonblank');
  }
});
