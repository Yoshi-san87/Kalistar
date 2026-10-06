'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),C=require('./weapon-cards.js'),T=require('./team-composition.js');
const {createEngine}=require('./engine.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const dataPromise=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const ids=['cryptown-oath-sword','cryptown-vigil-rifle','cryptown-watch-flail'],weapons=ids.map(id=>Q.catalogue.weapons.find(w=>w.id===id));
const allowed={'cryptown-oath-sword':['varkhen-kalistar'],'cryptown-vigil-rifle':['nereth-kalistar'],'cryptown-watch-flail':['draust-kalistar']};
const {legacyGame}=require('./fixtures/legacy-equipment.cjs');
function deckFor(E,data,c){const base=data.decks.player;const deck=base.map((_,i)=>base.map((id,j)=>i===j?c.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);assert(deck,c.id);return deck;}
test('Cryptown weapons respect their matching base family and faction, not names',async()=>{
  const data=await dataPromise;
  for(const w of weapons){
    Q.validateDefinition(w);assert.deepEqual(w.restrictions,{factions:['Cryptown'],families:[w.family]});
    assert.deepEqual([...new Set(data.cards.filter(c=>Q.compatible(w,c)).map(c=>c.characterId))].sort(),allowed[w.id]);
    for(const c of data.cards)assert.equal(Q.compatible(w,c),c.faction==='Cryptown'&&c.weapon===w.family);
    const c=data.cards.find(c=>c.characterId===allowed[w.id][0]);
    assert(Q.compatible(w,{...c,name:'Renamed',job:'Different job'}));
    for(const faction of [undefined,'Arborium','Draevenheim','CRYPTOWN'])assert(!Q.compatible(w,{...c,faction}));
    const html=C.markup(w,{cards:data.cards});assert(html.includes('Cryptown'));assert(!html.includes('SOLDAT'));assert(!html.includes('undefined'));
  }
});
test('one weapon slot, replacement, faction enforcement, profile and composition persistence',async()=>{
  const data=await dataPromise,E=createEngine(data),T0=T.create(E);let p=Q.profile('CRYPTOWN-TEST');
  for(const w of weapons)for(const characterId of allowed[w.id]){p=Q.equipProfile(p,characterId,w.id,data.cards,{expected:p.slots.weapon[characterId]||null});assert.deepEqual(Q.validateProfile(JSON.parse(JSON.stringify(p)),data.cards),p);}
  assert.throws(()=>Q.equipProfile(p,'ssilas',ids[0],data.cards),/incompatible/);
  const c=data.cards.find(c=>c.characterId==='varkhen-kalistar'),deck=deckFor(E,data,c),team=T0.equip(T0.fromPreset({name:'Cryptown',cards:deck}),c.id,ids[0]);
  assert.deepEqual(E.validateComposition(team),[]);const s=E.newGame(team,team,{mode:'local'}),snapshot=structuredClone(s.equipment);
  team.equipment[c.characterId]=ids[1];assert.deepEqual(s.equipment,snapshot);assert.deepEqual(E.restoreGame(s),s);
  const old=E.newGame(deck,deck,{equipment:[{},{}]});old.equipment.definitions=old.equipment.definitions.filter(w=>!ids.includes(w.id));assert.deepEqual(E.restoreGame(old),old);
});
test('all compatible printed editions receive the exact real bonus on either side, then lose it when inactive',async()=>{
  const data=await dataPromise,E=createEngine(data);
  for(const w of weapons)for(const c of data.cards.filter(c=>Q.compatible(w,c)))for(const side of [0,1]){
    const deck=deckFor(E,data,c),loadout={[c.characterId]:w.id};
    const s=E.newGame(deck,deck,{seed:'CRYPTOWN-TEST',mode:'local',kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
    E.autoDeploy(s,0);E.autoDeploy(s,1);const p=s.players[side],u=[...p.board.filter(Boolean),...p.reserve].find(v=>v.cardId===c.id);
    if(!p.board.includes(u)){const slot=c.positions[0]-1;E.recall(s,side,slot);E.deploy(s,side,u.uid,slot);}E.start(s);assert(!E.equipmentView(s,u).active);
    const before=structuredClone(s.players),keep=w.effect.when.activeAtMost||4;let n=1;
    if(w.effect.when.outnumbered||w.effect.when.activeAtMost)p.board=p.board.map(v=>{if(!v||v===u||n++<keep)return v;p.reserve.push(v);return null;});
    if(w.effect.when.reserveAtMost===0){for(const v of p.reserve)v.entered=true;p.dead.push(...p.reserve);p.reserve=[];}
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
  assert.deepEqual(weapons.map(w=>[w.family,w.effect.stat,w.effect.value,w.effect.trigger,w.effect.duration]),[['Ep\u00e9e longue','ATK',20,'TEAM_STATE','WHILE_TRUE'],['Gun','ATK',20,'TEAM_STATE','WHILE_TRUE'],['Fl\u00e9au','DEF',20,'TEAM_STATE','WHILE_TRUE']]);
  assert.deepEqual(weapons[0].effect.when,{outnumbered:true});assert.deepEqual(weapons[1].effect.when,{reserveAtMost:0});assert.deepEqual(weapons[2].effect.when,{activeAtMost:2});
  assert(weapons.every(w=>!w.changesFamily));assert.deepEqual(weapons.map(w=>w.collectible.number),['ARM-030','ARM-031','ARM-032']);
});

test('saved Cryptown equipment never turns Nereth or Morveth Death into numeric damage; Dodge and Reraise still work',async()=>{
  const data=await dataPromise,E=createEngine(data),decks=require('../expansions/2026-10-06-cryptown-scythe/model.cjs').qaDecks(data);
  for(const [characterId,cardId] of [['nereth-kalistar','49900601'],['morveth-kalistar','49900603']])for(const outcome of ['kill','dodge','reraise']){
    const s=legacyGame(E,...decks,{seed:'CRYPTOWN-DEATH',mode:'local',kalistel:false,equipment:[{[characterId]:ids[1]},{}]});
    E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
    const p=s.players[0],slot=p.board.findIndex(u=>u?.cardId===cardId),a=p.board[slot],b=s.players[1].board[0];
    for(const u of p.reserve)u.entered=true;p.dead.push(...p.reserve);p.reserve=[];
    assert(E.equipmentView(s,a).active);assert.equal(E.equipmentModifier(s,a,'ATK').value,20);
    if(outcome==='reraise')b.reraise=1;
    E.lock(s,slot,0);E.rollAttack(s,1);assert.equal(s.duel.attackValue,'death');
    E.rollDefense(s,outcome==='dodge'?1:6);E.assertState(s);
    assert.equal(s.duel.formula,undefined);assert.equal(s.match.events.at(-1).kill,outcome==='kill');
    if(outcome!=='kill')assert.equal(s.players[1].board[0].uid,b.uid);
    if(outcome==='dodge')assert.equal(s.match.events.at(-1).dodge,true);
    if(outcome==='reraise'){assert.equal(b.reraise,0);assert.equal(s.match.events.at(-1).reraise,true);}
    assert(!s.log.some(l=>l.text.includes(weapons[1].name)&&l.text.includes('+20 ATK')));
    assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
  }
});

test('active Cryptown equipment preserves Guard support without adding a second gift',async()=>{
  const data=await dataPromise,E=createEngine(data);
  for(const [characterId,weaponId] of [['varkhen-kalistar',ids[0]],['draust-kalistar',ids[2]]]){
    const c=data.cards.find(c=>c.characterId===characterId),deck=deckFor(E,data,c);
    const s=E.newGame(deck,deck,{seed:'CRYPTOWN-GUARD',mode:'local',kalistel:false,equipment:[{[characterId]:weaponId},{}]});
    E.autoDeploy(s,0);E.autoDeploy(s,1);const p=s.players[0],a=[...p.board.filter(Boolean),...p.reserve].find(u=>u.cardId===c.id);
    if(!p.board.includes(a)){const slot=c.positions[0]-1;E.recall(s,0,slot);E.deploy(s,0,a.uid,slot);}E.start(s);
    let n=1;p.board=p.board.map(u=>{if(!u||u===a||n++<2)return u;p.reserve.push(u);return null;});
    assert(E.equipmentView(s,a).active);E.lock(s,p.board.indexOf(a),s.players[1].board.findIndex(Boolean));
    E.rollAttack(s,1);assert.equal(s.phase,'guard');E.grantGuard(s,E.aiGuardChoice(s));E.assertState(s);
    assert.equal(s.duel.formula,undefined);assert.deepEqual(s.equipment.pending,{});
    assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),s);
  }
});
