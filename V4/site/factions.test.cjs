'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const F=require('./factions.js'),C=require('./collaborations.js'),Q=require('./equipment.js');
const {createEngine}=require('./engine.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const refs=require('../atelier/data/references.json'),rows=require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created');
const dataPromise=buildCatalog({published:rows});
const ids=['30000005','49900701','49900707'];

test('Ysilis is a faction alias, never a replacement of geographical text',()=>{
  assert.equal(F.canonical('Niveria'),'Ysilis');assert.equal(F.canonical('Ysilis'),'Ysilis');
  for(const value of ['Grivka','Durane','Le lac de Niveria',undefined])assert.equal(F.canonical(value),value);
  assert(F.same('Niveria','Ysilis'));assert(!F.same('Grivka','Ysilis'));
  assert.equal(C.asset('factions','Ysilis'),C.asset('factions','Niveria'));
  assert.equal(C.asset('factions','Ysilis'),'shared/factions/Niveria.png');
});

test('three legacy labels migrate while new Ysilis and Okami cards retain their native identities',async()=>{
  const data=await dataPromise;
  assert.deepEqual(data.cards.filter(c=>c.faction==='Ysilis').map(c=>c.id).sort(),[...ids,'49900904','49900907']);
  assert.deepEqual(data.cards.filter(c=>c.race==='OKAMI').map(c=>[c.id,c.faction]),[['49900901','Grivka'],['49900902','Grivka'],['49901401','Grivka']]);
  assert(!data.cards.some(c=>c.faction==='Niveria'||['LYCANOS','GAROU'].includes(c.race)));
  const originals=[...refs.cards.map(r=>({...r.card,id:r.card.id})),...rows.map(r=>({...r.profile,id:r.id}))];
  for(const c of data.cards){
    const p=originals.find(p=>p.id===c.id);assert(p);
    assert.equal(c.faction,ids.includes(c.id)?'Ysilis':p.faction);
    for(const field of ['name','title','job','race','element','weapon','positions','atk','defense','magic','barriers'])assert.deepEqual(c[field],p[field],c.id+'.'+field);
    assert.equal(c.description,p.description??p.text??'');
  }
  assert(data.arenas.some(a=>a.name==='Le lac de Niveria'));
});

test('equipment compatibility is unchanged in both old and new faction namespaces',async()=>{
  const data=await dataPromise,w=Q.catalogue.weapons.find(w=>w.id==='first-thaw-cloak');
  assert.deepEqual(w.restrictions.factions,['Ysilis']);
  const old={...w,restrictions:{factions:['Niveria']}};
  for(const c of data.cards){
    const expected=c.faction==='Ysilis',legacy={...c,faction:c.faction==='Ysilis'?'Niveria':c.faction};
    for(const definition of [w,old])for(const card of [c,legacy])assert.equal(Q.compatible(definition,card),expected,c.id);
  }
  assert(!Q.compatible(w,{...data.cards.find(c=>ids.includes(c.id)),faction:'Grivka'}));
  const c=data.cards.find(c=>c.id===ids[0]),profile=Q.equipProfile(Q.profile('qa'),c.characterId,w.id,data.cards);
  assert.deepEqual(Q.reconcileProfile(profile,data.cards),profile);
});

for(const side of [0,1])test('old faction snapshot restores without mutation and keeps its magic-defense bonus, side '+side,async()=>{
  const data=structuredClone(await dataPromise),E=createEngine(data),c=E.byId[ids[0]],base=data.decks.player;
  const deck=base.includes(c.id)?base:base.map((_,i)=>base.map((id,j)=>i===j?c.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);
  assert(deck);
  const loadout={[c.characterId]:'first-thaw-cloak'};
  const s=E.newGame(deck,deck,{mode:'local',seed:'ysilis-alias-'+side,kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
  s.equipment.definitions.find(w=>w.id==='first-thaw-cloak').restrictions.factions=['Niveria'];
  assert.deepEqual(E.restoreGame(s),s);
  const u=s.players[side].reserve.find(u=>u.cardId===c.id);assert(u);
  E.autoDeploy(s,0);E.autoDeploy(s,1);
  if(!s.players[side].board.includes(u)){E.recall(s,side,c.positions[0]-1);E.deploy(s,side,u.uid,c.positions[0]-1);}
  E.start(s);s.turn=1-side;
  const attacker=s.players[1-side].board.findIndex(u=>E.card(u).magic.some(d=>Number.isFinite(E.card(u).atk[6-d])));assert(attacker>=0);
  const ac=E.card(s.players[1-side].board[attacker]),die=ac.magic.find(d=>Number.isFinite(ac.atk[6-d]));
  E.lock(s,attacker,s.players[side].board.indexOf(u));E.rollAttack(s,die);
  assert.deepEqual(E.restoreGame(s),s);
  E.rollDefense(s,6-c.defense.findIndex(Number.isFinite));E.assertState(s);
  assert.equal(s.duel.formula.equipmentDefense,25);
  assert(s.log.some(row=>row.text.includes('Manteau du Premier D')&&row.text.includes('+25')));
  assert.deepEqual(E.restoreGame(s),s);
  assert.deepEqual(s.equipment.definitions.find(w=>w.id==='first-thaw-cloak').restrictions.factions,['Niveria']);
});
