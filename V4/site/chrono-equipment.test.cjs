'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),{buildCatalog}=require('../atelier/game-catalog.cjs'),{createEngine}=require('./engine.js');
const {activeFixture,setup,lock,check,next,deck}=require('./fixtures/castlevania-kalistar-combat.cjs');
const plan=require('../revisions/2026-10-11-chrono-equipment/art-plan.json');
const data=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const items=plan.objects.map(o=>Q.catalogue.weapons.find(w=>w.id===o.id));

test('Chrono Trigger: six bounded weapons, exact native bearers, unique collection numbers',async()=>{
  const d=await data;assert.equal(items.length,6);
  const numbers=Q.catalogue.weapons.flatMap(w=>w.collectible?.number?[w.collectible.number]:[]);
  assert.equal(new Set(numbers).size,numbers.length);
  for(const [i,w] of items.entries()){
    Q.validateDefinition(w);assert(Object.isFrozen(w));assert.equal(w.rulesVersion,2);
    assert.equal(w.slot,'weapon');assert.equal(w.effect.trigger,'RETAINED_SIX');
    assert(w.effect.value>=20&&w.effect.value<=25);assert(w.collectible.flavour.length<=50);
    assert(!Q.catalogue.legacyWeapons.some(v=>v.id===w.id));
    const compatible=d.cards.filter(c=>Q.compatible(w,c));assert(compatible.length>0);
    assert.deepEqual([...new Set(compatible.map(c=>c.characterId))],plan.objects[i].characters);
    const expected=d.cards.filter(c=>plan.objects[i].characters.includes(c.characterId)&&w.restrictions.families.includes(c.weapon));
    assert.deepEqual(compatible.map(c=>c.id),expected.map(c=>c.id));
    const c=compatible[0];assert.deepEqual(w.restrictions.families,[c.weapon]);
    assert(!Q.compatible(w,{...c,characterId:'same-name-is-not-an-id'}));
    assert(!Q.compatible(w,{...c,weapon:'INVALID'}));
    assert.equal(w.changesFamily,undefined);
  }
  assert(items.every(w=>!Q.compatible(w,d.cards.find(c=>c.characterId==='ayla-chrono-trigger'))));
});

test('six native weapons activate, enter actual totals and journals, restore and expire on both sides',async()=>{
  const d=await data,before=JSON.stringify(d);
  for(const w of items)for(const side of [0,1]){
    const x=activeFixture(d,w,side),E=createEngine(d),s=E.restoreGame(x.resolved),v=s.duel.formula;
    assert.equal(v.equipmentWeapon,w.effect.value);
    assert.equal(v.attack,Math.max(0,v.baseAttack+v.weapon+v.element+v.faction+v.buff+v.barrier+v.arenaAttack+(v.captainAttack||0)+v.equipmentAttack));
    assert.equal(v.weapon,d.weapons[E.card(s.players[side].board.find(u=>u.uid===x.uid)).weapon][E.byId['49901503'].weapon]||0);
    next({E,s});const u=s.players[side].board.find(u=>u?.uid===x.uid);
    assert(u);assert.equal(E.equipmentViews(s,u).find(v=>v.slot==='weapon').active,false);
    E.assertState(s);assert.deepEqual(E.restoreGame(s),s);
  }
  assert.equal(JSON.stringify(d),before,'native cards, faces, crystal properties and matchups unchanged');
});

test('D5 and Magus native Death never become equipped numeric attacks',async()=>{
  const d=await data;
  for(const w of items){
    const f=setup(d,w);lock(f,f.u,f.enemy);f.E.rollAttack(f.s,5);f.E.rollDefense(f.s,6);check(f);
    assert.equal(f.s.duel.formula.equipmentWeapon,0,w.id);
  }
  const f=setup(d,items.find(w=>w.id==='chrono-doom-scythe'));
  assert.equal(f.c.atk[4],'death');lock(f,f.u,f.enemy);f.E.rollAttack(f.s,2);f.E.rollDefense(f.s,6);check(f);
  assert.equal(f.s.duel.equipment.weapon,null);
  assert.equal(f.s.duel.formula,undefined,'Death remains special');
});

test('six profile assignments survive JSON, reject wrong bearers and preserve match snapshots',async()=>{
  const d=await data;let p=Q.profile('chrono-qa');
  for(const w of items){const c=d.cards.find(c=>Q.compatible(w,c));p=Q.equipProfile(p,c.characterId,w.id,d.cards);}
  assert.deepEqual(Q.validateProfile(JSON.parse(JSON.stringify(p)),d.cards),p);
  const snapshot=Q.snapshot([p.slots,Q.emptyLoadout()],d.cards),before=JSON.stringify(snapshot);
  assert.throws(()=>Q.equipProfile(p,'ayla-chrono-trigger',items[0].id,d.cards));
  for(const w of items){const c=d.cards.find(c=>Q.compatible(w,c));delete p.slots.weapon[c.characterId];}
  assert.equal(JSON.stringify(snapshot),before);
  assert.equal(Object.keys(Q.validateProfile(Q.profile('old-empty'),d.cards).slots.weapon).length,0);
});

test('24 complete native ABBA matches with each weapon and state restoration',async()=>{
  const d=await data,E=createEngine(d),audit=require('../revisions/2026-10-09-equipment-slots/balance.cjs');
  for(const w of items){
    const c=d.cards.find(c=>Q.compatible(w,c)),loadout=Q.emptyLoadout();loadout.weapon[c.characterId]=w.id;
    const team=audit.team(E,deck(E,[c.id]),loadout);
    for(let i=0;i<4;i++){
      const result=audit.run(E,team,team,{seed:'CHRONO-FULL-'+w.id+'-'+i,arenaId:d.arenas[i%d.arenas.length].id,fullChecks:true,restore:true});
      assert(result.checks>10);assert(result.exchanges>0);
    }
  }
});
