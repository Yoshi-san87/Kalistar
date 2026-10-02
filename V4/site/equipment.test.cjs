'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {buildCatalog}=require('../atelier/game-catalog.cjs'),{createEngine}=require('./engine.js'),Q=require('./equipment.js');
const dataPromise=buildCatalog(),loadout={balmhyr:'fallen-king-axe',momo:'little-joys-flute'};
test('native weapon assets retain approved sources, optical anchor and extracted copper',()=>{
  const proof=JSON.parse(fs.readFileSync(path.join(__dirname,'verification/weapons/media-provenance.json'),'utf8'));
  const bank=path.join(__dirname,'../atelier/designer-assets');
  const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  for(const [file,expected] of Object.entries(proof.sourceHashes))assert.equal(hash(path.join(bank,file)),expected,'approved source: '+file);
  for(const [file,expected] of Object.entries(proof.derivedHashes))assert.equal(hash(path.join(__dirname,'assets/equipment',file)),expected,'derived asset: '+file);
  const layout=JSON.parse(fs.readFileSync(path.join(__dirname,'../template-stable/icon-layouts.json'),'utf8'));
  assert.deepEqual([proof.center.x,proof.center.y],layout.weapon.Hache.center);
  assert.deepEqual(proof.native,{width:897,height:1497});
  assert.deepEqual(proof.box,{left:76,top:1103,width:122,height:122});
  assert.equal(proof.sourceRevision.id,'2026-09-27-weapon-optics');
});
test('Pages includes the complete equipment chain and excludes its authoring proofs',async()=>{
  const {files}=await require('../deploy/build.cjs').plan(),targets=new Set(files.map(f=>f.target));
  for(const file of ['weapons.js','equipment.js','equipment-presentation.js','weapons-ui.js','weapons.css','assets/equipment/axe.webp','assets/equipment/flute.webp','assets/equipment/rim.webp'])assert.ok(targets.has('jeu/'+file),file);
  assert.ok(![...targets].some(t=>t.includes('media-provenance')||t.includes('weapons.browser.test')||t.includes('build-weapon-media')));
});

test('unique weapon art fits the native interior and is included without its source PNGs',async()=>{
  const proof=JSON.parse(fs.readFileSync(path.join(__dirname,'../revisions/2026-10-02-unique-weapon-art/media-provenance.json'),'utf8'));
  const native=JSON.parse(fs.readFileSync(path.join(__dirname,'verification/weapons/media-provenance.json'),'utf8'));
  assert.deepEqual(proof.native.box,native.box);assert.deepEqual(proof.native.center,native.center);
  assert.equal(proof.native.frameHash,native.sourceHashes['frame/default.png']);
  assert.equal(proof.render.scale,4);
  const {files}=await require('../deploy/build.cjs').plan(),targets=new Set(files.map(f=>f.target));
  for(const w of Q.catalogue.weapons){
    Q.validateDefinition(w);const art=proof.assets.find(a=>a.visual===w.art);assert.ok(art,w.id);
    assert.ok(art.maxRadius<proof.render.safeRadius);assert.ok(art.bytes<160000);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,art.file))).digest('hex'),art.derivedHash);
    assert.ok(targets.has('jeu/'+art.file));
  }
  assert.ok(![...targets].some(t=>/unique-weapon-art|build-weapon-art/.test(t)));
});

test('legacy equipment snapshots keep their original art and reject unknown replacement assets',async()=>{
  const data=await dataPromise,E=createEngine(data),s=E.newGame(data.decks.player,data.decks.player,{seed:'LEGACY-WEAPON-ART',equipment:[loadout,{}]});
  for(const w of s.equipment.definitions)delete w.art;
  assert.deepEqual(E.restoreGame(s),s);
  for(const w of Q.catalogue.weapons){
    assert.ok(fs.existsSync(path.join(__dirname,'assets/equipment',w.visual+'.webp')));
    assert.throws(()=>Q.validateDefinition({...w,art:'../../untrusted'}));
  }
});
async function fixture({equipped=true,side=0,mutate=()=>{}}={}){
  const data=structuredClone(await dataPromise);mutate(data);
  const E=createEngine(data),loadouts=side===0?[loadout,{}]:[{},loadout];
  const s=E.newGame(data.decks.player,data.decks.player,{mode:'local',seed:'ARMES',kalistel:false,...(equipped?{equipment:loadouts}:{})});
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);s.turn=side;
  const units=p=>[...p.board.filter(Boolean),...p.reserve,...p.dead],find=(id,p=side)=>units(s.players[p]).find(u=>E.card(u).characterId===id);
  const place=(id,slot,p=side)=>{const u=find(id,p),team=s.players[p];if(team.board.includes(u))return u;const old=team.board[slot];team.reserve=team.reserve.filter(x=>x!==u);if(old)team.reserve.push(old);team.board[slot]=u;u.entered=true;return u;};
  return {data,E,s,find,place,side};
}
function duel(f,a,b){const {E,s}=f;E.lock(s,s.players[s.turn].board.indexOf(a),s.players[1-s.turn].board.indexOf(b));}
function numeric(f,atk=6,def=6){f.E.rollAttack(f.s,atk);f.E.rollDefense(f.s,def);f.E.assertState(f.s);}
test('stable identity, character/job/family restrictions, one weapon and schema limits',async()=>{
  const data=await dataPromise,momo=data.cards.filter(c=>c.characterId==='momo'),axe=Q.catalogue.weapons[0];
  assert.equal(momo.length,2);assert.ok(momo.every(c=>Q.compatible(Q.catalogue.weapons[1],c)));
  assert.ok(!Q.compatible(axe,momo[0]));assert.throws(()=>Q.validateLoadout({MOMO:'little-joys-flute'},data.cards));
  assert.throws(()=>Q.validateLoadout({momo:'fallen-king-axe'},data.cards));
  const job={...axe,restrictions:{jobs:['MENTOR'],families:['Hache']}};
  assert.ok(Q.compatible(job,data.cards.find(c=>c.characterId==='balmhyr')));assert.ok(!Q.compatible(job,momo[0]));
  assert.throws(()=>Q.validateDefinition({...axe,effect:{...axe.effect,value:100}}));
  assert.throws(()=>Q.validateDefinition({...axe,changesFamily:true}));
  assert.throws(()=>Q.validateProfile({id:'user-paris',version:1,slots:{weapon:loadout,job:{}}},data.cards));
});
test('generic slot mutation replaces and transfers atomically, with a stale-confirmation guard',async()=>{
  const data=await dataPromise,base=Q.catalogue.weapons[0],third={...base,id:'mentor-test',restrictions:{characterIds:['balmhyr','momo']}};
  const definitions=[...Q.catalogue.weapons,third],empty=Q.profile('user-paris');
  const row=Q.equipProfile(empty,'balmhyr',base.id,data.cards,{},definitions);
  assert.throws(()=>Q.equipProfile(row,'balmhyr',third.id,data.cards,{},definitions));
  const replaced=Q.equipProfile(row,'balmhyr',third.id,data.cards,{expected:base.id,expectedProfile:row},definitions);
  assert.equal(replaced.slots.weapon.balmhyr,third.id);assert.equal(row.slots.weapon.balmhyr,base.id);
  const moved=Q.equipProfile(replaced,'momo',third.id,data.cards,{expectedProfile:replaced},definitions);
  assert.equal(moved.slots.weapon.balmhyr,undefined);assert.equal(moved.slots.weapon.momo,third.id);
});
test('axe inactive with allies, active as last board combatant despite reserves; base matrix unchanged',async()=>{
  const f=await fixture(),{s,E,find}=f,a=f.place('balmhyr',0),b=s.players[1].board[0];
  assert.equal(E.equipmentView(s,a).active,false);
  s.players[0].reserve.push(...s.players[0].board.filter(u=>u&&u!==a));s.players[0].board=s.players[0].board.map(u=>u===a?u:null);
  assert.equal(E.equipmentView(s,a).active,true);E.assertState(s);
  duel(f,a,b);numeric(f);const formula=s.duel.formula;
  assert.equal(formula.equipmentAttack,30);assert.equal(formula.weapon,f.data.weapons[E.card(a).weapon][E.card(b).weapon]);
  assert.equal(formula.attack,Math.max(0,formula.baseAttack+formula.weapon+formula.element+formula.faction+formula.buff+formula.barrier+formula.arenaAttack+30));
  assert.ok(s.log.some(l=>l.text.includes('Hache du Roi')&&l.text.includes('+30 ATK')));
  assert.deepEqual(E.restoreGame(s),s);
  s.phase='replace';s.replacing=0;const slot=s.players[0].board.findIndex((u,i)=>!u&&s.players[0].reserve.some(r=>E.card(r).positions.includes(i+1))),unit=s.players[0].reserve.find(r=>E.card(r).positions.includes(slot+1));
  E.deploy(s,0,unit.uid,slot);assert.equal(E.equipmentView(s,a).active,false);
});
test('opponent equipment works with identical side-independent rules',async()=>{
  const f=await fixture({side:1}),a=f.place('balmhyr',0),p=f.s.players[1];p.reserve.push(...p.board.filter(u=>u&&u!==a));p.board=p.board.map(u=>u===a?u:null);
  duel(f,a,f.s.players[0].board[0]);numeric(f);assert.equal(f.s.duel.formula.equipmentAttack,30);
});
for(const [kind,die,grant] of [['luck',4,'grantClover'],['mana',2,'grantPotion']]){
  test('flute '+kind+' grants +30 DEF once, survives reload/reroll, expires at duel end',async()=>{
    const f=await fixture({mutate:data=>{for(const c of data.cards){c.defense=[1,1,1,1,1,1];}}}),{s,E}=f,m=f.place('momo',2),ally=s.players[0].board[0],enemy=s.players[1].board[0];
    duel(f,m,enemy);E.rollAttack(s,die);E[grant](s,ally.uid);E.assertState(s);
    assert.equal(s.equipment.pending[ally.uid].weaponId,'little-joys-flute');assert.equal(E.equipmentView(s,m).active,true);
    assert.ok(s.log.some(l=>l.text.includes('Petits Bonheurs')&&l.text.includes('+30 DEF')));
    const restored=E.restoreGame(s);assert.deepEqual(restored.equipment.pending,s.equipment.pending);
    E.next(s);duel(f,enemy,ally);E.rollAttack(s,6);E.rollDefense(s,6);
    if(kind==='luck'){assert.equal(s.phase,'defense');assert.equal(s.duel.formula.equipmentDefense,30);const resumed=E.restoreGame(s);assert.deepEqual(resumed,s);E.rollDefense(s,5);}
    E.assertState(s);assert.equal(s.phase,'result');assert.equal(s.duel.formula.equipmentDefense,30);assert.ok(!s.equipment.pending[ally.uid]);assert.equal(E.equipmentView(s,m).active,false);
    assert.equal(s.duel.formula.defense,s.duel.formula.baseDefense+s.duel.formula.race+s.duel.formula.arenaDefense+s.duel.formula.ward+30);
  });
  test('flute '+kind+' refresh cannot recharge or stack',async()=>{
    const f=await fixture(),{s,E}=f,m=f.place('momo',2),ally=s.players[0].board[0];ally[kind]=kind==='luck'?1:60;
    duel(f,m,s.players[1].board[0]);E.rollAttack(s,die);E[grant](s,ally.uid);E.assertState(s);
    assert.deepEqual(s.equipment.pending,{});assert.equal(s.duel.equipmentTransfer,undefined);
  });
}
test('one-duel flute expires on attacking, support, dodge and Mort; special faces never become numeric',async()=>{
  for(const scenario of ['attack','support','dodge','death']){
    const f=await fixture({mutate:data=>{if(scenario==='dodge')data.cards.find(c=>c.characterId==='balmhyr').defense[0]='dodge';if(scenario==='death')data.cards.find(c=>c.characterId==='balmhyr').atk[0]='death';}}),{s,E}=f,m=f.place('momo',2),ally=f.place('balmhyr',0),enemy=f.place('balmhyr',0,1);
    duel(f,m,enemy);E.rollAttack(s,2);E.grantPotion(s,scenario==='support'?m.uid:ally.uid);E.next(s);
    if(scenario==='attack'||scenario==='support')s.turn=0;
    duel(f,scenario==='support'?m:scenario==='attack'?ally:enemy,scenario==='attack'||scenario==='support'?enemy:ally);
    E.rollAttack(s,scenario==='support'?4:6);
    if(scenario==='support')E.grantClover(s,m.uid);else E.rollDefense(s,6);
    E.assertState(s);assert.equal(s.phase,'result');assert.deepEqual(s.equipment.pending,{});
    if(['support','dodge','death'].includes(scenario))assert.equal(s.duel.formula,undefined);
  }
});
test('snapshot decoupled from profile, rejected corrupt states and unchanged legacy games',async()=>{
  const f=await fixture(),{s,E}=f;const copy=structuredClone(s.equipment);loadout.momo='not-a-weapon';assert.deepEqual(s.equipment,copy);loadout.momo='little-joys-flute';
  const bad=E.clone(s);bad.equipment.loadouts[0].momo='fallen-king-axe';assert.throws(()=>E.restoreGame(bad));
  const bad2=E.clone(s);bad2.equipment.pending['0-99']={weaponId:'little-joys-flute',sourceUid:'0-0',grantedRound:1};assert.throws(()=>E.restoreGame(bad2));
  const legacy=await fixture({equipped:false});duel(legacy,legacy.s.players[0].board[0],legacy.s.players[1].board[0]);numeric(legacy);assert.equal(legacy.s.equipment,undefined);assert.equal(legacy.s.duel.equipment,undefined);assert.equal(legacy.s.duel.formula.equipmentAttack,undefined);assert.deepEqual(legacy.E.restoreGame(legacy.s),legacy.s);
});
test('complete equipped matches remain valid at every step, including restored turns and match end',async()=>{
  const data=await dataPromise,E=createEngine(data);
  for(let seed=0;seed<12;seed++){
    let s=E.newGame(data.decks.player,data.decks.player,{mode:'local',seed:'WEAPON-'+seed,equipment:[loadout,loadout]});
    E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
    for(let n=0;s.phase!=='over'&&n<2000;n++){
      if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
      else if(s.phase==='attack')E.rollAttack(s);
      else if(s.phase==='kalistel')E.acceptAttack(s);
      else if(s.phase==='defense')E.rollDefense(s);
      else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
      else if(s.phase==='result')E.next(s);
      else {const kinds={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']},[grant,choose]=kinds[s.phase];E[grant](s,E[choose](s));}
      E.assertState(s);if(n%7===0)s=E.restoreGame(s);
    }
    assert.equal(s.phase,'over');assert.deepEqual(s.equipment.pending,{});assert.deepEqual(E.restoreGame(s),s);
  }
});
