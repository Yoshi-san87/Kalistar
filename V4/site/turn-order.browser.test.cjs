'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const Order=require('./turn-order.js'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__abba_qa__.cjs'));
const ROOT=path.resolve(__dirname,'../..'),dist=path.resolve(__dirname,'../deploy/dist');
const built=process.env.KALISTAR_BUILT_SITE==='1',output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'verification/captains-abba');
const origin=built?'https://kalistar-abba.invalid/Kalistar':'http://127.0.0.1:43877',url=origin+'/jeu/';
const references=require('../atelier/data/references.json'),published=require('../donnees/catalogue.json').cards.filter(c=>c.kind==='created');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
async function stage(page,step){await page.waitForFunction(step=>document.querySelector('.lineup-intro')?.dataset.step===step,step,{timeout:35000});}
async function done(page){await page.waitForSelector('.lineup-intro',{state:'detached',timeout:12000});await page.waitForSelector('.turn-timeline li');}
async function shot(page,name){
  await page.screenshot({path:path.join(output,name+'.png')});
  if(name==='desktop-timeline'){
    const r=await page.locator('.turn-timeline').boundingBox(),width=Math.min(r.width,640);
    await page.screenshot({path:path.join(output,'desktop-timeline-detail.png'),clip:{x:r.x+(r.width-width)/2,y:r.y-8,width,height:r.height+16}});
  }
  if(name==='timeline-duel-412')await page.screenshot({path:path.join(output,'phone-timeline-detail.png'),clip:{x:0,y:0,width:412,height:150}});
  console.log('capture',name);
}
async function tipoff(page,name){
  await stage(page,'tipoff');
  assert.equal(await page.locator('.li-tipoff strong').textContent(),'Tip Off');
  assert.equal(await page.locator('.formation .slot-card:visible').count(),10);
  assert.equal((await state(page)).phase,'initiative');
  assert(await page.locator('.li-tipoff-plaque').evaluate(n=>{const r=n.getBoundingClientRect(),header=document.querySelector('.li-header').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=header.bottom&&r.bottom<=innerHeight;}));
  if(await page.evaluate(()=>matchMedia('(prefers-reduced-motion:reduce)').matches))assert.equal(await page.locator('.li-tipoff-plaque').evaluate(n=>getComputedStyle(n).animationName),'none');
  await shot(page,name);
}
async function start(page,seed,mode='local',preset=null){
  if(await page.locator('.li-skip').count())await page.locator('.li-skip').click();
  await page.goto(url+'#decks');await page.waitForSelector('.team-page');
  if(await page.locator('[data-deck-action=play]').isDisabled())throw Error('QA composition not playable: '+await page.locator('.team-page').innerText());
  await page.locator('[data-deck-action=play]').click();await page.locator('#game-mode').selectOption(mode);
  const enemy=preset||await page.locator('#enemy-deck-preset option').evaluateAll(list=>list.find(o=>o.value.startsWith('saved:')).value);
  await page.locator('#enemy-deck-preset').selectOption(enemy);await page.locator('.match-advanced summary').click();
  await page.locator('#game-seed').fill(seed);await page.evaluate(()=>{window.abbaSteps=[];});
  await page.locator('#new-game-form [type=submit]').click();await page.waitForSelector('.lineup-intro');
  const s=await state(page);assert.equal(s.phase,'initiative');return s;
}
async function prepareResult(page){
  await page.evaluate(()=>{
    const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.restoreGame(JSON.parse(localStorage.getItem('kalistar.v4.game')));
    const actions={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'};
    while(s.phase!=='result'){
      if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
      else if(s.phase==='attack')E.rollAttack(s,6);
      else if(s.phase==='kalistel')E.acceptAttack(s);
      else if(s.phase==='defense')E.rollDefense(s,6);
      else {const kind=actions[s.phase];E['grant'+kind](s,E['ai'+kind+'Choice'](s));}
    }
    E.assertState(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
  });
  await page.reload();await page.waitForSelector('.turn-timeline li');await page.waitForTimeout(600);
}
async function clean(page,before){
  assert.equal(await page.locator('.lineup-intro,.lineup-unrevealed,.lineup-underlay,[inert]').count(),0);
  const after=await state(page);assert.equal(after.phase,'choose');assert.equal(after.round,1);assert.equal(after.match.events.length,0);
  for(const key of ['players','equipment','composition','collection','rng','kalistel','matchId'])assert.deepEqual(after[key],before[key],key+' must not change during captain dice');
  assert.equal(after.turn,after.initiative.first);assert.equal(await page.locator('.formation .slot-card:visible').count(),10);
  assert.equal(await page.locator('.turn-timeline li[aria-current=step]').getAttribute('data-turn-side'),String(after.turn));
  return after;
}
async function geometry(page,width,height){
  const result=await page.evaluate(()=>{
    const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const rail=document.querySelector('.turn-timeline'),steps=[...rail.querySelectorAll('li')].filter(n=>n.getClientRects().length);
    const field=document.querySelector('.battlefield'),score=document.querySelector('.match-scoreboard'),now=rail.querySelector('.tt-now');
    const active=rail.querySelector('[aria-current=step]'),dot=active.querySelector('.tt-dot'),gem=getComputedStyle(dot,'::after');
    return {rail:rect(rail),list:rect(rail.querySelector('ol')),steps:steps.map(rect),now:rect(now),nowClip:getComputedStyle(now).clipPath,field:rect(field),score:rect(score),overflow:document.documentElement.scrollWidth>innerWidth+1,
      material:getComputedStyle(rail).backgroundImage,font:getComputedStyle(active).fontFamily,gem:gem.backgroundImage,motion:gem.animationName,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,
      gemClear:rect(dot).left+2+parseFloat(gem.left)+parseFloat(gem.width)<rect(active.querySelector('.tt-turn')).left,
      labelsFit:steps.every(n=>{const r=rect(n.querySelector('.tt-stop')),p=rect(n);return r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom;})};
  });
  assert(!result.overflow);assert(result.rail.left>=0&&result.rail.right<=width+1);
  assert(result.steps.every(r=>r.left>=result.rail.left&&r.right<=result.rail.right&&r.height>=20));
  assert(result.material.includes('collection-reader-grimoire-v1.webp'));assert(result.font.includes('Cinzel'));assert(result.gem.includes('kalistel-rainbow-v1.webp'));assert(result.gemClear,'rainbow crystal does not overlap the turn');assert(result.labelsFit,'stations fit their track');
  if(result.reduced)assert.equal(result.motion,'none');
  const phone=width<700||width<=950&&height<=500;
  assert.equal(result.steps.length,phone?5:11);
  assert(result.rail.height<=36);assert(result.now.width<=1&&result.now.height<=1);assert.equal(result.nowClip,'inset(50%)');
  if(phone){
    assert(result.field.top>=result.rail.bottom-1);assert(result.score.top>=result.rail.bottom);
    assert(result.list.width>=result.rail.width-20,'timeline fills the mobile rail');
    assert(result.steps.at(-1).right-result.steps[0].left>=result.list.width-1);
    assert(Math.max(...result.steps.map(r=>r.width))-Math.min(...result.steps.map(r=>r.width))<1,'five equal-width turns');
  }
  return result;
}
async function main(){
  fs.mkdirSync(output,{recursive:true});const catalogue=await buildCatalog({published});
  const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  const errors=[],checks=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
    await context.route(origin+'/**',route=>{
      const p=decodeURIComponent(new URL(route.request().url()).pathname).replace(built?/^\/Kalistar/:/^$/,'');
      if(!built&&p==='/api/game/catalogue')return route.fulfill({json:catalogue});
      let file;
      if(built)file=path.resolve(dist,p.slice(1).endsWith('/')?p.slice(1)+'index.html':p.slice(1));
      else if(p.startsWith('/media/reference/'))file=path.join(ROOT,references.cards.find(c=>p==='/media/reference/'+c.key+'.png')?.png||'missing');
      else if(p.startsWith('/media/created/'))file=path.join(ROOT,published.find(c=>c.pngUrl===p)?.png||'missing');
      else if(p.startsWith('/jeu/shared/'))file=path.join(ROOT,'V3/assets',p.slice('/jeu/shared/'.length));
      else if(p.startsWith('/jeu/')){file=path.join(__dirname,p.slice(5)||'index.html');if(!fs.existsSync(file)&&p.startsWith('/jeu/assets/'))file=path.join(ROOT,'V3/site',p.slice(5));}
      if(!file||!file.startsWith(ROOT+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:p});
      return route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{
      const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-abba-qa-only',version);};
      window.abbaSteps=[];document.addEventListener('kalistar:lineup-step',e=>{
        const travel=e.detail.step==='captains'?[...document.querySelectorAll('.li-draw-card')].map(n=>{
          const source=document.querySelector('.formation[data-player="'+n.dataset.side+'"] .arena-captain').closest('.slot-card');
          const r=n.getBoundingClientRect(),s=source.getBoundingClientRect();
          return ['left','top','width','height'].map(k=>Math.abs(r[k]-s[k]));
        }):undefined;
        abbaSteps.push({...e.detail,time:performance.now(),travel});
      });
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(url+'#decks');await page.waitForSelector('.team-page');
    await page.evaluate(()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),team=T.normalize({name:'Capitaines QA',cards:KALISTAR_DATA.decks.player});
      team.captain=team.formation[2];team.equipment={};
      if(team.cards.some(id=>E.byId[id].characterId==='momo'))team.equipment.momo='little-joys-flute';
      if(team.cards.some(id=>E.byId[id].characterId==='balmhyr'))team.equipment.balmhyr='fallen-king-axe';
      if(E.validateComposition(team).length)throw Error(E.validateComposition(team).join(' '));
      localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(team));
    });
    await page.reload();await page.waitForSelector('.team-page');await page.locator('[data-deck-action=save]').click();
    let tieSeed;
    for(let i=0;i<1000;i++){const seed='CAPTAINS-BROWSER-'+i,o=Order.create(seed);if(Order.roll(o).first===null&&Order.roll(o).first===1){tieSeed=seed;break;}}
    assert(tieSeed);
    const before=await start(page,tieSeed);
    await page.waitForFunction(()=>document.querySelector('.lineup-intro')?.dataset.position==='1'&&document.querySelector('.lineup-intro')?.dataset.step==='suspense');
    await shot(page,'desktop-suspense');
    await tipoff(page,'desktop-tipoff');
    await stage(page,'captains');await page.waitForTimeout(400);await shot(page,'desktop-captains');
    assert.equal(await page.locator('.formation .slot-card:visible').count(),8);
    assert.deepEqual(await page.locator('.li-flight').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId)),before.composition.teams.map(t=>t.captain));
    await stage(page,'initiative-tie');assert.equal((await state(page)).phase,'initiative');await shot(page,'desktop-tie');
    await stage(page,'initiative-result');await shot(page,'desktop-initiative');
    await done(page);const opened=await clean(page,before);assert.equal(opened.turn,1);assert.equal(opened.initiative.rolls.length,2);
    const steps=await page.evaluate(()=>abbaSteps);
    assert(steps.find(s=>s.step==='captains').travel.every(deltas=>deltas.every(d=>d<1)),'captains depart from their real card, not a teleported central clone');
    for(let p=1;p<=5;p++){
      const suspense=steps.find(s=>s.position===p&&s.step==='suspense'),flip=steps.find(s=>s.position===p&&s.step==='flip');
      assert(flip.time-suspense.time>=370,'380 ms beat before flip');
      for(const [from,to]of [['weapon','crystal'],['crystal','faction'],['faction','suspense']])assert(steps.find(s=>s.position===p&&s.step===to).time-steps.find(s=>s.position===p&&s.step===from).time>=840,'850 ms per clue');
      assert(steps.find(s=>s.position===p&&s.step==='arrive').time-steps.find(s=>s.position===p&&s.step==='reveal').time>=1190,'1200 ms to read the revealed card');
    }
    assert(steps.find(s=>s.step==='tipoff').time-steps.find(s=>s.step==='title').time>=27600,'slower complete presentation');
    assert(steps.find(s=>s.step==='captains').time-steps.find(s=>s.step==='tipoff').time>=1790,'Tip Off remains readable before captains depart');
    checks.push({kind:'normal full intro, tie, captions and placement',steps});
    await shot(page,'desktop-timeline');
    checks.push({kind:'Kalistar timeline materials and desktop geometry',geometry:await geometry(page,1440,1000)});
    for(let round=1;round<=4;round++){
      await prepareResult(page);const result=await state(page);
      assert.equal(await page.locator('.turn-timeline li.is-resolved').count(),1);
      await page.locator('[data-action=next]').click();
      await page.waitForFunction(round=>JSON.parse(localStorage.getItem('kalistar.v4.game')).round===round+1,round);
      while((await state(page)).phase==='replace')await page.locator('[data-action=auto-replace]').click();
      const next=await state(page);assert.equal(next.turn,Order.sideAt(next.initiative,next.round));
      assert.equal(await page.locator('.turn-timeline li[aria-current=step]').getAttribute('data-turn-side'),String(next.turn));
    }
    checks.push({kind:'four real next-button transitions and replacements',state:await state(page)});
    const skipped=await start(page,'SKIP-CAPTAIN');await stage(page,'weapon');await page.locator('.li-skip').click();await clean(page,skipped);
    const reload=await start(page,tieSeed);await stage(page,'weapon');await page.reload();await stage(page,'captains');
    assert.equal(await page.locator('.formation .slot-card:visible').count(),8);await stage(page,'initiative-tie');
    const tied=await state(page);await page.reload();await stage(page,'captains');await stage(page,'initiative-result');
    const decided=await state(page);assert.deepEqual(decided.initiative.rolls.slice(0,tied.initiative.rolls.length),tied.initiative.rolls);
    assert.equal(decided.initiative.rolls.length,2);
    await page.reload();await page.waitForSelector('.turn-timeline li');await clean(page,reload);
    assert.deepEqual((await state(page)).initiative,decided.initiative,'reload after a decided draw cannot reroll');
    checks.push({kind:'skip cannot bypass random draw; reload resumes captain-only'});
    const skippedTipoff=await start(page,'SKIP-TIPOFF');await stage(page,'weapon');await page.reload();await stage(page,'tipoff');await page.locator('.li-skip').click();await clean(page,skippedTipoff);
    checks.push({kind:'skip during Tip Off cleans popup and resolves initiative'});
    const exited=await start(page,'EXIT-CAPTAIN');await stage(page,'weapon');await page.reload();await stage(page,'tipoff');await page.locator('.li-exit').click();
    assert.equal(await page.locator('.li-tipoff,.lineup-intro,[inert]').count(),0);
    assert.equal((await state(page)).phase,'initiative');await page.locator('.masthead [data-view=arena]').click();await stage(page,'captains');await done(page);await clean(page,exited);
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const [width,height]of [[412,1007],[320,568],[844,390]]){
      await page.setViewportSize({width,height});const s=await start(page,'PHONE-CAPTAIN');
      await tipoff(page,'tipoff-'+width);
      await stage(page,'initiative-result');await shot(page,'captains-'+width);
      assert(await page.locator('.li-draw-card').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=40&&r.bottom<innerHeight-110;})));
      await done(page);await clean(page,s);checks.push({kind:'phone geometry',width,height,geometry:await geometry(page,width,height)});
      await prepareResult(page);await shot(page,'timeline-duel-'+width);await geometry(page,width,height);
    }
    // Visible resize while the two captain cards are moving; no engine reroll.
    await page.setViewportSize({width:412,height:1007});const rotating=await start(page,'RESIZE-CAPTAIN');
    await stage(page,'captains');await page.setViewportSize({width:844,height:390});await done(page);await clean(page,rotating);
    // The actual Razr host iframe uses the same match, no separate game rules.
    await page.setViewportSize({width:1280,height:1080});await page.goto(url+'?phone=razr50#arena');
    const frame=page.frameLocator('#phone-preview-frame');await frame.locator('.turn-timeline li').first().waitFor();
    await shot(page,'razr-preview');assert.equal(await frame.locator('.turn-timeline li[aria-current=step]').count(),1);
    // A first-moving AI starts only once the captain ceremony has ended.
    await page.goto(url+'#decks');await page.waitForSelector('.team-page');
    const ai=await start(page,tieSeed,'ai');await page.locator('.li-skip').click();
    await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('kalistar.v4.game'));return s.turn===1&&s.phase!=='choose';},null,{timeout:15000});
    assert.equal((await state(page)).initiative.first,1);checks.push({kind:'AI opener after skipped presentation'});
    await page.locator('.masthead [data-view=collection]').click();
    assert.equal(await page.locator('.lineup-intro,.turn-timeline').count(),0);
    const preset=await start(page,'PRESET-CAPTAIN','local','enemy');
    assert.equal(preset.composition.teams[1].captain,preset.composition.teams[1].formation[0]);
    assert.equal(await page.locator('.formation .arena-captain').count(),2);
    await stage(page,'captains');assert.deepEqual(await page.locator('.li-flight').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId)),preset.composition.teams.map(t=>t.captain));
    await page.locator('.li-skip').click();await clean(page,preset);checks.push({kind:'real default enemy preset has its own P1 captain'});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({built,checks,errors},null,2));
    console.log(JSON.stringify({passed:true,built,checks:checks.length,errors}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
