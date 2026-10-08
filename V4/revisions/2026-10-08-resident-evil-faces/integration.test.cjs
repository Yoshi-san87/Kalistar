'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const S=require('./rules.cjs'),plan=require('./plan.json'),catalogue=require('../../donnees/catalogue.json'),M=require('../../expansions/2026-10-08-final-fantasy-ix/model.cjs');
const {createEngine}=require('../../site/engine.js'),{buildCatalog}=require('../../atelier/game-catalog.cjs');
const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8')),profiles=plan.cards.map(c=>S.after(read('originals/'+c.id+'/profile.json'),c));
const published=catalogue.cards.filter(c=>c.kind==='created'&&!profiles.some(p=>p.id===c.id));
published.push(...profiles.map(profile=>({id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'})));
const dataPromise=buildCatalog({published});
function deck(E,p){
 const ids=M.qaDecks()[0];
 for(let i=0;i<ids.length;i++){const next=ids.slice();next[i]=p.id;if(!E.validatePlayableDeck(next).length)return next;}
 assert.fail('No valid coverage-2 test deck for '+p.id);
}
function formation(data,ids,p){
 const out=Array(5).fill(null),used=new Set([p.id]);out[p.role-1]=p.id;
 const get=id=>data.cards.find(c=>c.id===id);
 function fill(slot){
  if(slot===5)return true;if(out[slot])return fill(slot+1);
  for(const id of ids)if(!used.has(id)&&get(id).positions.includes(slot+1)){out[slot]=id;used.add(id);if(fill(slot+1))return true;out[slot]=null;used.delete(id);}
  return false;
 }
 assert(fill(0));return out;
}
async function fixture(p,side=0){
 const data=await dataPromise,E=createEngine(data),own=deck(E,p),opponent=M.qaDecks()[0];
 const s=E.newGame(side?opponent:own,side?own:opponent,{seed:'RE-'+p.id,mode:'local',deckCoverage:2});
 const lineup=formation(data,own,p);
 lineup.forEach((id,slot)=>E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===id).uid,slot));
 E.autoDeploy(s,1-side);E.start(s);return {E,s,u:s.players[side].board[p.role-1]};
}
const support={guard:['guard','grantGuard','ward',60],retry:['clover','grantClover','luck',1],mana:['potion','grantPotion','mana',60],buff_atk:['physical','grantPhysical','physical',60],revive:['heart','grantReraise','reraise',1]};
const restore=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
test('25 personalities preserve identity, art, role, positions and all legal face intervals',()=>{
 assert.equal(profiles.length,25);
 profiles.forEach((p,i)=>S.validate(read('originals/'+p.id+'/profile.json'),p));
 assert(profiles.filter(p=>p.atk[5]==='retry').length<5);
 assert(profiles.filter(p=>p.defense[3]==='dodge').length<5);
 for(const mut of [p=>p.atk[0]=1000,p=>p.characterId='other',p=>p.positions=[5],p=>p.atk[1]='revive']){
  const old=read('originals/'+profiles[0].id+'/profile.json'),p=structuredClone(profiles[0]);mut(p);assert.throws(()=>S.validate(old,p));
 }
});
test('All 150 RE ATK faces apply the printed number or native support/death effect',async()=>{
 for(const p of profiles)for(let die=1;die<=6;die++){
  const {E,s,u}=await fixture(p);E.lock(s,p.role-1,0);E.rollAttack(s,die);restore(E,s);E.acceptAttack(s);
  const value=p.atk[6-die];assert.equal(s.duel.attackValue,value);assert.equal(s.duel.magic,p.magic.includes(die));
  if(typeof value==='number'){assert.equal(s.phase,'defense');E.rollDefense(s,6);assert.equal(s.duel.formula.baseAttack,value);}
  else if(value==='death'){E.rollDefense(s,6);assert.equal(s.match.events.at(-1).kill,true);}
  else{const [phase,grant,field,amount]=support[value];assert.equal(s.phase,phase);E[grant](s,u.uid);assert.equal(u[field],amount);}
  assert.equal(s.phase,'result');E.assertState(s);restore(E,s);
 }
});
test('All 150 RE DEF faces, barriers, dodges and retries resolve and restore',async()=>{
 for(const p of profiles)for(let die=1;die<=6;die++){
  const {E,s}=await fixture(p,1);E.lock(s,0,p.role-1);E.rollAttack(s,6);E.acceptAttack(s);E.rollDefense(s,die);
  const value=p.defense[6-die];assert.equal(s.duel.defenseValue,value);
  if(value==='retry'){assert.equal(s.phase,'defense');restore(E,s);E.rollDefense(s,6);}
  else if(value==='dodge'){assert.equal(s.match.events.at(-1).kill,false);assert.equal(s.match.events.at(-1).dodge,true);}
  else{assert.equal(s.duel.formula.baseDefense,value);assert.equal(s.duel.formula.barrier,s.duel.magic&&p.barriers.includes(die)?-E.rules.barrier:0);}
  E.assertState(s);restore(E,s);
 }
});
function step(E,s){
 const commands={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
 if(s.phase==='initiative')E.rollInitiative(s);else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);
 else if(s.phase==='kalistel'){if(E.aiUseKalistel(s))E.useKalistel(s);else E.acceptAttack(s);}
 else if(s.phase==='defense')E.rollDefense(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);else if(s.phase==='result')E.next(s);
 else{assert(commands[s.phase]);const [give,choose]=commands[s.phase];E[give](s,E[choose](s));}
}
test('50 complete ABBA matches cover every RE profile in both camps',async()=>{
 const data=await dataPromise,E=createEngine(data);
 for(const p of profiles)for(let side=0;side<2;side++){
  const own=deck(E,p),other=M.qaDecks()[1];let s=E.newGame(side?other:own,side?own:other,{seed:'RE-FULL-'+p.id+'-'+side,turnOrder:'ABBA',deckCoverage:2});
  formation(data,own,p).forEach((id,slot)=>E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===id).uid,slot));
  E.autoDeploy(s,1-side);E.start(s);
  for(let n=0;n<5000&&s.phase!=='over';n++){step(E,s);E.assertState(s);if(n%17===0){restore(E,s);s=E.restoreGame(JSON.parse(JSON.stringify(s)));}}
  assert.equal(s.phase,'over');assert(E.matchStats(s).complete);restore(E,s);
 }
});
test('Published RE profiles and images match native proofs with original art intact',()=>{
 const digest=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 for(const p of profiles){
  const dir=path.resolve(__dirname,'../../creations',p.id),entry=catalogue.cards.find(c=>c.id===p.id),v=JSON.parse(fs.readFileSync(path.join(dir,'verification.json'),'utf8'));
  assert.deepEqual(entry.profile,p);assert.equal(entry.nativeRevision.id,S.REV);
  assert(v.passed&&v.barcode.passed&&v.preservedArtworkAndIdentity);assert.equal(v.scope.outside,0);assert.equal(v.components.fixedDifferences,0);assert.equal(v.roundtrip.changed,0);
  assert.equal(digest(path.join(dir,'card.png')),v.hashes['card.png']);
  assert.equal(digest(path.join(dir,'illustration.png')),digest(path.join(__dirname,'originals',p.id,'illustration.png')));
 }
});
