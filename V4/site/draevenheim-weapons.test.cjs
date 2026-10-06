'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),C=require('./weapon-cards.js'),T=require('./team-composition.js');
const {createEngine}=require('./engine.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const dataPromise=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const ids=['draevenheim-wing-spear','draevenheim-crimson-crossbow'],weapons=ids.map(id=>Q.catalogue.weapons.find(w=>w.id===id));
const allowed={'draevenheim-wing-spear':['orven-kalistar'],'draevenheim-crimson-crossbow':[]};
function deckFor(E,data,c){const base=data.decks.player;const deck=base.map((_,i)=>base.map((id,j)=>i===j?c.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);assert(deck,c.id);return deck;}
test('Draevenheim weapons require faction and base family, never names or a similar faction',async()=>{
  const data=await dataPromise;
  for(const w of weapons){
    Q.validateDefinition(w);assert.deepEqual(w.restrictions,{factions:['Draevenheim'],families:[w.family]});
    assert.deepEqual([...new Set(data.cards.filter(c=>Q.compatible(w,c)).map(c=>c.characterId))].sort(),allowed[w.id]);
    for(const c of data.cards)assert.equal(Q.compatible(w,c),c.faction==='Draevenheim'&&c.weapon===w.family);
    const c={...data.cards.find(c=>c.characterId==='orven-kalistar'),weapon:w.family};
    assert(Q.compatible(w,{...c,name:'Renamed',job:'Different job'}));
    for(const faction of [undefined,'Arborium','Dravenheim','DRAEVENHEIM'])assert(!Q.compatible(w,{...c,faction}));
    const html=C.markup(w,{cards:data.cards});assert(html.includes('Draevenheim'));assert(!html.includes('SOLDAT'));assert(!html.includes('undefined'));
  }
});
test('one weapon slot, replacement, faction enforcement, profile and composition persistence',async()=>{
  const data=await dataPromise,E=createEngine(data),T0=T.create(E);let p=Q.profile('DRAEVENHEIM-TEST');
  for(const w of weapons)for(const characterId of allowed[w.id]){p=Q.equipProfile(p,characterId,w.id,data.cards,{expected:p.slots.weapon[characterId]||null});assert.deepEqual(Q.validateProfile(JSON.parse(JSON.stringify(p)),data.cards),p);}
  assert.throws(()=>Q.equipProfile(p,'ssilas',ids[0],data.cards),/incompatible/);
  const c=data.cards.find(c=>c.characterId==='orven-kalistar'),deck=deckFor(E,data,c),team=T0.equip(T0.fromPreset({name:'Draevenheim',cards:deck}),c.id,ids[0]);
  assert.deepEqual(E.validateComposition(team),[]);const s=E.newGame(team,team,{mode:'local'}),snapshot=structuredClone(s.equipment);
  team.equipment[c.characterId]=ids[1];assert.deepEqual(s.equipment,snapshot);assert.deepEqual(E.restoreGame(s),s);
  const old=E.newGame(deck,deck,{equipment:[{},{}]});old.equipment.definitions=old.equipment.definitions.filter(w=>!ids.includes(w.id));assert.deepEqual(E.restoreGame(old),old);
});
test('compatible printed editions receive the exact real bonus on either side, then lose it when inactive',async()=>{
  const data=await dataPromise,E=createEngine(data);
  for(const w of weapons)for(const c of data.cards.filter(c=>Q.compatible(w,c)))for(const side of [0,1]){
    const deck=deckFor(E,data,c),loadout={[c.characterId]:w.id};
    const s=E.newGame(deck,deck,{seed:'DRAEVENHEIM-TEST',mode:'local',kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
    E.autoDeploy(s,0);E.autoDeploy(s,1);const p=s.players[side],u=[...p.board.filter(Boolean),...p.reserve].find(v=>v.cardId===c.id);
    if(!p.board.includes(u)){const slot=c.positions[0]-1;E.recall(s,side,slot);E.deploy(s,side,u.uid,slot);}E.start(s);assert(!E.equipmentView(s,u).active);
    const before=structuredClone(s.players),keep=w.effect.when.activeAtMost||4;let n=1;
    p.board=p.board.map(v=>{if(!v||v===u||n++<keep)return v;p.reserve.push(v);return null;});
    E.assertState(s);assert(E.equipmentView(s,u).active);assert.equal(E.equipmentModifier(s,u,w.effect.stat).value,20);
    const recovered=E.clone(s);recovered.players=before;assert(!E.equipmentView(recovered,recovered.players[side].board.find(v=>v?.uid===u.uid)).active);
    const enemy=s.players[1-side].board.find(Boolean),attack=w.effect.stat==='ATK',a=attack?u:enemy,b=attack?enemy:u;s.turn=attack?side:1-side;
    E.lock(s,s.players[s.turn].board.indexOf(a),s.players[1-s.turn].board.indexOf(b));
    E.rollAttack(s,6-E.card(a).atk.findIndex(v=>typeof v==='number'));E.rollDefense(s,6-E.card(b).defense.findIndex(v=>typeof v==='number'));
    const f=s.duel.formula;assert.equal(f[attack?'equipmentAttack':'equipmentDefense'],20);assert.equal(f[attack?'equipmentDefense':'equipmentAttack'],0);
    assert.equal(f.attack,Math.max(0,f.baseAttack+f.weapon+f.element+f.faction+f.buff+f.barrier+f.arenaAttack+(f.captainAttack||0)+f.equipmentAttack));
    assert.equal(f.defense,Math.max(0,f.baseDefense+f.race+f.arenaDefense+f.ward+(f.captainDefense||0)+f.equipmentDefense));
    assert.equal(f.weapon,data.weapons[E.card(a).weapon][E.card(b).weapon]);
    assert(s.log.some(l=>l.text.includes(w.name)&&l.text.includes('+20 '+w.effect.stat)));assert.deepEqual(s.equipment.pending,{});E.assertState(s);assert.deepEqual(E.restoreGame(s),s);
    s.phase='over';assert(!E.equipmentView(s,u).active);
  }
});
test('bounded state-based effects reuse existing families and do not create a second attack',()=>{
  assert.deepEqual(weapons.map(w=>[w.family,w.effect.stat,w.effect.value,w.effect.trigger,w.effect.duration]),[['Lance','DEF',20,'TEAM_STATE','WHILE_TRUE'],['Arc','ATK',20,'TEAM_STATE','WHILE_TRUE']]);
  assert.deepEqual(weapons[0].effect.when,{outnumbered:true});assert.deepEqual(weapons[1].effect.when,{activeAtMost:2});
  assert(weapons.every(w=>!w.changesFamily));assert.deepEqual(weapons.map(w=>w.collectible.number),['ARM-028','ARM-029']);
});
