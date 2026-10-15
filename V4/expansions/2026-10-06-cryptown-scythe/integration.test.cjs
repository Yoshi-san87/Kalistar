'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./model.cjs'),set=require('./set.json'),spec=set.cards[0];
const profile=require('./cards/morveth/profile.json'),catalogue=require('../../donnees/catalogue.json');
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
const dataPromise=buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});

test('Published Morveth uses the approved scythe image and verified native card',()=>{
  const matches=catalogue.cards.filter(c=>c.id===spec.id);assert.equal(matches.length,1);
  assert.deepEqual(matches[0].profile,profile);
  const dir=path.resolve(__dirname,'../../creations',spec.id),proof=JSON.parse(fs.readFileSync(path.join(dir,'verification.json')));
  assert(proof.passed&&proof.barcode.passed);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.components.fixedDifferences,0);
  const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  assert.equal(hash(path.join(dir,'card.png')),proof.hashes['card.png']);
  assert.equal(hash(path.join(dir,'illustration.png')),hash(path.resolve(__dirname,'../../propositions/2026-10-06-cryptown-scythe/cryptown-scythe-v1.png')));
});
test('Morveth is P2 only, with exactly one Death ATK D1 and valid numeric modes',()=>{
  M.validateSet(set);M.validateProfile(profile,spec);
  for(const mutate of [s=>s.cards[0].atk[0]=301,s=>s.cards[0].defense[0]=181,s=>s.cards[0].positions.push(4),s=>s.cards[0].role=3,s=>s.cards[0].atk[4]='death',s=>s.cards[0].magic.push(1),s=>s.cards[0].defense[5]='dodge']){
    const bad=structuredClone(set);mutate(bad);assert.throws(()=>M.validateSet(bad));
  }
});
test('Kalistar collection, Faucille and ordinary Cryptown/Skullz synergies stay intact',async()=>{
  const data=await dataPromise,E=createEngine(data);M.validateGame(data,set,createEngine);
  const c=data.cards.find(c=>c.id===spec.id);assert(require('../../site/collection-binder.js').matchesScope(c,'kalistar'));
  const board=[{uid:'0-1',cardId:c.id},{uid:'0-2',cardId:'49900501'}];
  for(const f of ['race','faction'])assert.equal(E.synergy({board},board[0],f),E.rules.synergy[2]);
  assert.equal(c.weapon,'Faucille');assert.equal(c.canGuard,false);assert.equal(c.canHeal,false);
});
async function fixture(){
  const data=await dataPromise,E=createEngine(data),decks=M.qaDecks(data),s=E.newGame(decks[0],decks[1],{seed:'MORVETH-DEATH',mode:'local'});
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  const slot=s.players[0].board.findIndex(u=>u?.cardId===spec.id);assert.equal(slot,1);
  E.lock(s,slot,0);const a=s.players[0].board[slot],b=s.players[1].board[0];
  assert.equal(b.cardId,'49900313');return {E,s,a,b};
}
test('Death ignores numeric defense, ward and luck, preserves ATK buffs and logs a kill',async()=>{
  const {E,s,a,b}=await fixture();a.mana=60;a.physical=60;b.ward=60;b.luck=1;
  E.rollAttack(s,1);assert.equal(s.phase,'kalistel');assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
  E.acceptAttack(s);assert.equal(s.duel.attackValue,'death');assert.equal(s.duel.magic,false);
  assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);E.rollDefense(s,6);E.assertState(s);
  assert.equal(s.phase,'result');assert.equal(s.players[1].board[0],null);
  assert.equal(a.mana,60);assert.equal(a.physical,60);assert.equal(b.ward,60);assert.equal(b.luck,1);
  assert.equal(s.match.events.at(-1).kill,true);assert.equal(s.match.events.at(-1).attack,0);
  assert.match(JSON.stringify(s.log),/Mort/);assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
});
test('A real defender Dodge D1 still cancels Morveth Death',async()=>{
  const {E,s,b}=await fixture();E.rollAttack(s,1);E.acceptAttack(s);E.rollDefense(s,1);E.assertState(s);
  assert.equal(s.duel.defenseValue,'dodge');assert.equal(s.players[1].board[0].uid,b.uid);
  assert.equal(s.match.events.at(-1).kill,false);assert.equal(s.match.events.at(-1).dodge,true);
});
test('Reraise survives Death once without granting a kill',async()=>{
  const {E,s,b}=await fixture();b.reraise=1;E.rollAttack(s,1);E.acceptAttack(s);E.rollDefense(s,6);E.assertState(s);
  assert.equal(b.reraise,0);assert.equal(s.players[1].board[0].uid,b.uid);
  assert.equal(s.match.events.at(-1).kill,false);assert.equal(s.match.events.at(-1).reraise,true);
});
test('A discarded Death face becomes an ordinary numeric attack after Kalistel',async()=>{
  const {E,s,a}=await fixture();a.mana=60;a.physical=60;E.rollAttack(s,1);E.useKalistel(s,6);
  assert.equal(s.duel.attackValue,282);assert.equal(s.duel.magic,true);assert.equal(s.duel.buff,60);
  assert.equal(a.mana,0);assert.equal(a.physical,60);assert.equal(E.kalistelRemaining(s,0),1);
  assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);E.rollDefense(s,6);E.assertState(s);
  assert.equal(s.duel.formula.baseAttack,282);assert.equal(s.duel.formula.buff,60);
});
function step(E,s){
  if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);
  else if(s.phase==='kalistel'){if(E.aiUseKalistel(s))E.useKalistel(s);else E.acceptAttack(s);}
  else if(s.phase==='defense')E.rollDefense(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);else if(s.phase==='result')E.next(s);
  else{const actions={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};assert(actions[s.phase],s.phase);const [grant,choose]=actions[s.phase];E[grant](s,E[choose](s));}
}
test('Morveth completes 24 matches on either team with repeated restoration',async()=>{
  const data=await dataPromise,E=createEngine(data),decks=M.qaDecks(data);let deaths=0,visible=0;
  for(let seed=0;seed<24;seed++){
    let s=E.newGame(decks[seed%2],decks[1-seed%2],{seed:'MORVETH-'+seed});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
    for(let n=0;n<4000&&s.phase!=='over';n++){
      if(s.players.some(p=>p.board.some(u=>u?.cardId===spec.id)))visible++;
      if(s.phase==='defense'&&s.duel.attackValue==='death')deaths++;
      step(E,s);E.assertState(s);if(n%11===0){const restored=E.restoreGame(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored,s);s=restored;}
    }assert.equal(s.phase,'over');assert(E.matchStats(s).complete);
  }assert(visible>0);assert(deaths>0);
});
