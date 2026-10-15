'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,file),'utf8'),css=read('arena-console-skin.css');
test('console uses shared materials after legacy arena chrome without changing board geometry',()=>{
  const html=read('index.html');
  assert(html.indexOf('arena-console-skin.css')>html.indexOf('ui-system.css'));
  for(const token of ['--kui-edge','--kui-ink','--kui-copper','--kui-text','--kalistar-display'])assert(css.includes(token));
  assert(css.includes('assets/ui/collection-reader-grimoire-v1.webp'));
  assert(css.includes('assets/navigation/kalistel-rainbow-v1.webp'));
  assert(!/--console-width|--die-row|--recap-row|grid-template|position:sticky|z-index:\s*\d/.test(css));
  assert(read('app.js').includes('<span class="console-inlay" aria-hidden="true"></span>'));
});
test('decorative animations follow current phase, pause under modals and respect Reduced Motion',()=>{
  assert(css.includes('[data-casting] .console-inlay::after'));
  assert(css.includes('[data-phase="result"] .console-inlay::after'));
  assert(css.includes('[data-acting-side="0"] .console-turn-light::before'));
  assert(css.includes('[data-acting-side="1"] .console-turn-light::before'));
  assert(css.includes('animation-play-state:paused'));
  assert(css.includes('@media(prefers-reduced-motion:reduce)'));
  const keyframes=css.slice(css.indexOf('@keyframes'));
  assert(!/\b(?:filter|box-shadow|width|left|top):/.test(keyframes.split('@media')[0]));
  assert(css.includes('pointer-events:none'));
});
