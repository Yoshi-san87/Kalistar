'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildCatalog}=require('../atelier/game-catalog.cjs'),{createEngine}=require('./engine.js'),Q=require('./equipment.js');
const catalogue=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const slots=()=>({weapon:{},shield:{},relic:{}}),all=p=>p.board.filter(Boolean).concat(p.reserve,p.dead);
function rng(seed=1234567){let x=seed;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function deck(E,required=[]){
  const r=rng(106),must=required.map(id=>E.byId[id]),pool=E.data.cards;
  for(let n=0;n<3000;n++){
    const chosen=must.slice(),used=new Set(must.map(c=>c.characterId));
    while(chosen.length<10){const c=pool[Math.floor(r()*pool.length)];if(used.has(c.characterId)||c.element==='RAINBOW'&&chosen.some(v=>v.element==='RAINBOW'))continue;chosen.push(c);used.add(c.characterId);}
    const ids=chosen.map(c=>c.id);if(!E.validatePlayableDeck(ids).length)return ids;
  }
  throw Error('Unable to construct valid test deck.');
}
async function fixture({required=[],loadouts=[slots(),slots()],mutate=()=>{},kalistel=false,seed='V460-SCENARIO'}={}){
  const data=structuredClone(await catalogue);mutate(data);const E=createEngine(data),ids=deck(E,required);
  const s=E.newGame(ids,ids,{equipment:loadouts,kalistel,seed,mode:'local'});
  E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
  const place=(id,side=0)=>{
    const p=s.players[side],u=all(p).find(u=>u.cardId===id);assert(u,id);
    if(p.board.includes(u))return u;
    const slot=E.card(u).positions[0]-1,old=p.board[slot];p.reserve=p.reserve.filter(v=>v!==u);if(old)p.reserve.push(old);p.board[slot]=u;u.entered=true;return u;
  };
  return {data,E,s,place};
}
function lock(f,a,b){f.s.turn=Number(a.uid[0]);f.E.lock(f.s,f.s.players[f.s.turn].board.indexOf(a),f.s.players[1-f.s.turn].board.indexOf(b));}
function formula(f){const d=f.s.duel,x=d.formula;assert(x);assert.equal(x.attack,Math.max(0,x.baseAttack+x.weapon+x.element+x.faction+x.buff+x.barrier+x.arenaAttack+(x.captainAttack||0)+x.equipmentAttack));assert.equal(x.defense,Math.max(0,x.baseDefense+x.race+x.arenaDefense+x.ward+(x.captainDefense||0)+x.equipmentDefense));assert.equal(x.equipmentAttack,x.equipmentWeapon+(d.equipment.attack?.value||0));assert.equal(x.equipmentDefense,x.equipmentProtection+(d.equipment.defense?.value||0));f.E.assertState(f.s);assert.deepEqual(f.E.restoreGame(JSON.parse(JSON.stringify(f.s))),f.s);return x;}
function numericData(d){for(const c of d.cards){c.atk=[160,130,100,70,40,10];c.defense=[140,115,90,65,40,15];c.magic=[];c.barriers=[];}}
function equip(s,c,item){s[item.slot][c.characterId]=item.id;return s;}
function inject(f,c,slot){const w=f.s.equipment.definitions.find(w=>w.slot===slot);w.restrictions={characterIds:[c.characterId]};f.s.equipment.loadouts[slot==='weapon'?0:1][slot][c.characterId]=w.id;return w;}

test('4.6 definitions, legacy definitions and three independent stable-identity slots',async()=>{
  const d=await catalogue;assert.equal(Q.catalogue.version,2);assert.equal(Q.catalogue.weapons.length,Q.catalogue.legacyWeapons.length);
  for(const w of Q.catalogue.weapons){Q.validateDefinition(w);assert.equal(w.rulesVersion,2);assert.equal(w.slot,Q.catalogue.kind(w));if(w.slot!=='relic'){assert.equal(w.effect.trigger,'RETAINED_SIX');assert.equal(w.effect.duration,'DUEL');assert.equal(w.effect.stat,w.slot==='weapon'?'ATK':'DEF');assert(w.effect.value<=40);}}
  for(const w of Q.catalogue.legacyWeapons){Q.validateDefinition(w);assert.equal(w.slot,'weapon');assert.equal(w.rulesVersion,undefined);}
  const b=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),row=Q.profile('v460');
  let x=Q.equipProfile(row,b.characterId,'fallen-king-axe',d.cards);x=Q.equipProfile(x,b.characterId,'durane-rampart',d.cards);x=Q.equipProfile(x,b.characterId,'exiled-king-seal',d.cards);
  assert.equal(Object.values(x.slots).filter(v=>v.balmhyr).length,3);Q.validateProfile(x,d.cards);
  assert.throws(()=>Q.validateLoadout({weapon:{balmhyr:'durane-rampart'},shield:{},relic:{}},d.cards));
  assert.throws(()=>Q.validateLoadout({...slots(),weapon:{BALMHYR:'fallen-king-axe'}},d.cards));
  assert.throws(()=>Q.validateLoadout({...slots(),weapon:{momo:'fallen-king-axe'}},d.cards));
  assert.throws(()=>Q.equipProfile(x,b.characterId,'fallen-king-axe',d.cards),/chang/);
  const job=Q.catalogue.weapons.find(w=>w.id==='wardens-spear'),carrier=d.cards.find(c=>Q.compatible(job,c));assert(carrier);assert(Q.compatible(job,carrier));assert(!Q.compatible(job,{...carrier,job:'INVALID'}));assert(!Q.compatible(job,{...carrier,weapon:'Gun'}));
  for(const [key,value] of Object.entries(job.restrictions)){assert(Array.isArray(value),key);}
});

test('4.6 catalogue restrictions expose unavailable arms rather than grant an incompatible bonus',async()=>{
  const d=await catalogue;const unavailable=Q.catalogue.weapons.filter(w=>!d.cards.some(c=>Q.compatible(w,c))).map(w=>w.id).sort();
  assert.deepEqual(unavailable,['commanders-sabre','draevenheim-crimson-crossbow','rhinoz-ancestral-horn'].sort());
});

for(const slot of ['weapon','shield'])test('every compatible '+slot+' applies only on retained numeric D6, with unchanged base matchup',async()=>{
  const d=await catalogue;
  for(const item of Q.catalogue.weapons.filter(w=>w.slot===slot)){
    const c=d.cards.find(c=>Q.compatible(item,c));if(!c)continue;
    for(const side of [0,1])for(const die of [5,6]){
      const loadouts=[slots(),slots()];equip(loadouts[side],c,item);
      const f=await fixture({required:[c.id],loadouts,mutate:numericData}),u=f.place(c.id,side),other=f.s.players[1-side].board[0];
      lock(f,slot==='weapon'?u:other,slot==='shield'?u:other);
      f.E.assertState(f.s);f.E.rollAttack(f.s,slot==='weapon'?die:5);f.E.assertState(f.s);f.E.rollDefense(f.s,slot==='shield'?die:5);
      const x=formula(f),part=slot==='weapon'?'equipmentWeapon':'equipmentProtection';assert.equal(x[part],die===6?item.effect.value:0,item.id+' side '+side+' D'+die);
      assert.equal(x.weapon,f.data.weapons[f.E.card(slot==='weapon'?u:other).weapon][f.E.card(slot==='shield'?u:other).weapon]||0);
      const views=f.E.equipmentViews(f.s,u),v=views.find(v=>v.slot===slot);assert.equal(v.weapon.id,item.id);assert.equal(v.active,die===6&&f.s.players[side].board.includes(u));
      if(die===6)assert(f.s.log.some(l=>l.text.includes(item.name)&&l.text.includes('D6')));
    }
  }
});

test('discarded Kalistel D6 has no equipment effect; retained and mandatory second D6 do',async()=>{
  for(const [first,second] of [[6,5],[5,6],[6,null]]){
    const d=await catalogue,c=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,c,Q.catalogue.weapons.find(w=>w.id==='fallen-king-axe'));
    const f=await fixture({required:[c.id],loadouts:[l,slots()],mutate:numericData,kalistel:true}),a=f.place(c.id),b=f.s.players[1].board[0];lock(f,a,b);f.E.rollAttack(f.s,first);
    assert.equal(f.s.phase,'kalistel');assert.equal(f.s.duel.equipment.weapon,null);assert.equal(f.E.equipmentViews(f.s,a).find(v=>v.slot==='weapon').active,false);assert.deepEqual(f.E.restoreGame(f.s),f.s);
    if(second===null)f.E.acceptAttack(f.s);else f.E.useKalistel(f.s,second);f.E.assertState(f.s);f.E.rollDefense(f.s,5);
    assert.equal(formula(f).equipmentWeapon,(second??first)===6?30:0);assert.equal(f.s.kalistel.spent.length,second===null?0:1);
  }
});

test('magic ATK6 and barrier DEF6 coexist with their direct equipment arithmetic',async()=>{
  const d=await catalogue,c=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,c,Q.catalogue.weapons.find(w=>w.id==='fallen-king-axe'));equip(l,c,Q.catalogue.weapons.find(w=>w.id==='durane-rampart'));
  const f=await fixture({required:[c.id],loadouts:[l,l],mutate:d=>{numericData(d);const a=d.cards.find(v=>v.id===c.id);a.magic=[6];a.barriers=[6];a.element='MINERO';}}),a=f.place(c.id),b=f.place(c.id,1);lock(f,a,b);f.E.rollAttack(f.s,6);f.E.rollDefense(f.s,6);const x=formula(f);
  assert.equal(x.magic,true);assert.equal(x.barrier,-f.E.rules.barrier);assert.equal(x.equipmentWeapon,30);assert.equal(x.equipmentProtection,30);assert.equal(f.E.card(a).weapon,'Hache');
});

test('protection contribution remains captured when its wearer dies; ordinary non-D6 Block has none',async()=>{
  const d=await catalogue,c=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,c,Q.catalogue.weapons.find(w=>w.id==='durane-rampart'));
  const f=await fixture({required:[c.id],loadouts:[slots(),l],mutate:d=>{numericData(d);for(const c of d.cards)c.atk=[900,800,700,600,500,400];}}),a=f.s.players[0].board[0],b=f.place(c.id,1);lock(f,a,b);f.E.rollAttack(f.s,6);f.E.rollDefense(f.s,6);
  assert.equal(formula(f).equipmentProtection,30);assert(f.s.players[1].dead.some(u=>u.uid===b.uid));assert.equal(f.s.lastDuel.equipment.protection.weaponId,'durane-rampart');
  const g=await fixture({required:[c.id],loadouts:[slots(),l],mutate:d=>{numericData(d);for(const c of d.cards)c.atk=[0,0,0,0,0,0];}});lock(g,g.s.players[0].board[0],g.place(c.id,1));g.E.rollAttack(g.s,5);g.E.rollDefense(g.s,5);assert.equal(formula(g).equipmentProtection,0);assert.equal(g.s.duel.equipment.protection,null);assert.equal(g.s.match.events[0].hold,true);
});

for(const dice of [[6,5],[5,6]])test('luck recomputes protection '+dice.join(' -> ')+' and restores both attempted formulas',async()=>{
  const d=await catalogue,c=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,c,Q.catalogue.weapons.find(w=>w.id==='durane-rampart'));
  const f=await fixture({required:[c.id],loadouts:[slots(),l],mutate:d=>{numericData(d);for(const c of d.cards)c.atk=[900,800,700,600,500,400];}}),a=f.s.players[0].board[0],b=f.place(c.id,1);b.luck=1;lock(f,a,b);f.E.rollAttack(f.s,5);f.E.rollDefense(f.s,dice[0]);
  assert.equal(f.s.phase,'defense');assert.equal(f.s.duel.failedDefense.equipmentProtection,dice[0]===6?30:0);assert.equal(f.s.duel.failedDefense.equipmentDefenseDie,dice[0]);formula(f);
  Object.assign(f,{s:f.E.restoreGame(JSON.parse(JSON.stringify(f.s)))});f.E.rollDefense(f.s,dice[1]);const x=formula(f);assert.equal(x.equipmentProtection,dice[1]===6?30:0);assert.equal(x.equipmentDefenseDie,dice[1]);assert.equal(f.s.duel.failedDefense.equipmentProtection,dice[0]===6?30:0);assert.equal(f.s.match.events.length,1);
});

test('DEF retry replaces an active protection with the final result without leaving a stale bonus',async()=>{
  const d=await catalogue,c=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,c,Q.catalogue.weapons.find(w=>w.id==='durane-rampart'));
  const f=await fixture({required:[c.id],loadouts:[slots(),l],mutate:d=>{numericData(d);d.cards.find(v=>v.id===c.id).defense[0]='retry';}});lock(f,f.s.players[0].board[0],f.place(c.id,1));f.E.rollAttack(f.s,5);f.E.rollDefense(f.s,6);assert.equal(f.s.phase,'defense');assert.equal(f.s.duel.equipment.protection,null);f.E.assertState(f.s);f.E.rollDefense(f.s,5);assert.equal(formula(f).equipmentProtection,0);
});

test('all native special D6 faces remain special, never numeric equipment or automatic Block',async()=>{
  const d=await catalogue;
  for(const c of d.cards.filter(c=>typeof c.atk[0]!=='number'||typeof c.defense[0]!=='number')){
    const atk=typeof c.atk[0]!=='number',f=await fixture({required:[c.id]}),u=f.place(c.id,atk?0:1);inject(f,c,atk?'weapon':'shield');
    lock(f,atk?u:f.s.players[0].board[0],atk?f.s.players[1].board[0]:u);f.E.rollAttack(f.s,atk?6:6);
    if(f.s.phase==='heart')f.E.grantReraise(f.s,u.uid);else f.E.rollDefense(f.s,atk?5:6);
    f.E.assertState(f.s);assert.equal(f.s.duel.equipment[atk?'weapon':'protection'],null,c.id);assert.equal(f.s.duel.formula,undefined,c.id);assert.deepEqual(f.E.restoreGame(f.s),f.s);
  }
});

test('relic support + protection adds only strongest relic, expires gift, keeps separate direct bonus',async()=>{
  const d=await catalogue,m=d.cards.find(c=>c.id==='30000001'),b=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,m,Q.catalogue.weapons.find(w=>w.id==='little-joys-flute'));equip(l,b,Q.catalogue.weapons.find(w=>w.id==='durane-rampart'));
  const f=await fixture({required:[m.id,b.id],loadouts:[l,slots()],mutate:d=>{for(const c of d.cards)c.defense=[900,800,700,600,500,400];}}),mu=f.place(m.id),bu=f.place(b.id),enemy=f.s.players[1].board[0];lock(f,mu,enemy);f.E.rollAttack(f.s,2);f.E.grantPotion(f.s,bu.uid);f.E.assertState(f.s);assert(f.s.equipment.pending[bu.uid]);f.E.next(f.s);lock(f,enemy,bu);f.E.rollAttack(f.s,6);f.E.rollDefense(f.s,6);
  const x=formula(f);assert.equal(x.equipmentProtection,30);assert.equal(x.equipmentDefense,60);assert.equal(f.s.duel.equipment.defense.weaponId,'little-joys-flute');assert.equal(f.s.equipment.pending[bu.uid],undefined);
});

test('forged direct contribution, die, source, relic contribution and failed-attempt totals are rejected',async()=>{
  const d=await catalogue,c=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,c,Q.catalogue.weapons.find(w=>w.id==='fallen-king-axe'));equip(l,c,Q.catalogue.weapons.find(w=>w.id==='durane-rampart'));
  const f=await fixture({required:[c.id],loadouts:[l,l],mutate:numericData});lock(f,f.place(c.id),f.place(c.id,1));f.E.rollAttack(f.s,6);f.E.rollDefense(f.s,6);formula(f);
  for(const corrupt of [s=>s.duel.equipment.weapon.value++,s=>s.duel.equipment.protection.sourceUid='0-0',s=>s.duel.formula.equipmentWeapon++,s=>s.duel.formula.equipmentProtection=0,s=>s.duel.formula.equipmentDefenseDie=5,s=>s.duel.formula.equipmentAttack++,s=>s.duel.formula.equipmentDefense++,s=>s.lastDuel.equipment.weapon.value++]){const s=f.E.clone(f.s);corrupt(s);assert.throws(()=>f.E.restoreGame(s));}
});

test('modern snapshot freezes all three slots; legacy match snapshot and old axe trigger stay unchanged',async()=>{
  const d=await catalogue,c=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,c,Q.catalogue.weapons.find(w=>w.id==='fallen-king-axe'));equip(l,c,Q.catalogue.weapons.find(w=>w.id==='durane-rampart'));equip(l,c,Q.catalogue.weapons.find(w=>w.id==='exiled-king-seal'));
  const f=await fixture({required:[c.id],loadouts:[l,l],mutate:numericData});const frozen=structuredClone(f.s.equipment);l.weapon.balmhyr='not-an-item';assert.deepEqual(f.s.equipment,frozen);assert.equal(f.s.equipment.version,2);f.E.assertState(f.s);
  const data=structuredClone(d);numericData(data);const E=createEngine(data),ids=deck(E,[c.id]),s=E.newGame(ids,ids,{equipment:[{balmhyr:'fallen-king-axe'},{}],kalistel:false,seed:'LEGACY-460'});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);assert.equal(s.equipment.version,1);assert.deepEqual(s.equipment.definitions,Q.catalogue.legacyWeapons);assert.deepEqual(E.restoreGame(s),s);
  const a=all(s.players[0]).find(u=>u.cardId===c.id),p=s.players[0],old=p.board[0];if(!p.board.includes(a)){p.reserve=p.reserve.filter(u=>u!==a);p.reserve.push(old);p.board[0]=a;a.entered=true;}p.reserve.push(...p.board.filter(u=>u&&u!==a));p.board=p.board.map(u=>u===a?u:null);
  E.lock(s,p.board.indexOf(a),0);E.rollAttack(s,5);E.rollDefense(s,5);assert.equal(s.duel.formula.equipmentAttack,30);assert.equal(s.duel.formula.equipmentWeapon,undefined);assert.deepEqual(E.restoreGame(s),s);
});

test('initiative and ABBA timeline are identical before any equipment use',async()=>{
  const d=await catalogue,E=createEngine(d),ids=deck(E),a=E.newGame(ids,ids,{seed:'ABBA460',turnOrder:'ABBA',equipment:[slots(),slots()]}),b=E.newGame(ids,ids,{seed:'ABBA460',turnOrder:'ABBA'});
  for(const s of [a,b]){E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);while(s.phase==='initiative')E.rollInitiative(s);E.assertState(s);}
  assert.deepEqual(a.initiative,b.initiative);assert.equal(a.rng,b.rng);assert.deepEqual(E.turnPreview(a,12),E.turnPreview(b,12));
});

test('every one-shot relic trigger still grants, survives reload and attacking, consumes once on defense',async()=>{
  const d=await catalogue,supportFace={luck:'retry',mana:'mana',reraise:'revive',ward:'guard',physical:'buff_atk'},grant={luck:'grantClover',mana:'grantPotion',reraise:'grantReraise',ward:'grantGuard',physical:'grantPhysical'};
  for(const w of Q.catalogue.weapons.filter(w=>w.slot==='relic'&&w.effect.trigger==='ONCE_DEFENSE'))for(const side of [0,1]){
    const c=d.cards.find(c=>Q.compatible(w,c)),l=[slots(),slots()];assert(c,w.id);equip(l[side],c,w);
    const key=w.effect.when.supports?.[0],f=await fixture({required:[c.id],loadouts:l,mutate:d=>{
      for(const x of d.cards){x.positions=[1,2,3,4,5];x.atk=[40,900,20,10,5,1];x.defense=[800,700,600,500,400,300];x.magic=w.effect.when.attack==='magic'?[6]:[];x.barriers=[];if(w.effect.when.opponentElement)x.element=w.effect.when.opponentElement;}
      const x=d.cards.find(x=>x.id===c.id);if(key){x.atk[5]=supportFace[key];if(key==='reraise'){x.role=5;x.canHeal=true;}if(key==='ward'){x.role=1;x.canHeal=false;x.canGuard=true;}}
    }}),{E,s}=f,u=f.place(c.id,side),p=s.players[side],enemy=s.players[1-side].board.find(v=>v.cardId!==c.id),ally=p.board.find(v=>v!==u);
    const defend=(target,attack=6,def=5)=>{lock(f,enemy,target);E.rollAttack(s,attack);E.assertState(s);E.rollDefense(s,def);E.assertState(s);assert.deepEqual(E.restoreGame(s),s);};
    const next=()=>{while(E.equipmentChoice(s))E.grantEquipment(s,E.aiEquipmentChoice(s));E.next(s);while(s.phase==='replace')E.autoDeploy(s,s.replacing);E.assertState(s);};
    let recipient=u;
    if(w.effect.event==='DEFENSE'){
      if(w.effect.when.activeAtMost){p.reserve.push(...p.board.filter(v=>v&&v!==u));p.board=p.board.map(v=>v===u?v:null);}
    }else if(w.effect.event==='BLOCK'){defend(u);next();}
    else if(w.effect.event==='SUPPORT'){lock(f,u,enemy);E.rollAttack(s,1);E[grant[key]](s,ally.uid);E.assertState(s);next();}
    else if(w.effect.event==='ALLY_FALL'){defend(ally,5,5);assert(p.dead.includes(ally));next();}
    else if(['DEPLOY','ALLY_DEPLOY'].includes(w.effect.event)){
      const entrant=w.effect.event==='DEPLOY'?u:p.reserve[0];
      if(entrant===u){const index=p.board.indexOf(u);p.board[index]=p.reserve.shift();p.reserve.push(u);}
      const target=p.board.find(v=>v&&v!==u),targetSlot=p.board.indexOf(target);defend(target,5,5);E.next(s);assert.equal(s.phase,'replace');E.deploy(s,side,entrant.uid,targetSlot);E.assertState(s);recipient=entrant;
    }else assert.fail('Unhandled current relic event '+w.effect.event);
    if(w.effect.event!=='DEFENSE'){
      const row=s.equipment.defensive.grants.find(r=>r.sourceUid===u.uid);assert(row,w.id);recipient=p.board.find(v=>v?.uid===row.recipient);assert(recipient,w.id);assert.equal(row.status,'ready');
      lock(f,recipient,enemy);E.rollAttack(s,6);if(s.phase==='defense')E.rollDefense(s,5);else {assert.equal(s.phase,'heart');E.grantReraise(s,recipient.uid);}E.assertState(s);assert.equal(row.status,'ready');next();
    }
    defend(recipient);const x=formula(f);assert.equal(x.equipmentDefense,w.effect.value,w.id);assert.equal(x.equipmentProtection,0);assert.equal(s.equipment.defensive.grants.find(r=>r.sourceUid===u.uid).status,'spent');next();
    defend(recipient);assert.equal(formula(f).equipmentDefense,0,w.id+' never recharges');
  }
});

test('complete three-slot ABBA matches preserve numeric effects and state through repeated restores',async()=>{
  const d=await catalogue,E=createEngine(d),audit=require('../revisions/2026-10-09-equipment-slots/balance.cjs');
  for(let i=0;i<12;i++){
    const r=audit.random(4600+i),ids=audit.legalDeck(E,r,d.cards.filter(c=>Q.catalogue.weapons.some(w=>Q.compatible(w,c)))),outfit=audit.outfit(E,ids,'all',r),t=audit.team(E,ids,outfit);
    const result=audit.run(E,t,t,{seed:'FULL-V460-'+i,arenaId:d.arenas[i%d.arenas.length].id,fullChecks:true,restore:true});assert(result.checks>10);assert(result.exchanges>0);
  }
});

test('public AI values a D6 weapon at one sixth of its bonus, not as a permanent +30',async()=>{
  const d=await catalogue,c=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,c,Q.catalogue.weapons.find(w=>w.id==='fallen-king-axe'));
  const f=await fixture({required:[c.id],loadouts:[l,slots()],mutate:d=>{for(const x of d.cards){x.positions=[1,2,3,4,5];x.atk=[90,90,90,90,90,90];x.defense=[100,100,100,100,100,100];x.element='NONE';x.magic=[];x.barriers=[];x.weapon='Hache';x.faction='Durane';x.race='HUMAIN';}}}),u=f.place(c.id),p=f.s.players[0],competitor=p.board.find(v=>v!==u);
  f.E.card(u).atk=[100,100,100,100,100,100];f.E.card(competitor).atk=[106,106,106,106,106,106];
  assert.equal(f.E.aiChoice(f.s)[0],p.board.indexOf(competitor));assert.equal(f.E.equipmentModifier(f.s,u,'ATK'),null);f.E.assertState(f.s);
});

test('several actual relic grants choose strongest once, add direct protection, then consume every charge',async()=>{
  const d=await catalogue,b=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),m=d.cards.find(c=>c.id==='30000001'),t=d.cards.find(c=>c.characterId==='tidus-ff10'),l=slots();
  for(const [c,id] of [[b,'exiled-king-seal'],[m,'little-joys-flute'],[t,'zanarkand-abes-pendant'],[t,'zanarkand-pauldron']])equip(l,c,Q.catalogue.weapons.find(w=>w.id===id));
  const f=await fixture({required:[b.id,m.id,t.id],loadouts:[l,slots()],mutate:d=>{numericData(d);for(const c of d.cards){c.positions=[1,2,3,4,5];c.defense=[900,800,700,600,500,400];}d.cards.find(c=>c.id===m.id).atk[4]='mana';}}),{E,s}=f,bu=f.place(b.id),mu=f.place(m.id),tu=f.place(t.id),enemy=s.players[1].board.find(u=>u.cardId!==m.id);
  const defend=(u,die=5)=>{lock(f,enemy,u);E.rollAttack(s,5);E.rollDefense(s,die);E.assertState(s);};
  defend(tu);E.next(s);defend(bu);assert(E.equipmentChoice(s));E.grantEquipment(s,tu.uid);E.assertState(s);E.next(s);
  lock(f,mu,enemy);E.rollAttack(s,2);E.grantPotion(s,tu.uid);E.assertState(s);E.next(s);
  defend(tu,6);const x=formula(f);assert.equal(x.equipmentProtection,20);assert.equal(x.equipmentDefense,50);assert.equal(s.duel.equipment.defense.weaponId,'little-joys-flute');assert.equal(s.duel.equipment.defensiveSources.length,2);
  assert(s.equipment.defensive.grants.every(r=>r.status==='spent'));assert.deepEqual(s.equipment.pending,{});E.next(s);defend(tu,6);assert.equal(formula(f).equipmentDefense,20);
});

test('Death versus numeric DEF6 does not activate a protection or generate a numeric formula',async()=>{
  const d=await catalogue,b=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),v=d.cards.find(c=>c.id==='30000028'),l=slots();equip(l,b,Q.catalogue.weapons.find(w=>w.id==='durane-rampart'));
  const f=await fixture({required:[b.id,v.id],loadouts:[slots(),l]}),a=f.place(v.id),target=f.place(b.id,1);lock(f,a,target);f.E.rollAttack(f.s,6);f.E.rollDefense(f.s,6);f.E.assertState(f.s);assert.equal(f.s.duel.attackValue,'death');assert.equal(f.s.duel.equipment.protection,null);assert.equal(f.s.duel.formula,undefined);assert.deepEqual(f.E.restoreGame(f.s),f.s);
});

test('replacing a weapon preserves protection/relic and does not mutate the original profile',async()=>{
  const d=await catalogue,c=d.cards.find(c=>c.characterId==='geralt-witcher'&&c.weapon===Q.catalogue.weapons.find(w=>w.id==='wolf-steel').family);assert(c);
  let row=Q.profile('replacement-460');for(const id of ['wolf-steel','wolf-school-armor','wolf-medallion'])row=Q.equipProfile(row,c.characterId,id,d.cards);
  const old=structuredClone(row),next=Q.equipProfile(row,c.characterId,'wolf-silver',d.cards,{expected:'wolf-steel',expectedProfile:row});
  assert.equal(next.slots.weapon[c.characterId],'wolf-silver');assert.deepEqual(next.slots.shield,old.slots.shield);assert.deepEqual(next.slots.relic,old.slots.relic);assert.deepEqual(row,old);
  assert.throws(()=>Q.equipProfile(next,c.characterId,'wolf-steel',d.cards,{expected:'wolf-steel',expectedProfile:row}),/chang/);
});

test('same-valued DEF faces cannot forge a D6 protection when the recorded die was D5',async()=>{
  const d=await catalogue,c=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,c,Q.catalogue.weapons.find(w=>w.id==='durane-rampart'));
  const f=await fixture({required:[c.id],loadouts:[slots(),l],mutate:d=>{numericData(d);for(const c of d.cards)c.defense=[400,400,300,200,100,50];}}),a=f.s.players[0].board[0],b=f.place(c.id,1);lock(f,a,b);f.E.rollAttack(f.s,5);f.E.rollDefense(f.s,5);formula(f);
  const s=f.E.clone(f.s),w=s.equipment.definitions.find(w=>w.id==='durane-rampart'),entry={weaponId:w.id,name:w.name,stat:'DEF',value:w.effect.value,sourceUid:b.uid};
  for(const d of [s.duel,s.lastDuel]){d.defenseDie=6;d.equipment.protection=entry;d.formula.equipmentDefenseDie=6;d.formula.equipmentProtection=30;d.formula.equipmentDefense=30;d.formula.defense+=30;}
  s.match.events[0].defense+=30;
  assert.throws(()=>f.E.restoreGame(s),'die histories are authoritative even when printed values coincide');
});

test('failed luck attempt cannot borrow the D6 of its later successful reroll',async()=>{
  const d=await catalogue,c=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,c,Q.catalogue.weapons.find(w=>w.id==='durane-rampart'));
  const f=await fixture({required:[c.id],loadouts:[slots(),l],mutate:d=>{numericData(d);for(const c of d.cards){c.defense=[400,400,300,200,100,50];c.atk=[900,900,900,900,900,900];}}}),a=f.s.players[0].board[0],b=f.place(c.id,1);b.luck=1;lock(f,a,b);f.E.rollAttack(f.s,5);f.E.rollDefense(f.s,5);f.E.rollDefense(f.s,6);formula(f);
  const s=f.E.clone(f.s);for(const d of [s.duel,s.lastDuel]){d.failedDefense.equipmentDefenseDie=6;d.failedDefense.equipmentProtection=30;d.failedDefense.equipmentDefense=30;d.failedDefense.defense+=30;}
  assert.throws(()=>f.E.restoreGame(s),'a failed formula belongs to the pre-clover numeric attempt, not merely any die in history');
});

test('legacy unsuitable special shield requests a new DEF die, never zero or a D6 protection bonus',async()=>{
  const d=await catalogue,c=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,c,Q.catalogue.weapons.find(w=>w.id==='durane-rampart'));
  for(const [shield,magic] of [['shield_magic',false],['shield_physical',true]]){
    const f=await fixture({required:[c.id],loadouts:[slots(),l],mutate:numericData}),a=f.s.players[0].board.find(u=>u.cardId!==c.id),b=f.place(c.id,1);
    // Exercise the retained legacy branch without authorizing these faces in native V4 profiles.
    f.E.card(b).defense[0]=shield;if(magic){f.E.card(a).element='ELECTRO';f.E.card(a).magic=[5];}
    lock(f,a,b);f.E.rollAttack(f.s,5);f.E.rollDefense(f.s,6);assert.equal(f.s.phase,'defense');assert.equal(f.s.duel.formula,undefined);assert.equal(f.s.duel.equipment.protection,null);assert.equal(f.s.duel.defenseValue,shield);f.E.assertState(f.s);assert.deepEqual(f.E.restoreGame(f.s),f.s);
    f.E.rollDefense(f.s,5);const x=formula(f);assert.equal(x.equipmentProtection,0);assert.equal(x.baseDefense,f.E.card(b).defense[1]);assert.deepEqual(f.s.duel.defenseRolls,[6,5]);
  }
});

test('failed numeric defense saved by Reraise still reports a used protection, not a Block',async()=>{
  const d=await catalogue,c=d.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),l=slots();equip(l,c,Q.catalogue.weapons.find(w=>w.id==='durane-rampart'));
  const f=await fixture({required:[c.id],loadouts:[slots(),l],mutate:d=>{numericData(d);for(const c of d.cards)c.atk=[900,900,900,900,900,900];}}),a=f.s.players[0].board[0],b=f.place(c.id,1);b.reraise=1;lock(f,a,b);f.E.rollAttack(f.s,6);f.E.rollDefense(f.s,6);
  const x=formula(f);assert.equal(x.equipmentProtection,30);assert(x.attack>x.defense);assert.equal(f.s.match.events[0].reraise,true);assert.equal(f.s.match.events[0].hold,false);assert.equal(f.s.match.events[0].kill,false);assert(f.s.players[1].board.includes(b));assert.equal(f.s.lastDuel.equipment.protection.weaponId,'durane-rampart');
});
