'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
test('shared UI is loaded once before views, without replacing the navigation or card rendering',()=>{
  assert.equal(read('boot.js').split("'ui-system.js'").length-1,1);
  assert(read('boot.js').indexOf("'ui-system.js'")<read('boot.js').indexOf("'app.js'"));
  assert.equal(read('index.html').split('href="ui-system.css"').length-1,1);
  assert(!/\.slot-card\s*\{|\.eq-rim\s*\{|\.kdb-slot-image\s*\{/.test(read('ui-system.css')));
});
test('shared interface tokens retain readable text contrast',()=>{
  const light=hex=>{const n=hex.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return n[0]*.2126+n[1]*.7152+n[2]*.0722;};
  const tokens=Object.fromEntries([...read('ui-system.css').match(/:root\s*\{([^}]+)\}/)[1].matchAll(/--kui-([\w-]+):\s*#([\da-f]{6});/gi)].map(m=>[m[1],m[2]]));
  for(const [foreground,background] of [['text','surface'],['muted','ink'],['gold','surface']]){
    const a=tokens[foreground],b=tokens[background];assert(a&&b,'declared contrast tokens');
    const values=[light(a),light(b)].sort((a,b)=>b-a);assert((values[0]+.05)/(values[1]+.05)>=4.5,a+' / '+b);
  }
});
test('progressive selects, keyboard state, Reduced Motion and high contrast stay explicit',()=>{
  const css=read('ui-system.css'),js=read('ui-system.js');
  for(const text of ['@supports (appearance:base-select)','(pointer:fine)',':focus-visible','aria-invalid','prefers-reduced-motion','forced-colors'])assert(css.includes(text),text);
  for(const text of ['AbortController','observer?.disconnect()','animation.cancel()','aria-describedby','pageshow','pagehide'])assert(js.includes(text),text);
  assert(!/localStorage|indexedDB|KalistarEngine|setInterval|innerHTML/.test(js));
});

test('collection owns its responsive gallery and reader without legacy book overrides',()=>{
  const css=read('collection-binder.css'),mobile=read('mobile.css'),ui=read('ui-system.css');
  assert.match(css,/\.cb-spread\s*\{[^}]*display:\s*grid/);
  assert.match(css,/grid-template-columns:\s*repeat\(/);
  assert.match(css,/\.cb-workbench\s*\{[^}]*overflow(?:-y)?:\s*(auto|scroll)/,'gallery can scroll vertically');
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/:focus-visible/);
  assert.doesNotMatch(css,/collection-reader-grimoire|\.cb-sheet|\.cb-spine/);
  assert.doesNotMatch(mobile,/\.cb-(?:sheet|spread|reader|reading|workbench|pocket|caption|pedestal)\b/,'collection responsive rules stay with their owner');
  assert.doesNotMatch(ui,/\.cb-reading\b|\.cb-versions\b/,'shared UI no longer applies manuscript colors to Collection');
  for(const file of ['statistics.css','weapons.css']){
    const sheet=read(file).replace(/\/\*[\s\S]*?\*\//g,'');
    assert.doesNotMatch(sheet,/\.cb-[\w-]+/,'Collection styles have a single owner, not '+file);
  }
  for(const selector of ['.cb-reading-tabs','.cb-profile','.cb-career','.cb-equipped'])assert(css.includes(selector),'Collection owns '+selector);
  assert.doesNotMatch(read('collection-binder.js'),/fitPocketNames|setInterval\s*\(/,'names wrap in CSS without an idle fitting loop');
});

test('collection pedestal renders real faction media and separate accessible counters',()=>{
  const Binder=require('./collection-binder.js'),Positions=require('./positions.js');
  const media=globalThis.KalistarCardMedia,positions=globalThis.KalistarPositions;
  globalThis.KalistarCardMedia={image:()=> 'fixture-card.png'};globalThis.KalistarPositions=Positions;
  try{
    const card={id:'49998001',characterId:'49998001',name:'FIXTURE',title:'One',faction:'Chroma',race:'ROBOT',element:'NONE',positions:[3,4]};
    const data={cards:[card,{...card,id:'49998002',title:'Two',faction:'Niveria'}],elements:{}};
    const before=JSON.stringify(data),requested=[];
    globalThis.KalistarCardMedia={image:c=>{requested.push(c.id);return 'fixture-'+c.id+'.png';}};
    const view=Binder.create({data,getOwned:()=>[{}],getFavorites:()=>new Set([card.id])}),html=view.render();
    assert(html.includes('cb-caption cb-pedestal'));
    assert(html.includes('data-faction="Chroma"'));
    assert(html.includes('shared/factions/Chroma.png'));
    assert(html.includes('assets/navigation/collection-v1.webp'));
    assert(!html.includes('cb-plinth-art'),'no sliced bitmap pedestal');
    assert(!html.includes('cb-sheet'),'pockets are not split into book leaves');
    assert.match(html,/class="cb-spread"[^>]*>\s*<article class="cb-pocket/);
    assert(html.includes('assets/back-obsidian-v1.webp'),'stacked variants use the common back');
    assert.deepEqual(requested,[card.id],'render does not request the next variant PNG');
    assert(html.includes('cb-version-count cb-flip-control'));
    assert.match(html,/aria-label="2 versions de FIXTURE/);
    assert.match(html,/<h2[^>]*>FIXTURE<\/h2><p[^>]*>One<\/p>/,'name and version title stay distinct');
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
    assert.equal(JSON.stringify(data),before,'render does not mutate catalogue identities or fields');view.destroy();
    const single=Binder.create({data:{cards:[card],elements:{}},getOwned:()=>[{}]});
    const one=single.render();assert(!one.includes('cb-flip-control'));
    assert(!one.includes('cb-version-count'));assert(!one.includes('has-versions'));single.destroy();
    const empty=Binder.create({data:{cards:[card],elements:{}},getOwned:()=>[]}),unowned=empty.render();
    assert(unowned.includes('class="cb-empty"'),'empty ownership has a dedicated state');
    assert.match(unowned,/class="cb-empty"[\s\S]*data-binder-action="registry"/);
    assert.match(unowned,/class="cb-empty"[\s\S]*data-binder-action="scope" data-id="catalogue"/);
    assert(!unowned.includes('class="cb-pocket '),'empty ownership never silently reveals catalogue cards');empty.destroy();
  }finally{globalThis.KalistarCardMedia=media;globalThis.KalistarPositions=positions;}
});

test('pedestal supports wrapping, accessible controls and bounded motion without bitmap slicing',()=>{
  const css=read('collection-pedestal.css'),html=read('index.html');
  assert(html.indexOf('href="collection-pedestal.css"')>html.indexOf('href="positions.css"'));
  for(const text of ['prefers-reduced-motion','forced-colors',':focus-visible','.cb-faction-watermark','.cb-card-copies','.cb-card-favorite'])assert(css.includes(text),text);
  assert.match(css,/overflow-wrap:\s*(anywhere|break-word)/);
  assert.match(css,/pointer-events:\s*none/,'watermarks do not intercept controls');
  assert.doesNotMatch(css,/cb-plinth-art|collection-pedestal-v\d|border-image|@keyframes|infinite|\.slot-card|\.kdb-slot/);
  assert.doesNotMatch(read('collection-binder.css'),/animation[^;{}]*\binfinite\b/);
});
