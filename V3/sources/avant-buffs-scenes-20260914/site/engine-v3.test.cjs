'use strict';
const assert=require('node:assert/strict');
const {createEngine}=require('./engine.js');
const {createData,numericData}=require('./engine-fixtures.cjs');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
function fixture({arenaId='ruins',prepare=()=>{},start=true}={}){
  const data=numericData();prepare(data);
  const E=createEngine(data),s=E.newGame(data.decks.player,data.decks.enemy,{seed:'TEST',arenaId});
  E.autoDeploy(s,0);E.autoDeploy(s,1);if(start)E.start(s);
  const a=s.players[0].board[2],b=s.players[1].board[0];
  return {data,E,s,a,b,ac:E.card(a),bc:E.card(b)};
}
function attack(f,die=6){f.E.lock(f.s,2,0);f.E.rollAttack(f.s,die);}
function duel(f){attack(f);if(f.s.phase==='defense')f.E.rollDefense(f.s,6);}
function rejectsUnchanged(fn,state,pattern){const before=structuredClone(state);assert.throws(fn,pattern);assert.deepEqual(state,before);}

test('Guard supports either side and both authorized roles, including self',()=>{
  for(const side of [0,1])for(const role of [1,5])for(const self of [false,true]){
    const f=fixture(),p=f.s.players[side],caster=p.board[role-1],recipient=self?caster:p.board[2];
    f.s.turn=side;const c=f.E.card(caster);c.role=role;c.canGuard=true;c.canHeal=role===5;c.atk[0]='guard';
    caster.mana=60;if(!self)recipient.luck=1;
    f.E.lock(f.s,role-1,0);f.E.rollAttack(f.s,6);
    assert.equal(f.s.phase,'guard');assert.equal(recipient.ward,0);assert.equal(caster.mana,60);
    const pending=f.E.restoreGame(f.s),rng=f.s.rng;
    assert.equal(f.E.grantGuard(f.s,recipient.uid),f.s);f.E.grantGuard(pending,recipient.uid);
    assert.deepEqual(pending,f.s);assert.equal(f.s.rng,rng);assert.equal(recipient.ward,60);
    assert.equal(recipient.luck,0);assert.equal(caster.mana,self?0:60);
    assert.equal(f.s.duel.guardGranted,recipient.uid);assert.equal(f.s.duel.formula,undefined);
    assert.deepEqual(f.s.duel.defenseRolls,[]);assert.equal(f.s.phase,'result');
    f.E.assertState(f.s);
  }
});

test('Guard rejects enemies, reserves, dead units, invalid phases and duplicate grants atomically',()=>{
  const f=fixture(),p=f.s.players[0];p.dead.push(p.reserve.pop());
  rejectsUnchanged(()=>f.E.grantGuard(f.s,f.a.uid),f.s);
  f.ac.atk[0]='guard';attack(f);
  for(const uid of [f.b.uid,p.reserve[0].uid,p.dead[0].uid,null,'0-99'])rejectsUnchanged(()=>f.E.grantGuard(f.s,uid),f.s);
  rejectsUnchanged(()=>f.E.rollAttack(f.s,6),f.s);
  rejectsUnchanged(()=>f.E.rollDefense(f.s,6),f.s);
  f.E.grantGuard(f.s,f.a.uid);rejectsUnchanged(()=>f.E.grantGuard(f.s,f.a.uid),f.s);
});

test('Guard AI chooses an unprotected living ally using no RNG or hidden state',()=>{
  for(const side of [0,1]){
    const f=fixture(),p=f.s.players[side];f.s.turn=side;
    p.board.forEach(u=>u.reraise=1);p.board[3].reraise=0;p.board[4].reraise=0;
    f.E.card(p.board[3]).defense.fill(20);f.E.card(p.board[4]).defense.fill(200);
    const before=structuredClone(f.s);assert.equal(f.E.aiGuardChoice(f.s),p.board[3].uid);assert.deepEqual(f.s,before);
    f.s.rng=42;assert.equal(f.E.aiGuardChoice(f.s),p.board[3].uid);
  }
});

test('Ward is consumed on every first numeric physical defense, including zero ATK, ties and lethal hits',()=>{
  for(const value of [0,100,160,161]){
    const f=fixture();f.ac.atk[0]=value;f.b.ward=60;duel(f);
    assert.equal(f.b.ward,0);assert.equal(f.s.duel.ward,60);assert.equal(f.s.duel.formula.ward,60);
    assert.equal(f.s.duel.formula.defense,160);assert.equal(f.s.duel.formula.attack,value);
    assert.equal(f.s.players[1].dead.length,value>160?1:0);f.E.assertState(f.s);
  }
});

test('Magic, dodge and Mort leave ward untouched',()=>{
  for(const kind of ['magic','dodge','death','magic-death']){
    const f=fixture();f.b.ward=60;
    if(kind.includes('magic'))f.ac.magic=[6];
    if(kind.includes('death'))f.ac.atk[0]='death';
    if(kind==='dodge')f.bc.defense[0]='dodge';
    duel(f);assert.equal(f.b.ward,60);assert.equal(f.s.duel.ward,0);
    if(kind==='magic'){assert.equal(f.s.duel.formula.ward,0);assert.equal(f.s.duel.formula.defense,100);}
    else assert.equal(f.s.duel.formula,undefined);
    assert.equal(f.s.players[1].dead.length,kind.includes('death')?1:0);f.E.assertState(f.s);
  }
});

test('Printed DEF retries preserve ward until the first numeric defense',()=>{
  const f=fixture();f.b.ward=60;f.bc.defense[0]='retry';f.bc.defense[1]='retry';duel(f);
  assert.equal(f.b.ward,60);assert.equal(f.s.duel.ward,0);
  f.E.rollDefense(f.s,5);const saved=f.E.restoreGame(f.s);assert.equal(f.b.ward,60);
  f.E.rollDefense(f.s,4);f.E.rollDefense(saved,4);assert.deepEqual(saved,f.s);
  assert.equal(f.b.ward,0);assert.equal(f.s.duel.formula.ward,60);assert.equal(f.s.duel.formula.defense,160);
});

test('Consumed ward is not renewed on the next exchange',()=>{
  const f=fixture();f.b.ward=60;duel(f);f.E.next(f.s);f.s.turn=0;duel(f);
  assert.equal(f.s.duel.ward,0);assert.equal(f.s.duel.formula.ward,0);assert.equal(f.s.duel.formula.defense,100);
});

test('Spent ward stays in a saved duel through subsequent retries without a second live trait',()=>{
  const f=fixture();f.ac.atk[0]=200;f.bc.defense[1]='retry';f.bc.defense[2]=150;attack(f);
  // Exercise a resumed numeric reroll with the trait already spent, not stacked.
  const d=f.s.duel;d.ward=60;d.defenseRolls=[6];d.defenseDie=6;d.defenseValue=100;d.autoDefense=true;d.luckUsed=f.b.uid;
  d.failedDefense={baseAttack:200,weapon:0,element:0,faction:0,buff:0,barrier:0,baseDefense:100,race:0,magic:false,arenaAttack:0,arenaDefense:0,ward:60,attack:200,defense:160};
  d.formula=structuredClone(d.failedDefense);
  assert.equal(f.E.trait(f.b),null);f.E.assertState(f.s);
  const copy=f.E.restoreGame(f.s);
  for(const s of [f.s,copy]){f.E.rollDefense(s,5);f.E.assertState(s);f.E.rollDefense(s,4);f.E.assertState(s);}
  assert.deepEqual(copy,f.s);assert.equal(f.b.ward,0);assert.equal(f.s.duel.formula.ward,60);
  assert.equal(f.s.duel.formula.defense,210);assert.equal(f.s.match.events.length,1);
});

test('Ward coexists with numeric synergies and home defense, but never other live traits',()=>{
  const f=fixture({arenaId:'forge'});f.b.ward=60;f.E.card(f.s.players[1].board[1]).race=f.bc.race;
  duel(f);assert.equal(f.s.duel.formula.race,10);assert.equal(f.s.duel.formula.arenaDefense,10);
  assert.equal(f.s.duel.formula.defense,180);assert.equal(f.s.duel.formula.arenaAttack,25);f.E.assertState(f.s);
  for(const zone of ['board','reserve','dead'])for(const key of ['luck','reraise','mana','physical']){
    const x=fixture(),p=x.s.players[0];if(zone==='dead')p.dead.push(p.reserve.pop());
    p[zone][0].ward=60;p[zone][0][key]=['mana','physical'].includes(key)?60:1;
    rejectsUnchanged(()=>x.E.restoreGame(x.s),x.s,/seul trait/);
  }
});

test('Arena bonuses use character identity across versions and both teams',()=>{
  const f=fixture({arenaId:'forge',prepare:data=>{
    data.cards[2].characterId='momo';data.cards[10].characterId='momo';
    data.arenas.find(a=>a.id==='forge').homeCharacters=['momo','momo'];
  }});
  const expected={attack:25,defense:10,element:15,homeAttack:10,homeDefense:10},before=structuredClone(f.s);
  assert.notEqual(f.a.cardId,f.b.cardId);assert.deepEqual(f.E.arenaBonuses(f.s,f.a),expected);
  assert.deepEqual(f.E.arenaBonuses(f.s,f.b),expected);assert.deepEqual(f.s,before);
  assert.deepEqual(f.E.arenaBonuses(f.s,f.s.players[0].board[1]),{attack:15,defense:0,element:15,homeAttack:0,homeDefense:0});
});

test('Arena numeric modifiers are symmetric for physical and magical attacks',()=>{
  for(const side of [0,1])for(const magic of [false,true]){
    const f=fixture({arenaId:'forge'});f.s.turn=side;const slot=side===0?2:0,target=side===0?0:2;
    f.E.card(f.s.players[side].board[slot]).magic=magic?[6]:[];
    f.E.lock(f.s,slot,target);f.E.rollAttack(f.s,6);f.E.rollDefense(f.s,6);
    const formula=f.s.duel.formula;assert.equal(formula.arenaAttack,25);assert.equal(formula.arenaDefense,10);
    assert.equal(formula.attack,125);assert.equal(formula.defense,110);assert.equal(formula.ward,0);
    for(const field of ['baseAttack','weapon','element','faction','buff','barrier','baseDefense','race','magic'])assert.notEqual(formula[field],undefined);
    f.E.assertState(f.s);
  }
});

test('Second chance keeps arena bonuses and spent mana while recalculating the new barrier',()=>{
  const f=fixture({arenaId:'forge'});f.a.mana=60;f.ac.magic=[6];f.b.luck=1;f.bc.defense.fill(150);f.bc.barriers=[5];
  duel(f);assert.equal(f.s.phase,'defense');assert.equal(f.a.mana,0);assert.equal(f.b.luck,0);
  assert.equal(f.s.duel.failedDefense.attack,185);assert.equal(f.s.duel.failedDefense.defense,160);
  const restored=f.E.restoreGame(f.s);f.E.rollDefense(f.s,5);f.E.rollDefense(restored,5);assert.deepEqual(restored,f.s);
  assert.equal(f.s.duel.formula.attack,155);assert.equal(f.s.duel.formula.defense,160);
  assert.equal(f.s.duel.formula.arenaAttack,25);assert.equal(f.s.duel.formula.arenaDefense,10);
  assert.equal(f.s.duel.formula.buff,60);assert.equal(f.s.match.events.length,1);f.E.assertState(f.s);
});

test('Combat AI accounts for arena affinity and opposing wards without touching RNG',()=>{
  const f=fixture({arenaId:'forge'});f.s.players[1].board.forEach(u=>u.ward=60);
  f.s.players[1].board[1].ward=0;
  const before=structuredClone(f.s);assert.deepEqual(f.E.aiChoice(f.s),[2,1]);assert.deepEqual(f.s,before);
});

test('NONE receives home affinity but no elemental arena bonus or barrier',()=>{
  const f=fixture({arenaId:'forge'});f.ac.element='NONE';f.bc.element='NONE';f.bc.barriers=[6];f.ac.magic=[6];
  assert.deepEqual(f.E.arenaBonuses(f.s,f.a),{attack:10,defense:10,element:0,homeAttack:10,homeDefense:10});
  duel(f);assert.equal(f.s.duel.formula.barrier,0);assert.equal(f.s.duel.formula.attack,110);
  const noneArena=fixture({prepare:data=>{data.cards[2].element='NONE';data.arenas[0].elementBonus=15;}});
  assert.equal(noneArena.E.arenaBonuses(noneArena.s,noneArena.a).element,0);
});

test('RAINBOW matches only its own arena crystal',()=>{
  const f=fixture({arenaId:'rainbow-lab',prepare:data=>{data.cards[2].element='RAINBOW';data.cards[2].characterId='momo';}});
  assert.deepEqual(f.E.arenaBonuses(f.s,f.a),{attack:25,defense:10,element:15,homeAttack:10,homeDefense:10});
  assert.equal(f.E.arenaBonuses(f.s,f.b).attack,0);
});

test('Arena effects never manufacture numeric scores for support, dodge or Mort',()=>{
  for(const kind of ['guard','revive','retry','mana','buff_atk','death','dodge']){
    const f=fixture({arenaId:'forge'});if(kind==='dodge')f.bc.defense[0]='dodge';else f.ac.atk[0]=kind;
    duel(f);
    const grant={guard:'grantGuard',revive:'grantReraise',retry:'grantClover',mana:'grantPotion'}[kind];
    if(grant)f.E[grant](f.s,f.a.uid);
    assert.equal(f.s.duel.formula,undefined);const e=f.s.match.events[0];
    assert.equal(e.attack,0);assert.equal(e.defense,0);assert.equal(e.arenaAttack,0);assert.equal(e.arenaDefense,0);
    f.E.assertState(f.s);
  }
});

test('Dynamic arena catalog replaces hardcoded choices and defaults to its first entry without ruins',()=>{
  const data=numericData();data.arenas=[{...data.arenas[1],id:'new-place-42'}];const E=createEngine(data);
  const s=E.newGame(data.decks.player,data.decks.enemy);assert.equal(s.arenaId,'new-place-42');
  assert.deepEqual(E.restoreGame(s),s);assert.throws(()=>E.newGame(data.decks.player,data.decks.enemy,{arenaId:'forge'}),/Arène/);
  delete data.arenas;const neutral=createEngine(data);assert.equal(neutral.newGame(data.decks.player,data.decks.enemy).arenaId,'ruins');
});

test('Arena selection is atomic, setup-only, and does not advance RNG',()=>{
  const f=fixture({start:false}),rng=f.s.rng;assert.equal(f.E.setArena(f.s,'z13'),f.s);assert.equal(f.s.arenaId,'z13');assert.equal(f.s.rng,rng);
  rejectsUnchanged(()=>f.E.setArena(f.s,'forge-missing'),f.s,/Arène/);f.E.start(f.s);
  for(const phase of ['choose','attack','defense','guard','heart','result','replace','over']){
    const s=structuredClone(f.s);s.phase=phase;
    rejectsUnchanged(()=>f.E.setArena(s,'forge'),s,/verrouillée/);
    rejectsUnchanged(()=>f.E.setArena(s,'z13'),s,/verrouillée/);
  }
});

test('Malformed or excessive arena definitions are rejected',()=>{
  for(const mutate of [d=>d.arenas=[],d=>d.arenas=null,d=>d.arenas.push(d.arenas[0]),
    d=>d.arenas[0].id='../x',d=>d.arenas[0].element='unknown',d=>d.arenas[0].elementBonus=16,
    d=>d.arenas[0].homeAttack=11,d=>d.arenas[0].homeDefense=11,d=>d.arenas[0].elementBonus=-1,
    d=>d.arenas[0].homeCharacters='momo',d=>d.arenas[0].homeCharacters=[30000001],d=>d.arenas[0].homeAttack=NaN]){
    const data=createData();mutate(data);assert.throws(()=>createEngine(data),/rène/);
  }
});

test('Guard and Reraise permissions are enforced in profiles and before dice or grants mutate state',()=>{
  for(const face of ['guard','revive'])for(const role of [1,2,3,4,5])for(const enabled of [false,true]){
    const data=numericData(),c=data.cards[2];c.role=role;c.canGuard=face==='guard'&&enabled;c.canHeal=face==='revive'&&enabled;c.atk[0]=face;
    const allowed=enabled&&(face==='guard'?[1,5].includes(role):role===5);
    if(allowed)assert.doesNotThrow(()=>createEngine(data));else assert.throws(()=>createEngine(data));
  }
  for(const [face,key,grant] of [['guard','canGuard','grantGuard'],['revive','canHeal','grantReraise']]){
    const f=fixture();f.ac.atk[0]=face;f.E.lock(f.s,2,0);f.ac[key]=false;
    rejectsUnchanged(()=>f.E.rollAttack(f.s),f.s,/profil/);f.ac[key]=true;f.E.rollAttack(f.s,6);f.ac[key]=false;
    rejectsUnchanged(()=>f.E[grant](f.s,f.a.uid),f.s);
    rejectsUnchanged(()=>f.E.restoreGame(f.s),f.s,/profil/);
  }
});

test('V3 profile validation rejects legacy IDs, missing metadata, illegal faces and NONE barriers',()=>{
  for(const mutate of [c=>c.id='00000001',c=>c.id='30000000',c=>c.id='30000042',c=>delete c.characterId,
    c=>c.role=0,c=>c.sentry='yes',c=>delete c.canGuard,c=>delete c.canHeal,c=>c.atk.pop(),
    c=>c.atk[0]='shield_physical',c=>c.defense[0]='shield_physical',c=>c.defense[0]='shield_magic',
    c=>c.defense[0]='guard',c=>c.magic=[7],c=>c.element='UNKNOWN',c=>c.barriers=[6]]){
    const data=createData();mutate(data.cards[0]);assert.throws(()=>createEngine(data));
  }
  const data=createData();data.cards[0].id='30000041';assert.doesNotThrow(()=>createEngine(data));
  data.cards[1].id='30000041';assert.throws(()=>createEngine(data),/dupliqu/);
});

test('K3 identifiers distinguish all four copies, persist through deployment and reject K2 even with schema 6',()=>{
  const data=createData(),E=createEngine(data),deck=data.cards.slice(0,5).flatMap(c=>[c.id,c.id]);
  const s=E.newGame(deck,deck),ids=s.players.flatMap(p=>p.reserve).map(u=>u.instanceId);
  assert.equal(new Set(ids).size,20);assert.deepEqual(ids.filter(id=>id.includes('30000001')),['K3-30000001-001','K3-30000001-002','K3-30000001-003','K3-30000001-004']);
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);assert.deepEqual(E.restoreGame(s),s);
  for(const mutate of [x=>x.players[0].board[0].instanceId='K2-30000001-001',x=>x.players[0].board[0].cardId='00000001']){
    const bad=structuredClone(s);mutate(bad);rejectsUnchanged(()=>E.restoreGame(bad),bad,/V2.*V3/);
  }
  const bad=structuredClone(s);bad.players[0].board[0].instanceId=bad.players[0].reserve[0].instanceId;
  assert.throws(()=>E.restoreGame(bad),/Identité/);
});

test('Malformed pending guards, tokens and recipients are rejected without mutation',()=>{
  const f=fixture();f.ac.atk[0]='guard';attack(f);
  for(const mutate of [s=>s.duel=null,s=>s.duel.attackValue=100,s=>s.duel.attackRolls=[],s=>s.duel.defenseRolls=[6],
    s=>s.duel.guardGranted=f.a.uid,s=>s.duel.guardGranted=f.b.uid,s=>s.duel.ward=60,s=>s.duel.ward=120,s=>s.duel.buff=60,s=>s.phase='attack',
    s=>s.players[0].reserve[0].ward=1,s=>delete s.players[0].reserve[0].ward,s=>delete s.arenaId,s=>s.schema=7]){
    const bad=structuredClone(f.s);mutate(bad);rejectsUnchanged(()=>f.E.restoreGame(bad),bad);
  }
  f.E.grantGuard(f.s,f.a.uid);
  for(const mutate of [s=>s.duel.guardGranted=f.b.uid,s=>s.duel.guardGranted=s.players[0].reserve[0].uid,s=>delete s.duel.guardGranted,
    s=>s.duel.attackValue='retry',s=>s.match.events[0].recipient=f.b.uid,s=>s.match.events[0].ward=120,s=>s.match.events[0].arenaAttack=15]){
    const bad=structuredClone(f.s);mutate(bad);rejectsUnchanged(()=>f.E.restoreGame(bad),bad);
  }
});

test('V3 numeric formula imports require all bonus fields and consistent totals',()=>{
  const f=fixture({arenaId:'forge'});f.b.ward=60;duel(f);
  for(const field of ['arenaAttack','arenaDefense','ward'])for(const value of [undefined,-1,1000,'60']){
    const bad=structuredClone(f.s);bad.duel.formula[field]=value;rejectsUnchanged(()=>f.E.restoreGame(bad),bad);
  }
  for(const mutate of [s=>s.duel.formula.attack++,s=>s.duel.formula.defense++,s=>s.duel.ward=0,
    s=>s.duel.magic=true,s=>s.duel.formula.magic=true,s=>s.lastDuel.formula.ward=0,s=>s.duel.formula=null,s=>s.players[1].board[0].ward=60]){
    const bad=structuredClone(f.s);mutate(bad);rejectsUnchanged(()=>f.E.restoreGame(bad),bad);
  }
});

test('Stored guard survives magic and is consumed only on a later physical defense',()=>{
  const f=fixture();f.ac.atk[0]='guard';attack(f);f.E.grantGuard(f.s,f.a.uid);f.E.next(f.s);
  f.bc.magic=[6];f.E.lock(f.s,0,2);f.E.rollAttack(f.s,6);f.E.rollDefense(f.s,6);assert.equal(f.a.ward,60);
  f.E.next(f.s);f.s.turn=1;f.bc.magic=[];f.E.lock(f.s,0,2);f.E.rollAttack(f.s,6);f.E.rollDefense(f.s,6);
  assert.equal(f.a.ward,0);assert.equal(f.s.duel.formula.ward,60);f.E.assertState(f.s);
});

test('Seed and xorshift RNG sequence are unchanged; arena and support AI never consume draws',()=>{
  const f=fixture();f.bc.defense.fill(1000);
  const expected=[[3902656784,6],[88142255,1],[1976999605,3],[1712184085,3],[1888330210,3],[1384248570,2]];
  assert.equal(f.s.rng,3000449509);
  for(let i=0;i<expected.length;i+=2){
    f.E.aiGuardChoice(f.s);f.E.aiChoice(f.s);f.E.arenaBonuses(f.s,f.a);
    f.E.lock(f.s,2,0);f.E.rollAttack(f.s);
    assert.equal(f.s.rng,expected[i][0]);assert.equal(f.s.duel.attackDie,expected[i][1]);
    const restored=f.E.restoreGame(f.s);f.E.rollDefense(f.s);f.E.rollDefense(restored);
    assert.deepEqual(restored,f.s);assert.equal(f.s.rng,expected[i+1][0]);assert.equal(f.s.duel.defenseDie,expected[i+1][1]);
    f.E.next(f.s);f.s.turn=0;
  }
});

console.log(count+' V3 engine tests passed.');
