'use strict';
const assert=require('node:assert/strict'),base=require('../2026-09-27-metal-gear-mines/model.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds, weapons=require('../../../V3/donnees/armes.json');
const SET='2026-09-30-metal-gear-saga';
const required=[
 ['meryl4','Gun','AERO',[2,3]],['raiden4','Katana',null,[2]],['otacon4','Tome',null,[5]],
 ['liquid-ocelot','Poing',null,[2,1]],['vamp4','Dague',null,[3]],
 ['naked-snake','Gun','HERBO',[2,3]],['the-boss','Poing','LUXO',[1,3]],['the-pain',null,'AERO',[4]],
 ['the-fear',null,'HERBO',[3,2]],['the-end','Gun','MINERO',[4,5]],['the-fury','Projectile','PYRO',[4,3,2]],
 ['the-sorrow',null,'NECRO',[5]],['volgin','Poing','ELECTRO',[1]],['major-ocelot','Gun',null,[2]],
 ['venom-snake','Gun',null,[2]],['ocelot5','Gun',null,[3,2]],['miller5',null,null,[5,3]],
 ['skull-face',null,'NECRO',[4,2]],['quiet','Gun','AERO',[4]]
];
function validateSet(set){
 assert.equal(set.id,SET);assert.equal(set.officialCollaboration,false);assert.deepEqual(set.arenas,[]);assert.deepEqual(set.presets,[]);
 assert.deepEqual(set.cards.map(c=>c.key),required.map(r=>r[0]));assert.equal(new Set(set.cards.map(c=>c.id)).size,19);
 for(const [index,c] of set.cards.entries()){
  const r=required[index];assert.match(c.id,/^4\d{7}$/);assert.match(c.characterId,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.deepEqual(c.positions,r[3]);if(r[1])assert.equal(c.weapon,r[1]);if(r[2])assert.equal(c.element,r[2]);
  assert.equal(c.faction,index<5?'MGS4':index<14?'MGS3':'MGS5');assert.equal(c.collaboration,c.faction);
  assert(c.positions.includes(c.role));assert.equal(c.role,c.positions[0]);assert(Object.hasOwn(weapons,c.weapon));
  assert(c.name.length<=30&&c.title.length<=35&&c.job.length<=22&&c.description.length>=170&&c.description.length<=220,c.key+' text budget');
  assert.match(c.art,/^[A-Za-z0-9_]+[.]png$/);assert.deepEqual(c.crop,{zoom:1,x:0,y:0});
  for(const side of ['atk','defense']){
   assert.equal(c[side].length,6);assert(c[side].filter(v=>typeof v==='number').length>=3);
   c[side].forEach((v,i)=>{
    const max=bounds[c.role][side][i],min=bounds[c.role][side][i+1]||0;
    if(typeof v==='number')assert(Number.isInteger(v)&&v>=min&&v<=max,c.key+' '+side+' D'+(6-i)+' range '+min+'..'+max);
    else assert((side==='atk'?['guard','revive','retry','mana','buff_atk','death']:['retry','dodge']).includes(v));
   });
  }
  if(c.atk.includes('guard'))assert([1,5].includes(c.role));if(c.atk.includes('revive'))assert.equal(c.role,5);
  for(const [field,side] of [['magic','atk'],['barriers','defense']]){
   assert.equal(new Set(c[field]).size,c[field].length);assert(c[field].every(d=>Number.isInteger(d)&&d>=1&&d<=6&&typeof c[side][6-d]==='number'));
  }
  if(c.element==='NONE')assert.equal(c.magic.length+c.barriers.length,0);
 }
 const by=key=>set.cards.find(c=>c.key===key);
 assert.equal(by('the-pain').race,'BUZZY');assert.equal(by('the-fear').race,'SERPES');
 for(const key of ['the-sorrow','skull-face'])assert.equal(by(key).atk.filter(v=>v==='death').length,1);
 for(const key of ['liquid-ocelot','major-ocelot','ocelot5'])assert.equal(by(key).characterId,'revolver-ocelot-mgs');
 assert.equal(by('vamp4').characterId,'vamp-mgs');assert.equal(by('meryl4').characterId,'meryl-mgs');assert.equal(by('raiden4').characterId,'raiden-mgs');
 assert.equal(new Set([by('naked-snake').characterId,by('venom-snake').characterId,'solid-snake-mgs']).size,3);
 return set;
}
function profile(c,D){return {...base.profile(c,D),visual_revision:'V4-'+SET};}
function validateGame(data,set,createEngine){
 validateSet(set);const e=createEngine(data);
 for(const c of set.cards){const p=data.cards.find(p=>p.id===c.id);assert(p);for(const f of base.PRINTED)assert.deepEqual(p[f],c[f]);assert.equal(p.characterId,c.characterId);assert.equal(p.role,c.role);if(c.lineage)assert.equal(data.cards.find(p=>p.id===c.lineage).characterId,c.characterId);}
 const cards=['45297565',...['naked-snake','venom-snake','meryl4','raiden4','otacon4','the-boss','the-pain','the-end','the-sorrow'].map(k=>set.cards.find(c=>c.key===k).id)];
 assert.deepEqual(e.validatePlayableDeck(cards),[]);
 const duplicate=[...cards];duplicate[2]='48683979';assert(e.validatePlayableDeck(duplicate).length>0);
 return [{purpose:'QA mixed deck only: three independent Snakes',cards}];
}
module.exports={...base,SET,required,validateSet,profile,validateGame};
