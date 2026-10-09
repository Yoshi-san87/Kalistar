'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),{buildCatalog}=require('../atelier/game-catalog.cjs'),{createEngine}=require('./engine.js');
const {activeFixture,setup,lock,check,ids}=require('./fixtures/gotham-combat.cjs');
const selection=require('../revisions/2026-10-09-gotham-equipment/selection.json');
const data=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const items=Q.catalogue.weapons.filter(w=>w.id.startsWith('gotham-'));
test('Gotham: twelve complete personal items, stable IDs, base-family restrictions and bounded bonuses',async()=>{
  const d=await data;
  assert.deepEqual(items.map(w=>w.id),selection.included);
  assert.deepEqual(['weapon','shield','relic'].map(slot=>items.filter(w=>w.slot===slot).length),[4,3,5]);
  for(const w of items){
    Q.validateDefinition(w);assert(w.effect.value>=20&&w.effect.value<=30);assert(Object.isFrozen(w));
    const bearer=d.cards.find(c=>Q.compatible(w,c));assert(bearer,w.id);
    assert(!Q.compatible(w,{...bearer,characterId:'spoof',name:bearer.name}));
    assert.deepEqual(w.restrictions.characterIds,[bearer.characterId]);
    if(w.slot==='weapon'){assert.deepEqual(w.restrictions.families,[bearer.weapon]);assert(!Q.compatible(w,{...bearer,weapon:'INVALID'}));}
    assert(!Q.catalogue.legacyWeapons.some(v=>v.id===w.id));
  }
  for(const {id} of selection.excluded)assert(!Q.catalogue.weapons.some(w=>w.id===id));
});
test('Gotham: actual native cards activate, explain, restore and consume all twelve effects on both sides',async()=>{
  const d=await data,before=JSON.stringify(d);
  for(const w of items)for(const side of [0,1])activeFixture(d,w,side);
  assert.equal(JSON.stringify(d),before,'native cards never modified');
});
test('Gotham: ordinary D5 never grants a direct bonus; snapshots are isolated and reject oversized or duplicate definitions',async()=>{
  const d=await data;
  for(const w of items.filter(w=>w.slot!=='relic')){
    const f=setup(d,w),{E,s,u,enemy}=f;lock(f,w.slot==='weapon'?u:enemy,w.slot==='shield'?u:enemy);
    E.rollAttack(s,w.slot==='weapon'?5:6);E.rollDefense(s,w.slot==='shield'?5:6);check(f);
    assert.equal(s.duel.formula[w.slot==='weapon'?'equipmentWeapon':'equipmentProtection'],0,w.id);
    for(const change of [s=>s.equipment.definitions.push(s.equipment.definitions[0])]){
      const clone=E.clone(s);change(clone);assert.throws(()=>E.restoreGame(clone));
    }
  }
  let p=Q.profile('gotham');for(const w of items)p=Q.equipProfile(p,w.restrictions.characterIds[0],w.id,d.cards);
  const snap=Q.snapshot([p.slots,Q.emptyLoadout()],d.cards),frozen=JSON.stringify(snap);
  p.slots.weapon['mr-freeze-batman']='invalid';assert.equal(JSON.stringify(snap),frozen);
  const f=setup(d,items[0]),bounded=f.E.clone(f.s);
  while(bounded.equipment.definitions.length<512)bounded.equipment.definitions.push({...structuredClone(items[0]),id:'qa-limit-'+bounded.equipment.definitions.length});
  assert.deepEqual(f.E.restoreGame(bounded),bounded,'512 distinct valid definitions remain bounded and readable');
  bounded.equipment.definitions.push({...structuredClone(items[0]),id:'qa-limit-513'});
  assert.throws(()=>f.E.restoreGame(bounded),'513 distinct otherwise-valid definitions exceed the snapshot quota');
});
test('Gotham: full native ABBA matches preserve all units, base matchups, three slots and reloads',async()=>{
  const d=await data,E=createEngine(d),audit=require('../revisions/2026-10-09-equipment-slots/balance.cjs');
  const outfit=Q.emptyLoadout();for(const w of items)outfit[w.slot][w.restrictions.characterIds[0]]=w.id;
  const team=audit.team(E,ids,outfit);
  for(let i=0;i<16;i++){
    const result=audit.run(E,team,team,{seed:'GOTHAM-FULL-'+i,arenaId:d.arenas[i%d.arenas.length].id,fullChecks:true,restore:true});
    assert(result.checks>10);assert(result.exchanges>0);
  }
});
