'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),C=require('./weapon-cards.js'),T=require('./team-composition.js');
const {createEngine}=require('./engine.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const published=require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created');
const dataPromise=buildCatalog({published});
const ids=['arborium-twinstring-bow','arborium-thorn-dagger'];
const weapons=ids.map(id=>Q.catalogue.weapons.find(w=>w.id===id));
// State-triggered combat below is an archived 4.5.64 regression, not a new-game rule.
const archive=require('./fixtures/equipment-v4.5.64.json');
const historical=ids.map(id=>archive.weapons.find(w=>w.id===id));
const allowed={'arborium-twinstring-bow':['saelor-kalistar','ssilas'],'arborium-thorn-dagger':['maelor-kalistar']};

test('Arborium equipment requires its exact faction AND base family, regardless of job or displayed name',async()=>{
  const data=await dataPromise;
  for(const w of weapons){
    Q.validateDefinition(w);
    assert.deepEqual(w.restrictions,{factions:['Arborium'],families:[w.family]});
    assert.deepEqual([...new Set(data.cards.filter(c=>Q.compatible(w,c)).map(c=>c.characterId))].sort(),allowed[w.id]);
    const c={...data.cards.find(c=>c.characterId==='saelor-kalistar'),weapon:w.family};
    assert(Q.compatible(w,{...c,name:'Another display name'}));
    for(const job of ['ECLAIREUR','GARDIENNE','BOTANISTE',undefined])assert(Q.compatible(w,{...c,job}));
    for(const overrides of [{faction:'Durane'},{faction:undefined},{faction:'ARBORIUM'}])assert(!Q.compatible(w,{...c,...overrides}),JSON.stringify(overrides));
    for(const c of data.cards)assert.equal(Q.compatible(w,c),c.faction==='Arborium'&&c.weapon===w.family);
    const rendered=C.markup(w,{cards:data.cards});assert(!rendered.includes('SOLDAT'));assert(rendered.includes('Arborium'));
    assert(!rendered.includes('undefined'));assert(C.bearers(w,data.cards).some(g=>g.label==='Faction'&&g.names==='Arborium'));
  }
});

test('faction restriction validation rejects missing, empty, oversized and unknown categories',()=>{
  const w=weapons[0];
  for(const factions of [null,[], 'Arborium', [null], [''], ['A'.repeat(81)]])assert.throws(()=>Q.validateDefinition({...w,restrictions:{jobs:['SOLDAT'],factions}}));
  assert.throws(()=>Q.validateDefinition({...w,restrictions:{faction:['Arborium']}}));
  assert.throws(()=>Q.validateDefinition({...w,changesFamily:true}));
});

test('equipment profile persists one weapon per faction member and rejects incompatible assignments',async()=>{
  const {cards}=await dataPromise;let row=Q.profile('arborium-only-test');
  row=Q.equipProfile(row,'saelor-kalistar',ids[0],cards);
  const before=structuredClone(row);
  assert.throws(()=>Q.equipProfile(row,'saelor-kalistar',ids[1],cards),/incompatible/);
  assert.deepEqual(row,before);
  assert.throws(()=>Q.equipProfile(row,'saelor-kalistar',ids[1],cards,{expected:ids[0],expectedProfile:before}),/incompatible/);
  row=Q.equipProfile(row,'ssilas',ids[0],cards);
  assert.deepEqual(row.slots.weapon,{'ssilas':ids[0]});
  assert.deepEqual(Q.validateProfile(JSON.parse(JSON.stringify(row)),cards),row);
  for(const w of weapons)for(const c of cards.filter(c=>!Q.compatible(w,c))){
    // A character can have multiple editions; profile equipment is allowed if ANY is compatible.
    if(cards.some(v=>v.characterId===c.characterId&&Q.compatible(w,v)))continue;
    assert.throws(()=>Q.equipProfile(row,c.characterId,w.id,cards),/incompatible/);
    assert.throws(()=>Q.validateLoadout({[c.characterId]:w.id},cards));
  }
});

test('team compositions validate the selected edition; old equipment snapshots stay valid',async()=>{
  const data=await dataPromise,E=createEngine(data),teams=T.create(E),carrier=data.cards.find(c=>c.characterId==='saelor-kalistar');
  const base=data.decks.player,deck=base.map((_,i)=>base.map((id,j)=>i===j?carrier.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);
  assert(deck);
  const team=teams.equip(teams.fromPreset({name:'Arborium test',cards:deck}),carrier.id,ids[0]);
  assert.equal(team.equipment.weapon[carrier.characterId],ids[0]);assert.deepEqual(E.validateComposition(team),[]);
  const state=E.newGame(team,team,{seed:'ARBORIUM-TEST',mode:'local'}),copy=structuredClone(state.equipment);
  team.equipment.weapon[carrier.characterId]=ids[1];
  assert.deepEqual(state.equipment,copy);assert.deepEqual(E.restoreGame(state),state);
  const unequipped=E.newGame(data.decks.player,data.decks.player,{seed:'UNEQUIPPED-ARBORIUM',mode:'local'});
  assert.equal(unequipped.equipment,undefined);assert.deepEqual(E.restoreGame(unequipped),unequipped);
  const legacy=E.newGame(data.decks.player,data.decks.player,{seed:'LEGACY-ARBORIUM',mode:'local',equipment:[{},{}]});
  legacy.equipment.definitions=legacy.equipment.definitions.filter(w=>!ids.includes(w.id));
  assert.deepEqual(E.restoreGame(legacy),legacy,'a saved match without the two new definitions is not upgraded');
});

test('archived 4.5.64: Arborium state bonuses on either side survive formulas, logs and reloads',async()=>{
  const data=await dataPromise,E=createEngine(data);
  assert.deepEqual(Q.catalogue.legacyWeapons,archive.weapons);
  for(const w of historical)for(const characterId of allowed[w.id])for(const side of [0,1]){
    const c=data.cards.find(c=>c.characterId===characterId),base=data.decks.player;
    const deck=base.map((_,i)=>base.map((id,j)=>i===j?c.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);assert(deck);
    const loadout={[characterId]:w.id},s=E.newGame(deck,deck,{mode:'local',seed:'ARBORIUM-'+w.id+side,kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
    const p=s.players[side],u=p.reserve.find(u=>u.cardId===c.id);
    E.autoDeploy(s,0);E.autoDeploy(s,1);
    if(!p.board.includes(u)){const slot=c.positions[0]-1;E.recall(s,side,slot);E.deploy(s,side,u.uid,slot);}E.start(s);
    assert.equal(E.equipmentView(s,u).active,false);assert.equal(E.equipmentModifier(s,u,'ATK'),null);
    const initial=E.clone(s);
    if(w.effect.when.outnumbered){const i=p.board.findIndex(v=>v&&v!==u);p.reserve.push(p.board[i]);p.board[i]=null;}
    else{p.reserve.forEach(v=>v.entered=true);p.dead.push(...p.reserve);p.reserve=[];}
    E.assertState(s);assert(E.equipmentView(s,u).active);assert.equal(E.equipmentModifier(s,u,'ATK').value,20);
    const recovered=E.clone(s);recovered.players=initial.players;
    assert.equal(E.equipmentView(recovered,recovered.players[side].board.find(v=>v?.uid===u.uid)).active,false);
    const inactive=E.clone(s);inactive.phase='over';assert.equal(E.equipmentView(inactive,inactive.players[side].board.find(v=>v?.uid===u.uid)).active,false);
    const target=s.players[1-side].board.find(Boolean);s.turn=side;
    E.lock(s,p.board.indexOf(u),s.players[1-side].board.indexOf(target));
    E.rollAttack(s,6-E.card(u).atk.findIndex(v=>typeof v==='number'));
    E.rollDefense(s,6-E.card(target).defense.findIndex(v=>typeof v==='number'));
    const f=s.duel.formula;assert(f);assert.equal(f.equipmentAttack,20);assert.equal(f.equipmentDefense,0);
    assert.equal(f.attack,Math.max(0,f.baseAttack+f.weapon+f.element+f.faction+f.buff+f.barrier+f.arenaAttack+(f.captainAttack||0)+20));
    assert.equal(f.weapon,data.weapons[c.weapon][E.card(target).weapon]);
    assert(s.log.some(l=>l.text.includes(w.name)&&l.text.includes('+20 ATK')));
    E.assertState(s);assert.deepEqual(E.restoreGame(s),s);assert.deepEqual(s.equipment.pending,{});
  }
});

test('previous soldier-only match definitions are preserved, without retroactive broadening',async()=>{
  const data=await dataPromise,E=createEngine(data),c=data.cards.find(c=>c.characterId==='saelor-kalistar'),base=data.decks.player;
  const deck=base.map((_,i)=>base.map((id,j)=>i===j?c.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);
  const s=E.newGame(deck,deck,{mode:'local',equipment:[{[c.characterId]:ids[0]},{}]});
  for(const w of s.equipment.definitions.filter(w=>ids.includes(w.id)))w.restrictions={jobs:['SOLDAT'],factions:['Arborium']};
  const copy=structuredClone(s),mirelle=data.cards.find(c=>c.characterId==='mirelle');
  assert.deepEqual(E.restoreGame(s),copy);
  assert(!Q.compatible(s.equipment.definitions.find(w=>w.id===ids[0]),mirelle));
  assert(!Q.compatible(weapons[0],mirelle));
});

test('4.6 weapons use retained ATK six; archived state conditions remain explicit and unchanged',()=>{
  assert.deepEqual(weapons.map(w=>[w.family,w.slot,w.rulesVersion,w.effect]),[['Arc','weapon',2,{trigger:'RETAINED_SIX',stat:'ATK',value:20,duration:'DUEL'}],['Dague','weapon',2,{trigger:'RETAINED_SIX',stat:'ATK',value:20,duration:'DUEL'}]]);
  assert.deepEqual(historical.map(w=>[w.family,w.effect.stat,w.effect.value,w.effect.duration]),[['Arc','ATK',20,'WHILE_TRUE'],['Dague','ATK',20,'WHILE_TRUE']]);
  assert.deepEqual(historical[0].effect.when,{outnumbered:true});assert.deepEqual(historical[1].effect.when,{reserveAtMost:0});
  assert(historical.every(w=>w.effect.trigger==='TEAM_STATE'&&!w.changesFamily));
  assert(weapons.every(w=>!w.changesFamily));
  assert.equal(new Set(weapons.map(w=>w.collectible.number)).size,2);
});
