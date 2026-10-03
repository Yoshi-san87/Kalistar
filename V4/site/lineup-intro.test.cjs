'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Intro=require('./lineup-intro.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const {createEngine}=require('./engine.js'),Composition=require('./team-composition.js');
const catalogue=buildCatalog();
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;};
test('five pairings retain saved order, captains, native clues and the entire engine snapshot',async()=>{
  const data=await catalogue,E=createEngine(data),T=Composition.create(E),team=T.normalize({name:'QA',cards:data.decks.player});
  team.captain=team.formation[2];team.equipment={momo:'little-joys-flute',balmhyr:'fallen-king-axe'};
  const state=E.newGame(team,team,{seed:'LINEUP',mode:'local'}),before=structuredClone(state);
  freeze(state);const result=Intro.describe(state,data.cards,{elements:data.elements,asset:(type,id)=>type+'/'+id});
  assert.equal(result.length,2);
  for(const side of result){
    assert.deepEqual(side.map(c=>c.cardId),team.formation);
    assert.equal(side.filter(c=>c.captain).length,1);
    for(const entry of side){const card=E.byId[entry.cardId];assert.equal(entry.clues.weapon.label,card.weapon);assert.equal(entry.clues.faction.label,card.faction);}
    const momo=side.find(c=>E.byId[c.cardId].characterId==='momo');assert.equal(momo.clues.weapon.label,'Instrument');
  }
  assert.deepEqual(state,before);assert.deepEqual(E.restoreGame(before),before);
});
test('all catalogue identities, collaborations and NONE are data driven',async()=>{
  const data=await catalogue;
  const state={players:[{board:data.cards.map(c=>({uid:c.id,cardId:c.id}))}]};
  const entries=Intro.describe(state,data.cards,{elements:data.elements,asset:(type,id)=>type+'/'+id})[0];
  assert.equal(entries.length,data.cards.length);
  for(let i=0;i<entries.length;i++){
    const c=data.cards[i],clues=entries[i].clues;
    assert.equal(clues.weapon.image,'armes/'+String(c.weapon_index).padStart(2,'0'));
    assert.equal(clues.faction.label,c.faction);
    if(c.element==='NONE'){assert.equal(clues.crystal.image,null);assert.equal(clues.crystal.label,'Sans cristal');}
    else assert.equal(clues.crystal.image,'cristaux/'+c.element);
    assert(!JSON.stringify(clues).includes('undefined'));
  }
});
test('missing identities have neutral clues and missing cards fail before mounting',()=>{
  const result=Intro.describe({players:[{board:[{cardId:'x'},null]}]},[{id:'x',name:'QA'}])[0];
  assert.equal(result[0].clues.weapon.image,null);assert.equal(result[0].clues.faction.image,null);
  assert.equal(result[0].clues.crystal.label,'Sans cristal');assert.equal(result[1],null);
  assert.throws(()=>Intro.play({shell:null,formations:[]}),/incomplete/);
});
test('normal sequence lasts 15.5 seconds, reduced sequence 4.2 seconds',()=>{
  assert.equal(Intro.roles.length,5);
  assert.equal(Object.values(Intro.timing).reduce((a,b)=>a+b,0)*5,15500);
  assert.equal(Object.values(Intro.reducedTiming).reduce((a,b)=>a+b,0)*5,4200);
});
