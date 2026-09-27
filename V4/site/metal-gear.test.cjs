'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./collaborations.js');
const Binder=require('./collection-binder.js');
const Deck=require('./deck-builder.js');
const {buildCatalog}=require('../atelier/game-catalog.cjs');
const {createEngine}=require('./engine.js');
const base=require('../atelier/data/references.json').cards[0].card;
const cards=['MGS1','MGS2','MGS4','MGS1'].map((faction,i)=>({...base,id:String(49998000+i),name:i===3?'MERYL':'SOLID SNAKE',title:faction,characterId:i===3?'meryl-metal-gear':'solid-snake-metal-gear',faction,collaboration:faction,role:3,positions:[1,2,3],atk:[230,190,150,110,70,30],defense:[230,190,150,110,70,30],magic:[],barriers:[]}));
test('Metal Gear episodes have independent factions and V4 banner routes',()=>{
  assert.deepEqual(cards.map(C.universe),['MGS1','MGS2','MGS4','MGS1']);
  for(const faction of ['MGS1','MGS2','MGS4']){
    assert.equal(C.asset('factions',faction),'assets/factions/'+faction+'.png');
    assert(C.choices(cards).some(([key])=>key===faction));
    assert(!C.choices([]).some(([key])=>key===faction));
  }
  assert.deepEqual(Binder.groupCards(cards).map(g=>g.length),[3,1]);
});
test('Snake versions exclude each other; faction bonus never crosses episodes',async()=>{
  const published=cards.map(profile=>({id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'}));
  const data=await buildCatalog({published}),engine=createEngine(data);
  const model=Deck.createModel({data,engine,registry:{owned:()=>[{}],deckErrors:()=>[]},userId:'fixture'});
  const slots=Array(10).fill(null);slots[0]=cards[0].id;
  for(const c of cards.slice(1,3))assert.equal(model.candidate(slots,1,c.id).allowed,false);
  assert.equal(model.candidate(slots,0,cards[1].id).allowed,true);
  assert.equal(model.candidate(slots,1,cards[3].id).affinities.faction.bonus,10);
  slots[0]=cards[1].id;
  assert.equal(model.candidate(slots,1,cards[3].id).affinities.faction.bonus,0);
});
test('Metal Gear is visible in the collection without changing shared character identity',t=>{
  const previous=globalThis.KalistarCardMedia;
  globalThis.KalistarCardMedia={image:c=>'/fixture/'+c.id+'.png'};
  t.after(()=>{globalThis.KalistarCardMedia=previous;});
  const html=Binder.create({data:{cards,elements:{ELECTRO:{id:'ELECTRO',label:'Electricite',color:'FFDD00'}}}}).render();
  for(const faction of ['MGS1','MGS2','MGS4'])assert(html.includes('<option value="'+faction+'"'));
  if(typeof Binder.matchesScope==='function'){
    assert(cards.every(c=>Binder.matchesScope(c,'metal-gear')));
    assert(!Binder.matchesScope({...cards[0],faction:'FF10',collaboration:'FF10'},'metal-gear'));
    assert.match(html,/data-universe="metal-gear"[^>]*>[\s\S]*?Metal Gear <b>4<\/b>/);
  }else for(const id of ['mgs1','mgs2','mgs4'])assert(html.includes('data-collaboration="'+id+'"'));
});
