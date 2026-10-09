'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildCatalog}=require('../atelier/game-catalog.cjs'),{createEngine}=require('./engine.js');
const Team=require('./team-composition.js'),Matchmaking=require('./matchmaking.js');
const fixture=buildCatalog().then(data=>{const E=createEngine(data),T=Team.create(E);return {data,E,T,M:Matchmaking.create(E,T,data.cards)};});
test('all levels produce legal, distinct, fully covered teams without altering native cards',async()=>{
  const {data,E,M}=await fixture,before=JSON.stringify(data.cards);
  for(const difficulty of Matchmaking.difficulties)for(let i=0;i<12;i++){
    const team=M.generate({seed:'LEGAL-'+i,difficulty});
    assert.deepEqual(E.validateComposition(team),[]);
    assert.equal(new Set(team.cards.map(id=>E.byId[id].characterId)).size,10);
    assert.ok(team.cards.filter(id=>E.byId[id].element==='RAINBOW').length<=1);
    assert.ok(Object.values(E.deckCoverage(team.cards)).every(n=>n>=2));
    team.formation.forEach((id,p)=>assert.ok(E.byId[id].positions.includes(p+1)));
    assert.ok(team.formation.includes(team.captain));
    assert.ok(Object.values(team.equipment).every(slot=>Object.keys(slot).length===0));
  }
  assert.equal(JSON.stringify(data.cards),before);
});
test('selection is deterministic, isolated from combat dice, and survives game restore',async()=>{
  const {E,T,M,data}=await fixture,team=M.generate({seed:'REPEAT',difficulty:'tactical'});
  assert.deepEqual(M.generate({seed:'REPEAT',difficulty:'tactical'}),team);
  const player=T.fromPreset({name:'Player',cards:data.decks.player});
  const a=E.newGame(player,team,{seed:'DICE',turnOrder:'ABBA',mode:'local'});
  M.generate({seed:'UNRELATED'});
  const b=E.newGame(player,team,{seed:'DICE',turnOrder:'ABBA',mode:'local'});
  assert.equal(a.rng,b.rng);assert.deepEqual(a.initiative,b.initiative);
  assert.deepEqual(E.restoreGame(a).composition.teams[1],team);
  team.cards.reverse();assert.notDeepEqual(a.composition.teams[1].cards,team.cards);
});
test('a 100-seed campaign proves increasing cohesion, not guaranteed victories',async()=>{
  const {M,E}=await fixture,sums=[0,0,0];let separated=0;
  for(let i=0;i<100;i++){
    const scores=Matchmaking.difficulties.map((difficulty,j)=>{
      const team=M.generate({seed:'COHESION-'+i,difficulty});assert.deepEqual(E.validateComposition(team),[]);
      const n=M.score(team);sums[j]+=n;return n;
    });
    assert.ok(scores[0]<=scores[1]&&scores[1]<=scores[2]);if(scores[0]<scores[2])separated++;
  }
  assert.ok(separated>=95);assert.ok(sums[2]>sums[1]&&sums[1]>sums[0]);
  console.log('Cohesion campaign (300 legal teams): '+JSON.stringify({means:sums.map(n=>n/100),separated}));
});
test('restricted pools remain legal; impossible pools and invalid levels fail closed',async()=>{
  const {E,T,data}=await fixture,pool=data.decks.player.map(id=>E.byId[id]),M=Matchmaking.create(E,T,pool);
  assert.deepEqual(E.validateComposition(M.generate({seed:'SMALL'})),[]);
  assert.throws(()=>M.generate({difficulty:'cheat'}),/Difficulte/);
  assert.throws(()=>Matchmaking.create(E,T,pool.slice(0,9)).generate({seed:'EMPTY'}),/insuffisant/);
  const impossible=structuredClone(data);impossible.cards=impossible.cards.slice(0,20).map(c=>({...c,positions:[1,2,3,4]}));
  const X=createEngine(impossible);assert.throws(()=>Matchmaking.create(X,Team.create(X)).generate({seed:'NO-P5'}),/insuffisant/);
  const bottleneck=structuredClone(data);bottleneck.cards=pool.map((c,i)=>({...c,positions:i<7?[1,2,3,4]:[5]}));
  const B=createEngine(bottleneck);assert.throws(()=>Matchmaking.create(B,Team.create(B)).generate({seed:'NO-MATCHING'}),/Aucune composition/);
});
test('arena draw always selects a real other arena; empty and single pools are explicit',()=>{
  const pool=[{id:'a'},{id:'b'},{id:'c'}],seen=new Set();
  for(let i=0;i<100;i++){const id=Matchmaking.arena(pool,'a',i);assert.notEqual(id,'a');seen.add(id);}
  assert.deepEqual([...seen].sort(),['b','c']);
  assert.equal(Matchmaking.arena([{id:'a'}],'a','seed'),'a');assert.throws(()=>Matchmaking.arena([],'a','seed'),/Aucune/);
});
