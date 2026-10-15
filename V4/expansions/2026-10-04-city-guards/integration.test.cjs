'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {buildCatalog}=require('../../atelier/game-catalog.cjs');
const {createEngine}=require('../../site/engine.js');
const M=require('./model.cjs'),set=require('./set.json');
const catalogue=require('../../donnees/catalogue.json');
const profiles=set.cards.map(c=>require('./cards/'+c.key+'/profile.json'));
const published=catalogue.cards.filter(c=>c.kind==='created'&&!profiles.some(p=>p.id===c.id));
published.push(...profiles.map(profile=>({id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'})));
const dataPromise=buildCatalog({published});
function step(E,s){
  if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
  else if(s.phase==='attack')E.rollAttack(s);
  else if(s.phase==='kalistel')E.acceptAttack(s);
  else if(s.phase==='defense')E.rollDefense(s);
  else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
  else if(s.phase==='result')E.next(s);
  else {
    const kinds={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
    assert(kinds[s.phase],s.phase);const [grant,choose]=kinds[s.phase];E[grant](s,E[choose](s));
  }
}
test('17 native profiles enter the original Kalistar collection and two legal decks',async()=>{
  const data=await dataPromise;M.validateGame(data,set,createEngine);
  const C=require('../../site/collaborations.js'),Binder=require('../../site/collection-binder.js');
  for(const c of set.cards){const p=data.cards.find(p=>p.id===c.id);assert(Binder.matchesScope(p,'kalistar'));assert.equal(C.asset('factions',p.faction),C.asset('factions',c.faction));}
  assert.equal(C.asset('races','CRUSTOS'),'assets/races/CRUSTOS.png');
});
test('CRUSTOS uses normal race synergy, never a new combat rule',async()=>{
  const E=createEngine(await dataPromise),ids=set.cards.filter(c=>c.race==='CRUSTOS').map(c=>c.id);
  const board=ids.map((cardId,i)=>({uid:'0-'+i,cardId}));
  assert.equal(E.synergy({board},board[0],'race'),E.rules.synergy[3]);
  assert.equal(E.synergy({board:[board[0]]},board[0],'race'),E.rules.synergy[1]);
  const human={uid:'0-4',cardId:set.cards[0].id};
  assert.equal(E.synergy({board:[...board,human]},board[0],'race'),E.rules.synergy[3]);
});
test('All 17 guards fight, resolve support effects and restore saves across 24 complete matches',async()=>{
  const data=await dataPromise,E=createEngine(data),decks=M.validateGame(data,set,createEngine).qaDecks;
  const seen=new Set();
  for(let seed=0;seed<24;seed++){
    let s=E.newGame(decks[seed%2],decks[1-seed%2],{seed:'CITY-GUARDS-'+seed,kalistel:false});
    E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
    for(let n=0;n<4000&&s.phase!=='over';n++){
      for(const p of s.players)for(const u of p.board.filter(Boolean))seen.add(u.cardId);
      step(E,s);E.assertState(s);
      if(n%11===0){const restored=E.restoreGame(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored,s);s=restored;}
    }
    assert.equal(s.phase,'over');assert(E.matchStats(s).complete);
  }
  assert.deepEqual([...seen].sort(),set.cards.map(c=>c.id).sort());
});
