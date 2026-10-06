'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),C=require('./weapon-cards.js'),T=require('./team-composition.js');
const {createEngine}=require('./engine.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const dataPromise=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const id='rhinoz-ancestral-horn',w=Q.catalogue.weapons.find(w=>w.id===id);
const allowed=['belrog','gilmarr','nazar'];
function deckFor(E,data,c){
  const base=data.decks.player,deck=base.map((_,i)=>base.map((id,j)=>i===j?c.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);
  assert(deck,c.id);return deck;
}
function fixture(data,c,side=0){
  const E=createEngine(data),deck=deckFor(E,data,c),loadout={[c.characterId]:id};
  const s=E.newGame(deck,deck,{seed:'RHINOZ-TEST',mode:'local',kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
  E.autoDeploy(s,0);E.autoDeploy(s,1);const p=s.players[side],a=[...p.board.filter(Boolean),...p.reserve].find(u=>u.cardId===c.id);
  if(!p.board.includes(a)){E.recall(s,side,0);E.deploy(s,side,a.uid,0);}E.start(s);
  return {E,s,p,a,side};
}
function activate(f){const i=f.p.board.findIndex(u=>u&&u!==f.a);f.p.reserve.push(f.p.board[i]);f.p.board[i]=null;f.E.assertState(f.s);}

test('Rhinoz restriction uses exact race, not faction, job, family or displayed name',async()=>{
  const data=await dataPromise;Q.validateDefinition(w);assert.deepEqual(w.restrictions,{races:['RHINOZ']});
  assert.deepEqual(data.cards.filter(c=>Q.compatible(w,c)).map(c=>c.characterId).sort(),allowed);
  for(const c of data.cards)assert.equal(Q.compatible(w,c),c.race==='RHINOZ');
  const c=data.cards.find(c=>c.characterId==='belrog');
  assert(Q.compatible(w,{...c,name:'Other',job:'Other',faction:'Other',weapon:'Other',characterId:'future-rhinoz'}));
  for(const race of [undefined,'Rhinoz','RHINOZ ','NAIN','SKULLZ'])assert(!Q.compatible(w,{...c,race}));
  assert(!Q.compatible(w,{...c,name:'RHINOZ',race:'HUMAIN'}));
  assert(!Q.compatible(w,null));
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

test('profile transfers, replacement and composition snapshots keep one weapon and reject other races',async()=>{
  const data=await dataPromise,E=createEngine(data),team=T.create(E);let p=Q.profile('RHINOZ-TEST');
  p=Q.equipProfile(p,'nazar','wardens-spear',data.cards);
  p=Q.equipProfile(p,'nazar',id,data.cards,{expected:'wardens-spear'});
  p=Q.equipProfile(p,'belrog',id,data.cards);
  assert.deepEqual(p.slots.weapon,{belrog:id});assert.deepEqual(Q.validateProfile(JSON.parse(JSON.stringify(p)),data.cards),p);
  assert.throws(()=>Q.equipProfile(p,'balmhyr',id,data.cards),/incompatible/);
  const c=data.cards.find(c=>c.characterId==='belrog'),deck=deckFor(E,data,c);
  const comp=team.equip(team.fromPreset({name:'Rhinoz',cards:deck}),c.id,id);
  assert.deepEqual(E.validateComposition(comp),[]);
  const s=E.newGame(comp,comp),saved=structuredClone(s.equipment);comp.equipment[c.characterId]=null;
  assert.deepEqual(s.equipment,saved);assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
  const old=E.newGame(deck,deck,{equipment:[{},{}]});old.equipment.definitions=old.equipment.definitions.filter(x=>x.id!==id);
  assert.deepEqual(E.restoreGame(old),old);
  const noEquipment=E.newGame(deck,deck);delete noEquipment.equipment;
  assert.deepEqual(E.restoreGame(noEquipment),noEquipment);
});

test('all three Rhinoz gain exactly +20 on numeric physical and magical attacks in both camps',async()=>{
  const data=await dataPromise;
  for(const c of data.cards.filter(c=>c.race==='RHINOZ'))for(const side of [0,1])for(const magic of [false,true]){
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

test('Guard D2 remains a support for Belrog, Nazar and Gilmarr even while the axe is active',async()=>{
  const data=await dataPromise;
  for(const c of data.cards.filter(c=>c.race==='RHINOZ')){
    const f=fixture(data,c),{E,s,p,a}=f;activate(f);E.lock(s,p.board.indexOf(a),s.players[1].board.findIndex(Boolean));
    E.rollAttack(s,2);assert.equal(s.phase,'guard');E.grantGuard(s,E.aiGuardChoice(s));E.assertState(s);
    assert.equal(s.duel.formula,undefined);assert.deepEqual(s.equipment.pending,{});
    assert(!s.log.some(l=>l.text.includes(w.name)&&l.text.includes('+20 ATK')));
    assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
  }
});

test('the new axe stays a bounded existing effect without replacing the printed weapon family',()=>{
  assert.equal(w.family,'Hache');assert.equal(w.changesFamily,undefined);assert.equal(w.collectible.number,'ARM-033');
  assert.deepEqual(w.effect,{trigger:'TEAM_STATE',stat:'ATK',value:20,duration:'WHILE_TRUE',when:{outnumbered:true}});
});
