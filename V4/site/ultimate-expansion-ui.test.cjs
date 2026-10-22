'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const UI=require('./ultimate-ui.js'),W=require('./weapons.js'),Cards=require('./weapon-cards.js');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const relics=W.weapons.filter(UI.is),weapon=id=>relics.find(w=>w.id===id);
const choice=(mode='target',sourceUid='0-1')=>({type:'ultimate',mode,sourceUid,weapon:weapon(mode==='parity'?'gotham-riddle-box':mode==='trait'?'log-pose':'exiled-king-seal'),targets:['0-2','0-3'],remaining:2,
  options:mode==='parity'?[{value:'even',label:'Pair'},{value:'odd',label:'Impair'}]:mode==='trait'?[{value:'mana',label:'Potion magique',uid:'0-2'},{value:'physical',label:'Puissance physique',uid:'0-2'}]:[{value:'0-2',label:'Alli\u00e9',uid:'0-2'},{value:'0-3',label:'Autre alli\u00e9',uid:'0-3'}]});
function fn(name,next){return app.slice(app.indexOf('  function '+name+'('),app.indexOf('  function '+next+'('));}
function fixture(){
  const children=[],image={offsetLeft:0,offsetTop:0,naturalWidth:797,naturalHeight:1388,addEventListener(){}},container={querySelector:()=>image,append:n=>children.push(n),closest:()=>null};
  const window={KalistarWeapons:W,KalistarWeaponArt:require('./weapon-art.js'),KalistarUltimateUI:UI,addEventListener(){}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'equipment-presentation.js'),'utf8'),{window,matchMedia:()=>({matches:false,addEventListener(){}}),performance:{now:()=>0},AbortController,
    KalistarCardMedia:{crop:require('./card-media.js').crop},getComputedStyle:()=>({width:'180',height:'313.47',objectFit:'contain'}),ResizeObserver:class{observe(){}disconnect(){}},
    document:{createElement:()=>({dataset:{},style:{setProperty(){}},setAttribute(k,v){this[k]=v;},remove(){this.removed=true;}})}});
  return {fx:window.KalistarEquipmentFX,children,container};
}

test('all 36 reactive ultimates, including the Gant de Fer, have separate condition/action copy',()=>{
  assert.equal(relics.length,36);
  assert.equal(weapon('mythic-iron-gauntlet').slot,'relic');
  for(const w of relics){
    assert.equal(w.effect.stat,undefined);assert.equal(w.effect.value,undefined);
    const p=Cards.activation(w),html=Cards.markup(w);
    assert(p.condition.length>15,w.id);assert(p.effect.length>=7,w.id);assert(p.duration.length>5,w.id);
    assert(Cards.effectLabel(w)&&Cards.effectLabel(w)!=='Ultime',w.id);assert(Cards.effectIcon(w));
    assert(!/undefined|NaN|\+0\b/.test(html),w.id);assert(html.includes('wc-power-trait'),w.id);
    assert(html.includes('wc-rule-condition'));assert(html.includes('wc-rule-effect'));
    assert(html.includes('role="group" aria-label="'),w.id+' exposes the complete rule');
  }
  assert.match(Cards.effectLabel(weapon('gotham-ivy-seed')),/-40 ATK/);
  assert.match(Cards.effectLabel(weapon('log-pose')),/Potion.*Puissance/);
  assert.match(Cards.activation(weapon('pod-153')).effect,/arme, cristal, faction, ar\u00e8ne/);
  assert.match(Cards.activation(weapon('gotham-riddle-box')).effect,/avant.*conserv\u00e9/);
  assert.match(Cards.activation(weapon('gotham-riddle-box')).duration,/erron\u00e9e/);
  assert.match(Cards.activation(weapon('guardian-jug')).condition,/ATK chiffr\u00e9e/);
});

test('human defender prediction takes precedence over enemy AI turn',()=>{
  const human=choice('parity','0-1'),enemy=choice('parity','1-1');
  assert.equal(UI.automatic({mode:'ai',turn:1},human),false);
  assert.equal(UI.automatic({mode:'ai',turn:0},enemy),true);
  assert.equal(UI.automatic({mode:'local',turn:0},enemy),false);
  for(const sourceUid of ['0-1','1-1']){
    const timers=[],calls=[],gift=choice('parity',sourceUid),game={mode:'ai',turn:1,phase:'attack'},context={game,ui:{view:'arena'},rolling:false,presentationOpening:false,pendingLineup:null,epoch:1,aiTimer:null,
      window:{KALISTAR_INTRO_PENDING:false},document:{hidden:false},overlayOpen:()=>false,cloudBlocked:()=>false,E:{equipmentChoice:()=>gift,aiEquipmentChoice:()=>'even'},KalistarUltimateUI:UI,
      clearTimeout(){},setTimeout(callback){timers.push(callback);},animatedEquipmentGift:value=>calls.push(value)};
    vm.runInNewContext(fn('scheduleAI','__not_a_function__').split('  async function animatedEquipmentGift')[0]+'\nscheduleAI();',context);
    assert.equal(timers.length,sourceUid[0]==='1'?1:0,'timer follows choice owner, not attacker');
    for(const timer of timers)timer();assert.deepEqual(calls,sourceUid[0]==='1'?['even']:[]);
    timers.length=0;context.window.KALISTAR_INTRO_PENDING=true;
    vm.runInNewContext(fn('scheduleAI','__not_a_function__').split('  async function animatedEquipmentGift')[0]+'\nscheduleAI();',context);
    assert.equal(timers.length,0,'AI must wait while the login film is still covering the game');
    context.window.KALISTAR_INTRO_PENDING=false;context.cloudBlocked=()=>true;
    vm.runInNewContext(fn('scheduleAI','__not_a_function__').split('  async function animatedEquipmentGift')[0]+'\nscheduleAI();',context);
    assert.equal(timers.length,0,'a device without the cloud writer lease cannot drive an AI choice');
  }
});

test('target highlights use choice owner; parity and fixed-recipient trait cannot be assigned by clicking a card',()=>{
  const s={mode:'ai'},gift={...choice(),targets:['1-2'],options:[{value:'1-2',label:'Enemy',uid:'1-2'}]};
  assert.equal(UI.canTarget(s,gift,'1-2'),true,'Ivy human may mark enemy card');
  assert.equal(UI.canTarget(s,{...gift,sourceUid:'1-1'},'1-2'),false);
  for(const mode of ['parity','trait'])assert.equal(UI.canTarget(s,choice(mode),'0-2'),false);
  assert.equal(UI.canTarget(s,null,'0-2'),false);
});

test('option values and labels remain distinct, escaped, keyboard-native and disabled for AI',()=>{
  const s={mode:'ai'},name=()=>'<Momo>',art=()=>'/image.webp';
  const target=UI.choiceMarkup(s,choice(),{name,art});assert(target.includes('&lt;Momo&gt;'));assert(!target.includes('<Momo>'));
  assert(target.includes('data-value="0-2"'));assert(target.includes('2 dons restants'));
  const trait=UI.choiceMarkup(s,choice('trait'),{name,art});assert(trait.includes('Potion magique'));assert(trait.includes('Puissance physique'));
  assert(!/<button[^>]*data-value="0-2"/.test(trait));assert(trait.includes('Soutien au renfort \u00b7 &lt;Momo&gt;'));
  const parity=UI.choiceMarkup(s,choice('parity'),{art});assert(parity.includes('avant le jet ennemi'));assert(parity.includes('data-value="even"'));assert(parity.includes('2 \u00b7 4 \u00b7 6'));
  const ai=UI.choiceMarkup(s,choice('parity','1-1'),{art});assert.equal((ai.match(/ disabled/g)||[]).length,2);
});

test('choices replace the normal action in attack, choose, replace and result without changing phases',()=>{
  for(const phase of ['attack','choose','replace','result']){
    const s={phase,mode:'local',turn:1,replacing:0,players:[{board:[],reserve:[],dead:[]},{board:[],reserve:[],dead:[]}],duel:{side:1,attackRolls:[],defenseRolls:[],outcome:'Block'}};
    const context={game:s,ui:{attacker:null,target:null},rolling:false,E:{equipmentChoice:()=>choice('parity')},KalistarUltimateUI:UI,KalistarEquipmentFX:{art:()=>''},KalistarFinale:{endsAfterResult:()=>false},
      consoleParticipants:()=>({a:null}),duelRecap:()=>'',hasCrystal:()=>false,asset:()=>'',icon:()=>'',esc:s=>String(s),duelAction:(action)=>`<button data-action="${action}"></button>`};
    context.data={elements:{}};context.baseEngine={...context.E,data:context.data};
    context.KalistarJourneyCombat={engineFor:(data,state)=>{assert.equal(data,context.data);assert.equal(state,s);return null;}};
    const html=vm.runInNewContext(fn('matchEngine','matchArena')+fn('consoleBody','reserveZone')+'\nconsoleBody(game);',context);
    assert(html.includes('data-mode="parity"'),phase);assert(!/data-action="(?:roll|next|lock|auto-replace)"/.test(html),phase);assert.equal(s.phase,phase);
  }
});

test('global deployment events and duel events deduplicate by stable id, including restore',()=>{
  const before={matchId:'m',round:1,equipment:{rituals:{events:[]}}},grant={id:'u7',kind:'grant',weaponId:'log-pose',sourceUid:'0-1',recipient:'0-2',trait:'mana'};
  const after=structuredClone(before);after.equipment.rituals.events.push(grant);
  assert.deepEqual(UI.newEvents(before,after),[grant],'no duel required for deployment');
  after.duel={ultimateEvents:[grant]};assert.equal(UI.newEvents(before,after).length,1);
  assert.equal(UI.newEvents(after,structuredClone(after)).length,0);assert.equal(UI.newEvents(before,{...after,matchId:'other'}).length,0);
  assert.equal(UI.newEvents(null,after).length,0);
  const fx=fixture().fx;assert.equal(fx.newRelicEvents(before,after).length,1);
  assert.match(UI.eventLabel(grant),/Potion re\u00e7u/);assert.equal(UI.eventLabel({kind:'bonus',value:-40,stat:'ATK'}),'-40 ATK');
  const lost=structuredClone(after);lost.equipment.rituals.records={'0-1':{status:'lost'}};lost.equipment.rituals.events.push({...grant,id:'u8',kind:'spent'});
  assert.equal(UI.eventLabel(UI.newEvents(after,lost)[0]),'Marque perdue');
});

test('deployment actions animate committed global gifts once without replaying older events',async()=>{
  const state={matchId:'deploy',equipment:{rituals:{events:[]}}},calls=[];
  const context={game:state,rolling:false,presentationOpening:false,epoch:0,checkGame(){},render(){},toast:message=>assert.fail(message),
    E:{equipmentChoice:()=>null,clone:structuredClone,assertState(){}},KalistarUltimateUI:UI,playCommittedEquipment:before=>calls.push({before,after:structuredClone(state)})};
  vm.runInNewContext(app.slice(app.indexOf('  async function act('),app.indexOf('  async function playCommittedEquipment(')),context);
  const event={id:'deploy-1',kind:'grant',weaponId:'kalistar-nestown-beacon',sourceUid:'0-1',recipient:'0-2',trait:'ward'};
  await context.act(()=>state.equipment.rituals.events.push(event));
  assert.equal(calls.length,1);assert.equal(UI.newEvents(calls[0].before,calls[0].after).length,1);
  await context.act(()=>{});assert.equal(calls.length,1,'no replay on subsequent deployment/lock');
  context.E.equipmentChoice=()=>choice('trait');await context.act(()=>assert.fail('pending choice must block game advance'));
  assert.equal(calls.length,1);
});

test('awakened, marked, consumed-in-use and exhausted states stay distinct in card detail',()=>{
  const f=fixture(),w=weapon('gotham-utility-belt');
  for(const [state,expected]of [[{active:true,ready:true,status:'ready',targetUid:'1-2'},'mark'],[{active:true,ready:false,status:'spent'},'active']]){
    f.fx.mountDetail(f.container,{weapon:w,slot:'relic',...state},{arena:true});const n=f.children.at(-1);
    assert.equal(n.dataset.relicState,expected);assert(n.className.includes('is-active'));assert(!n.innerHTML.includes('eq-tab'));assert(!n['aria-label'].includes('undefined'));
  }
  for(const status of ['lost','spent','tracking'])f.fx.mountDetail(f.container,{weapon:w,slot:'relic',active:false,ready:false,status},{arena:true});
  assert.equal(f.children.length,2);assert(f.children.every(n=>n.removed));
});

test('recap preserves source and signed effective modifiers without showing another recipient or stat',()=>{
  const s={duel:{attacker:'0-1',target:'1-1',equipment:{attack:{value:40}},ultimateModifiers:[{id:'m0',sourceUid:'0-2',weaponId:'griever-pendant',recipient:'0-1',stat:'ATK',value:60},{id:'m1',sourceUid:'1-3',weaponId:'gotham-ivy-seed',recipient:'0-1',stat:'ATK',value:-40},{id:'m2',sourceUid:'1-2',weaponId:'obsidian-star',recipient:'1-1',stat:'DEF',value:60},{id:'m3',sourceUid:'1-4',weaponId:'gotham-ivy-seed',recipient:'0-1',stat:'ATK',value:-20}]}};
  assert.equal(UI.total(s,'ATK'),-20);assert.equal(UI.total(s,'DEF'),60);
  assert.deepEqual(UI.modifiers(s,'ATK').map(m=>m.weaponId),['griever-pendant','gotham-ivy-seed']);
  assert(app.includes('f.ultimateAttack??KalistarUltimateUI.total'));
  assert(app.includes("recapRow(stat==='ATK'?'ultimateAttack':'ultimateDefense'"));
});

test('loader order and choice CSS preserve the mobile card area and reduced motion',()=>{
  const boot=fs.readFileSync(path.join(__dirname,'boot.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'ultimate-ui.css'),'utf8');
  for(const [a,b]of [['ultimate-definitions.js','weapons.js'],['ultimate-runtime.js','equipment.js'],['ultimate-ui.js','equipment-presentation.js']])assert(boot.indexOf("'"+a+"'")<boot.indexOf("'"+b+"'"));
  assert(boot.includes('ultimate-ui.css'));assert(css.includes('prefers-reduced-motion:reduce'));assert(css.includes('grid-template-rows:minmax(0,1fr) auto minmax(0,1fr)'));
  assert(!/setInterval|requestAnimationFrame/.test(fs.readFileSync(path.join(__dirname,'ultimate-ui.js'),'utf8')));
});
