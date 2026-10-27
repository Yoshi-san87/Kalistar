'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {selection}=require('./startup-reading.js');
const cards=Array.from({length:4},(_,i)=>({id:String(i),edition:'V4',pngUrl:'/media/'+i+'.png',name:'Personnage '+i,description:'Un recit deja publie.'}));
test('random reading uses exactly one published card and its authored story',()=>{
  for(let i=0;i<cards.length;i++)assert.equal(selection(cards,()=>i/4),cards[i]);
  assert.equal(selection(cards,()=>1),cards[3]);assert.equal(selection(cards,()=>NaN),cards[0]);
  assert.deepEqual(cards.map(card=>card.id),['0','1','2','3']);
});
test('missing cards, older editions and empty stories are excluded',()=>{
  assert.equal(selection(null),null);assert.equal(selection([]),null);
  assert.equal(selection([{...cards[0],edition:'V3'},{...cards[0],description:' '},{...cards[0],pngUrl:''},cards[2]],()=>0),cards[2]);
  const legacyText={...cards[0],description:'',text:'Recit de la carte'};assert.equal(selection([legacyText]),legacyText);
});
