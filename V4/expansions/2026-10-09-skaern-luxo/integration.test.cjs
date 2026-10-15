'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const set=require('./set.json'),cat=require('../../donnees/catalogue.json');
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
const skaern=cat.cards.find(c=>c.id===set.cards[0].id)?.profile,djidane=cat.cards.find(c=>c.id===set.revision.id)?.profile;
const before=require('./before.json'),old=require('./originals/49901001/profile.json');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds;
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const {decks,formation,deploy}=require('./fixtures.cjs');
const dataPromise=buildCatalog({published:cat.cards.filter(c=>c.kind==='created')});
async function fixture(spec,side=0){
 const data=await dataPromise,E=createEngine(data),own=decks.find(ids=>ids.includes(spec.id)),other=decks.find(ids=>ids!==own);
 const s=E.newGame(side?other:own,side?own:other,{seed:'SKAERN-LUXO',mode:'local',deckCoverage:2});
 deploy(E,s,side,formation(data.cards,own,spec.id,spec.role-1));
 E.autoDeploy(s,1-side);E.start(s);
 assert.equal(s.players[side].board[spec.role-1].cardId,spec.id);
 return {E,s,slot:spec.role-1,u:s.players[side].board[spec.role-1]};
}
function restore(E,s){assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);}
test('Skaern is a unique approved Okami, bounded defensive profile and no invented mechanic',()=>{
 assert(skaern);assert.equal(cat.cards.filter(c=>c.id===skaern.id).length,1);
 for(const f of ['name','title','job','description','element','race','weapon','faction','role','positions','atk','defense','magic','barriers','characterId'])assert.deepEqual(skaern[f],set.cards[0][f]);
 assert(skaern.canGuard&&!skaern.canHeal);assert.equal(skaern.element,'NONE');
 assert.deepEqual(skaern.magic,[]);assert.deepEqual(skaern.barriers,[]);
 for(const side of ['atk','defense'])skaern[side].forEach((v,i)=>{if(typeof v==='number')assert(v<=(bounds[1][side][i])&&v>=(bounds[1][side][i+1]||0));});
 assert.deepEqual(skaern.atk.filter(x=>typeof x==='string'),['guard','retry']);
});
test('Djidane becomes Luxo with stable identity, art, numbers, special faces and FFIX banner',()=>{
 assert(djidane);const back={...djidane};for(const f of set.revision.changedFields)back[f]=old[f];assert.deepEqual(back,old);
 assert.equal(djidane.element,'LUXO');assert.equal(djidane.color,'F4E9AF');assert.equal(djidane.hue,47);assert.equal(djidane.sentry,true);
 assert.deepEqual(djidane.magic,[]);assert.deepEqual(djidane.barriers,[]);
 const entry=cat.cards.find(c=>c.id===djidane.id);assert.equal(entry.element,'LUXO');
 assert.equal(entry.nativeRevision.id,set.id);assert.deepEqual(entry.nativeRevision.previous,before.entry.nativeRevision);
 const readPlan=dir=>JSON.parse(fs.readFileSync(path.join(__dirname,dir,'render/composition.json'),'utf8'));
 const prior=readPlan('originals/49901001'),next=readPlan('cards/djidane');
 for(const prefix of ['FACTION -','RACE -','ARME -','ID CODE128']){
  const a=prior.layers.find(l=>l.name.startsWith(prefix)),b=next.layers.find(l=>l.name.startsWith(prefix));assert.deepEqual(a,b);
 }
});
test('Current published PNGs retain native frame, PSD roundtrip, barcodes and exact selected illustrations',()=>{
 for(const [key,p]of [['skaern',skaern],['djidane',djidane]]){
  const root=path.resolve(__dirname,'../../creations',p.id),proof=require(path.join(root,'verification.json'));
  assert(proof.passed&&proof.barcode.passed);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.components.fixedDifferences,0);
  assert.equal(hash(path.join(root,'card.png')),proof.hashes['card.png']);assert.equal(hash(path.join(root,'profile.json')),proof.profileHash);
  if(key==='skaern')assert(proof.none.unlit);else {assert.equal(proof.scope.outside,0);assert(proof.numericFacesAndEffectsUnchanged);}
 }
});
test('Both squads retain full role coverage and old deck identifiers',async()=>{
 const E=createEngine(await dataPromise);for(const ids of decks)assert.deepEqual(E.validatePlayableDeck(ids),[]);
});
test('Every ATK and DEF face resolves with restoration, including guard and clover',async()=>{
 for(const spec of [skaern,djidane])for(let die=1;die<=6;die++){
  const {E,s,slot,u}=await fixture(spec);E.lock(s,slot,0);E.rollAttack(s,die);restore(E,s);E.acceptAttack(s);
  const value=spec.atk[6-die];assert.equal(s.duel.attackValue,value);
  if(value==='guard'){assert.equal(s.phase,'guard');E.grantGuard(s,u.uid);assert.equal(u.ward,60);}
  else if(value==='retry'){assert.equal(s.phase,'clover');E.grantClover(s,u.uid);assert.equal(u.luck,1);}
  else{assert.equal(s.phase,'defense');E.rollDefense(s,6);assert.equal(s.duel.formula.baseAttack,value);}
  assert.equal(s.phase,'result');E.assertState(s);restore(E,s);
  const defense=await fixture(spec,1);defense.E.lock(defense.s,0,defense.slot);defense.E.rollAttack(defense.s,6);defense.E.acceptAttack(defense.s);defense.E.rollDefense(defense.s,die);
  assert.equal(defense.s.duel.defenseValue,spec.defense[6-die]);defense.E.assertState(defense.s);restore(defense.E,defense.s);
 }
});
test('Djidane has the real Luxo matchup, without converting physical faces into magic',async()=>{
 const data=await dataPromise,E=createEngine(data);
 // Query the ordinary engine formula with an opponent of each element, never a UI-only bonus.
 for(const [element,expected]of [['HEMATO',30],['NECRO',-30],['NONE',20],['LUXO',0],['RAINBOW',-40]]){
  const adjusted=structuredClone(data),target=adjusted.cards.find(c=>c.id==='49901401');target.element=element;
  const engine=createEngine(adjusted),s=engine.newGame(decks[1],decks[0],{seed:'LUXO-'+element,mode:'local',deckCoverage:2});
  deploy(engine,s,0,formation(adjusted.cards,decks[1],djidane.id,1));
  deploy(engine,s,1,formation(adjusted.cards,decks[0],target.id,0));
  engine.start(s);engine.lock(s,1,0);engine.rollAttack(s,6);engine.acceptAttack(s);engine.rollDefense(s,6);
  assert.equal(s.duel.magic,false);assert.equal(s.duel.formula.element,expected,element);restore(engine,s);
 }
});
module.exports={decks};
