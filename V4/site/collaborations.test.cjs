'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('./collaborations.js');
const Binder=require('./collection-binder.js');
const Stats=require('./statistics.js');
const Deck=require('./deck-builder.js');
const {buildCatalog}=require('../atelier/game-catalog.cjs');
const {createEngine}=require('./engine.js');
const base=require('../atelier/data/references.json').cards[0].card;
const cards=[
  {id:'49998100',characterId:'devola-nier',name:'DEVOLA',title:'Automata',faction:'NieR',collaboration:'NieR'},
  {id:'49998101',characterId:'devola-nier',name:'DEVOLA',title:'Replicant',faction:'Replicant',collaboration:'Replicant'},
  {id:'49998102',characterId:'popola-nier',name:'POPOLA',title:'Automata',faction:'NieR',collaboration:'NieR'},
  {id:'49998103',characterId:'popola-nier',name:'POPOLA',title:'Replicant',faction:'Replicant',collaboration:'Replicant'}
].map(c=>({...base,...c,role:5,positions:[3,5],atk:[170,140,100,80,'retry','revive'],defense:[200,160,130,90,60,25],magic:[6,5],barriers:[6]}));

test('collaboration follows the version metadata, never the shared character suffix',()=>{
  assert.deepEqual(cards.map(C.universe),['NieR','Replicant','NieR','Replicant']);
  assert.equal(C.universe({characterId:'devola-nier',faction:'Chroma'}),'kalistar');
  assert.equal(C.universe({faction:'Replicant',collaboration:'NieR'}),'Replicant');
  assert.equal(C.universe({faction:'Chroma',collaboration:'replicant'}),'Replicant');
  assert.equal(C.universe({faction:'Chroma',collaboration:'<script>'}),'kalistar');
  assert.deepEqual(cards.filter(c=>C.matches(c,'replicant')).map(c=>c.id),['49998101','49998103']);
  assert.deepEqual(cards.filter(c=>C.matches(c,'nier')).map(c=>c.id),['49998100','49998102']);
});

test('faction media is V4-local while legacy assets retain their routes',()=>{
  for(const faction of ['FF7','FF8','NieR','Replicant'])assert.equal(C.asset('factions',faction),'assets/factions/'+faction+'.png');
  assert.equal(C.asset('factions','Chroma'),'shared/factions/Chroma.png');
  assert.equal(C.asset('factions','Solaria'),'assets/factions/Solaria.png');
  assert.equal(C.universe({faction:'Solaria'}),'kalistar');
  assert.equal(C.asset('races','ANDROID'),'assets/races/ANDROID.png');
  assert.equal(C.asset('races','ROBOT'),'shared/races/ROBOT.png');
  assert.equal(C.asset('armes','Epée longue'),'shared/armes/Ep%C3%A9e%20longue.png');
});

test('universe choices expose Replicant only when its versions exist',()=>{
  assert.deepEqual(C.choices([]),[['FF7','FF7'],['FF8','FF8']]);
  assert.deepEqual(C.choices(cards),[['FF7','FF7'],['FF8','FF8'],['NieR','NieR'],['Replicant','Replicant']]);
});

test('collection renders separate scope counts but keeps both versions in one character group',t=>{
  const previous=globalThis.KalistarCardMedia;
  globalThis.KalistarCardMedia={image:c=>'/fixture/'+c.id+'.png'};
  t.after(()=>{globalThis.KalistarCardMedia=previous;});
  const binder=Binder.create({data:{cards,elements:{ELECTRO:{id:'ELECTRO',label:'Electricite',color:'FFDD00'}}}});
  const html=binder.render();
  assert.match(html,/data-collaboration="replicant"[^>]*title="Collaboration NieR Replicant"[^>]*>.*?Replicant <b>2<\/b>/);
  assert.match(html,/data-collaboration="nier"[^>]*title="Collaboration NieR:Automata"[^>]*>.*?NieR <b>2<\/b>/);
  assert.match(html,/<option value="Replicant" >Replicant<\/option>/);
  assert.deepEqual(Binder.groupCards(cards).map(g=>g.map(c=>c.id)),[['49998100','49998101'],['49998102','49998103']]);
  assert.equal(binder.inspect().scope,'owned');
});

test('statistics filter versions before aggregating a shared character and retain independent totals',()=>{
  const db={instances:()=>[{}],matches:()=>[],career:id=>({history:[{cardId:id,participated:true,partial:false,matchId:id,finishedAt:'2026-09-23',side:0,winner:0,kills:id.endsWith('1')?5:1}]})};
  const all=Stats.rows({cards},db,{...Stats.defaults});
  assert.equal(all.length,2);assert.equal(all[0].versions.length,2);assert.equal(all[0].kills,6);
  const replicant=Stats.rows({cards},db,{...Stats.defaults,collab:'Replicant'});
  assert.equal(replicant.length,2);assert.equal(replicant[0].versions.length,1);assert.equal(replicant[0].kills,5);
  assert(replicant.every(row=>row.versions.every(c=>c.faction==='Replicant')));
  const automata=Stats.rows({cards},db,{...Stats.defaults,collab:'NieR'});
  assert.equal(automata[0].kills,1);assert(automata.every(row=>row.versions.every(c=>c.faction==='NieR')));
  assert.equal(Stats.rows({cards},db,{...Stats.defaults,collab:'kalistar'}).length,0);
});

test('deck builder keeps shared-character exclusion and separate faction synergies',async()=>{
  const published=cards.map(profile=>({id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'}));
  const data=await buildCatalog({published}),engine=createEngine(data);
  const model=Deck.createModel({data,engine,registry:{owned:()=>[{}],deckErrors:()=>[]},userId:'fixture'});
  const slots=Array(10).fill(null);slots[0]=cards[0].id;
  assert.equal(model.candidate(slots,1,cards[1].id).allowed,false);
  assert.match(model.candidate(slots,1,cards[1].id).reason,/Une seule carte par personnage/);
  assert.equal(model.candidate(slots,0,cards[1].id).allowed,true,'same slot can switch version');
  assert.equal(model.candidate(slots,1,cards[3].id).affinities.faction.bonus,0);
  assert.equal(model.candidate(slots,1,cards[2].id).affinities.faction.bonus,10);
  assert.deepEqual(model.groups([cards[0].id,cards[3].id],'faction').map(g=>g.value).sort(),['NieR','Replicant']);
});

test('browser boot loads collaboration metadata before all three consumers',()=>{
  const boot=fs.readFileSync(path.join(__dirname,'boot.js'),'utf8');
  for(const script of ['collection-binder.js','statistics.js','app.js'])assert(boot.indexOf("'collaborations.js'")<boot.indexOf("'"+script+"'"));
});
