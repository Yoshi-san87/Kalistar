'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),{createEngine}=require('./engine.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const dataPromise=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const additions=Q.catalogue.weapons.filter(w=>w.effect.trigger==='ONCE_DEFENSE');
const item=id=>additions.find(w=>w.id===id);
const supportFaces={luck:'retry',mana:'mana',reraise:'revive',ward:'guard',physical:'buff_atk'};
async function fixture(w,side=0,extra=null){
  const data=structuredClone(await dataPromise),c=data.cards.find(c=>Q.compatible(w,c));assert(c,w.id);
  const ally=data.cards.find(x=>x.characterId!==c.characterId&&(!extra||Q.compatible(extra,x))&&(w.effect.when.alliedCharacter?x.characterId===w.effect.when.alliedCharacter:w.effect.when.alliedFaction?x.faction===w.effect.when.alliedFaction:true));
  const selected=[c,ally],identities=new Set(selected.map(c=>c.characterId));
  for(const x of data.cards)if(selected.length<10&&!identities.has(x.characterId)&&x.element!=='RAINBOW'){selected.push(x);identities.add(x.characterId);}
  for(const x of data.cards){x.positions=[1,2,3,4,5];x.atk=[10,10,10,10,10,10];x.defense=[150,150,150,150,150,150];x.magic=[];x.barriers=[];}
  if(w.effect.event==='SUPPORT'){
    const key=w.effect.when.supports[0];c.atk[5]=supportFaces[key];
    if(key==='reraise'){c.role=5;c.canHeal=true;}
    if(key==='ward'){c.role=1;c.canGuard=true;c.canHeal=false;}
  }
  if(w.effect.when.opponentElement)ally.element=w.effect.when.opponentElement;
  if(w.effect.when.attack==='magic'){ally.element='ELECTRO';ally.magic=[6];}
  const E=createEngine(data),deck=selected.map(c=>c.id),loadout={[c.characterId]:w.id};
  if(extra)loadout[ally.characterId]=extra.id;
  const s=E.newGame(deck,deck,{mode:'local',seed:w.id,kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
  for(let team=0;team<2;team++)for(let slot=0;slot<5;slot++)E.deploy(s,team,s.players[team].reserve.find(u=>u.cardId===selected[slot].id).uid,slot);
  E.start(s);
  return {E,s,w,c,side,u:s.players[side].board[0],ally:s.players[side].board[1]};
}
function restore(f){assert.deepEqual(f.E.restoreGame(f.s),f.s);}
function next(f){
  while(f.E.equipmentChoice(f.s))f.E.grantEquipment(f.s,f.E.aiEquipmentChoice(f.s));
  f.E.next(f.s);while(f.s.phase==='replace')f.E.autoDeploy(f.s,f.s.replacing);
}
function lock(f,u=f.u,attack=false){const {s,E,side}=f;s.turn=attack?side:1-side;E.lock(s,attack?s.players[side].board.indexOf(u):1,attack?1:s.players[side].board.indexOf(u));restore(f);}
function defend(f,u=f.u,face=6){lock(f,u);f.E.rollAttack(f.s,6);restore(f);f.E.rollDefense(f.s,face);restore(f);}
function thin(f,max){const p=f.s.players[f.side];while(p.board.filter(Boolean).length>max){const i=p.board.findLastIndex(u=>u&&u!==f.u);p.dead.push(p.board[i]);p.board[i]=null;}p.dead.push(...p.reserve);p.reserve=[];}
function trigger(f){
  const {E,s,w,u,ally,side}=f,e=w.effect;
  if(e.event==='DEFENSE'){
    if(e.when.activeAtMost)thin(f,e.when.activeAtMost);
    if(e.when.outnumbered)thin(f,4);
    return u;
  }
  if(e.event==='BLOCK'||e.event==='DODGE'){
    if(e.event==='DODGE')E.card(u).defense[5]='dodge';
    defend(f,u,e.event==='DODGE'?1:6);
  }else if(e.event==='SUPPORT'){
    lock(f,u,true);E.rollAttack(s,1);
    const key=e.when.supports[0],method={luck:'grantClover',mana:'grantPotion',reraise:'grantReraise',ward:'grantGuard',physical:'grantPhysical'}[key];
    E[method](s,ally.uid);restore(f);
  }else if(e.event==='ALLY_FALL'){
    E.card(s.players[1-side].board[1]).atk[0]=900;defend(f,ally);E.card(s.players[1-side].board[1]).atk[0]=10;
    assert(s.players[side].dead.includes(ally));
  }else{
    // Replace a starter with the intended reserve card; initial setup is not a trigger.
    const p=s.players[side],entrant=e.event==='DEPLOY'?u:p.reserve[0];
    if(entrant===u){const spare=p.reserve.shift();p.board[0]=spare;p.reserve.push(u);}
    const target=p.board[4];E.card(s.players[1-side].board[1]).atk[0]=900;defend(f,target);E.card(s.players[1-side].board[1]).atk[0]=10;
    E.next(s);assert.equal(s.phase,'replace');E.deploy(s,side,entrant.uid,4);restore(f);return entrant;
  }
  const choice=E.equipmentChoice(s);
  if(choice){assert.throws(()=>E.next(s));assert.throws(()=>E.grantEquipment(s,u.uid));E.grantEquipment(s,E.aiEquipmentChoice(s));restore(f);}
  const r=s.equipment.defensive.grants.find(r=>r.sourceUid===u.uid);assert(r,w.id);assert.equal(r.status,'ready');
  const recipient=s.players[side].board.find(v=>v?.uid===r.recipient);next(f);return recipient;
}

test('40 additive entries, 20 protections and 20 relics; real edition restrictions and one slot',async()=>{
  const {cards}=await dataPromise;assert.equal(additions.length,40);
  for(const kind of ['shield','relic'])assert.equal(additions.filter(w=>w.kind===kind).length,20);
  for(const w of additions){
    Q.validateDefinition(w);assert.equal(w.slot,'weapon');assert.equal(w.changesFamily,undefined);assert(w.effect.value<=30);assert(cards.some(c=>Q.compatible(w,c)),w.id);
    if(w.restrictions.characterIds)assert(!Q.compatible(w,{...cards.find(c=>Q.compatible(w,c)),characterId:'wrong',name:w.name}));
  }
  for(const [id,faction] of [['octocamo','MGS4'],['cyborg-ninja-armor','MGS4'],['leon-body-armor','RE4'],['stars-vest','RE1']]){
    const w=item(id);assert(cards.filter(c=>Q.compatible(w,c)).every(c=>c.faction===faction));
    assert(!Q.compatible(w,{...cards.find(c=>Q.compatible(w,c)),faction:'wrong'}));
  }
  let p=Q.profile('qa');p=Q.equipProfile(p,'balmhyr','fallen-king-axe',cards);
  p=Q.equipProfile(p,'balmhyr','exiled-king-seal',cards,{expected:'fallen-king-axe'});assert.deepEqual(p.slots.weapon,{balmhyr:'exiled-king-seal'});
});
for(const w of additions)for(const side of [0,1])test(`${w.id}: real bonus once, side ${side}, reload every phase`,async()=>{
  const f=await fixture(w,side),{s,E,u}=f;assert(!E.equipmentView(s,u).active);restore(f);
  const recipient=trigger(f);assert(recipient,w.id);
  // A ready gift survives its recipient attacking.
  if(w.effect.event!=='DEFENSE'){lock(f,recipient,true);E.rollAttack(s,6);E.rollDefense(s,6);restore(f);assert.equal(s.equipment.defensive.grants[0].status,'ready');next(f);}
  defend(f,recipient);
  const d=s.duel,fm=d.formula;assert(fm,w.id);assert.equal(fm.equipmentDefense,w.effect.value,w.id);
  assert.equal(fm.defense,Math.max(0,fm.baseDefense+fm.race+fm.arenaDefense+fm.ward+w.effect.value));
  assert(s.log.some(l=>l.text.includes(w.name)&&l.text.includes('+'+w.effect.value)),w.id);
  assert.equal(s.equipment.defensive.grants.find(r=>r.sourceUid===u.uid).status,'spent');
  next(f);defend(f,recipient);assert.equal(s.duel.formula.equipmentDefense,0);assert(!E.equipmentView(s,u).active);
});

test('magic and physical qualification wait for the accepted attack',async()=>{
  const f=await fixture(item('tide-pavise')),{E,s,u}=f;const enemy=s.players[1].board[1];
  E.card(enemy).magic=[5];E.card(enemy).element='ELECTRO';
  lock(f);E.rollAttack(s,5);assert(!s.equipment.defensive);E.rollDefense(s,6);restore(f);assert.equal(s.duel.formula.equipmentDefense,0);next(f);
  defend(f);assert.equal(s.duel.formula.equipmentDefense,25);assert.equal(s.equipment.defensive.grants[0].recipient,u.uid);
});
test('support refresh does not grant a charge; special defense consumes once; failed saves rejected',async()=>{
  const f=await fixture(item('pod-153')),{E,s,u,ally}=f;ally.mana=60;
  lock(f,u,true);E.rollAttack(s,1);E.grantPotion(s,ally.uid);restore(f);assert(!s.equipment.defensive);next(f);
  ally.mana=0;lock(f,u,true);E.rollAttack(s,1);E.grantPotion(s,ally.uid);restore(f);next(f);
  E.card(ally).defense[5]='retry';lock(f,ally);E.rollAttack(s,6);E.rollDefense(s,1);restore(f);assert.equal(s.equipment.defensive.grants[0].status,'ready');
  E.card(ally).defense[4]='dodge';E.rollDefense(s,2);restore(f);assert.equal(s.duel.formula,undefined);assert.equal(s.equipment.defensive.grants[0].status,'spent');
  for(const mutate of [r=>r.sourceUid='1-0',r=>r.weaponId='white-materia',r=>r.round=0,r=>r.recipient='1-1',r=>r.status='ready']){
    const bad=E.clone(s);mutate(bad.equipment.defensive.grants[0]);assert.throws(()=>E.restoreGame(bad));
  }
});
test('invalid declarative rules are rejected without new saves or implicit slots',()=>{
  const w=item('tide-pavise');
  for(const change of [{event:'HEAL'},{duration:'FOREVER'},{recipient:'opponent'},{when:{attack:'any'}},{when:{damage:100}}])assert.throws(()=>Q.validateDefinition({...w,effect:{...w.effect,...change}}));
});

test('a relay and a personal protection use only the strongest bonus and consume both charges',async()=>{
  const f=await fixture(item('exiled-king-seal'),0,item('tide-pavise')),{E,s,ally}=f;
  defend(f);assert(E.equipmentChoice(s));E.grantEquipment(s,ally.uid);restore(f);next(f);
  lock(f,ally);E.rollAttack(s,6);restore(f);
  assert.equal(s.duel.equipment.defensiveSources.length,2);
  assert.equal(E.equipmentModifier(s,ally,'DEF').value,25);
  E.rollDefense(s,6);restore(f);assert.equal(s.duel.formula.equipmentDefense,25);
  assert(s.equipment.defensive.grants.every(r=>r.status==='spent'));
  next(f);defend(f,ally);assert.equal(s.duel.formula.equipmentDefense,0);restore(f);
});

test('discarded Kalistel attack cannot activate or consume a protection',async()=>{
  const f=await fixture(item('tide-pavise')),{E,s}=f;
  s.kalistel={version:1,spent:[]};
  E.card(s.players[1].board[1]).element='ELECTRO';E.card(s.players[1].board[1]).magic=[5];
  lock(f);E.rollAttack(s,6);assert.equal(s.phase,'kalistel');assert(!s.equipment.defensive);restore(f);
  E.useKalistel(s,5);assert.equal(s.phase,'defense');assert(!s.equipment.defensive);restore(f);
  E.rollDefense(s,6);assert.equal(s.duel.formula.equipmentDefense,0);next(f);
  lock(f);E.rollAttack(s,5);assert(!s.equipment.defensive);E.useKalistel(s,6);restore(f);
  assert.equal(s.equipment.defensive.grants[0].status,'ready');E.rollDefense(s,6);restore(f);
  assert.equal(s.duel.formula.equipmentDefense,25);assert.equal(s.equipment.defensive.grants[0].status,'spent');
});

for(const w of additions)test(`${w.id}: three complete matches with untouched catalogue cards`,async()=>{
  const data=await dataPromise,E=createEngine(data),c=data.cards.find(c=>Q.compatible(w,c)),base=data.decks.player;
  const deck=base.map((_,i)=>base.map((v,j)=>i===j?c.id:v)).find(ids=>!E.validatePlayableDeck(ids).length);assert(deck,w.id);
  for(const seed of [1,2,3]){
    const loadout={[c.characterId]:w.id};let s=E.newGame(deck,deck,{seed:w.id+seed,mode:'local',equipment:[loadout,loadout]});
    E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
    for(let n=0;s.phase!=='over'&&n<2000;n++){
      if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
      else if(s.phase==='attack')E.rollAttack(s);
      else if(s.phase==='kalistel'){if(E.aiUseKalistel(s))E.useKalistel(s);else E.acceptAttack(s);}
      else if(s.phase==='defense')E.rollDefense(s);
      else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
      else if(s.phase==='result'){if(E.equipmentChoice(s))E.grantEquipment(s,E.aiEquipmentChoice(s));else E.next(s);}
      else{const [grant,choose]={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']}[s.phase];E[grant](s,E[choose](s));}
      E.assertState(s);s=E.restoreGame(s);
    }
    assert.equal(s.phase,'over');
    for(const p of s.players)for(const u of p.board.filter(Boolean))assert(!E.equipmentView(s,u).active);
  }
});
