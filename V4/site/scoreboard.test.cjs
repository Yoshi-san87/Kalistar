'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const css=read('scoreboard.css'),app=read('app.js');
test('scoreboard uses the shared Kalistar frame, font and approved materials',()=>{
  for(const token of ['var(--kui-edge)','var(--kui-energy)','var(--kui-danger)','var(--kalistar-display)','clip-path:polygon('])assert(css.includes(token));
  for(const file of ['assets/ui/collection-reader-grimoire-v1.png','assets/navigation/kalistel-rainbow-v1.webp']){
    assert((css+app).includes(file));assert(fs.existsSync(path.join(__dirname,file)));
  }
  const html=read('index.html');assert(html.indexOf('scoreboard.css')>html.indexOf('ui-system.css'));
});
test('scores remain actual opposing casualties with an accessible named opponent',()=>{
  assert(app.includes('const score=[game.players[1].dead.length,game.players[0].dead.length]'));
  assert(app.includes('class="match-scoreboard" role="group" aria-label="Score du match : Joueur 1 ${score[0]}, ${opponent} ${score[1]}"'));
  assert(app.includes('data-kills="0">${score[0]}'));assert(app.includes('data-kills="1">${score[1]}'));
  assert(app.includes('class="score-seal" aria-hidden="true"'));
});
test('the phone retains a compact 110px scoreboard below the timeline',()=>{
  assert(css.includes('width:110px;height:48px;min-height:48px'));
  assert(css.includes('.has-turn-timeline .arena-toolbar .match-scoreboard{top:46px;}'));
  assert(css.includes('font-variant-numeric:tabular-nums'));assert(!css.includes('animation:'));
});
test('Maintenant is removed without losing the current-turn status announcement',()=>{
  const render=app.slice(app.indexOf('function turnTimeline()'),app.indexOf('function weaponMatchupGrid('));
  assert(!render.includes('Maintenant'));assert(render.includes('role="status" aria-label="${current}"'));
  assert(render.includes('aria-current="step"'));assert(render.includes("?'Renforts':game.phase==='result'?'Résolu':''"));
});
