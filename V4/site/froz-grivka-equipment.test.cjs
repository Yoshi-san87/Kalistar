'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),{createEngine}=require('./engine.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const {setup,lock,check,deck}=require('./fixtures/castlevania-kalistar-combat.cjs');
const {fixture}=require('./fixtures/froz-grivka-combat.cjs');
const plan=require('../revisions/2026-10-13-froz-grivka-equipment/art-plan.json');
const data=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const items=plan.objects.map(o=>Q.catalogue.weapons.find(w=>w.id===o.id));
test('ten faction items: real matching bearers, unique numbers and frozen definitions',async()=>{
  const d=await data,numbers=Q.catalogue.weapons.flatMap(w=>w.collectible?.number?[w.collectible.number]:[]);
  assert.equal(items.length,10);assert.equal(new Set(numbers).size,numbers.length);
  for(const [i,w] of items.entries()){
    Q.validateDefinition(w);assert(Object.isFrozen(w));assert(Object.isFrozen(w.effect));
    assert.equal(w.rulesVersion,2);assert(!Q.catalogue.legacyWeapons.some(old=>old.id===w.id));
    assert.deepEqual(w.restrictions.factions,[plan.objects[i].faction]);
    assert(w.collectible.flavour.length<=50);
    const compatible=d.cards.filter(c=>Q.compatible(w,c));assert(compatible.length>0,w.id);
    for(const c of compatible){
      assert.equal(c.faction,plan.objects[i].faction);
      assert(!Q.compatible(w,{...c,faction:'Durane'}));
      if(w.slot==='weapon'){
        assert.equal(c.weapon,w.family);assert(!Q.compatible(w,{...c,weapon:'Instrument'}));
        assert.equal(w.changesFamily,undefined);assert([20,25].includes(w.effect.value));
      }
    }
    if(w.slot==='relic')assert.equal(w.effect.duration,'ONCE_MATCH');
  }
  assert.equal(d.cards.filter(c=>Q.compatible(items[2],c)).length,2);
  assert.equal(d.cards.filter(c=>Q.compatible(items[5],c)).length,2);
});
test('ten native equipment activations on BOTH sides: totals, logs, reload and consumption',async()=>{
  const d=await data,before=JSON.stringify(d);
  for(const w of items)for(const side of [0,1]){
    const f=fixture(d,w,side),E=createEngine(d),s=E.restoreGame(f.resolved),v=s.duel.formula;
    const atk=['baseAttack','weapon','element','faction','buff','barrier','arenaAttack','equipmentAttack','captainAttack','ultimateAttack'];
    const def=['baseDefense','race','arenaDefense','ward','equipmentDefense','captainDefense','ultimateDefense'];
    assert.equal(v.attack,Math.max(0,atk.reduce((n,k)=>n+(v[k]||0),0)),w.id);
    assert.equal(v.defense,Math.max(0,def.reduce((n,k)=>n+(v[k]||0),0)),w.id);
    for(const state of [f.inactive,f.state,f.resolved]){E.assertState(state);assert.deepEqual(E.restoreGame(state),state);}
    const u=f.state.players[side].board.find(u=>u?.uid===f.uid);
    assert(E.equipmentViews(f.state,u).some(v=>v.weapon?.id===w.id&&(v.active||v.ready)),w.id);
    assert(s.log.some(row=>row.text.includes(w.name)),w.id);
  }
  assert.equal(JSON.stringify(d),before,'native art, profiles, faces and matchup table stay unchanged');
});
test('D5 does not trigger weapon or protection; special faces remain special',async()=>{
  const d=await data;
  for(const w of items.filter(w=>w.slot!=='relic')){
    const f=setup(d,w),weapon=w.slot==='weapon';
    lock(f,weapon?f.u:f.enemy,weapon?f.enemy:f.u);
    f.E.rollAttack(f.s,weapon?5:1);if(f.s.phase==='defense')f.E.rollDefense(f.s,weapon?6:5);
    check(f);
    assert.equal(f.s.duel.formula?.[weapon?'equipmentWeapon':'equipmentProtection']||0,0,w.id);
  }
  const f=setup(d,items[1]);lock(f,f.u,f.enemy);f.E.rollAttack(f.s,2);f.E.rollDefense(f.s,6);check(f);
  assert.equal(f.s.duel.formula,undefined,'Taevrik Death does not become a numeric bonus');
});
test('all assignments persist, wrong factions rejected, replacing does not alter a match snapshot',async()=>{
  const d=await data;
  for(const w of items){
    const c=d.cards.find(c=>Q.compatible(w,c));let p=Q.equipProfile(Q.profile('fg-qa'),c.characterId,w.id,d.cards);
    assert.deepEqual(Q.validateProfile(JSON.parse(JSON.stringify(p)),d.cards),p);
    const frozen=Q.snapshot([p.slots,Q.emptyLoadout()],d.cards),before=JSON.stringify(frozen);
    delete p.slots[w.slot][c.characterId];assert.equal(JSON.stringify(frozen),before);
    assert.throws(()=>Q.equipProfile(Q.profile('fg-qa'),'momo',w.id,d.cards));
  }
});
test('relic card text distinguishes magical preparation and magical consumption',()=>{
  const UI=require('./ultimate-ui.js'),band=UI.presentation(items[9]),mask=UI.presentation(items[8]);
  assert.match(band.condition,/attaque magique/);assert.match(band.duration,/ATK magique/);
  assert.match(mask.condition,/infériorité/);assert.equal(mask.label,'+40 DEF');
});
test('40 full native ABBA matches with reload after every action',async()=>{
  const d=await data,E=createEngine(d),audit=require('../revisions/2026-10-09-equipment-slots/balance.cjs');
  for(const w of items){
    const c=d.cards.find(c=>Q.compatible(w,c)),loadout=Q.emptyLoadout();loadout[w.slot][c.characterId]=w.id;
    const team=audit.team(E,deck(E,[c.id]),loadout);
    for(let i=0;i<4;i++){
      const result=audit.run(E,team,team,{seed:'FG-FULL-'+w.id+'-'+i,arenaId:d.arenas[i%d.arenas.length].id,fullChecks:true,restore:true});
      assert(result.checks>10);assert(result.exchanges>0);
    }
  }
});
