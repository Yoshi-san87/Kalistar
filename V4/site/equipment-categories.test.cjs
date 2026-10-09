'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('./equipment.js'),C=require('./weapon-cards.js'),{createEngine}=require('./engine.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const dataPromise=buildCatalog({published:require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created')});
const item=id=>Q.catalogue.weapons.find(w=>w.id===id);
const archive=require('./fixtures/equipment-v4.5.64.json');
async function fixture(id,side=0,mutate=()=>{}){
  const data=structuredClone(await dataPromise);
  for(const c of data.cards){c.atk=[10,10,10,10,10,10];c.defense=[150,150,150,150,150,150];}mutate(data);
  const E=createEngine(data),w=item(id),c=data.cards.find(c=>Q.compatible(w,c));
  const base=data.decks.player,deck=base.map((_,i)=>base.map((v,j)=>i===j?c.id:v)).find(ids=>!E.validatePlayableDeck(ids).length);assert(deck);
  const loadout={[c.characterId]:id},s=E.newGame(deck,deck,{mode:'local',seed:id,kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
  const u=s.players[side].reserve.find(u=>u.cardId===c.id);
  E.autoDeploy(s,0);E.autoDeploy(s,1);
  if(!s.players[side].board.includes(u)){E.recall(s,side,c.positions[0]-1);E.deploy(s,side,u.uid,c.positions[0]-1);}E.start(s);
  return {E,s,u,c,side,data,w};
}
function lock(f,{attack=false}={}){
  const {E,s,u,side}=f;s.turn=attack?side:1-side;
  E.lock(s,attack?s.players[side].board.indexOf(u):0,attack?0:s.players[side].board.indexOf(u));
}
function numeric(f){f.E.rollAttack(f.s,6);f.E.rollDefense(f.s,6);f.E.assertState(f.s);}
function next(f){f.E.next(f.s);while(f.s.phase==='replace')f.E.autoDeploy(f.s,f.s.replacing);}

test('4.6 has three independent slots, with compatible bearers and unchanged base families',async()=>{
  const {cards}=await dataPromise,shield=item('durane-rampart'),pod=item('pod-042');
  assert.equal(Q.catalogue.weapons.length,93);
  assert.deepEqual(['weapon','shield','relic'].map(kind=>Q.catalogue.weapons.filter(w=>Q.catalogue.kind(w)===kind).length),[40,26,27]);
  assert.deepEqual(Q.catalogue.legacyWeapons,archive.weapons);
  for(const w of [shield,pod]){Q.validateDefinition(w);assert.equal(w.restrictions.families,undefined);assert.equal(w.changesFamily,undefined);}
  for(const c of cards){assert.equal(Q.compatible(shield,c),c.faction==='Durane');assert.equal(Q.compatible(pod,c),c.characterId==='2b-nier');}
  assert(cards.filter(c=>c.characterId==='2b-nier').length>=2);
  assert(!Q.compatible(pod,{...cards.find(c=>c.characterId==='2b-nier'),characterId:'not-2b',name:'2B'}));
  let p=Q.profile('qa');p=Q.equipProfile(p,'balmhyr','fallen-king-axe',cards);
  p=Q.equipProfile(p,'balmhyr',shield.id,cards);
  p=Q.equipProfile(p,'balmhyr','exiled-king-seal',cards);
  assert.deepEqual(p.slots,{weapon:{balmhyr:'fallen-king-axe'},shield:{balmhyr:shield.id},relic:{balmhyr:'exiled-king-seal'}});
  assert.deepEqual(Q.validateProfile(JSON.parse(JSON.stringify(p)),cards),p);
  assert.throws(()=>Q.validateProfile({...p,slots:{...p.slots,weapon:{balmhyr:shield.id}}},cards));
  const original=structuredClone(p);
  assert.throws(()=>Q.equipProfile(p,'balmhyr','mythic-iron-gauntlet',cards));
  const replaced=Q.equipProfile(p,'balmhyr','mythic-iron-gauntlet',cards,{expected:'fallen-king-axe',expectedProfile:p});
  assert.deepEqual(replaced.slots,{weapon:{balmhyr:'mythic-iron-gauntlet'},shield:{balmhyr:shield.id},relic:{balmhyr:'exiled-king-seal'}});
  assert.deepEqual(p,original,'replacement must not mutate the old profile');
  assert.throws(()=>Q.equipProfile(p,'momo',shield.id,cards));
  assert.throws(()=>Q.validateDefinition({...shield,kind:'unknown'}));
  for(const [w,label] of [[shield,'Protection'],[pod,'Relique']]){const html=C.markup(w,{cards});assert(html.includes('aria-label="'+label+'"'));assert(!html.includes('undefined'));}
});
for(const side of [0,1])test('archived 4.5.64 shield: first defense only, numeric total and matrix preserved, side '+side,async()=>{
  const f=await fixture('durane-rampart',side),{E,s,u}=f;
  assert.equal(E.equipmentView(s,u).active,false);lock(f);E.rollAttack(s,6);assert(E.equipmentView(s,u).active);
  const before=E.restoreGame(s);assert.deepEqual(before,s);E.rollDefense(s,6);E.assertState(s);
  const formula=s.duel.formula;assert.equal(formula.equipmentDefense,30);
  assert.equal(formula.defense,formula.baseDefense+formula.race+formula.arenaDefense+formula.ward+30);
  assert.equal(formula.weapon,f.data.weapons[E.card(s.players[1-side].board[0]).weapon][f.c.weapon]);
  assert(s.log.some(l=>l.text.includes('Rempart de Durane')&&l.text.includes('+30 DEF')));
  assert.equal(s.equipment.charges[u.uid].status,'spent');assert(!E.equipmentView(s,u).active);assert.deepEqual(E.restoreGame(s),s);
  next(f);lock(f);numeric(f);assert.equal(s.duel.formula.equipmentDefense,0);assert.deepEqual(E.restoreGame(s),s);
});
test('archived 4.5.64: targeted support and attacking do not spend the first defense',async()=>{
  const f=await fixture('durane-rampart',0,data=>{for(const c of data.cards)c.atk[5]='mana';}),{E,s,u}=f;
  lock(f);E.rollAttack(s,1);E.grantPotion(s,s.players[1].board[0].uid);E.assertState(s);assert(!s.equipment.charges);
  next(f);lock(f,{attack:true});numeric(f);assert(!s.equipment.charges);assert.equal(E.equipmentModifier(s,u,'DEF').value,30);
});
for(const face of ['dodge','retry'])test('archived 4.5.64: shield special face '+face+' has no invented numeric bonus',async()=>{
  const f=await fixture('durane-rampart',0,data=>{for(const c of data.cards)c.defense[0]=face;}),{E,s,u}=f;
  lock(f);E.rollAttack(s,6);E.rollDefense(s,6);
  if(face==='retry'){assert.equal(s.phase,'defense');assert(!s.equipment.charges);assert.deepEqual(E.restoreGame(s),s);E.rollDefense(s,5);assert.equal(s.duel.formula.equipmentDefense,30);}
  else assert.equal(s.duel.formula,undefined);
  assert.equal(s.equipment.charges[u.uid].status,'spent');assert.deepEqual(E.restoreGame(s),s);
});
for(const side of [0,1])test('archived 4.5.64 Pod: successful Block, charge survives attack/reload, next defense consumes it once, side '+side,async()=>{
  const f=await fixture('pod-042',side),{E,s,u}=f;
  assert(!E.equipmentView(s,u).active);lock(f);numeric(f);assert.equal(s.duel.formula.equipmentDefense,0);
  assert.equal(s.equipment.charges[u.uid].status,'ready');assert(E.equipmentView(s,u).active);
  assert(s.log.some(l=>l.text.includes('Pod 042')&&l.text.includes('prochaine')));assert.deepEqual(E.restoreGame(s),s);
  next(f);lock(f,{attack:true});numeric(f);assert.equal(s.equipment.charges[u.uid].status,'ready');
  next(f);lock(f);assert.equal(s.duel.equipment.defense.value,20);numeric(f);assert.equal(s.duel.formula.equipmentDefense,20);
  assert.equal(s.equipment.charges[u.uid].status,'spent');assert(!E.equipmentView(s,u).active);assert.deepEqual(E.restoreGame(s),s);
  next(f);lock(f);numeric(f);assert.equal(s.duel.formula.equipmentDefense,0);assert.equal(s.equipment.charges[u.uid].status,'spent');
});
test('archived 4.5.64: Pod never activates from a support, death or Reraise',async()=>{
  for(const scenario of ['support','death','reraise']){
    const f=await fixture('pod-042',0,data=>{for(const c of data.cards)c.atk[0]=scenario==='support'?'mana':'death';}),{E,s,u}=f;
    if(scenario==='reraise')u.reraise=1;
    lock(f);E.rollAttack(s,6);if(scenario==='support')E.grantPotion(s,s.players[1].board[0].uid);else E.rollDefense(s,6);
    assert(!s.equipment.charges?.[u.uid]);if(scenario==='reraise')assert.equal(s.duel.reraised,u.uid);assert.deepEqual(E.restoreGame(s),s);
  }
});
test('archived 4.5.64: snapshot and charge roundtrip; malformed charge history rejected',async()=>{
  const f=await fixture('pod-042'),{E,s,u}=f;lock(f);numeric(f);
  const saved=JSON.stringify(s),profile=Q.profile('qa');profile.slots.weapon[f.c.characterId]='virtuous-contract';assert.equal(JSON.stringify(s),saved);
  for(const change of [b=>b.weaponId='durane-rampart',b=>b.status='infinite',b=>b.round=0,b=>b.round=9]){
    const bad=E.clone(s);change(bad.equipment.charges[u.uid]);assert.throws(()=>E.restoreGame(bad));
  }
  const bad=E.clone(s);bad.equipment.charges.noUnit={weaponId:'pod-042',status:'ready',round:1};assert.throws(()=>E.restoreGame(bad));
  const legacy=E.newGame(f.data.decks.player,f.data.decks.player);assert.deepEqual(E.restoreGame(legacy),legacy);
});

test('archived 4.5.64: complete matches preserve native faces and reload each step in both categories',async()=>{
  const data=await dataPromise,E=createEngine(data);
  for(const id of ['durane-rampart','pod-042'])for(const seed of [1,2,3]){
    const c=data.cards.find(c=>Q.compatible(item(id),c)),base=data.decks.player;
    const deck=base.map((_,i)=>base.map((v,j)=>i===j?c.id:v)).find(ids=>!E.validatePlayableDeck(ids).length);
    const loadout={[c.characterId]:id};let s=E.newGame(deck,deck,{seed:id+seed,mode:'local',equipment:[loadout,loadout]});
    E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
    for(let n=0;s.phase!=='over'&&n<2000;n++){
      if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
      else if(s.phase==='attack')E.rollAttack(s);
      else if(s.phase==='kalistel')E.acceptAttack(s);
      else if(s.phase==='defense')E.rollDefense(s);
      else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
      else if(s.phase==='result')E.next(s);
      else{const [grant,choose]={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']}[s.phase];E[grant](s,E[choose](s));}
      E.assertState(s);s=E.restoreGame(s);
    }
    assert.equal(s.phase,'over');
    for(const p of s.players)for(const u of p.board.filter(Boolean))assert(!E.equipmentView(s,u).active);
  }
});

test('equipment media is independently hashed, transparent and natively anchored',async()=>{
  const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
  const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const sharp=createRequire(path.resolve(runtime,'_equipment_media_qa.cjs'))('sharp');
  const proof=require('../revisions/2026-10-06-equipment-categories/media-provenance.json');
  assert.equal(proof.assets.length,8);
  for(const asset of proof.assets){
    const bytes=fs.readFileSync(path.join(__dirname,'../..',asset.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);
    if(!['body','ring'].includes(asset.role))continue;
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,488);assert.equal(info.height,488);
    assert.equal(data[3],0);assert.equal(data[((info.height-1)*info.width)*4+3],0);
    if(asset.role==='ring')assert.equal(data[(242*info.width+244)*4+3],0,'rotating annulus must have a clear center');
    else{let count=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]){count++;assert(Math.hypot(x-244,y-242)<=171);}assert(count>100);}
  }
});
