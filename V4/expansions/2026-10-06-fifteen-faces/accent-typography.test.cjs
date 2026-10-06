'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {verify}=require('./accent-typography.cjs');
const set=require('./set.json');
test('Native accent occupies ink space without increasing the fixed font size',()=>{
 for(const c of set.cards)verify(require('./cards/'+c.key+'/render/native.json'));
 const p=require('./cards/pelag/render/native.json');
 assert.equal(verify(p).accented,true);
 for(const change of [
  n=>n.layers.find(l=>l.name==='NOM').sizePt=11,
  n=>n.typography.NOM.tracking=10,
  n=>n.layers.find(l=>l.name==='NOM').ink=[383,100,517,159],
  n=>n.layers.find(l=>l.name==='NOM').ink=[383,114,517,124],
  n=>n.layers.find(l=>l.name==='NOM').ink=[200,110,699,149],
  n=>n.layers.find(l=>l.name==='NOM').text='PELAG'
 ]){const invalid=structuredClone(p);change(invalid);assert.throws(()=>verify(invalid));}
});
