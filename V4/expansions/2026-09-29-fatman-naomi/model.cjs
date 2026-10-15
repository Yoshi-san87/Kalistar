'use strict';
const assert = require('node:assert/strict');
const base = require('../2026-09-27-metal-gear-mines/model.cjs');
const bounds = require('../../../V3/donnees/regles_demo.json').roleBounds;
const SET = '2026-09-29-fatman-naomi';
const MIN = {1:{atk:[175,140,105,70,35,0],defense:[250,200,150,100,50,0]},5:{atk:[150,120,90,60,30,0],defense:[175,140,105,70,35,0]}};
function validateSet(set) {
  assert.equal(set.id,SET); assert.equal(set.officialCollaboration,false);
  assert.deepEqual(set.arenas,[]); assert.deepEqual(set.presets,[]);
  assert.deepEqual(set.cards.map(c=>[c.key,c.id,c.characterId,c.weapon,c.element,c.faction,c.role,c.positions]),[
    ['fatman','49508137','fatman-mgs','Projectile','MINERO','MGS2',1,[1,3]],
    ['naomi','49592640','naomi-hunter-mgs','Tome','HEMATO','MGS1',5,[5]]
  ]);
  for (const c of set.cards) {
    assert.equal(c.race,'HUMAIN'); assert.equal(c.collaboration,c.faction);
    assert.ok(c.name.length<=30 && c.title.length<=35 && c.description.length>=170 && c.description.length<=220);
    assert.match(c.art,/^[A-Za-z0-9_]+\.png$/); assert.deepEqual(c.crop,{zoom:1,x:0,y:0});
    for (const side of ['atk','defense']) {
      assert.equal(c[side].length,6); assert.ok(c[side].filter(v=>typeof v==='number').length>=3);
      c[side].forEach((v,i)=>{
        if(typeof v==='number') assert.ok(Number.isInteger(v) && v>=MIN[c.role][side][i] && v<=bounds[c.role][side][i],c.key+' '+side+' D'+(6-i));
        else assert.ok((side==='atk'?['guard','revive','retry','mana','buff_atk']:['retry','dodge']).includes(v));
      });
    }
    if(c.atk.includes('revive'))assert.equal(c.role,5);
    if(c.atk.includes('guard'))assert.ok([1,5].includes(c.role));
    for(const [mode,side] of [['magic','atk'],['barriers','defense']]){
      assert.equal(new Set(c[mode]).size,c[mode].length);
      assert.ok(c[mode].every(d=>Number.isInteger(d)&&d>=1&&d<=6&&typeof c[side][6-d]==='number'));
    }
  }
  return set;
}
function profile(c,D){return {...base.profile(c,D),visual_revision:'V4-'+SET};}
function validateGame(data,set,createEngine){
  validateSet(set);
  for(const c of set.cards){const p=data.cards.find(p=>p.id===c.id);assert(p);for(const f of base.PRINTED)assert.deepEqual(p[f],c[f]);assert.equal(p.role,c.role);assert.equal(p.characterId,c.characterId);}
  const cards=['49508137','49592640','48312725','47200643','40651224','47702575','45960834','41396996','44001617','40243854'];
  assert.deepEqual(createEngine(data).validatePlayableDeck(cards),[]);
  return [{purpose:'QA mixed deck only',cards}];
}
module.exports={...base,SET,MIN,validateSet,profile,validateGame};
