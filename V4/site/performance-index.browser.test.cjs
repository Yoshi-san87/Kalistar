'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__index_qa__.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(__dirname,'../deploy/dist'),base=process.env.KALISTAR_URL||(built?'https://index-qa.invalid/Kalistar':'http://127.0.0.1:4304');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-10-performance-index/qa/browser');
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),errors=[],checks=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
    if(built)await context.route(base+'/**',route=>{
      let relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,'');if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),relative);
      const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-index-qa'):open.call(this,n+'-index-qa',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(base+'/jeu/#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
    const exampleFile=process.env.KALISTAR_INDEX_EXAMPLE||path.join(__dirname,'../revisions/2026-10-10-performance-index/qa/example.json');
    const example=fs.existsSync(exampleFile)?JSON.parse(fs.readFileSync(exampleFile,'utf8')).state:null;
    const fixtures=await page.evaluate(example=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),team=KalistarTeamComposition.create(E).fromPreset({name:'Index QA',cards:KALISTAR_DATA.decks.player});
      let over,ongoing;
      for(let seed=0;seed<20;seed++){
        const s=E.newGame(team,team,{seed:'INDEX-BROWSER-'+seed,mode:'local',turnOrder:'ABBA'});E.rollInitiative(s,[6,1]);
        for(let i=0;i<5000&&s.phase!=='over';i++){
          if(s.phase==='choose')E.lock(s,...E.aiChoice(s));else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='kalistel')E.acceptAttack(s);else if(s.phase==='defense')E.rollDefense(s);
          else if(s.phase==='result'){if(s.match.events.length>5)ongoing??=E.clone(s);E.next(s);}else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
          else {const k={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];E['grant'+k](s,E['ai'+k+'Choice'](s));}
        }
        E.assertState(s);over=s;if(E.matchStats(s).units.some(u=>u.assists>0))break;
      }
      if(example)over=E.restoreGame(example);
      const old=E.clone(over);old.matchId='match-'+crypto.randomUUID();delete old.match.ratingVersion;
      for(const e of old.match.events)delete e.sources;
      for(const p of old.players)for(const u of [...p.board.filter(Boolean),...p.reserve,...p.dead])delete u.traitSources;
      for(const d of [old.duel,old.lastDuel])if(d)delete d.nativeSources;
      E.assertState(old);const previous=over.match.ratingVersion===3?E.clone(over):null;
      if(previous){previous.match.ratingVersion=2;previous.matchId='match-'+crypto.randomUUID();E.assertState(previous);}
      return {over,ongoing,old,previous,summary:E.matchStats(over),legacy:E.matchStats(old),previousSummary:previous?E.matchStats(previous):null,mvp:KalistarTrophies.leaders(E.matchStats(over),'rating')[0]};
    },example);
    assert.equal(fixtures.summary.ratingVersion,example?.match.ratingVersion||3);assert.equal(fixtures.legacy.ratingVersion,1);assert(fixtures.summary.units.some(u=>u.assists>0));
    if(fixtures.summary.ratingVersion===3){
      assert(fixtures.summary.units.some(u=>u.defensiveAssists>0));
      assert(fixtures.summary.units.some(u=>u.attack>u.valuedAttack||u.defense>u.valuedDefense));
    }
    const persistence=await page.evaluate(async f=>{
      const db=KALISTAR_DB;await db.saveGame(f.over);await db.saveGame(f.old);if(f.previous)await db.saveGame(f.previous);const count=db.counts();
      const backup=await db.exportBackup();await db.importBackup(backup);await db.importBackup(backup);
      const modern=db.match(f.over.matchId),old=db.match(f.old.matchId),mvp=f.mvp;
      const career=db.career(mvp.cardId,mvp.instanceId);const bad=structuredClone(backup),event=bad.matches.find(m=>m.id===f.over.matchId).state.match.events.find(e=>Object.keys(e.sources||{}).length);
      let forgedRejected=false;
      if(event){Object.values(event.sources)[0].donor='1-9';if(Object.values(event.sources)[0].recipient[0]==='1')Object.values(event.sources)[0].donor='0-9';try{await db.importBackup(bad);}catch{forgedRejected=true;}}
      return {before:count,after:db.counts(),modern:modern.summary,old:old.summary,previous:f.previous?db.match(f.previous.matchId).summary:null,career,forgedRejected,legacyMvp:KalistarTrophies.awards(old.summary),modernMvp:KalistarTrophies.awards(modern.summary)};
    },fixtures);
    assert.deepEqual(persistence.before,persistence.after);assert.deepEqual(persistence.modern,fixtures.summary);assert.deepEqual(persistence.old,fixtures.legacy);
    assert(persistence.forgedRejected);assert.equal(persistence.career.ratingVersions[1],1);assert.equal(persistence.career.ratingVersions[2],1);
    if(fixtures.previous){assert.equal(persistence.career.ratingVersions[3],1);assert.deepEqual(persistence.previous,fixtures.previousSummary);}
    checks.push({name:'archive/import',passed:true,modernMvp:persistence.modernMvp,legacyMvp:persistence.legacyMvp,versions:persistence.career.ratingVersions});
    if(fixtures.previous){
      const recomputed=await page.evaluate(async f=>{
        const db=KALISTAR_DB,backup=await db.exportBackup(),proposed=backup.matches.find(m=>m.id===f.over.matchId);
        for(const u of proposed.summary.units){u.valuedAttack=999999;u.valuedDefense=999999;u.defensiveAssists=99;u.rating=999;}
        for(const r of backup.results.filter(r=>r.matchId===f.over.matchId)){r.valuedAttack=999999;r.defensiveAssists=99;r.rating=999;}
        await db.importBackup(backup);return db.match(f.over.matchId).summary;
      },fixtures);
      assert.deepEqual(recomputed,fixtures.summary);checks.push({name:'index3/import-derives-not-trusts-proposed-ratings',passed:true});
    }
    const load=async s=>{
      if(await page.locator('#match-dialog[open]').count())await page.locator('#match-dialog [data-action=close]').first().click();
      await page.evaluate(s=>localStorage.setItem('kalistar.v4.game',JSON.stringify(s)),s);await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    };
    const report=async()=>{await page.evaluate(()=>document.querySelector('[data-action=match-stats]').click());await page.locator('#match-tab-awards').click();};
    for(const [name,width,height] of [['desktop',1440,1000],['wide',1920,1080],['razr',412,1007],['compact',320,568],['landscape',844,390]]){
      await page.setViewportSize({width,height});await load(fixtures.over);await report();
      const detail=page.locator('.match-mvp .match-index-detail');await detail.locator('summary').click();
      assert.equal(await detail.getAttribute('data-index-unit'),fixtures.mvp.uid);
      for(const [key,value] of Object.entries(fixtures.mvp.ratingBreakdown))assert.equal((await detail.locator('[data-index-part='+key+'] dd').innerText()).replace(/\s/g,''),'+'+value);
      if(fixtures.previous)assert((await detail.locator('[data-index-part=attack] dt').innerText()).includes('valoris'));
      await page.waitForFunction(()=>[...document.querySelectorAll('.golden-portraits img')].every(i=>i.complete&&i.naturalWidth>0));
      const bounds=await detail.locator('.match-index-points').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);assert(bounds.y>=0);
      await page.screenshot({path:path.join(out,name+'-mvp.png'),fullPage:false});
      await page.locator('#match-tab-lineup').click();await page.locator('[data-action=stats-group][data-id=extras]').click();await page.locator('[data-action=stats-sort][data-id=assists]').click();
      assert(await page.locator('[data-stat=assists]').count());const best=await page.locator('[data-stat=assists]').first().getAttribute('data-value');assert.equal(Number(best),Math.max(...fixtures.summary.units.map(u=>u.assists)));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.screenshot({path:path.join(out,name+'-assists.png'),fullPage:false});
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));assert.deepEqual(saved,fixtures.over);
      checks.push({name,passed:true,breakdown:bounds,assists:Number(best)});
    }
    await page.locator('#match-dialog [data-action=close]').first().click();
    await page.setViewportSize({width:1440,height:1000});
    await page.evaluate(()=>document.querySelector('[data-view=statistics]').click());
    await page.locator('[data-sheet-field=scope]').selectOption('all');
    await page.locator('[data-sheet-field=grouping]').selectOption('version');
    await page.locator('[data-sheet-action=group][data-id=support]').click();
    const aggregate=await page.evaluate(id=>KalistarStatistics.rows(KALISTAR_DATA,KALISTAR_DB,{...KalistarStatistics.defaults,scope:'all',grouping:'version',group:'support'}).find(r=>r.id===id),fixtures.mvp.cardId);
    const row=page.locator('[data-sheet-row="'+fixtures.mvp.cardId+'"]');
    for(const key of ['assists','cloversConsumedByRecipients','reraisesConsumedByRecipients']){
      const expected=aggregate[key]/(aggregate.ratingVersions[2]+aggregate.ratingVersions[3]);
      assert.equal(await row.locator('[data-metric='+key+']').innerText(),expected.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1}));
      assert((await row.locator('[data-metric='+key+']').getAttribute('title')).includes('historiques non renseignes'));
    }
    await page.setViewportSize({width:1440,height:1000});await row.locator('[data-sheet-action=detail]').click();
    assert(await page.locator('#detail-dialog [data-career-stat=assists]').count());
    const ownedCareer=await page.evaluate(id=>KALISTAR_DB.registry.career(KalistarOwnership.PARIS,id),fixtures.mvp.cardId);
    assert.equal(Number((await page.locator('#detail-dialog [data-career-total=assists]').innerText()).replace('-','0')),ownedCareer.assists);
    assert.equal(await page.locator('#detail-dialog .career-index-versions').count(),ownedCareer.ratingVersions[1]>0||ownedCareer.ratingVersions[2]>0?1:0);
    await page.locator('#detail-dialog [data-action=close]').click();
    checks.push({name:'statistics/career/mixed-means',passed:true,versions:aggregate.ratingVersions});
    if(fixtures.previous){
      const defensive=await page.evaluate(()=>KalistarStatistics.groups.support.find(m=>m.key==='defensiveAssists'));
      assert.equal(await row.locator('[data-metric=defensiveAssists]').innerText(),(aggregate.defensiveAssists/aggregate.ratingVersions[3]).toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1}));
      assert(defensive);checks.push({name:'index3/defensive-assists/mixed-means',passed:true});
    }
    await page.evaluate(()=>document.querySelector('[data-view=arena]').click());
    if(fixtures.previous){
      await load(fixtures.previous);await report();assert((await page.locator('.match-index-version').innerText()).includes('Indice 2 historique'));
      await page.locator('#match-tab-lineup').click();await page.locator('[data-action=stats-group][data-id=extras]').click();
      for(const key of ['valuedAttack','valuedDefense','defensiveAssists'])assert((await page.locator('[data-stat='+key+']').allTextContents()).every(t=>t==='\u2014'));
      checks.push({name:'index2/no-fabricated-valued-power-or-defensive-assist',passed:true});
    }
    await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:412,height:1007});await load(fixtures.old);await report();
    assert(await page.locator('.match-index-version').isVisible());await page.locator('.match-mvp .match-index-detail summary').click();assert((await page.locator('.match-mvp .match-index-points').innerText()).includes('historique'));
    await page.screenshot({path:path.join(out,'legacy-razr.png')});
    await page.locator('#match-tab-lineup').click();await page.locator('[data-action=stats-group][data-id=extras]').click();assert((await page.locator('[data-stat=assists]').allTextContents()).every(t=>t==='\u2014'));
    for(const key of ['assists','cloversConsumedByRecipients','reraisesConsumedByRecipients'])assert((await page.locator('[data-stat='+key+']').evaluateAll(ns=>ns.map(n=>n.title))).every(t=>t.includes('Non renseigne')));
    checks.push({name:'historical/reduced-motion',passed:true});
    await load(fixtures.ongoing);await page.evaluate(()=>document.querySelector('[data-action=match-stats]').click());await page.locator('#match-tab-awards').click();assert((await page.locator('.golden-provisional').innerText()).includes('provisoire'));
    const current=await page.evaluate(()=>KalistarEngine.createEngine(KALISTAR_DATA).matchStats(JSON.parse(localStorage.getItem('kalistar.v4.game'))));assert(current.units.every(u=>u.victory===0));
    checks.push({name:'ongoing',passed:true});
    const historical=await page.evaluate(async()=>{
      const T=KalistarTrophies,oldData=structuredClone(KALISTAR_DATA),jill=oldData.cards.find(c=>c.id==='49700101');
      jill.atk[5]='retry';const E=KalistarEngine.createEngine(oldData),ids=oldData.decks.player.slice();
      ids[ids.findIndex(id=>E.byId[id].role===2)]=jill.id;
      const s=E.newGame(ids,ids,{seed:'INDEX-HISTORICAL-JILL',mode:'local',kalistel:true});delete s.match.ratingVersion;
      E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
      const slot=s.players[0].board.findIndex(u=>u.cardId===jill.id);E.lock(s,slot,0);E.rollAttack(s,6);E.useKalistel(s,1);E.grantClover(s,s.duel.attacker);
      s.phase='over';s.winner=0;E.assertState(s);
      window.KalistarTrophies={...T,version:2};let old;
      try{old=await KalistarLocalDB.open(oldData,{name:'kalistar-v4-cards-index-historical-faces'});await old.saveGame(s);}
      finally{window.KalistarTrophies=T;}
      const before=old.match(s.matchId),backup=await old.exportBackup(),awards=T.awards(before.summary);old.close();
      const migrated=await KalistarLocalDB.open(KALISTAR_DATA,{name:'kalistar-v4-cards-index-historical-faces'});
      const after=migrated.match(s.matchId);await migrated.importBackup(backup);await migrated.importBackup(backup);
      const rows=migrated.inspect('results').filter(r=>r.matchId===s.matchId);
      const rendered=KalistarMatchReport.render(after.state,{profiles:after.profiles,arenas:after.arenas,rules:after.rules,tab:'awards'});
      const restored=await KalistarLocalDB.open(KALISTAR_DATA,{name:'kalistar-v4-cards-index-historical-import'});await restored.importBackup(backup);
      const imported=restored.match(s.matchId);migrated.close();restored.close();
      return {stateUnchanged:JSON.stringify(before.state)===JSON.stringify(after.state),before:before.summary,after:after.summary,imported:imported.summary,rows,awards,rendered:rendered.includes('Indice historique')};
    });
    assert(historical.stateUnchanged&&historical.rendered);assert.deepEqual(historical.before,historical.after);assert.deepEqual(historical.before,historical.imported);
    for(const row of historical.rows){assert.equal(row.trophyVersion,3);assert.deepEqual(row.trophies,historical.awards[row.uid]||[]);}
    checks.push({name:'historical-face-migration/import/report',passed:true});
    await page.locator('#match-dialog [data-action=close]').first().click();
    await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>document.querySelector('[data-view=collection]').click());
    await page.evaluate(()=>{
      const registry=KALISTAR_DB.registry,id=document.querySelector('.cb-card').dataset.id;
      window.indexCareerRegistry=registry;
      const stats={games:10,wins:6,losses:3,draws:1,kills:15,holds:14,attack:4040,defense:3479,support:8,debuff:150,reraises:3,mvp:3,rating:360,assists:3,cloversConsumedByRecipients:4,reraisesConsumedByRecipients:2,ratingVersions:{1:4,2:6},history:[]};
      KALISTAR_DB.registry={...registry,career:(u,card,copy)=>card===id?stats:registry.career(u,card,copy)};
    });
    await page.locator('.cb-card').first().click();await page.locator('[data-binder-action=tab][data-id=career]').click();
    for(const [name,width,height] of [['desktop',1440,1000],['razr',412,1007],['compact',320,568],['landscape',844,390]]){
      await page.setViewportSize({width,height});
      if(width<700||height<500)await page.locator('[data-binder-action=pane][data-id=notes]').click();
      const panel=page.locator('.cb-read-content'),metrics=page.locator('.cb-career .career-statistics');
      assert.equal(await metrics.locator('[data-career-stat]').count(),12);
      if(name==='desktop'){
        const bounds=await panel.boundingBox();
        for(const r of await metrics.locator('[data-career-stat]').all()){
          const b=await r.boundingBox();assert(b.y+b.height<=bounds.y+bounds.height+1,'all desktop metrics fit without scrolling');
        }
        for(const key of ['attack','defense'])assert(await metrics.locator('[data-career-total='+key+']').evaluate(n=>n.getBoundingClientRect().height<45),'four-digit totals stay on one line');
      }
      for(const key of ['assists','cloversConsumedByRecipients','reraisesConsumedByRecipients','mvp']){
        await metrics.locator('[data-career-stat='+key+']').scrollIntoViewIfNeeded();
        const b=await metrics.locator('[data-career-stat='+key+']').boundingBox(),p=await panel.boundingBox();assert(b.y+b.height<=p.y+p.height+1,key+' stays reachable');
      }
      assert.equal(await metrics.locator('[data-career-average=assists]').innerText(),'0,5');
      assert(await metrics.evaluate(n=>n.scrollWidth<=n.clientWidth+1));
      await page.screenshot({path:path.join(out,name+'-career.png')});
    }
    await page.evaluate(()=>{KALISTAR_DB.registry=window.indexCareerRegistry;delete window.indexCareerRegistry;});
    checks.push({name:'career-layout/desktop/mobile/legacy-mix',passed:true});assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,formula:fixtures.mvp.ratingBreakdown,mvp:fixtures.mvp.uid,passed:true},null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length,errors}));
    await context.close();
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
