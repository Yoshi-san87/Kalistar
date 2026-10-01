'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('./collaborations.js');
const Binder=require('./collection-binder.js');
const base={element:'ELECTRO',race:'HUMAIN',weapon:'Poing',positions:[3]};
const names=['Luffy','Zoro','Sanji','Nami','Usopp','Chopper','Chopper','Robin','Franky','Brook','Jinbe'];
const cards=names.map((name,i)=>({...base,id:String(49800101+i),name,characterId:'one-piece-'+name.toLowerCase(),title:i===6?'Heavy Point':'Fixture',faction:'ONEPIECE',collaboration:'ONEPIECE'}));

test('One Piece has one collaboration, eleven versions and ten characters',()=>{
  assert.equal(C.entries.filter(entry=>entry.faction==='ONEPIECE').length,1);
  assert.deepEqual(C.of(cards[0]),{id:'one-piece',faction:'ONEPIECE',title:'One Piece'});
  assert(cards.every(card=>C.matches(card,'one-piece')&&Binder.matchesScope(card,'one-piece')));
  assert(cards.every(card=>!Binder.matchesScope(card,'kalistar')&&!Binder.matchesScope(card,'resident-evil')));
  assert.equal(cards.length,11); assert.equal(Binder.groupCards(cards).length,10);
  assert.equal(Binder.groupCards(cards).find(group=>group[0].name==='Chopper').length,2);
  assert.equal(C.choices(cards).filter(([id])=>id==='ONEPIECE').length,1);
  assert(!C.choices([]).some(([id])=>id==='ONEPIECE'));
  assert.equal(C.universe({faction:'ONEPIECE',collaboration:'RE1'}),'ONEPIECE');
  assert.equal(C.universe({faction:'Chroma',characterId:'one-piece-luffy'}),'kalistar');
  assert.equal(C.universe({faction:' onepiece '}),'ONEPIECE');
});

test('binder renders exactly one One Piece scope and retains one faction option',t=>{
  const previous=globalThis.KalistarCardMedia;
  globalThis.KalistarCardMedia={image:card=>'/fixture/'+card.id+'.png'};
  t.after(()=>{globalThis.KalistarCardMedia=previous;});
  const binder=Binder.create({data:{cards,elements:{ELECTRO:{id:'ELECTRO',label:'Electricite',color:'FFDD00'}}}});
  const html=binder.render();
  const scopes=html.match(/<div class="cb-scopes"[^>]*>([\s\S]*?)<\/div>/)[1];
  assert.equal((scopes.match(/data-id="one-piece"/g)||[]).length,1);
  assert.match(scopes,/data-id="one-piece"[^>]*>[\s\S]*?One Piece <b>11<\/b>/);
  assert.equal((html.match(/<option value="ONEPIECE"/g)||[]).length,1);
  assert.equal(/data-binder-action="scope"[^>]*data-id="(?:onepiece|ONEPIECE)"/.test(html),false);
  assert.equal(binder.inspect().scope,'owned');
});

test('new faction and race routes are local; existing SKULLZ and CERELF routes stay shared',()=>{
  assert.equal(C.asset('factions','ONEPIECE'),'assets/factions/ONEPIECE.png');
  assert.equal(C.asset('races','SHARKAN'),'assets/races/SHARKAN.png');
  for(const race of ['SKULLZ','CERELF','CYBORG','HUMAIN'])assert.equal(C.asset('races',race),'shared/races/'+race+'.png');
  for(const relative of ['assets/factions/ONEPIECE.png','assets/races/SHARKAN.png'])assert(fs.existsSync(path.join(__dirname,relative)));
});
