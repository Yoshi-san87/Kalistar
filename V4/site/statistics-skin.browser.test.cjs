'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__statistics_qa__.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(__dirname,'../deploy/dist');
const base=process.env.KALISTAR_URL||(built?'https://statistics-qa.invalid/Kalistar':'http://127.0.0.1:4304');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-10-statistics/qa/local');
async function main(){
  fs.mkdirSync(out,{recursive:true});
  const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',acceptDownloads:true});
    const serve=route=>{
      let relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,'');if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),relative);
      const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    };
    if(built)await context.route(base+'/**',serve);
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-statistics-skin-qa'):open.call(this,n+'-statistics-skin-qa',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(base+'/jeu/#statistics');await page.waitForFunction(()=>window.KALISTAR_READY);
    const before=await page.evaluate(async()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA);
      for(let seed=0;seed<8;seed++){
        const s=E.newGame(KALISTAR_DATA.decks.player,KALISTAR_DATA.decks.enemy,{seed:'STATISTICS-SKIN-'+seed,mode:'local',turnOrder:'ABBA'});
        E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);E.rollInitiative(s,[6,1]);
        for(let i=0;i<5000&&s.phase!=='over';i++){
          if(s.phase==='initiative')E.rollInitiative(s);else if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
          else if(s.phase==='attack')E.rollAttack(s);else if(s.phase==='kalistel')E.acceptAttack(s);else if(s.phase==='defense')E.rollDefense(s);
          else if(s.phase==='result')E.next(s);else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
          else{const k={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];E['grant'+k](s,E['ai'+k+'Choice'](s));}
        }
        E.assertState(s);if(s.phase!=='over')throw Error('QA match did not finish');await KALISTAR_DB.saveGame(s);
      }
      return {matches:JSON.stringify(KALISTAR_DB.matches()),counts:KALISTAR_DB.counts()};
    });
    const field=key=>page.locator('[data-sheet-field='+key+']');
    const action=(key,id)=>page.locator('[data-sheet-action='+key+']'+(id?'[data-id='+id+']':''));
    const filters=page.locator('.sheet-filters');
    for(const [name,width,height,motion] of [['desktop',1440,1000,'no-preference'],['wide',1920,1080,'no-preference'],['tablet',800,1000,'no-preference'],['razr',412,1007,'no-preference'],['compact',320,568,'no-preference'],['landscape',844,390,'no-preference'],['reduced',390,844,'reduce']]){
      await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:motion});await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
      if(!await filters.evaluate(n=>n.open))await filters.locator('summary').click();
      await field('scope').selectOption('all');await field('minimum').selectOption('1');
      await page.screenshot({path:path.join(out,name+'-filters.png')});
      const filterBox=await page.locator('.sheet-filter-fields').boundingBox();assert(filterBox.x>=0&&filterBox.x+filterBox.width<=width+1,name+' filter width');
      if(width<700||height<501){await action('close-filters').click();assert.equal(await filters.evaluate(n=>n.open),false);}
      await field('sort').selectOption('kills');
      assert.equal(await page.locator('th[aria-sort=descending] button').getAttribute('data-id'),'kills');
      const firstValue=Number((await page.locator('[data-metric=kills]').first().innerText()).replace(',','.'));
      await action('direction').click();assert.equal(await page.locator('th[aria-sort=ascending] button').getAttribute('data-id'),'kills');
      assert(firstValue>=Number((await page.locator('[data-metric=kills]').first().innerText()).replace(',','.')));
      await action('mode','total').click();await action('direction').click();
      const expected=await page.evaluate(()=>KalistarStatistics.sorted(KalistarStatistics.rows(KALISTAR_DATA,KALISTAR_DB,{...KalistarStatistics.defaults,scope:'all',minimum:1,mode:'total'}),{...KalistarStatistics.defaults,mode:'total',sort:'kills'})[0].kills);
      assert.equal(Number(await page.locator('[data-metric=kills]').first().innerText()),expected);
      await page.waitForFunction(()=>[...document.querySelectorAll('.sheet-identity img')].filter(n=>n.getBoundingClientRect().top<innerHeight).every(n=>n.complete&&n.naturalWidth>0));
      const geometry=await page.evaluate(()=>{
        const table=document.querySelector('.sheet-scroll').getBoundingClientRect(),footer=document.querySelector('.sheet-footer').getBoundingClientRect();
        return {overflow:document.documentElement.scrollWidth>innerWidth+1,height:table.height,bottom:footer.bottom,tableWidth:table.width,viewport:innerWidth};
      });
      assert(!geometry.overflow,name+' viewport overflow');assert(geometry.height>=100,name+' table height '+geometry.height);assert(geometry.bottom<=height+1,name+' footer');
      if(width>=1200)assert(geometry.tableWidth>width*.94,'full width on PC');
      await page.screenshot({path:path.join(out,name+'-performance.png')});
      await page.locator('.sheet-scroll').evaluate(n=>{n.scrollLeft=n.scrollWidth;});
      const identity=await page.locator('tbody .sheet-identity').first().boundingBox(),scrollBox=await page.locator('.sheet-scroll').boundingBox();assert(identity.x>=scrollBox.x&&identity.x<=scrollBox.x+43,name+' fixed identity');
      await action('group','support').click();assert.equal(await field('sort').inputValue(),'support');assert.equal(await page.locator('.sheet-scroll').evaluate(n=>n.scrollLeft),0);
      await action('group','trophies').click();assert((await page.locator('thead').innerText()).includes('Golden Crystal'));
      await page.screenshot({path:path.join(out,name+'-trophies.png')});
      const download=page.waitForEvent('download');await action('export').click();const file=await download;
      const csv=fs.readFileSync(await file.path(),'utf8');assert(csv.includes('Golden Crystal'));assert(csv.includes('Matchs indice 3'));
      await field('query').fill('zz-no-character-zz');await page.locator('.sheet-empty').waitFor({state:'visible'});assert(await action('export').isDisabled());
      await page.screenshot({path:path.join(out,name+'-empty.png')});
      await field('query').fill('MOMO');assert(await page.locator('tbody tr').count());
      await action('detail').first().click();await page.locator('#detail-dialog[open]').waitFor();await page.keyboard.press('Escape');
      if(!await filters.evaluate(n=>n.open))await filters.locator('summary').click();
      await field('collab').focus();await page.keyboard.press('Escape');assert.equal(await filters.evaluate(n=>n.open),false);assert(await filters.locator('summary').evaluate(n=>n===document.activeElement));
      await field('query').fill('');
      const saved=await page.evaluate(()=>({matches:JSON.stringify(KALISTAR_DB.matches()),counts:KALISTAR_DB.counts()}));assert.deepEqual(saved,before,'UI preserves archives and collection');
      checks.push({name,...geometry,firstValue,csv:true,filters:true,detail:true,unchanged:true});
    }
    const touch=await browser.newContext({viewport:{width:412,height:1007},hasTouch:true,isMobile:true,deviceScaleFactor:1,serviceWorkers:'block'});
    if(built)await touch.route(base+'/**',serve);
    const phone=await touch.newPage();phone.on('pageerror',e=>errors.push(e.message));
    await phone.goto(base+'/jeu/#statistics');await phone.waitForFunction(()=>window.KALISTAR_READY);
    assert.equal(await phone.locator('[data-leader=true]').count(),0,'no invented leader without games');
    await phone.evaluate(async matches=>{for(const m of matches)await KALISTAR_DB.saveGame(m.state);},JSON.parse(before.matches));
    await phone.reload();await phone.waitForFunction(()=>window.KALISTAR_READY);
    await phone.locator('.sheet-filters summary').tap();await phone.locator('[data-sheet-field=minimum]').selectOption('1');
    await phone.locator('[data-sheet-action=close-filters]').tap();
    await phone.locator('[data-sheet-field=sort]').selectOption('kills');
    assert.equal(await phone.locator('tbody tr').first().locator('[data-metric]').first().getAttribute('data-metric'),'kills');
    await phone.locator('.sheet-filters summary').tap();await phone.locator('.sheet-heading h1').tap();
    assert.equal(await phone.locator('.sheet-filters').evaluate(n=>n.open),false,'outside tap closes filter');
    await phone.locator('[data-sheet-action=mode][data-id=total]').tap();
    await phone.screenshot({path:path.join(out,'touch-performance.png')});
    await phone.setViewportSize({width:1440,height:1000});
    await phone.waitForFunction(()=>document.querySelector('tbody [data-metric]')?.dataset.metric==='games');
    await phone.setViewportSize({width:412,height:1007});
    await phone.waitForFunction(()=>document.querySelector('tbody [data-metric]')?.dataset.metric==='kills');
    checks.push({name:'touch-and-resize',nativeFilters:true,selectedMetricVisible:true,noFalseLeader:true});
    await touch.close();
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify(checks,null,2));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
