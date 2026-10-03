const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const runtime=createRequire(path.join(modules,'__team_qa__.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(__dirname,'../deploy/dist');
const output=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'verification/team-composition',...(built?['pages']:[]));
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1920,height:1080},hasTouch:true,acceptDownloads:true,serviceWorkers:'block'});
    const database='kalistar-v4-cards-team-qa-'+Date.now();
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(built&&url.hostname==='kalistar-qa.invalid'){
        const name=decodeURIComponent(url.pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,name.endsWith('/')?name+'index.html':name);
        assert(file.startsWith(dist+path.sep),'QA path outside built site');
        if(!fs.existsSync(file))return route.fulfill({status:404,body:'QA missing '+name});
        let body=fs.readFileSync(file);if(path.basename(file)==='local-db.js')body=Buffer.from(body.toString().replace("NAME='kalistar-v4-cards'","NAME='"+database+"'"));
        const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream';
        return route.fulfill({body,contentType:type});
      }
      if(url.pathname.endsWith('/local-db.js')){const s=await(await route.fetch()).text();return route.fulfill({body:s.replace("NAME='kalistar-v4-cards'","NAME='"+database+"'"),contentType:'text/javascript'});}
      return route.continue();
    });
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
    await page.goto((process.env.KALISTAR_URL||(built?'https://kalistar-qa.invalid/Kalistar/jeu/':'http://127.0.0.1:4304/jeu/'))+'#decks');
    await page.waitForSelector('.kdb-page');await page.waitForTimeout(1800);
    if(process.argv.includes('--before')){
      await page.screenshot({path:path.join(output,'before-desktop.png')});
      await page.setViewportSize({width:412,height:1007});await page.screenshot({path:path.join(output,'before-phone.png')});
      return;
    }
    await verify(page,output);
    assert.deepEqual(errors,[],'browser errors');
  }finally{await browser.close();}
}
async function verify(page,output){
  const draft=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.teamDraft')));
  const plan=await page.evaluate(()=>{
    const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),old=T.normalize({name:'Equipe QA',cards:KALISTAR_DATA.decks.player});
    const balm=KALISTAR_DATA.cards.find(c=>c.characterId==='balmhyr'),lok=KALISTAR_DATA.cards.find(c=>c.characterId==='lok');
    const swaps=new Map([[old.formation[0],balm.id],[old.formation[1],lok.id]]);
    const team={...old,cards:old.cards.map(id=>swaps.get(id)||id),formation:old.formation.map(id=>swaps.get(id)||id),captain:balm.id,equipment:{}};
    const errors=E.validateComposition(team);if(errors.length)throw Error(errors.join(' '));
    return {team,slots:T.slots(team),names:Object.fromEntries(KALISTAR_DATA.cards.map(c=>[c.id,c.name]))};
  });
  await page.locator('.kdb-heading [data-deck-action=manage]').click();await page.locator('[data-deck-action=new]').click();
  await page.locator('[data-deck-action=name]').fill('Equipe QA');
  for(let i=0;i<10;i++){
    await page.locator('[data-deck-action=slot][data-slot="'+i+'"]').click();
    await page.locator('[data-deck-filter=search]').fill(plan.names[plan.slots[i]]);
    await page.locator('.kdb-candidate-image[data-id="'+plan.slots[i]+'"]').click();
    await page.waitForFunction(({i,id})=>JSON.parse(localStorage.getItem('kalistar.v4.teamDraft')).cards[i]===id,{i,id:plan.slots[i]});
  }
  await page.locator('[data-deck-filter=search]').fill('');
  assert.equal((await draft()).captain,null);assert(await page.locator('[data-deck-action=play]').isDisabled());
  await page.locator('[data-deck-action=captain][data-slot="0"]').click();
  assert.equal((await draft()).captain,plan.team.captain);
  await page.locator('[data-deck-action=captain][data-slot="1"]').click();assert.equal((await draft()).captain,plan.slots[1]);
  await page.locator('[data-deck-action=undo]').click();assert.equal((await draft()).captain,plan.team.captain);
  const replacement=await page.evaluate(()=>KALISTAR_DATA.cards.find(c=>c.characterId==='magnar'));
  await page.locator('[data-deck-action=slot][data-slot="0"]').click();
  await page.locator('[data-deck-filter=search]').fill(replacement.name);
  await page.locator('.kdb-candidate-image[data-id="'+replacement.id+'"]').click();
  assert(await page.locator('.kdb-compare:modal').isVisible());
  await page.locator('[data-deck-action=cancel-replace]').first().click();assert.equal((await draft()).formation[0],plan.team.captain);
  const recruit=await page.locator('[data-deck-recruit="'+replacement.id+'"]').boundingBox(),slot=await page.locator('[data-deck-slot="0"]').boundingBox();
  await page.mouse.move(recruit.x+recruit.width/2,recruit.y+recruit.height/2);await page.mouse.down();
  await page.mouse.move(slot.x+slot.width/2,slot.y+slot.height/2,{steps:15});await page.mouse.up();
  assert(await page.locator('.kdb-compare:modal').isVisible());await page.locator('[data-deck-action=confirm-replace]').click();
  assert.equal((await draft()).formation[0],replacement.id);assert.equal((await draft()).captain,null);
  await page.locator('[data-deck-action=undo]').click();assert.equal((await draft()).captain,plan.team.captain);
  await page.locator('[data-deck-filter=search]').fill('');
  await page.locator('[data-deck-action=reorder][data-slot="2"]').click();
  await page.locator('[data-deck-action=slot][data-slot="0"]').click();assert.match(await page.locator('#toast').textContent(),/ne peut pas occuper/);
  assert.equal((await draft()).formation[0],plan.team.captain);
  // A physical drag commits only after release; reserve order has no role restriction.
  const from=await page.locator('[data-deck-action=slot][data-slot="6"]').boundingBox(),to=await page.locator('[data-deck-action=slot][data-slot="7"]').boundingBox();
  await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();
  await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:12});assert.equal((await draft()).cards[6],plan.slots[6]);
  await page.mouse.up();assert.equal((await draft()).cards[6],plan.slots[7]);
  await page.waitForTimeout(550);await page.locator('[data-deck-action=undo]').click();assert.equal((await draft()).cards[6],plan.slots[6]);
  await page.locator('[data-deck-action=redo]').click();assert.equal((await draft()).cards[6],plan.slots[7]);
  await page.locator('[data-deck-action=undo]').click();
  await page.locator('[data-deck-action=reorder][data-slot="6"]').click();await page.locator('[data-deck-action=slot][data-slot="0"]').click();
  assert.equal((await draft()).formation[0],plan.slots[6]);assert.equal((await draft()).cards[6],plan.slots[0]);assert.equal((await draft()).captain,null);
  await page.locator('[data-deck-action=undo]').click();assert.equal((await draft()).captain,plan.team.captain);
  for(const [slot,id] of [[0,'fallen-king-axe'],[2,'little-joys-flute']]){
    await page.locator('[data-deck-action=slot][data-slot="'+slot+'"]').click();
    await page.locator('[data-deck-action=recruit-mode][data-id=weapons]').click();
    await page.locator('[data-deck-action=equip][data-id="'+id+'"]').click();
    assert.equal(await page.locator('.team-equipped .eq-tab').count(),0);
  }
  assert.deepEqual((await draft()).equipment,{balmhyr:'fallen-king-axe',momo:'little-joys-flute'});
  await page.locator('[data-deck-action=unequip]').click();assert.equal((await draft()).equipment.momo,undefined);
  await page.locator('[data-deck-action=undo]').click();assert.equal((await draft()).equipment.momo,'little-joys-flute');
  await page.locator('[data-deck-action=save]').click();
  const saved=await draft();
  await page.reload();await page.waitForSelector('.team-page');assert.deepEqual(await draft(),saved);
  await page.locator('.kdb-heading [data-deck-action=manage]').click();await page.locator('[data-deck-action=duplicate]').click();
  assert.deepEqual((await draft()).formation,saved.formation);assert.deepEqual((await draft()).equipment,saved.equipment);
  const download=page.waitForEvent('download');await page.locator('[data-action=export-deck]').click();
  const file=await download;const json=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(json.schema,2);assert.deepEqual(json.formation,saved.formation);assert.equal(json.captain,saved.captain);
  await page.locator('#deck-file').setInputFiles({name:'team.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(json))});
  await page.locator('[data-deck-action=recruit-mode][data-id=characters]').click();
  await page.waitForTimeout(500);
  await page.screenshot({path:path.join(output,'after-desktop.png')});
  await page.locator('[data-action=phone-preview]').click();await page.waitForSelector('#phone-preview-frame');
  const preview=page.frameLocator('#phone-preview-frame');await preview.locator('.team-page').waitFor();
  assert.deepEqual(await preview.locator('body').evaluate(()=>[innerWidth,innerHeight]),[412,1007]);
  await page.screenshot({path:path.join(output,'razr-preview.png')});
  const normal=new URL(page.url());normal.searchParams.delete('phone');await page.goto(normal.href);await page.waitForSelector('.team-page');
  const sizes=[[320,800],[360,800],[390,844],[412,1007],[430,932],[844,390],[1440,900],[1920,1080]];
  for(const [width,height] of sizes){
    await page.setViewportSize({width,height});
    if(width<=900)await page.locator('[data-deck-action=panel][data-id=board]').click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width);
    const alignment=await page.evaluate(()=>[...document.querySelectorAll('.team-equipped')].map(node=>{
      const image=node.parentElement.querySelector('img').getBoundingClientRect(),r=node.getBoundingClientRect(),n=KalistarEquipmentFX.native,c=KalistarCardMedia.crop;
      return {dx:Math.abs(r.left+r.width/2-(image.left+(n.center.x-c.left)/c.width*image.width)),dy:Math.abs(r.top+r.height*60.5/122-(image.top+(n.center.y-c.top)/c.height*image.height)),width:Math.abs(r.width-n.width/c.width*image.width)};
    }));
    assert.equal(alignment.length,2);for(const sample of alignment)for(const v of Object.values(sample))assert(v<1.3,'deck medallion drift '+width+' '+JSON.stringify(sample));
    await page.waitForTimeout(150);
    if(width<=900&&height>500){
      const layout=await page.evaluate(()=>{
        const reserve=document.querySelector('.team-reserves'),last=reserve.querySelector('[data-deck-slot="9"]').getBoundingClientRect(),root=document.querySelector('.kdb-page').getBoundingClientRect(),header=document.querySelector('.kdb-heading').getBoundingClientRect();
        return {header:header.height,rail:reserve.scrollWidth-reserve.clientWidth,last:{left:last.left,right:last.right,bottom:last.bottom},root:{left:root.left,right:root.right},crown:document.querySelector('.captain-crown').naturalWidth};
      });
      assert.equal(layout.header,56);assert(layout.rail<=1);assert(layout.last.left>=layout.root.left);assert(layout.last.right<=layout.root.right+1);assert.equal(layout.crown,336);
      if(width===412){
        assert(layout.last.bottom<1007-56,'R5 visible above navigation on Razr');
        await page.locator('.team-heading-summary').click();assert(await page.locator('.team-management:modal').isVisible());
        const fields=await page.locator('.team-management-controls > *').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
        for(let i=1;i<fields.length;i++)assert(fields[i].top>=fields[i-1].bottom+9,'management controls must not overlap');
        const name=page.locator('.team-management [data-deck-action=name]'),original=await name.inputValue();
        await name.fill(original+' mobile');assert.equal(await page.locator('.team-current-name').textContent(),original+' mobile');
        await name.fill(original);await page.keyboard.press('Tab');
        assert(await page.evaluate(()=>!!document.activeElement.closest('.team-management')),'native modal traps keyboard focus');
        await page.screenshot({path:path.join(output,'management-412.png')});
        await page.keyboard.press('Escape');assert.equal(await page.locator('.team-management:modal').count(),0);
        assert(await page.locator('.team-heading-summary').evaluate(n=>n===document.activeElement),'Escape returns focus to team summary');
        await page.locator('.team-heading-summary').click();await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(200);
        assert(await page.locator('.kdb-heading [data-deck-action=name]').isVisible());
        await page.setViewportSize({width,height});await page.waitForTimeout(200);assert(await page.locator('.team-management:modal').isVisible());
        await page.locator('.team-management [data-deck-action=manage]').click();
      }
    }
    await page.screenshot({path:path.join(output,'after-'+width+'.png')});
    if(width<=900){
      await page.locator('[data-deck-action=slot][data-slot="2"]').tap();assert(await page.locator('.kdb-browser').isVisible());
      await page.locator('[data-deck-action=recruit-mode][data-id=weapons]').tap();assert(await page.locator('[data-deck-action=unequip]').isVisible());
      await page.screenshot({path:path.join(output,'weapons-'+width+'.png')});
      await page.locator('[data-deck-action=panel][data-id=synergy]').click();assert(await page.locator('.team-command').isVisible());
      assert.match(await page.locator('.team-command').textContent(),/BALMHYR/);
      await page.locator('[data-deck-action=panel][data-id=board]').click();
    }
  }
  await page.setViewportSize({width:1920,height:1080});await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-deck-action=play]').click();await page.locator('#game-mode').selectOption('local');
  // Use the same saved formation on both sides, including its captain and weapons.
  const enemyOptions=await page.locator('#enemy-deck-preset option').evaluateAll(options=>options.filter(o=>o.value.startsWith('saved:')).map(o=>o.value));
  assert(enemyOptions.length);await page.locator('#enemy-deck-preset').selectOption(enemyOptions[0]);
  await page.locator('.match-advanced summary').click();await page.locator('#game-seed').fill('TEAM-MANUAL');
  await page.locator('#new-game-form [type=submit]').click();await page.waitForSelector('.battlefield');
  const game=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
  const started=await game();assert.equal(started.phase,'choose');assert.deepEqual(started.players[0].board.map(u=>u.cardId),saved.formation);assert.equal(await page.locator('[data-action=start]').count(),0);
  assert.equal(await page.locator('.arena-captain').count(),2);
  for(const crown of await page.locator('.arena-captain').all()){
    const p=await crown.evaluate(n=>{const r=n.getBoundingClientRect(),card=n.closest('.slot-card').getBoundingClientRect(),img=n.querySelector('img');return {left:r.left-card.left,top:r.top-card.top,right:card.right-r.right,bottom:card.bottom-r.bottom,width:r.width,ratio:r.width/card.width,native:img.naturalWidth,border:getComputedStyle(n).borderTopWidth,background:getComputedStyle(n).backgroundColor};});
    assert(p.left>=1&&p.bottom>=1&&p.top>0&&p.right>0,'the complete crown is inside the card');assert(p.ratio>=.15&&p.ratio<=.3,'crown remains readable');assert.equal(p.native,336);assert.equal(p.border,'0px');assert.equal(p.background,'rgba(0, 0, 0, 0)');
  }
  assert.equal(await page.locator('.eq-overlay').count(),0,'inactive weapons must not mask the original medallion');
  await page.locator('.slot-card[data-side="0"][data-slot="0"]').click();await page.locator('.slot-card[data-side="1"][data-slot="1"]').click();
  assert.match(await page.locator('[data-bonus=captainAttack]').textContent(),/10/);assert.match(await page.locator('[data-bonus=captainDefense]').textContent(),/10/);
  await page.locator('[data-action=lock]').click();await page.locator('[data-action=roll]').click();
  await page.waitForFunction(()=>['kalistel','defense'].includes(JSON.parse(localStorage.getItem('kalistar.v4.game')).phase));
  if((await game()).phase==='kalistel')await page.locator('[data-action=accept-attack]').click();
  for(let i=0;i<10&&(await game()).phase==='defense';i++){await page.locator('[data-action=roll]').click();await page.waitForTimeout(700);}
  const result=await game();assert.equal(result.phase,'result');assert.equal(result.duel.formula.captainAttack,10);assert.equal(result.duel.formula.captainDefense,10);
  for(const [width,height,label] of [[1920,1080,'desktop'],[412,1007,'phone'],[320,800,'compact']]){
    await page.setViewportSize({width,height});await page.waitForTimeout(200);
    const crowns=page.locator('.arena-captain:visible');assert.ok(await crowns.count()>0);
    const geometry=await crowns.evaluateAll(nodes=>nodes.map(n=>{
      const r=n.getBoundingClientRect(),parent=n.closest('.slot-card'),card=parent.getBoundingClientRect();
      return {left:r.left-card.left,top:r.top-card.top,right:card.right-r.right,bottom:card.bottom-r.bottom,width:r.width,cssWidth:parseFloat(getComputedStyle(n).width)};
    }));
    assert.ok(geometry.every(r=>r.left>=0&&r.top>=0&&r.right>=0&&r.bottom>=0&&r.cssWidth>=13.99),'normal and focused crowns are fully inside their card at '+width+' '+JSON.stringify(geometry));
    await page.screenshot({path:path.join(output,'arena-captain-'+label+'.png')});
  }
  await page.setViewportSize({width:412,height:1007});
  await page.reload();await page.waitForSelector('.battlefield');assert.deepEqual(await game(),result);
  // Continue through real engine commands and ownership-backed saves, with periodic restoration.
  const final=await page.evaluate(async()=>{
    const E=KalistarEngine.createEngine(KALISTAR_DATA),db=KALISTAR_DB;let s=JSON.parse(localStorage.getItem('kalistar.v4.game')),replacement=false,capDeath=false;
    for(let n=0;s.phase!=='over'&&n<2500;n++){
      if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='kalistel')E.acceptAttack(s);else if(s.phase==='defense')E.rollDefense(s);
      else if(s.phase==='replace'){replacement=true;E.autoDeploy(s,s.replacing);}else if(s.phase==='result')E.next(s);
      else {const kinds={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']},[grant,choose]=kinds[s.phase];E[grant](s,E[choose](s));}
      E.assertState(s);if(n%17===0){await db.saveGame(s);s=E.restoreGame(s);}
      if(s.players.some((p,i)=>p.dead.some(u=>u.cardId===s.composition.teams[i].captain)))capDeath=true;
    }
    await db.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));return {phase:s.phase,replacement,capDeath};
  });
  assert.equal(final.phase,'over');assert(final.replacement);assert(final.capDeath);
  await page.reload();await page.waitForSelector('#match-dialog[open]');
  assert.equal((await game()).phase,'over');await page.screenshot({path:path.join(output,'completed-phone.png')});
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({sizes,team:saved,scenario:final,checks:['UI recruitment','captain changes','drag','undo/redo','equipment','reload','duplicate','JSON roundtrip','mobile sheets','real duel','captain formula','replacement','completed match']},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
