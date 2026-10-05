'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'turn-timeline.css'),'utf8'),app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
test('timeline reuses Kalistar materials, display font and the existing rainbow crystal',()=>{
  for(const token of ['var(--kui-border)','var(--kui-copper)','var(--kui-energy)','var(--kui-danger)','var(--kalistar-display)'])assert(css.includes(token),token);
  for(const file of ['assets/ui/collection-reader-grimoire-v1.png','assets/navigation/kalistel-rainbow-v1.webp']){
    assert(css.includes(file));assert(fs.existsSync(path.join(__dirname,file)));
  }
  assert(css.includes('clip-path:polygon('));assert(css.includes('.turn-timeline li.is-resolved svg{fill:none;'));
});
test('phone keeps five full-width steps and its existing 34px reserved rail',()=>{
  assert(css.includes('padding-top:34px'));assert(css.includes('height:34px;min-height:34px'));
  assert(css.includes('flex:1 1 0;min-width:0;width:auto'));assert(css.includes('clip-path:inset(50%)'));assert(css.includes('.tt-mode{display:none;}'));
  assert(app.includes('const steps=E.turnPreview(game)'));assert(app.includes('aria-current="step"'));assert(app.includes('role="status"'));
});
test('the current crystal is presentation-only and settles with Reduced Motion',()=>{
  assert(css.includes('pointer-events:none'));assert(css.includes('@keyframes tt-crystal-breath'));
  assert(css.includes('.turn-timeline li.is-resolved::after{animation:none;}'));
  assert(css.includes('@media(prefers-reduced-motion:reduce){.turn-timeline li{transition:none;}.turn-timeline li.is-current::after{animation:none;}}'));
});
