'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./model.cjs'),set=require('./set.json'),catalogue=require('../../donnees/catalogue.json');
const revision=require('../../revisions/2026-10-06-balmhyr-durane/specs.cjs').cards[0];
// Keep the original set immutable; validate the later, separately audited narrative revision.
const currentSet={...set,cards:set.cards.map(c=>c.id===revision.id?{...revision,key:c.key}:c)};
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
const Q=require('../../site/equipment.js');
const dataPromise=buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});
const loadout={'2b-nier':'virtuous-treaty',balmhyr:'mythic-iron-gauntlet'};
async function fixture(spec,side=0,equipped=false){
 const data=await dataPromise,E=createEngine(data),decks=M.qaDecks(data);
 const s=E.newGame(decks[0],decks[0],{seed:'VARIANTS-'+spec.key,mode:'local',kalistel:false,equipment:equipped?[loadout,loadout]:undefined});
 for(let player=0;player<2;player++)for(let slot=0;slot<5;slot++){
  const u=s.players[player].reserve.find(u=>u.cardId===decks[0][slot]);E.deploy(s,player,u.uid,slot);
 }
 E.start(s);s.turn=side;E.assertState(s);
 return {data,E,s,u:s.players[side].board[spec.role-1],slot:spec.role-1};
}
const restored=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
test('Two distinct narrative/gameplay editions preserve identity and deck exclusions',async()=>{
 const data=await dataPromise;M.validateGame(data,currentSet,createEngine);
 for(const spec of set.cards){
  const versions=data.cards.filter(c=>c.characterId===spec.characterId);assert.equal(versions.length,2);
  assert(versions.some(c=>c.id===spec.lineage));assert(versions.some(c=>c.id===spec.id));
  const p=require('./cards/'+spec.key+'/profile.json');M.validateProfile(p,spec);assert.equal(p.previous_model,spec.lineage);
 }
});
test('Each printed ATK and DEF face, magic, barrier, Guard and physical support works in actual duels',async()=>{
 for(const spec of set.cards)for(let die=1;die<=6;die++){
  const {E,s,u,slot}=await fixture(spec);E.lock(s,slot,0);E.rollAttack(s,die);
  assert.equal(s.duel.attackValue,spec.atk[6-die]);assert.equal(s.duel.magic,spec.magic.includes(die));
  if(spec.atk[6-die]==='guard'){assert.equal(s.phase,'guard');E.grantGuard(s,u.uid);assert.equal(u.ward,60);}
  else if(spec.atk[6-die]==='buff_atk'){assert.equal(s.phase,'physical');E.grantPhysical(s,u.uid);assert.equal(u.physical,60);}
  else{E.rollDefense(s,6);assert.equal(s.duel.formula.baseAttack,spec.atk[6-die]);}
  E.assertState(s);restored(E,s);
  const defense=await fixture(spec);defense.s.turn=1;
  defense.E.lock(defense.s,2,slot);defense.E.rollAttack(defense.s,5);defense.E.rollDefense(defense.s,die);
  const v=spec.defense[6-die];assert.equal(defense.s.duel.defenseValue,v);
  if(v==='retry'){assert.equal(defense.s.phase,'defense');restored(defense.E,defense.s);defense.E.rollDefense(defense.s,6);}
  else if(v==='dodge')assert.equal(defense.s.match.events.at(-1).dodge,true);
  else{const f=defense.s.duel.formula;assert.equal(f.baseDefense,v);assert.equal(f.barrier,defense.s.duel.magic&&spec.barriers.includes(die)?-defense.E.rules.barrier:0);}
  defense.E.assertState(defense.s);restored(defense.E,defense.s);
 }
});
test('Signature equipment follows the printed family, not the other edition',async()=>{
 const data=await dataPromise;
 for(const spec of set.cards){
  const old=data.cards.find(c=>c.id===spec.lineage),next=data.cards.find(c=>c.id===spec.id);
  const w=Q.catalogue.weapons.find(w=>w.id===loadout[spec.characterId]);
  assert.equal(Q.compatible(w,next),true);assert.equal(Q.compatible(w,old),false);
  const row=Q.equipProfile(Q.profile('VARIANTS'),spec.characterId,w.id,data.cards);
  assert.equal(row.slots.weapon[spec.characterId],w.id);
 }
});
test('New edition profiles stay within role limits and cannot add arbitrary special faces',()=>{
 for(const change of [s=>s.cards[0].atk[0]=211,s=>s.cards[0].defense[0]=301,s=>s.cards[1].atk[0]=241,s=>s.cards[1].defense[0]=241,s=>s.cards[1].atk[2]='death',s=>s.cards[1].atk[2]='guard',s=>s.cards[0].magic.push(2)]){
  const invalid=structuredClone(set);change(invalid);assert.throws(()=>M.validateSet(invalid));
 }
});
test('Both camps receive actual conditional DEF, unchanged family matchup, logs and restored equipment',async()=>{
 for(const spec of set.cards)for(const side of [0,1]){
  const f=await fixture(spec,side,true),{E,s,u,slot}=f;
  assert.equal(E.equipmentView(s,u).active,false);
  const team=s.players[side];team.reserve.push(...team.board.filter(x=>x&&x!==u));team.board=team.board.map(x=>x===u?x:null);
  assert.equal(E.equipmentView(s,u).active,true);E.assertState(s);restored(E,s);
  s.turn=1-side;E.lock(s,0,slot);E.rollAttack(s,6);E.rollDefense(s,6);
  const formula=s.duel.formula,bonus=spec.key==='balmhyr-fist'?25:20;
  assert.equal(formula.equipmentDefense,bonus);
  const attacker=E.card(s.players[1-side].board[0]),defender=E.card(u);
  assert.equal(formula.weapon,f.data.weapons[attacker.weapon][defender.weapon]);
  assert.equal(formula.defense,formula.baseDefense+formula.race+formula.arenaDefense+formula.ward+bonus);
  assert(s.log.some(l=>l.text.includes('+'+bonus+' DEF')));E.assertState(s);restored(E,s);
 }
});
function step(E,s){
 if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
 else if(s.phase==='initiative')E.rollInitiative(s);
 else if(s.phase==='attack')E.rollAttack(s);
 else if(s.phase==='kalistel')E.acceptAttack(s);
 else if(s.phase==='defense')E.rollDefense(s);
 else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
 else if(s.phase==='result')E.next(s);
 else{const map={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};assert(map[s.phase]);const [grant,choose]=map[s.phase];E[grant](s,E[choose](s));}
}
test('12 full matches with both editions, equipment, replacement and save/reload',async()=>{
 const data=await dataPromise,E=createEngine(data),decks=M.qaDecks(data),seen=new Set();
 for(let n=0;n<12;n++){
  let s=E.newGame(decks[n%2],decks[1-n%2],{seed:'SECOND-EDITION-'+n,mode:'local',equipment:[loadout,loadout],turnOrder:'ABBA'});
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  for(let i=0;i<5000&&s.phase!=='over';i++){
   for(const p of s.players)for(const u of p.board.filter(Boolean))seen.add(u.cardId);
   step(E,s);E.assertState(s);if(i%11===0){restored(E,s);s=E.restoreGame(s);}
  }
  assert.equal(s.phase,'over');assert(E.matchStats(s).complete);restored(E,s);
 }
 for(const c of set.cards){assert(seen.has(c.id));assert(seen.has(c.lineage));}
});
test('Published PNGs match native pixel proof; PSD roundtrip and template are unchanged',()=>{
 const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 for(const c of currentSet.cards){
  const dir=path.resolve(__dirname,'../../creations',c.id),entry=catalogue.cards.filter(p=>p.id===c.id);assert.equal(entry.length,1);
  M.validateProfile(entry[0].profile,c);
  const proof=JSON.parse(fs.readFileSync(path.join(dir,'verification.json'),'utf8'));
  assert(proof.passed&&proof.barcode.passed);assert.equal(proof.components.fixedDifferences,0);assert.equal(proof.roundtrip.changed,0);
  assert.equal(sha(path.join(dir,'card.png')),proof.hashes['card.png']);
  assert.equal(sha(path.join(dir,'illustration.png')),sha(path.resolve(__dirname,'../../Illustrations',c.art)));
 }
});
