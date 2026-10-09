'use strict';
const assert=require('node:assert/strict'),G=require('../2026-10-09-gotham/model.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds;
const SET='2026-10-09-gotham-completion',KEYS=['batman','joker'];
const {PRINTED,donor,characterId,formation,validateProfile}=G;
function validateSet(s){
  assert.equal(s.id,SET);assert.equal(s.officialCollaboration,false);
  assert.deepEqual(s.arenas,[]);assert.deepEqual(s.presets,[]);assert.deepEqual(s.cards.map(c=>c.key),KEYS);
  for(const [i,c]of s.cards.entries()){
    assert.equal(c.id,String(49901509+i));assert.equal(c.characterId,c.key+'-batman');
    assert.equal(c.faction,'Gotham');assert.equal(c.collaboration,'Gotham');
    assert.equal(c.race,'HUMAIN');assert.equal(c.element,'NONE');
    assert.deepEqual(c.magic,[]);assert.deepEqual(c.barriers,[]);
    assert(c.description.length>=160&&c.description.length<=195);assert(c.title.length<=35);
    assert(c.positions.includes(c.role));donor(c);
    for(const side of ['atk','defense']){
      assert.equal(c[side].length,6);assert(c[side].filter(v=>typeof v==='number').length>=3);
      c[side].forEach((v,j)=>{
        if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[c.role][side][j+1]||0)&&v<=bounds[c.role][side][j],c.key+' '+side+' D'+(6-j));
        else assert((side==='atk'?['guard','retry','mana','revive','buff_atk','death']:['retry','dodge']).includes(v));
      });
    }
    if(c.atk.includes('guard'))assert([1,5].includes(c.role));
    if(c.atk.includes('revive'))assert.equal(c.role,5);
  }
  assert.equal(s.cards[0].weapon,'Projectile');assert.equal(s.cards[1].weapon,'B\u00e2ton');
  return s;
}
const profile=c=>({...G.profile(c),visual_revision:'V4-'+SET});
const deck=()=>Array.from({length:10},(_,i)=>String(49901501+i));
function validateGame(data,s,createEngine){
  validateSet(s);const E=createEngine(data),ids=deck();assert.deepEqual(E.validatePlayableDeck(ids),[]);
  for(const c of s.cards){
    const p=E.byId[c.id];assert(p);
    for(const f of [...PRINTED.filter(f=>f!=='description'),'role','characterId'])assert.deepEqual(p[f],c[f]);
    formation(data.cards,ids,c.id,c.role-1);
  }
  return {deck:ids,noPresetInstalled:true};
}
module.exports={SET,KEYS,PRINTED,characterId,donor,profile,validateProfile,validateSet,validateGame,deck,formation};
