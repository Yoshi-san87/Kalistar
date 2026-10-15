'use strict';
const assert=require('node:assert/strict'),base=require('../2026-09-27-metal-gear-mines/model.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds,weapons=require('../../../V3/donnees/armes.json');
const SET='2026-10-01-one-piece-witcher';
const keys=['sanji-black','shanks','ace','law','boa','koby','buggy','alvida','mihawk','arlong','geralt-witcher','geralt-white','ciri','yennefer','triss','vesemir','dandelion'];
function validateSet(set){
 assert.equal(set.id,SET);assert.equal(set.officialCollaboration,false);assert.deepEqual(set.arenas,[]);assert.deepEqual(set.presets,[]);
 assert.deepEqual(set.cards.map(c=>c.key),keys);assert.equal(new Set(set.cards.map(c=>c.id)).size,17);
 assert.equal(new Set(set.cards.map(c=>c.characterId)).size,16);
 for(const [i,c] of set.cards.entries()){
  assert.equal(c.id,String(i<10?49800301+i:49900101+i-10));
  assert.equal(c.faction,i<10?'ONEPIECE':'WITCHER');assert.equal(c.collaboration,c.faction);
  assert(c.positions.includes(c.role));assert(c.positions.every(p=>Number.isInteger(p)&&p>=1&&p<=5));assert.equal(new Set(c.positions).size,c.positions.length);
  assert(c.name.length<=30&&c.title.length<=35&&c.description.length>=160&&c.description.length<=190);
  assert(Object.hasOwn(weapons,c.weapon));assert.match(c.art,/^(OP|TW)_[A-Za-z0-9_]+\.png$/);
  for(const side of ['atk','defense']){
   assert.equal(c[side].length,6);assert(c[side].filter(v=>typeof v==='number').length>=3);
   c[side].forEach((v,j)=>{if(typeof v==='number')assert(Number.isInteger(v)&&v>=0&&v<=bounds[c.role][side][j]);else assert((side==='atk'?['guard','revive','retry','mana','buff_atk','death']:['retry','dodge']).includes(v));});
  }
  if(c.atk.includes('guard'))assert([1,5].includes(c.role));if(c.atk.includes('revive'))assert.equal(c.role,5);
  for(const [field,side]of [['magic','atk'],['barriers','defense']])assert(c[field].every(d=>Number.isInteger(d)&&d>=1&&d<=6&&typeof c[side][6-d]==='number'));
  if(c.element==='NONE')assert.equal(c.magic.length+c.barriers.length,0);
 }
 const by=k=>set.cards.find(c=>c.key===k);
 assert.deepEqual(by('koby').positions,[5]);assert.equal(by('koby').element,'NONE');
 assert.deepEqual(by('buggy').positions,[2,4]);assert.equal(by('alvida').weapon,'Masse');assert.equal(by('alvida').role,1);
 assert.equal(by('mihawk').role,1);assert.equal(by('mihawk').weapon,'Ep\u00e9e longue');
 assert.equal(by('arlong').race,'SHARKAN');assert.deepEqual(by('arlong').positions,[1,2]);assert.equal(by('arlong').weapon,'Poing');
 assert.equal(by('sanji-black').characterId,'sanji-op');assert.equal(by('sanji-black').lineage,'49800103');
 const a=by('geralt-witcher'),b=by('geralt-white');assert.equal(a.characterId,b.characterId);assert.deepEqual(a.positions,[2]);assert.deepEqual(b.positions,[2]);
 assert.equal(a.weapon,'Ep\u00e9e longue');assert.equal(b.weapon,'Ep\u00e9e courte');assert(b.atk.includes('death'));
 assert.equal(by('ciri').role,3);assert(by('ciri').defense.includes('dodge'));assert.equal(by('ciri').weapon,'Ep\u00e9e courte');
 assert.equal(by('yennefer').element,'NECRO');assert(by('yennefer').atk.includes('mana'));assert.equal(by('yennefer').weapon,'Tome');
 assert.equal(by('triss').element,'PYRO');assert.equal(by('triss').weapon,'Tome');assert.equal(by('vesemir').role,1);
 assert.equal(by('dandelion').weapon,'Instrument');assert.equal(by('dandelion').role,5);assert(by('dandelion').atk.includes('revive'));assert(by('dandelion').atk.includes('retry')||by('dandelion').defense.includes('retry'));
 assert.equal(new Set(set.cards.map(c=>JSON.stringify([c.atk,c.defense]))).size,17,'Every profile has its own numeric signature.');
 return set;
}
function profile(c,D){return {...base.profile(c,D),source:'Kalistar x '+(c.faction==='WITCHER'?'The Witcher':'One Piece')+' - fan crossover non officiel',visual_revision:'V4-'+SET};}
function validateGame(data,set,createEngine){
 validateSet(set);const engine=createEngine(data);
 for(const c of set.cards){
  const p=data.cards.find(p=>p.id===c.id);assert(p);assert.equal(p.characterId,c.characterId);assert.equal(p.role,c.role);
  for(const f of base.PRINTED)assert.deepEqual(p[f],c[f],c.key+'.'+f);
  assert.equal(p.collaboration,c.collaboration);assert.equal(p.sentry,c.element!=='NONE');
  assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,c.atk.includes('revive'));
 }
 const ga=set.cards.find(c=>c.key==='geralt-witcher').id,gb=set.cards.find(c=>c.key==='geralt-white').id;
 assert(engine.validateDeck([ga,gb]).some(e=>e.includes('personnage')));
 const sanji=set.cards.find(c=>c.key==='sanji-black').id;
 assert(engine.validateDeck([sanji,'49800103']).some(e=>e.includes('personnage')));
 return {cards:17,characters:16,duplicateGeraltRejected:true,duplicateSanjiRejected:true,noPresetInstalled:true};
}
module.exports={...base,SET,keys,validateSet,profile,validateGame};
