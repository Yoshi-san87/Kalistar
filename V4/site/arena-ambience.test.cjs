'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {buildCatalog}=require('../atelier/game-catalog.cjs');
const {createEngine}=require('./engine.js');
(async()=>{
  const window={addEventListener(){}},media=()=>({matches:false,addEventListener(){}});
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'arena-ambience.js'),'utf8'),{window,matchMedia:media,document:{addEventListener(){}}});
  const api=window.KalistarAmbience,data=await buildCatalog(),e=createEngine(data);
  const base=e.newGame(data.decks.player,data.decks.enemy,{mode:'local',seed:'IMMERSION'});e.autoDeploy(base,0);e.autoDeploy(base,1);e.start(base);
  const native=e.next;let checks=0;
  e.next=probe=>{
    // The temporary result phase dispatches the existing resolver, without fabricating a duel or roll.
    for(const p of probe.players)assert.equal(p.board.filter(Boolean).length+p.reserve.length+p.dead.length,10);
    native(probe);e.assertState(probe);checks++;return probe;
  };
  function lone(state,side,reserves=true){
    const p=state.players[side];p.dead.push(...p.board.slice(1).filter(Boolean));p.board=p.board.map((u,i)=>i?null:u);
    if(!reserves){p.dead.push(...p.reserve);p.reserve=[];}return state;
  }
  function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const v of Object.values(value))freeze(v);}return value;}
  const cases=[
    [base,{last:[],imminent:[]}],
    [lone(e.clone(base),0),{last:[0],imminent:[]}],
    [lone(e.clone(base),0,false),{last:[0],imminent:[0]}],
    [lone(lone(e.clone(base),0,false),1,false),{last:[0,1],imminent:[0,1]}]
  ];
  for(const [state,expected] of cases){
    e.assertState(state);const before=JSON.stringify(state);freeze(state);
    assert.deepEqual(JSON.parse(JSON.stringify(api.stateFor(state,e))),expected);assert.equal(JSON.stringify(state),before);
  }
  for(let i=0;i<8;i++){
    const active=e.clone(cases[2][0]);active.rng+=i;e.lock(active,0,0);e.rollAttack(active);e.assertState(active);
    const before=JSON.stringify(active);assert.deepEqual(JSON.parse(JSON.stringify(api.stateFor(freeze(active),e))),{last:[0],imminent:[0]});assert.equal(JSON.stringify(active),before);
  }
  const ended=e.clone(cases[2][0]),p=ended.players[0];p.dead.push(...p.board.filter(Boolean));p.board=p.board.map(()=>null);ended.phase='result';e.next(ended);
  assert.deepEqual(JSON.parse(JSON.stringify(api.stateFor(ended,e))),{last:[],imminent:[]});
  for(const arena of data.arenas){const profile=api.profileFor(arena);assert.ok(profile.motions.length>=2&&profile.motions.length<=3);assert.ok(profile.count<=14);}
  assert.ok(checks>=5);console.log('PASS ambience profiles and engine-validated, immutable match-point probes; no live state or RNG changes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
