'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const set=require('./set.json'),c=set.cards[0],M=require('./model.cjs'),{deck,formation,deploy}=require('./fixtures.cjs');
const cat=require('../../donnees/catalogue.json'),{createEngine}=require('../../site/engine.js');
const dataPromise=require('../../atelier/game-catalog.cjs').buildCatalog({published:cat.cards.filter(c=>c.kind==='created')});
const root=path.resolve(__dirname,'../../..'),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const restore=(E,s)=>assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
async function fixture(){
  const data=await dataPromise,E=createEngine(data),s=E.newGame(deck,deck,{seed:'FAUVE',mode:'local',deckCoverage:2});
  const slots=formation(data.cards,deck,c.id,2);
  for(let side=0;side<2;side++)deploy(E,s,side,slots);E.start(s);
  return {data,E,s,u:s.players[0].board[2]};
}
test('Le Fauve is an additive Felineus X-Men with bounded distinct physical Middle stats',async()=>{
  M.validateSet(set);const data=await dataPromise;M.validateGame(data,set,createEngine);
  const p=cat.cards.find(x=>x.id===c.id)?.profile;assert(p);M.validateProfile(p,c);
  assert.equal(data.cards.filter(x=>x.characterId===c.characterId).length,1);
  assert.equal(p.race,'FELINEUS');assert.equal(p.faction,'XMEN');assert.equal(p.element,'LUXO');
  assert.notDeepEqual(p.atk,cat.cards.find(x=>x.id==='49901604').profile.atk);
  for(const edit of [x=>x.atk[0]=241,x=>x.defense[0]=241,x=>x.magic.push(5),x=>x.atk[1]='revive']){
    const invalid=structuredClone(c);edit(invalid);assert.throws(()=>M.profile(invalid));
  }
});
test('Native frame, reopened PSD, barcode, original artwork and existing banner remain identical',()=>{
  const folder='V4/creations/'+c.id,proof=require(path.join(root,folder,'verification.json'));
  assert(proof.passed&&proof.barcode.passed);assert.equal(proof.barcode.expected,c.id);
  assert.equal(proof.components.fixedDifferences,0);assert.equal(proof.roundtrip.changed,0);assert.equal(proof.components.severePixels,0);
  assert.equal(proof.hashes['card.png'],hash(folder+'/card.png'));assert.equal(proof.profileHash,hash(folder+'/profile.json'));
  assert.equal(hash(folder+'/illustration.png'),hash(c.artworkSource));
  const image=fs.readFileSync(path.join(root,folder,'card.png'));assert.deepEqual([image.readUInt32BE(16),image.readUInt32BE(20)],[897,1497]);
  const before=require('./before.json');
  for(const old of before.catalogue.cards)assert.deepEqual(cat.cards.find(x=>x.id===old.id),old);
  assert.equal(hash('V4/site/assets/factions/XMEN.png'),before.inputs['V4/site/assets/factions/XMEN.png']);
  assert(require('../../site/collection-binder.js').matchesScope(c,'xmen'));
});
test('All six ATK faces resolve, including a real allied clover grant with saved attribution',async()=>{
  for(let die=1;die<=6;die++){
    const {E,s,u}=await fixture();E.lock(s,2,2);E.rollAttack(s,die);restore(E,s);E.acceptAttack(s);
    assert.equal(s.duel.attackValue,c.atk[6-die]);
    if(die===5){
      assert.equal(s.phase,'clover');const ally=s.players[0].board[0];E.grantClover(s,ally.uid);
      assert.equal(ally.luck,1);assert.equal(ally.traitSources.luck.donor,u.uid);assert.equal(s.match.events.at(-1).kill,false);
    }else{
      assert.equal(s.phase,'defense');E.rollDefense(s,6);
      assert.equal(s.duel.formula.baseAttack,c.atk[6-die]);assert.equal(s.duel.magic,c.magic.includes(die));
    }
    E.assertState(s);restore(E,s);assert.equal(s.phase,'result');
  }
});
test('All six DEF faces resolve with the calibrated barrier and the nonlethal dodge',async()=>{
  for(let die=1;die<=6;die++){
    const {E,s}=await fixture();E.lock(s,2,2);E.rollAttack(s,3);E.acceptAttack(s);E.rollDefense(s,die);
    assert.equal(s.duel.defenseValue,c.defense[6-die]);assert(s.duel.magic);
    if(die===2){assert.equal(s.match.events.at(-1).dodge,true);assert.equal(s.match.events.at(-1).kill,false);}
    else {assert.equal(s.duel.formula.baseDefense,c.defense[6-die]);assert.equal(s.duel.formula.barrier,die===4?-E.rules.barrier:0);}
    E.assertState(s);restore(E,s);
  }
});
function step(E,s){
  const actions={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']};
  if(s.phase==='initiative')E.rollInitiative(s);
  else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
  else if(s.phase==='attack')E.rollAttack(s);
  else if(s.phase==='kalistel'){if(E.aiUseKalistel(s))E.useKalistel(s);else E.acceptAttack(s);}
  else if(s.phase==='defense')E.rollDefense(s);
  else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
  else if(s.phase==='result')E.next(s);
  else {assert(actions[s.phase],s.phase);const [grant,choose]=actions[s.phase];E[grant](s,E[choose](s));}
}
test('Twelve complete ABBA matches, both camps and snapshot restoration',async()=>{
  const data=await dataPromise,E=createEngine(data);let seen=false;
  for(let seed=0;seed<12;seed++){
    let s=E.newGame(seed%2?data.decks.player:deck,seed%2?deck:data.decks.enemy,{seed:'FAUVE-'+seed,turnOrder:'ABBA',deckCoverage:2});
    E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
    for(let n=0;n<5000&&s.phase!=='over';n++){
      seen ||= s.players.some(p=>p.board.some(u=>u?.cardId===c.id));
      step(E,s);E.assertState(s);if(n%19===0){restore(E,s);s=E.restoreGame(JSON.parse(JSON.stringify(s)));}
    }
    assert.equal(s.phase,'over');assert(E.matchStats(s).complete);
  }assert(seen);
});
