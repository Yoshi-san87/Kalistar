'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildCatalog}=require('../atelier/game-catalog.cjs');
const {createEngine}=require('./engine.js'),Composition=require('./team-composition.js'),Library=require('./deck-library.js'),Q=require('./equipment.js');
const dataPromise=buildCatalog();
async function fixture({links=false,defense=200,versatile=false}={}){
  const data=structuredClone(await dataPromise);
  if(links)for(const c of data.cards){c.faction='Durane';c.race='HUMAIN';c.atk=[300,300,300,300,300,300];c.defense=Array(6).fill(defense);}
  if(versatile)for(const c of data.cards)c.positions=[1,2,3,4,5];
  const E=createEngine(data),T=Composition.create(E),team=T.normalize({name:'Les Sentry',cards:data.decks.player});
  team.captain=team.formation[0];
  const s=E.newGame(team,team,{mode:'local',seed:'COMPOSITION',kalistel:false});
  return {data,E,T,team,s};
}
function step(E,s){
  if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
  else if(s.phase==='attack')E.rollAttack(s);
  else if(s.phase==='kalistel')E.acceptAttack(s);
  else if(s.phase==='defense')E.rollDefense(s);
  else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
  else if(s.phase==='result')E.next(s);
  else {const kinds={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']},[grant,choose]=kinds[s.phase];E[grant](s,E[choose](s));}
}
test('explicit formation wins over inventory order; both sides start immediately and cannot recall',async()=>{
  const {E,team,s}=await fixture();
  assert.equal(s.phase,'choose');assert.deepEqual(s.players[0].board.map(u=>u.cardId),team.formation);
  assert.deepEqual(s.players[1].board.map(u=>u.cardId),team.formation);
  assert.equal(s.players[0].reserve.length,5);assert.throws(()=>E.recall(s,0,0));assert.throws(()=>E.deploy(s,0,s.players[0].reserve[0].uid,0));
  const reversed={...team,cards:team.cards.slice().reverse()};assert.deepEqual(E.newGame(reversed,team).players[0].board.map(u=>u.cardId),team.formation);
  assert.deepEqual(E.restoreGame(s),s);
});
test('P1/P2 incompatibilities, missing and reserve captain, unknown and incompatible weapons fail closed',async()=>{
  const {E,team,data}=await fixture();
  for(const position of [1,2]){
    const id=team.cards.find(id=>!E.byId[id].positions.includes(position));
    const bad=structuredClone(team),old=bad.formation[position-1],index=bad.formation.indexOf(id);
    bad.formation[position-1]=id;if(index>=0)bad.formation[index]=old;
    assert.ok(E.validateComposition(bad).some(e=>e.includes('ne peut pas occuper P'+position)));
    assert.throws(()=>E.newGame(bad,team));
  }
  assert.throws(()=>E.newGame({...team,captain:null},team),/capitaine/);
  assert.throws(()=>E.newGame({...team,captain:team.cards.find(id=>!team.formation.includes(id))},team),/capitaine/);
  assert.throws(()=>E.newGame({...team,equipment:{[data.cards.find(c=>c.characterId==='momo').characterId]:'fallen-king-axe'}},team),/Equipement/);
  assert.throws(()=>E.newGame({...team,equipment:{unknown:'unknown'}},team),/Equipement/);
});
test('migration is deterministic, retains all inventory and copies equipment defaults once',async()=>{
  const data=await dataPromise,E=createEngine(data),defaults=Q.emptyLoadout(),T=Composition.create(E,()=>defaults);
  defaults.relic.momo='little-joys-flute';defaults.weapon.balmhyr='fallen-king-axe';defaults.shield.balmhyr='durane-rampart';
  const old={name:'Ancien',cards:data.decks.player.slice()},team=T.normalize(old);
  assert.deepEqual(team.cards,old.cards);assert.deepEqual(team.formation,E.lineup(old.cards).map(i=>old.cards[i]));assert.equal(team.captain,null);
  assert.equal(team.equipment.relic.momo,'little-joys-flute');assert.equal(team.equipment.weapon.balmhyr,'fallen-king-axe');
  assert.equal(team.equipment.shield.balmhyr,'durane-rampart');delete defaults.relic.momo;delete defaults.weapon.balmhyr;
  assert.equal(T.normalize(team).equipment.relic.momo,'little-joys-flute');assert.equal(T.normalize(team).equipment.weapon.balmhyr,'fallen-king-axe');
  assert.deepEqual(T.normalize(team).formation,team.formation);
  const historical=Composition.create(E,()=>({momo:'little-joys-flute'})).normalize(old);
  assert.equal(historical.equipment.relic.momo,'little-joys-flute');assert.deepEqual(historical.cards,old.cards);
  const explicit={...team,formation:team.formation.slice().reverse()};assert.ok(E.validateComposition(T.normalize(explicit)).some(e=>e.includes('occuper')));
});

test('legacy incomplete and invalid drafts retain every card and remain repairable, never playable',async()=>{
  const data=await dataPromise,E=createEngine(data),T=Composition.create(E);
  for(const cards of [data.decks.player.slice(0,3),Array(10).fill(data.decks.player[0])]){
    const team=T.normalize({name:'Brouillon ancien',cards});
    assert.deepEqual(T.slots(team).filter(Boolean).sort(),cards.slice().sort());
    assert.equal(T.slots(team).length,10);assert(E.validateComposition(team).length);
    assert.deepEqual(T.normalize(team),team);
    assert.throws(()=>E.newGame(team,data.decks.enemy));
  }
});
test('schema-2 library migration, clone, export/import and partial drafts preserve formation/captain/equipment',async()=>{
  const {E,T,team}=await fixture(),map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const create=()=>Library.create({storage,userId:'team-qa',knownIds:E.data.cards.map(c=>c.id),normalizeDeck:T.normalize});
  const lib=create(),id='kd-12345678-1234-4234-8234-123456789abc';
  storage.setItem(lib.key,JSON.stringify({schema:1,edition:'V4',decks:[{id,name:'Archive',cards:team.cards}]}));
  assert.equal(lib.list()[0].captain,null);assert.equal(JSON.parse(storage.getItem(lib.key)).schema,2);
  const saved=lib.save({...team,id}),duplicate=lib.duplicate(saved.id);
  assert.deepEqual(duplicate.formation,saved.formation);assert.deepEqual(duplicate.equipment,saved.equipment);assert.equal(duplicate.captain,saved.captain);
  const copy=create().get(id);copy.equipment.relic.momo='unknown';assert.notDeepEqual(copy.equipment,lib.get(id).equipment);
  const json=lib.exportJSON();lib.importJSON(json,{mode:'replace'});assert.equal(lib.get(id).captain,team.captain);
  const malformed=JSON.parse(json);delete malformed.decks[0].formation;
  assert.throws(()=>lib.importJSON(JSON.stringify(malformed),{mode:'replace'}),/schema/);assert.equal(lib.exportJSON(),json);
  const empty=T.normalize({name:'Brouillon',cards:[]});assert.equal(lib.save(empty).formation.filter(Boolean).length,0);
  assert.throws(()=>lib.importJSON(json),/dupliques/);
});
test('storage conflicts remain atomic during writes',async()=>{
  const {E,T,team}=await fixture();let stored=null,reads=0;
  const storage={getItem:()=>++reads===2?'external':stored,setItem:(_,v)=>{stored=v;}};
  const lib=Library.create({storage,userId:'conflict',knownIds:E.data.cards.map(c=>c.id),normalizeDeck:T.normalize});
  assert.throws(()=>lib.save(team),/modifiee ailleurs/);assert.equal(stored,null);
});
test('captain links are numeric, side-independent, non-stacking, +40 normal plus +10 maximum',async()=>{
  const {E,s}=await fixture({links:true});
  for(const side of [0,1])for(const u of s.players[side].board){assert.equal(E.captainBonus(s,u,'attack'),10);assert.equal(E.captainBonus(s,u,'defense'),10);assert.equal(E.synergy(s.players[side],u,'faction'),40);}
  E.lock(s,0,1);E.rollAttack(s,6);E.rollDefense(s,6);
  const f=s.duel.formula;assert.equal(f.captainAttack,10);assert.equal(f.captainDefense,10);
  assert.equal(f.attack,Math.max(0,f.baseAttack+f.weapon+f.element+f.faction+f.buff+f.barrier+f.arenaAttack+f.captainAttack));
  assert.equal(f.defense,f.baseDefense+f.race+f.arenaDefense+f.ward+10);
  assert.ok(s.log.some(l=>l.text==='Capitaine Faction : +10 ATK.'));assert.ok(s.log.some(l=>l.text==='Capitaine Race : +10 DEF.'));
  E.assertState(s);
});
test('captain without a second matching active fighter gives nothing; reserve and corpses never count',async()=>{
  const {E,s}=await fixture({links:true}),p=s.players[0],leader=p.board[0];
  for(let i=1;i<5;i++){p.dead.push(p.board[i]);p.board[i]=null;}
  assert.equal(E.captainBonus(s,leader,'attack'),0);assert.equal(E.captainBonus(s,leader,'defense'),0);
  const reserve=p.reserve[0];assert.equal(E.captainBonus(s,reserve,'attack'),0);
});
test('Reraise keeps commandment, definitive captain death removes it immediately and reserves inherit no crown',async()=>{
  for(const heart of [0,1]){
    const {E,s}=await fixture({links:true,defense:1});s.players[1].board[0].reraise=heart;
    const leader=s.players[1].board[0],ally=s.players[1].board[1];
    E.lock(s,0,0);E.rollAttack(s,6);E.rollDefense(s,6);
    assert.equal(E.captainBonus(s,ally,'defense'),heart?10:0);assert.equal(E.captainUnit(s,1)?.uid,heart?leader.uid:undefined);E.assertState(s);
    if(!heart){E.next(s);assert.equal(s.phase,'replace');const next=s.players[1].reserve.find(u=>E.card(u).positions.includes(1));E.deploy(s,1,next.uid,0);assert.equal(E.captainUnit(s,1),null);E.assertState(s);}
  }
});
test('shared reserve remains position-polymorphic and replacement creates/removes captain connections',async()=>{
  const {E,s}=await fixture({links:true,versatile:true}),p=s.players[0],leader=p.board[0];
  for(let i=1;i<5;i++){p.dead.push(p.board[i]);p.board[i]=null;}
  const versatile=p.reserve.find(u=>E.card(u).positions.length>1);assert.ok(versatile);
  for(const position of E.card(versatile).positions.filter(i=>i!==1)){
    const copy=E.clone(s);copy.phase='replace';copy.replacing=0;
    E.deploy(copy,0,versatile.uid,position-1);assert.equal(copy.players[0].board[position-1].uid,versatile.uid);
    assert.equal(E.captainBonus(copy,copy.players[0].board[0],'attack'),10);E.assertState(copy);
  }
  assert.equal(E.captainBonus(s,leader,'attack'),0);
});
test('AI scores include the same commandment terms without reading future rolls',async()=>{
  const {E,s}=await fixture({links:true});let best=null,score=-Infinity;
  for(let i=0;i<5;i++)for(let j=0;j<5;j++){
    const a=s.players[0].board[i],b=s.players[1].board[j],ac=E.card(a),bc=E.card(b);
    const v=E.mean(ac.atk)-E.mean(bc.defense)+(E.data.weapons[ac.weapon]?.[bc.weapon]||0)+E.elementModifier(ac,bc)+40-40-E.rules.barrier*ac.magic.length/6*(bc.element==='NONE'?0:bc.barriers.length)/6+E.arenaBonuses(s,a).attack-E.arenaBonuses(s,b).defense+E.captainBonus(s,a,'attack')-E.captainBonus(s,b,'defense');
    if(v>score){score=v;best=[i,j];}
  }
  const rng=s.rng;assert.deepEqual(E.aiChoice(s),best);assert.equal(s.rng,rng);
});
test('equipment is isolated per deck, supports removal, and match snapshots cannot be changed by later edits',async()=>{
  const {E,T,team}=await fixture(),momo=team.cards.find(id=>E.byId[id].characterId==='momo');
  const armed=T.equip(team,momo,'little-joys-flute');assert.deepEqual(team.equipment,Q.emptyLoadout());assert.equal(armed.equipment.relic.momo,'little-joys-flute');
  assert.deepEqual(T.equip(armed,momo,null,{slot:'relic',expected:'little-joys-flute'}).equipment,Q.emptyLoadout());assert.throws(()=>T.equip(team,momo,'fallen-king-axe'),/incompatible/);
  const balm=team.cards.find(id=>E.byId[id].characterId==='balmhyr');
  const triple=T.equip(T.equip(T.equip(armed,balm,'fallen-king-axe'),balm,'durane-rampart'),balm,'exiled-king-seal');
  const s=E.newGame(triple,team);triple.equipment.relic.momo='unknown';triple.equipment.weapon.balmhyr='unknown';triple.captain=null;triple.formation.reverse();
  assert.equal(s.equipment.version,2);assert.equal(s.equipment.loadouts[0].relic.momo,'little-joys-flute');
  assert.equal(s.equipment.loadouts[0].weapon.balmhyr,'fallen-king-axe');assert.equal(s.equipment.loadouts[0].shield.balmhyr,'durane-rampart');
  assert.equal(s.equipment.loadouts[0].relic.balmhyr,'exiled-king-seal');assert.equal(s.equipment.loadouts[1].relic.momo,undefined);assert.deepEqual(E.restoreGame(s),s);
});
test('old setup matches and technical array callers retain historical behavior',async()=>{
  const {E,data,team}=await fixture();const old=E.newGame(data.decks.player,data.decks.player);
  assert.equal(old.phase,'setup');assert.equal(old.composition,undefined);E.autoDeploy(old,0);E.recall(old,0,0);E.autoDeploy(old,0);E.autoDeploy(old,1);E.start(old);assert.deepEqual(E.restoreGame(old),old);
  const mixed=E.newGame(team,data.decks.player);assert.equal(mixed.phase,'choose');assert.equal(mixed.composition.teams[1].captain,null);assert.deepEqual(E.restoreGame(mixed),mixed);
  const historical=E.newGame(data.decks.player,data.decks.player,{equipment:[{balmhyr:'fallen-king-axe',momo:'little-joys-flute'},{}]});
  historical.equipment.definitions=structuredClone(require('./fixtures/equipment-v4.5.64.json').weapons);
  assert.equal(historical.equipment.version,1);assert.deepEqual(E.restoreGame(historical),historical);
  assert.equal(historical.equipment.definitions.find(w=>w.id==='fallen-king-axe').effect.trigger,'LAST_STANDING');
  assert.equal(historical.equipment.definitions.find(w=>w.id==='little-joys-flute').effect.trigger,'AFTER_SUPPORT');
});
test('complete composed matches, captain deaths, equipment states and reloads validate through match end',async()=>{
  const {E,T,team}=await fixture(),momo=team.cards.find(id=>E.byId[id].characterId==='momo'),armed=T.equip(team,momo,'little-joys-flute');
  for(let i=0;i<8;i++){
    let s=E.newGame(armed,armed,{mode:'local',seed:'TEAM-'+i});
    for(let n=0;s.phase!=='over'&&n<2500;n++){step(E,s);E.assertState(s);if(n%7===0)s=E.restoreGame(s);}
    assert.equal(s.phase,'over');assert.deepEqual(s.equipment.pending,{});assert.deepEqual(E.restoreGame(s),s);
  }
});
