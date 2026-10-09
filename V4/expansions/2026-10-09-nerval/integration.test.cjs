'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const cat=require('../../donnees/catalogue.json'),spec=require('./set.json').cards[0],{deck,formation,deploy}=require('./fixtures.cjs');
const {buildCatalog}=require('../../atelier/game-catalog.cjs');
const {createEngine}=require(process.env.KALISTAR_NERVAL_ENGINE||'../../site/engine.js');
const dataPromise=buildCatalog({published:cat.cards.filter(c=>c.kind==='created')});
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function fixture(side=0){
  const data=await dataPromise,E=createEngine(data),s=E.newGame(deck,deck,{seed:'NERVAL',mode:'local',deckCoverage:2});
  deploy(E,s,side,formation(data.cards,deck,spec.id,4));E.autoDeploy(s,1-side);E.start(s);return {data,E,s,u:s.players[side].board[4]};
}
const restored=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
test('Nerval retains the approved identity, bounded support stats and existing effects only',async()=>{
  const data=await dataPromise,p=cat.cards.find(c=>c.id===spec.id)?.profile;assert(p);
  assert.equal(cat.cards.filter(c=>c.id===spec.id).length,1);assert.equal(data.cards.filter(c=>c.characterId===spec.characterId).length,1);
  for(const f of ['characterId','name','title','job','description','element','race','weapon','faction','role','positions','atk','defense','magic','barriers'])assert.deepEqual(p[f],spec[f]);
  assert(p.canGuard&&!p.canHeal);assert.equal(p.role,5);assert.deepEqual(p.atk.filter(x=>typeof x==='string'),['guard','mana']);
  const b=require('../../../V3/donnees/regles_demo.json').roleBounds[5];
  for(const side of ['atk','defense'])p[side].forEach((v,i)=>{if(typeof v==='number')assert(v<=(b[side][i])&&v>=(b[side][i+1]||0));});
  assert.deepEqual(createEngine(data).validatePlayableDeck(deck),[]);
});
test('Native publication preserves frame, editable profile, barcode and selected artwork proof',()=>{
  const root=path.resolve(__dirname,'../../creations',spec.id),p=require(path.join(root,'profile.json')),v=require(path.join(root,'verification.json'));
  assert(v.passed&&v.barcode.passed);assert.equal(v.roundtrip.changed,0);assert.equal(v.components.fixedDifferences,0);assert.equal(v.components.severePixels,0);
  assert.equal(hash(path.join(root,'profile.json')),v.profileHash);assert.equal(hash(path.join(root,'card.png')),v.hashes['card.png']);
  const before=require('./before.json'),meta=require(path.join(root,'creation.json'));
  assert.equal(meta.hashes['illustration.png'],before.inputs[spec.artworkSource]);
  assert.equal(p.artworkSource,spec.artworkSource);
  for(const old of before.catalogue.cards)assert(cat.cards.some(c=>c.id===old.id),'Missing existing model '+old.id);
});
test('All ATK/DEF faces resolve and restore, including guard, mana, magic and the barrier',async()=>{
  for(let die=1;die<=6;die++){
    const {E,s,u}=await fixture();E.lock(s,4,0);E.rollAttack(s,die);restored(E,s);E.acceptAttack(s);
    const value=spec.atk[6-die];assert.equal(s.duel.attackValue,value);
    if(value==='guard'){assert.equal(s.phase,'guard');E.grantGuard(s,u.uid);assert.equal(u.ward,60);}
    else if(value==='mana'){assert.equal(s.phase,'potion');E.grantPotion(s,u.uid);assert.equal(u.mana,60);}
    else {assert.equal(s.phase,'defense');E.rollDefense(s,6);assert.equal(s.duel.formula.baseAttack,value);assert.equal(s.duel.magic,spec.magic.includes(die));}
    assert.equal(s.phase,'result');E.assertState(s);restored(E,s);
    const other=await fixture(1);other.E.lock(other.s,0,4);other.E.rollAttack(other.s,6);other.E.acceptAttack(other.s);other.E.rollDefense(other.s,die);
    assert.equal(other.s.duel.formula.baseDefense,spec.defense[6-die]);other.E.assertState(other.s);restored(other.E,other.s);
  }
});
test('The Luxo barrier reduces a real magical attack and the light matchup remains in the engine',async()=>{
  const data=await dataPromise,E=createEngine(data),s=E.newGame(deck,deck,{seed:'NERVAL-BARRIER',mode:'local',deckCoverage:2});
  for(let side=0;side<2;side++)deploy(E,s,side,formation(data.cards,deck,spec.id,4));E.start(s);
  E.lock(s,4,4);E.rollAttack(s,5);E.acceptAttack(s);E.rollDefense(s,4);
  assert(s.duel.magic);assert.equal(s.duel.formula.barrier,-E.rules.barrier);assert.equal(s.duel.formula.baseAttack,139);assert.equal(s.duel.formula.baseDefense,132);restored(E,s);
  assert.equal(E.elementModifier(E.byId[spec.id],{element:'NONE'}),20);
});
