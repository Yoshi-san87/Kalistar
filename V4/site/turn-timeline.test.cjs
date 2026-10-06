'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'turn-timeline.css'),'utf8'),app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
test('timeline reuses Kalistar materials, display font and the existing rainbow crystal',()=>{
  for(const token of ['var(--kui-border)','var(--kui-copper)','var(--kui-energy)','var(--kui-danger)','var(--kalistar-display)'])assert(css.includes(token),token);
  for(const file of ['assets/ui/collection-reader-grimoire-v1.webp','assets/navigation/kalistel-rainbow-v1.webp']){
    assert(css.includes(file));assert(fs.existsSync(path.join(__dirname,file)));
  }
  assert(css.includes('.tt-dot'));assert(css.includes('fill:none;stroke:var(--kui-gold)'));
});
test('phone keeps five full-width steps and its existing 34px reserved rail',()=>{
  assert(css.includes('padding-top:34px'));assert(css.includes('height:34px;min-height:34px'));
  assert(css.includes('flex:1 1 0;min-width:0;'));assert(css.includes('clip-path:inset(50%)'));assert(css.includes('li[data-phone="false"]{display:none;}'));
  assert(css.includes('box-shadow:inset 1px 0 #a5816233'));assert(!css.includes('border-left:1px'));
  assert(app.includes('KalistarCombatTimeline.view(game)'));assert(app.includes('aria-current="step"'));assert(app.includes('role="status"'));
  const render=app.slice(app.indexOf('function turnTimeline()'),app.indexOf('function weaponMatchupGrid('));
  assert(!render.includes('ABBA'));assert(!render.includes('Maintenant'));assert(render.includes('data-combat-round'));
});
test('the current crystal is presentation-only and settles with Reduced Motion',()=>{
  assert(css.includes('pointer-events:none'));assert(css.includes('@keyframes tt-crystal-breath'));
  assert(css.includes('.is-resolved .tt-dot::after{display:none;}'));
  assert(css.includes('@media(prefers-reduced-motion:reduce){.is-current .tt-dot::after{animation:none;}}'));
});
