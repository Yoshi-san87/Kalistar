const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/challenge');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'donnees',n+'.json')));
const data={cards:read('cartes'),rules:read('regles'),demo:read('regles_demo'),elements:read('elements'),weapons:read('armes'),decks:read('decks_demo')};
const E=require('../site/engine.js').createEngine(data),url='file:///'+root.replace(/\\/g,'/')+'/site/index.html#arena';
const report={checks:[],screens:[],auras:[],errors:[]};
function fixture(mode='local',card=null){
 let deck=data.decks.player;
 if(card){deck=[card.id,...deck.filter(id=>id!==card.id&&!(card.element==='RAINBOW'&&E.byId[id].element==='RAINBOW'))].slice(0,10);for(const id of data.decks.enemy)if(deck.length<10&&!deck.includes(id)&&E.byId[id].element!=='RAINBOW')deck.push(id);}
 const s=E.newGame(deck,data.decks.enemy,{mode,seed:'CHALLENGE-QA'});E.autoDeploy(s,0);E.autoDeploy(s,1);return s;
}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')));
const slot=(page,side,index)=>page.locator(`.slot-card[data-side="${side}"][data-slot="${index}"]`);
const reserve=(page,uid)=>page.locator(`.reserve-card[data-uid="${uid}"]`);
const center=async locator=>{const b=await locator.boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};};
async function ready(page){await page.waitForFunction(()=>window.KALISTAR_READY);await page.locator('img').evaluateAll(async imgs=>{for(const i of imgs){i.loading='eager';await i.decode();}});}
async function state(page,s){await page.goto(url);await page.waitForFunction(()=>document.body.classList.contains('arena-view'));await page.evaluate(s=>{localStorage.setItem('kalistar.v2.game',JSON.stringify(s));localStorage.setItem('kalistar.v2.boardScale','100');},s);await page.reload();await ready(page);await page.evaluate(()=>window.scrollTo(0,0));}
async function drag(page,from,to,{cancel=false,shot=false}={}){
 await from.scrollIntoViewIfNeeded();const a=await center(from),b=await center(to);
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(a.x+12,a.y+5,{steps:3});
 await page.waitForSelector('.formation-drag-ghost');await page.mouse.move(b.x,b.y,{steps:16});
 if(shot)await page.screenshot({path:path.join(out,'formation-drag.png'),fullPage:true});
 if(cancel)await page.keyboard.press('Escape');await page.mouse.up();await page.waitForTimeout(70);
}
async function finish(page,expected){await page.waitForFunction(()=>!document.querySelector('#app').classList.contains('rolling'));assert.deepEqual(await saved(page),expected);assert.equal(await page.locator('.combat-emblem,.combat-life-wave,.combat-afterimage').count(),0);}
function rngFor(die){for(let n=1;n<100000;n+=101){let x=n;x^=x<<13;x^=x>>>17;x^=x<<5;if(Math.floor((x>>>0)/4294967296*6)+1===die)return n;}}
async function screenshot(page,name){await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});}
async function aura(page){return page.locator('.element-aura').evaluateAll(nodes=>nodes.map(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let visible=0;for(let i=3;i<data.length;i+=4)if(data[i]>50)visible++;return {element:c.closest('.slot').dataset.element,visible,image:c.toDataURL()};}));}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce',hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url);const setup=fixture();await state(page,setup);
  const u=setup.players[0].reserve[0],position=E.card(u).positions[0]-1,old=setup.players[0].board[position];
  await drag(page,reserve(page,u.uid),slot(page,0,position),{shot:true});
  const deployed=await saved(page);assert.equal(deployed.players[0].board[position].uid,u.uid);assert(deployed.players[0].reserve.some(u=>u.uid===old.uid));E.assertState(deployed);
  await state(page,setup);await drag(page,reserve(page,u.uid),slot(page,1,position));assert.deepEqual(await saved(page),setup);
  const forbidden=[0,1,2,3,4].find(i=>!E.card(u).positions.includes(i+1));await drag(page,reserve(page,u.uid),slot(page,0,forbidden));assert.deepEqual(await saved(page),setup);
  await drag(page,reserve(page,u.uid),slot(page,0,position),{cancel:true});assert.deepEqual(await saved(page),setup);assert.equal(await page.locator('.formation-drag-ghost,.drop-hover').count(),0);
  await page.waitForTimeout(460);await reserve(page,u.uid).focus();await page.keyboard.press('Enter');await slot(page,0,position).focus();await page.keyboard.press('Enter');assert.equal((await saved(page)).players[0].board[position].uid,u.uid);
  await state(page,setup);const enemy=setup.players[1].reserve[0],enemyPos=E.card(enemy).positions[0]-1;await drag(page,reserve(page,enemy.uid),slot(page,1,enemyPos));assert.equal((await saved(page)).players[1].board[enemyPos].uid,enemy.uid);
  report.checks.push('Pointer drag swaps occupied legal positions atomically; enemy and incompatible drops rejected; Escape cancels; keyboard fallback and local second player work');
  await state(page,setup);await page.setViewportSize({width:1000,height:1200});
  const touchFrom=await center(reserve(page,u.uid)),touchTo=await center(slot(page,0,position)),cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchFrom.x,y:touchFrom.y}]});
  for(let i=1;i<=16;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchFrom.x+(touchTo.x-touchFrom.x)*i/16,y:touchFrom.y+(touchTo.y-touchFrom.y)*i/16}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await saved(page)).players[0].board[position].uid,u.uid);await cdp.detach();
  await page.setViewportSize({width:1920,height:1080});
  const replacement=E.clone(setup);replacement.phase='replace';replacement.replacing=0;replacement.players[0].dead.push(replacement.players[0].board[position]);replacement.players[0].board[position]=null;await state(page,replacement);
  await drag(page,reserve(page,u.uid),slot(page,0,position));assert.equal((await saved(page)).players[0].board[position].uid,u.uid);
  await state(page,fixture('ai'));assert.equal(await page.locator('.team-right [data-drag-reserve]').count(),0);
  report.checks.push('Real touch drag and replacement-phase drag work; hidden AI reserve cannot be dragged');
  const choosing=fixture();E.start(choosing);await state(page,choosing);
  const baseline=(await slot(page,0,0).boundingBox()).width;
  await page.emulateMedia({reducedMotion:'no-preference'});await slot(page,0,0).click();await page.waitForTimeout(150);
  const growing=(await slot(page,0,0).boundingBox()).width;assert(growing>baseline&&growing<baseline*1.72);await page.waitForTimeout(450);await page.emulateMedia({reducedMotion:'reduce'});
  for(let index=0;index<5;index++){
   await slot(page,0,index).click();await slot(page,1,4-index).click();
   assert((await slot(page,0,index).boundingBox()).width>baseline*1.65);
   assert((await slot(page,1,4-index).boundingBox()).width>baseline*1.65);
   const boxes=await page.locator('.formation').evaluateAll(boards=>boards.map(board=>[...board.querySelectorAll('.slot-card')].map(c=>{const r=c.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};})));
   for(const list of boxes)for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)assert(!(list[i].x<list[j].right&&list[i].right>list[j].x&&list[i].y<list[j].bottom&&list[i].bottom>list[j].y),'Focused cards must not overlap');
   assert.deepEqual((await saved(page)).players,choosing.players);
  }
  await screenshot(page,'duel-challenge');
  assert((await aura(page)).every(a=>a.visible>300));
  await page.emulateMedia({reducedMotion:'no-preference'});const first=await aura(page);await page.waitForTimeout(220);const second=await aura(page);assert.notEqual(first[0].image,second[0].image);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(30);const static1=await aura(page);await page.waitForTimeout(150);assert.equal(static1[0].image,(await aura(page))[0].image);
  report.checks.push('All ten positions can become nonoverlapping 1.72x duel cards; others shrink; logical formation unchanged; aura pixels animate and respect reduced motion');
  for(const element of Object.keys(data.elements)){
   const c=data.cards.find(c=>c.element===element),s=fixture('local',c);E.start(s);await state(page,s);const i=s.players[0].board.findIndex(u=>u?.cardId===c.id);await slot(page,0,i).click();
   const sample=(await aura(page))[0];assert.equal(sample.element,element);assert(sample.visible>300);report.auras.push({element,visible:sample.visible});
   if(['PYRO','ELECTRO'].includes(element))await screenshot(page,'aura-'+element);
  }
  const phases=[setup,choosing];const attack=E.clone(choosing);E.lock(attack,2,0);phases.push(attack);const defense=E.clone(attack);E.rollAttack(defense,6);phases.push(defense);const result=E.clone(defense);E.rollDefense(result,6);phases.push(result);const next=E.clone(result);E.next(next);phases.push(next);
  let dicePositions;
  for(const s of phases){await state(page,s);const boxes=await page.locator('.duel-die').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {top:r.top+scrollY,height:r.height};}));if(dicePositions)assert.deepEqual(boxes,dicePositions);else dicePositions=boxes;assert.equal(await page.locator('.duel-recap').count(),1);}
  report.checks.push('Both dice and central recap keep exactly the same geometry across formation, choice, attack, defense, result and next turn');
  const buffed=E.clone(choosing),unit=buffed.players[0].board[2];unit.mana=60;await state(page,buffed);
  for(const bonus of ['faction','race','mana','physical','reraise']){
   unit.mana=bonus==='mana'?60:0;unit.physical=bonus==='physical'?60:0;unit.reraise=bonus==='reraise'?1:0;await state(page,buffed);
   await page.locator(`[data-action="bonus"][data-uid="${unit.uid}"][data-bonus="${bonus}"]`).click();
   assert(await page.locator('#detail-dialog').evaluate(d=>d.open));assert.equal(await page.locator('.bonus-explanation.highlighted').getAttribute('data-explains'),bonus);
   assert((await page.locator('.live-bonuses').textContent()).includes('Joueur 1'));if(bonus==='mana')assert((await page.locator('[data-explains="mana"]').textContent()).includes('+60'));
   await page.locator('.detail-visual img').evaluate(i=>i.decode());
   const card=await page.locator('.detail-visual img').boundingBox();assert(Math.min(card.width,card.height*897/1497)>500);
   if(bonus==='faction')await screenshot(page,'bonus-card-popup');
   await page.locator('#detail-dialog [data-action="close"]').click();assert.deepEqual(await saved(page),buffed);
  }
  report.checks.push('Every bonus chip opens the correct unit popup, explains counted board members and tokens, preserves game state and shows a card wider than 500px at 1920px');
  await page.emulateMedia({reducedMotion:'no-preference'});
  for(const effect of ['retry','revive']){
   const c=data.cards.find(c=>c.atk.includes(effect)),s=fixture('local',c);E.start(s);const i=s.players[0].board.findIndex(u=>u?.cardId===c.id);E.lock(s,i,0);s.rng=rngFor(6-c.atk.indexOf(effect));const expected=E.clone(s);E.rollAttack(expected);
   await state(page,s);await page.locator('[data-action="roll"]').click();await page.waitForSelector(`.combat-emblem[data-effect="${effect}"]`);await screenshot(page,'effect-'+effect);await finish(page,expected);
  }
  const reviving=E.clone(choosing);E.lock(reviving,0,0);E.rollAttack(reviving,6);reviving.players[1].board[0].reraise=1;reviving.rng=1;const revived=E.clone(reviving);E.rollDefense(revived);assert(revived.duel.reraised);
  await state(page,reviving);
  await page.evaluate(()=>{window.lifeStages=[];const start=performance.now();const tick=()=>{const stage=document.querySelector('.battlefield')?.dataset.reanimation;if(stage&&!lifeStages.includes(stage))lifeStages.push(stage);if(performance.now()-start<5000)requestAnimationFrame(tick);};tick();});
  await page.locator('[data-action="roll"]').click();await page.waitForFunction(()=>lifeStages.includes('fading'));assert.deepEqual(await saved(page),reviving);await page.waitForSelector('[data-reanimation="reviving"]');await page.waitForTimeout(350);await screenshot(page,'reraise-reanimation');await finish(page,revived);assert.equal(await page.locator('.life-badge').count(),0);
  await state(page,reviving);await page.locator('[data-action="roll"]').click();await page.waitForSelector('[data-reanimation="reviving"]');await page.locator('[data-view="collection"]').click();await page.waitForTimeout(300);assert.deepEqual(await saved(page),reviving);assert.equal(await page.locator('.element-aura,.combat-emblem,.combat-life-wave').count(),0);
  report.checks.push('Clover and heart gain have their own effects; Reraise dims then reanimates the same card; navigation during revival cancels the pending result');
  const evading=E.clone(choosing);E.lock(evading,0,3);E.rollAttack(evading,6);evading.rng=1;const evaded=E.clone(evading);E.rollDefense(evaded);assert.equal(evaded.duel.defenseValue,'dodge');
  await state(page,evading);await page.locator('[data-action="roll"]').click();await page.waitForFunction(()=>!!document.querySelector('.combat-afterimage'));assert.equal(await page.locator('.combat-emblem[data-effect="dodge"]').count(),1);await screenshot(page,'dodge-afterimages');await finish(page,evaded);
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const viewport of [{width:2493,height:1461},{width:1440,height:1000},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]){
   await page.setViewportSize(viewport);await state(page,defense);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await screenshot(page,'challenge-'+viewport.width);
   if(viewport.width<=768){
    for(const side of [0,1]){await page.locator(`[data-action="focus-${side?'right':'left'}"]`).click();const r=await page.locator(`.formation[data-player="${side}"] .challenger .slot-card`).boundingBox();assert(r.x>=0&&r.x+r.width<=viewport.width);if(side===0)await screenshot(page,'focused-'+viewport.width);}
    await page.locator('[data-action="focus-duel"]').click();await screenshot(page,'console-'+viewport.width);
   }
   const rects=await page.locator('.challenger .slot-card').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height};}));report.screens.push({...viewport,cards:rects});
  }
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'challenge-tests.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exit(1)});
