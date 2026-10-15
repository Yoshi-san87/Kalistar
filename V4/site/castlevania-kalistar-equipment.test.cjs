'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),{buildCatalog}=require('../atelier/game-catalog.cjs'),{createEngine}=require('./engine.js');
const {activeFixture,setup,lock,check,deck}=require('./fixtures/castlevania-kalistar-combat.cjs');
const ultimates=require('./ultimate-definitions.js'),archive=require('./fixtures/relic-definitions-v4.6.42.json'),{withArchivedRelics}=require('./fixtures/ff9-combat.cjs');
const selection=require('../revisions/2026-10-11-castlevania-kalistar-equipment/selection.json');
const data=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const items=selection.included.map(id=>Q.catalogue.weapons.find(w=>w.id===id));

test('Castlevania / Kalistar: fourteen bounded, unique, compatible modern additions; no legacy changes',async()=>{
  const d=await data;assert.equal(items.length,14);
  assert.deepEqual(['weapon','shield','relic'].map(slot=>items.filter(w=>w.slot===slot).length),[5,5,4]);
  const numbers=Q.catalogue.weapons.flatMap(w=>w.collectible?.number?[w.collectible.number]:[]);
  assert.equal(new Set(numbers).size,numbers.length);
  for(const w of items){
    Q.validateDefinition(w);assert(Object.isFrozen(w));assert.equal(w.rulesVersion,2);
    if(w.slot==='relic'){
      assert.equal(w.effect.trigger,'ULTIMATE');assert(ultimates[w.id],w.id);
      assert.deepEqual(w.effect,ultimates[w.id].effect);assert.equal(w.condition,ultimates[w.id].condition);
      const old=archive.weapons.find(item=>item.id===w.id);assert(old,w.id);
      assert.deepEqual(w.restrictions,old.restrictions);assert.deepEqual(w.collectible,old.collectible);assert.equal(w.art,old.art);
    }else assert(w.effect.value>=20&&w.effect.value<=25);
    assert(!Q.catalogue.legacyWeapons.some(v=>v.id===w.id));assert(w.collectible.flavour.length<=50);
    const c=d.cards.find(c=>Q.compatible(w,c));assert(c,w.id);
    if(w.restrictions.characterIds)assert(!Q.compatible(w,{...c,characterId:'display-name-is-not-an-id',name:c.name}));
    if(w.restrictions.factions)assert(!Q.compatible(w,{...c,faction:'Castelvania-typo'}));
    if(w.slot==='weapon'){assert.deepEqual(w.restrictions.families,[c.weapon]);assert(!Q.compatible(w,{...c,weapon:'INVALID'}));}
  }
  const whip=items.find(w=>w.id==='castlevania-vampire-killer');
  assert.deepEqual(d.cards.filter(c=>Q.compatible(whip,c)).map(c=>c.characterId).sort(),['simon-belmont-castlevania','trevor-belmont-castlevania']);
  const hammer=items.find(w=>w.id==='kalistar-vulkar-hammer');
  assert(!Q.compatible(hammer,d.cards.find(c=>c.id==='30000004')),'Vulkar alone does not turn a sword into a hammer');
});

test('archived 4.6.42: fourteen native equipment effects activate, explain, restore and consume on both sides',async()=>{
  const d=await data,before=JSON.stringify(d);
  for(const w of items)for(const side of [0,1])activeFixture(d,w,side);
  assert.equal(JSON.stringify(d),before,'no native card, face, matrix or illustration changed');
});

test('numeric D5 never grants a direct bonus and base weapon matchups remain untouched',async()=>{
  const d=await data;
  for(const w of items.filter(w=>w.slot!=='relic')){
    const f=setup(d,w),{E,s,u,enemy}=f,a=w.slot==='weapon'?u:enemy,b=w.slot==='shield'?u:enemy;
    lock(f,a,b);E.rollAttack(s,w.slot==='weapon'?5:1);E.rollDefense(s,w.slot==='shield'?5:6);check(f);
    assert.equal(s.duel.formula[w.slot==='weapon'?'equipmentWeapon':'equipmentProtection'],0,w.id);
    assert.equal(s.duel.formula.weapon,d.weapons[E.card(a).weapon][E.card(b).weapon]||0);
  }
  const f=setup(d,items.find(w=>w.id==='kalistar-chroma-harness'),0,'40000042');
  assert.equal(f.E.card(f.u).defense[0],'dodge');
  lock(f,f.enemy,f.u);f.E.rollAttack(f.s,1);f.E.rollDefense(f.s,6);check(f);
  assert.equal(f.s.duel.equipment.protection,null,'Rikka keeps her special DEF6, never a numeric bonus');
  assert.equal(f.s.match.events[0].dodge,true);
});

test('archived 4.6.42: all native support variants are reachable and grant exactly one matching charge',async()=>{
  const d=await data,faces={ward:'guard',mana:'mana',reraise:'revive'},actions={ward:'grantGuard',mana:'grantPotion',reraise:'grantReraise'};
  const supports=archive.weapons.filter(w=>selection.included.includes(w.id)&&w.effect.event==='SUPPORT');assert.equal(supports.length,2);
  for(const w of supports)for(const key of w.effect.when.supports){
    const f=setup(d,w,0,undefined,{historicalRelics:true}),die=6-f.c.atk.indexOf(faces[key]);assert(die>=1&&die<=6);
    lock(f,f.u,f.enemy);f.E.rollAttack(f.s,die);f.E[actions[key]](f.s,f.ally.uid);check(f);
    assert.equal(f.s.equipment.defensive.grants.length,1);assert.equal(f.s.equipment.defensive.grants[0].recipient,f.ally.uid);
    assert.equal(f.E.equipmentModifier(f.s,f.ally,'DEF').value,w.effect.value);
  }
});

test('profile replacement, unique bearer, independent slots and immutable match snapshots',async()=>{
  const d=await data,whip=items[0];let p=Q.profile('cv-kal-qa');
  p=Q.equipProfile(p,'trevor-belmont-castlevania',whip.id,d.cards);
  p=Q.equipProfile(p,'simon-belmont-castlevania',whip.id,d.cards,{confirm:true});
  assert.equal(p.slots.weapon['simon-belmont-castlevania'],whip.id);assert(!p.slots.weapon['trevor-belmont-castlevania']);
  p=Q.equipProfile(p,'alucard-castlevania','castlevania-alucard-sword',d.cards);
  p=Q.equipProfile(p,'alucard-castlevania','castlevania-alucard-shield',d.cards);
  assert(p.slots.weapon['alucard-castlevania']);assert(p.slots.shield['alucard-castlevania']);
  const snapshot=Q.snapshot([p.slots,Q.emptyLoadout()],d.cards),original=JSON.stringify(snapshot);
  p.slots.weapon['alucard-castlevania']='not-an-item';assert.equal(JSON.stringify(snapshot),original);
});

test('archived 4.6.42: full native ABBA matches with every item and restore on each state',async()=>{
  const d=await data,E=withArchivedRelics(createEngine(d)),audit=require('../revisions/2026-10-09-equipment-slots/balance.cjs');
  for(const w of items){
    const c=d.cards.find(c=>Q.compatible(w,c)),loadout=Q.emptyLoadout();loadout[w.slot][c.characterId]=w.id;
    const team=audit.team(E,deck(E,[c.id]),loadout);
    for(let i=0;i<4;i++){
      const result=audit.run(E,team,team,{seed:'CV-KAL-FULL-'+w.id+'-'+i,arenaId:d.arenas[i%d.arenas.length].id,fullChecks:true,restore:true});
      assert(result.checks>10);assert(result.exchanges>0);
    }
  }
});
