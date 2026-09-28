'use strict';
const test=require('node:test');
const L=require('../../atelier/lib.cjs'),{assert,fs,path,read,hash,ROOT,sharp}=L;
const {buildCatalog}=require('../../atelier/game-catalog.cjs');
const {createEngine}=require('../../site/engine.js');
const entries=require('../../donnees/arenes-collaborations.json');
const before=require('./arenas.before.json'),proof=require('./installation.json');
const additions=entries.filter(a=>/^mgs[124]-/.test(a.id));
const published=require('../../donnees/catalogue.json').cards.filter(c=>c.kind==='created');
const snake=faction=>published.find(c=>c.profile.faction===faction&&c.profile.characterId==='solid-snake-mgs');
test('exactly three arenas are appended; all earlier arenas remain unchanged',()=>{
  assert.deepEqual(entries.slice(0,before.length),before);assert.equal(entries.length,before.length+3);
  assert.deepEqual(additions.map(a=>[a.id,a.collaboration,a.element]),[
    ['mgs1-shadow-moses','mgs1','CRYO'],['mgs2-big-shell','mgs2','HYDRO'],['mgs4-middle-east','mgs4','GEO']]);
  for(const a of additions)assert.deepEqual([a.elementBonus,a.homeAttack,a.homeDefense],[15,10,10]);
});
test('each arena unlocks only for a published version from its episode',async()=>{
  assert(!(await buildCatalog()).arenas.some(a=>a.id.startsWith('mgs')));
  for(const faction of ['MGS1','MGS2','MGS4']){
    const data=await buildCatalog({published:[snake(faction)]});
    assert.deepEqual(data.arenas.filter(a=>a.id.startsWith('mgs')).map(a=>a.id),additions.filter(a=>a.collaboration===faction.toLowerCase()).map(a=>a.id));
    assert.deepEqual(data.arenas.at(-1).homeCharacters,['solid-snake-mgs']);
  }
});
test('all home identities exist; arena bonus stays symmetric and bounded across versions',async()=>{
  const data=await buildCatalog({published}),engine=createEngine(data),ids=new Set(data.cards.map(c=>c.characterId));
  for(const a of additions){
    assert(a.homeCharacters.every(id=>ids.has(id)));
    for(const c of data.cards){
      const home=a.homeCharacters.includes(c.characterId)?10:0,element=c.element===a.element?15:0;
      const expected={attack:home+element,defense:home,element,homeAttack:home,homeDefense:home};
      for(const side of [0,1])assert.deepEqual(engine.arenaBonuses({arenaId:a.id},{cardId:c.id,side}),expected);
    }
  }
});
test('new arenas play and restore; existing saved games are unchanged',async()=>{
  const base=await buildCatalog(),oldEngine=createEngine(base);
  const old=oldEngine.newGame(base.decks.player,base.decks.enemy,{deckCoverage:2,seed:'BEFORE-MGS-ARENAS'});
  oldEngine.autoDeploy(old,0);oldEngine.autoDeploy(old,1);oldEngine.start(old);
  const data=await buildCatalog({published}),engine=createEngine(data);assert.deepEqual(engine.restoreGame(old),old);
  for(const a of additions){
    const game=engine.newGame(data.decks.player,data.decks.enemy,{deckCoverage:2,seed:a.id,arenaId:a.id});
    engine.autoDeploy(game,0);engine.autoDeploy(game,1);engine.start(game);
    assert.equal(game.arenaId,a.id);assert.deepEqual(engine.restoreGame(game),game);
    assert.throws(()=>engine.setArena(game,a.id),/verrouill/);
  }
});
test('generated images are genuine landscape PNGs; cards and protected references are untouched',async()=>{
  for(const [file,h] of Object.entries(proof.before))assert.equal(await hash(path.join(ROOT,file)),h);
  for(const output of proof.outputs){
    const file=path.join(ROOT,output.target),m=await sharp(file).metadata();
    assert.equal(await hash(file),output.sha256);assert.equal(m.format,'png');
    assert.deepEqual([m.width,m.height],[output.width,output.height]);assert(m.width>=1500&&m.width/m.height>1.7);
    const stats=await sharp(file).stats();assert(stats.channels.slice(0,3).every(c=>c.stdev>20),'Nonblank image');
  }
});
