'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),T=require('./team-composition.js');
const {weapons:previous,legacyGame}=require('./fixtures/legacy-equipment.cjs');
const archive=require('./fixtures/equipment-v4.5.64.json');
const {buildCatalog}=require('../atelier/game-catalog.cjs'),{createEngine}=require('./engine.js');
const dataPromise=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const expected={
  'wardens-spear':['brask-kalistar','karrok-kalistar','kimahri-ff10','nazar','ward-ff8'],
  'soldiers-blade':['isvel-kalistar','liorne-kalistar'],
  'commanders-sabre':[],
  'arborium-twinstring-bow':['saelor-kalistar','ssilas'],
  'arborium-thorn-dagger':['maelor-kalistar'],
  'draevenheim-wing-spear':['orven-kalistar'],
  'draevenheim-crimson-crossbow':[],
  'cryptown-oath-sword':['varkhen-kalistar'],
  'cryptown-vigil-rifle':['nereth-kalistar'],
  'cryptown-watch-flail':['draust-kalistar'],
  'rhinoz-ancestral-horn':[]
};
const byId=id=>Q.catalogue.weapons.find(w=>w.id===id);
const weapons=previous.map(old=>Q.catalogue.weapons.find(w=>w.id===old.id));
function deckFor(E,data,c){const base=data.decks.player;return base.map((_,i)=>base.map((id,j)=>i===j?c.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);}

test('4.6 original arsenal keeps origins/family restrictions; frozen 4.5.64 effects stay exact',async()=>{
  const {cards}=await dataPromise;assert.equal(weapons.length,33);
  assert.equal(weapons.filter(w=>Q.catalogue.kind(w)==='weapon').length,32);
  assert.deepEqual(Q.catalogue.legacyWeapons,archive.weapons);
  assert.deepEqual(weapons.filter(w=>!w.restrictions.characterIds).map(w=>w.id).sort(),Object.keys(expected).sort());
  for(const w of weapons){
    const old=previous.find(p=>p.id===w.id);Q.validateDefinition(w);
    const frozen=archive.weapons.find(p=>p.id===w.id);
    assert.deepEqual(frozen,{...old,restrictions:{...old.restrictions,families:[old.family]}});
    for(const key of ['id','name','family','art','visual','restrictions','collectible','lore'])assert.deepEqual(w[key],frozen[key],w.id+' '+key);
    assert.equal(w.rulesVersion,2);assert.equal(w.slot,w.id==='little-joys-flute'?'relic':'weapon');
    assert.deepEqual(w.effect,w.slot==='relic'?frozen.effect:{trigger:'RETAINED_SIX',stat:'ATK',value:frozen.effect.value,duration:'DUEL'});
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

test('version-1 profile migration removes only retired bearers, routes Momo to relic and is pure/idempotent',async()=>{
  const {cards}=await dataPromise;
  const old={id:'qa',version:1,slots:{weapon:{belrog:'rhinoz-ancestral-horn',nazar:'wardens-spear',momo:'little-joys-flute','2b-nier':'virtuous-treaty',balmhyr:'mythic-iron-gauntlet','valazar':'cryptown-oath-sword'}}},copy=structuredClone(old);
  const next=Q.reconcileProfile(old,cards);
  assert.deepEqual(next,{id:'qa',version:2,slots:{weapon:{nazar:'wardens-spear','2b-nier':'virtuous-treaty',balmhyr:'mythic-iron-gauntlet'},shield:{},relic:{momo:'little-joys-flute'}}});
  const originalEditions=cards.filter(c=>!['49900801','49900802'].includes(c.id));
  assert.deepEqual(Q.reconcileProfile(old,originalEditions).slots,{weapon:{nazar:'wardens-spear'},shield:{},relic:{momo:'little-joys-flute'}});
  assert.deepEqual(old,copy);assert.deepEqual(Q.reconcileProfile(next,cards),next);
  for(const weapon of [{unknown:'wardens-spear'},{momo:'unknown'},{momo:'rhinoz-ancestral-horn'},{momo:'fallen-king-axe'},{nazar:'wardens-spear','ward-ff8':'wardens-spear'}])
    assert.throws(()=>Q.reconcileProfile({id:'qa',version:1,slots:{weapon}},cards));
  for(const row of [null,{},Q.profile('qa',{weapon:{},job:{}}),{...old,version:2},{...old,version:3},{...old,id:''}])assert.throws(()=>Q.reconcileProfile(row,cards));
  assert.throws(()=>Q.reconcileLoadout({'kaylis':'white-oath-rapier'},cards.filter(c=>c.id==='30000012')),'personal edition restrictions must not be relaxed');
});

test('old compositions preserve every card, formation and captain while removing retired loadouts',async()=>{
  const data=await dataPromise,E=createEngine(data),c=data.cards.find(c=>c.characterId==='belrog'),deck=deckFor(E,data,c),teams=T.create(E);
  const before={...teams.fromPreset({name:'Rhinoz legacy',cards:deck}),equipment:{belrog:'rhinoz-ancestral-horn'}},copy=structuredClone(before);
  const next=teams.normalize(before);assert.deepEqual(next,{...before,equipment:Q.emptyLoadout()});assert.deepEqual(before,copy);
  assert.deepEqual(E.validateComposition(next),[]);assert.deepEqual(teams.normalize(next),next);
  const oldList=T.create(E,()=>({belrog:'rhinoz-ancestral-horn'})).normalize({name:'Old deck',cards:deck});assert.deepEqual(oldList.equipment,Q.emptyLoadout());assert.deepEqual(oldList.cards,deck);
});

test('every formerly allowed collective or personal loadout keeps its snapshot and combat bonus in a saved match',async()=>{
  const data=await dataPromise,E=createEngine(data);
  for(const {id} of Q.catalogue.weapons){
    const w=previous.find(w=>w.id===id);
    for(const c of data.cards.filter(c=>Q.compatible(w,c)&&!Q.compatible(byId(id),c))){
      const deck=deckFor(E,data,c),s=legacyGame(E,deck,deck,{seed:'OLD-BEARER',kalistel:false,equipment:[{[c.characterId]:id},{}]});
      E.autoDeploy(s,0);E.autoDeploy(s,1);const p=s.players[0],u=[...p.board.filter(Boolean),...p.reserve].find(u=>u.cardId===c.id);
      if(!p.board.includes(u)){const slot=c.positions[0]-1;E.recall(s,0,slot);E.deploy(s,0,u.uid,slot);}E.start(s);
      assert(['TEAM_STATE','LAST_STANDING'].includes(w.effect.trigger));
      const when=w.effect.trigger==='LAST_STANDING'?{activeAtMost:1}:w.effect.when;
      let count=1;const keep=when.activeAtMost||4;
      if(when.outnumbered||when.activeAtMost)p.board=p.board.map(v=>{if(!v||v===u||count++<keep)return v;p.reserve.push(v);return null;});
      if(when.reserveAtMost===0){for(const v of p.reserve)v.entered=true;p.dead.push(...p.reserve);p.reserve=[];}
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
    assert.deepEqual(Q.reconcileLoadout(loadout,[c]),Q.emptyLoadout());
    const deck=deckFor(E,data,c),team={...teams.fromPreset({name:'Old personal weapon',cards:deck}),equipment:loadout};
    assert.throws(()=>E.newGame(team,team));
    // Historical technical callers can provide a profile, but a wrong edition never receives its weapon.
    const matching=data.cards.some(v=>Q.compatible(w,v));
    if(matching){const state=E.newGame(deck,deck,{equipment:[loadout,{}]});const unit=state.players[0].reserve.find(u=>u.cardId===c.id);assert.equal(E.equipmentView(state,unit).weapon,null);}
    assert.deepEqual(teams.normalize(team),{...team,equipment:Q.emptyLoadout()});
    const future={...c,id:'future-edition',name:'Unrelated display name',weapon:w.family};
    assert(Q.compatible(w,future));assert.deepEqual(Q.reconcileLoadout(loadout,[future]),{weapon:loadout,shield:{},relic:{}});
    assert(!Q.compatible(w,{...future,characterId:'different-character'}));
  }
  for(const id of ['brotherhood','single-action-army'])assert(data.cards.some(c=>Q.compatible(byId(id),c)),id+' keeps its matching editions');
  for(const [id,model]of [['virtuous-treaty','49900801'],['mythic-iron-gauntlet','49900802']]){
    assert.deepEqual(data.cards.filter(c=>Q.compatible(byId(id),c)).map(c=>c.id),[model],id+' now has exactly its second edition');
  }
});

test('4.6 weapon faces retain the native family glyph; Momo relic has an accessible relic icon',()=>{
  const C=require('./weapon-cards.js'),B=require('./base-weapons.js');
  for(const w of weapons){
    const html=C.markup(w);assert(html.includes('class="wc-family"'));
    if(w.slot==='weapon'){
      assert(html.includes(B.asset(B.code(w.family))));assert(html.includes('alt="Famille : '+w.family+'"'));
    }else{
      assert.equal(w.id,'little-joys-flute');assert(html.includes('role="img" aria-label="Relique"'));assert(html.includes('data-lucide="gem"'));
    }
    assert(!/<span class="wc-bearers"[^>]*><span><b>[^<]*(?:Gun|Hache|Lance|Epée|Dague|Arc|Fléau)/.test(html));
  }
});

module.exports={expected};
