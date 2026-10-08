'use strict';
const assert=require('node:assert/strict'),base=require('../2026-09-27-metal-gear-mines/model.cjs');
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds,weapons=require('../../../V3/donnees/armes.json');
const SET='2026-10-08-final-fantasy-ix';
const KEYS=["djidane","vivi-feu","grenat","dagga","steiner","eiko","freyja","tarask","kuja","beate","pile","face","branet","garland","bach","markus","franck","cina","ruby","kweena","vivi-glace","vivi-foudre"];
const artPath=c=>'V4/propositions/2026-10-08-ff9/'+c.art;
function validateSet(set){
 assert.equal(set.id,SET);assert.equal(set.officialCollaboration,false);assert.deepEqual(set.arenas,[]);assert.deepEqual(set.presets,[]);
 assert.deepEqual(set.cards.map(c=>c.key),KEYS);
 assert.equal(new Set(set.cards.map(c=>c.characterId)).size,19);
 for(const [index,c]of set.cards.entries()){
  assert.equal(c.id,String(49901001+index));assert.equal(c.faction,'FF9');assert.equal(c.collaboration,'FF9');
  assert.match(c.characterId,/^[a-z0-9]+(?:-[a-z0-9]+)*-ff9$/);
  assert(c.name.length<=30&&c.title.length<=35&&c.job.length<=22);
  assert(c.description.length>=160&&c.description.length<=195,'Lore: '+c.key);
  assert.match(c.art,/^\d{2}-[a-z-]+-\d{2}\.png$/);
  assert(Object.hasOwn(weapons,c.weapon),c.weapon);assert(c.positions.includes(c.role));
  assert.equal(new Set(c.positions).size,c.positions.length);assert(c.positions.every(n=>Number.isInteger(n)&&n>=1&&n<=5));
  for(const side of ['atk','defense']){
   assert.equal(c[side].length,6);assert(c[side].filter(v=>typeof v==='number').length>=3);
   c[side].forEach((v,i)=>{
    if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[c.role][side][i+1]||0)&&v<=bounds[c.role][side][i],c.key+' '+side+' D'+(6-i));
    else assert((side==='atk'?['guard','retry','mana','revive','buff_atk','death']:['retry','dodge']).includes(v));
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
 const of=key=>set.cards.find(c=>c.key===key);
 assert.equal(of('grenat').characterId,of('dagga').characterId);assert.notEqual(of('branet').characterId,of('dagga').characterId);
 assert.deepEqual(['vivi-feu','vivi-glace','vivi-foudre'].map(k=>of(k).characterId),Array(3).fill('vivi-ff9'));
 assert.deepEqual(['vivi-feu','vivi-glace','vivi-foudre'].map(k=>of(k).element),['PYRO','CRYO','ELECTRO']);
 const races={freyja:'MICE',kweena:'BATRA',pile:'RATZ',face:'RATZ',djidane:'MACAKO',cina:'MACAKO',markus:'SHARKAN','vivi-feu':'ROBOT','vivi-glace':'ROBOT','vivi-foudre':'ROBOT'};
 for(const [k,race]of Object.entries(races))assert.equal(of(k).race,race);
 return set;
}
function donor(c,D){
 const input=Object.fromEntries(D.FIELDS.filter(k=>k in c).map(k=>[k,c[k]]));
 return D.validate({...input,faction:'Chroma'},{final:true});
}
function profile(c,D){
 return {...D.profileCard(donor(c,D),c.id),...Object.fromEntries(base.PRINTED.map(k=>[k,c[k]])),
 role:c.role,characterId:c.characterId,collaboration:'FF9',officialCollaboration:false,canGuard:c.atk.includes('guard'),canHeal:c.atk.includes('revive'),sentry:c.element!=='NONE',
 advantage:30,disadvantage:30,source:'Kalistar x Final Fantasy IX - fan crossover non officiel',
 artworkSource:artPath(c),visual_revision:'V4-'+SET};
}
function validateProfile(p,c){
 assert.equal(p.id,c.id);assert.equal(p.characterId,c.characterId);assert.equal(p.role,c.role);
 for(const f of base.PRINTED)assert.deepEqual(p[f],c[f],c.key+'.'+f);
 assert.equal(p.artworkSource,artPath(c));assert.equal(p.sentry,c.element!=='NONE');
 assert.equal(p.canGuard,c.atk.includes('guard'));assert.equal(p.canHeal,c.atk.includes('revive'));
 assert.equal(p.collaboration,'FF9');assert.equal(p.officialCollaboration,false);assert.notEqual(p.testOnly,true);
}
const deckKeys=[
 ['djidane','vivi-feu','grenat','steiner','eiko','freyja','tarask','beate','markus','ruby'],
 ['dagga','vivi-glace','kuja','pile','face','branet','garland','bach','franck','kweena'],
 ['djidane','vivi-foudre','cina','steiner','eiko','freyja','tarask','beate','markus','ruby']
];
function qaDecks(){return deckKeys.map(keys=>keys.map(k=>String(49901001+KEYS.indexOf(k))));}
function validateGame(data,set,createEngine){
 validateSet(set);
 for(const c of set.cards){const p=data.cards.find(p=>p.id===c.id);assert(p);for(const f of base.PRINTED)assert.deepEqual(p[f],c[f],c.key+'.'+f);assert.equal(p.characterId,c.characterId);assert.equal(p.role,c.role);}
 const E=createEngine(data),decks=qaDecks();
 for(const ids of decks)assert.deepEqual(E.validatePlayableDeck(ids),[]);
 assert.equal(new Set(decks.flat()).size,22);
 const a=decks[0].slice();a[0]=set.cards.find(c=>c.key==='vivi-glace').id;
 assert(E.validatePlayableDeck(a).length,'Duplicate Vivi must be rejected');
 const b=decks[0].slice();b[0]=set.cards.find(c=>c.key==='dagga').id;
 assert(E.validatePlayableDeck(b).length,'Grenat and Dagga must share one deck identity');
 return {cards:data.cards.length,added:22,qaDecks:decks,noPresetInstalled:true};
}
module.exports={...base,SET,KEYS,artPath,validateSet,donor,profile,validateProfile,qaDecks,validateGame};

