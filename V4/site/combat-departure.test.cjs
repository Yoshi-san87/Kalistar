'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Departure=require('./combat-departure.js'),Audio=require('./arena-audio.js');
const EFactory=require('./engine.js'),Team=require('./team-composition.js');
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
test('element and weapon families choose deliberate disappearance styles',()=>{
  const elements=Audio.elements.map(element=>Departure.profileFor({magic:true,element}));
  assert.equal(new Set(elements.map(p=>p.family)).size,11);
  assert(elements.every(p=>p.duration<=940&&/^#[0-9a-f]{6}$/i.test(p.color)));
  for(const [weapon,family]of [['Hache','shatter'],['Poing','shatter'],['Arc','pierce'],['Lance','pierce'],['Instrument','aether'],['Bâton','aether'],['Épée','cut']])assert.equal(Departure.profileFor({weapon}).family,family);
});
test('real resolver deltas find only new eliminations, not dodge, Reraise, reload or old deaths; no state mutation',async()=>{
  const data=await catalogue,E=EFactory.createEngine(data),team=Team.create(E).fromPreset({name:'Departure QA',cards:data.decks.player});
  let kills=0,reraise=0,dodge=0,mort=0;
  for(let seed=0;seed<25;seed++){
    const s=E.newGame(team,team,{seed:'DEPARTURE-'+seed,mode:'local',turnOrder:'ABBA',kalistel:false});
    for(let i=0;i<3000&&s.phase!=='over';i++){
      const before=E.clone(s);step(E,s);E.assertState(s);
      const saved=JSON.stringify(s),previous=JSON.stringify(before),changed=Departure.changed(before,s);
      const delta=s.players.reduce((sum,p,side)=>sum+p.dead.filter(u=>!before.players[side].dead.some(old=>old.uid===u.uid)).length,0);
      assert.equal(changed.length,delta);for(const row of changed)assert.equal(before.players[row.side].board[row.slot].uid,row.uid);
      if(delta){kills+=delta;if(s.duel?.attackValue==='death')mort++;}
      if(s.duel?.reraised&&!before.duel?.reraised){reraise++;assert.equal(changed.length,0);}
      if(s.duel?.defenseValue==='dodge'&&before.phase==='defense'){dodge++;assert.equal(changed.length,0);}
      assert.deepEqual(Departure.changed(s,E.clone(s)),[]);assert.equal(JSON.stringify(s),saved);assert.equal(JSON.stringify(before),previous);
    }
  }
  const deathData=structuredClone(data);for(const c of deathData.cards){c.atk=Array(6).fill('death');c.defense=Array(6).fill(1);c.magic=[];c.barriers=[];}
  const DeathE=EFactory.createEngine(deathData),deathTeam=Team.create(DeathE).fromPreset({name:'Mort QA',cards:deathData.decks.player}),s=DeathE.newGame(deathTeam,deathTeam,{seed:'CERTAIN-DEATH',mode:'local',turnOrder:'ABBA',kalistel:false});
  DeathE.rollInitiative(s,[6,1]);DeathE.lock(s,0,0);DeathE.rollAttack(s);const before=DeathE.clone(s);DeathE.rollDefense(s);DeathE.assertState(s);
  assert.equal(s.duel.attackValue,'death');assert.equal(Departure.changed(before,s).length,1);mort++;
  assert(kills>100&&reraise>0&&dodge>0&&mort>0,JSON.stringify({kills,reraise,dodge,mort}));
  assert.deepEqual(Departure.changed({matchId:'old'},{matchId:'new'}),[]);
});
test('one departure sound per elimination batch, no duplicate defeat impact, and Reraise stays alive',async()=>{
  const calls=[],departures=[],window={KalistarDeparture:{changed:Departure.changed,play:async options=>departures.push(options)},KALISTAR_ARENA_AUDIO:{play:(name,options)=>calls.push({name,options})}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'combat-effects.js'),'utf8'),{window,document:{querySelector:()=>null},setTimeout,clearTimeout});
  const unit={uid:'1-0'},before={matchId:'qa',phase:'defense',duel:{},players:[{board:[],dead:[]},{board:[unit],dead:[]}]};
  const after=structuredClone(before);after.phase='result';after.duel={side:0,targetSlot:0,attackValue:'death',magic:true};after.players[1].board[0]=null;after.players[1].dead.push(unit);
  await window.KalistarCombat.play({before,after,element:'NECRO',reduced:true,signal:new AbortController().signal});
  assert.equal(calls.filter(c=>c.name==='departure').length,1);assert.equal(calls.filter(c=>c.name==='defeat').length,0);assert.equal(departures.length,1);
  calls.length=0;departures.length=0;after.players[1].board[0]=unit;after.players[1].dead=[];after.duel.reraised=true;
  await window.KalistarCombat.play({before,after,reduced:true,signal:new AbortController().signal});
  assert.equal(calls.filter(c=>c.name==='departure').length,0);assert.equal(departures.length,0);
});
test('calibrated sample levels bring impacts down without changing saved sliders',()=>{
  const bank=require('../revisions/2026-11-17-arena-jrpg/exports.json');
  const levels=bank.items.map(i=>({key:i.key,output:i.rms*Audio.levels[i.key]*Audio.MIX_TRIM*.3}));
  assert(levels.every(i=>i.output<=.015),JSON.stringify(levels));
  const death=require('../revisions/2026-11-20-arena-direction/sound.json');
  assert(death.bytes<30000&&death.durationSeconds<=1.6&&death.peak<.95);
});
