'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const {createEngine}=require('./engine.js');
const {createData}=require('./engine-fixtures.cjs');
const checks=[];
function test(name,run){run();checks.push(name);console.log('PASS '+name);}
const json=value=>JSON.parse(JSON.stringify(value));
const coverage=(...counts)=>Object.fromEntries(counts.map((n,i)=>[i+1,n]));
const legacyDeck=data=>[...data.decks.player.slice(0,9),data.cards[10].id];
function rejectsUnchanged(run,value,pattern){const before=json(value);assert.throws(run,pattern);assert.deepEqual(json(value),before);}
function deployed(E,s){E.autoDeploy(s,0);E.autoDeploy(s,1);return s;}

test('Baseline defaults to historical validation; strict helper reports each missing position',()=>{
  const data=createData(),E=createEngine(data),old=legacyDeck(data);
  assert.deepEqual(E.deckCoverage(old),coverage(3,2,2,2,1));
  assert.deepEqual(E.validateDeck(old),[]);
  assert.deepEqual(E.validateDeck(old,{coverage:1}),[]);
  assert.deepEqual(E.validatePlayableDeck(old),E.validateDeck(old,{coverage:2}));
  assert.equal(E.validatePlayableDeck(old).length,1);
  assert.match(E.validatePlayableDeck(old)[0],/P5.*1\/2/);
  for(const position of [1,2,3,4,5]){
    const ids=data.decks.player.filter((_,i)=>i!==position+4);
    ids.push(data.cards[position===1?11:10].id);
    assert(E.validatePlayableDeck(ids).some(message=>message.startsWith('P'+position+' :')));
  }
});

test('Coverage counts copies and every compatible position once per card, without mutation',()=>{
  const data=createData();data.cards[0].positions=[1,2,2,3,4,5];
  const E=createEngine(data),ids=Object.freeze([data.cards[0].id,Number(data.cards[0].id),'unknown']);
  const before=json(data);
  assert.deepEqual(E.deckCoverage(ids),coverage(2,2,2,2,2));
  assert.deepEqual(E.deckCoverage(null),coverage(0,0,0,0,0));
  assert.deepEqual(E.deckCoverage(['toString',{},undefined]),coverage(0,0,0,0,0));
  assert.deepEqual(data,before);
});

test('Strict coverage is not a partition into two independent five-card formations',()=>{
  const data=createData();
  data.cards.slice(0,10).forEach((card,i)=>{card.positions=i<3?[1,2]:i<5?[3]:i<7?[4]:[5];});
  const E=createEngine(data),ids=data.decks.player;
  assert.deepEqual(E.deckCoverage(ids),coverage(3,3,2,2,3));
  assert.deepEqual(E.validatePlayableDeck(ids),[]);
  assert(E.lineup(ids));
  let doubleFormation=false;
  for(let mask=0;mask<1024;mask++){
    const first=ids.filter((_,i)=>mask&(1<<i));
    if(first.length===5&&E.lineup(first)&&E.lineup(ids.filter((_,i)=>!(mask&(1<<i)))))doubleFormation=true;
  }
  assert.equal(doubleFormation,false);
  assert.equal(E.newGame(ids,ids,{deckCoverage:2}).deckCoverage,2);
});

test('Two compatible cards per position do not replace the existing complete-formation check',()=>{
  const data=createData();
  data.cards.slice(0,10).forEach((card,i)=>{card.positions=i<2?[1,2,3]:[4,5];});
  const E=createEngine(data),ids=data.decks.player;
  assert.deepEqual(E.deckCoverage(ids),coverage(2,2,2,8,8));
  assert.equal(E.lineup(ids),null);
  assert(E.validatePlayableDeck(ids).some(message=>message.includes('formation')));
  assert.throws(()=>E.newGame(ids,ids,{deckCoverage:2}),/formation/);
});

test('Exactly ten real V3 cards, copy limit and Rainbow limit remain mandatory',()=>{
  const data=createData(),E=createEngine(data),ids=data.decks.player;
  for(const bad of [null,{},[],ids.slice(1),[...ids,ids[0]],['30000042',...ids.slice(1)],['20000001',...ids.slice(1)],['toString',...ids.slice(1)]]){
    assert(E.validatePlayableDeck(bad).length);
    assert.throws(()=>E.newGame(bad,ids,{deckCoverage:2}));
  }
  const copies=[...ids];copies[5]=copies[0];assert.deepEqual(E.validatePlayableDeck(copies),[]);
  copies[6]=copies[0];assert(E.validatePlayableDeck(copies).some(message=>message.includes('exemplaires')));
  const rainbow=createData();rainbow.cards[0].element='RAINBOW';rainbow.cards[1].element='RAINBOW';
  assert(createEngine(rainbow).validatePlayableDeck(ids).some(message=>message.includes('Rainbow')));
  const flexible=createData();flexible.cards.forEach(card=>{card.positions=[1,2,3,4,5];});
  const sparse=[...ids];delete sparse[9];
  assert(createEngine(flexible).validatePlayableDeck(sparse).length);
  const frozen=Object.freeze([...ids]);assert.deepEqual(E.validatePlayableDeck(frozen),[]);
});

test('New-game enforcement checks both players in either mode even without UI validation',()=>{
  const data=createData(),E=createEngine(data),good=data.decks.player,bad=legacyDeck(data);
  for(const mode of ['ai','local'])for(const decks of [[bad,good],[good,bad]]){
    const options={mode,deckCoverage:2,seed:'FORGED-FORM'},before=json({decks,options});
    assert.throws(()=>E.newGame(...decks,options),/P5/);
    assert.deepEqual({decks,options},before);
  }
  const s=E.newGame(good,data.decks.enemy,{deckCoverage:2});
  assert.equal(s.schema,6);assert.equal(s.deckCoverage,2);
  assert.equal(E.assertState(s),true);assert.deepEqual(E.restoreGame(json(s)),s);
});

test('Invalid coverage option or marker cannot silently fall back to baseline',()=>{
  const data=createData(),E=createEngine(data);
  for(const value of [0,3,-1,2.5,'2',null,false,{},[]]){
    assert(E.validateDeck(data.decks.player,{coverage:value}).length);
    assert.throws(()=>E.newGame(data.decks.player,data.decks.enemy,{deckCoverage:value}),/Couverture/);
    const s=E.newGame(data.decks.player,data.decks.enemy);s.deckCoverage=value;
    rejectsUnchanged(()=>E.restoreGame(s),s,/Couverture/);
  }
});

test('Marked JSON imports and forged full formations reject deficient decks atomically',()=>{
  const data=createData(),E=createEngine(data);
  for(const side of [0,1]){
    const decks=[data.decks.player,data.decks.enemy];decks[side]=legacyDeck(data);
    const s=deployed(E,E.newGame(...decks));s.deckCoverage=2;
    assert(s.players.every(p=>p.board.every(Boolean)));
    rejectsUnchanged(()=>E.assertState(s),s,/Cartes/);
    rejectsUnchanged(()=>E.restoreGame(json(s)),s,/Cartes/);
    rejectsUnchanged(()=>E.start(s),s,/Cartes/);
  }
});

test('Strict save coverage includes board, reserve and dead, not only survivors',()=>{
  const data=createData(),E=createEngine(data),s=deployed(E,E.newGame(data.decks.player,data.decks.enemy,{deckCoverage:2}));
  E.start(s);
  for(const p of s.players){p.dead.push(p.reserve.pop());p.dead.push(p.board[4]);p.board[4]=null;}
  assert.equal(E.assertState(s),true);
  assert.deepEqual(E.restoreGame(json(s)),s);
});

test('Unmarked schema-6 setup, running and completed archives keep their original contents',()=>{
  const data=createData(),E=createEngine(data);
  for(const phase of ['setup','choose','over']){
    const s=E.newGame(legacyDeck(data),data.decks.enemy);
    assert.equal(Object.hasOwn(s,'deckCoverage'),false);
    if(phase!=='setup'){deployed(E,s);E.start(s);}
    if(phase==='over'){
      const p=s.players[1];p.dead.push(...p.board,...p.reserve);p.board=Array(5).fill(null);p.reserve=[];
      s.phase='over';s.winner=0;
    }
    const before=json(s),stats=E.matchStats(s),restored=E.restoreGame(json(s));
    assert.deepEqual(restored,before);assert.deepEqual(s,before);assert.deepEqual(E.matchStats(restored),stats);
    s.deckCoverage=1;assert.deepEqual(E.restoreGame(json(s)),s);
  }
});

test('Reraise prevents a kill, including Mort; ten actual deaths win after replacements',()=>{
  for(const attack of [200,'death'])for(const winningSide of [0,1]){
    const data=createData();
    data.cards.forEach((card,i)=>{
      card.atk=Array(6).fill(Math.floor(i/10)===winningSide?attack:0);card.defense=Array(6).fill(100);
      card.magic=[];card.barriers=[];card.element='NONE';card.weapon='Poing';card.faction=card.id;card.race=card.id;
    });
    const E=createEngine(data);let s=deployed(E,E.newGame(data.decks.player,data.decks.enemy,{deckCoverage:2}));
    E.start(s);s.players[1-winningSide].board[0].reraise=1;
    let steps=0,reraises=0;
    while(s.phase!=='over'&&steps++<300){
      if(s.phase==='choose')E.lock(s,s.players[s.turn].board.findIndex(Boolean),s.players[1-s.turn].board.findIndex(Boolean));
      else if(s.phase==='attack')E.rollAttack(s,6);
      else if(s.phase==='defense')E.rollDefense(s,6);
      else if(s.phase==='result'){
        if(s.duel.reraised){reraises++;assert.equal(s.players[1-winningSide].dead.length,0);assert.equal(s.match.events.at(-1).kill,false);}
        E.next(s);
      }else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
      else assert.fail('Unexpected phase '+s.phase);
      for(const side of [0,1])assert.equal(E.matchStats(s).teams[side].kills,s.players[1-side].dead.length);
      if(s.phase!=='over')assert.equal(s.winner,null);
      s=E.restoreGame(json(s));
    }
    assert.equal(reraises,1);assert.equal(s.phase,'over');assert.equal(s.winner,winningSide);
    assert.equal(s.players[1-winningSide].dead.length,10);assert.equal(s.players[winningSide].dead.length,0);
  }
});

const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'data.js'),'utf8'),sandbox);
const production=json(sandbox.window.KALISTAR_DATA),productionEngine=createEngine(production);
const presets=[{id:'player',name:'Deck initial joueur',cards:production.decks.player},{id:'enemy',name:'Deck initial adverse',cards:production.decks.enemy},...production.decks.presets];
const presetReport=[];
test('All five production presets retain baseline validity and expose strict coverage status',()=>{
  const before=json(production);
  assert.equal(presets.length,5);
  for(const preset of presets){
    const counts=productionEngine.deckCoverage(preset.cards),errors=productionEngine.validatePlayableDeck(preset.cards);
    assert.deepEqual(productionEngine.validateDeck(preset.cards),[],preset.id);
    assert.deepEqual(counts,Object.fromEntries([1,2,3,4,5].map(p=>[p,preset.cards.filter(id=>productionEngine.byId[id].positions.includes(p)).length])));
    const missing=Object.keys(counts).filter(p=>counts[p]<2);
    assert.equal(errors.length===0,missing.length===0);
    if(errors.length)assert.throws(()=>productionEngine.newGame(preset.cards,preset.cards,{deckCoverage:2}));
    else assert.equal(productionEngine.newGame(preset.cards,preset.cards,{deckCoverage:2}).deckCoverage,2);
    const legacy=productionEngine.newGame(preset.cards,preset.cards);
    assert.deepEqual(productionEngine.restoreGame(json(legacy)),legacy);
    presetReport.push({id:preset.id,name:preset.name,coverage:counts,playable:errors.length===0,errors});
  }
  assert.deepEqual(production,before);
});

async function databaseRegression(){
  const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  let playwright;
  try{playwright=require('playwright');}catch{playwright=createRequire(path.join(modules,'__deck_rules__.cjs'))('playwright');}
  const browser=await playwright.chromium.launch({channel:process.env.KALISTAR_BROWSER||'chrome',headless:true});
  try{
    const page=await browser.newPage();
    await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Engine deck rules QA</title>'}));
    await page.goto('http://localhost:39874');
    await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'engine.js'),'utf8')});
    await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'local-db.js'),'utf8')});
    const result=await page.evaluate(async data=>{
      const E=KalistarEngine.createEngine(data),bad=[...data.decks.player.slice(0,9),data.cards[10].id];
      const legacy=E.newGame(bad,data.decks.enemy,{seed:'HISTORICAL-ARCHIVE'});
      E.autoDeploy(legacy,0);E.autoDeploy(legacy,1);E.start(legacy);
      const lost=legacy.players[1];lost.dead.push(...lost.board,...lost.reserve);lost.board=Array(5).fill(null);lost.reserve=[];
      legacy.phase='over';legacy.winner=0;
      const strict=E.newGame(data.decks.player,data.decks.enemy,{deckCoverage:2,seed:'STRICT-ARCHIVE'});
      const suffix=crypto.randomUUID(),source=await KalistarLocalDB.open(data,{name:'kalistar-v3-cards-deck-source-'+suffix});
      const target=await KalistarLocalDB.open(data,{name:'kalistar-v3-cards-deck-target-'+suffix});
      try{
        await source.saveGame(legacy);await source.saveGame(strict);
        const backup=await source.exportBackup();
        await target.importBackup(backup);await target.importBackup(backup);
        const restored=await target.exportBackup(),before=JSON.stringify(target.matches());
        const forged=structuredClone(legacy);forged.matchId='match-'+crypto.randomUUID();forged.deckCoverage=2;
        let rejectedSave=false,rejectedImport=false;
        try{await target.saveGame(forged);}catch{rejectedSave=true;}
        const poisoned=structuredClone(backup);poisoned.matches.find(m=>m.id===legacy.matchId).state.deckCoverage=2;
        try{await target.importBackup(poisoned);}catch{rejectedImport=true;}
        return {originalMatches:backup.matches,restoredMatches:restored.matches,originalResults:backup.results,restoredResults:restored.results,
          rejectedSave,rejectedImport,unchanged:before===JSON.stringify(target.matches()),count:target.counts().matches};
      }finally{source.close();target.close();}
    },Object.assign(createData(),{demo:{...createData().demo,version:'V3-deck-test'},arenas:[{
      id:'ruins',name:'Ruins',subtitle:'Test',image:'test.png',source:'fixture',element:'NONE',elementBonus:0,homeCharacters:[],homeAttack:0,homeDefense:0
    }]}));
    assert.deepEqual(result.restoredMatches,result.originalMatches);
    assert.deepEqual(result.restoredResults,result.originalResults);
    assert.equal(result.rejectedSave,true);assert.equal(result.rejectedImport,true);assert.equal(result.unchanged,true);assert.equal(result.count,2);
    checks.push('Isolated IndexedDB archives preserve legacy and strict matches/results; forged strict imports are atomic');
    console.log('PASS '+checks.at(-1));
  }finally{await browser.close();}
}
databaseRegression().then(()=>{
  console.log(JSON.stringify({ok:true,checks:checks.length,presets:presetReport},null,2));
}).catch(error=>{console.error(error);process.exitCode=1;});
