'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./model.cjs'),set={cards:M.all().map(c=>({...require('./cards/'+c.key+'/profile.json'),key:c.key}))},D=require('../../atelier/designer-core.cjs');
const {buildCatalog}=require('../../atelier/game-catalog.cjs'),{createEngine}=require('../../site/engine.js');
const profiles=set.cards.map(c=>require('./cards/'+c.key+'/profile.json'));
const published=D.catalogue().cards.filter(c=>c.kind==='created'&&!set.cards.some(s=>s.id===c.id));
published.push(...profiles.map(profile=>({id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'})));
const dataPromise=buildCatalog({published});
const support={guard:['guard','grantGuard','ward',60],retry:['clover','grantClover','luck',1],mana:['potion','grantPotion','mana',60],buff_atk:['physical','grantPhysical','physical',60],revive:['heart','grantReraise','reraise',1]};
const restore=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
async function fixture(spec,side=0){
  const data=await dataPromise,E=createEngine(data),ids=M.decks.find(ids=>ids.includes(spec.id));
  const s=E.newGame(ids,ids,{seed:'GOTHAM-'+spec.key,mode:'local',deckCoverage:2});
  const lineup=M.formation(data.cards,ids,spec.id,spec.role-1);
  for(let slot=0;slot<5;slot++)E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===lineup[slot]).uid,slot);
  E.autoDeploy(s,1-side);E.start(s);
  return {E,s,slot:spec.role-1,u:s.players[side].board[spec.role-1]};
}
test('Nine new identities, six scoped revisions and unchanged source images',()=>{
  M.validateSet();for(const p of profiles)M.validate(p);
  for(const mutate of [p=>p.atk[0]=301,p=>p.defense[0]=301,p=>p.element='NONE',p=>p.magic=[2],p=>p.atk[2]='revive']){
    const bad=structuredClone(profiles[0]);mutate(bad);assert.throws(()=>M.validate(bad));
  }
  const digest=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  for(const c of M.set.cards)assert.equal(digest(path.join(__dirname,'cards',c.key,'illustration.png')),digest(path.resolve(__dirname,'../../..',c.artworkSource)));
});

test('Collection aliases, approved banner and two full playable formations',async()=>{
  const data=await dataPromise,E=M.validateGame(data,createEngine);
  const C=require('../../site/collaborations.js'),Binder=require('../../site/collection-binder.js');
  for(const c of set.cards){
    const scope=c.faction==='XMEN'?'xmen':c.faction==='Gotham'?'batman':'witcher';
    assert.equal(C.of(c).id,scope);assert(Binder.matchesScope(c,scope));assert(!Binder.matchesScope(c,'kalistar'));
  }
  assert.equal(C.asset('factions','Gotham'),C.asset('factions','Batman'));
  assert.equal(C.asset('factions','XMEN'),'assets/factions/XMEN.png');
  assert.equal(fs.readFileSync(path.join(__dirname,'components/flag-XMEN.png')).compare(fs.readFileSync(path.resolve(__dirname,'../../site/assets/factions/XMEN.png'))),0);
  assert.equal(E.byId['49900102'].characterId,E.byId['49900101'].characterId);
  const twins=M.decks[1].map(id=>id==='49901401'?'49900101':id);
  assert(E.validatePlayableDeck(twins).some(s=>/version|personnage/i.test(s)));
  const batman=data.cards.filter(c=>c.faction==='Batman');assert.equal(batman.length,11);assert(batman.every(c=>c.element!=='NONE'));
  // Verify this original batch without forbidding later X-Men publications.
  const originalXmen=set.cards.filter(c=>c.faction==='XMEN').map(c=>c.id);
  assert.deepEqual(data.cards.filter(c=>c.faction==='XMEN'&&originalXmen.includes(c.id)).map(c=>c.id).sort(),originalXmen.slice().sort());
});

test('All 90 ATK faces apply numeric attacks, death or the right support category',async()=>{
  for(const spec of set.cards)for(let die=1;die<=6;die++){
    const {E,s,slot,u}=await fixture(spec);
    E.lock(s,slot,0);E.rollAttack(s,die);assert.equal(s.phase,'kalistel');restore(E,s);E.acceptAttack(s);
    const value=spec.atk[6-die];assert.equal(s.duel.attackValue,value);assert.equal(s.duel.magic,spec.magic.includes(die));
    if(typeof value==='number'){
      assert.equal(s.phase,'defense');const defender=E.card(s.players[1-s.duel.side].board[s.duel.targetSlot]);E.rollDefense(s,6);
      const f=s.duel.formula;assert.equal(f.baseAttack,value);
      const element=(await dataPromise).elements[spec.element];
      const expected=defender.element==='NONE'?20:element.strong_against===defender.element?30:element.weak_against===defender.element?-30:0;
      assert.equal(f.element,expected,spec.name+' elemental matchup');
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
test('All 90 DEF faces, barriers and dodge survive save and restore',async()=>{
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
test('60 complete seeded ABBA matches with all revised and new characters and restoration',async()=>{
  const data=await dataPromise,E=createEngine(data),seen=new Set();
  const actions={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
  for(let seed=0;seed<60;seed++){
    const target=set.cards[seed%set.cards.length],ids=M.decks.find(ids=>ids.includes(target.id));
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
test('Fifteen native proofs preserve frames, PSD rendering, barcodes and revision scope',()=>{
  const before=require('./before.json'),cat=D.catalogue();
  for(const c of before.catalogue.cards)require('./compatibility.cjs').assertPriorEntry(cat.cards.find(p=>p.id===c.id),c);
  for(const c of set.cards){
    const dir=path.join(__dirname,'cards',c.key),v=JSON.parse(fs.readFileSync(path.join(dir,'verification.json'),'utf8'));
    assert(v.passed&&v.barcode.passed);assert.equal(v.roundtrip.changed,0);assert.equal(v.components.fixedDifferences,0);
    if(M.set.revisions.some(r=>r.id===c.id)){assert.equal(v.scope.outside,0);assert(v.scope.changed>0);assert(v.numericFacesAndEffectsUnchanged);}
  }
});

test('Legacy no-crystal matches restore without changing their archived data',async()=>{
  const current=await dataPromise,old=structuredClone(current),before=require('./before.json');
  for(const spec of M.set.revisions){
    const p=before.catalogue.cards.find(c=>c.id===spec.id).profile,c=old.cards.find(c=>c.id===spec.id);
    Object.assign(c,{element:p.element,sentry:p.sentry,faction:'Gotham'});
  }
  const prior=createEngine(old),now=createEngine(current),ids=M.decks[0];
  const state=prior.newGame(ids,ids,{mode:'local',seed:'old-gotham',kalistel:false,deckCoverage:2});
  prior.autoDeploy(state,0);prior.autoDeploy(state,1);prior.start(state);prior.lock(state,0,0);prior.rollAttack(state,6);
  const archive=JSON.stringify({data:old,state}),restored=now.restoreGame(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored,state);assert.equal(JSON.stringify({data:old,state}),archive);
  const archivedEngine=createEngine(JSON.parse(archive).data);assert.deepEqual(archivedEngine.restoreGame(state),state);
  assert(M.set.revisions.every(c=>archivedEngine.byId[c.id].element==='NONE'));
});
