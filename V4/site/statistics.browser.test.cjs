'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__statistics__.cjs'))('playwright');
const url=process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const output=path.join(__dirname,'verification/statistics');
let browser;
async function main(){
  fs.mkdirSync(output,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/jeu/#statistics');await page.waitForFunction(()=>window.KALISTAR_READY);
  assert.ok(await page.locator('.sheet-table').isVisible());
  const expected=await page.evaluate(async()=>{
    const e=KalistarEngine.createEngine(KALISTAR_DATA),db=KALISTAR_DB,T=KalistarTrophies,finished=[];
    for(let i=0;i<6;i++){
      const s=db.registry.bindGame(KALISTAR_ACTIVE_USER,e.newGame(KALISTAR_DATA.decks.player,KALISTAR_DATA.decks.enemy,{seed:'TROPHIES-'+i,mode:'local'}));
      e.autoDeploy(s,0);e.autoDeploy(s,1);e.start(s);
      for(let n=0;n<3000&&s.phase!=='over';n++){
        if(s.phase==='choose')e.lock(s,...e.aiChoice(s));
        else if(s.phase==='attack')e.rollAttack(s);
        else if(s.phase==='kalistel')e.acceptAttack(s);
        else if(s.phase==='defense')e.rollDefense(s);
        else if(s.phase==='result')e.next(s);
        else if(s.phase==='replace')e.autoDeploy(s,s.replacing);
        else{const suffix={guard:'Guard',heart:'Reraise',potion:'Potion',physical:'Physical',clover:'Clover'}[s.phase];e['grant'+suffix](s,e['ai'+suffix+'Choice'](s));}
      }
      if(s.phase!=='over')throw Error('fixture not finished');e.assertState(s);await db.saveGame(s);finished.push(s);
    }
    const before=JSON.stringify(db.inspect('results'));await db.saveGame(finished[0]);
    if(before!==JSON.stringify(db.inspect('results')))throw Error('duplicate awards on repeated save');
    const rows=db.inspect('results');
    for(const row of rows){const awards=T.awards(db.match(row.matchId).summary)[row.uid]||[];if(JSON.stringify(row.trophies)!==JSON.stringify(awards))throw Error('incorrect stored honours');}
    window.testHonoursGames=finished;
    const totals=T.empty();for(const row of rows.filter(r=>r.side===0&&r.participated&&!r.partial))T.add(totals,row,row.trophies);
    // An old local database upgrades additively; a forged import cannot add honours.
    const first=structuredClone(finished[0]);delete first.collection;
    const legacyName='kalistar-v4-cards-trophy-migration';delete window.KalistarTrophies;
    let legacy=await KalistarLocalDB.open(KALISTAR_DATA,{name:legacyName});await legacy.saveGame(first);legacy.close();window.KalistarTrophies=T;
    legacy=await KalistarLocalDB.open(KALISTAR_DATA,{name:legacyName});
    if(legacy.inspect('results').some(r=>r.trophyVersion!==1))throw Error('migration failed');
    const backup=await legacy.exportBackup();backup.results.forEach(r=>{r.trophies=['heart'];r.kills=99999;});legacy.close();
    const restored=await KalistarLocalDB.open(KALISTAR_DATA,{name:'kalistar-v4-cards-trophy-import'});await restored.importBackup(backup);
    const awards=T.awards(restored.match(first.matchId).summary);
    if(restored.inspect('results').some(r=>JSON.stringify(r.trophies)!==JSON.stringify(awards[r.uid]||[])||r.kills===99999))throw Error('forged imported awards trusted');
    restored.close();
    return {totals,matches:finished.length};
  });
  await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
  assert.match(await page.locator('.sheet-record').textContent(),/^6 rencontres/);
  const stored=await page.evaluate(()=>JSON.stringify(KALISTAR_DB.inspect('results')));
  await page.locator('[data-sheet-action=mode][data-id=total]').click();
  assert.equal(await page.locator('.sheet-table tbody [data-metric=kills]').evaluateAll(ns=>ns.reduce((sum,n)=>sum+Number(n.textContent.replace(/\s/g,'')),0)),expected.totals.kills);
  await page.locator('[data-sheet-action=sort][data-id=kills]').click();
  const values=await page.locator('.sheet-table tbody [data-metric=kills]').allTextContents();
  assert.deepEqual(values.map(Number),values.map(Number).sort((a,b)=>b-a));
  await page.locator('[data-sheet-action=sort][data-id=kills]').click();
  assert.equal(await page.locator('th[aria-sort=ascending]').getAttribute('class'),'sheet-sorted');
  await page.locator('[data-sheet-field=query]').fill('MOMO');assert.equal(await page.locator('[data-sheet-row]').count(),1);
  await page.locator('[data-sheet-field=grouping]').selectOption('version');assert.equal(await page.locator('[data-sheet-row]').count(),2);
  await page.locator('[data-sheet-field=query]').fill('absent-000');assert.ok(await page.locator('.sheet-empty').isVisible());
  await page.locator('[data-sheet-action=reset]').click();
  await page.locator('[data-sheet-field=scope]').selectOption('all');
  await page.locator('[data-sheet-action=mode][data-id=total]').click();
  const allKills=await page.evaluate(()=>KALISTAR_DB.inspect('results').filter(r=>r.participated&&!r.partial).reduce((n,r)=>n+r.kills,0));
  assert.equal(await page.locator('.sheet-table tbody [data-metric=kills]').evaluateAll(ns=>ns.reduce((sum,n)=>sum+Number(n.textContent.replace(/\s/g,'')),0)),allKills);
  await page.locator('[data-sheet-action=reset]').click();
  await page.locator('[data-sheet-field=collab]').selectOption('FF7');assert.ok((await page.locator('[data-sheet-row]').count())>0);
  await page.locator('[data-sheet-action=reset]').click();
  const download=page.waitForEvent('download');await page.locator('[data-sheet-action=export]').click();const file=await download;
  const exported=fs.readFileSync(await file.path(),'utf8');assert.ok(exported.startsWith('\ufeff'));assert.ok(exported.includes(' / match'));
  for(const [width,height] of [[1920,1080],[1440,1000],[1024,768],[412,1007],[390,844],[320,568],[844,390]]){
    await page.setViewportSize({width,height});
    await page.locator('.sheet-filters').evaluate(n=>{n.open=false;});
    for(const group of ['performance','support','trophies']){
      await page.locator('[data-sheet-action=group][data-id='+group+']').click();
      assert.ok(await page.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow at '+width);
      const rect=await page.locator('.sheet-scroll').boundingBox();assert.ok(rect.height>70,'readable table viewport at '+width+'x'+height);
      await page.locator('.sheet-scroll').evaluate(n=>{n.scrollLeft=n.scrollWidth;});
      const identity=await page.locator('thead .sheet-identity').boundingBox();assert.ok(identity.x>=rect.x&&identity.x<rect.x+60,'sticky identity');
      if(group==='trophies'){await page.locator('.sheet-table .trophy-image').first().evaluate(img=>img.decode());await page.screenshot({path:path.join(output,'trophies-'+width+'x'+height+'.png'),scale:'css'});}
      await page.locator('.sheet-scroll').evaluate(n=>{n.scrollLeft=0;});
    }
    await page.locator('[data-sheet-action=group][data-id=performance]').click();
    await page.screenshot({path:path.join(output,'sheet-'+width+'x'+height+'.png'),scale:'css'});
  }
  assert.equal(await page.evaluate(()=>JSON.stringify(KALISTAR_DB.inspect('results'))),stored,'filtering and export never mutate archives');
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-sheet-row] [data-sheet-action=detail]').first().click();assert.ok(await page.locator('#detail-dialog').isVisible());
  assert.equal(await page.locator('#detail-dialog .trophy-keepsake').count(),5);
  await page.locator('#detail-dialog [data-action=close]').click();
  // Visual and tie fixture is DOM-only; the stored results remain untouched.
  await page.evaluate(()=>{
    const s=structuredClone(KALISTAR_DB.matches()[0].state);s.phase='over';s.winner=0;
    const all=side=>[...s.players[side].board.filter(Boolean),...s.players[side].dead,...s.players[side].reserve].filter(u=>u.entered);
    s.match.partial=false;
    s.match.events=[0,1].map(i=>({round:i+1,attacker:all(0)[i].uid,target:all(1)[i].uid,attackRolls:1,defenseRolls:1,attack:250,defense:100,breakthrough:150,buff:0,kill:true,hold:false,dodge:false,shield:false,reraise:false,luck:false,barrier:0,debuff:0,support:null}));
    window.testTiedReport=s;
  });
  for(const [width,height] of [[1920,1080],[1440,1000],[1440,700],[800,1000],[412,1007],[320,568],[844,390]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>{const d=document.getElementById('match-dialog');d.innerHTML='<div class="dialog-head"><h2>Palmares</h2></div>'+KalistarMatchReport.render(window.testTiedReport,{tab:'awards'});if(!d.open)d.showModal();lucide.createIcons();});
    assert.equal(await page.locator('.golden-award:visible').count(),5);
    assert.equal(await page.locator('[data-trophy=crystal] .golden-winners button').count(),2);
    assert.equal(await page.locator('[data-trophy=killer] .golden-winners button').count(),2);
    assert.equal(await page.locator('.golden-award[data-trophy=heart]').getAttribute('data-empty'),'true');
    assert.equal(await page.locator('.golden-palmares .match-pagination').count(),0);
    await page.locator('.golden-object img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
    const sizes=await page.locator('.golden-award').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect(),s=n.querySelector('.golden-scene').getBoundingClientRect();return {w:r.width,h:r.height,scene:s.height};}));
    assert.ok(sizes.every(r=>r.w>100&&r.h>150&&r.scene>20),JSON.stringify({width,height,sizes}));
    await page.screenshot({path:path.join(output,'palmares-'+width+'x'+height+'.png'),scale:'css'});
    await page.locator('.golden-award .golden-result').last().scrollIntoViewIfNeeded();
    const end=await page.locator('.golden-award .golden-result').last().boundingBox(),view=await page.locator('.match-view').boundingBox();assert.ok(end.y+end.height<=view.y+view.height+1,'last trophy result reachable at '+width+'x'+height);
    await page.evaluate(()=>document.getElementById('match-dialog').close());
  }
  assert.deepEqual(errors,[]);console.log('PASS: 6 real matches; persistent/idempotent honours; migration/import protection; career integration; filters, sorting, CSV, 7 responsive sizes and shared palmares.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
