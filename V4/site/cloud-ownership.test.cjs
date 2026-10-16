'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Ownership=require('./cloud-ownership.js'),Player=require('./cloud-player.js');
function fixture(){
  const data={cards:[{id:'30000012',characterId:'kaylis'},{id:'30000007',characterId:'balmhyr'}]},profile='user-tokyo';
  const player={localProfile:profile,label:'Tokyo',pending:[],cards:data.cards.map((c,i)=>({id:'KC-'+String(i+1).padStart(32,'0'),modelId:c.id,status:'owned'}))};
  const cache={matches:[],results:[],registryMeta:[]},engine={byId:Object.fromEntries(data.cards.map(c=>[c.id,c])),restoreGame:structuredClone};
  const api=Ownership.create({data,engine,player,getCache:()=>cache,enqueue:fn=>fn(),transaction:fn=>fn(cache,(table,row)=>cache[table].push(row)),refresh:async()=>{},isOpen:()=>true});
  const game={phase:'setup',matchId:'match-11111111-1111-4111-8111-111111111111',players:[{board:Array(5).fill(null),reserve:data.cards.map((c,i)=>({cardId:c.id,instanceId:'K4-'+c.id+'-001',uid:'0-'+i})),dead:[]},{}]};
  return {api,player,cache,game,profile};
}
test('cloud inventory comes only from the server, stays scoped to a stable account, and never exposes local minting',()=>{
  const f=fixture();assert.equal(f.api.owned(f.profile).length,2);assert.throws(()=>f.api.owned('user-paris'));
  assert.equal(f.api.issue,undefined);assert.equal(f.api.activate,undefined);assert.equal(f.api.offer,undefined);
  assert(f.api.deckErrors(f.profile,['30000001']).length);assert(f.api.deckErrors(f.profile,['30000012','30000012']).length);
});
test('real specimen bindings survive reload, reject forged models and cannot be changed on an existing match',()=>{
  const f=fixture(),bound=f.api.bindGame(f.profile,f.game);assert.equal(new Set(Object.values(bound.collection.bindings)).size,2);assert(f.api.validateGame(bound,f.profile));
  const changed=structuredClone(bound);changed.collection.bindings[changed.players[0].reserve[0].instanceId]='KC-'+'0'.repeat(32);
  assert.throws(()=>f.api.validateGame(changed,f.profile));assert.throws(()=>f.api.validateSave(changed,{state:bound}));
  f.api.update({...f.player,pending:[Object.values(bound.collection.bindings)[0]]});assert.throws(()=>f.api.validateGame(bound,f.profile));
});
test('abandoned games cannot resume, while old finished archives retain their identity after a transfer',async()=>{
  const f=fixture(),bound=f.api.bindGame(f.profile,f.game);f.cache.matches.push({id:bound.matchId,state:bound,finalized:false});
  await f.api.releaseGame(f.profile,bound.matchId);assert.throws(()=>f.api.validateGame(bound,f.profile));
  f.api.update({...f.player,cards:[]});assert(f.api.validateGame({...bound,phase:'over'},f.profile));
});

test('a newly composed team binds before captain initiative, but a progressed unbound game cannot masquerade as new',()=>{
  const f=fixture(),fresh={...f.game,phase:'initiative',round:1,duel:null,composition:{version:1},initiative:{first:null,rolls:[]},match:{events:[]}};
  assert(f.api.bindGame(f.profile,fresh).collection);
  assert.throws(()=>f.api.bindGame(f.profile,{...fresh,initiative:{first:0,rolls:[[6,1]]}}));
  assert.throws(()=>f.api.bindGame(f.profile,{...fresh,match:{events:[{type:'kill'}]}}));
});
test('cloud archive payloads are account scoped, omit catalogue duplication, and reject ownership/credential tables',()=>{
  const f=fixture(),bound=f.api.bindGame(f.profile,f.game),date='2026-10-16T00:00:00Z';
  const value={schema:1,edition:'V4',localProfile:f.profile,preferences:{favorites:[]},deckLibrary:{schema:2,edition:'V4',decks:[]},equipment:{id:f.profile},matches:[{id:bound.matchId,state:bound,createdAt:date,updatedAt:date}],activeMatchId:bound.matchId,releasedMatches:[]};
  assert.deepEqual(Player.validatePayload(value,f.profile),value);
  assert.throws(()=>Player.validatePayload(value,'user-paris'));assert.throws(()=>Player.validatePayload({...value,collectibles:[]},f.profile));
  assert.throws(()=>Player.validatePayload({...value,preferences:{access_token:'do-not-sync'}},f.profile));
  const compact=Player.compactArchive({...value.matches[0],profiles:[{id:'30000012'},{id:'30000007'},{id:'30000001'}],arenas:[{id:'ruins'},{id:'other'}],state:{...bound,arenaId:'ruins',players:[bound.players[0],{board:[],reserve:[],dead:[]}]}});
  assert.equal(compact.profiles.length,2);assert.equal(compact.arenas.length,1);assert.notEqual(Player.prefixFor('a'),Player.prefixFor('b'));
});
