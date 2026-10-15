'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./model.cjs'),{set,initial,revision,elementRevision}=require('./current.cjs'),catalogue=require('../../donnees/catalogue.json');
const profiles=set.cards.map(c=>require('../../creations/'+c.id+'/profile.json'));
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
const published=catalogue.cards.filter(c=>c.kind==='created'&&!set.cards.some(s=>s.id===c.id));
published.push(...profiles.map(profile=>({id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'})));
const dataPromise=buildCatalog({published});
const support={
 guard:['guard','grantGuard','ward',60],retry:['clover','grantClover','luck',1],
 mana:['potion','grantPotion','mana',60],buff_atk:['physical','grantPhysical','physical',60],
 revive:['heart','grantReraise','reraise',1]
};
function forcedLineup(ids,target){
 const slots=Array(5).fill(null);slots[target.role-1]=target.id;
 const used=new Set([target.id]),byId=new Map(set.cards.map(c=>[c.id,c]));
 function visit(slot){
  if(slot===5)return true;if(slots[slot])return visit(slot+1);
  for(const id of ids)if(!used.has(id)&&byId.get(id).positions.includes(slot+1)){
   slots[slot]=id;used.add(id);if(visit(slot+1))return true;used.delete(id);slots[slot]=null;
  }return false;
 }
 assert(visit(0));return slots;
}
async function fixture(spec,side=0){
 const data=await dataPromise,E=createEngine(data),decks=M.qaDecks(data);
 const own=decks.find(ids=>ids.includes(spec.id));
 const s=E.newGame(side?decks[0]:own,side?own:decks[1],{seed:'FACES-'+spec.key,mode:'local',deckCoverage:2});
 const formation=forcedLineup(own,spec);
 for(let slot=0;slot<5;slot++)E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===formation[slot]).uid,slot);
 E.autoDeploy(s,1-side);E.start(s);
 return {E,s,slot:spec.role-1,u:s.players[side].board[spec.role-1]};
}
const restore=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);

test('22 approved versions, 19 identities, role limits and existing effects only',()=>{
 M.validateSet(initial);
 M.validateSet(set);
 for(const c of set.cards)M.validateProfile(profiles.find(p=>p.id===c.id),c);
 for(const change of [s=>s.cards[0].atk[0]=301,s=>s.cards[0].defense[0]=301,s=>s.cards[1].atk[1]='guard',s=>s.cards[0].magic.push(2),s=>s.cards.push(s.cards[0]),s=>s.cards[0].atk[5]='revive']){
  const invalid=structuredClone(set);change(invalid);assert.throws(()=>M.validateSet(invalid));
 }
});
test('Three playable decks cover all versions, correct variant identity and five roles',async()=>{
 const data=await dataPromise;M.validateGame(data,set,createEngine);
 for(const c of set.cards)assert(require('../../site/collection-binder.js').matchesScope(data.cards.find(p=>p.id===c.id),'final-fantasy'));
});

test('Every printed ATK face drives actual combat or its existing support category',async()=>{
 for(const spec of set.cards)for(let die=1;die<=6;die++){
  const {E,s,slot,u}=await fixture(spec);
  E.lock(s,slot,0);E.rollAttack(s,die);assert.equal(s.phase,'kalistel');restore(E,s);E.acceptAttack(s);
  const value=spec.atk[6-die];assert.equal(s.duel.attackValue,value);assert.equal(s.duel.magic,spec.magic.includes(die));
  if(typeof value==='number'){
   assert.equal(s.phase,'defense');E.rollDefense(s,6);
   assert.equal(s.duel.formula.baseAttack,value);
   const f=s.duel.formula;
   assert.equal(f.attack,Math.max(0,f.baseAttack+f.weapon+f.element+f.faction+f.buff+f.barrier+f.arenaAttack));
  }else if(value==='death'){
   assert.equal(s.phase,'defense');E.rollDefense(s,6);assert.equal(s.match.events.at(-1).kill,true);
  }else{
   const [phase,grant,field,amount]=support[value];assert.equal(s.phase,phase);
   E[grant](s,u.uid);assert.equal(u[field],amount);assert.equal(s.match.events.at(-1).kill,false);
  }
  assert.equal(s.phase,'result');E.assertState(s);restore(E,s);
 }
});
test('Every printed DEF face, barrier and dodge survives save/restore',async()=>{
 for(const spec of set.cards)for(let die=1;die<=6;die++){
  const {E,s,slot}=await fixture(spec,1);
  E.lock(s,0,slot);E.rollAttack(s,6);E.acceptAttack(s);E.rollDefense(s,die);
  const value=spec.defense[6-die];assert.equal(s.duel.defenseValue,value);
  if(value==='retry'){assert.equal(s.phase,'defense');restore(E,s);E.rollDefense(s,6);}
  else if(value==='dodge'){assert.equal(s.match.events.at(-1).kill,false);assert.equal(s.match.events.at(-1).dodge,true);}
  else{
   assert.equal(s.duel.formula.baseDefense,value);
   assert.equal(s.duel.formula.barrier,s.duel.magic&&spec.barriers.includes(die)?-E.rules.barrier:0);
  }
  E.assertState(s);restore(E,s);
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
  assert(actions[s.phase],s.phase);const [grant,choose]=actions[s.phase];E[grant](s,E[choose](s));
 }
}
test('36 full ABBA matches, three decks, both camps and repeated restoration',async()=>{
 const data=await dataPromise,E=createEngine(data),decks=M.qaDecks(data),seen=new Set();
 let effects=0,replacements=0;
 for(let seed=0;seed<36;seed++){
  let s=E.newGame(decks[seed%3],decks[(seed+1)%3],{seed:'FF9-'+seed,turnOrder:'ABBA',deckCoverage:2});
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  for(let n=0;n<5000&&s.phase!=='over';n++){
   for(const p of s.players)for(const u of p.board)if(u)seen.add(u.cardId);
   if(['clover','potion','physical','heart','guard'].includes(s.phase))effects++;
   if(s.phase==='replace')replacements++;
   step(E,s);E.assertState(s);
   if(n%13===0){const copy=E.restoreGame(JSON.parse(JSON.stringify(s)));assert.deepEqual(copy,s);s=copy;}
  }
  assert.equal(s.phase,'over');assert(E.matchStats(s).complete);restore(E,s);
 }
 assert.equal(seen.size,22);assert(effects>0);assert(replacements>0);
});
test('Published native cards, exact selected artwork, no rejected character installed',()=>{
 const cat=catalogue,hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 for(const c of set.cards){
  const dir=path.resolve(__dirname,'../../creations',c.id),entry=cat.cards.filter(p=>p.id===c.id);
  assert.equal(entry.length,1);
  assert.deepEqual(entry[0].profile,JSON.parse(fs.readFileSync(path.join(dir,'profile.json'),'utf8')));
  M.validateProfile(entry[0].profile,c);
  const changed=revision.cards.some(r=>r.id===c.id);
  const luxo=c.id===elementRevision.id;
  if(luxo)assert.equal(entry[0].nativeRevision.id,'2026-10-09-skaern-luxo');
  const bannerRevision=luxo?entry[0].nativeRevision.previous:entry[0].nativeRevision;
  assert.equal(bannerRevision.id,'2026-10-09-ff-logo-banners');
  if(changed)assert.equal(bannerRevision.previous.id,revision.revision);
  else assert.equal(bannerRevision.previous,null);
  const proof=JSON.parse(fs.readFileSync(path.join(dir,'verification.json'),'utf8'));
  assert(proof.passed&&proof.barcode.passed);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.components.fixedDifferences,0);
  assert.equal(hash(path.join(dir,'card.png')),proof.hashes['card.png']);
  assert.equal(hash(path.join(dir,'illustration.png')),hash(path.resolve(__dirname,'../../..',M.artPath(c))));
  assert.equal(proof.scope.outside,0);
  if(luxo){
   assert.deepEqual(proof.elementChange,{from:'NONE',to:'LUXO'});
   assert.equal(proof.numericFacesAndEffectsUnchanged,true);
   const bannerProof=require('../2026-10-09-skaern-luxo/originals/49901001/verification.json');
   assert.equal(bannerProof.gameplayUnchanged,true);assert.equal(bannerProof.scope.outside,0);
   assert.deepEqual(bannerProof.scope.rectangles,[[672,829,770,1052]]);
  }else{
   assert.equal(proof.gameplayUnchanged,true);
   assert.deepEqual(proof.scope.rectangles,[[672,829,770,1052]]);
  }
 }
 assert.equal(set.cards.find(c=>c.key==='cina').art,'18-cina-02.png');
 assert.equal(set.cards.find(c=>c.key==='dagga').art,'04-dagga-02.png');
});


test('Four additive race assets and the FF9 collection route',async()=>{
 const before=require('./race-extensions-before.json'),after=require('../../atelier/designer-assets/race-extensions.json');
 for(const [name,value]of Object.entries(before.races))assert.deepEqual(after.races[name],value);
 const assets=require('../../site/collaborations.js');
 for(const race of ['MICE','BATRA','RATZ','MACAKO'])assert.equal(assets.asset('races',race),'assets/races/'+race+'.png');
 assert.equal(assets.asset('factions','FF9'),'assets/factions/FF9.png');
 assert.equal(assets.of(set.cards[0]).id,'ff9');
});
