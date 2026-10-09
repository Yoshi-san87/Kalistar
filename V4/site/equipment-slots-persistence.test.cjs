'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildCatalog}=require('../atelier/game-catalog.cjs');
const {createEngine}=require('./engine.js'),Q=require('./equipment.js');
const Composition=require('./team-composition.js'),Library=require('./deck-library.js');
const dataPromise=buildCatalog();
async function fixture(defaults=()=>Q.emptyLoadout()){
  const data=await dataPromise,E=createEngine(data),T=Composition.create(E,defaults);
  const team=T.normalize({name:'Trois emplacements',cards:data.decks.player});team.captain=team.formation[0];
  const card=id=>data.cards.find(c=>c.characterId===id);
  return {data,E,T,team,card};
}
function library(E,T){
  const storage=new Map(),adapter={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
  const open=()=>Library.create({storage:adapter,userId:'equipment-460',knownIds:E.data.cards.map(c=>c.id),normalizeDeck:T.normalize});
  return {storage,open,lib:open()};
}
const deckId='kd-12345678-1234-4234-8234-123456789abc';

test('three-slot defaults are snapshotted once without borrowing other characters or objects',async()=>{
  const defaults=Q.emptyLoadout();defaults.weapon.balmhyr='fallen-king-axe';defaults.shield.balmhyr='durane-rampart';defaults.relic.balmhyr='exiled-king-seal';
  const {T,team}=await fixture(()=>defaults);
  assert.deepEqual(team.equipment,defaults);defaults.weapon.balmhyr='unknown';
  assert.equal(T.normalize(team).equipment.weapon.balmhyr,'fallen-king-axe');
  defaults.weapon.balmhyr='fallen-king-axe';
  const partial=T.normalize({name:'Vide',cards:[]});assert.deepEqual(partial.equipment,Q.emptyLoadout());
});

test('legacy flat loadouts migrate by actual category while retaining formation and captain',async()=>{
  const {T,team}=await fixture();
  for(const [id,slot] of [['fallen-king-axe','weapon'],['durane-rampart','shield'],['exiled-king-seal','relic']]){
    const legacy={...team,equipment:{balmhyr:id}},next=T.normalize(legacy);
    assert.equal(next.equipment[slot].balmhyr,id);assert.deepEqual(next.cards,team.cards);
    assert.deepEqual(next.formation,team.formation);assert.equal(next.captain,team.captain);
    assert.deepEqual(T.normalize(next),next);
  }
});

test('profile migration rejects corrupt versions and extra legacy slots without changing the source',async()=>{
  const {data}=await fixture(),legacy={id:'qa-profile',version:1,slots:{weapon:{balmhyr:'fallen-king-axe',momo:'little-joys-flute'}}};
  const before=structuredClone(legacy),next=Q.reconcileProfile(legacy,data.cards);
  assert.equal(next.version,2);assert.equal(next.slots.weapon.balmhyr,'fallen-king-axe');assert.equal(next.slots.relic.momo,'little-joys-flute');
  assert.deepEqual(legacy,before);
  assert.throws(()=>Q.reconcileProfile({...next,version:99},data.cards),/quipement/);
  assert.throws(()=>Q.reconcileProfile({...legacy,slots:{...legacy.slots,job:{}}},data.cards),/quipement/);
});

test('weapon, protection and relic coexist; clicked removal cannot erase another slot',async()=>{
  const {T,team,card}=await fixture(),id=card('balmhyr').id;
  let next=T.equip(team,id,'fallen-king-axe');next=T.equip(next,id,'durane-rampart');next=T.equip(next,id,'exiled-king-seal');
  assert.equal(Q.items(next.equipment).length,3);assert.deepEqual(team.equipment,Q.emptyLoadout());
  const removed=T.equip(next,id,null,{slot:'shield',expected:'durane-rampart'});
  assert.deepEqual(removed.equipment.shield,{});assert.equal(removed.equipment.weapon.balmhyr,'fallen-king-axe');
  assert.equal(removed.equipment.relic.balmhyr,'exiled-king-seal');assert.equal(next.equipment.shield.balmhyr,'durane-rampart');
});

test('transfers and replacements are scoped to the clicked category, with one wearer per item',async()=>{
  const {T,team,card}=await fixture();let next=T.equip(team,card('balmhyr').id,'fallen-king-axe');
  next=T.equip(next,card('balmhyr').id,'durane-rampart');next=T.equip(next,card('balmhyr').id,'exiled-king-seal');
  next=T.equip(next,card('lok').id,'durane-rampart');assert.equal(next.equipment.shield.balmhyr,undefined);
  assert.equal(next.equipment.shield.lok,'durane-rampart');assert.equal(next.equipment.weapon.balmhyr,'fallen-king-axe');
  next=T.equip(next,card('momo').id,'little-joys-flute');next=T.equip(next,card('momo').id,'little-joys-box');
  assert.equal(next.equipment.relic.momo,'little-joys-box');assert.equal(next.equipment.relic.balmhyr,'exiled-king-seal');
});

test('stale confirmations reject both target-slot changes and unrelated composition changes',async()=>{
  const {T,team,card}=await fixture(),id=card('balmhyr').id;
  const before=structuredClone(team.equipment),next=T.equip(team,id,'fallen-king-axe');
  assert.throws(()=>T.equip(next,id,'fallen-king-axe',{expected:null}),/change/);
  assert.throws(()=>T.equip(next,id,'durane-rampart',{expected:null,expectedLoadout:before}),/change/);
  assert.throws(()=>T.equip(next,id,null,{slot:'weapon',expected:'durane-rampart'}),/change/);
  assert.equal(next.equipment.weapon.balmhyr,'fallen-king-axe');
});

test('stable character and Job compatibility remain enforced rather than display-name matching',async()=>{
  const {T,team,data,card}=await fixture();
  assert.throws(()=>T.equip(team,card('momo').id,'fallen-king-axe'),/incompatible/);
  const axe=Q.catalogue.weapons.find(w=>w.id==='fallen-king-axe'),job={...axe,id:'mentor-test-axe',restrictions:{jobs:['MENTOR'],families:['Hache']}};
  let row=Q.profile('qa');row=Q.equipProfile(row,card('balmhyr').characterId,job.id,data.cards,{},[job]);
  assert.equal(row.slots.weapon.balmhyr,job.id);
  assert.throws(()=>Q.equipProfile(Q.profile('qa'),'BALMHYR',job.id,data.cards,{},[job]),/incompatible/);
  assert.throws(()=>Q.equipProfile(Q.profile('qa'),'momo',job.id,data.cards,{},[job]),/incompatible/);
});

test('card edits prune every departed character slot, but reject corrupt equipment before editing',async()=>{
  const {T,team,card}=await fixture(),id=card('balmhyr').id;
  let next=T.equip(team,id,'fallen-king-axe');next=T.equip(next,id,'durane-rampart');next=T.equip(next,id,'exiled-king-seal');
  const values=T.slots(next);values[values.indexOf(id)]=null;
  assert.deepEqual(T.edit(next,values).equipment,Q.emptyLoadout());assert.equal(Q.items(next.equipment).length,3);
  const corrupt=structuredClone(next);corrupt.equipment.relic.balmhyr='unknown';
  assert.throws(()=>T.edit(corrupt,values),/quipement/);
  const wrongSlot=structuredClone(next);wrongSlot.equipment.weapon.momo='little-joys-box';
  assert.throws(()=>T.normalize(wrongSlot),/quipement/);
});

test('schema 1 and schema 2 flat imports migrate durably; exports remain schema 2',async()=>{
  const {E,T,team}=await fixture(),{storage,lib,open}=library(E,T);
  storage.set(lib.key,JSON.stringify({schema:1,edition:'V4',decks:[{id:deckId,name:team.name,cards:team.cards}]}));
  assert.deepEqual(lib.get(deckId).equipment,Q.emptyLoadout());assert.equal(JSON.parse(storage.get(lib.key)).schema,2);
  storage.set(lib.key,JSON.stringify({schema:2,edition:'V4',decks:[{id:deckId,...team,equipment:{balmhyr:'durane-rampart'}}]}));
  assert.equal(open().get(deckId).equipment.shield.balmhyr,'durane-rampart');
  assert.equal(JSON.parse(storage.get(lib.key)).decks[0].equipment.shield.balmhyr,'durane-rampart');
  const exported=lib.exportJSON();assert.equal(JSON.parse(exported).schema,2);
  lib.importJSON(exported,{mode:'replace'});assert.equal(open().get(deckId).equipment.shield.balmhyr,'durane-rampart');
  const bad=JSON.parse(exported);bad.decks[0].equipment.shield.momo='durane-rampart';
  assert.throws(()=>lib.importJSON(JSON.stringify(bad),{mode:'replace'}));assert.equal(lib.exportJSON(),exported);
});

test('schema 2 saves, duplication and returned drafts never share equipment maps',async()=>{
  const {E,T,team,card}=await fixture(),{lib,open}=library(E,T);
  let next=T.equip(team,card('balmhyr').id,'fallen-king-axe');next=T.equip(next,card('balmhyr').id,'durane-rampart');
  const saved=lib.save(next),duplicate=lib.duplicate(saved.id),loaded=open().get(saved.id);
  loaded.equipment.weapon.balmhyr='unknown';duplicate.equipment.shield.balmhyr='unknown';next.equipment.weapon.balmhyr='unknown';
  assert.equal(lib.get(saved.id).equipment.weapon.balmhyr,'fallen-king-axe');
  assert.equal(lib.get(duplicate.id).equipment.shield.balmhyr,'durane-rampart');
});

test('a match retains its three-slot equipment snapshot after profile and deck edits',async()=>{
  const {E,T,team,card}=await fixture();let next=T.equip(team,card('balmhyr').id,'fallen-king-axe');
  next=T.equip(next,card('balmhyr').id,'durane-rampart');next=T.equip(next,card('balmhyr').id,'exiled-king-seal');
  const match=E.newGame(next,team,{mode:'local',seed:'SLOTS-460',kalistel:false}),snapshot=structuredClone(match.equipment);
  next.equipment.weapon.balmhyr='unknown';next.equipment.shield={};
  assert.equal(match.equipment.version,2);assert.deepEqual(match.equipment,snapshot);
  assert.deepEqual(E.restoreGame(match).equipment,snapshot);
});
