'use strict';
const prior=require('../2026-10-04-kalistel-armor/specs.cjs');
const cards=["orven","neryk","eryss","velran","saelor","liorne"].map(key=>{
  const c=prior.cards.find(c=>c.key===key);if(!c)throw Error('Unknown character: '+key);
  return {...c,previousArt:c.art,art:c.art.replace(/_(\d+)\.png$/,(_,n)=>'_'+String(Number(n)+1).padStart(2,'0')+'.png')};
});
module.exports={cards,removed:['49900311']};
