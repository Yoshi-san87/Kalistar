'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),T=require('./team-composition.js');
const {weapons:previous,legacyGame}=require('./fixtures/legacy-equipment.cjs');
const {buildCatalog}=require('../atelier/game-catalog.cjs'),{createEngine}=require('./engine.js');
const dataPromise=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const expected={
  'wardens-spear':['brask-kalistar','karrok-kalistar','kimahri-ff10','nazar','ward-ff8'],
  'soldiers-blade':['isvel-kalistar','liorne-kalistar'],
  'commanders-sabre':[],
  'arborium-twinstring-bow':['saelor-kalistar','ssilas'],
  'arborium-thorn-dagger':[],
  'draevenheim-wing-spear':['orven-kalistar'],
  'draevenheim-crimson-crossbow':[],
  'cryptown-oath-sword':['varkhen-kalistar'],
  'cryptown-vigil-rifle':['nereth-kalistar'],
  'cryptown-watch-flail':['draust-kalistar'],
  'rhinoz-ancestral-horn':[]
};
const byId=id=>Q.catalogue.weapons.find(w=>w.id===id);
function deckFor(E,data,c){const base=data.decks.player;return base.map((_,i)=>base.map((id,j)=>i===j?c.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);}

test('all weapons keep their origins and effects AND require their printed family',async()=>{
  const {cards}=await dataPromise;assert.equal(Q.catalogue.weapons.length,33);
  assert.deepEqual(Q.catalogue.weapons.filter(w=>!w.restrictions.characterIds).map(w=>w.id).sort(),Object.keys(expected).sort());
  for(const w of Q.catalogue.weapons){
    const old=previous.find(p=>p.id===w.id);Q.validateDefinition(w);
    assert.deepEqual(w,{...old,restrictions:{...old.restrictions,families:[old.family]}});
    if(w.restrictions.characterIds){
      for(const c of cards)assert.equal(Q.compatible(w,c),Q.compatible(old,c)&&c.weapon===w.family,w.id+' '+c.id);
      continue;
    }
    const actual=[...new Set(cards.filter(c=>Q.compatible(w,c)).map(c=>c.characterId))].sort();assert.deepEqual(actual,expected[w.id],w.id);
    for(const c of cards)assert.equal(Q.compatible(w,c),Q.compatible(old,c)&&c.weapon===w.family,w.id+' '+c.id);
    const sample=cards.find(c=>Q.compatible(old,c));
    assert(Q.compatible(w,{...sample,weapon:w.family,name:'Unrelated name',characterId:'future-member'}));
    assert(!Q.compatible(w,{...sample,weapon:'Other'}));
  }
});

test('empty rosters are intentional, and new equips/new games reject every formerly incompatible edition',async()=>{
  const data=await dataPromise,E=createEngine(data);
  for(const [id,allowed] of Object.entries(expected)){
    const w=byId(id),old=previous.find(w=>w.id===id);
    for(const c of data.cards.filter(c=>Q.compatible(old,c)&&!Q.compatible(w,c))){
      assert.throws(()=>Q.validateLoadout({[c.characterId]:id},[c]));
      assert.throws(()=>Q.equipProfile(Q.profile('qa'),c.characterId,id,[c]),/incompatible/);
      const deck=deckFor(E,data,c);assert(deck,c.id);
      assert.throws(()=>E.newGame(deck,deck,{equipment:[{[c.characterId]:id},{}]}));
    }
    assert.equal(!!allowed.length,data.cards.some(c=>Q.compatible(w,c)));
  }
});

test('profile reconciliation removes only retired family mismatches and is pure/idempotent',async()=>{
  const {cards}=await dataPromise;
  const old=Q.profile('qa',{weapon:{belrog:'rhinoz-ancestral-horn',nazar:'wardens-spear',momo:'little-joys-flute','2b-nier':'virtuous-treaty',balmhyr:'mythic-iron-gauntlet','valazar':'cryptown-oath-sword'}}),copy=structuredClone(old);
  const next=Q.reconcileProfile(old,cards);
  assert.deepEqual(next.slots.weapon,{nazar:'wardens-spear',momo:'little-joys-flute'});
  assert.deepEqual(old,copy);assert.deepEqual(Q.reconcileProfile(next,cards),next);
  for(const weapon of [{unknown:'wardens-spear'},{momo:'unknown'},{momo:'rhinoz-ancestral-horn'},{momo:'fallen-king-axe'},{nazar:'wardens-spear','ward-ff8':'wardens-spear'}])
    assert.throws(()=>Q.reconcileProfile(Q.profile('qa',{weapon}),cards));
  for(const row of [null,{},Q.profile('qa',{weapon:{},job:{}}),{...old,version:2},{...old,id:''}])assert.throws(()=>Q.reconcileProfile(row,cards));
  assert.throws(()=>Q.reconcileLoadout({'kaylis':'white-oath-rapier'},cards.filter(c=>c.id==='30000012')),'personal edition restrictions must not be relaxed');
});

test('old compositions preserve every card, formation and captain while removing retired loadouts',async()=>{
  const data=await dataPromise,E=createEngine(data),c=data.cards.find(c=>c.characterId==='belrog'),deck=deckFor(E,data,c),teams=T.create(E);
  const before={...teams.fromPreset({name:'Rhinoz legacy',cards:deck}),equipment:{belrog:'rhinoz-ancestral-horn'}},copy=structuredClone(before);
  const next=teams.normalize(before);assert.deepEqual(next,{...before,equipment:{}});assert.deepEqual(before,copy);
  assert.deepEqual(E.validateComposition(next),[]);assert.deepEqual(teams.normalize(next),next);
  const oldList=T.create(E,()=>({belrog:'rhinoz-ancestral-horn'})).normalize({name:'Old deck',cards:deck});assert.deepEqual(oldList.equipment,{});assert.deepEqual(oldList.cards,deck);
});

test('every formerly allowed collective or personal loadout keeps its snapshot and combat bonus in a saved match',async()=>{
  const data=await dataPromise,E=createEngine(data);
  for(const {id} of Q.catalogue.weapons){
    const w=previous.find(w=>w.id===id);
    for(const c of data.cards.filter(c=>Q.compatible(w,c)&&!Q.compatible(byId(id),c))){
      const deck=deckFor(E,data,c),s=legacyGame(E,deck,deck,{seed:'OLD-BEARER',kalistel:false,equipment:[{[c.characterId]:id},{}]});
      E.autoDeploy(s,0);E.autoDeploy(s,1);const p=s.players[0],u=[...p.board.filter(Boolean),...p.reserve].find(u=>u.cardId===c.id);
      if(!p.board.includes(u)){const slot=c.positions[0]-1;E.recall(s,0,slot);E.deploy(s,0,u.uid,slot);}E.start(s);
      let count=1;const keep=w.effect.when.activeAtMost||4;
      if(w.effect.when.outnumbered||w.effect.when.activeAtMost)p.board=p.board.map(v=>{if(!v||v===u||count++<keep)return v;p.reserve.push(v);return null;});
      if(w.effect.when.reserveAtMost===0){for(const v of p.reserve)v.entered=true;p.dead.push(...p.reserve);p.reserve=[];}
      assert.equal(E.equipmentModifier(s,u,w.effect.stat).value,w.effect.value);E.assertState(s);
      const before=structuredClone(s);assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))),before);
      Q.reconcileLoadout(s.equipment.loadouts[0],data.cards);assert.deepEqual(s,before);
    }
  }
});

test('personal restrictions follow the chosen edition, accept future matching editions and retire invalid decks',async()=>{
  const data=await dataPromise,E=createEngine(data),teams=T.create(E);
  const mismatches={'brotherhood':'46513388','virtuous-treaty':'45911726','mythic-iron-gauntlet':'30000007','single-action-army':'49600104'};
  for(const [id,cardId]of Object.entries(mismatches)){
    const w=byId(id),c=data.cards.find(c=>c.id===cardId),loadout={[c.characterId]:id};assert(c);
    assert(!Q.compatible(w,c));assert.throws(()=>Q.equipProfile(Q.profile('qa'),c.characterId,id,[c]));
    assert.deepEqual(Q.reconcileLoadout(loadout,[c]),{});
    const deck=deckFor(E,data,c),team={...teams.fromPreset({name:'Old personal weapon',cards:deck}),equipment:loadout};
    assert.throws(()=>E.newGame(team,team));
    // Historical technical callers can provide a profile, but a wrong edition never receives its weapon.
    const matching=data.cards.some(v=>Q.compatible(w,v));
    if(matching){const state=E.newGame(deck,deck,{equipment:[loadout,{}]});const unit=state.players[0].reserve.find(u=>u.cardId===c.id);assert.equal(E.equipmentView(state,unit).weapon,null);}
    assert.deepEqual(teams.normalize(team),{...team,equipment:{}});
    const future={...c,id:'future-edition',name:'Unrelated display name',weapon:w.family};
    assert(Q.compatible(w,future));assert.deepEqual(Q.reconcileLoadout(loadout,[future]),loadout);
    assert(!Q.compatible(w,{...future,characterId:'different-character'}));
  }
  for(const id of ['brotherhood','single-action-army'])assert(data.cards.some(c=>Q.compatible(byId(id),c)),id+' keeps its matching editions');
  for(const id of ['virtuous-treaty','mythic-iron-gauntlet'])assert(!data.cards.some(c=>Q.compatible(byId(id),c)),id+' awaits a new edition');
});

test('weapon faces put the accessible native family glyph in the title and only the origin in the footer',()=>{
  const C=require('./weapon-cards.js'),B=require('./base-weapons.js');
  for(const w of Q.catalogue.weapons){
    const html=C.markup(w);assert(html.includes('class="wc-family"'));assert(html.includes(B.asset(B.code(w.family))));
    assert(html.includes('alt="Famille : '+w.family+'"'));
    assert(!/<span class="wc-bearers"[^>]*><span><b>[^<]*(?:Gun|Hache|Lance|Epée|Dague|Arc|Fléau)/.test(html));
  }
});

module.exports={expected};
