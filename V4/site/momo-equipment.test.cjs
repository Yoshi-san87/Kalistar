'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),Cards=require('./weapon-cards.js');
const Team=require('./team-composition.js'),Library=require('./deck-library.js');
const {fixture,reload,step,lock,attack,duel,next,thin,unit,grants,row}=require('./fixtures/relic-ultimates.cjs');
const FLUTE='little-joys-flute',BOX='little-joys-box';
const item=id=>Q.catalogue.weapons.find(w=>w.id===id),copy=structuredClone;
const native=require('../atelier/game-catalog.cjs').buildCatalog();

test('Momo retains two distinct items, art and identities: ATK6 flute and Clover box',()=>{
  const flute=item(FLUTE),box=item(BOX);
  assert.equal(flute.slot,'weapon');assert.equal(Q.catalogue.kind(flute),'weapon');
  assert.deepEqual(flute.effect,{trigger:'RETAINED_SIX',stat:'ATK',value:30,duration:'DUEL'});
  assert.deepEqual(flute.restrictions,{characterIds:['momo'],families:['Instrument']});
  assert.equal(box.slot,'relic');assert.deepEqual(box.restrictions,{characterIds:['momo']});
  assert.deepEqual(box.effect,{trigger:'OUTNUMBERED_GIFT',event:'TARGETED',trait:'luck',recipient:'allies',duration:'ONCE_MATCH'});
  for(const w of [flute,box]){
    Q.validateDefinition(w);
    const old=Q.catalogue.legacyWeapons.find(x=>x.id===w.id);
    assert.equal(w.art,old.art);assert.equal(w.name,old.name);
  }
  assert.equal(Cards.effectLabel(flute),'+30 ATK');
  assert.match(Cards.effectLabel(box),/Tr.fle/i);
  assert.equal(Q.catalogue.legacyWeapons.find(w=>w.id===FLUTE).effect.trigger,'AFTER_SUPPORT');
  assert.equal(Q.catalogue.legacyWeapons.find(w=>w.id===BOX).effect.trigger,'ONCE_DEFENSE');
});

test('in-game help distinguishes the flute weapon from the box ultimate',()=>{
  const app=require('node:fs').readFileSync(require('node:path').join(__dirname,'app.js'),'utf8');
  assert.match(app,/La Fl\u00fbte des Petits Bonheurs de Momo est une arme/);
  assert.match(app,/Sa Bo\u00eete des Petits Bonheurs est une relique/);
  assert.doesNotMatch(app,/La Fl\u00fbte des Petits Bonheurs de Momo est une relique/);
});

test('historical relic-flute profile moves only the assigned item and never auto-equips the box',async()=>{
  const data=await native,old=Q.profile('inactive-user',{weapon:{balmhyr:'fallen-king-axe'},shield:{momo:'kalistar-chroma-harness'},relic:{momo:FLUTE,balmhyr:'exiled-king-seal'}}),before=copy(old);
  const result=Q.reconcileProfile(old,data.cards);
  assert.deepEqual(result.slots,{weapon:{balmhyr:'fallen-king-axe',momo:FLUTE},shield:{momo:'kalistar-chroma-harness'},relic:{balmhyr:'exiled-king-seal'}});
  assert.deepEqual(old,before);assert.deepEqual(Q.reconcileProfile(result,data.cards),result);
  assert.equal(Q.items(result.slots).some(w=>w.id===BOX),false);
  const legacy={id:'legacy',version:1,slots:{weapon:{momo:FLUTE}}};
  assert.deepEqual(Q.reconcileProfile(legacy,data.cards).slots,{weapon:{momo:FLUTE},shield:{},relic:{}});
});

test('corrected flute plus box coexist without pruning or replacing other slots',async()=>{
  const data=await native,profile=Q.profile('momo',{weapon:{momo:FLUTE},shield:{momo:'kalistar-chroma-harness'},relic:{momo:BOX}});
  assert.deepEqual(Q.reconcileProfile(profile,data.cards),profile);
  const first=Q.equipProfile(Q.profile('momo'),'momo',FLUTE,data.cards);
  const both=Q.equipProfile(first,'momo',BOX,data.cards);
  assert.equal(both.slots.weapon.momo,FLUTE);assert.equal(both.slots.relic.momo,BOX);
  assert.equal(first.slots.relic.momo,undefined);
});

test('migration rejects duplicates, unrelated wrong categories and invalid holders without mutation',async()=>{
  const f=await fixture(BOX);
  const inputs=[
    Q.profile('qa',{weapon:{momo:FLUTE},relic:{momo:FLUTE}}),
    Q.profile('qa',{shield:{momo:FLUTE}}),
    Q.profile('qa',{weapon:{momo:BOX}}),
    Q.profile('qa',{relic:{MOMO:FLUTE}}),
    Q.profile('qa',{relic:{balmhyr:FLUTE}}),
    Q.profile('qa',{relic:{momo:FLUTE},weapon:{momo:'unknown'}})
  ];
  for(const input of inputs){const before=copy(input);assert.throws(()=>Q.reconcileProfile(input,f.data.cards));assert.deepEqual(input,before);}
  const valid=Q.profile('qa',{relic:{momo:FLUTE}});
  assert.throws(()=>Q.validateProfile(valid,f.data.cards),'only editable reconciliation accepts the former slot');
});

test('saved compositions migrate durably without resetting formation, captain or library IDs',async()=>{
  const f=await fixture(BOX),T=Team.create(f.E),team=T.normalize({name:'Momo',cards:f.selected.map(c=>c.id)});
  team.captain=team.formation[0];team.equipment.relic.momo=FLUTE;
  const original=copy(team),migrated=T.normalize(team);
  assert.deepEqual(team,original);assert.deepEqual(migrated.formation,team.formation);assert.equal(migrated.captain,team.captain);
  assert.deepEqual(migrated.equipment,{weapon:{momo:FLUTE},shield:{},relic:{}});
  const storage=new Map(),adapter={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
  const open=()=>Library.create({storage:adapter,userId:'momo-migration',knownIds:f.data.cards.map(c=>c.id),normalizeDeck:T.normalize});
  const lib=open(),id='kd-12345678-1234-4234-8234-123456789abc';
  storage.set(lib.key,JSON.stringify({schema:2,edition:'V4',decks:[{id,...team}]}));
  assert.deepEqual(lib.get(id).equipment,migrated.equipment);
  assert.deepEqual(JSON.parse(storage.get(lib.key)).decks[0].equipment,migrated.equipment);
  const exported=lib.exportJSON();open().importJSON(exported,{mode:'replace'});
  const loaded=open().get(id);assert.equal(loaded.id,id);assert.equal(loaded.captain,team.captain);
  const s=f.E.newGame(loaded,migrated,{mode:'local',seed:'MOMO-MIGRATION'});
  assert.deepEqual(f.E.restoreGame(s),s);assert.equal(s.equipment.loadouts[0].weapon.momo,FLUTE);
});

for(const side of [0,1])test(`Momo side ${side}: flute ATK6 and box gift stay independent with separate names and charges`,async()=>{
  const f=await fixture(BOX,{side,kalistel:true});f.s.equipment.loadouts[side].weapon.momo=FLUTE;reload(f);
  lock(f,f.u,f.enemy);step(f,'rollAttack',6);
  assert.equal(f.s.duel.equipment.weapon,null);step(f,'acceptAttack');
  assert.equal(f.s.duel.equipment.weapon.weaponId,FLUTE);assert.equal(f.s.duel.equipment.weapon.value,30);
  step(f,'rollDefense',6);assert.equal(f.s.duel.formula.equipmentWeapon,30);
  assert.equal(grants(f).length,0);next(f);thin(f);
  duel(f);assert.equal(grants(f).length,3);assert(grants(f).every(g=>g.weaponId===BOX));
  assert.equal(f.s.duel.equipment.weapon,null);assert.equal(row(f,f.u).clovers,3);
  const used=copy(f.s.equipment.ultimates);next(f);
  duel(f,f.u,f.enemy);assert.equal(f.s.duel.formula.equipmentWeapon,30);
  assert.deepEqual(f.s.equipment.ultimates,used,'spending the box does not spend the flute');
  reload(f);
});

test('flute alone cannot emit the relic gift even when Momo is outnumbered and attacked',async()=>{
  const f=await fixture(BOX);delete f.s.equipment.loadouts[0].relic.momo;f.s.equipment.loadouts[0].weapon.momo=FLUTE;
  reload(f);thin(f);duel(f);assert.equal(grants(f).length,0);assert.equal(f.s.equipment.ultimates,undefined);
});

test('a started 4.6.24 flute ultimate retains its old slot, provenance and once-only charge',async()=>{
  const f=await fixture(BOX),old=f.s.equipment.definitions.find(w=>w.id===FLUTE);
  old.slot='relic';old.kind='relic';old.effect=copy(item(BOX).effect);old.condition='Frozen 4.6.24 flute ultimate';
  f.s.equipment.loadouts[0].relic.momo=FLUTE;f.id=FLUTE;reload(f);
  thin(f);duel(f);assert.equal(grants(f).length,3);assert(grants(f).every(g=>g.weaponId===FLUTE));
  const snapshot=copy(f.s),stats=f.E.matchStats(f.s);reload(f);
  assert.deepEqual(f.s,snapshot);assert.deepEqual(f.E.matchStats(f.s),stats);
  assert.equal(f.s.equipment.loadouts[0].weapon.momo,undefined);
  next(f);thin(f);duel(f);assert.equal(grants(f).length,3);
});

test('a started old Box defensive gift can still be chosen, consumed and restored without becoming an ultimate',async()=>{
  const f=await fixture(BOX),old=f.s.equipment.definitions.find(w=>w.id===BOX);
  old.effect=copy(Q.catalogue.legacyWeapons.find(w=>w.id===BOX).effect);reload(f);
  duel(f,f.enemy,f.ally,5);
  const choice=f.E.equipmentChoice(f.s);assert.equal(choice.weaponId,BOX);
  const recipient=choice.targets[0];step(f,'grantEquipment',recipient);
  assert.equal(f.s.equipment.ultimates,undefined);next(f);
  duel(f,f.enemy,recipient);assert.equal(f.s.duel.formula.equipmentDefense,20);
  reload(f);next(f);duel(f,f.enemy,recipient);assert.equal(f.s.duel.formula.equipmentDefense,0);
});
