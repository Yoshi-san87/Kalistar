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
 const s=E.newGame(deck,deck,{seed:'GRIVKA-'+c.key,mode:'local',deckCoverage:2,kalistel:false});
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
test('Five distinct approved Cryo/Okami/Grivka profiles, role bands and legal deck',async()=>{
 M.validateSet(set);const data=await dataPromise;M.validateGame(data,set,createEngine);
 assert.equal(new Set(set.cards.map(c=>JSON.stringify(c.atk))).size,5);
 for(const c of set.cards){
  assert(!c.atk.includes('revive'));
  for(const side of ['atk','defense']){
   const bad=structuredClone(c);bad[side][0]=1000;assert.throws(()=>M.profile(bad));
  }
  for(const pos of c.positions)assert(formation(data.cards,deck,c.id,pos-1));
 }
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
test('Cryo barriers remove the native 30 only on magical numerical attacks',async()=>{
 const data=await dataPromise,E=createEngine(data),caster=set.cards[0];
 for(const c of set.cards)for(const die of c.barriers)for(const magical of [false,true]){
  const s=E.newGame(deck,deck,{seed:'GRIVKA-BARRIER',mode:'local',deckCoverage:2,kalistel:false});
  deploy(E,s,0,formation(data.cards,deck,caster.id,0));deploy(E,s,1,formation(data.cards,deck,c.id,c.role-1));E.start(s);
  E.lock(s,0,c.role-1);E.rollAttack(s,magical?4:6);E.rollDefense(s,die);
  assert.equal(s.duel.formula.barrier,magical?-E.rules.barrier:0);E.assertState(s);restore(E,s);
 }
});
test('Hrold Garde and Sevrane/Ulvren physical support carry exactly one native charge',async()=>{
 for(const c of set.cards.filter(c=>c.atk.includes('guard')||c.atk.includes('buff_atk'))){
  const {E,s,u,slot}=await fixture(c),effect=c.atk.includes('guard')?'guard':'buff_atk',die=6-c.atk.indexOf(effect);
  E.lock(s,slot,0);E.rollAttack(s,die);const [grant,key,value]=grants[effect];E[grant](s,u.uid);restore(E,s);E.next(s);
  // The opposing turn uses a low attack against another unit; the donor survives.
  if(effect==='guard'){
   E.lock(s,0,slot);E.rollAttack(s,6);E.rollDefense(s,6);
   assert.equal(s.duel.formula.ward,60);assert.equal(u.ward,0);restore(E,s);
  }else{
   E.lock(s,0,(slot+1)%5);E.rollAttack(s,6);E.rollDefense(s,6);E.next(s);
   while(s.phase==='replace')E.autoDeploy(s,s.replacing);
   assert.equal(u[key],value);E.lock(s,slot,0);E.rollAttack(s,6);assert.equal(s.duel.buff,60);assert.equal(u.physical,0);
   E.rollDefense(s,6);assert.equal(s.duel.formula.buff,60);restore(E,s);
  }
  E.assertState(s);
 }
});
test('Taevrik Mort is stopped by Nivra dodge, not a new guaranteed kill',async()=>{
 const data=await dataPromise,E=createEngine(data),a=set.cards[2],b=set.cards[4];
 const s=E.newGame(deck,deck,{seed:'GRIVKA-DODGE',mode:'local',deckCoverage:2,kalistel:false});
 deploy(E,s,0,formation(data.cards,deck,a.id,3));deploy(E,s,1,formation(data.cards,deck,b.id,2));E.start(s);
 E.lock(s,3,2);E.rollAttack(s,2);E.rollDefense(s,5);
 assert(s.match.events.at(-1).dodge);assert(!s.match.events.at(-1).kill);E.assertState(s);restore(E,s);
});
test('Twenty-four complete matches, both sides and restored intermediate phases',async()=>{
 const data=await dataPromise,E=createEngine(data),seen=new Set();
 for(let i=0;i<24;i++){
  const legacy=i%3?data.decks.player:data.decks.enemy;
  let s=E.newGame(i%2?legacy:deck,i%2?deck:legacy,{seed:'GRIVKA-FULL-'+i,turnOrder:'ABBA',deckCoverage:2});
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
 const root=path.resolve(__dirname,'../../..'),cat=require('../../revisions/2026-10-17-nestown-manteau-rempart/compatibility.cjs').previousCatalogue(require('../../donnees/catalogue.json'));
 const digest=f=>{const b=fs.readFileSync(f),m=b.length<1024&&/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/.exec(b.toString());return m?m[1]:crypto.createHash('sha256').update(b).digest('hex');};
 for(const c of set.cards){
  const dir=path.join(__dirname,'cards',c.key),v=require(path.join(dir,'verification.json'));
  assert(v.passed&&v.barcode.passed);assert.equal(v.components.fixedDifferences,0);assert.equal(v.roundtrip.changed,0);
  assert.equal(digest(path.join(root,c.artworkSource)),digest(path.join(dir,'illustration.png')));
  for(const f of ['card.png','card.psd'])assert.equal(digest(path.join(dir,f)),v.hashes[f]);
 }
 for(const old of require('./before.json').catalogue.cards)assert.deepEqual(cat.cards.find(c=>c.id===old.id),old);
});
