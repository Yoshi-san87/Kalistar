'use strict';
const assert=require('node:assert/strict'),base=require('../2026-09-27-metal-gear-mines/model.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds,weapons=require('../../../V3/donnees/armes.json');
const SET='2026-10-01-resident-evil';
const required=[['jill1','RE1',2,[2],'Gun'],['jill3','RE3',3,[3],'Gun'],['jill5','RE5',3,[3],'Gun'],['leon2','RE2',3,[3],'Gun'],['leon4','RE4',3,[3],'Gun'],['leon6','RE6',3,[3],'Gun'],['leon9','RE9',3,[3],'Poing'],['ada2','RE2',3,[3],'Gun'],['ada4','RE4',2,[2,3],'Dague'],['ada6','RE6',3,[3,4],'Gun'],['chris1','RE1',1,[1],'Gun'],['chris5','RE5',1,[1],'Poing'],['chris6','RE6',1,[1],'Gun'],['chris7','RE7',1,[1],'Gun'],['chris8','RE8',1,[1],'Gun'],['claire2','RE2',2,[2],'Gun'],['nemesis3','RE3',1,[1],'Poing'],['mrx2','RE2',1,[1],'Poing'],['dimitrescu8','RE8',3,[3,1],'Dague'],['heisenberg8','RE8',2,[2],'Marteau'],['beneviento8','RE8',3,[3],'Orbe'],['moreau8','RE8',4,[4],'Lance'],['salazar4','RE4',5,[5,4],'Orbe'],['eveline7','RE7',5,[5,3],'Orbe'],['saddler4','RE4',4,[4],'B\u00e2ton']];
function validateSet(set){
 assert.equal(set.id,SET);assert.equal(set.officialCollaboration,false);assert.deepEqual(set.arenas,[]);assert.deepEqual(set.presets,[]);
 assert.deepEqual(set.cards.map(c=>c.key),required.map(r=>r[0]));assert.equal(new Set(set.cards.map(c=>c.id)).size,25);
 for(const [i,c] of set.cards.entries()){
  const r=required[i];assert.equal(c.id,String(49700101+i));assert.equal(c.faction,r[1]);assert.equal(c.collaboration,c.faction);assert.equal(c.role,r[2]);assert.deepEqual(c.positions,r[3]);assert.equal(c.weapon,r[4]);
  assert.match(c.characterId,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert(Object.hasOwn(weapons,c.weapon));
  assert(c.name.length<=30&&c.title.length<=35&&c.job.length<=22&&c.description.length>=170&&c.description.length<=220,c.key+' text budget '+c.description.length);
  assert.match(c.art,/^RE_[A-Za-z0-9_]+[.]png$/);assert.deepEqual(c.crop,{zoom:1,x:0,y:0});
  for(const side of ['atk','defense']){assert.equal(c[side].length,6);assert(c[side].filter(v=>typeof v==='number').length>=3);c[side].forEach((v,j)=>{const max=bounds[c.role][side][j],min=bounds[c.role][side][j+1]||0;if(typeof v==='number')assert(Number.isInteger(v)&&v>=min&&v<=max,c.key+' '+side+' D'+(6-j));else assert((side==='atk'?['guard','revive','retry','mana','buff_atk','death']:['retry','dodge']).includes(v));});}
  if(c.atk.includes('guard'))assert([1,5].includes(c.role));if(c.atk.includes('revive'))assert.equal(c.role,5);
  for(const [field,side] of [['magic','atk'],['barriers','defense']]){assert.equal(new Set(c[field]).size,c[field].length);assert(c[field].every(d=>Number.isInteger(d)&&d>=1&&d<=6&&typeof c[side][6-d]==='number'));}
  if(c.element==='NONE')assert.equal(c.magic.length+c.barriers.length,0);
 }
 for(const [prefix,id,n] of [['jill','jill-valentine-re',3],['leon','leon-kennedy-re',4],['ada','ada-wong-re',3],['chris','chris-redfield-re',5]]){const family=set.cards.filter(c=>c.key.startsWith(prefix));assert.equal(family.length,n);assert(family.every(c=>c.characterId===id));}
 assert.equal(new Set(set.cards.map(c=>c.characterId)).size,14);
 const by=k=>set.cards.find(c=>c.key===k);assert.equal(new Set(['jill1','jill3','jill5'].map(k=>by(k).element)).size,3);
 for(const [k,e] of [['dimitrescu8','HEMATO'],['beneviento8','NECRO'],['moreau8','HYDRO'],['eveline7','NECRO']])assert.equal(by(k).element,e);assert.equal(by('dimitrescu8').race,'VAMP');
 return set;
}
function profile(c,D){return {...base.profile(c,D),source:'Kalistar x Resident Evil - fan crossover non officiel',visual_revision:'V4-'+SET};}
function validateGame(data,set,createEngine){validateSet(set);const engine=createEngine(data);for(const c of set.cards){const p=data.cards.find(p=>p.id===c.id);assert(p);for(const f of base.PRINTED)assert.deepEqual(p[f],c[f],c.key+'.'+f);assert.equal(p.characterId,c.characterId);assert.equal(p.role,c.role);assert.equal(p.collaboration,c.collaboration);assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,c.atk.includes('revive'));}
 for(const family of ['jill','leon','ada','chris']){const variants=set.cards.filter(c=>c.key.startsWith(family));assert.equal(new Set(variants.map(c=>data.cards.find(p=>p.id===c.id).characterId)).size,1);}
 const keys=['chris8','dimitrescu8','claire2','heisenberg8','ada6','leon4','moreau8','salazar4','eveline7','beneviento8'];
 const id=k=>set.cards.find(c=>c.key===k).id,deck=keys.map(id);
 assert.deepEqual(engine.validatePlayableDeck(deck),[]);
 const coverage=engine.deckCoverage(deck);assert(Object.values(coverage).every(n=>n>=2));assert(engine.lineup(deck));
 const duplicate=deck.slice();duplicate[9]=id('leon2');assert(engine.validatePlayableDeck(duplicate).some(e=>e.includes('personnage')));
 const board=['leon2','claire2','leon4'].map(k=>({cardId:id(k)})),player={board};
 assert.equal(engine.synergy(player,board[0],'faction'),10);assert.equal(engine.synergy(player,board[2],'faction'),0);
 return {cards:25,characters:14,qaDeck:deck,coverage,duplicateFamilyRejected:true,episodeFactionsIndependent:true};
}
module.exports={...base,SET,required,validateSet,profile,validateGame};
