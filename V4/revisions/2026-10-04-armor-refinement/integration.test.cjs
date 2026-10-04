'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../2026-10-04-guards-arborium/specs.cjs'),revision=require('./specs.cjs'),old=require('../../expansions/2026-10-04-city-guards/set.json');
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
const catalogue=require('../../donnees/catalogue.json');
const cards=old.cards.filter(c=>![...S.removed,...revision.removed].includes(c.id)).map(c=>S.revised.find(r=>r.id===c.id)||c).concat(S.additions);
const dataPromise=buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});
const deckKeys=[['orven','serya','marel','veyr','isvel','torvan','eldra','brund','liorne','eryss'],['liorne','vessa','karrok','neryk','brask','maelka','tilko','velran','saelor','eryss']];
const decks=deckKeys.map(keys=>keys.map(k=>cards.find(c=>c.key===k).id));
function step(E,s){
 if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='kalistel')E.acceptAttack(s);else if(s.phase==='defense')E.rollDefense(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);else if(s.phase==='result')E.next(s);
 else{const actions={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};assert(actions[s.phase],s.phase);const [grant,choose]=actions[s.phase];E[grant](s,E[choose](s));}
}
test('14 city guards and four Arborium soldiers are published with exact printed rules',async()=>{
 const data=await dataPromise,E=createEngine(data),M=require('../../expansions/2026-09-27-metal-gear-mines/model.cjs');
 assert.equal(cards.length,18);for(const c of cards){const p=data.cards.find(p=>p.id===c.id);assert(p,c.key);for(const k of M.PRINTED)assert.deepEqual(p[k],c[k],c.key+'.'+k);assert.equal(p.characterId,c.characterId);assert.equal(p.role,c.role);assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,c.atk.includes('revive'));}
 for(const id of [...S.removed,...revision.removed])assert(!data.cards.some(c=>c.id===id));for(const ids of decks)assert.deepEqual(E.validatePlayableDeck(ids),[]);
 assert.deepEqual(S.additions.map(c=>c.race),['TOXINAR','HUMAIN','CERELF','CERELF']);assert(S.additions.every(c=>c.faction==='Arborium'));
 const v=data.cards.find(c=>c.id==='49900402');assert.equal(v.sentry,false);assert.deepEqual(v.magic,[]);assert.deepEqual(v.barriers,[]);
 assert.match(data.cards.find(c=>c.id==='49900302').description,/son fils/);
});
test('Retouched cards preserve all gameplay fields and race synergies remain ordinary',async()=>{
 const data=await dataPromise,E=createEngine(data);
 for(const c of S.revised.filter(c=>!revision.removed.includes(c.id))){const before=old.cards.find(p=>p.id===c.id),p=data.cards.find(p=>p.id===c.id);for(const k of ['characterId','role','element','race','faction','weapon','positions','atk','defense','magic','barriers'])assert.deepEqual(p[k],before[k]);}
 const crustos=cards.filter(c=>c.race==='CRUSTOS').map((c,i)=>({uid:'0-'+i,cardId:c.id}));assert.equal(E.synergy({board:crustos},crustos[0],'race'),E.rules.synergy[3]);
 const C=require('../../site/collaborations.js'),Binder=require('../../site/collection-binder.js');
 for(const c of cards)assert(Binder.matchesScope(data.cards.find(p=>p.id===c.id),'kalistar'));assert.equal(C.asset('races','CRUSTOS'),'assets/races/CRUSTOS.png');
});
test('All 18 soldiers complete 24 matches with support and repeated save restoration',async()=>{
 const E=createEngine(await dataPromise),seen=new Set();
 for(let seed=0;seed<24;seed++){
  let s=E.newGame(decks[seed%2],decks[1-seed%2],{seed:'ARBORIUM-'+seed,kalistel:false});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  for(let n=0;n<4000&&s.phase!=='over';n++){for(const p of s.players)for(const u of p.board.filter(Boolean))seen.add(u.cardId);step(E,s);E.assertState(s);if(n%11===0){const restored=E.restoreGame(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored,s);s=restored;}}
  assert.equal(s.phase,'over');assert(E.matchStats(s).complete);
 }assert.deepEqual([...seen].sort(),cards.map(c=>c.id).sort());
});
