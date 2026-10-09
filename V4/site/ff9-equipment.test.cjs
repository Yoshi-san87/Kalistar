'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),T=require('./team-composition.js'),{createEngine}=require('./engine.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const dataPromise=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const items=Q.catalogue.weapons.filter(w=>w.id.startsWith('ff9-')),weapons=items.filter(w=>Q.catalogue.kind(w)==='weapon');
const item=id=>items.find(w=>w.id===id);
function deckFor(E,data,c){const base=data.decks.player,deck=base.map((_,i)=>base.map((id,j)=>i===j?c.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);assert(deck,c.id);return deck;}
async function fixture(w,side=0,cardId=null,mutate=()=>{}){
  const data=structuredClone(await dataPromise);mutate(data);
  const E=createEngine(data),c=data.cards.find(c=>cardId?c.id===cardId:Q.compatible(w,c)),deck=deckFor(E,data,c),loadout={[c.characterId]:w.id};
  const s=E.newGame(deck,deck,{mode:'local',seed:'FF9-'+w.id,kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
  E.autoDeploy(s,0);E.autoDeploy(s,1);const p=s.players[side],u=[...p.board.filter(Boolean),...p.reserve].find(v=>v.cardId===c.id);
  if(!p.board.includes(u)){const slot=c.positions[0]-1;E.recall(s,side,slot);E.deploy(s,side,u.uid,slot);}E.start(s);
  return {E,s,p,u,c,w,side,data,deck};
}
function activate(f){
  const {p,u,w}=f,when=w.effect.when||{},keep=w.effect.trigger==='LAST_STANDING'?1:when.activeAtMost||4;let n=1;
  if(w.effect.trigger==='LAST_STANDING'||when.outnumbered||when.activeAtMost)p.board=p.board.map(v=>{if(!v||v===u||n++<keep)return v;p.reserve.push(v);return null;});
  if(when.reserveAtMost===0){for(const v of p.reserve)v.entered=true;p.dead.push(...p.reserve);p.reserve=[];}
}
function lock(f,a,b,side){f.s.turn=side;f.E.lock(f.s,f.s.players[side].board.indexOf(a),f.s.players[1-side].board.indexOf(b));}
function next(f){f.E.next(f.s);while(f.s.phase==='replace')f.E.autoDeploy(f.s,f.s.replacing);}
test('18 unique FFIX items, printed families AND stable identity, conservative effects',async()=>{
  const {cards}=await dataPromise;assert.equal(items.length,18);assert.equal(weapons.length,8);
  assert.equal(items.filter(w=>w.kind==='shield').length,5);assert.equal(items.filter(w=>w.kind==='relic').length,5);
  assert.equal(new Set(items.map(w=>w.collectible.number)).size,18);
  for(const w of items){
    Q.validateDefinition(w);assert(w.effect.value>=20&&w.effect.value<=30);assert.equal(w.slot,'weapon');assert.equal(w.changesFamily,undefined);
    assert(w.collectible.flavour.length<=50);assert(cards.some(c=>Q.compatible(w,c)),w.id);
    for(const c of cards)assert.equal(Q.compatible(w,c),w.restrictions.characterIds.includes(c.characterId)&&(w.kind?true:c.weapon===w.family),w.id+' '+c.id);
    const c=cards.find(c=>Q.compatible(w,c));assert(Q.compatible(w,{...c,name:'Renamed'}));assert(!Q.compatible(w,{...c,characterId:'wrong',name:c.name}));
  }
  assert.equal(cards.filter(c=>Q.compatible(item('ff9-magekane'),c)).length,3);
  assert.equal(cards.filter(c=>Q.compatible(item('ff9-vivi-hat'),c)).length,3);
  assert.equal(cards.filter(c=>Q.compatible(item('ff9-garnet-pendant'),c)).length,2);
});
test('profile and composition: one cross-category slot, confirmation, snapshot, old saves',async()=>{
  const data=await dataPromise,E=createEngine(data),c=data.cards.find(c=>c.characterId==='steiner-ff9');let p=Q.profile('FF9');
  p=Q.equipProfile(p,c.characterId,'ff9-excalibur',data.cards);
  assert.throws(()=>Q.equipProfile(p,c.characterId,'ff9-oath-helm',data.cards));
  p=Q.equipProfile(p,c.characterId,'ff9-oath-helm',data.cards,{expected:'ff9-excalibur'});
  assert.deepEqual(p.slots.weapon,{[c.characterId]:'ff9-oath-helm'});assert.deepEqual(Q.validateProfile(JSON.parse(JSON.stringify(p)),data.cards),p);
  assert.throws(()=>Q.equipProfile(p,'vivi-ff9','ff9-excalibur',data.cards));
  const manager=T.create(E),deck=deckFor(E,data,c),team=manager.equip(manager.fromPreset({name:'FFIX',cards:deck}),c.id,'ff9-oath-helm');
  assert.deepEqual(E.validateComposition(team),[]);const s=E.newGame(team,team,{mode:'local'}),snapshot=structuredClone(s.equipment);
  team.equipment[c.characterId]='ff9-excalibur';assert.deepEqual(s.equipment,snapshot);assert.deepEqual(E.restoreGame(s),s);
  const old=E.newGame(deck,deck,{equipment:[{},{}]});old.equipment.definitions=old.equipment.definitions.filter(w=>!w.id.startsWith('ff9-'));assert.deepEqual(E.restoreGame(old),old);
});
for(const w of weapons.filter(w=>w.effect.trigger!=='AFTER_SUPPORT'))test(w.id+': every printed edition, both sides, numeric formula, log, activation and deactivation',async()=>{
  const data=await dataPromise;
  for(const c of data.cards.filter(c=>Q.compatible(w,c)))for(const side of [0,1]){
    const f=await fixture(w,side,c.id),{E,s,u}=f;assert(!E.equipmentView(s,u).active);const before=structuredClone(s.players);
    activate(f);E.assertState(s);assert(E.equipmentView(s,u).active);assert.equal(E.equipmentModifier(s,u,w.effect.stat).value,w.effect.value);
    const restored=E.clone(s);restored.players=before;assert(!E.equipmentView(restored,restored.players[side].board.find(v=>v?.uid===u.uid)).active);
    const enemy=s.players[1-side].board.find(Boolean),attack=w.effect.stat==='ATK',a=attack?u:enemy,b=attack?enemy:u;
    lock(f,a,b,attack?side:1-side);E.rollAttack(s,6-E.card(a).atk.findIndex(v=>typeof v==='number'));E.rollDefense(s,6-E.card(b).defense.findIndex(v=>typeof v==='number'));
    const form=s.duel.formula;assert.equal(form[attack?'equipmentAttack':'equipmentDefense'],w.effect.value);assert.equal(form.weapon,data.weapons[E.card(a).weapon][E.card(b).weapon]);
    assert.equal(form.attack,Math.max(0,form.baseAttack+form.weapon+form.element+form.faction+form.buff+form.barrier+form.arenaAttack+(form.captainAttack||0)+form.equipmentAttack));
    assert.equal(form.defense,Math.max(0,form.baseDefense+form.race+form.arenaDefense+form.ward+(form.captainDefense||0)+form.equipmentDefense));
    assert(s.log.some(l=>l.text.includes(w.name)&&l.text.includes('+'+w.effect.value+' '+w.effect.stat)));E.assertState(s);assert.deepEqual(E.restoreGame(s),s);
    s.phase='over';assert(!E.equipmentView(s,u).active);
  }
});
for(const side of [0,1])for(const scenario of ['defend','attack','refresh'])test('Gastrette: '+scenario+', side '+side,async()=>{
  const f=await fixture(item('ff9-gastrette'),side,null,data=>{for(const c of data.cards){c.atk=c.atk.map(v=>typeof v==='number'?10:v);c.defense=[150,150,150,150,150,150];}}),{E,s,u,p,c}=f;
  const ally=p.board.find(v=>v&&v!==u),enemy=s.players[1-side].board.find(Boolean);assert(!E.equipmentView(s,u).active);
  if(scenario==='refresh')ally.mana=60;
  lock(f,u,enemy,side);E.rollAttack(s,6-c.atk.indexOf('mana'));assert.equal(s.phase,'potion');E.grantPotion(s,ally.uid);E.assertState(s);
  if(scenario==='refresh'){assert.deepEqual(s.equipment.pending,{});assert(!E.equipmentView(s,u).active);return;}
  assert.equal(s.equipment.pending[ally.uid].weaponId,'ff9-gastrette');assert(E.equipmentView(s,u).active);assert.deepEqual(E.restoreGame(s),s);
  next(f);const attack=scenario==='attack';lock(f,attack?ally:enemy,attack?enemy:ally,attack?side:1-side);
  E.rollAttack(s,6-E.card(attack?ally:enemy).atk.findIndex(v=>typeof v==='number'));E.rollDefense(s,6);
  assert.equal(s.duel.formula.equipmentDefense,attack?0:20);assert.deepEqual(s.equipment.pending,{});assert(!E.equipmentView(s,u).active);
  assert(s.log.some(l=>l.text.includes('Gastrette')&&l.text.includes('+20 DEF')));E.assertState(s);assert.deepEqual(E.restoreGame(s),s);
});
test('all eight FFIX weapons finish natural matches with original faces and reload each step',async()=>{
  for(const w of weapons)for(let seed=0;seed<3;seed++){
    const {E,data,c,deck}=await fixture(w);let s=E.newGame(deck,deck,{mode:'local',seed:'FF9-NATIVE-'+seed,equipment:[{[c.characterId]:w.id},{[c.characterId]:w.id}]});
    E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
    for(let step=0;s.phase!=='over'&&step<2500;step++){
      const choice=E.equipmentChoice(s);if(choice)E.grantEquipment(s,E.aiEquipmentChoice(s));
      else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
      else if(s.phase==='attack')E.rollAttack(s);
      else if(s.phase==='kalistel')E.acceptAttack(s);
      else if(s.phase==='defense')E.rollDefense(s);
      else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
      else if(s.phase==='result')E.next(s);
      else{const modes={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']},[grant,choose]=modes[s.phase];E[grant](s,E[choose](s));}
      E.assertState(s);s=E.restoreGame(s);
    }
    assert.equal(s.phase,'over',w.id);assert.deepEqual(s.equipment.pending,{});assert(data.cards.length>0);
  }
});

test('defense-triggered descriptions identify the current defense rather than a later charge',()=>{
  const C=require('./weapon-cards.js');
  assert(C.activation(item('ff9-oath-helm')).effect.includes('cette défense'));
  assert(C.activation(item('ff9-solitary-wraps')).effect.includes('prochaine défense'));
});
