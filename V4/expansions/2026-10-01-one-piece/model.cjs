'use strict';
const assert=require('node:assert/strict'),base=require('../2026-09-27-metal-gear-mines/model.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds,weapons=require('../../../V3/donnees/armes.json');
const SET='2026-10-01-one-piece';
const required=[
 ['luffy','monkey-d-luffy-op',2,[1,2,3],'Poing','NONE','HUMAIN'],
 ['zoro','roronoa-zoro-op',2,[2],'Katana','HERBO','HUMAIN'],
 ['sanji','sanji-op',4,[3,4],'Poing','PYRO','HUMAIN'],
 ['nami','nami-op',3,[3],'Lance','HYDRO','HUMAIN'],
 ['usopp','usopp-op',4,[4],'Projectile','GEO','HUMAIN'],
 ['chopper-small','tony-tony-chopper-op',5,[5],'Tome','HERBO','CERELF'],
 ['chopper-heavy','tony-tony-chopper-op',1,[1],'Poing','MINERO','CERELF'],
 ['robin','nico-robin-op',3,[3],'Poing','HERBO','HUMAIN'],
 ['franky','franky-op',1,[1],'Gun','ELECTRO','CYBORG'],
 ['brook','brook-op',5,[5],'Instrument','CRYO','SKULLZ'],
 ['jinbe','jinbe-op',1,[1,2],'Poing','HYDRO','SHARKAN']
];
function validateSet(set){
 assert.equal(set.id,SET);assert.equal(set.officialCollaboration,false);assert.deepEqual(set.arenas,[]);assert.deepEqual(set.presets,[]);
 assert.deepEqual(set.cards.map(c=>c.key),required.map(r=>r[0]));
 assert.equal(new Set(set.cards.map(c=>c.id)).size,11);assert.equal(new Set(set.cards.map(c=>c.characterId)).size,10);
 for(const [i,c] of set.cards.entries()){
  const [key,characterId,role,positions,weapon,element,race]=required[i];
  assert.equal(c.id,String(49800101+i));assert.equal(c.characterId,characterId);assert.equal(c.faction,'ONEPIECE');assert.equal(c.collaboration,'ONEPIECE');
  assert.equal(c.role,role);assert.deepEqual(c.positions,positions);assert.equal(c.weapon,weapon);assert.equal(c.element,element);assert.equal(c.race,race);
  assert(Object.hasOwn(weapons,weapon));assert.equal(c.art,'OP_'+key+'_01.png');assert.deepEqual(c.crop,{zoom:1,x:0,y:0});
  assert(c.name.length<=30&&c.title.length<=35&&c.job.length<=22&&c.description.length>=170&&c.description.length<=180,key+' text budget '+c.description.length);
  for(const side of ['atk','defense']){
   assert.equal(c[side].length,6);assert(c[side].filter(v=>typeof v==='number').length>=3);
   c[side].forEach((v,j)=>{const max=bounds[role][side][j],min=bounds[role][side][j+1]||0;
    if(typeof v==='number')assert(Number.isInteger(v)&&v>=min&&v<=max,key+' '+side+' D'+(6-j));
    else assert((side==='atk'?['guard','revive','retry','mana','buff_atk','death']:['retry','dodge']).includes(v));
   });
  }
  if(c.atk.includes('guard'))assert([1,5].includes(role));if(c.atk.includes('revive'))assert.equal(role,5);
  for(const [field,side] of [['magic','atk'],['barriers','defense']]){
   assert.equal(new Set(c[field]).size,c[field].length);
   assert(c[field].every(d=>Number.isInteger(d)&&d>=1&&d<=6&&typeof c[side][6-d]==='number'));
  }
  if(element==='NONE')assert.equal(c.magic.length+c.barriers.length,0);
 }
 const by=k=>set.cards.find(c=>c.key===k);
 assert(by('zoro').atk.includes('death'));assert(by('zoro').defense.includes('dodge'));
 assert(by('chopper-small').atk.includes('revive'));
 assert(!by('brook').atk.includes('revive'));assert(by('brook').atk.some(v=>['mana','buff_atk','guard','retry'].includes(v)));
 return set;
}
function profile(c,D){return {...base.profile(c,D),source:'Kalistar x One Piece - fan crossover non officiel',visual_revision:'V4-'+SET};}
function validateGame(data,set,createEngine){
 validateSet(set);const engine=createEngine(data);
 for(const c of set.cards){
  const p=data.cards.find(p=>p.id===c.id);assert(p);
  for(const f of base.PRINTED)assert.deepEqual(p[f],c[f],c.key+'.'+f);
  assert.equal(p.characterId,c.characterId);assert.equal(p.role,c.role);assert.equal(p.collaboration,c.collaboration);
  assert.equal(p.sentry,c.element!=='NONE');assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,c.atk.includes('revive'));
 }
 const keys=required.map(r=>r[0]).filter(k=>k!=='chopper-heavy'),id=k=>set.cards.find(c=>c.key===k).id,deck=keys.map(id);
 assert.deepEqual(engine.validatePlayableDeck(deck),[]);assert(engine.lineup(deck));
 const coverage=engine.deckCoverage(deck);assert.deepEqual(coverage,{1:3,2:3,3:4,4:2,5:2});
 const duplicate=deck.slice();duplicate[duplicate.indexOf(id('franky'))]=id('chopper-heavy');
 assert(engine.validatePlayableDeck(duplicate).some(e=>e.includes('personnage')));
 const noHealer=deck.map(v=>v===id('chopper-small')?id('chopper-heavy'):v);
 assert(engine.validatePlayableDeck(noHealer).length,'Heavy Chopper cannot replace the second P5 in pure OP deck');
 const board=['luffy','zoro','sanji','nami','brook'].map(k=>({cardId:id(k)})),player={board};
 assert.equal(engine.synergy(player,board[0],'faction'),40);
 return {cards:11,characters:10,qaDeck:deck,coverage,duplicateChopperRejected:true,heavyChopperNeedsExternalP5:true,factionSynergy:40};
}
module.exports={...base,SET,required,validateSet,profile,validateGame};
