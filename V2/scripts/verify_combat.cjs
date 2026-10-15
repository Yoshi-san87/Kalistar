const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/combat');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'donnees',n+'.json')));
const data={cards:read('cartes'),rules:read('regles'),demo:read('regles_demo'),elements:read('elements'),weapons:read('armes'),decks:read('decks_demo')};
const E=require('../site/engine.js').createEngine(data),url='file:///'+root.replace(/\\/g,'/')+'/site/index.html#arena';
const report={checks:[],elements:[],screens:[],errors:[]};
const rngFor=die=>{for(let rng=1;rng<4294967295;rng+=101){let x=rng;x^=x<<13;x^=x>>>17;x^=x<<5;if(Math.floor((x>>>0)/4294967296*6)+1===die)return rng;}};
function fixture(c,side=0,opponent=data.decks.enemy){
 const deck=[c.id,...data.decks.player.filter(id=>id!==c.id&&!(c.element==='RAINBOW'&&E.byId[id].element==='RAINBOW'))].slice(0,10);
 for(const id of data.decks.enemy)if(deck.length<10&&!deck.includes(id)&&E.byId[id].element!=='RAINBOW')deck.push(id);
 assert.deepEqual(E.validateDeck(deck),[]);
 const s=E.newGame(side?opponent:deck,side?deck:opponent,{mode:'local',seed:'COMBAT-QA'});
 E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);s.turn=side;
 const index=s.players[side].board.findIndex(u=>u?.cardId===c.id);assert(index>=0);return {s,index};
}
function duel({element,magic,kind,side=0}){
 for(const c of data.cards.filter(c=>!element||c.element===element)){
  const {s,index}=fixture(c,side,['shield','retry','wrong-shield'].includes(kind)?data.decks.player:data.decks.enemy);
  for(let atk=1;atk<=6;atk++){
   if(typeof E.dieValue(c,'atk',atk)!=='number'||(magic!==undefined&&c.magic.includes(atk)!==magic))continue;
   for(let target=0;target<5;target++)for(let def=1;def<=6;def++){
    const state=E.clone(s);E.lock(state,index,target);E.rollAttack(state,atk);state.rng=rngFor(def);
    if(kind==='reraise')state.players[1-side].board[target].reraise=1;
    const after=E.clone(state);E.rollDefense(after);
    const d=after.duel;
    const match=kind==='defeat'?!after.players[1-side].board[target]:kind==='reraise'?!!d.reraised:kind==='dodge'?d.defenseValue==='dodge':kind==='shield'?d.defenseValue.startsWith?.('shield')&&after.phase==='result':kind==='resist'?d.formula&&d.formula.attack<=d.formula.defense:kind==='retry'?after.phase==='defense'&&d.defenseValue==='retry':kind==='wrong-shield'?after.phase==='defense'&&d.defenseValue.startsWith?.('shield'):after.phase==='result';
    if(match)return {before:state,after,c};
   }
  }
 }
 throw new Error('No fixture: '+JSON.stringify({element,magic,kind,side}));
}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')));
async function setState(page,s){
 await page.evaluate(s=>{localStorage.setItem('kalistar.v2.game',JSON.stringify(s));localStorage.setItem('kalistar.v2.boardScale','100');},s);
 await page.goto(url);await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
 await page.locator('img').evaluateAll(async imgs=>{for(const img of imgs){img.loading='eager';await img.decode();}});
}
async function roll(page){
 await page.evaluate(()=>{
  window.combatSamples=[];const start=performance.now();let active=false;
  const sample=()=>{
   const busy=document.querySelector('#app').classList.contains('rolling');active||=busy;
   const source=document.querySelector('.combat-actor .slot-card'),target=document.querySelector('.combat-target .slot-card');
   if(source&&target)window.combatSamples.push({source:getComputedStyle(source).transform,opacity:Number(getComputedStyle(target).opacity),shield:!!document.querySelector('.combat-shield')});
   if(performance.now()-start<8000&&(!active||busy))requestAnimationFrame(sample);
  };requestAnimationFrame(sample);
 });
 await page.locator('[data-action="roll"]').click();
}
async function finish(page,expected){await page.waitForFunction(()=>!document.querySelector('#app').classList.contains('rolling'));assert.deepEqual(await saved(page),expected);assert.equal(await page.locator('.combat-magic,.combat-shield,.combat-impact,.combat-actor').count(),0);}
async function recap(page,f){
 if(!f)return;
 for(const key of ['baseAttack','weapon','element','faction','buff','barrier','baseDefense','race'])assert.equal(Number(await page.locator(`[data-bonus="${key}"] b`).textContent()),f[key],key);
 for(const key of ['attack','defense'])assert.equal(Number(await page.locator(`[data-total="${key}"]`).textContent()),f[key],key);
 const boxes=await page.locator('.duel-die,.duel-recap').evaluateAll(nodes=>nodes.map(n=>({class:n.className,y:n.getBoundingClientRect().y,bottom:n.getBoundingClientRect().bottom})));
 assert(boxes[0].bottom<=boxes[1].y&&boxes[1].bottom<=boxes[2].y);
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url);
  const phy=duel({magic:false,kind:'resist'});await setState(page,phy.before);
  assert.equal(await page.locator('[data-bonus="barrier"] b').textContent(),'…');
  await roll(page);await page.waitForSelector('[data-combat="physical"]');await page.waitForTimeout(170);
  assert.notEqual(await page.locator('.combat-actor .slot-card').evaluate(n=>getComputedStyle(n).transform),'none');
  await page.waitForSelector('.combat-shield');await page.waitForTimeout(60);
  await page.screenshot({path:path.join(out,'physical-shield.png'),fullPage:true});await finish(page,phy.after);await recap(page,phy.after.duel.formula);
  assert(await page.evaluate(()=>combatSamples.some(s=>s.opacity<.9)&&combatSamples.some(s=>s.shield)));
  report.checks.push('Physical lunge and return, dimmed hit, Lucide shield on resistance, exact numeric recap, seeded state unchanged by animations');
  for(const element of Object.keys(data.elements)){
   const rendererOnly=!data.cards.some(c=>c.element===element&&c.magic.length);
   const f=duel({element:rendererOnly?undefined:element,magic:true,kind:'resist'});await setState(page,f.before);
   if(rendererOnly)await page.evaluate(args=>{window.previewDone=false;window.KalistarCombat.play({...args,signal:new AbortController().signal,reduced:false}).then(()=>{window.previewDone=true;});},{before:f.before,after:f.after,element,color:'#'+data.elements[element].color});
   else await roll(page);
   await page.waitForSelector('.combat-magic');await page.waitForTimeout(220);
   const pixels=await page.locator('.combat-magic').evaluate(c=>{const values=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let visible=0;for(let i=3;i<values.length;i+=4)if(values[i]>40)visible++;return {visible,element:c.dataset.element,color:c.dataset.color};});
   assert(pixels.visible>100);assert.equal(pixels.element,element);assert.equal(pixels.color,'#'+data.elements[element].color);
   if(['ELECTRO','RAINBOW','HEMATO'].includes(element))await page.screenshot({path:path.join(out,`magic-${element}.png`),fullPage:true});
   if(rendererOnly){await page.waitForFunction(()=>window.previewDone);assert.deepEqual(await saved(page),f.before);}
   else{await finish(page,f.after);await recap(page,f.after.duel.formula);}
   report.elements.push({...pixels,rendererOnly});
  }
  for(const kind of ['defeat','reraise','dodge','shield','retry','wrong-shield']){
   const f=duel({kind});await setState(page,f.before);await roll(page);
   if(!['retry','wrong-shield'].includes(kind)){
    await page.waitForSelector('[data-combat]');assert.equal(await page.locator('[data-combat]').getAttribute('data-reaction'),kind==='shield'?'shield':kind);
    if(kind==='dodge')assert.equal(await page.locator('.combat-impact,.combat-shield').count(),0);
   }
   await finish(page,f.after);await recap(page,f.after.duel.formula);
   if(['dodge','shield'].includes(kind)){assert.equal(await page.locator('[data-total]').count(),0);assert((await page.locator('.duel-recap').textContent()).includes('Attaque annulée'));}
  }
  const reverse=duel({side:1,magic:false,kind:'resist'});await setState(page,reverse.before);await roll(page);await page.waitForSelector('[data-combat]');await page.waitForTimeout(180);
  assert(await page.locator('.combat-actor').evaluate(n=>n.closest('.formation').dataset.player==='1'));await finish(page,reverse.after);
  report.checks.push('Defeat, Reraise, dodge, special shield, incompatible-shield/retry and reversed attacker handled without false totals');
  for(const effect of ['revive','mana','buff_atk','retry']){
   const c=data.cards.find(c=>c.atk.includes(effect)),{s,index}=fixture(c);E.lock(s,index,0);s.rng=rngFor(6-c.atk.indexOf(effect));
   const expected=E.clone(s);E.rollAttack(expected);await setState(page,s);await roll(page);await finish(page,expected);
   assert.equal(await page.evaluate(()=>combatSamples.length),0);
  }
  report.checks.push('Heart, potion, physical buff and ATK retry never trigger a damaging animation');
  const magic=duel({element:'ELECTRO',magic:true,kind:'resist'});await setState(page,magic.before);await roll(page);await page.waitForSelector('.combat-magic');
  await page.locator('[data-view="collection"]').click();await page.waitForTimeout(1000);assert.deepEqual(await saved(page),magic.before);assert.equal(await page.locator('.combat-magic,.combat-shield').count(),0);
  await setState(page,magic.before);await roll(page);await page.waitForSelector('.combat-magic');
  await page.locator('#game-file').setInputFiles({name:'replacement.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(phy.before))});
  await page.waitForTimeout(1000);assert.deepEqual(await saved(page),phy.before);assert.equal(await page.locator('.combat-magic').count(),0);
  report.checks.push('Navigation and save import during spell cancel stale commit and clean all effect nodes');
  await page.emulateMedia({reducedMotion:'reduce'});
  await setState(page,magic.before);await roll(page);await finish(page,magic.after);
  report.checks.push('Reduced motion resolves directly with identical results');
  for(const viewport of [{width:2493,height:1461},{width:1920,height:1080},{width:1440,height:1000},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]){
   await page.setViewportSize(viewport);await setState(page,magic.after);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await recap(page,magic.after.duel.formula);
   const geometry=await page.locator('.team').evaluateAll(teams=>teams.map(team=>{
    const r=team.querySelector('.reserve-zone').getBoundingClientRect(),b=team.querySelector('.formation').getBoundingClientRect();
    const cards=[...team.querySelectorAll('.reserve-card')].map(c=>c.getBoundingClientRect());
    return {side:team.dataset.team,outside:team.dataset.team==='0'?r.right<=b.left:r.left>=b.right,stacked:cards.every((c,i)=>i===0||Math.abs(c.left-cards[i-1].left)<1&&c.top>=cards[i-1].bottom)};
   }));assert(geometry.every(g=>g.outside&&g.stacked));
   await page.screenshot({path:path.join(out,`recap-${viewport.width}.png`),fullPage:true});
   if(viewport.width<=768){await page.locator('[data-action="focus-duel"]').click();await page.screenshot({path:path.join(out,`recap-center-${viewport.width}.png`),fullPage:true});}
   report.screens.push({...viewport,geometry});
  }
  await page.setViewportSize({width:1920,height:1080});
  const setup=fixture(data.cards[0]).s;setup.phase='setup';for(let i=0;i<5;i++)E.recall(setup,0,i);await setState(page,setup);
  assert.equal(await page.locator('.team-left .reserve-card').count(),10);
  await page.locator('.team-left .reserve-card').last().scrollIntoViewIfNeeded();await page.locator('.team-left .reserve-card').last().click();
  assert(await page.locator('.slot.compatible').count()>0);
  await page.locator('.slot.compatible [data-action="slot"]').first().click();assert.equal((await saved(page)).players[0].reserve.length,9);
  const ai=E.clone(magic.after);ai.mode='ai';await setState(page,ai);assert.equal(await page.locator('.team-right .reserve-card.face-down').count(),ai.players[1].reserve.length);assert.equal(await page.locator('.team-right .reserve-card[data-uid]').count(),0);
  await page.locator('[data-action="journal"]').click();assert(await page.locator('#journal-dialog .log-list li').count()>3);assert(await page.locator('#journal-dialog .formula-row').count()>8);
  report.checks.push('Six viewport layouts; outer vertical reserves; 10-card reserve scroll and deployment; AI reserves stay hidden; complete journal preserved');
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'combat-tests.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exit(1)});
