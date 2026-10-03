'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {weapons}=require('./weapons.js'),C=require('./weapon-cards.js');
const sources=require('../weapon-cards/background-sources.json'),proof=require('../weapon-cards/media-provenance.json');
const root=path.resolve(__dirname,'../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('every collectible is one painted scene; original scenes remain intact',()=>{
  assert(weapons.every(w=>!C.faces[w.id].cutout));
  assert.deepEqual([...new Set(Object.values(C.backgrounds))].sort(),sources.assets.map(a=>a.file).sort());
  assert.equal(C.backgrounds['fallen-king-axe'],undefined);assert.equal(C.backgrounds['little-joys-flute'],undefined);
  assert.equal(C.faces['fallen-king-axe'].illustration,'fallen-king-axe-scene-v1.webp');
  assert.equal(C.faces['little-joys-flute'].illustration,'little-joys-flute-scene-v1.webp');
});
test('painted scene replaces composite scenery, keeps separate medallion and Pages prefix',()=>{
  for(const w of weapons){
    const before=JSON.stringify(w),html=C.markup(w,{url:p=>'/Kalistar/jeu/'+p,medallion:()=>'<span class="test-medallion"></span>'});
    assert.equal(JSON.stringify(w),before);assert(html.includes('class="test-medallion"'));
    assert(html.includes('src="/Kalistar/jeu/assets/weapon-cards/'+C.faces[w.id].illustration+'"'));
    assert(!html.includes('class="wc-art-background"'));
    assert(!html.includes('wc-art-cutout'));
  }
});
test('background sources and lightweight distributed files match the recorded hashes',()=>{
  for(const a of sources.assets){
    const p=proof.assets.find(p=>p.role==='background'&&p.file.endsWith('/'+a.file));assert(p);
    assert.equal(p.source,a.source);assert.equal(hash(fs.readFileSync(path.join(root,a.source))),p.sourceHash);
    const bytes=fs.readFileSync(path.join(root,p.file));assert.equal(hash(bytes),p.sha256);assert(bytes.length<650000);
    assert(p.width>=941&&p.height>=941);
  }
});
