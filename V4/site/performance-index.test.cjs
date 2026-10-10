'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('./performance-index.js'),T=require('./trophies.js'),{createEngine}=require('./engine.js');
const {buildCatalog}=require('../atelier/game-catalog.cjs');
const catalogue=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
async function fixture({kalistel=false}={}){
  const data=structuredClone(await catalogue),ids=data.decks.player;
  data.weapons={};
  for(const c of data.cards){
    c.atk=[140,210,190,200,60,30];c.defense=[170,80,80,80,'retry','dodge'];
    c.magic=[];c.barriers=[];c.element='NONE';c.faction=c.characterId;c.race=c.characterId;c.positions=[1,2,3,4,5];
  }
  const giver=data.cards.find(c=>c.id===ids[4]);giver.role=5;giver.canHeal=true;giver.canGuard=true;giver.atk=['revive','retry','mana','buff_atk','guard','death'];
  const E=createEngine(data),s=E.newGame(ids,ids,{seed:'INDEX-QA',mode:'local',kalistel});
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  return {E,s,data,giver:s.players[0].board[4],a:s.players[0].board[0],b:s.players[1].board[0]};
}
const row=(f,u)=>f.E.matchStats(f.s).units.find(r=>r.uid===u.uid);
function prepare(f,side,a,b){f.s.turn=side;f.s.phase='choose';f.E.lock(f.s,f.s.players[side].board.indexOf(a),f.s.players[1-side].board.indexOf(b));}
function advance(f){f.E.next(f.s);while(f.s.phase==='replace')f.E.autoDeploy(f.s,f.s.replacing);}
function grant(f,die,recipient=f.a,giver=f.giver){
  prepare(f,Number(giver.uid[0]),giver,f.s.players[1-Number(giver.uid[0])].board.find(Boolean));
  f.E.rollAttack(f.s,die);if(f.s.phase==='kalistel')f.E.acceptAttack(f.s);
  const methods={heart:'grantReraise',clover:'grantClover',potion:'grantPotion',physical:'grantPhysical',guard:'grantGuard'};
  f.E[methods[f.s.phase]](f.s,recipient.uid);f.E.assertState(f.s);advance(f);
}
function fight(f,{a=f.a,b=f.b,atk=6,def=[6]}={}){
  prepare(f,Number(a.uid[0]),a,b);f.E.rollAttack(f.s,atk);if(f.s.phase==='kalistel')f.E.acceptAttack(f.s);
  for(const die of def){assert.equal(f.s.phase,'defense');f.E.rollDefense(f.s,die);}
  assert.equal(f.s.phase,'result');f.E.assertState(f.s);return f.s.duel;
}
function terminate(f,winner=0){f.s.phase='over';f.s.winner=winner;return f.E.matchStats(f.s);}

test('official coefficients, example 39 and individual contribution points',()=>{
  assert.equal(P.calculate({kills:2,holds:3,attack:650,defense:420,support:2,assists:1,victory:1}),39);
  for(const [key,value,score] of [['kills',1,5],['holds',1,3],['attack',400,4],['defense',420,4],['victory',1,3],['support',1,2],['assists',1,3],['cloversConsumedByRecipients',1,2],['reraisesConsumedByRecipients',1,2],['debuff',60,2],['reraises',1,0]])assert.equal(P.calculate({[key]:value}),score,key);
  assert.equal(P.calculate({attack:190+210}),4,'floor cumulative, not each roll');
  assert(Object.isFrozen(P.coefficients));
});
test('victory only after conclusion, including dead participants but not unused reserve, loss or draw',async()=>{
  const f=await fixture();assert(row(f,f.a).ratingBreakdown.victory===0);
  const dead=f.s.players[0].board[1];f.s.players[0].board[1]=null;f.s.players[0].dead.push(dead);
  for(const winner of [0,1,'draw']){
    const stats=terminate(f,winner);
    for(const r of stats.units)assert.equal(r.victory,Number(r.participated&&r.side===winner));
    assert.equal(stats.units.find(r=>r.uid===dead.uid).victory,Number(winner===0));
    const before=JSON.stringify(f.s);assert.deepEqual(f.E.matchStats(f.s),stats);assert.equal(JSON.stringify(f.s),before);
  }
});
for(const [die,key] of [[6,'reraise'],[5,'luck'],[4,'mana'],[3,'physical'],[2,'ward']])test('new '+key+' support and self support score once, refresh preserves donor',async()=>{
  const f=await fixture();grant(f,die);assert.equal(row(f,f.giver).support,1);assert.equal(row(f,f.giver).rating,2);
  const source=structuredClone(f.a.traitSources[key]);grant(f,die);assert.equal(row(f,f.giver).support,1);assert.equal(row(f,f.giver).refreshes,1);assert.deepEqual(f.a.traitSources[key],source);
  grant(f,die,f.giver);assert.equal(row(f,f.giver).support,2);
});
for(const magic of [false,true])test('causal '+(magic?'mana':'physical')+' charge credits exactly one donor assist',async()=>{
  const f=await fixture();if(magic){f.E.card(f.a).magic=[6];}
  grant(f,magic?4:3);fight(f);assert.equal(f.s.duel.formula.attack,200);assert.equal(f.s.duel.formula.defense,170);
  const r=row(f,f.giver);assert.equal(r.assists,1);assert.equal(r.rating,5);assert.equal(row(f,f.a).kills,1);
  assert(f.s.log.some(l=>l.text.includes('d\u00e9cisives')&&l.text.includes('+3')));
  assert.deepEqual(f.E.matchStats(f.E.restoreGame(JSON.parse(JSON.stringify(f.s)))),f.E.matchStats(f.s));
  for(let n=0;n<10;n++)assert.equal(row(f,f.giver).assists,1);
});
test('noncausal, self buff, dodge and Reraise never create an assist',async()=>{
  for(const scenario of ['noncausal','self','dodge','reraise']){
    const f=await fixture();
    if(scenario==='self'){
      f.E.card(f.giver).atk[0]=140;grant(f,3,f.giver);fight(f,{a:f.giver});
    }else{
      if(scenario==='reraise')grant(f,6,f.b,f.s.players[1].board[4]);
      grant(f,3);fight(f,{atk:scenario==='noncausal'?5:6,def:scenario==='dodge'?[1]:[6]});
    }
    assert.equal(row(f,f.giver).assists,0,scenario);
  }
});
test('Clover use credits original donor, unused and native retry do not',async()=>{
  const f=await fixture();grant(f,5);assert.equal(row(f,f.giver).cloversConsumedByRecipients,0);
  fight(f,{a:f.b,b:f.a,atk:5,def:[2,6,5]});
  assert.equal(f.s.duel.defenseRolls.length,3);assert.equal(row(f,f.giver).cloversConsumedByRecipients,1);assert.equal(row(f,f.giver).rating,4);
  assert.equal(row(f,f.a).luckUsed,1);assert.equal(row(f,f.a).defense,80,'failed numeric DEF and native retry excluded');
  assert.equal(row(f,f.b).attack,210,'ATK counted once across retry');
  const other=await fixture();fight(other,{def:[2,6]});assert.equal(row(other,other.giver).cloversConsumedByRecipients,0);
});
test('Clover provenance survives reload between failed and final defense',async()=>{
  const f=await fixture();grant(f,5);prepare(f,1,f.b,f.a);f.E.rollAttack(f.s,5);f.E.rollDefense(f.s,6);
  assert.equal(f.s.phase,'defense');assert.equal(f.a.luck,0);assert.equal(row(f,f.giver).cloversConsumedByRecipients,0);
  f.s=f.E.restoreGame(JSON.parse(JSON.stringify(f.s)));f.E.rollDefense(f.s,5);
  assert.equal(row(f,f.giver).cloversConsumedByRecipients,1);assert.equal(row(f,f.a).defense,80);
});
test('Reraise saves life and credits donor, not consumer; untriggered heart gives no use points',async()=>{
  const f=await fixture();grant(f,6);assert.equal(row(f,f.giver).reraisesConsumedByRecipients,0);
  fight(f,{a:f.b,b:f.a,atk:5});assert(f.s.duel.reraised);
  assert.equal(row(f,f.giver).reraisesConsumedByRecipients,1);assert.equal(row(f,f.giver).rating,4);
  assert.equal(row(f,f.a).reraises,1);assert.equal(row(f,f.a).ratingBreakdown.reraises,undefined);
  assert.equal(row(f,f.a).rating,1,'real DEF 170 only, not old consumer +1');
});
test('dead donor and replacement keep stable UIDs, with no inherited support',async()=>{
  const f=await fixture();grant(f,3);const donor=f.giver;
  fight(f,{a:f.b,b:donor,atk:5,def:[5]});advance(f);
  assert(f.s.players[0].dead.some(u=>u.uid===donor.uid));const replacement=f.s.players[0].board[4];assert.notEqual(replacement.uid,donor.uid);
  fight(f);assert.equal(row(f,donor).assists,1);assert.equal(row(f,replacement).assists,0);
  const g=await fixture();grant(g,3);fight(g,{a:g.b,b:g.a,atk:5});advance(g);
  const next=g.s.players[0].board[0];assert.notEqual(next.uid,g.a.uid);assert.equal(next.physical,0);assert.equal(next.traitSources?.physical,undefined);
});
test('Kalistel abandoned roll neither consumes source nor doubles ATK; support has no numeric scores',async()=>{
  const f=await fixture({kalistel:true});grant(f,3);prepare(f,0,f.a,f.b);f.E.rollAttack(f.s,5);
  assert.equal(f.a.physical,60);assert.equal(f.s.duel.buff,0);f.s=f.E.restoreGame(f.s);f.E.useKalistel(f.s,6);f.E.rollDefense(f.s,6);
  assert.equal(row(f,f.a).attack,200);assert.equal(row(f,f.giver).assists,1);assert.equal(row(f,f.giver).attack,0);
});
for(const [die,metric] of [[5,'cloversConsumedByRecipients'],[6,'reraisesConsumedByRecipients']])test('dead original donor receives '+metric+' after another giver refreshes the charge',async()=>{
  const f=await fixture();grant(f,die);const other=f.s.players[0].board[3],profile=f.E.card(other);
  profile.atk[6-die]=f.E.card(f.giver).atk[6-die];profile.role=5;profile.canHeal=true;
  grant(f,die,f.a,other);assert.equal(row(f,other).support,0);assert.equal(f.a.traitSources[die===5?'luck':'reraise'].donor,f.giver.uid);
  fight(f,{a:f.b,b:f.giver,atk:5,def:[5]});advance(f);
  fight(f,{a:f.b,b:f.a,atk:5,def:die===5?[6,5]:[6]});
  assert.equal(row(f,f.giver)[metric],1);assert.equal(row(f,other)[metric],0);
});
test('self-given Clover and Reraise receive use points without a self assist',async()=>{
  for(const [die,metric] of [[5,'cloversConsumedByRecipients'],[6,'reraisesConsumedByRecipients']]){
    const f=await fixture();grant(f,die,f.giver);fight(f,{a:f.b,b:f.giver,atk:5,def:die===5?[6,5]:[6]});
    assert.equal(row(f,f.giver)[metric],1);assert.equal(row(f,f.giver).assists,0);
  }
});
test('ward consumed on a failed numeric attempt remains traceable if Clover ends with dodge',async()=>{
  const f=await fixture();grant(f,2);grant(f,5);fight(f,{a:f.b,b:f.a,atk:5,def:[5,1]});
  const event=f.s.match.events.at(-1);assert.equal(event.ward,0);assert.equal(event.wardConsumed,true);assert(event.sources.ward);
  assert.equal(row(f,f.a).defense,0);assert.equal(row(f,f.giver).cloversConsumedByRecipients,1);assert.equal(row(f,f.giver).assists,0);
  assert.deepEqual(f.E.restoreGame(f.s),f.s);
});
test('special Mort Reraise records use, never numeric ATK or fabricated assists',async()=>{
  const f=await fixture();grant(f,6);fight(f,{a:f.s.players[1].board[4],b:f.a,atk:1,def:[6]});
  assert.equal(f.s.duel.attackValue,'death');assert.equal(row(f,f.a).defense,0);assert.equal(row(f,f.giver).reraisesConsumedByRecipients,1);
  assert.equal(row(f,f.s.players[1].board[4]).attack,0);assert.equal(row(f,f.giver).assists,0);
});
test('legacy and in-progress unversioned matches retain original rating and no fabricated sources',async()=>{
  const f=await fixture();delete f.s.match.ratingVersion;grant(f,3);fight(f);
  assert.equal(f.a.traitSources,undefined);const old=f.E.matchStats(f.s);assert.equal(old.ratingVersion,1);
  for(const r of old.units){assert.equal(r.rating,P.calculate(r,1));assert.equal(r.assists,0);assert.equal(r.victory,0);}
  terminate(f);assert.deepEqual(f.E.matchStats(f.E.restoreGame(f.s)),f.E.matchStats(f.s));
});
test('forged donor, charge replay, unsupported version and stale active provenance are rejected',async()=>{
  const f=await fixture();grant(f,3);fight(f);
  for(const change of [s=>s.match.events.at(-1).sources.buff.donor='1-4',s=>s.match.events.at(-1).sources.buff.round=2,s=>s.match.ratingVersion=99,s=>{s.match.events.push({...structuredClone(s.match.events.at(-1)),round:3});s.round=3;}]){
    const s=structuredClone(f.s);change(s);assert.throws(()=>f.E.restoreGame(s));
  }
});
test('pending duel cannot replay a consumed source; completed snapshots remain restorable',async()=>{
  const f=await fixture();grant(f,3);fight(f);
  const source=structuredClone(f.s.duel.nativeSources.buff);
  assert.doesNotThrow(()=>f.E.restoreGame(f.s));advance(f);grant(f,3);
  prepare(f,0,f.a,f.s.players[1].board.find(Boolean));f.E.rollAttack(f.s,6);
  assert.doesNotThrow(()=>f.E.restoreGame(f.s));f.s.duel.nativeSources.buff=source;
  assert.throws(()=>f.E.restoreGame(f.s),/deja consommee/);
});
test('historical card faces validate with their snapshot without changing legacy rating or MVP',async()=>{
  const data=structuredClone(await catalogue),old=structuredClone(data),jill=old.cards.find(c=>c.id==='49700101');
  jill.atk[5]='retry';const E=createEngine(old),ids=old.decks.player.slice();ids[ids.findIndex(id=>E.byId[id].role===2)]=jill.id;
  const s=E.newGame(ids,ids,{seed:'INDEX-HISTORICAL-JILL',mode:'local',kalistel:true});delete s.match.ratingVersion;
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);const slot=s.players[0].board.findIndex(u=>u.cardId===jill.id);
  E.lock(s,slot,0);E.rollAttack(s,6);E.useKalistel(s,1);E.grantClover(s,s.duel.attacker);s.phase='over';s.winner=0;
  const before=E.matchStats(s);assert.throws(()=>createEngine(data).restoreGame(s),/Kalistel/);
  const archive={profiles:old.cards,rules:old.demo,arenas:old.arenas},H=require('./engine.js').createArchiveEngine(data,archive);
  assert.deepEqual(H.matchStats(H.restoreGame(s)),before);assert.deepEqual(T.awards(H.matchStats(s)),T.awards(before));
  assert.equal(before.ratingVersion,1);assert.equal(before.units.reduce((n,u)=>n+u.assists,0),0);
  assert.throws(()=>require('./engine.js').createArchiveEngine(data,{...archive,profiles:[{...jill,characterId:'another-person'}]}),/Profils historiques/);
});
test('support MVP without kills, losing-team MVP and legacy/new deterministic tiebreaks',()=>{
  const units=[{uid:'0-0',side:0,participated:true,kills:3,attack:400},{uid:'1-0',side:1,participated:true,support:5,assists:4,cloversConsumedByRecipients:2}].map(u=>({...u,rating:P.calculate(u)}));
  const summary={ratingVersion:2,complete:true,partial:false,units};assert.equal(T.leaders(summary,'rating')[0].uid,'1-0');assert.equal(T.awards(summary)['1-0'][0],'crystal');
  const tie={...summary,units:[{uid:'0-0',participated:true,rating:10,kills:1},{uid:'1-0',participated:true,rating:10,assists:1}]};
  assert.equal(T.leaders({...tie,ratingVersion:1},'rating')[0].uid,'0-0');assert.equal(T.leaders(tie,'rating')[0].uid,'1-0');
});

module.exports={fixture,grant,fight,advance,row};
