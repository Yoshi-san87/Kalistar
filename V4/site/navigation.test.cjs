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
