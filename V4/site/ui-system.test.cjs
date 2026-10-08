'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
test('shared UI is loaded once before views, without replacing the navigation or card rendering',()=>{
  assert.equal(read('boot.js').split("'ui-system.js'").length-1,1);
  assert(read('boot.js').indexOf("'ui-system.js'")<read('boot.js').indexOf("'app.js'"));
  assert.equal(read('index.html').split('href="ui-system.css"').length-1,1);
  assert(!/\.slot-card\s*\{|\.eq-rim\s*\{|\.kdb-slot-image\s*\{/.test(read('ui-system.css')));
});
test('interface colors keep readable text on both metal and manuscript',()=>{
  const light=hex=>{const n=hex.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return n[0]*.2126+n[1]*.7152+n[2]*.0722;};
  for(const [a,b] of [['f1eadc','132322'],['b6c3bd','0b1213'],['edcf8f','132322'],['24160f','ddd0b8'],['5c4836','ddd0b8']]){
    const values=[light(a),light(b)].sort((a,b)=>b-a);assert((values[0]+.05)/(values[1]+.05)>=4.5,a+' / '+b);
  }
});
test('progressive selects, keyboard state, Reduced Motion and high contrast stay explicit',()=>{
  const css=read('ui-system.css'),js=read('ui-system.js');
  for(const text of ['@supports (appearance:base-select)','(pointer:fine)',':focus-visible','aria-invalid','prefers-reduced-motion','forced-colors'])assert(css.includes(text),text);
  for(const text of ['AbortController','observer?.disconnect()','animation.cancel()','aria-describedby','pageshow','pagehide'])assert(js.includes(text),text);
  assert(!/localStorage|indexedDB|KalistarEngine|setInterval|innerHTML/.test(js));
});

test('collection sleeves attach readable metal labels without blocking card controls',()=>{
  const css=read('collection-binder.css'),mobile=read('mobile.css');
  const rim=css.match(/\.cb-stack::before\s*\{([^}]+)\}/)[1];
  assert(rim.includes('var(--cb-caption-height)'));
  assert(css.includes('--cb-sleeve-gap: 4px'));
  assert(rim.includes('bottom: calc(-1 * var(--cb-caption-height) - var(--cb-sleeve-gap));'));
  assert(rim.includes('pointer-events: none'));
  assert(rim.includes('border-radius: 6px'));
  assert(!rim.includes('backdrop-filter'));
  assert(css.includes('.cb-pocket:is(:hover,:focus-within)'));
  assert(css.includes('width: min(calc(var(--cb-card-width) + 8px),100%)'));
  assert(mobile.includes('width: min(calc(var(--cb-card-width) + 8px),100%)'));
  assert(css.includes('background-color: #101c1ff5'));
  assert(!css.includes('background: #ead9b9f2'));
  assert(css.includes('.cb-caption h2 { color: #f1eadc; text-shadow: none; }'));
  assert(css.includes('.cb-page *, .cb-page *::before, .cb-page *::after { animation: none !important; transition: none !important;'));
});
