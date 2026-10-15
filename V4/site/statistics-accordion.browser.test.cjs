'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__statistics_accordion_qa__.cjs'));
const ROOT=path.resolve(__dirname,'../..'),base='https://statistics-accordion-qa.invalid';
const out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-11-razr-experience/qa/statistics'));
const dist=process.env.KALISTAR_DIST&&path.resolve(process.env.KALISTAR_DIST);
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8').replace(/^\uFEFF/,''));
const protectedFiles=['V4/site/app.js','V4/site/index.html','V4/site/boot.js','V4/site/engine.js','V4/site/performance-index.js','V4/site/local-db.js','V4/atelier/data/references.json','V4/donnees/catalogue.json'];
const {createHash}=require('node:crypto');
const hashes=()=>protectedFiles.map(f=>[f,createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex')]);
async function main(){
  const beforeFiles=hashes(),references=read('V4/atelier/data/references.json'),publications=read('V4/donnees/catalogue.json');
  const data=await require('../atelier/game-catalog.cjs').buildCatalog({published:publications.cards.filter(c=>c.kind==='created')});
  const media=new Map(references.cards.map(c=>['/media/reference/'+c.key+'.png',path.join(ROOT,c.png)]));
  for(const c of publications.cards.filter(c=>c.kind==='created'))media.set(c.pngUrl,path.join(ROOT,c.png));
  const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
  const errors=[],checks=[];
  const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:412,height:1007},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block',acceptDownloads:false});
    const serve=async route=>{
      const url=new URL(route.request().url());
      if(dist){
        const relative=decodeURIComponent(url.pathname).replace(/^\//,''),file=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative);
        assert(file.startsWith(dist+path.sep),'QA serves built files only');
        if(!fs.existsSync(file)){errors.push('missing '+url.pathname);return route.fulfill({status:404,body:'Not found'});}
        return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
      }
      if(url.pathname==='/api/game/catalogue')return route.fulfill({json:data});
      let file=media.get(url.pathname);
      if(!file){
        const relative=decodeURIComponent(url.pathname).replace(/^\/jeu\//,'')||'index.html';
        file=path.resolve(__dirname,relative);
        assert(file.startsWith(__dirname+path.sep),'QA serves site files only');
        if(!fs.existsSync(file)&&relative.startsWith('assets/'))file=path.resolve(ROOT,'V3/site',relative);
        if(relative.startsWith('shared/'))file=path.resolve(ROOT,'V3/assets',relative.slice(7));
      }
      if(!fs.existsSync(file)){errors.push('missing '+url.pathname);return route.fulfill({status:404,body:'Not found'});}
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    };
    await context.route(base+'/**',serve);
    const init=()=>{
      const open=IDBFactory.prototype.open;
      IDBFactory.prototype.open=function(name,version){return version===undefined?open.call(this,name+'-statistics-accordion-qa'):open.call(this,name+'-statistics-accordion-qa',version);};
      // Capture the real view API, keeping the application's original detail callback.
      let api;
      Object.defineProperty(window,'KalistarStatistics',{configurable:true,get:()=>api,set:value=>{
        const create=value.create;value.create=options=>{const view=create(options);window.qaStatisticsSheet=view;return view;};api=value;
      }});
    };
    await context.addInitScript(init);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/jeu/#statistics');await page.waitForFunction(()=>window.KALISTAR_READY);
    const field=key=>page.locator('[data-sheet-field="'+key+'"]');
    const action=(key,id)=>page.locator('[data-sheet-action="'+key+'"]'+(id?'[data-id="'+id+'"]':''));
    const triggers=()=>action('accordion'),panel=()=>page.locator('.sheet-detail-row:not([hidden]) .sheet-accordion');
    const filters=page.locator('.sheet-filters');
    const stored=()=>page.evaluate(async()=>{const backup=await KALISTAR_DB.exportBackup();delete backup.exportedAt;return {matches:JSON.stringify(KALISTAR_DB.matches()),results:JSON.stringify(KALISTAR_DB.inspect('results')),backup:JSON.stringify(backup)};});
    const capture=async name=>{fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,name+'.png'),scale:'css'});};
    async function setFilter(key,value){
      if(!await filters.evaluate(n=>n.open))await filters.locator('summary').click();
      await field(key).selectOption(value);
      if(await action('close-filters').isVisible())await action('close-filters').click();
    }
    async function assertValues(mode='average'){
      const key=await page.locator('[aria-expanded=true][data-sheet-action=accordion]').getAttribute('data-id');
      const expected=await page.evaluate(({key,mode})=>{
        const S=KalistarStatistics,grouping=key.split(':')[0],id=key.slice(grouping.length+1);
        const row=S.rows(KALISTAR_DATA,KALISTAR_DB,{...S.defaults,scope:'all',minimum:1,grouping}).find(r=>r.id===id);
        const format=c=>{const n=S.value(row,c,mode);return n===null?'\u2014':n.toLocaleString('fr-FR',{minimumFractionDigits:c.key==='winRate'||mode==='average'&&c.average?1:0,maximumFractionDigits:c.key==='winRate'||mode==='average'&&c.average?1:0});};
        return {metrics:Object.fromEntries([...S.groups.performance,...S.groups.support].map(c=>[c.key,format(c)])),trophies:row.trophies,versions:row.ratingVersions,cardId:row.card.id};
      },{key,mode});
      for(const [metric,text] of Object.entries(expected.metrics))assert.equal(await panel().locator('[data-detail-metric="'+metric+'"] dd').innerText(),text,metric+' '+mode);
      for(const [id,n] of Object.entries(expected.trophies))assert.equal(await panel().locator('[data-detail-trophy="'+id+'"] b').innerText(),String(n));
      for(const [v,n] of Object.entries(expected.versions))assert.equal(await panel().locator('[data-rating-version="'+v+'"] dd').innerText(),n+' MJ');
      assert.equal(await panel().locator('[data-sheet-action=detail]').getAttribute('data-id'),expected.cardId);
    }
    // An empty career has no invented winner or trophy, but remains inspectable.
    assert.equal(await page.locator('[data-leader=true]').count(),0);
    await triggers().first().tap();assert.equal(await panel().count(),1);
    assert.equal(await panel().locator('[data-detail-trophy] b').evaluateAll(ns=>ns.reduce((s,n)=>s+Number(n.textContent),0)),0);
    assert((await panel().innerText()).includes('Aucune rencontre'));
    await page.keyboard.press('Escape');assert.equal(await panel().count(),0);
    const fixtureCount=await page.evaluate(async()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),finished=[];
      for(let seed=0;seed<8;seed++){
        const s=KALISTAR_DB.registry.bindGame(KALISTAR_ACTIVE_USER,E.newGame(KALISTAR_DATA.decks.player,KALISTAR_DATA.decks.enemy,{seed:'STATISTICS-ACCORDION-'+seed,mode:'local',turnOrder:'ABBA'}));
        E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);E.rollInitiative(s,[6,1]);
        for(let i=0;i<5000&&s.phase!=='over';i++){
          if(s.phase==='initiative')E.rollInitiative(s);else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
          else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='kalistel')E.acceptAttack(s);else if(s.phase==='defense')E.rollDefense(s);
          else if(s.phase==='result')E.next(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
          else{const k={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];E['grant'+k](s,E['ai'+k+'Choice'](s));}
        }
        E.assertState(s);if(s.phase!=='over')throw Error('QA match did not finish');await KALISTAR_DB.saveGame(s);finished.push(s);
      }
      // The legacy fixtures retain real events, with only their historical provenance removed.
      for(const version of [1,2]){
        const s=E.clone(finished[0]);s.matchId='match-'+crypto.randomUUID();s.match.ratingVersion=version;
        if(version===1){
          delete s.match.ratingVersion;for(const e of s.match.events)delete e.sources;
          for(const p of s.players)for(const u of [...p.board.filter(Boolean),...p.reserve,...p.dead])delete u.traitSources;
          for(const d of [s.duel,s.lastDuel])if(d)delete d.nativeSources;
        }
        E.assertState(s);await KALISTAR_DB.saveGame(s);
      }
      window.qaModern=finished[0];return KALISTAR_DB.matches().length;
    });
    assert.equal(fixtureCount,10);
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    await setFilter('scope','all');await setFilter('minimum','1');
    const before=await stored();
    for(const [name,width,height,motion] of [['razr',412,1007,'no-preference'],['compact',320,568,'no-preference'],['landscape',844,390,'no-preference'],['razr-landscape',1007,412,'reduce'],['reduced',412,1007,'reduce']]){
      await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:motion});
      await action('mode','average').click();await action('group','performance').click();
      await triggers().first().tap();assert.equal(await panel().count(),1);
      const key=await triggers().first().getAttribute('data-id');
      const openTrigger=()=>page.locator('[data-sheet-action=accordion][data-id="'+key+'"]');
      const control=await openTrigger().getAttribute('aria-controls');
      assert.equal(await panel().getAttribute('id'),control);assert.equal(await panel().getAttribute('aria-labelledby'),control+'-toggle');
      await assertValues();
      await capture(name+'-open');
      await panel().locator('.sheet-detail-metrics h3').first().scrollIntoViewIfNeeded();await capture(name+'-performance');
      await panel().locator('.sheet-detail-metrics h3').last().scrollIntoViewIfNeeded();await capture(name+'-support');
      const geometry=await panel().evaluate(n=>{
        const r=n.getBoundingClientRect(),scroll=n.closest('.sheet-scroll').getBoundingClientRect();
        return {x:r.x,right:r.right,width:r.width,scrollX:scroll.x,scrollRight:scroll.right,overflow:document.documentElement.scrollWidth>innerWidth+1,nestedScroll:n.scrollHeight>n.clientHeight+1};
      });
      assert(!geometry.overflow&&!geometry.nestedScroll,name+' no overflow/nested scroll');
      assert(Math.abs(geometry.x-geometry.scrollX)<=1&&Math.abs(geometry.right-geometry.scrollRight)<=1,name+' viewport-width accordion '+JSON.stringify(geometry));
      // Every indicator and trophy agrees with existing totals/means, across all table tabs.
      await action('mode','total').click();await assertValues('total');assert.equal(await openTrigger().getAttribute('aria-expanded'),'true');
      await field('sort').selectOption('kills');assert.equal(await openTrigger().getAttribute('aria-expanded'),'true');
      await action('direction').click();assert.equal(await openTrigger().getAttribute('aria-expanded'),'true');
      await page.evaluate(()=>qaStatisticsSheet.refresh());assert.equal(await openTrigger().getAttribute('aria-expanded'),'true');
      await openTrigger().focus();await page.evaluate(()=>qaStatisticsSheet.refresh());assert(await openTrigger().evaluate(n=>n===document.activeElement));
      const legibility=await panel().evaluate(n=>({
        clipped:[...n.querySelectorAll('dt,dd,h2,h3,p,li span,button')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),
        transitions:[...n.querySelectorAll('*')].some(e=>getComputedStyle(e).transitionDuration.split(',').some(t=>parseFloat(t)>0))
      }));
      assert.deepEqual(legibility.clipped,[],name+' detail text fits');
      if(motion==='reduce')assert(!legibility.transitions,name+' Reduced Motion has no transition');
      const row=page.locator('[data-sheet-row]').filter({has:openTrigger()});
      await row.locator('[data-metric]').first().tap();assert.equal(await panel().count(),0,'metric tap closes');
      await openTrigger().focus();await page.keyboard.press('Enter');assert.equal(await panel().count(),1,'Enter opens');
      await page.keyboard.press('Space');assert.equal(await panel().count(),0,'Space closes');
      await page.keyboard.press('Space');assert.equal(await panel().count(),1);
      // Opening a second character closes the previous one without replacing the table.
      const otherKey=await triggers().evaluateAll((ns,key)=>ns.find(n=>n.dataset.id!==key).dataset.id,key);
      await page.locator('[data-sheet-action=accordion][data-id="'+otherKey+'"]').tap();assert.equal(await panel().count(),1);assert.equal(await openTrigger().getAttribute('aria-expanded'),'false');
      await openTrigger().tap();assert.equal(await panel().count(),1);
      await action('group','support').click();assert.equal(await openTrigger().getAttribute('aria-expanded'),'true');await assertValues('total');
      const csvBefore=await page.evaluate(()=>KalistarStatistics.csv(KalistarStatistics.sorted(KalistarStatistics.rows(KALISTAR_DATA,KALISTAR_DB,{...KalistarStatistics.defaults,scope:'all',minimum:1}),{...KalistarStatistics.defaults,group:'support',mode:'total',sort:'support'}),{...KalistarStatistics.defaults,group:'support',mode:'total'}));
      await page.evaluate(()=>{window.qaOriginalURL=URL.createObjectURL;URL.createObjectURL=function(blob){if(blob.type==='text/csv;charset=utf-8')window.qaCSVBlob=blob;return qaOriginalURL.call(this,blob);};});
      await action('export').click();
      const exported=await page.evaluate(async()=>{const csv=await qaCSVBlob.text();URL.createObjectURL=qaOriginalURL;return csv;});
      assert.equal(exported.replace(/^\uFEFF/,''),csvBefore.replace(/^\uFEFF/,''),'CSV unchanged');
      await action('group','trophies').click();assert.equal(await openTrigger().getAttribute('aria-expanded'),'true');
      await panel().locator('.trophy-image').evaluateAll(ns=>Promise.all(ns.map(n=>n.decode())));
      assert.equal(await panel().locator('.trophy-image').count(),5);await capture(name+'-trophies');
      await panel().locator('.sheet-detail-provenance').scrollIntoViewIfNeeded();await capture(name+'-provenance');
      // Horizontal scrolling must never hide or enlarge the expanded content.
      await page.locator('.sheet-scroll').evaluate(n=>{n.scrollLeft=n.scrollWidth;});
      const edge=await panel().boundingBox(),scroll=await page.locator('.sheet-scroll').boundingBox();
      assert(Math.abs(edge.x-scroll.x)<1&&Math.abs(edge.width-scroll.width)<1,name+' horizontal pin');
      await capture(name+'-horizontal');
      await page.locator('.sheet-scroll').evaluate(n=>{n.scrollLeft=0;});
      await panel().locator('[data-sheet-action=detail]').tap();await page.locator('#detail-dialog[open]').waitFor();
      await page.keyboard.press('Escape');assert.equal(await panel().count(),1,'detail keeps accordion');
      await panel().locator('[data-sheet-action=collapse]').tap();assert.equal(await panel().count(),0);assert(await openTrigger().evaluate(n=>n===document.activeElement),'collapse restores focus');
      await openTrigger().tap();await field('query').fill('zz-excludes-open-row');assert.equal(await panel().count(),0);assert(await action('export').isDisabled());
      await field('query').fill('');assert.equal(await panel().count(),0,'excluded identity does not reopen');
      const lowParticipation=await page.locator('[data-sheet-row]').evaluateAll(ns=>ns.find(n=>Number(n.querySelector('[data-metric=games]').textContent)<10)?.dataset.sheetKey);
      assert(lowParticipation,'a reserve participant has fewer than ten games');
      await page.locator('[data-sheet-action=accordion][data-id="'+lowParticipation+'"]').tap();
      await setFilter('minimum','10');assert.equal(await panel().count(),0,'minimum filter excludes identity');await setFilter('minimum','1');
      await triggers().first().tap();await setFilter('grouping','version');assert.equal(await panel().count(),0,'version and character are different identities');
      await triggers().first().tap();await assertValues('total');await field('sort').selectOption('name');assert.equal(await panel().count(),1);
      await setFilter('grouping','character');assert.equal(await panel().count(),0);
      assert.deepEqual(await stored(),before,'UI does not alter matches, results or backup');
      checks.push({name,viewportWidth:width,viewportHeight:height,motion,...geometry,values:true,keyboard:true,sortRefresh:true,filters:true,csv:true,storageUnchanged:true});
    }
    const desktop=await browser.newContext({viewport:{width:1007,height:412},hasTouch:false,serviceWorkers:'block'});
    await desktop.route(base+'/**',serve);await desktop.addInitScript(init);
    const pc=await desktop.newPage();await pc.goto(base+'/jeu/#statistics');await pc.waitForFunction(()=>window.KALISTAR_READY);
    assert.equal(await pc.locator('[data-sheet-action=accordion]').count(),0,'fine-pointer PC keeps detail at 1007x412');
    await pc.setViewportSize({width:1440,height:1000});
    await pc.locator('[data-sheet-action=detail]').first().click();await pc.locator('#detail-dialog[open]').waitFor();await desktop.close();
    await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>!document.querySelector('[data-sheet-action=accordion]'));assert.equal(await triggers().count(),0);
    await action('detail').first().click();await page.locator('#detail-dialog[open]').waitFor();await page.keyboard.press('Escape');await capture('desktop-unchanged');
    await page.setViewportSize({width:412,height:1007});await triggers().first().tap();
    const resizeKey=await page.locator('[data-sheet-action=accordion][aria-expanded=true]').getAttribute('data-id');
    await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>!document.querySelector('[data-sheet-action=accordion]'));assert.equal(await panel().count(),0);
    await page.setViewportSize({width:412,height:1007});await page.waitForFunction(key=>document.querySelector('[data-sheet-action=accordion][aria-expanded=true]')?.dataset.id===key,resizeKey);
    assert.equal(await page.locator('[data-sheet-action=accordion][aria-expanded=true]').getAttribute('data-id'),resizeKey,'resize keeps identity');
    await page.evaluate(()=>qaStatisticsSheet.destroy());await page.keyboard.press('Escape');
    await page.evaluate(()=>qaStatisticsSheet.mount(document.getElementById('statistics-root')));assert.equal(await panel().count(),0,'destroy clears presentation state');
    assert.deepEqual(await stored(),before);assert.deepEqual(errors,[]);assert.deepEqual(hashes(),beforeFiles,'protected production files unchanged');
    console.log(JSON.stringify({passed:true,realMatches:fixtureCount,checks,desktopDetail:true,resize:true,teardown:true,errors,captures:out},null,2));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
