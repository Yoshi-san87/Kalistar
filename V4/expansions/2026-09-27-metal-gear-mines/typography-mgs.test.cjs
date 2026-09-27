'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../../atelier/lib.cjs'),T=require('./typography-mgs.cjs');
const native=L.read(L.path.join(__dirname,'cards/liquid-snake/render/native.json'));
test('approved Liquid Q descender fits the unchanged native font and band',()=>{assert.doesNotThrow(()=>T.verify(native));});
test('the exception rejects changed font, size, style, position and ink extent',()=>{
  const changes=[
    n=>{n.typography.NOM.font='Arial';},n=>{n.typography.NOM.sizePt=9.5;},
    n=>{n.typography.NOM.fauxBold=true;},n=>{n.typography.TITLE.tracking=3;},
    n=>{n.layers.find(l=>l.name==='NOM').ink[3]=149;},
    n=>{n.layers.find(l=>l.name==='NOM').ink[0]=304;},
    n=>{n.layers.find(l=>l.name==='NOM').sizePt=11;},
    n=>{n.layers.find(l=>l.name==='NOM').text='OTHER NAME';}
  ];
  for(const change of changes){const n=structuredClone(native);change(n);assert.throws(()=>T.verify(n));}
});
test('every other current name continues through the unchanged strict verifier',()=>{
  const set=require('./set.json');for(const spec of set.cards.filter(c=>c.key!=='liquid-snake'))T.verify(L.read(L.path.join(__dirname,'cards',spec.key,'render/native.json')));
});
