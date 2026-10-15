'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),L=require('../../atelier/lib.cjs'),T=require('./typography.cjs');
test('all 19 native names preserve approved font and geometry',()=>{
 for(const c of require('./set.json').cards)T.verify(L.read(L.path.join(__dirname,'cards',c.key,'render/native.json')));
});
test('Q exception is exact, not a general height relaxation',()=>{
 for(const key of ['liquid-ocelot','quiet']){
  const native=L.read(L.path.join(__dirname,'cards',key,'render/native.json'));
  for(const change of [
   n=>n.typography.NOM.font='Arial',n=>n.typography.NOM.sizePt=9.5,n=>n.typography.NOM.fauxBold=true,n=>n.typography.TITLE.tracking=3,
   n=>n.layers.find(l=>l.name==='NOM').ink[3]=149,n=>n.layers.find(l=>l.name==='NOM').ink[0]+=1,
   n=>n.layers.find(l=>l.name==='NOM').sizePt=11,n=>n.layers.find(l=>l.name==='NOM').text='OTHER NAME'
  ]){const n=structuredClone(native);change(n);assert.throws(()=>T.verify(n));}
 }
});
