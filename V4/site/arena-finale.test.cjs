'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Finale=require('./arena-finale.js'),Trophies=require('./trophies.js'),{createEngine}=require('./engine.js'),Team=require('./team-composition.js');
const catalogue=require('../atelier/game-catalog.cjs').buildCatalog();
function step(E,s){
  if(s.phase==='initiative')E.rollInitiative(s);
  else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
  else if(s.phase==='attack')E.rollAttack(s);
  else if(s.phase==='kalistel')E.acceptAttack(s);
  else if(s.phase==='defense')E.rollDefense(s);
  else if(s.phase==='result')E.next(s);
  else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
  else{const k={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];E['grant'+k](s,E['ai'+k+'Choice'](s));}
}
async function fixture(seed,numeric=false){
  const data=structuredClone(await catalogue);
  if(numeric)for(const c of data.cards){c.atk=Array(6).fill(1);c.defense=Array(6).fill(900);c.magic=[];c.barriers=[];}
  const E=createEngine(data),team=Team.create(E).fromPreset({name:'Finale QA',cards:data.decks.player});
  const s=E.newGame(team,team,{seed,mode:'local',turnOrder:'ABBA',kalistel:false});return {data,E,s};
}
test('last-result probe follows the resolver and never mutates RNG, turns, journal or equipment across 60 matches',async()=>{
  let terminal=0,ordinary=0;
  for(let seed=0;seed<60;seed++){
    const {E,s}=await fixture('FINALE-'+seed);
    for(let i=0;i<4000&&s.phase!=='over';i++){
      if(s.phase==='result'){
        const before=JSON.stringify(s),expected=E.clone(s);E.next(expected);
        assert.equal(Finale.endsAfterResult(s,E),expected.phase==='over');assert.equal(JSON.stringify(s),before);
        expected.phase==='over'?terminal++:ordinary++;
      }else assert.equal(Finale.endsAfterResult(s,E),false);
      step(E,s);E.assertState(s);
    }
    assert.equal(s.phase,'over');assert.deepEqual(E.restoreGame(s),s);
    const scene=Finale.describe(s,E),awards=Trophies.awards(E.matchStats(s));
    assert.deepEqual(Object.fromEntries(scene.laureates.map(u=>[u.uid,u.awards])),awards);
    assert.equal(scene.laureates.filter(u=>u.mvp).length,1);
    assert(scene.laureates.every(u=>u.participated));
  }
  assert.equal(terminal,60);assert(ordinary>1000);
});
test('replacement remains a next turn, not a terminal ceremony',async()=>{
  const {E,s}=await fixture('REPLACEMENT');let result;
  for(let i=0;i<4000&&s.phase!=='over';i++){
    if(s.phase==='result'){const probe=E.clone(s);E.next(probe);if(probe.phase==='replace'){result=E.clone(s);break;}}
    step(E,s);
  }
  assert(result);assert.equal(Finale.endsAfterResult(result,E),false);
});
test('pending relic recipient must be resolved before probing or finishing',()=>{
  let cloned=false;assert.equal(Finale.endsAfterResult({phase:'result'},{equipmentChoice:()=>({sourceUid:'0-1'}),clone:()=>{cloned=true;}}),false);assert(!cloned);
});
test('200 exchange draw is detected on the final result and awards no zero-score trophies',async()=>{
  const {E,s}=await fixture('FINALE-DRAW',true);
  while(!(s.phase==='result'&&s.round===200))step(E,s);
  assert(Finale.endsAfterResult(s,E));step(E,s);assert.equal(s.winner,'draw');
  const scene=Finale.describe(s,E);assert(scene.laureates.length);assert(scene.laureates.every(u=>!u.awards.includes('killer')));
});
test('partial archives get no fabricated trophy; ceremony preserves identities, escaping and real card media',async()=>{
  const {E,s}=await fixture('FINALE-PARTIAL');while(s.phase!=='over')step(E,s);
  const before=JSON.stringify(s),html=Finale.render(s,E,{image:c=>'qa/'+c.id+'.png',arenaName:'Arena <QA>'});
  assert(html.includes('Arena &lt;QA&gt;'));assert(html.includes('data-action="match-stats"'));assert(html.includes('data-action="finale-board"'));
  for(const u of Finale.describe(s,E).laureates){assert(html.includes('data-uid="'+u.uid+'"'));assert(html.includes('qa/'+u.cardId+'.png'));}
  assert.equal(JSON.stringify(s),before);s.match.partial=true;assert.deepEqual(Finale.describe(s,E).laureates,[]);
  assert(Finale.render(s,E,{image:c=>c.id}).includes('Historique partiel'));assert.equal(Finale.describe({...s,phase:'result'},E),null);
});
test('native materials, motion preference, cleanup and manual final action are integrated',()=>{
  const read=n=>fs.readFileSync(path.join(__dirname,n),'utf8'),css=read('arena-finale.css'),app=read('app.js'),js=read('arena-finale.js');
  assert(read('boot.js').includes("'arena-finale.js'"));assert(read('index.html').includes('arena-finale.css'));
  assert(app.includes("terminal?'Duel terminé':'Tour suivant'"));assert(!app.includes("ui.endShown=true;showMatchStats(game)"));
  assert(css.includes('prefers-reduced-motion'));assert(css.includes('var(--kalistar-display)'));assert(js.includes('observer?.disconnect()'));
  assert(!/setInterval|setTimeout|requestAnimationFrame|canvas|confetti/i.test(js));
});
