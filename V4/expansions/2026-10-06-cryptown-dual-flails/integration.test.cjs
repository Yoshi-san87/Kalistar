'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./model.cjs'),set=require('./set.json'),spec=set.cards[0];
const profile=require('./cards/draust/profile.json'),catalogue=require('../../donnees/catalogue.json');
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
const dataPromise=buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function assetHash(file){
 const bytes=fs.readFileSync(file),pointer=bytes.length<1024&&bytes.toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/);
 return pointer?pointer[1]:sha(bytes);
}
test('Published Draust preserves the approved mirror and verified native card',()=>{
 const matches=catalogue.cards.filter(c=>c.id===spec.id);assert.equal(matches.length,1);assert.deepEqual(matches[0].profile,profile);
 const dir=path.resolve(__dirname,'../../creations',spec.id),proof=JSON.parse(fs.readFileSync(path.join(dir,'verification.json')));
 assert(proof.passed&&proof.barcode.passed);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.components.fixedDifferences,0);
 assert.equal(sha(fs.readFileSync(path.join(dir,'card.png'))),proof.hashes['card.png']);
 const artDir=path.resolve(__dirname,'../../propositions/2026-10-06-cryptown-dual-flails');
 const mirror=JSON.parse(fs.readFileSync(path.join(artDir,'mirror-verification.json')));
 assert(mirror.roundtripRgbaIdentical&&mirror.originalPreserved);
 assert.equal(assetHash(path.join(dir,'illustration.png')),mirror.outputSha256);
 assert.equal(assetHash(path.join(artDir,mirror.output)),mirror.outputSha256);
 assert.equal(assetHash(path.join(artDir,mirror.source)),mirror.sourceSha256);
});
test('P1 only with one Guard D1, no extra powers and valid role bounds',()=>{
 M.validateSet(set);M.validateProfile(profile,spec);
 for(const mutate of [s=>s.cards[0].atk[0]=211,s=>s.cards[0].defense[0]=301,s=>s.cards[0].positions.push(2),s=>s.cards[0].role=3,s=>s.cards[0].atk[5]='death',s=>s.cards[0].magic.push(1),s=>s.cards[0].defense[5]='dodge']){
  const bad=structuredClone(set);mutate(bad);assert.throws(()=>M.validateSet(bad));
 }
});
test('Kalistar collection, single Flail family and Cryptown/Skullz synergies',async()=>{
 const data=await dataPromise,E=createEngine(data);M.validateGame(data,set,createEngine);
 const c=data.cards.find(c=>c.id===spec.id);assert(require('../../site/collection-binder.js').matchesScope(c,'kalistar'));
 const board=[{uid:'0-1',cardId:c.id},{uid:'0-2',cardId:'49900501'},{uid:'0-3',cardId:'49900601'}];
 for(const f of ['race','faction'])assert.equal(E.synergy({board},board[0],f),E.rules.synergy[3]);
 assert.equal(c.weapon,'Fl\u00e9au');assert.equal(c.canGuard,true);assert.equal(c.canHeal,false);
});
async function fixture(){
 const data=await dataPromise,E=createEngine(data),deck=M.qaDecks(data)[0];
 const s=E.newGame(deck,deck,{seed:'DRAUST-GUARD',mode:'local',kalistel:false});
 E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
 for(const p of s.players)assert.equal(p.board[0].cardId,spec.id);
 return {data,E,s};
}
test('Guard replaces the attack, grants one allied charge and survives reload',async()=>{
 const {E,s}=await fixture(),a=s.players[0].board[0],ally=s.players[0].board[3];
 a.mana=60;a.physical=60;E.lock(s,0,0);E.rollAttack(s,1);assert.equal(s.phase,'guard');
 assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
 assert.throws(()=>E.grantGuard(s,s.players[1].board[0].uid));
 E.grantGuard(s,ally.uid);E.assertState(s);assert.equal(ally.ward,60);
 assert.equal(a.mana,60);assert.equal(a.physical,60);assert.equal(s.phase,'result');
 const event=s.match.events.at(-1);assert.equal(event.support,'ward');assert.equal(event.recipient,ally.uid);assert.equal(event.kill,false);
 assert.match(JSON.stringify(s.log),/garde/);assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
});
test('An existing self Guard cannot stack a second +60',async()=>{
 const {E,s}=await fixture(),a=s.players[0].board[0];a.ward=60;
 E.lock(s,0,0);E.rollAttack(s,1);E.grantGuard(s,a.uid);E.assertState(s);
 assert.equal(a.ward,60);assert.equal(s.duel.traitRefreshed,true);
});
test('Two illustrated flails still calculate a single ordinary attack',async()=>{
 const {data,E,s}=await fixture();E.lock(s,0,3);E.rollAttack(s,6);E.rollDefense(s,6);E.assertState(s);
 const f=s.duel.formula,defender=data.cards.find(c=>c.id==='49900601');
 assert.equal(f.baseAttack,205);assert.equal(f.weapon,data.weapons['Fl\u00e9au'][defender.weapon]);
 assert.equal(f.attack,Math.max(0,f.baseAttack+f.weapon+f.element+f.faction+f.buff+f.barrier+f.arenaAttack));
 assert.equal(s.match.events.length,1);assert.deepEqual(s.duel.attackRolls,[6]);
});
test('Physical Guard is consumed, while magic uses the printed barrier',async()=>{
 for(const die of [5,6]){
  const {E,s}=await fixture(),tank=s.players[1].board[0];tank.ward=60;
  E.lock(s,3,0);E.rollAttack(s,die);E.rollDefense(s,6);E.assertState(s);
  const magic=die===6,f=s.duel.formula;assert.equal(f.magic,magic);assert.equal(f.baseDefense,296);
  assert.equal(f.barrier,magic?-30:0);assert.equal(f.ward,magic?0:60);assert.equal(tank.ward,magic?60:0);
  assert.equal(f.defense,f.baseDefense+f.race+f.arenaDefense+f.ward);
  assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
 }
});
function step(E,s){
 if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);
 else if(s.phase==='kalistel'){if(E.aiUseKalistel(s))E.useKalistel(s);else E.acceptAttack(s);}
 else if(s.phase==='defense')E.rollDefense(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);else if(s.phase==='result')E.next(s);
 else{const actions={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};assert(actions[s.phase],s.phase);const [grant,choose]=actions[s.phase];E[grant](s,E[choose](s));}
}
test('Draust completes 24 matches on both teams with repeated restoration',async()=>{
 const data=await dataPromise,E=createEngine(data),decks=M.qaDecks(data);let support=0,visible=0;
 for(let seed=0;seed<24;seed++){
  let s=E.newGame(decks[seed%2],decks[1-seed%2],{seed:'DRAUST-'+seed});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  for(let n=0;n<4000&&s.phase!=='over';n++){
   if(s.players.some(p=>p.board.some(u=>u?.cardId===spec.id)))visible++;
   if(s.phase==='guard'&&s.players[s.duel.side].board[s.duel.attackerSlot].cardId===spec.id)support++;
   step(E,s);E.assertState(s);if(n%11===0){const restored=E.restoreGame(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored,s);s=restored;}
  }assert.equal(s.phase,'over');assert(E.matchStats(s).complete);
 }assert(visible>0);assert(support>0);
});
