'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__lineup_qa__.cjs'));
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-04-persistent-lineup-clues/qa');
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(__dirname,'../deploy/dist');
const url=built?'https://kalistar-qa.invalid/Kalistar/jeu/':process.env.KALISTAR_URL||'http://127.0.0.1:4304/jeu/';
const game=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
async function stage(page,position,step){try{await page.waitForFunction(({position,step})=>{const n=document.querySelector('.lineup-intro');return n?.dataset.position===String(position)&&n.dataset.step===step;},{position,step},{timeout:25000});}catch(e){console.error('Missed stage',position,step,await page.evaluate(()=>lineupSteps));throw e;}}
async function shot(page,name){const time=Date.now();await page.screenshot({path:path.join(output,name+'.png')});console.log(name,Date.now()-time+'ms');}
async function start(page){
  if(await page.locator('.li-skip').count())await page.locator('.li-skip').click();
  if(await page.locator('.masthead [data-view=decks]').isVisible())await page.locator('.masthead [data-view=decks]').click();
  else {await page.locator('[data-action=arena-menu]').click();await page.locator('#mobile-dialog [data-view=decks]').click();}
  await page.locator('[data-deck-action=play]').click();
  await page.locator('#game-mode').selectOption('local');
  const enemy=await page.locator('#enemy-deck-preset option').evaluateAll(list=>list.find(o=>o.value.startsWith('saved:')).value);
  await page.locator('#enemy-deck-preset').selectOption(enemy);
  await page.locator('.match-advanced summary').click();await page.locator('#game-seed').fill('LINEUP-QA');
  await page.evaluate(()=>{window.lineupSteps=[];});
  await page.locator('#new-game-form [type=submit]').click();await page.waitForSelector('.lineup-intro');
  return game(page);
}
async function clean(page,snapshot){
  assert.equal(await page.locator('.lineup-intro,.lineup-unrevealed,.lineup-underlay').count(),0);
  assert.equal(await page.locator('.game-shell[inert],.masthead[inert]').count(),0);
  assert.equal(await page.locator('.formation .slot-card:visible').count(),10);
  const after=await game(page);assert.equal(after.phase,'choose');assert.equal(after.round,1);
  for(const key of ['players','equipment','composition','collection','rng','kalistel','matchId'])assert.deepEqual(after[key],snapshot[key],'presentation preserves '+key);
  assert.equal(after.turn,after.initiative.first);assert.equal(after.match.events.length,0);
  assert(after.initiative.rolls.length>0,'skipping still resolves the real captain draw');
}
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
    if(built)await context.route('https://kalistar-qa.invalid/**',route=>{
      const relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative);
      assert(file.startsWith(dist+path.sep));
      if(!fs.existsSync(file))return route.fulfill({status:404,body:'QA missing asset '+relative});
      return route.fulfill({body:fs.readFileSync(file),contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{
      const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-lineup-qa-only',version);};
      window.lineupSteps=[];window.lineupChecks=[];
      document.addEventListener('kalistar:lineup-step',e=>{
        window.lineupSteps.push({...e.detail,time:performance.now()});
        if(['weapon','crystal','faction','reveal','arrive'].includes(e.detail.step))setTimeout(()=>{
          const root=document.querySelector('.lineup-intro');if(!root||root.dataset.step!==e.detail.step)return;
          window.lineupChecks.push({...e.detail,hidden:document.querySelectorAll('.lineup-unrevealed').length,actors:[...root.querySelectorAll('.li-flight')].map(n=>({id:n.dataset.cardId,label:n.querySelector(`.li-clue[data-kind="${e.detail.step}"] b`)?.textContent,
            clues:[...n.querySelectorAll('.li-clue:not([hidden])')].map(c=>({kind:c.dataset.kind,label:c.querySelector('b').textContent,pinned:c.classList.contains('is-pinned'),outsideRotor:!c.closest('.li-rotor'),visible:getComputedStyle(c).visibility==='visible'&&getComputedStyle(c).opacity==='1'})),
            front:n.querySelector('.li-front .slot-card>img').alt,backface:getComputedStyle(n.querySelector('.li-back')).backfaceVisibility,
            rotation:getComputedStyle(n.querySelector('.li-rotor')).transform,
            placement:e.detail.step==='arrive'?(()=>{const target=document.querySelector(`.formation[data-player="${n.dataset.side}"] .slot[data-position="${e.detail.position}"] .slot-card`).getBoundingClientRect();return ['left','top','width','height'].map(k=>Math.abs(parseFloat(n.style[k])-target[k]));})():null,
            captain:[...n.querySelectorAll('.arena-captain')].map(c=>({opacity:getComputedStyle(c).opacity,width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height,loaded:c.querySelector('img').naturalWidth}))}))});
        },e.detail.step==='reveal'?220:50);
      });
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(url+'#decks');await page.waitForSelector('.team-page');
    const fixture=await page.evaluate(()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),team=T.normalize({name:'Lineup QA',cards:KALISTAR_DATA.decks.player});
      team.captain=team.formation[2];team.equipment={momo:'little-joys-flute'};
      if(E.validateComposition(team).length)throw Error(E.validateComposition(team).join(' '));
      localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(team));return team;
    });
    await page.reload();await page.waitForSelector('.team-page');
    await page.locator('[data-deck-action=save]').click();
    const initial=await start(page);assert.equal(initial.phase,'initiative');assert.deepEqual(initial.players[0].board.map(c=>c.cardId),fixture.formation);
    // Capture the first reveal, including each native identity clue.
    for(const step of ['weapon','crystal','faction']){await stage(page,1,step);
      if(step==='weapon'){await page.evaluate(()=>document.querySelector('.formation .slot-card').click());assert.equal(await page.locator('.slot.selected').count(),0);assert.deepEqual(await game(page),initial);}
      await shot(page,'desktop-p1-'+step);
    }
    await stage(page,1,'reveal');await shot(page,'desktop-p1');
    for(const position of [3,5]){await stage(page,position,'reveal');if(position===3)await page.waitForTimeout(150);await shot(page,'desktop-p'+position);}
    await page.waitForSelector('.lineup-intro',{state:'detached',timeout:15000});await clean(page,initial);
    const steps=await page.evaluate(()=>lineupSteps);
    for(let p=1;p<=5;p++)assert.deepEqual(steps.filter(s=>s.position===p).map(s=>s.step).filter(s=>s!=='loading'),['title','depart','weapon','crystal','faction','suspense','flip','reveal','arrive']);
    await shot(page,'desktop-final');
    const samples=await page.evaluate(()=>lineupChecks);fs.writeFileSync(path.join(output,'samples.json'),JSON.stringify(samples,null,2));
    const identities=await page.evaluate(()=>Object.fromEntries(KALISTAR_DATA.cards.map(c=>[c.id,c]))),elements=await page.evaluate(()=>KALISTAR_DATA.elements);
    for(const sample of samples){
      assert.equal(sample.actors.length,2);assert.equal(sample.hidden,(6-sample.position)*2);
      for(const [side,a] of sample.actors.entries()){
        const c=identities[initial.players[side].board[sample.position-1].cardId];assert.equal(a.id,c.id);assert.equal(a.front,c.name);assert.equal(a.backface,'hidden');
        const kinds=['weapon','crystal','faction'],index=kinds.indexOf(sample.step),count=index<0?3:index+1;
        assert.deepEqual(a.clues.map(c=>c.kind),kinds.slice(0,count),'earlier clues stay mounted and visible');
        assert.equal(a.clues.filter(c=>c.pinned).length,index<0?3:index);
        assert(a.clues.every(c=>c.visible&&c.outsideRotor),'clues must not flip away with the card back');
        const labels=[c.weapon,c.element==='NONE'?'Sans cristal':elements[c.element].label,c.faction];
        assert.deepEqual(a.clues.map(c=>c.label),labels.slice(0,count));
        if(sample.step==='weapon')assert.equal(a.label,c.weapon);
        if(sample.step==='crystal')assert.equal(a.label,c.element==='NONE'?'Sans cristal':elements[c.element].label);
        if(sample.step==='faction')assert.equal(a.label,c.faction);
        if(sample.step==='reveal'){assert.match(a.rotation,/matrix3d\(-1/);for(const crown of a.captain){assert(+crown.opacity>.8);assert(crown.loaded>0&&crown.height>10);}}
        if(sample.step==='weapon')for(const crown of a.captain)assert.equal(+crown.opacity,0);
        if(a.placement)assert(a.placement.every(delta=>delta<.1),'shared-element target must match the real slot exactly');
      }
    }
    if(process.argv.includes('--probe')){assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({built,steps,samples,errors},null,2));console.log('Desktop intro and shared-element geometry passed, including all asset requests.');return;}
    // Skipping preserves combat state while resolving the required captain draw.
    for(const [p,step] of [[1,'weapon'],[2,'faction'],[3,'flip'],[5,'weapon']]){
      const snapshot=await start(page);await stage(page,p,step);await page.locator('.li-skip').click();await clean(page,snapshot);
      await page.waitForTimeout(250);assert.equal(await page.locator('.lineup-intro').count(),0);
    }
    // Reentry resumes only the pending captain draw, not the five lineup pairs.
    const exited=await start(page);await stage(page,1,'weapon');await page.locator('.li-exit').click();
    await page.locator('.masthead [data-view=arena]').click();await stage(page,6,'captains');await page.locator('.li-skip').click();await clean(page,exited);
    const reloaded=await start(page);await page.reload();await stage(page,6,'captains');await page.locator('.li-skip').click();await clean(page,reloaded);
    // Real phone layouts and resizing while a pair is already in motion.
    for(const [width,height] of [[320,800],[360,800],[390,844],[412,1007],[430,932],[844,390]]){
      await page.setViewportSize({width,height});const snapshot=await start(page);await stage(page,1,'faction');
      const geometry=await page.locator('.li-flight').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
      assert.equal(geometry.length,2);assert(geometry[0].right<geometry[1].left);assert(geometry.every(r=>r.left>=0&&r.right<=width&&r.top>=50&&r.bottom<height-20));
      const title=await page.locator('.li-title').boundingBox(),piles=await page.locator('.li-stack').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
      assert(piles.every(r=>r.right<title.x||r.left>title.x+title.width||r.bottom<=title.y||r.top>=title.y+title.height),'title and P5 piles must not overlap');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await shot(page,'mobile-'+width+'-clues');await stage(page,1,'reveal');
      const docks=await page.locator('.li-flight').evaluateAll(nodes=>nodes.map(n=>({card:n.getBoundingClientRect().toJSON(),clues:[...n.querySelectorAll('.li-clue.is-pinned')].map(c=>({box:c.getBoundingClientRect().toJSON(),label:c.querySelector('b').getBoundingClientRect().toJSON(),symbol:c.querySelector('.li-clue-symbol').getBoundingClientRect().toJSON()}))})));
      for(const dock of docks){
        assert.equal(dock.clues.length,3);
        for(const [i,clue] of dock.clues.entries()){
          assert(clue.box.left>=0&&clue.box.right<=width+.1&&clue.box.top>=50&&clue.box.bottom<dock.card.top,'clues fit above the card');
          assert(clue.label.bottom<=clue.box.bottom+1&&clue.label.width<=clue.box.width,'all labels fit their dock');
          assert(clue.symbol.bottom<clue.label.top,'image and label do not overlap');
          if(i)assert(dock.clues[i-1].box.right<=clue.box.left+.1,'weapon / crystal / faction remain side by side');
        }
      }
      const overflow=await page.evaluate(()=>{
        const labels={weapon:[...new Set(KALISTAR_DATA.cards.map(c=>c.weapon))],crystal:['Sans cristal',...Object.values(KALISTAR_DATA.elements).map(e=>e.label)],faction:[...new Set(KALISTAR_DATA.cards.map(c=>c.faction))]},failures=[];
        for(const node of document.querySelectorAll('.li-flight[data-side="0"] .li-clue.is-pinned')){
          const b=node.querySelector('b'),original=b.textContent;
          for(const label of labels[node.dataset.kind]){b.textContent=label;const r=b.getBoundingClientRect(),box=node.getBoundingClientRect();if(r.bottom>box.bottom+1||r.width>box.width)failures.push({label,kind:node.dataset.kind});}
          b.textContent=original;
        }
        return failures;
      });
      assert.deepEqual(overflow,[],'every catalogue clue fits the persistent row');
      await shot(page,'mobile-'+width+'-reveal');
      await stage(page,1,'arrive');await page.setViewportSize({width:height,height:width});await page.waitForTimeout(60);
      assert.equal(await page.locator('.lineup-intro').count(),1);await page.locator('.li-skip').click();await clean(page,snapshot);
    }
    await page.setViewportSize({width:412,height:1007});
    const phone=await start(page);for(const p of [3,5]){await stage(page,p,'reveal');await shot(page,'mobile-412-p'+p);}
    await page.waitForSelector('.lineup-intro',{state:'detached',timeout:15000});await clean(page,phone);
    // Resize and skip while the same clue travels from the centre to its dock.
    const docking=await start(page);await stage(page,1,'weapon');await page.waitForSelector('.li-clue-weapon.is-pinned');
    await page.setViewportSize({width:844,height:390});
    assert(await page.locator('.li-clue-weapon.is-pinned').evaluateAll(nodes=>nodes.every(n=>n.querySelector('.li-clue-symbol').getAnimations().length===0)),'resize settles dock animation at its responsive anchor');
    await page.locator('.li-skip').click();await clean(page,docking);
    await page.setViewportSize({width:412,height:1007});await page.emulateMedia({reducedMotion:'reduce'});
    const reduced=await start(page);await stage(page,3,'reveal');await shot(page,'reduced-motion');
    assert(await page.locator('.lineup-intro').evaluate(root=>[...root.querySelectorAll('.li-rotor,.li-front,.li-clue-symbol,.li-clue b')].every(n=>getComputedStyle(n).transform==='none')));
    assert.equal(await page.locator('.li-clue.is-pinned').count(),6);
    await page.waitForSelector('.lineup-intro',{state:'detached',timeout:15000});await clean(page,reduced);
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({initial,steps,sizes:[320,360,390,412,430,844],checks:['real new composition','pair order','persistent native clues','clues outside flipping rotor','docked labels and images fit','captains','skip x4','menu/resume','reload during intro','portrait/landscape','resize during docking','skip during docking','reduced motion','engine state identity'],errors},null,2));
    console.log('Lineup browser checks passed. Captures: '+output);
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
