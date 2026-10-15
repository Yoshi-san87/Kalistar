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

test('collection glass surrounds only the card, with an independent readable plinth',()=>{
  const css=read('collection-binder.css'),mobile=read('mobile.css');
  const rim=css.match(/\.cb-stack::before\s*\{([^}]+)\}/)[1];
  assert(!rim.includes('var(--cb-caption-height)'));
  assert(css.includes('--cb-sleeve-gap: 4px'));
  assert(rim.includes('inset: -4px'));
  assert(!rim.includes('bottom: calc('));
  assert(rim.includes('pointer-events: none'));
  assert(rim.includes('border-radius: 6px'));
  assert(!rim.includes('backdrop-filter'));
  assert(css.includes('.cb-pocket:is(:hover,:focus-within)'));
  const pedestal=read('collection-pedestal.css');
  for(const sheet of [css,mobile]){
    assert(sheet.includes('--cb-card-gutter: 24px'));
    assert(sheet.includes('min(calc(100cqw - var(--cb-card-gutter))'));
  }
  assert(pedestal.includes('width:min(calc(var(--cb-card-width) + var(--cb-card-gutter)),100%)'));
  assert(!css.includes('background: #ead9b9f2'));
  for(const sheet of [css,mobile,read('positions.css')])assert(!/\.cb-caption|\.cb-copy-count|\.cb-version-count|\.cb-pocket-positions|--cb-caption-height\s*:/.test(sheet),'legacy plinth rules removed, not overridden');
  assert(css.includes('.cb-page *, .cb-page *::before, .cb-page *::after { animation: none !important; transition: none !important;'));
});

test('collection pedestal renders real faction media and separate accessible counters',()=>{
  const Binder=require('./collection-binder.js'),Positions=require('./positions.js');
  const media=globalThis.KalistarCardMedia,positions=globalThis.KalistarPositions;
  globalThis.KalistarCardMedia={image:()=> 'fixture-card.png'};globalThis.KalistarPositions=Positions;
  try{
    const card={id:'49998001',characterId:'49998001',name:'FIXTURE',title:'One',faction:'Chroma',race:'ROBOT',element:'NONE',positions:[3,4]};
    const data={cards:[card,{...card,id:'49998002',title:'Two',faction:'Niveria'}],elements:{}};
    const view=Binder.create({data,getOwned:()=>[{}],getFavorites:()=>new Set([card.id])}),html=view.render();
    assert(html.includes('cb-caption cb-pedestal'));
    assert(html.includes('data-faction="Chroma"'));
    assert(html.includes('shared/factions/Chroma.png'));
    assert(html.includes('assets/navigation/collection-v1.webp'));
    assert(html.includes('cb-plinth-art'));
    const plinth=html.split('class="cb-plinth-art"')[1].split('<span class="cb-faction-watermark"')[0];
    assert.equal((plinth.match(/<span>/g)||[]).length,12,'three columns with three painted cells each');
    assert(html.includes('cb-version-count cb-flip-control'));
    assert(html.includes('data-lucide="rotate-3d"'));
    assert(html.includes('<b>2</b>'));
    assert(html.includes('aria-label="Faction : Chroma"'));
    assert(html.includes('aria-label="1 exemplaire"'));
    assert.match(html,/<span class="cb-copy-count cb-card-copies"[^>]*>[\s\S]*?<b>1<\/b><\/span>\s+<\/div>\s+<div class="cb-caption cb-pedestal"/,'copies sit in the card stack, not in its plinth');
    assert(!html.split('class="cb-caption cb-pedestal"')[1].split('</article>')[0].includes('cb-copy-count'));
    assert(html.includes('data-binder-action="cycle-version"'));
    assert(html.includes('aria-pressed="true"'));
    assert(!html.includes('data-lucide="copy"'));
    assert.equal((html.match(/cb-faction-watermark/g)||[]).length,1,'one current-version faction watermark per grouped character');
    assert(!html.includes('cb-faction-crest'));
    assert.equal((html.match(/cb-card-favorite/g)||[]).length,1,'favorite moves to the card without duplication');
    assert.match(html,/<\/button>\s+<button[^>]*class="cb-icon cb-card-favorite"/,'favorite is a sibling of the reader button, never nested');
    assert(!html.split('class="cb-caption cb-pedestal"')[1].split('</article>')[0].includes('data-binder-action="favorite"'));
    assert.equal(data.cards[0].faction,'Chroma');view.destroy();
    const single=Binder.create({data:{cards:[card],elements:{}},getOwned:()=>[{}]});
    const one=single.render();assert(!one.includes('cb-flip-control'));
    assert(!one.includes('cb-version-count'));assert(!one.includes('has-versions'));single.destroy();
  }finally{globalThis.KalistarCardMedia=media;globalThis.KalistarPositions=positions;}
});

test('pedestal width queries are card-relative and do not alter cards or run idle animations',()=>{
  const css=read('collection-pedestal.css'),html=read('index.html');
  assert(html.indexOf('href="collection-pedestal.css"')>html.indexOf('href="positions.css"'));
  for(const text of ['container:collection-plinth / inline-size','@container collection-plinth','prefers-reduced-motion','forced-colors','pointer-events:none','button:focus-visible'])assert(css.includes(text),text);
  assert(!/@keyframes|setInterval|backdrop-filter|\.slot-card|\.kdb-slot/.test(css));
  assert(css.includes('collection-pedestal-v2.webp'));
  assert(css.includes('.cb-flip-control[aria-busy=true] .cb-flip-symbol'));
  assert(css.includes('transform:none !important'));
  assert(css.includes('grid-template-rows:10px minmax(0,1fr) 10px'));
  const pedestal=css.match(/\.cb-caption\.cb-pedestal\s*\{([^}]+)\}/)[1];
  const padding=pedestal.match(/padding:(\d+)px (\d+)px (\d+)px/).slice(1).map(Number);
  assert.deepEqual(padding,[4,8,12]);
  assert.equal((padding[0]+64-padding[2])/2,(64-8)/2,'content is centered on the painted face, which rises 8px above the box');
  assert(css.includes('grid-template-columns:var(--cb-control-rail) minmax(0,1fr) var(--cb-control-rail)'),'equal control rails keep every title on the card axis');
  assert(!/\.has-versions\s*\{[^}]*grid-template/.test(css),'editions never change the title grid');
  assert(css.includes('inset:-8px 0 0'));
  assert(css.includes('z-index:4'));
  const title=css.match(/\.cb-caption-title\s*\{([^}]+)\}/)[1];
  for(const text of ['border:0','background:none','box-shadow:none'])assert(title.includes(text),text);
  assert(!css.includes('cb-faction-crest'));
  assert(css.includes('opacity:.13'));
  assert(css.includes('overflow:hidden'));
  assert(css.includes('mix-blend-mode:screen'));
  assert(css.includes('grid-column:2; grid-row:1'));
  assert(css.includes('grid-column:1; grid-row:1'));
  assert(css.includes('width:44px; height:44px'));
  assert(css.includes('--cb-name-size:20px'));
  assert(read('collection-binder.js').includes('function fitPocketNames()'));
  assert(css.includes('.cb-stack > .cb-card-copies'));
  assert(css.includes('left:4px; bottom:4px'));
  const dial=css.match(/\.cb-page \.cb-pedestal \.cb-flip-control\s*\{([^}]+)\}/)[1];
  for(const text of ['border:0','background:none','box-shadow:none'])assert(dial.includes(text),'no separate button plate: '+text);
  assert(css.includes('.cb-flip-control::before'));
});
