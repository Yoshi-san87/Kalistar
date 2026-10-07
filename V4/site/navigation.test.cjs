'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),read=relative=>fs.readFileSync(path.join(root,relative));
const proof=JSON.parse(read('V4/revisions/2026-10-03-menu-identity/media-provenance.json'));
test('navigation media is transparent, lossless, uniform and provenance-checked',()=>{
  assert.deepEqual(proof.assets.map(a=>a.name),['collection','story','decks','weapons','arena','statistics','more','kalistel']);
  for(const asset of proof.assets){
    const b=read(asset.file);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),asset.sha256);
    assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.toString('ascii',12,16),'VP8L');
    const bits=b.readUInt32LE(21);assert.equal((bits&0x3fff)+1,128);assert.equal(((bits>>>14)&0x3fff)+1,128);assert(bits&0x10000000,'alpha preserved');
  }
  assert(proof.assets.find(a=>a.name==='kalistel').file.includes('rainbow'));
});
test('Cinzel is self-hosted with its unmodified license and original WOFF2 files',()=>{
  for(const f of proof.fonts){const b=read(f.file);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256);if(f.file.endsWith('.woff2'))assert.equal(b.toString('ascii',0,4),'wOF2');}
  assert.match(read('V4/site/assets/fonts/Cinzel-OFL.txt').toString(),/SIL Open Font License, Version 1.1/);
  const css=read('V4/site/navigation.css').toString();assert(css.includes('font-display: swap'));assert(!css.includes('url(https:'));
  assert(!/--serif\s*:/.test(css),'existing body and manuscript type remains intact');
});
test('menu entry points and reduced motion remain available without tiny phone buttons',()=>{
  const html=read('V4/site/index.html').toString(),css=read('V4/site/navigation.css').toString();
  assert.equal((html.match(/class="kalistar-nav-icon"/g)||[]).length,7);
  assert(html.includes('aria-haspopup="dialog"'));assert(html.includes('aria-expanded="false"'));
  assert(css.includes('prefers-reduced-motion:reduce'));assert(css.includes('repeat(5,minmax(0,1fr))'));
  assert(css.includes('height:60px'));assert(css.includes('body.arena-view .masthead > * { display:none; }'));
});
test('navigation target height does not feed back from the measured masthead height',()=>{
  const css=read('V4/site/navigation.css').toString();
  assert(css.includes('--masthead-height:var(--navigation-header-height)'));
  assert(!/\b(?:height|min-height|flex-basis):var\(--masthead-height\)/.test(css));
  assert(css.includes('margin:8px 0 -1px; border-bottom:0'));
  assert(css.includes('position:relative; z-index:30; overflow:visible'));
});

test('popup Back integrates before views without overriding browser gestures or dialog prototypes',()=>{
  const boot=read('V4/site/boot.js').toString(),back=read('V4/site/dialog-history.js').toString(),app=read('V4/site/app.js').toString();
  assert(boot.indexOf("'dialog-history.js'")<boot.indexOf("'app.js'"));
  assert(back.includes("addEventListener('popstate'"));assert(back.includes('history.pushState'));
  assert(back.includes('node.requestClose()'));assert(back.includes("new Event('cancel', {cancelable:true})"));
  assert(back.includes("addEventListener('pageshow', init)"));assert(back.includes('observer?.disconnect()'));
  assert(!/prototype\s*\.|touchmove|pointermove/.test(back));
  assert(!app.includes('history.replaceState(null'));assert(app.includes('if(view!==ui.view)setView(view)'));
});

test('dynamic popup cancellation resets the owning view instead of reopening on repaint',()=>{
  const binder=read('V4/site/collection-binder.js').toString(),deck=read('V4/site/deck-builder.js').toString(),reserve=read('V4/site/reserve-preview.js').toString();
  assert(binder.includes("['cancel',cancelOverlay,true]"));assert(binder.includes('event.preventDefault();closeOverlay()'));
  assert(deck.includes("else if(event.target.matches('.kdb-compare'))"));assert(deck.includes('event.preventDefault();closeComparison()'));
  assert(reserve.includes("track('reserve-preview'"));assert(reserve.includes('visible:()=>touchPreview&&visible()'));
});
