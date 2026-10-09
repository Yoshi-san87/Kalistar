'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),C=require('./weapon-cards.js'),T=require('./team-composition.js');
const {createEngine}=require('./engine.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const dataPromise=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const id='rhinoz-ancestral-horn',w=Q.catalogue.weapons.find(w=>w.id===id);
const archive=require('./fixtures/equipment-v4.5.64.json');
const {legacyGame,weapons:previous}=require('./fixtures/legacy-equipment.cjs');
function legacyRhinoz(data){
  return ['belrog','nazar','gilmarr'].map(characterId=>{
    const cards=data.cards.filter(c=>c.characterId===characterId);
    assert.equal(cards.length,1);assert.equal(cards[0].race,'RHINOZ');return cards[0];
  });
}
function deckFor(E,data,c){
  const base=data.decks.player,deck=base.map((_,i)=>base.map((id,j)=>i===j?c.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);
  assert(deck,c.id);return deck;
}
function fixture(data,c,side=0){
  const E=createEngine(data),deck=deckFor(E,data,c),loadout={[c.characterId]:id};
  const s=legacyGame(E,deck,deck,{seed:'RHINOZ-TEST',mode:'local',kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
  E.autoDeploy(s,0);E.autoDeploy(s,1);const p=s.players[side],a=[...p.board.filter(Boolean),...p.reserve].find(u=>u.cardId===c.id);
  if(!p.board.includes(a)){E.recall(s,side,0);E.deploy(s,side,a.uid,0);}E.start(s);
  return {E,s,p,a,side};
}
function activate(f){const i=f.p.board.findIndex(u=>u&&u!==f.a);f.p.reserve.push(f.p.board[i]);f.p.board[i]=null;f.E.assertState(f.s);}

test('Rhinoz axe requires Hache as printed family; no current Rhinoz matches',async()=>{
  const data=await dataPromise;Q.validateDefinition(w);assert.deepEqual(w.restrictions,{races:['RHINOZ'],families:['Hache']});
  assert.deepEqual(data.cards.filter(c=>Q.compatible(w,c)),[]);
  const c={...data.cards.find(c=>c.characterId==='belrog'),weapon:'Hache'};
  assert(Q.compatible(w,{...c,name:'Other',job:'Other',faction:'Other',characterId:'future-rhinoz'}));
  for(const race of [undefined,'Rhinoz','RHINOZ ','NAIN','SKULLZ'])assert(!Q.compatible(w,{...c,race}));
  assert(!Q.compatible(w,{...c,weapon:'Masse'}));assert(!Q.compatible(w,null));
  const html=C.markup(w,{cards:data.cards});assert(html.includes('Race : RHINOZ'));assert(!html.includes('undefined'));
});

test('race arrays combine with other restrictions using AND, validate strictly and leave old definitions valid',async()=>{
  const data=await dataPromise,c=data.cards.find(c=>c.characterId==='nazar');
  const mixed={...w,restrictions:{races:['RHINOZ','NAIN'],jobs:['GARDIEN'],factions:['Zarok'],families:['Lance']}};
  Q.validateDefinition(mixed);assert(Q.compatible(mixed,c));assert(Q.compatible(mixed,{...c,race:'NAIN'}));
  for(const [key,value] of [['race','ROBOT'],['job','SOLDAT'],['faction','Durane'],['weapon','Hache']])assert(!Q.compatible(mixed,{...c,[key]:value}));
  for(const races of [[],null,'RHINOZ',[null],[1],[''],['x'.repeat(81)],Array(101).fill('RHINOZ')])
    assert.throws(()=>Q.validateDefinition({...w,restrictions:{races}}));
  assert.throws(()=>Q.validateDefinition({...w,restrictions:{race:['RHINOZ']}}));
  for(const old of Q.catalogue.weapons.filter(x=>x.id!==id))Q.validateDefinition(old);
});

test('legacy Rhinoz profile/composition is repaired, while saved match snapshots stay unchanged',async()=>{
  const data=await dataPromise,E=createEngine(data),team=T.create(E);
  // A legacy profile is decoded as version 1, not constructed with today's three-slot API.
  const p={id:'RHINOZ-TEST',version:1,slots:{weapon:{belrog:id}}};
  assert.deepEqual(Q.validateProfile(p,data.cards,previous),p);
  assert.deepEqual(Q.reconcileProfile(p,data.cards),Q.profile('RHINOZ-TEST'));
  assert.throws(()=>Q.equipProfile(Q.profile('new'),'belrog',id,data.cards),/incompatible/);
  const c=data.cards.find(c=>c.characterId==='belrog'),deck=deckFor(E,data,c);
  const comp={...team.fromPreset({name:'Rhinoz',cards:deck}),equipment:{belrog:id}};
  assert.deepEqual(team.normalize(comp).equipment,Q.emptyLoadout());
  const s=legacyGame(E,deck,deck,{equipment:[p.slots.weapon,{}]});
  assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
  const old=E.newGame(deck,deck,{equipment:[{},{}]});old.equipment.definitions=old.equipment.definitions.filter(x=>x.id!==id);
  assert.deepEqual(E.restoreGame(old),old);
  const noEquipment=E.newGame(deck,deck);assert.deepEqual(E.restoreGame(noEquipment),noEquipment);
});

test('saved matches: all three Rhinoz gain exactly +20 on numeric physical and magical attacks in both camps',async()=>{
  const data=await dataPromise;
  for(const c of legacyRhinoz(data))for(const side of [0,1])for(const magic of [false,true]){
    const f=fixture(data,c,side),{E,s,p,a}=f;assert(!E.equipmentView(s,a).active);
    const before=structuredClone(s.players);activate(f);assert(E.equipmentView(s,a).active);
    const recovered=E.clone(s);recovered.players=before;assert(!E.equipmentView(recovered,recovered.players[side].board.find(u=>u?.uid===a.uid)).active);
    s.turn=side;E.lock(s,p.board.indexOf(a),s.players[1-side].board.findIndex(Boolean));
    const die=c.atk.findIndex((v,i)=>typeof v==='number'&&c.magic.includes(6-i)===magic);
    assert(die>=0);E.rollAttack(s,6-die);E.rollDefense(s,6);
    const v=s.duel.formula;assert.equal(s.duel.magic,magic);assert.equal(v.equipmentAttack,20);assert.equal(v.equipmentDefense,0);
    assert.equal(v.attack,Math.max(0,v.baseAttack+v.weapon+v.element+v.faction+v.buff+v.barrier+v.arenaAttack+(v.captainAttack||0)+20));
    assert.equal(v.weapon,data.weapons[c.weapon][E.card(s.players[1-side].board.find(u=>u?.uid===s.duel.target)||s.players[1-side].dead.find(u=>u.uid===s.duel.target)).weapon]);
    assert(s.log.some(l=>l.text.includes(w.name)&&l.text.includes('+20 ATK')));E.assertState(s);
    assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);assert.deepEqual(s.equipment.pending,{});
    s.phase='over';assert(!E.equipmentView(s,a).active);
  }
});

test('saved matches: Guard D2 remains a support for Belrog, Nazar and Gilmarr even while the axe is active',async()=>{
  const data=await dataPromise;
  for(const c of legacyRhinoz(data)){
    const f=fixture(data,c),{E,s,p,a}=f;activate(f);E.lock(s,p.board.indexOf(a),s.players[1].board.findIndex(Boolean));
    E.rollAttack(s,2);assert.equal(s.phase,'guard');E.grantGuard(s,E.aiGuardChoice(s));E.assertState(s);
    assert.equal(s.duel.formula,undefined);assert.deepEqual(s.equipment.pending,{});
    assert(!s.log.some(l=>l.text.includes(w.name)&&l.text.includes('+20 ATK')));
    assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
  }
});

test('4.6 axe uses retained ATK six; the archived team-state effect stays frozen',()=>{
  assert.equal(w.family,'Hache');assert.equal(w.changesFamily,undefined);assert.equal(w.collectible.number,'ARM-033');
  assert.equal(w.slot,'weapon');assert.equal(w.rulesVersion,2);
  assert.deepEqual(w.effect,{trigger:'RETAINED_SIX',stat:'ATK',value:20,duration:'DUEL'});
  assert.deepEqual(archive.weapons.find(w=>w.id===id).effect,{trigger:'TEAM_STATE',stat:'ATK',value:20,duration:'WHILE_TRUE',when:{outnumbered:true}});
});
