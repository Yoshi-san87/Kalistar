'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./model.cjs'),set=require('./set.json'),c=set.cards[0],{deck,formation,deploy}=require('./fixtures.cjs');
const {createEngine}=require('../../site/engine.js'),dataPromise=require('./build.cjs').game();
const restore=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
async function fixture(side=0){
 const data=await dataPromise,E=createEngine(data),s=E.newGame(deck,deck,{seed:'FROZ-FACES',mode:'local',deckCoverage:2,kalistel:false});
 deploy(E,s,side,formation(data.cards,deck,c.id,1));E.autoDeploy(s,1-side);E.start(s);return {E,s,u:s.players[side].board[1]};
}
test('Approved P2 only, existing Okami race and independent Froz faction',async()=>{
 M.validateSet(set);M.validateGame(await dataPromise,set,createEngine);
 assert.deepEqual(c.positions,[2]);assert.equal(c.role,2);
 for(const field of ['atk','defense']){const bad=structuredClone(c);bad[field][0]=1000;assert.throws(()=>M.profile(bad));}
 for(const effect of ['guard','revive']){const bad=structuredClone(c);bad.atk[5]=effect;assert.throws(()=>M.profile(bad));}
 const F=require('../../site/factions.js');assert(!F.same('Froz','Grivka'));assert(!F.same('Froz','Dravenheim'));assert.equal(F.assetName('Froz'),'Froz');
});
test('Every printed ATK/DEF face resolves in the engine, journal and restored save',async()=>{
 for(let die=1;die<=6;die++){
  const {E,s,u}=await fixture();E.lock(s,1,0);E.rollAttack(s,die);restore(E,s);
  const v=c.atk[6-die];assert.equal(s.duel.attackValue,v);
  if(v==='buff_atk'){E.grantPhysical(s,u.uid);assert.equal(u.physical,60);assert(s.match.events.at(-1).support);}
  else{E.rollDefense(s,6);assert.equal(s.duel.formula.baseAttack,v);assert.equal(s.duel.magic,c.magic.includes(die));}
  assert(s.log.some(l=>l.text.includes(c.name)&&l.text.includes('D'+die)));assert.equal(s.phase,'result');E.assertState(s);restore(E,s);
  const d=await fixture(1);d.E.lock(d.s,0,1);d.E.rollAttack(d.s,6);d.E.rollDefense(d.s,die);
  const def=c.defense[6-die];assert.equal(d.s.duel.defenseValue,def);
  if(def==='dodge'){assert(d.s.match.events.at(-1).dodge);assert(!d.s.match.events.at(-1).kill);}
  else assert.equal(d.s.duel.formula.baseDefense,def);
  d.E.assertState(d.s);restore(d.E,d.s);
 }
});
test('Only the shared Okami race grants synergy; Froz receives no Grivka ATK bonus',async()=>{
 const {E,s}=await fixture();E.lock(s,1,0);E.rollAttack(s,6);E.rollDefense(s,6);
 assert.equal(s.duel.formula.faction,0);assert(s.duel.formula.race>0);
});
test('The physical gift is real, single-charge and consumed on a physical attack',async()=>{
 const {E,s,u}=await fixture();E.lock(s,1,0);E.rollAttack(s,1);E.grantPhysical(s,u.uid);restore(E,s);E.next(s);
 E.lock(s,0,2);E.rollAttack(s,6);E.rollDefense(s,6);E.next(s);
 while(s.phase==='replace')E.autoDeploy(s,s.replacing);
 assert.equal(u.physical,60);E.lock(s,1,0);E.rollAttack(s,6);assert.equal(s.duel.buff,60);assert.equal(u.physical,0);
 E.rollDefense(s,6);assert.equal(s.duel.formula.buff,60);E.assertState(s);restore(E,s);
});
test('The D5 barrier blocks 30 from magic only',async()=>{
 const data=await dataPromise,E=createEngine(data);
 for(const magical of [false,true]){
  const s=E.newGame(deck,deck,{seed:'FROZ-BARRIER',mode:'local',deckCoverage:2,kalistel:false});
  for(let side=0;side<2;side++)deploy(E,s,side,formation(data.cards,deck,c.id,1));E.start(s);
  E.lock(s,1,1);E.rollAttack(s,magical?4:6);E.rollDefense(s,5);
  assert.equal(s.duel.formula.barrier,magical?-30:0);restore(E,s);
 }
});
function step(E,s){
 if(s.phase==='initiative')E.rollInitiative(s);
 else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
 else if(s.phase==='attack')E.rollAttack(s);
 else if(s.phase==='kalistel'){if(E.aiUseKalistel(s))E.useKalistel(s);else E.acceptAttack(s);}
 else if(s.phase==='defense')E.rollDefense(s);
 else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
 else if(s.phase==='result')E.next(s);
 else{
  const actions={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
  assert(actions[s.phase],s.phase);const [grant,choice]=actions[s.phase];E[grant](s,E[choice](s));
 }
}
test('Sixteen complete matches, both sides, ABBA and restored intermediate states',async()=>{
 const data=await dataPromise,E=createEngine(data);let appearances=0;
 for(let i=0;i<16;i++){
  const other=i%3?data.decks.player:data.decks.enemy;
  let s=E.newGame(i%2?other:deck,i%2?deck:other,{seed:'FROZ-FULL-'+i,turnOrder:'ABBA',deckCoverage:2});
  deploy(E,s,i%2?1:0,formation(data.cards,deck,c.id,1));E.autoDeploy(s,i%2?0:1);E.start(s);
  for(let n=0;n<6000&&s.phase!=='over';n++){
   if(s.players.some(p=>p.board.some(u=>u?.cardId===c.id)))appearances++;
   step(E,s);E.assertState(s);if(n%23===0){restore(E,s);s=E.restoreGame(JSON.parse(JSON.stringify(s)));}
  }
  assert.equal(s.phase,'over');assert(E.matchStats(s).complete);
 }
 assert(appearances>0);
});
test('Native proofs, original art and existing catalogue unchanged',()=>{
 const root=path.resolve(__dirname,'../../..'),cat=require('../../revisions/2026-10-17-nestown-manteau-rempart/compatibility.cjs').previousCatalogue(require('../../donnees/catalogue.json')),dir=path.join(__dirname,'cards',c.key);
 const digest=f=>{const b=fs.readFileSync(f),m=b.length<1024&&/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(b.toString());return m?m[1]:crypto.createHash('sha256').update(b).digest('hex');};
 const v=require(path.join(dir,'verification.json'));assert(v.passed&&v.barcode.passed);assert.equal(v.components.fixedDifferences,0);assert.equal(v.roundtrip.changed,0);
 assert.equal(digest(path.join(root,c.artworkSource)),digest(path.join(dir,'illustration.png')));
 for(const f of ['card.png','card.psd'])assert.equal(digest(path.join(dir,f)),v.hashes[f]);
 const flag=require('./components/components.json').faction;
 assert.equal(digest(path.join(root,'V4/site/assets/factions/Froz.png')),flag.fullHash);
 for(const old of require('./before.json').catalogue.cards)assert.deepEqual(cat.cards.find(c=>c.id===old.id),old);
});
