'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./model.cjs'),set=require('./set.json'),D=require('../../atelier/designer-core.cjs');
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
const profiles=set.cards.map(c=>require('./cards/'+c.key+'/profile.json'));
const published=D.catalogue().cards.filter(c=>c.kind==='created'&&!set.cards.some(s=>s.id===c.id));
published.push(...profiles.map(profile=>({id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'})));
const dataPromise=buildCatalog({published});
const support={guard:['guard','grantGuard','ward',60],retry:['clover','grantClover','luck',1],mana:['potion','grantPotion','mana',60],buff_atk:['physical','grantPhysical','physical',60],revive:['heart','grantReraise','reraise',1]};
const restore=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
async function fixture(spec,side=0){
  const data=await dataPromise,E=createEngine(data),ids=M.deck();
  const s=E.newGame(ids,ids,{seed:'GOTHAM-'+spec.key,mode:'local',deckCoverage:2});
  const lineup=M.formation(data.cards,ids,spec.id,spec.role-1);
  for(let slot=0;slot<5;slot++)E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===lineup[slot]).uid,slot);
  E.autoDeploy(s,1-side);E.start(s);
  return {E,s,slot:spec.role-1,u:s.players[side].board[spec.role-1]};
}
test('Two supplied identities, role bounds and unchanged source images',()=>{
  M.validateSet(set);
  for(const c of set.cards)M.validateProfile(profiles.find(p=>p.id===c.id),c);
  for(const mutate of [s=>s.cards[0].atk[0]=301,s=>s.cards[0].defense[0]=301,s=>s.cards[1].race='TOXINAR',s=>s.cards[0].race='FELINEUS',s=>s.cards[0].magic=[6],s=>s.cards[0].atk[2]='revive']){
    const bad=structuredClone(set);mutate(bad);assert.throws(()=>M.validateSet(bad));
  }
  const digest=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  for(const c of set.cards)assert.equal(digest(path.join(__dirname,'cards',c.key,'illustration.png')),digest(path.resolve(__dirname,'../../..',c.artworkSource)));
});
test('New collection scope, Gotham asset and valid deck with two cards per position',async()=>{
  const data=await dataPromise;
  M.validateGame({...data,cards:data.cards.map(c=>c.faction==='Batman'?{...c,faction:'Gotham'}:c)},set,createEngine);
  const C=require('../../site/collaborations.js'),Binder=require('../../site/collection-binder.js');
  for(const c of set.cards){
    assert.equal(C.of(c).id,'batman');assert(Binder.matchesScope(c,'batman'));assert(!Binder.matchesScope(c,'kalistar'));
  }
  assert.equal(C.asset('factions','Gotham'),'assets/factions/Gotham.png');
  assert.equal(C.asset('races','TOXINAR'),'shared/races/TOXINAR.png');
  assert.equal(C.asset('races','FELINEUS'),'shared/races/FELINEUS.png');
  assert.equal(fs.readFileSync(path.join(__dirname,'../2026-10-09-gotham/components/flag-Gotham.png')).compare(fs.readFileSync(path.resolve(__dirname,'../../site/assets/factions/Gotham.png'))),0);
});
test('All 12 ATK faces apply numeric attacks, death or the right support category',async()=>{
  for(const spec of set.cards)for(let die=1;die<=6;die++){
    const {E,s,slot,u}=await fixture(spec);
    E.lock(s,slot,0);E.rollAttack(s,die);assert.equal(s.phase,'kalistel');restore(E,s);E.acceptAttack(s);
    const value=spec.atk[6-die];assert.equal(s.duel.attackValue,value);assert.equal(s.duel.magic,spec.magic.includes(die));
    if(typeof value==='number'){
      assert.equal(s.phase,'defense');E.rollDefense(s,6);
      const f=s.duel.formula;assert.equal(f.baseAttack,value);
      assert.equal(f.attack,Math.max(0,f.baseAttack+f.weapon+f.element+f.faction+f.buff+f.barrier+f.arenaAttack+(f.equipmentAttack||0)+(f.captainAttack||0)));
    }else if(value==='death'){
      assert.equal(s.phase,'defense');E.rollDefense(s,6);assert.equal(s.match.events.at(-1).kill,true);
    }else{
      const [phase,grant,field,amount]=support[value];assert.equal(s.phase,phase);
      E[grant](s,u.uid);assert.equal(u[field],amount);assert.equal(s.match.events.at(-1).kill,false);
    }
    assert.equal(s.phase,'result');E.assertState(s);restore(E,s);
  }
});
test('All 12 DEF faces, barriers and dodge survive save and restore',async()=>{
  for(const spec of set.cards)for(let die=1;die<=6;die++){
    const {E,s,slot}=await fixture(spec,1);
    E.lock(s,0,slot);E.rollAttack(s,6);E.acceptAttack(s);E.rollDefense(s,die);
    const value=spec.defense[6-die];assert.equal(s.duel.defenseValue,value);
    if(value==='retry'){assert.equal(s.phase,'defense');restore(E,s);E.rollDefense(s,6);}
    else if(value==='dodge'){assert.equal(s.match.events.at(-1).kill,false);assert.equal(s.match.events.at(-1).dodge,true);}
    else{
      const f=s.duel.formula;assert.equal(f.baseDefense,value);
      assert.equal(f.barrier,s.duel.magic&&spec.barriers.includes(die)?-E.rules.barrier:0);
      assert.equal(f.defense,Math.max(0,f.baseDefense+f.race+f.arenaDefense+f.ward+(f.equipmentDefense||0)+(f.captainDefense||0)));
    }
    E.assertState(s);restore(E,s);
  }
});
test('32 complete seeded ABBA matches with both new characters and recurring restoration',async()=>{
  const data=await dataPromise,E=createEngine(data),ids=M.deck(),seen=new Set();
  const actions={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
  for(let seed=0;seed<32;seed++){
    const target=set.cards[seed%set.cards.length];
    let s=E.newGame(ids,ids,{seed:'GOTHAM-FULL-'+seed,turnOrder:'ABBA',deckCoverage:2});
    const slots=M.formation(data.cards,ids,target.id,target.role-1);
    for(let side=0;side<2;side++)for(let slot=0;slot<5;slot++)E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===slots[slot]).uid,slot);
    E.start(s);
    for(let n=0;n<5000&&s.phase!=='over';n++){
      for(const p of s.players)for(const u of p.board)if(u)seen.add(u.cardId);
      if(s.phase==='initiative')E.rollInitiative(s);
      else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
      else if(s.phase==='attack')E.rollAttack(s);
      else if(s.phase==='kalistel'){if(E.aiUseKalistel(s))E.useKalistel(s);else E.acceptAttack(s);}
      else if(s.phase==='defense')E.rollDefense(s);
      else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
      else if(s.phase==='result')E.next(s);
      else{assert(actions[s.phase],s.phase);const [grant,choose]=actions[s.phase];E[grant](s,E[choose](s));}
      E.assertState(s);if(n%17===0){restore(E,s);s=E.restoreGame(JSON.parse(JSON.stringify(s)));}
    }
    assert.equal(s.phase,'over');assert(E.matchStats(s).complete);restore(E,s);
  }
  for(const c of set.cards)assert(seen.has(c.id));
});
test('Two native PSD/PNG proofs, exact approved art and preserved previous catalogue entries',()=>{
  const before=require('./before.json'),cat=D.catalogue();
  for(const c of before.catalogue.cards)require('../2026-10-09-crossover-crystals/compatibility.cjs').assertPriorEntry(cat.cards.find(p=>p.id===c.id),c);
  for(const c of set.cards){
    const dir=path.join(__dirname,'cards',c.key),v=JSON.parse(fs.readFileSync(path.join(dir,'verification.json'),'utf8'));
    assert(v.passed&&v.barcode.passed);assert.equal(v.roundtrip.changed,0);assert.equal(v.components.fixedDifferences,0);
    if(c.element==='NONE')assert.equal(v.none.unlit,true);
  }
});
