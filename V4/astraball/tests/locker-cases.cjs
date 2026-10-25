const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function lockerCases({browser,url,OUT,sharp}){
  const {createRoster}=await import('../src/roster.mjs');
  const {canPlayPosition}=await import('../data/athletes.mjs');
  const roster=createRoster(require('../data/sprite-library.json'));
  const reports=[];
  for(const [name,width,height] of [['desktop',1440,900],['wide',1920,1080],['razr',412,915],['compact',360,800],['landscape',915,412]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:width<761,hasTouch:width<761,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(url);await page.waitForFunction(()=>window.Astraball?.ready);
    const eligible=roster.entries.filter(c=>canPlayPosition(c.athlete,'meneur'));
    assert.equal(await page.locator('.character-choice').count(),Math.min(30,eligible.length));
    if(eligible.length>30){await page.locator('#roster-next').click();assert.match(await page.locator('#roster-page').innerText(),/^2 \/ /);await page.locator('#roster-prev').click();}
    assert.equal(await page.locator('.athlete-ratings meter').count(),6);
    assert.match(await page.locator('.athlete-measures').innerText(),/95 cm/);
    await page.locator('#locker-tab-teams').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#locker-tab-ball').getAttribute('aria-selected'),'true');
    await page.keyboard.press('End');assert.equal(await page.locator('#locker-tab-arena').getAttribute('aria-selected'),'true');
    await page.keyboard.press('Home');
    await page.screenshot({path:path.join(OUT,name+'-locker-teams.png')});
    assert.equal(await page.locator('#modal').evaluate(el=>el.scrollWidth>el.clientWidth),false);
    const initial=await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot()));
    await page.locator('#character-search').fill('RIKO');
    await page.getByRole('button',{name:'RIKO',exact:true}).click();
    await page.locator('#character-search').fill('');
    await page.locator('[data-position="sentry"]').click();
    await page.getByRole('button',{name:'Momo',exact:true}).click();
    assert.match(await page.locator('[data-position="meneur"]').innerText(),/RIKO/);
    await page.locator('[data-team="1"]').click();
    await page.locator('[data-position="pilier"]').click();
    await page.locator('#character-search').fill('ITHREK');
    await page.getByRole('button',{name:'ITHREK',exact:true}).click();
    await page.locator('#character-search').fill('not-a-character');
    assert.equal(await page.locator('#roster-empty').isVisible(),true);
    await page.locator('#character-search').fill('');
    await page.locator('#locker-tab-arena').click();
    await page.locator('.arena-choice').filter({has:page.locator('input[value="rhinoz"]')}).click();
    await page.screenshot({path:path.join(OUT,name+'-locker-arena.png')});
    assert.equal(await page.locator('input[name="arena"][value="rhinoz"]').isChecked(),true);
    await page.locator('#locker-tab-ball').click();
    await page.locator('.ball-choice').filter({has:page.locator('input[value="rhinoz"]')}).click();
    await page.locator('#match-mode').selectOption('hotseat');
    assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),initial,'draft does not alter the match');
    await page.locator('#new-match').click();await page.waitForFunction(()=>!document.querySelector('#modal').open);
    const selected=await page.evaluate(()=>window.Astraball.snapshot());
    assert.equal(selected.units.find(u=>u.team===0&&u.role==='meneur').name,'RIKO');
    assert.equal(selected.units.find(u=>u.team===0&&u.role==='sentry').name,'Momo');
    assert.equal(selected.units.find(u=>u.team===1&&u.role==='pilier').name,'ITHREK');
    assert.equal(selected.units.find(u=>u.team===0&&u.role==='sentry').stats.PAS,9);
    assert.equal(selected.units.find(u=>u.team===0&&u.role==='sentry').athlete.id,'momo');
    assert.equal(selected.phase,'placement');
    assert.equal(await page.evaluate(()=>window.Astraball.metrics().arenaLines),0xffffff);
    assert.equal(await page.evaluate(()=>window.Astraball.metrics().sprites.count),10);
    assert.equal(await page.locator('.venue span').innerText(),'VILLAGE RHINOZ');
    for(const view of ['horizontal','isometric']){
      await page.locator('#camera-toggle').click();await page.locator('#camera-panel [data-view="'+view+'"]').click();await page.locator('#camera-toggle').click();
      await page.locator('#zoom-reset').click();
      assert.equal(await page.evaluate(()=>window.Astraball.metrics().sprites.selectedId),selected.units.find(u=>u.team===0&&u.role==='meneur').id,'camera preserves placement selection');
      await page.screenshot({path:path.join(OUT,name+'-rhinoz-'+view+'.png')});
      const {data,info}=await sharp(await page.locator('canvas').screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});
      // Placement shading and subpixel antialiasing dim the white chalk.
      let white=0;for(let i=0;i<data.length;i+=info.channels)if(Math.min(data[i],data[i+1],data[i+2])>190&&Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])<25)white++;
      assert.ok(white>100,'white court lines actually rendered '+name+' '+view);
      assert.ok((await sharp(await page.locator('canvas').screenshot()).stats()).channels[0].stdev>20);
    }
    const saved=await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot()));
    await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
    assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),saved);
    assert.equal(await page.evaluate(()=>window.Astraball.metrics().appearance.arena),'rhinoz');
    assert.equal(await page.evaluate(()=>window.Astraball.metrics().appearance.ball),'rhinoz');
    await page.locator('#settings').click();
    await page.locator('#reset-team').click();
    await page.locator('#apply-options').click();await page.waitForFunction(()=>!document.querySelector('#modal').open);
    assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),saved,'resume cannot replace existing team');
    await page.locator('#formation-ready').click();await page.waitForFunction(()=>window.Astraball.snapshot().placement?.team===1);
    await page.locator('#formation-ready').click();await page.waitForFunction(()=>window.Astraball.snapshot().phase==='play');
    await page.locator('#wait').click();await page.waitForFunction(()=>!window.Astraball.metrics().busy);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);reports.push({name,customTeams:true,whiteLines:true,saveReload:true,errors});await context.close();
  }
  // Every extra appearance can start, replace the prior tokens and reload.
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();
  await page.goto(url);await page.waitForFunction(()=>window.Astraball?.ready);
  const characters=roster.entries,ids=characters.map(c=>c.id);
  for(const id of ids){
    if(!await page.locator('#modal').isVisible())await page.locator('#settings').click();
    await page.locator('#reset-team').click();
    const c=roster.get(id),role=c.athlete.primary,defaults=roster.defaults();
    const other=Object.keys(defaults[0]).find(r=>r!==role&&roster.get(defaults[0][r]).characterId===c.characterId);
    if(other){
      const replacement=characters.find(e=>e.characterId!==c.characterId&&roster.canSelect(defaults,0,other,e.id)&&!Object.values(defaults[0]).includes(e.id));
      await page.locator('[data-position="'+other+'"]').click();await page.locator('#character-search').fill(replacement.name);await page.locator('[data-character="'+replacement.id+'"]').click();
    }
    await page.locator('[data-position="'+role+'"]').click();
    await page.locator('#character-search').fill(c.name);
    await page.locator('[data-character="'+id+'"]').click();await page.locator('#new-match').click();
    await page.waitForFunction(()=>!document.querySelector('#modal').open);
    assert.equal(await page.evaluate(()=>window.Astraball.metrics().sprites.count),10);
    assert.equal(await page.evaluate(role=>window.Astraball.snapshot().units.find(u=>u.team===0&&u.role===role).character,role),id);
    assert.deepEqual(await page.evaluate(role=>window.Astraball.snapshot().units.find(u=>u.team===0&&u.role===role).stats,role),c.athlete.stats);
  }
  const before=await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot()));
  await page.locator('#settings').click();await page.locator('#shuffle-team').click();await page.locator('#close-dialog').click();
  assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),before,'cancel discards lineup changes');
  await context.close();
  const offline=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),retry=await offline.newPage();
  await retry.goto(url);await retry.waitForFunction(()=>window.Astraball?.ready);
  await retry.locator('#new-match').click();await retry.waitForFunction(()=>!document.querySelector('#modal').open);
  const preserved=await retry.evaluate(()=>JSON.stringify(window.Astraball.snapshot()));
  await retry.route('**/rhinoz-*-v2.webp',route=>route.abort());
  await retry.locator('#settings').click();await retry.locator('#locker-tab-arena').click();
  await retry.locator('.arena-choice').filter({has:retry.locator('input[value="rhinoz"]')}).click();
  await retry.locator('#new-match').click();await retry.locator('#locker-error').waitFor({state:'visible'});
  assert.equal(await retry.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),preserved,'failed media load preserves the match');
  assert.equal(await retry.locator('#close-dialog').isEnabled(),true);
  await retry.unroute('**/rhinoz-*-v2.webp');await retry.locator('#new-match').click();
  await retry.waitForFunction(()=>!document.querySelector('#modal').open);
  assert.equal(await retry.evaluate(()=>window.Astraball.metrics().appearance.arena),'rhinoz');
  await offline.close();
  fs.writeFileSync(path.join(OUT,'locker-results.json'),JSON.stringify({reports,charactersStarted:ids.length},null,2));
};
