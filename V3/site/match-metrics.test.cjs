'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const metrics=require('./match-metrics.js');
test('Six match metrics use one shared icon vocabulary and grant counters',()=>{
  assert.deepEqual(metrics.core.map(m=>[m.key,m.icon]),[['kills','skull'],['holds','ban'],['attack','sword'],['defense','shield'],['clovers','clover'],['hearts','heart']]);
  assert.ok(metrics.extras.some(m=>m.key==='luckUsed'));
  assert.ok(metrics.extras.some(m=>m.key==='reraises'));
});
test('Duel strip reads the selected instance, never substitutes grants with uses',()=>{
  const u={uid:'0-7',kills:2,holds:3,attack:1724,defense:2037,clovers:4,hearts:5,physical:6,guards:7,buff:60,ward:60,luckUsed:11,reraises:12};
  const before=structuredClone(u),html=metrics.strip(u);
  assert.match(html,/data-match-unit="0-7"/);
  assert.match(html,/data-stat-scope="match"/);
  for(const [key,value] of [['kills',2],['holds',3],['clovers',4],['hearts',5],['physical',360],['guards',420]]){
    assert.match(html,new RegExp('data-metric="'+key+'"[^]*?<dd>'+value+'</dd>'));
  }
  assert.doesNotMatch(html,/<dd>(11|12|60)<\/dd>/);
  assert.deepEqual([...html.matchAll(/data-metric="([^"]+)"/g)].map(m=>m[1]),['kills','holds','attack','defense','clovers','hearts','physical','guards']);
  assert.equal((html.match(/class="match-metric-plus"/g)||[]).length,2);
  for(const [key,icon] of [['physical','sword'],['guards','shield']])assert.match(html,new RegExp('data-metric="'+key+'"[^]*?<dt><span class="match-metric-plus" aria-hidden="true">\\+</span><i data-lucide="'+icon+'"'));
  assert.deepEqual(u,before);
});
test('Missing telemetry and partial histories are explicit and HTML is escaped',()=>{
  assert.equal(metrics.strip(null),'');
  const html=metrics.strip({uid:'"<unsafe>'},{partial:true,fromRound:17});
  assert.match(html,/Match partiel/);assert.match(html,/depuis E17/);
  assert.match(html,/&quot;&lt;unsafe&gt;/);assert.doesNotMatch(html,/<unsafe>/);
  assert.equal((html.match(/<dd>-<\/dd>/g)||[]).length,8);
});
test('Physical grants show 60-point totals for the giver, accumulate to 120 and exclude refreshes',()=>{
  const {createEngine}=require('./engine.js'),{numericData}=require('./engine-fixtures.cjs');
  for(const side of [0,1])for(const [face,key,grant] of [['buff_atk','physical','grantPhysical'],['guard','guards','grantGuard']]){
    const data=numericData(),E=createEngine(data),s=E.newGame(data.decks.player,data.decks.enemy,{mode:'local',seed:'PHYSICAL-METRICS'});
    E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);s.turn=side;
    const giver=s.players[side].board[0],receiver=s.players[side].board[1];E.card(giver).atk[0]=face;
    const cast=(recipient=receiver.uid)=>{E.lock(s,0,0);E.rollAttack(s,6);E[grant](s,recipient);};
    const renderedTotal=uid=>{const stats=E.matchStats(s);return metrics.strip(stats.units.find(u=>u.uid===uid));};
    cast();assert.equal(receiver[key==='physical'?'physical':'ward'],60);
    assert.match(renderedTotal(giver.uid),new RegExp('data-metric="'+key+'"[^]*?<dd>60</dd>'));
    assert.match(renderedTotal(receiver.uid),new RegExp('data-metric="'+key+'"[^]*?<dd>0</dd>'));
    E.next(s);s.turn=side;cast();assert.match(renderedTotal(giver.uid),new RegExp('data-metric="'+key+'"[^]*?<dd>60</dd>'));
    assert.equal(E.matchStats(s).units.find(u=>u.uid===giver.uid).refreshes,1);
    E.next(s);s.turn=side;cast(giver.uid);
    assert.match(renderedTotal(giver.uid),new RegExp('data-metric="'+key+'"[^]*?<dd>120</dd>'));
    assert.equal(E.matchStats(s).units.find(u=>u.uid===giver.uid)[key],2);
    assert.deepEqual(E.matchStats(E.restoreGame(s)),E.matchStats(s));
  }
});
