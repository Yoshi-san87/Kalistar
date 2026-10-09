'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Battle=require('./battle-report.js'),Timeline=require('./combat-timeline.js'),{createEngine}=require('./engine.js'),Team=require('./team-composition.js');
const catalogue=require('../atelier/game-catalog.cjs').buildCatalog();
const units=side=>Array.from({length:10},(_,i)=>({uid:side+'-'+i,cardId:'same-model',instanceId:side+'-copy-'+i}));
function state(events=[],partial=false){return {phase:'over',round:12,turn:1,mode:'local',initiative:{first:0},players:[0,1].map(side=>({board:units(side).slice(0,5),reserve:units(side).slice(5),dead:[]})),match:{fromRound:partial?4:1,partial,events}};}
const event=(round,side,kill=true,extra={})=>({round,attacker:side+'-0',target:(1-side)+'-1',kill,attack:184,defense:150,magic:false,...extra});
const options={player:side=>'Team '+side,name:u=>'<'+u.uid+'>',identity:(u,role)=>`<button class="${role}" data-uid="${u.uid}">${u.instanceId}</button>`};
function step(E,s){
  if(s.phase==='initiative')E.rollInitiative(s);else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
  else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='kalistel')E.acceptAttack(s);else if(s.phase==='defense')E.rollDefense(s);
  else if(s.phase==='result')E.next(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
  else{const k={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];E['grant'+k](s,E['ai'+k+'Choice'](s));}
}
test('discrete cumulative scores retain exact turns, ABBA rounds, side and instance identity',()=>{
  const s=state([event(2,1),event(3,1),event(4,0,false,{reraise:true}),event(8,0)]),before=JSON.stringify(s),m=Battle.model(s);
  assert.deepEqual(m.scores,[1,2]);assert.deepEqual(m.kills.map(k=>k.scores),[[0,1],[0,2],[1,2]]);
  assert.deepEqual(m.kills.map(k=>[k.turn,k.round]),[[2,2],[3,2],[8,5]]);
  assert.equal(m.kills[0].attacker.instanceId,'1-copy-0');assert.equal(m.kills[2].attacker.instanceId,'0-copy-0');
  assert.equal(m.kills[0].attacker.cardId,m.kills[2].attacker.cardId);assert.equal(JSON.stringify(s),before);
  const g=Battle.geometry(m);assert.equal(g.x(2),250);assert.equal(g.x(8),1000);assert.equal(g.y(10),0);assert.equal(g.y(0),300);
  assert.match(g.paths[1],/^M0 300 H250V270 H375V240 H1000V240$/);
});
test('paths stay flat through supports, blocks, dodges and Reraise; finish extends past the last kill',()=>{
  const m=Battle.model(state([event(1,0,false,{support:'mana'}),event(4,0),event(11,1,false,{hold:true})]));
  assert.equal(m.kills.length,1);assert.equal(m.last,11);assert.equal(m.series[0].at(-1).value,1);
  assert.equal(Battle.model(state([event(1,0,false,{dodge:true}),event(2,1,false,{reraise:true})])).kills.length,0);
});
test('partial and missing history never reconstruct deaths or invent preceding kill times',()=>{
  const s=state([event(5,0)],true);s.players[1].dead=[s.players[1].reserve.pop()];
  const m=Battle.model(s);assert.equal(m.first,3);assert.deepEqual(m.scores,[1,0]);assert(m.partial);
  assert(Battle.render(s,options).includes('Éliminations consignées'));
  delete s.match;const missing=Battle.model(s);assert.deepEqual(missing.scores,[0,0]);assert(!missing.available);
  assert(Battle.render(s,options).includes('n’a pas été conservé'));assert.equal(missing.kills.length,0);
});
test('render clamps selection, escapes names, provides numeric scores, endpoints and accessible controls',()=>{
  const s=state([event(2,1),event(8,0,true,{magic:true})]),html=Battle.render(s,{...options,selected:99});
  assert(html.includes('data-battle-selection="1"'));assert(html.includes('&lt;0-0&gt; élimine &lt;1-1&gt;'));
  assert(html.includes('Attaque magique'));assert(html.includes('184 <i>/</i> 150'));assert(html.includes('Round 5'));
  assert(html.includes('aria-label="Élimination suivante" disabled'));assert(html.includes('tabindex="0"'));
  assert.equal((html.match(/class="battle-point /g)||[]).length,2);
  assert(Battle.render(s,{...options,selected:-3}).includes('data-battle-selection="0"'));
});
test('legacy alternating turns and the second captain opening use the existing timeline semantics',()=>{
  const s=state([event(3,0)]);delete s.initiative;s.turn=1;s.round=12;
  assert.equal(Battle.model(s).kills[0].round,3);
  s.initiative={first:1};s.match.events=[event(3,0)];assert.equal(Battle.model(s).kills[0].round,Timeline.position(s,3).round);
});
test('a direct elimination without numeric formula is not presented as a physical 0/0 attack',()=>{
  const html=Battle.render(state([event(2,1,true,{attack:0,defense:0})]),options);
  assert(html.includes('Élimination directe'));assert(!html.includes('Attaque physique'));assert(!html.includes('0 <i>/</i> 0'));
});
test('a 200-turn draw without kills keeps both baselines and the full elapsed span',async()=>{
  const data=structuredClone(await catalogue);for(const c of data.cards){c.atk=Array(6).fill(1);c.defense=Array(6).fill(900);c.magic=[];c.barriers=[];}
  const E=createEngine(data),team=Team.create(E).fromPreset({name:'Draw QA',cards:data.decks.player});
  const s=E.newGame(team,team,{seed:'BATTLE-DRAW',mode:'local',turnOrder:'ABBA',kalistel:false});
  while(s.phase!=='over')step(E,s);
  const m=Battle.model(s);assert.equal(s.winner,'draw');assert.equal(m.last,200);assert.equal(m.kills.length,0);assert.deepEqual(m.scores,[0,0]);
  assert.deepEqual(Battle.geometry(m).paths,['M0 300 H1000V300','M0 300 H1000V300']);
});
test('60 real matches agree with engine stats, final score and restore without modifying state or RNG',async()=>{
  const data=await catalogue,E=createEngine(data),team=Team.create(E).fromPreset({name:'Battle QA',cards:data.decks.player});
  let kills=0,blocks=0,saves=0;
  for(let seed=0;seed<60;seed++){
    const s=E.newGame(team,team,{seed:'BATTLE-'+seed,mode:'local',turnOrder:'ABBA',kalistel:false});
    for(let i=0;i<4000&&s.phase!=='over';i++){step(E,s);E.assertState(s);}
    assert.equal(s.phase,'over');const before=JSON.stringify(s),m=Battle.model(s),stats=E.matchStats(s);
    assert.deepEqual(m.scores,stats.teams.map(t=>t.kills));assert.equal(m.kills.length,s.match.events.filter(e=>e.kill).length);
    assert(m.scores.every(n=>n<=10));assert(m.kills.every(k=>k.side===Number(k.attacker.uid[0])&&k.target.side!==k.side));
    assert.deepEqual(Battle.model(E.restoreGame(s)),m);assert.equal(JSON.stringify(s),before);
    kills+=m.kills.length;blocks+=s.match.events.filter(e=>e.hold).length;saves+=s.match.events.filter(e=>e.reraise).length;
  }
  assert(kills>500);assert(blocks>500);assert(saves>0);
});
test('view has no persistent render loop, uses the existing shell and respects Reduced Motion',()=>{
  const read=n=>fs.readFileSync(path.join(__dirname,n),'utf8'),js=read('battle-report.js'),css=read('battle-report.css');
  assert(!/setInterval|setTimeout|requestAnimationFrame|addEventListener|canvas/i.test(js));
  assert(css.includes('prefers-reduced-motion'));assert(read('index.html').includes('battle-report.css'));assert(read('boot.js').includes("'battle-report.js'"));
  assert(read('app.js').includes("action==='stats-battle'"));
});
