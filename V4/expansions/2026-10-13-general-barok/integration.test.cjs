'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./model.cjs'),set=require('./set.json'),{deck,formation,deploy}=require('./fixtures.cjs');
const {createEngine}=require('../../site/engine.js');
const dataPromise=require('./build.cjs').game();
const restore=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
const grants={guard:['grantGuard','ward',60],retry:['grantClover','luck',1],buff_atk:['grantPhysical','physical',60]};
async function fixture(c,side=0){
 const data=await dataPromise,E=createEngine(data),slot=c.role-1;
 const s=E.newGame(deck,deck,{seed:'BAROK-'+c.key,mode:'local',deckCoverage:2,kalistel:false});
 deploy(E,s,side,formation(data.cards,deck,c.id,slot));E.autoDeploy(s,1-side);E.start(s);
 return {data,E,s,slot,u:s.players[side].board[slot]};
}
function step(E,s){
 if(s.phase==='initiative')E.rollInitiative(s);
 else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
 else if(s.phase==='attack')E.rollAttack(s);
 else if(s.phase==='kalistel'){if(E.aiUseKalistel(s))E.useKalistel(s);else E.acceptAttack(s);}
 else if(s.phase==='defense')E.rollDefense(s);
 else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
 else if(s.phase==='result')E.next(s);
 else {
  const actions={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
  assert(actions[s.phase],s.phase);const [grant,choice]=actions[s.phase];E[grant](s,E[choice](s));
 }
}
test('BaroK: one distinct P1 profile, one Mort, legal bounds and deck',async()=>{
 M.validateSet(set);const data=await dataPromise;M.validateGame(data,set,createEngine);
 const c=set.cards[0];assert.deepEqual(c.positions,[1]);assert.equal(c.atk.filter(v=>v==='death').length,1);
 assert.deepEqual(c.defense.filter(v=>typeof v!=='number'),[]);
 for(const side of ['atk','defense']){const bad=structuredClone(c);bad[side][0]=1000;assert.throws(()=>M.profile(bad));}
 assert.equal(M.profile(c).canHeal,false);assert.equal(M.profile(c).canGuard,false);
});
for(const c of set.cards)test(c.name+': all twelve printed faces resolve, log and restore',async()=>{
 for(let die=1;die<=6;die++){
  const {E,s,u,slot}=await fixture(c);E.lock(s,slot,0);E.rollAttack(s,die);restore(E,s);
  const v=c.atk[6-die];assert.equal(s.duel.attackValue,v);
  if(grants[v]){
   const [grant,key,value]=grants[v];E[grant](s,u.uid);assert.equal(u[key],value);
   assert(s.match.events.at(-1).support);
  }else{
   E.rollDefense(s,6);
   if(typeof v==='number'){assert.equal(s.duel.formula.baseAttack,v);assert.equal(s.duel.magic,c.magic.includes(die));}
   else assert.equal(s.match.events.at(-1).kill,true);
  }
  assert(s.log.some(l=>l.text.includes(c.name)&&l.text.includes('D'+die)));
  assert.equal(s.phase,'result');E.assertState(s);restore(E,s);
  const d=await fixture(c,1);d.E.lock(d.s,0,d.slot);d.E.rollAttack(d.s,6);d.E.rollDefense(d.s,die);
  const def=c.defense[6-die];assert.equal(d.s.duel.defenseValue,def);restore(d.E,d.s);
  if(def==='retry'){assert.equal(d.s.phase,'defense');d.E.rollDefense(d.s,6);assert.equal(d.s.duel.defenseRolls.length,2);}
  else if(def==='dodge'){assert(d.s.match.events.at(-1).dodge);assert(!d.s.match.events.at(-1).kill);}
  else assert.equal(d.s.duel.formula.baseDefense,def);
  d.E.assertState(d.s);restore(d.E,d.s);
 }
});

test('Cryo barrier and Katana matchup stay native, no bonus from illustrated crystals',async()=>{
 const data=await dataPromise,E=createEngine(data),c=set.cards[0];
 for(const magical of [false,true])for(const die of [6,3,2]){
  const s=E.newGame(deck,deck,{seed:'BAROK-BARRIER',mode:'local',deckCoverage:2,kalistel:false});
  for(let side=0;side<2;side++)deploy(E,s,side,formation(data.cards,deck,c.id,0));
  E.start(s);E.lock(s,0,0);E.rollAttack(s,magical?4:6);E.rollDefense(s,die);
  const f=s.duel.formula;assert.equal(f.barrier,magical&&c.barriers.includes(die)?-E.rules.barrier:0);
  assert.equal(f.element,0);assert.equal(f.weapon,0);
  assert.equal(s.equipment?.loadouts[0].weapon[c.characterId],undefined);
  E.assertState(s);restore(E,s);
 }
});
test('Mort: both sides, real kill, Dodge and Reraise counter it; ward/luck preserved',async()=>{
 const data=await dataPromise,E=createEngine(data),c=set.cards[0];
 for(const side of [0,1])for(const counter of ['none','dodge','reraise']){
  const s=E.newGame(deck,deck,{seed:'BAROK-MORT',mode:'local',deckCoverage:2,kalistel:false});
  deploy(E,s,side,formation(data.cards,deck,c.id,0));
  deploy(E,s,1-side,formation(data.cards,deck,'49902402',1));
  E.start(s);s.turn=side;
  const defender=s.players[1-side].board[1];defender.ward=60;defender.luck=1;
  if(counter==='reraise')defender.reraise=1;
  E.lock(s,0,1);E.rollAttack(s,5);restore(E,s);
  E.rollDefense(s,counter==='dodge'?4:6);
  const event=s.match.events.at(-1);assert.equal(Boolean(event.kill),counter==='none');
  if(counter==='dodge')assert(event.dodge);
  if(counter==='reraise'){assert.equal(defender.reraise,0);assert(s.players[1-side].board.some(u=>u&&u.uid===defender.uid));}
  assert.equal(defender.luck,1);assert.equal(defender.ward,60);
  assert(s.log.some(l=>l.text.includes(c.name)&&l.text.includes('D5')));
  E.assertState(s);restore(E,s);
 }
});
test('Kalistel reroll can abandon Mort; restoration keeps the chosen face',async()=>{
 const data=await dataPromise,E=createEngine(data),c=set.cards[0];
 let s=E.newGame(deck,deck,{seed:'BAROK-REROLL',mode:'local',deckCoverage:2});
 for(let side=0;side<2;side++)deploy(E,s,side,formation(data.cards,deck,c.id,0));
 E.start(s);E.lock(s,0,0);E.rollAttack(s,5);assert.equal(s.phase,'kalistel');
 restore(E,s);s=E.restoreGame(JSON.parse(JSON.stringify(s)));E.useKalistel(s,4);
 assert.equal(s.duel.attackValue,131);E.rollDefense(s,6);
 assert.equal(s.duel.formula.baseAttack,131);assert(!s.match.events.at(-1).kill);
 E.assertState(s);restore(E,s);
});
test('Twelve complete matches, both sides and restored intermediate phases',async()=>{
 const data=await dataPromise,E=createEngine(data),seen=new Set();
 for(let i=0;i<12;i++){
  const legacy=i%3?data.decks.player:data.decks.enemy;
  let s=E.newGame(i%2?legacy:deck,i%2?deck:legacy,{seed:'BAROK-FULL-'+i,turnOrder:'ABBA',deckCoverage:2});
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  for(let n=0;n<6000&&s.phase!=='over';n++){
   for(const p of s.players)for(const u of p.board.filter(Boolean))seen.add(u.cardId);
   step(E,s);E.assertState(s);if(n%23===0){restore(E,s);s=E.restoreGame(JSON.parse(JSON.stringify(s)));}
  }
  assert.equal(s.phase,'over');assert(E.matchStats(s).complete);
 }
 for(const c of set.cards)assert(seen.has(c.id),c.key);
});
test('Native proofs, exact approved images, barcode and existing catalogue preservation',()=>{
 const root=path.resolve(__dirname,'../../..'),cat=require('../../donnees/catalogue.json');
 const digest=f=>{const b=fs.readFileSync(f),m=b.length<1024&&/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(b.toString());return m?m[1]:crypto.createHash('sha256').update(b).digest('hex');};
 for(const c of set.cards){
  const dir=path.join(__dirname,'cards',c.key),v=require(path.join(dir,'verification.json'));
  assert(v.passed&&v.barcode.passed);assert.equal(v.components.fixedDifferences,0);assert.equal(v.roundtrip.changed,0);
  assert.equal(digest(path.join(root,c.artworkSource)),digest(path.join(dir,'illustration.png')));
  for(const f of ['card.png','card.psd'])assert.equal(digest(path.join(dir,f)),v.hashes[f]);
 }
 for(const old of require('./before.json').catalogue.cards)assert.deepEqual(cat.cards.find(c=>c.id===old.id),old);
});
