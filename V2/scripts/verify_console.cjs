const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/console');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'donnees',n+'.json')));
const data={cards:read('cartes'),rules:read('regles'),demo:read('regles_demo'),elements:read('elements'),weapons:read('armes'),decks:read('decks_demo')};
const E=require('../site/engine.js').createEngine(data),url='file:///'+root.replace(/\\/g,'/')+'/site/index.html#arena';
const report={checks:[],layouts:[],errors:[]};
function fixture(side=0){const s=E.newGame(data.decks.player,data.decks.enemy,{seed:'CONSOLE-QA',mode:'local'});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);s.turn=side;return s;}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')));
const card=(page,side,index)=>page.locator(`.slot-card[data-side="${side}"][data-slot="${index}"]`);
const row=(page,key)=>page.locator(`.duel-recap [data-bonus="${key}"] b`);
const signed=n=>n>0?'+'+n:String(n);
async function state(page,s){await page.goto(url);await page.waitForFunction(()=>document.body.classList.contains('arena-view'));await page.evaluate(s=>localStorage.setItem('kalistar.v2.game',JSON.stringify(s)),s);await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);}
async function readyImages(page){await page.locator('.slot-card img,.console-crystal').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));}
const shot=async(page,name)=>page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:93,fullPage:true});
async function geometry(page){return page.locator('.duel-die').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {y:r.y+scrollY,height:r.height};}));}
async function assertPreview(page,s,i,j){
 const a=s.players[s.turn].board[i],b=s.players[1-s.turn].board[j],ac=E.card(a),bc=E.card(b);
 const weapon=data.weapons[ac.weapon]?.[bc.weapon]||0,element=E.elementModifier(ac,bc),faction=E.synergy(s.players[s.turn],a,'faction'),race=E.synergy(s.players[1-s.turn],b,'race');
 for(const [key,value] of Object.entries({weapon,element,faction,race}))assert.equal(await row(page,key).textContent(),signed(value),key);
 assert.equal(await page.locator('[data-preview-total="attack"]').textContent(),signed(weapon+element+faction));
 assert.equal(await page.locator('[data-preview-total="defense"]').textContent(),signed(race));
 assert.equal(await page.locator('[data-total]').count(),0,'No final score before rolling');
 assert.equal(await page.locator('.duel-console').getAttribute('data-element'),ac.element);
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1,reducedMotion:'reduce'});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.errors.push(r.url()+': '+r.failure().errorText));
  for(const side of [0,1]){
   const s=fixture(side);s.players[side].board[2].mana=60;await state(page,s);
   assert.equal(await row(page,'weapon').textContent(),'…');assert(await page.locator('[data-action="lock"]').isDisabled());
   await card(page,1-side,0).click();assert.equal(await row(page,'race').textContent(),signed(E.synergy(s.players[1-side],s.players[1-side].board[0],'race')));assert.equal(await row(page,'faction').textContent(),'…');
   await card(page,side,2).click();assert.equal(await row(page,'buff').textContent(),'M +60');assert.equal(await page.locator('[data-action="lock"]').isEnabled(),true);await assertPreview(page,s,2,0);assert.deepEqual(await saved(page),s);
   for(let j=1;j<5;j++){await card(page,1-side,j).click();await assertPreview(page,s,2,j);assert.deepEqual(await saved(page),s);}
   await readyImages(page);if(!side)await shot(page,'selection-bonus');
   const before=await geometry(page),expected=E.clone(s);E.lock(expected,2,4);await page.locator('[data-action="lock"]').click();assert.deepEqual(await saved(page),expected);await assertPreview(page,s,2,4);assert.deepEqual(await geometry(page),before);assert.equal(await page.locator('.ritual-action').getAttribute('data-mode'),'attack');
  }
  report.checks.push('Both attacking sides: partial preview, all target changes, exact weapon/crystal/faction/race values, conditional tokens, no fake final score, no RNG/token/state mutation');
  const magic=fixture();await state(page,magic);let magicIndex=magic.players[0].board.findIndex(u=>E.card(u).atk.some((v,i)=>typeof v==='number'&&E.card(u).magic.includes(6-i))),barrierIndex=magic.players[1].board.findIndex(u=>E.card(u).barriers.length);
  await card(page,0,magicIndex).click();await card(page,1,barrierIndex).click();assert.equal(await row(page,'barrier').textContent(),'-30 possible');
  const physicalIndex=magic.players[0].board.findIndex(u=>!E.card(u).magic.length);assert(physicalIndex>=0);await card(page,0,physicalIndex).click();assert.equal(await row(page,'barrier').textContent(),'0');
  report.checks.push('Magic barrier remains conditional before the dice; impossible physical barrier correctly shows zero');
  await page.emulateMedia({reducedMotion:'no-preference'});await state(page,fixture());await card(page,0,magicIndex).click();await card(page,1,barrierIndex).click();await page.waitForTimeout(600);
  const button=page.locator('[data-action="lock"]');await button.hover();await page.waitForTimeout(250);assert.notEqual(await button.evaluate(b=>getComputedStyle(b).transform),'none');
  const animates=await button.evaluate(b=>b.querySelector('.action-charge').getAnimations().length);assert(animates>0);await shot(page,'button-ready');
  const buttonBox=await button.boundingBox();await page.mouse.move(buttonBox.x+buttonBox.width/2,buttonBox.y+buttonBox.height/2);await page.mouse.down();await page.waitForTimeout(200);await button.screenshot({path:path.join(out,'button-pressed.png')});await page.mouse.up();
  assert.equal((await saved(page)).phase,'attack');const roll=page.locator('[data-action="roll"]');await roll.click();await page.waitForFunction(()=>!!document.querySelector('.ritual-action.is-casting'));assert.equal(await page.locator('.is-casting').getAttribute('aria-busy'),'true');assert.match(await page.locator('.is-casting .action-label').textContent(),/cours/);await shot(page,'button-casting');
  await page.waitForFunction(()=>!document.querySelector('#app').classList.contains('rolling'));E.assertState(await saved(page));
  report.checks.push('Ready pulse, hover lift, pressed feedback and busy casting state accompany the real dice; click still resolves exactly once');
  await page.emulateMedia({reducedMotion:'reduce'});
  const base=fixture(),attack=E.clone(base);E.lock(attack,0,0);const defense=E.clone(attack);E.rollAttack(defense,6);assert.equal(defense.phase,'defense');const result=E.clone(defense);E.rollDefense(result,6);assert.equal(result.phase,'result');
  const setup=E.clone(base);setup.phase='setup';const over=E.clone(result);over.phase='over';over.winner=0;
  for(const viewport of [{width:2493,height:1461},{width:1440,height:1000},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]){
   await page.setViewportSize(viewport);let first;
   for(const s of [setup,base,attack,defense,result,over]){
    await state(page,s);if(s.phase==='over')await page.locator('#match-dialog [data-action="close"]').first().click();if(viewport.width<1400)await page.locator('[data-action="focus-duel"]').click();
    const positions=await geometry(page);if(first)assert.deepEqual(positions,first,'Dice shifted in '+s.phase);else first=positions;
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const bounds=await page.locator('.ritual-action').evaluate(b=>{const r=b.getBoundingClientRect(),l=b.querySelector('.action-label'),t=l.getBoundingClientRect(),area=b.closest('.duel-actions').getBoundingClientRect();return {height:r.height,labelFits:l.scrollWidth<=l.clientWidth&&t.top>=r.top&&t.bottom<=r.bottom,inside:r.top>=area.top&&r.bottom<=area.bottom,width:r.width};});
    assert(bounds.labelFits&&bounds.inside,JSON.stringify({viewport,phase:s.phase,bounds}));assert(bounds.height>=44);
    assert.equal(await page.locator('.duel-console').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0,'Reduced motion');
    if(s===attack){await readyImages(page);await shot(page,'console-'+viewport.width);report.layouts.push({viewport,button:bounds});}
    if(s===defense)assert.equal(await page.locator('.ritual-action').getAttribute('data-mode'),'defense');
    if(s===result){for(const [key,value] of Object.entries(result.duel.formula))if(!['magic','attack','defense'].includes(key))assert.equal(await row(page,key).textContent(),key.startsWith('base')?String(value):signed(value));assert.equal(await page.locator('.ritual-action').getAttribute('data-mode'),'next');}
   }
  }
  report.checks.push('Five viewport sizes, six phases each: stable dice geometry, readable contained buttons, no horizontal page overflow, exact resolved formula and reduced motion');
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'console-tests.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exit(1)});
