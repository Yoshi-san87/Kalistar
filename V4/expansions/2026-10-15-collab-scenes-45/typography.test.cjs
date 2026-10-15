'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('./typography.cjs');
const native=name=>structuredClone(require('./cards/'+name+'/render/native.json'));
test('Actual Q descender and acute accent remain inside the native title with the same 10pt face',()=>{
 const squall=native('squall-bal'),kaine=native('kaine-falaise');
 assert.equal(T.verify(squall).descender,true);assert.equal(T.verify(kaine).accented,true);
 assert.equal(squall.layers.find(l=>l.name==='NOM').ink[3]-squall.layers.find(l=>l.name==='NOM').ink[1],37);
});
test('Typography still rejects scaling, font substitution, tracking, overflow and unjustified tall capitals',()=>{
 for(const change of [n=>n.typography.NOM.sizePt=9,n=>n.typography.NOM.font='ArialMT',n=>n.typography.NOM.tracking=1,
  n=>n.layers.find(l=>l.name==='NOM').ink=[368,100,530,159],n=>n.layers.find(l=>l.name==='NOM').text='SALL']){
  const n=native('squall-bal');change(n);assert.throws(()=>T.verify(n));
 }
});
