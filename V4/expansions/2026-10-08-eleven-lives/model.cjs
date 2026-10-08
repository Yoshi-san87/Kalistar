'use strict';
const assert=require('node:assert/strict'),base=require('../2026-09-27-metal-gear-mines/model.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds,weapons=require('../../../V3/donnees/armes.json');
const SET='2026-10-08-eleven-lives';
const KEYS=['vaelrik','neriska','ssahel','odran','tivrek','calven','rovel','maelor','djarell','veyrac','helior'];
const artPath=c=>'V4/propositions/2026-10-07-twenty-lives/'+c.art;
function validateSet(set){
 assert.equal(set.id,SET);assert.equal(set.officialCollaboration,false);assert.deepEqual(set.arenas,[]);assert.deepEqual(set.presets,[]);
 assert.deepEqual(set.cards.map(c=>c.key),KEYS);
 assert.equal(new Set(set.cards.map(c=>c.characterId)).size,11);
 for(const [index,c]of set.cards.entries()){
  assert.equal(c.id,String(49900901+index));assert.equal(c.characterId,c.key+'-kalistar');
  assert(c.name.length<=30&&c.title.length<=35&&c.job.length<=22);
  assert(c.description.length>=160&&c.description.length<=195,'Lore: '+c.key);
  assert.match(c.art,/^\d{2}-[a-z]+-01\.png$/);
  assert(Object.hasOwn(weapons,c.weapon),c.weapon);assert(c.positions.includes(c.role));
  assert.equal(new Set(c.positions).size,c.positions.length);assert(c.positions.every(n=>Number.isInteger(n)&&n>=1&&n<=5));
  for(const side of ['atk','defense']){
   assert.equal(c[side].length,6);
   c[side].forEach((v,i)=>{
    if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[c.role][side][i+1]||0)&&v<=bounds[c.role][side][i],c.key+' '+side+' D'+(6-i));
    else assert((side==='atk'?['guard','retry','mana','revive','buff_atk']:['retry','dodge']).includes(v));
   });
  }
  if(c.atk.includes('guard'))assert([1,5].includes(c.role));
  if(c.atk.includes('revive'))assert.equal(c.role,5);
  for(const [field,side]of [['magic','atk'],['barriers','defense']]){
   assert.equal(new Set(c[field]).size,c[field].length);
   assert(c[field].every(d=>Number.isInteger(d)&&d>=1&&d<=6&&typeof c[side][6-d]==='number'));
  }
  if(c.element==='NONE')assert.equal(c.magic.length+c.barriers.length,0);
 }
 assert.deepEqual(set.cards.filter(c=>c.race==='OKAMI').map(c=>c.faction),['Grivka','Grivka']);
 return set;
}
function donor(c,D){
 const input=Object.fromEntries(D.FIELDS.filter(k=>k in c).map(k=>[k,c[k]]));
 return D.validate({...input,faction:c.faction==='Grivka'?'Chroma':c.faction==='Ysilis'?'Niveria':c.faction},{final:true});
}
function profile(c,D){
 return {...D.profileCard(donor(c,D),c.id),...Object.fromEntries(base.PRINTED.map(k=>[k,c[k]])),
 role:c.role,characterId:c.characterId,canGuard:c.atk.includes('guard'),canHeal:c.atk.includes('revive'),sentry:c.element!=='NONE',
 advantage:30,disadvantage:30,source:'Personnage original Kalistar, selection utilisateur du 8 octobre 2026',
 artworkSource:artPath(c),visual_revision:'V4-'+SET};
}
function validateProfile(p,c){
 assert.equal(p.id,c.id);assert.equal(p.characterId,c.characterId);assert.equal(p.role,c.role);
 for(const f of base.PRINTED)assert.deepEqual(p[f],c[f],c.key+'.'+f);
 assert.equal(p.artworkSource,artPath(c));assert.equal(p.sentry,c.element!=='NONE');
 assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,c.atk.includes('revive'));
 assert.equal(p.collaboration,undefined);assert.notEqual(p.testOnly,true);
}
function qaDecks(data){
 const decks=[KEYS.filter(k=>k!=='helior'),KEYS.filter(k=>k!=='vaelrik')].map(keys=>keys.map(k=>String(49900901+KEYS.indexOf(k))));
 for(const ids of decks)for(const id of ids)assert(data.cards.some(c=>c.id===id));
 return decks;
}
function validateGame(data,set,createEngine){
 validateSet(set);
 for(const c of set.cards){const p=data.cards.find(p=>p.id===c.id);assert(p);for(const f of base.PRINTED)assert.deepEqual(p[f],c[f],c.key+'.'+f);assert.equal(p.characterId,c.characterId);assert.equal(p.role,c.role);}
 const E=createEngine(data),decks=qaDecks(data);
 for(const ids of decks)assert.deepEqual(E.validatePlayableDeck(ids),[]);
 assert.equal(new Set(decks.flat()).size,11);
 return {cards:data.cards.length,added:11,qaDecks:decks,noPresetInstalled:true};
}
module.exports={...base,SET,KEYS,artPath,validateSet,donor,profile,validateProfile,qaDecks,validateGame};

