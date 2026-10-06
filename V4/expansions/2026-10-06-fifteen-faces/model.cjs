'use strict';
const assert = require('node:assert/strict');
const base = require('../2026-09-27-metal-gear-mines/model.cjs');
const bounds = require('../../../V3/donnees/regles_demo.json').roleBounds;
const weapons = require('../../../V3/donnees/armes.json');
const SET = '2026-10-06-fifteen-faces';
const KEYS = ['oskara','nell','sareth','daska','orel','ysane','sivel','maudre','nacre','bex','hadruk','sovan','ombrine','pelag','vaume'];
function validateSet(set) {
  assert.equal(set.id,SET);assert.equal(set.officialCollaboration,false);
  assert.deepEqual(set.arenas,[]);assert.deepEqual(set.presets,[]);
  assert.deepEqual(set.cards.map(c=>c.key),KEYS);
  assert.equal(new Set(set.cards.map(c=>c.id)).size,15);
  assert.equal(new Set(set.cards.map(c=>c.characterId)).size,15);
  for (const [index,c] of set.cards.entries()) {
    assert.equal(c.id,String(49900701+index));assert.equal(c.characterId,c.key+'-kalistar');
    assert(c.name.length<=30 && c.title.length<=35 && c.job.length<=22);
    assert(c.description.length>=160 && c.description.length<=190,'Lore budget: '+c.key);
    assert.match(c.art,/^Faces_[A-Za-z]+_0[12]\.png$/);
    assert(Object.hasOwn(weapons,c.weapon));
    assert(c.positions.includes(c.role));assert.equal(new Set(c.positions).size,c.positions.length);
    assert(c.positions.every(n=>Number.isInteger(n)&&n>=1&&n<=5));
    for(const side of ['atk','defense']){
      assert.equal(c[side].length,6);
      c[side].forEach((v,i)=>{
        if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[c.role][side][i+1]||0)&&v<=bounds[c.role][side][i],c.key+' '+side+' D'+(6-i));
        else assert((side==='atk'?['guard','retry','mana','revive','buff_atk']:['retry','dodge']).includes(v));
      });
    }
    if(c.atk.includes('guard'))assert([1,5].includes(c.role));
    if(c.atk.includes('revive'))assert.equal(c.role,5);
    for(const [field,side] of [['magic','atk'],['barriers','defense']]){
      assert.equal(new Set(c[field]).size,c[field].length);
      assert(c[field].every(d=>Number.isInteger(d)&&d>=1&&d<=6&&typeof c[side][6-d]==='number'));
    }
    if(c.element==='NONE')assert.equal(c.magic.length+c.barriers.length,0);
  }
  assert.equal(set.cards.find(c=>c.key==='ysane').name,'DAME YSANE');
  return set;
}
function profile(c,D) {
  return {...base.profile(c,D),source:'Personnage original Kalistar, selection utilisateur du 6 octobre 2026',visual_revision:'V4-'+SET};
}
function qaDecks(data) {
  const decks=[
    ['oskara','orel','daska','sareth','nell','maudre','nacre','bex','sivel','hadruk'],
    ['nacre','ysane','sovan','pelag','vaume','oskara','orel','daska','ombrine','hadruk']
  ].map(keys=>keys.map(k=>String(49900701+KEYS.indexOf(k))));
  for(const ids of decks)for(const id of ids)assert(data.cards.some(c=>c.id===id),'Missing QA card '+id);
  return decks;
}
function validateGame(data,set,createEngine) {
  validateSet(set);
  for(const c of set.cards){
    const p=data.cards.find(p=>p.id===c.id);assert(p);
    for(const f of base.PRINTED)assert.deepEqual(p[f],f==='faction'?require('../../site/factions.js').canonical(c[f]):c[f],c.key+'.'+f);
    assert.equal(p.characterId,c.characterId);assert.equal(p.role,c.role);
    assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,c.atk.includes('revive'));
  }
  const E=createEngine(data),decks=qaDecks(data);
  for(const ids of decks)assert.deepEqual(E.validatePlayableDeck(ids),[]);
  assert.equal(new Set(decks.flat()).size,15);
  return {cards:data.cards.length,added:15,qaDecks:decks,noPresetInstalled:true};
}
module.exports={...base,SET,KEYS,validateSet,profile,qaDecks,validateGame};
