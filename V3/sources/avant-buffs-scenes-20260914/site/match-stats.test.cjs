const assert=require('node:assert/strict');
const {createData,numericData}=require('./engine-fixtures.cjs');
const original=createData();
const {createEngine}=require('./engine.js');let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
function fixture(){const data=numericData(),E=createEngine(data),s=E.newGame(data.decks.player,data.decks.enemy,{mode:'local',seed:'MATCH-QA',arenaId:'ruins'});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);return {E,s,a:s.players[0].board[2],b:s.players[1].board[0]};}
const run=f=>{f.E.lock(f.s,2,0);f.E.rollAttack(f.s,6);if(f.s.phase==='defense')f.E.rollDefense(f.s,6);};
const unit=(f,u)=>f.E.matchStats(f.s).units.find(x=>x.uid===u.uid);
test('Kill and defense totals belong to actual units, not their card version or side role',()=>{const f=fixture();f.E.card(f.a).atk[0]=170;run(f);assert.equal(unit(f,f.a).attack,170);assert.equal(unit(f,f.a).kills,1);assert.equal(unit(f,f.a).breakthrough,70);assert.equal(unit(f,f.b).defense,100);assert.equal(unit(f,f.b).deaths,1);assert.equal(unit(f,f.b).holds,0);assert.equal(f.s.match.events.length,1);assert.deepEqual(f.E.restoreGame(f.s),f.s);f.E.assertState(f.s);});
test('Side two attacks: offense credited to the right, defense to the left',()=>{const f=fixture();f.s.turn=1;f.E.card(f.b).atk[0]=150;f.E.lock(f.s,0,2);f.E.rollAttack(f.s,6);f.E.rollDefense(f.s,6);assert.equal(f.E.matchStats(f.s).teams[1].kills,1);assert.equal(unit(f,f.a).defense,100);assert.equal(unit(f,f.b).attack,150);});
test('Reraise saves a life without a kill, hold or death',()=>{const f=fixture();f.E.card(f.a).atk[0]=150;f.b.reraise=1;run(f);assert.equal(unit(f,f.a).kills,0);assert.equal(unit(f,f.b).reraises,1);assert.equal(unit(f,f.b).holds,0);assert.equal(unit(f,f.b).deaths,0);});
test('Clover failure and retry are never accumulated; only the final defense counts',()=>{const f=fixture();f.E.card(f.a).atk[0]=160;f.b.luck=1;f.E.card(f.b).defense[1]=200;run(f);assert.equal(f.s.phase,'defense');assert.equal(f.s.match.events.length,0);const saved=f.E.restoreGame(f.s);f.E.rollDefense(saved,5);f.E.rollDefense(f.s,5);assert.deepEqual(f.s,saved);assert.equal(unit(f,f.a).attack,160);assert.equal(unit(f,f.b).defense,200);assert.equal(unit(f,f.b).luckUsed,1);assert.equal(unit(f,f.b).defenseRolls,2);assert.equal(unit(f,f.b).holds,1);});
test('Dodge and shield cancel numeric scores but count as stops',()=>{for(const v of ['dodge','shield_physical']){const f=fixture();f.E.card(f.b).defense[0]=v;run(f);assert.equal(unit(f,f.a).attack,0);assert.equal(unit(f,f.b).holds,1);assert.equal(unit(f,f.b)[v==='dodge'?'dodges':'shields'],1);}});
test('Mort records a real kill without invented numerical damage',()=>{const f=fixture();f.E.card(f.a).atk[0]='death';run(f);assert.equal(unit(f,f.a).kills,1);assert.equal(unit(f,f.a).attack,0);assert.equal(unit(f,f.a).breakthrough,0);});
test('All five support types count the caster; ally gifts and unchanged refreshes are distinct',()=>{
 for(const [face,key,grant] of [['mana','potions','grantPotion'],['retry','clovers','grantClover'],['revive','hearts','grantReraise'],['buff_atk','physical',null],['guard','guards','grantGuard']]){
  const f=fixture();f.E.card(f.a).atk[0]=face;run(f);
  if(grant)f.E[grant](f.s,f.s.players[0].board[0].uid);
  assert.equal(unit(f,f.a).support,1);assert.equal(unit(f,f.a)[key],1);assert.equal(unit(f,f.a).alliedSupport,grant?1:0);assert.equal(unit(f,f.b).defended,0);
  f.E.next(f.s);f.s.turn=0;run(f);if(grant)f.E[grant](f.s,f.s.players[0].board[0].uid);
  assert.equal(unit(f,f.a).support,1);assert.equal(unit(f,f.a).refreshes,1);f.E.assertState(f.s);
 }
});
test('Identical copies remain separate by UID and team totals equal the sum of unit totals',()=>{const f=fixture();run(f);const stats=f.E.matchStats(f.s);assert.equal(new Set(stats.units.map(u=>u.uid)).size,20);for(const t of stats.teams)for(const key of ['attack','defense','kills','support','rating'])assert.equal(t[key],stats.units.filter(u=>u.side===t.side).reduce((sum,u)=>sum+u[key],0));});
test('V3 saves without telemetry remain explicitly partial without RNG changes',()=>{const f=fixture();delete f.s.match;f.s.round=17;const before=structuredClone(f.s),restored=f.E.restoreGame(f.s);assert.deepEqual(before,restored);assert.equal(f.E.matchStats(restored).partial,true);run(f);assert.equal(f.s.match.fromRound,17);assert.equal(f.s.match.partial,true);assert.equal(f.s.match.events.length,1);assert.equal(f.s.rng,before.rng);});
test('Unknown arenas and malformed telemetry are rejected',()=>{const f=fixture();run(f);for(const mutate of [s=>s.arenaId='../../x',s=>s.match.events[0].attack=-1,s=>s.match.events[0].attacker='1-0',s=>s.match.events[0].kill=1,s=>s.match.events[0].recipient='1-5',s=>s.match.events.push(s.match.events[0]),s=>s.match.fromRound=0]){const bad=structuredClone(f.s);mutate(bad);assert.throws(()=>f.E.restoreGame(bad));}});
test('Reading statistics is pure and cannot accumulate points',()=>{const f=fixture();run(f);const saved=structuredClone(f.s),stats=f.E.matchStats(f.s);assert.deepEqual(stats,f.E.matchStats(f.s));assert.deepEqual(f.s,saved);});
test('A V3 save missing even its first resolved exchange is explicitly partial',()=>{const f=fixture();run(f);delete f.s.match;assert.equal(f.s.round,1);assert.equal(f.E.matchStats(f.s).partial,true);assert.equal(f.E.matchStats(f.s).exchanges,0);});
test('Complete deterministic campaigns agree with real casualties and survive JSON import',()=>{const E=createEngine(original);for(let n=0;n<20;n++){const s=E.newGame(original.decks.player,original.decks.enemy,{seed:'STATS-'+n,arenaId:original.arenas[n%original.arenas.length].id});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);let actions=0;while(s.phase!=='over'&&actions++<10000){if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='defense')E.rollDefense(s);else if(s.phase==='guard')E.grantGuard(s,E.aiGuardChoice(s));else if(s.phase==='heart')E.grantReraise(s,E.aiReraiseChoice(s));else if(s.phase==='clover')E.grantClover(s,E.aiCloverChoice(s));else if(s.phase==='potion')E.grantPotion(s,E.aiPotionChoice(s));else if(s.phase==='result')E.next(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);E.assertState(s);}assert.equal(s.phase,'over');const stats=E.matchStats(s);for(const side of [0,1])assert.equal(stats.teams[side].kills,s.players[1-side].dead.length);assert.equal(stats.exchanges,s.log.filter(l=>l.type==='result').length);assert.deepEqual(E.matchStats(E.restoreGame(JSON.parse(JSON.stringify(s)))),stats);}});
test('Debuffer credits weapon, element and barrier reductions to the defender',()=>{
 const f=fixture();f.E.card(f.a).atk.fill(200);f.E.card(f.a).weapon='Poing';f.E.card(f.b).weapon='Arc';f.E.card(f.a).element='CRYO';f.E.card(f.b).element='PYRO';f.E.card(f.a).magic=[6];f.E.card(f.b).barriers=[6];run(f);
 assert.equal(unit(f,f.b).debuff,110);assert.equal(unit(f,f.a).debuff,0);assert.equal(unit(f,f.b).rating,6);
});
test('Ward support is credited to its caster and spent defense to the recipient on either side',()=>{
 for(const side of [0,1]){
  const f=fixture(),caster=f.s.players[side].board[0],recipient=f.s.players[side].board[1],enemy=f.s.players[1-side].board[0];
  f.s.turn=side;f.E.card(caster).atk[0]='guard';f.E.lock(f.s,0,0);f.E.rollAttack(f.s,6);f.E.grantGuard(f.s,recipient.uid);
  assert.equal(unit(f,caster).guards,1);assert.equal(unit(f,caster).support,1);assert.equal(unit(f,recipient).guards,0);assert.equal(unit(f,enemy).holds,0);
  f.E.next(f.s);f.E.lock(f.s,0,1);f.E.rollAttack(f.s,6);f.E.rollDefense(f.s,6);
  assert.equal(unit(f,recipient).ward,60);assert.equal(unit(f,recipient).defense,160);assert.equal(unit(f,recipient).shields,0);assert.equal(unit(f,recipient).holds,1);
  assert.equal(unit(f,caster).ward,0);assert.equal(f.E.matchStats(f.s).version,3);assert.deepEqual(f.E.matchStats(f.E.restoreGame(f.s)),f.E.matchStats(f.s));
 }
});

test('Arena and ward totals are separate contributions, not double-counted scores',()=>{
 const data=numericData(),E=createEngine(data),s=E.newGame(data.decks.player,data.decks.enemy,{arenaId:'forge'});
 E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);const f={E,s,a:s.players[0].board[2],b:s.players[1].board[0]};f.b.ward=60;run(f);
 assert.equal(unit(f,f.a).attack,125);assert.equal(unit(f,f.a).arenaAttack,25);assert.equal(unit(f,f.b).defense,170);
 assert.equal(unit(f,f.b).arenaDefense,10);assert.equal(unit(f,f.b).ward,60);assert.equal(unit(f,f.b).debuff,0);
 const stats=E.matchStats(s);for(const t of stats.teams)for(const key of ['guards','ward','arenaAttack','arenaDefense'])assert.equal(t[key],stats.units.filter(u=>u.side===t.side).reduce((sum,u)=>sum+u[key],0));
 const before=structuredClone(s);assert.deepEqual(E.matchStats(s),stats);assert.deepEqual(s,before);
});

test('Unused ward never contributes defense statistics on magic, dodge or Mort',()=>{
 for(const kind of ['magic','dodge','death']){
  const f=fixture();f.b.ward=60;if(kind==='magic')f.E.card(f.a).magic=[6];if(kind==='dodge')f.E.card(f.b).defense[0]='dodge';if(kind==='death')f.E.card(f.a).atk[0]='death';
  run(f);assert.equal(unit(f,f.b).ward,0);assert.equal(f.b.ward,60);assert.equal(unit(f,f.b).defense,kind==='magic'?100:0);
 }
});

test('V3 statistics reject V2 input and malformed V3 bonus telemetry',()=>{
 const f=fixture();run(f);
 for(const mutate of [s=>s.match.events[0].ward=1,s=>s.match.events[0].arenaAttack=26,s=>s.match.events[0].arenaDefense=11,
   s=>delete s.match.events[0].ward,s=>s.match.events[0].support='guard',s=>s.schema=5]){
  const bad=structuredClone(f.s);mutate(bad);assert.throws(()=>f.E.restoreGame(bad));
 }
 const old=structuredClone(f.s);old.schema=5;assert.throws(()=>f.E.matchStats(old),/V2/);
});

console.log(count+' match statistics tests passed.');
