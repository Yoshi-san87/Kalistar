'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const {setup,lock,check,next,deck}=require('./fixtures/castlevania-kalistar-combat.cjs');
const {createEngine}=require('./engine.js'),Art=require('./weapon-art.js');
const data=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const promise=Q.catalogue.weapons.find(w=>w.id==='white-oath-rapier');
const eclipse=Q.catalogue.weapons.find(w=>w.id==='kaylis-eclipse-rapier');

test('Promesse renames only the live display, preserving legacy, art, identity and rules',()=>{
  const old=Q.catalogue.legacyWeapons.find(w=>w.id===promise.id);
  assert.equal(promise.name,'Promesse');assert.equal(old.name,'La Promesse Blanche');
  assert.equal(promise.collectible.number,'ARM-003');assert.equal(promise.art,old.art);
  assert.equal(promise.collectible.illustration,old.collectible.illustration);
  assert.deepEqual(promise.restrictions,old.restrictions);
  assert.deepEqual(promise.effect,{trigger:'RETAINED_SIX',stat:'ATK',value:20,duration:'DUEL'});
  assert.equal(Art.get(promise).scene,'white-oath-rapier-scene-v3.webp');
  assert.deepEqual(Q.catalogue.legacyWeapons,require('./fixtures/equipment-v4.5.64.json').weapons);
});
test('Eclipse is a separate collectible of equal strength, restricted to the actual short-sword Kaylis',async()=>{
  const d=await data;assert(eclipse);Q.validateDefinition(eclipse);
  assert.equal(eclipse.name,'\u00c9clipse');assert.equal(eclipse.collectible.number,'ARM-063');
  assert.deepEqual(eclipse.effect,promise.effect);assert(Object.isFrozen(eclipse.effect));
  assert(!Q.catalogue.legacyWeapons.some(w=>w.id===eclipse.id));
  assert.equal(new Set(Q.catalogue.weapons.map(w=>w.collectible?.number).filter(Boolean)).size,136);
  for(const w of [promise,eclipse]){
    const compatible=d.cards.filter(c=>Q.compatible(w,c));
    assert(compatible.some(c=>c.id==='49055457'));
    assert(compatible.every(c=>c.characterId==='kaylis'&&c.weapon==='Epée courte'));
    assert(!Q.compatible(w,d.cards.find(c=>c.id==='30000012')),'dagger edition remains incompatible');
    assert(!Q.compatible(w,{...d.cards.find(c=>c.id==='49055457'),characterId:'not-kaylis',name:'KAYLIS'}));
    assert.equal(w.changesFamily,undefined);
  }
});
test('equip, confirm replacement, persist and snapshot without losing other slots',async()=>{
  const d=await data,c=d.cards.find(c=>c.id==='49055457');
  let profile=Q.equipProfile(Q.profile('kaylis-qa'),c.characterId,promise.id,d.cards);
  const frozen=Q.snapshot([profile.slots,Q.emptyLoadout()],d.cards),before=JSON.stringify(frozen);
  assert.throws(()=>Q.equipProfile(profile,c.characterId,eclipse.id,d.cards));
  const replacement=Q.equipProfile(profile,c.characterId,eclipse.id,d.cards,{expected:promise.id,expectedProfile:profile});
  assert.equal(profile.slots.weapon.kaylis,promise.id);
  assert.equal(replacement.slots.weapon.kaylis,eclipse.id);
  assert.deepEqual(replacement.slots.shield,profile.slots.shield);assert.deepEqual(replacement.slots.relic,profile.slots.relic);
  assert.deepEqual(Q.validateProfile(JSON.parse(JSON.stringify(replacement)),d.cards),replacement);
  assert.equal(JSON.stringify(frozen),before);
  delete replacement.slots.weapon.kaylis;assert(!Q.validateProfile(replacement,d.cards).slots.weapon.kaylis);
});
test('native combat on either side: exact +20 ATK, unchanged family matchup, logs, reload and expiration',async()=>{
  const d=await data,before=JSON.stringify(d);
  for(const w of [promise,eclipse])for(const side of [0,1]){
    const f=setup(d,w,side),{E,s,u,enemy}=f;
    const saved=E.clone(s);saved.equipment.definitions.find(x=>x.id===w.id).name='Archived rapier name';
    assert.equal(E.restoreGame(saved).equipment.definitions.find(x=>x.id===w.id).name,'Archived rapier name');
    const active=()=>E.equipmentViews(s,u).find(v=>v.slot==='weapon').active;
    assert.equal(active(),false);lock(f,u,enemy);E.rollAttack(s,6);
    assert(active());check(f);E.rollDefense(s,6);check(f);
    const v=s.duel.formula;assert.equal(v.equipmentWeapon,20);
    assert.equal(v.attack,Math.max(0,['baseAttack','weapon','element','faction','buff','barrier','arenaAttack','equipmentAttack','captainAttack','ultimateAttack'].reduce((n,k)=>n+(v[k]||0),0)));
    assert.equal(v.weapon,d.weapons[E.card(u).weapon][E.card(enemy).weapon]);
    assert(s.log.some(row=>row.text.includes(w.name)));
    next(f);assert.equal(active(),false);
    const noSix=setup(d,w,side);lock(noSix,noSix.u,noSix.enemy);
    noSix.E.rollAttack(noSix.s,5);noSix.E.rollDefense(noSix.s,6);check(noSix);
    assert.equal(noSix.s.duel.formula.equipmentWeapon,0);
  }
  assert.equal(JSON.stringify(d),before);
});
test('eight complete native matches preserve valid states through reloads',async()=>{
  const d=await data,E=createEngine(d),audit=require('../revisions/2026-10-09-equipment-slots/balance.cjs');
  for(const w of [promise,eclipse]){
    const loadout=Q.emptyLoadout();loadout.weapon.kaylis=w.id;
    const team=audit.team(E,deck(E,['49055457']),loadout);
    for(let i=0;i<4;i++){
      const result=audit.run(E,team,team,{seed:'KAYLIS-'+w.id+'-'+i,arenaId:d.arenas[i%d.arenas.length].id,fullChecks:true,restore:true});
      assert(result.checks>10);assert(result.exchanges>0);
    }
  }
});
