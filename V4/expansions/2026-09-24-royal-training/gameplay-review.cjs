'use strict';
const {fs,path,assert,read,write}=require('../../atelier/lib.cjs');
const M=require('./model.cjs');
const D=require('../../atelier/designer-core.cjs');
const {buildCatalog}=require('../../atelier/game-catalog.cjs');
const {createEngine}=require('../../site/engine.js');
const Binder=require('../../site/collection-binder.js');
const C=require('../../site/collaborations.js');
const home=__dirname;
function step(e,s){
  if(s.phase==='choose')e.lock(s,...e.aiChoice(s));
  else if(s.phase==='attack')e.rollAttack(s);
  else if(s.phase==='kalistel'){if(e.aiUseKalistel(s))e.useKalistel(s);else e.acceptAttack(s);}
  else if(s.phase==='defense')e.rollDefense(s);
  else if(s.phase==='result')e.next(s);
  else if(s.phase==='replace')e.autoDeploy(s,s.replacing);
  else {const suffix={guard:'Guard',heart:'Reraise',potion:'Potion',physical:'Physical',clover:'Clover'}[s.phase];assert(suffix,s.phase);e['grant'+suffix](s,e['ai'+suffix+'Choice'](s));}
}
function deckFor(e,c,data){
  for(const base of [data.decks.player,data.decks.enemy,...data.decks.presets.map(p=>p.cards)])for(let i=0;i<10;i++){
    const candidate=[...base];candidate[i]=c.id;
    if(!e.validatePlayableDeck(candidate).length)return [c.id,...candidate.filter(id=>id!==c.id)];
  }
  throw Error('No valid double-coverage test deck for '+c.name);
}
async function main(){
  const specs=Object.keys(M.INPUTS).flatMap(f=>read(path.join(home,f))).map(M.normalize);
  const baseline=read(path.join(home,'baseline/catalogue.json'));
  const prior=baseline.cards.filter(c=>c.kind==='created');
  const incoming=specs.map(c=>({id:c.id,profile:M.profile(c,D),pngUrl:'/media/created/'+c.id+'.png'}));
  const data=await buildCatalog({published:[...prior,...incoming]});
  const old=await buildCatalog({published:prior}),e=createEngine(data),original=createEngine(old);
  assert.equal(data.cards.length,89);assert.equal(data.arenas.length,23);
  for(const c of old.cards)assert.deepEqual(M.gameplay(data.cards.find(p=>p.id===c.id)),M.gameplay(c),c.id+' changed gameplay');
  const report={passed:false,checkedAt:new Date().toISOString(),cards:89,arenas:23,existingGameplayPreserved:old.cards.length,matches:[]};
  for(const c of specs){
    const card=data.cards.find(p=>p.id===c.id);
    for(const key of [...M.PRINTED,'role','characterId'])assert.deepEqual(card[key],c[key],c.key+'.'+key);
    const deck=deckFor(e,c,data),s=e.newGame(deck,data.decks.enemy,{seed:'ROYAL-'+c.key,deckCoverage:2});
    e.autoDeploy(s,0);e.autoDeploy(s,1);e.start(s);
    for(let n=0;n<10000&&s.phase!=='over';n++){step(e,s);e.assertState(s);}
    assert.equal(s.phase,'over',c.key+' match unfinished');
    report.matches.push({key:c.key,rounds:s.round,winner:s.winner,deck,coverage:e.deckCoverage(deck)});
  }
  for(const identity of ['aelis','kaylis']){
    const variants=data.cards.filter(c=>c.characterId===identity);
    assert.equal(variants.length,2,identity+' versions');
    assert.equal(Binder.groupCards(variants).length,1);
    assert(e.validateDeck(variants.map(c=>c.id)).some(s=>/personnage/.test(s)));
  }
  assert.equal(C.asset('factions','Solaria'),'assets/factions/Solaria.png');
  assert.equal(C.universe({faction:'Solaria'}),'kalistar');
  const saved=original.newGame(old.decks.player,old.decks.enemy,{deckCoverage:2,seed:'BEFORE-ROYAL'});
  original.autoDeploy(saved,0);original.autoDeploy(saved,1);original.start(saved);original.lock(saved,...original.aiChoice(saved));
  assert.deepEqual(e.restoreGame(saved),saved);
  report.savedMatchPreserved=true;report.passed=true;
  write(path.join(home,'gameplay-review.json'),report);console.log(JSON.stringify(report));
}
module.exports={main};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
