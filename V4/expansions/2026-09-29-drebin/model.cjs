'use strict';
const assert=require('node:assert/strict'),base=require('../2026-09-27-metal-gear-mines/model.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds;
const SET='2026-09-29-drebin',MIN={atk:[150,120,90,60,30,0],defense:[175,140,105,70,35,0]};
function validateSet(set){
  assert.equal(set.id,SET);assert.equal(set.officialCollaboration,false);assert.deepEqual(set.arenas,[]);assert.deepEqual(set.presets,[]);
  assert.equal(set.cards.length,1);const c=set.cards[0];assert.match(c.id,/^4[0-9]{7}$/);
  assert.deepEqual([c.key,c.characterId,c.weapon,c.race,c.faction,c.collaboration,c.element,c.role,c.positions],['drebin','drebin-893-mgs','Projectile','HUMAIN','MGS4','MGS4','GEO',5,[5]]);
  assert(c.name.length<=30&&c.title.length<=35&&c.job.length<=22&&c.description.length>=170&&c.description.length<=220);
  assert.match(c.art,/^[A-Za-z0-9_]+[.]png$/);assert.deepEqual(c.crop,{zoom:1,x:0,y:0});
  for(const side of ['atk','defense']){
    assert.equal(c[side].length,6);assert(c[side].filter(v=>typeof v==='number').length>=3);
    c[side].forEach((v,i)=>{
      if(typeof v==='number')assert(Number.isInteger(v)&&v>=MIN[side][i]&&v<=bounds[5][side][i],side+' D'+(6-i)+' outside Support limits');
      else assert((side==='atk'?['guard','retry','revive','mana','buff_atk']:['retry','dodge']).includes(v));
    });
  }
  // Drebin supplies weapons and protection; he is neither a healer nor an instant-kill unit.
  assert.deepEqual(c.atk.filter(v=>typeof v!=='number'),['guard','buff_atk']);
  assert(c.defense.every(v=>typeof v==='number'));
  for(const [field,side] of [['magic','atk'],['barriers','defense']]){
    assert.equal(new Set(c[field]).size,c[field].length);
    assert(c[field].every(d=>Number.isInteger(d)&&d>=1&&d<=6&&typeof c[side][6-d]==='number'));
  }
  assert.deepEqual(c.magic,[]);assert.deepEqual(c.barriers,[4]);return set;
}
function profile(c,D){return {...base.profile(c,D),visual_revision:'V4-'+SET};}
function validateGame(data,set,createEngine){
  validateSet(set);const c=set.cards[0],p=data.cards.find(p=>p.id===c.id);assert(p);
  for(const f of base.PRINTED)assert.deepEqual(p[f],c[f]);assert.equal(p.role,5);assert.equal(p.characterId,c.characterId);
  const cards=['49508137',c.id,'48312725','47200643','40651224','47702575','45960834','41396996','44001617','40243854'];
  assert.deepEqual(createEngine(data).validatePlayableDeck(cards),[]);
  return [{purpose:'QA mixed deck only',cards}];
}
module.exports={...base,SET,MIN,validateSet,profile,validateGame};
