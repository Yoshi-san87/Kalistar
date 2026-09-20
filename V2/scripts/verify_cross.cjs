const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/cross');
const {createEngine}=require('../site/engine.js');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'donnees',n+'.json')));
const data={cards:read('cartes'),rules:read('regles'),demo:read('regles_demo'),elements:read('elements'),weapons:read('armes'),decks:read('decks_demo')},E=createEngine(data);
const url='file:///'+root.replace(/\\/g,'/')+'/site/index.html#arena';
const savedState=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')));
const report={screens:[],checks:[],errors:[]};
function fixture(){const s=E.newGame(data.decks.player,data.decks.enemy,{seed:'CROSS-TEST',mode:'local'});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);return s;}
async function imageReady(page){await page.locator('img').evaluateAll(async imgs=>{for(const i of imgs){i.loading='eager';await i.decode();}});}
async function setState(page,s){await page.evaluate(s=>localStorage.setItem('kalistar.v2.game',JSON.stringify(s)),s);await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await imageReady(page);}
async function canvasPixels(page,side){return page.locator(`.dice-stage[data-player="${side}"] canvas`).evaluate(c=>{const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const ctx=copy.getContext('2d');ctx.drawImage(c,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let visible=0,sum=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>20){visible++;sum+=pixels[i]+pixels[i+1]+pixels[i+2];}return {visible,sum,width:c.width,height:c.height,image:c.toDataURL()};});}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.KALISTAR_READY);await setState(page,fixture());
  const start=fixture();E.lock(start,4,0);E.rollAttack(start,1);E.grantReraise(start,start.duel.attacker);assert.equal(start.players[0].board[4].reraise,1);
  const layoutState=E.clone(start);E.next(layoutState);
  await setState(page,layoutState);assert.equal(await page.locator('.life-badge').count(),1);
  assert.equal(await page.locator('.life-badge img').getAttribute('src'),'../assets/effets/revive.png');
  for(const viewport of [{width:2493,height:1461},{width:1920,height:1080},{width:1440,height:1000},{width:768,height:1024},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.waitForTimeout(120);await imageReady(page);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const rects=await page.locator('.cross-formation').evaluateAll(boards=>boards.map(board=>Object.fromEntries([...board.querySelectorAll('.slot')].map(s=>{const r=s.getBoundingClientRect();return [s.dataset.position,{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}]}))));
   for(const [side,r] of rects.entries()){
    assert(r[2].y<r[3].y&&r[3].y<r[4].y);
    assert(Math.abs(r[2].x-r[3].x)<1&&Math.abs(r[4].x-r[3].x)<1);
    assert(side===0?r[5].x<r[3].x&&r[3].x<r[1].x:r[1].x<r[3].x&&r[3].x<r[5].x);
   }
   const d0=await page.locator('.duel-die[data-player="0"]').boundingBox(),d1=await page.locator('.duel-die[data-player="1"]').boundingBox();assert(d0.y<d1.y);assert(Math.abs(d0.x-d1.x)<1);
   for(const side of [0,1]){const pixels=await canvasPixels(page,side);assert(pixels.visible>500);assert(pixels.sum>100000);}
   await page.screenshot({path:path.join(out,`board-${viewport.width}.png`),fullPage:true});
   report.screens.push({...viewport,cardWidth:rects[0][1].w,pageOverflow:false,crossGeometry:true,diceNonblank:true});
   if(viewport.width===390){await page.locator('[data-action="focus-duel"]').click();await page.screenshot({path:path.join(out,'mobile-dice.png'),fullPage:false});await page.locator('[data-action="focus-right"]').click();await page.screenshot({path:path.join(out,'mobile-right.png'),fullPage:false});}
  }
  await page.setViewportSize({width:1920,height:1080});
  const before=await page.locator('.slot-card').first().boundingBox();await page.locator('#board-scale').fill('125');const after=await page.locator('.slot-card').first().boundingBox();assert(after.width>before.width*1.2);
  await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);assert.equal(await page.locator('#board-scale').inputValue(),'125');await page.locator('#board-scale').fill('100');
  await page.locator('[data-action="journal"]').click();assert(await page.locator('#journal-dialog').evaluate(d=>d.open));await page.locator('#journal-dialog [data-action="close"]').click();
  const old=fixture();E.lock(old,4,0);E.rollAttack(old,1);old.schema=1;old.phase='revive';for(const p of old.players)for(const u of [...p.board,...p.reserve,...p.dead].filter(Boolean))delete u.reraise;
  await setState(page,old);const migrated=await savedState(page);assert.equal(migrated.schema,5);assert.equal(migrated.phase,'heart');assert.equal(migrated.players[0].board[4].reraise,0);assert.equal(await page.locator('.life-badge').count(),0);
  report.checks.push('Mirrored cross positions; fixed player dice order; 5 responsive viewports; zoom persistence; journal; pending legacy heart migration');
  const gain=fixture();gain.rng=1;E.lock(gain,4,0);await setState(page,gain);assert.equal(await page.locator('.life-badge').count(),0);
  await page.locator('[data-action="roll"]').click();await page.waitForFunction(()=>!document.querySelector('#app').classList.contains('rolling'));
  assert.equal((await savedState(page)).phase,'heart');await page.locator('.slot-card[data-side="0"][data-slot="4"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')).phase==='result');assert.equal(await page.locator('.life-badge').count(),1);
  const lethal=fixture();E.lock(lethal,0,0);E.rollAttack(lethal,6);lethal.players[1].board[0].reraise=1;lethal.rng=1;
  await setState(page,lethal);await page.locator('[data-action="roll"]').click();await page.waitForFunction(()=>!document.querySelector('#app').classList.contains('rolling'));
  assert.equal(await page.locator('.life-badge').count(),0);assert.equal(await page.locator('.reraise-saved').count(),1);assert.equal((await savedState(page)).players[1].dead.length,0);
  report.checks.push('Heart earned through a real UI roll; badge disappears on a lethal hit; card stays on its position');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const animated=fixture();animated.turn=1;E.lock(animated,0,0);await setState(page,animated);
  const staticBefore=await canvasPixels(page,0),activeBefore=await canvasPixels(page,1);
  await page.locator('[data-action="roll"]').click();await page.waitForTimeout(280);
  assert(await page.locator('.dice-stage[data-player="1"]').evaluate(d=>d.classList.contains('is-rolling')));
  assert.equal(await page.locator('.dice-stage[data-player="0"]').evaluate(d=>d.classList.contains('is-rolling')),false);
  const during=await canvasPixels(page,1),still=await canvasPixels(page,0);assert.notEqual(during.image,activeBefore.image);assert.equal(still.image,staticBefore.image);
  await page.screenshot({path:path.join(out,'dice-in-motion.png'),fullPage:false});
  await page.waitForFunction(()=>!document.querySelector('#app').classList.contains('rolling'));
  const rolled=await savedState(page);assert.equal(await page.locator('.dice-stage[data-player="1"]').getAttribute('data-front'),String(rolled.duel.attackDie));
  const deterministic=E.clone(animated);E.rollAttack(deterministic);assert.deepEqual(rolled,deterministic);
  await page.screenshot({path:path.join(out,'dice-landed.png'),fullPage:false});
  await setState(page,animated);await page.locator('[data-action="roll"]').click();await page.waitForTimeout(150);await page.locator('[data-view="collection"]').click();await page.waitForTimeout(1200);assert.equal(await savedState(page).then(s=>s.phase),'attack');
  report.checks.push('Only active player die moves; canvas pixels change; final face matches exactly one seeded roll; navigation cancels pending animation without committing a stale result');
  const favicon=await page.locator('link[rel="icon"]').getAttribute('href');assert(fs.existsSync(path.join(root,'site',favicon)));
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'cross-tests.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exit(1)});
