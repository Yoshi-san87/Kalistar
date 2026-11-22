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

test('collection owns a fixed twelve-slot album and a paged reader without scroll',()=>{
  const css=read('collection-binder.css'),js=read('collection-binder.js'),mobile=read('mobile.css'),ui=read('ui-system.css');
  assert.match(css,/\.cb-spread\s*\{[^}]*display:\s*grid/);
  assert.match(css,/\.cb-workbench\s*\{[^}]*overflow:\s*hidden/);
  assert.match(css,/body\.collection-view\s*\{[^}]*overflow:\s*hidden/);
  assert.match(css,/\.cb-slot\s*\{[^}]*aspect-ratio:\s*797\s*\/\s*1388/);
  assert.match(css,/\.cb-hero-stage\s*\{[^}]*container:album-hero\s*\/\s*size/);
  assert.match(css,/\.cb-hero-image\s*\{[^}]*height:min\(100cqh,/,'hero sizing resolves against its stage, not intrinsic PNG dimensions');
  assert.match(css,/\.cb-read-window\s*\{[^}]*overflow:\s*hidden/);
  assert.match(css,/\.cb-read-content\s*\{[^}]*column-width:/);
  assert.match(js,/const pageSize=12/);
  for(const file of ['album-open-v1.webp','album-open-phone-v1.webp','album-sleeve-v1.webp','album-leaf-v1.webp'])assert(css.includes(file),file);
  for(const marker of ['prefers-reduced-motion',':focus-visible','forced-colors','.cb-reading-tabs','.cb-profile','.cb-career','.cb-equipped'])assert(css.includes(marker),marker);
  assert.doesNotMatch(mobile,/\.cb-(?:sheet|spread|reader|reading|workbench|pocket|caption|pedestal)\b/);
  assert.doesNotMatch(ui,/\.cb-reading\b|\.cb-versions\b/);
  for(const file of ['statistics.css','weapons.css'])assert.doesNotMatch(read(file).replace(/\/\*[\s\S]*?\*\//g,''),/\.cb-[\w-]+/,'one Collection owner, not '+file);
  assert.doesNotMatch(js,/fitPocketNames|setInterval\s*\(/);
});

test('every version occupies its own native-card slot; empty albums still render twelve pockets',()=>{
  const Binder=require('./collection-binder.js'),Positions=require('./positions.js');
  const media=globalThis.KalistarCardMedia,positions=globalThis.KalistarPositions;
  globalThis.KalistarPositions=Positions;
  try{
    const card={id:'49998001',characterId:'fixture',name:'FIXTURE',title:'One',faction:'Chroma',race:'ROBOT',weapon:'Instrument',element:'NONE',positions:[3,4]};
    const cards=[card,{...card,id:'49998002',title:'Two',faction:'Niveria'}],data={cards,elements:{}};
    const requested=[],before=JSON.stringify(data),owned=cards.map(c=>({cardId:c.id,id:'copy-'+c.id,status:'owned'}));
    globalThis.KalistarCardMedia={image:c=>{requested.push(c.id);return 'fixture-'+c.id+'.png';}};
    const view=Binder.create({data,getOwned:id=>owned.filter(c=>!id||c.cardId===id),getFavorites:()=>new Set([card.id])}),html=view.render();
    assert.equal((html.match(/<article class="cb-pocket\b/g)||[]).length,12);
    assert.equal((html.match(/class="cb-pocket is-empty"/g)||[]).length,10);
    assert.equal((html.match(/data-leaf="/g)||[]).length,2);
    assert.deepEqual(requested,cards.map(c=>c.id),'both versions have independent visible PNGs');
    for(const c of cards)assert(html.includes('data-card-id="'+c.id+'"'));
    assert(html.includes('cb-album'));assert(html.includes('cb-slot'));
    assert.doesNotMatch(html,/cb-pedestal|cb-stack|data-binder-action="cycle-version"/);
    assert.equal((html.match(/cb-card-favorite/g)||[]).length,2);
    assert.equal((html.match(/class="cb-card-copies" role="img" aria-label="1 exemplaire"/g)||[]).length,2);
    assert(html.includes('aria-pressed="true"'));
    assert.equal(JSON.stringify(data),before);view.destroy();
    requested.length=0;
    const empty=Binder.create({data,getOwned:()=>[]}),blank=empty.render();
    assert.equal((blank.match(/class="cb-pocket is-empty"/g)||[]).length,12);
    assert.deepEqual(requested,[],'empty ownership never loads catalogue artwork');
    assert(!blank.includes('fixture-49998001.png'));empty.destroy();
  }finally{globalThis.KalistarCardMedia=media;globalThis.KalistarPositions=positions;}
});

test('album turns use bounded composited leaves and retire the old pedestal layer',()=>{
  const css=read('collection-binder.css'),js=read('collection-binder.js'),html=read('index.html');
  assert(!html.includes('href="collection-pedestal.css"'));
  for(const marker of ['.cb-page-turn','.cb-turn-sheet','backface-visibility','preserve-3d'])assert(css.includes(marker),marker);
  assert.match(js,/duration:720/);assert(js.includes("visibilitychange"));assert(js.includes('animation.cancel()'));
  assert(js.includes('observer?.disconnect()'));assert(js.includes('cancelAnimationFrame'));
  assert.doesNotMatch(css,/animation[^;{}]*\binfinite\b/);
  assert.doesNotMatch(css,/\.slot-card\s*\{|\.kdb-slot\s*\{/);
});

test('album ink and secondary labels remain legible on the paper fallback',()=>{
  const css=read('collection-binder.css'),album=css.match(/\.cb-album\s*\{([^}]+)\}/)[1];
  const paper=album.match(/background:#([a-f0-9]{6})/)[1];
  const light=hex=>hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  for(const token of ['text','muted']){
    const ink=album.match(new RegExp('--cb-'+token+':#([a-f0-9]{6})'))[1],values=[light(ink),light(paper)].sort((a,b)=>b-a);
    assert((values[0]+.05)/(values[1]+.05)>=4.5,token+' text contrast');
  }
});
