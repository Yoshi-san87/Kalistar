'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{DIST,inside}=require('../../deploy/build.cjs');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_gotham_completion.cjs'))('playwright');
const M=require('./model.cjs'),set=require('./set.json');
const {buildCatalog}=require('../../atelier/game-catalog.cjs');
const {runDatabaseScenarios}=require('../../site/catalogue-evolution.test.cjs');
const out=path.join(__dirname,process.env.KALISTAR_PAGES_URL?'public-browser-proof':'browser-proof');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
  const server=http.createServer((req,res)=>{try{
    const url=new URL(req.url,'http://localhost');assert(url.pathname.startsWith('/Kalistar/'));
    const rel=decodeURIComponent(url.pathname.slice('/Kalistar/'.length)),f=inside(DIST,rel.endsWith('/')?rel+'index.html':rel);
    res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));
  }catch{res.writeHead(404);res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
    const page=await context.newPage(),errors=[],failures=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
    const base=process.env.KALISTAR_PAGES_URL||'http://127.0.0.1:'+server.address().port+'/Kalistar/';
    const ready=()=>page.waitForFunction(()=>window.KALISTAR_READY);
    const images=()=>page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0));
    const fit=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
    await page.goto(base+'jeu/#collection');await ready();
    const data=await page.evaluate(()=>KALISTAR_DATA);
    assert.equal(data.cards.filter(c=>c.faction==='Batman').length,11);
    assert(data.cards.filter(c=>c.faction==='Batman').every(c=>c.element!=='NONE'));
    assert.equal(data.cards.filter(c=>c.faction==='XMEN').length,7);
    assert(!data.cards.some(c=>c.faction==='Gotham'));
    const prior=require('./before.json').catalogue.cards.filter(c=>c.kind==='created');
    const old=await buildCatalog({published:prior}),robin=JSON.parse(fs.readFileSync(path.join(__dirname,'cards/robin/profile.json'),'utf8'));
    const single=await buildCatalog({published:[...prior,{id:robin.id,profile:robin,pngUrl:'/media/created/'+robin.id+'.png'}]});
    const persistence=await page.evaluate(runDatabaseScenarios,{old,next:single,addedId:robin.id});
    const migration=await page.evaluate(async({old,next})=>{
      const name='kalistar-v4-cards-crossover-upgrade-'+crypto.randomUUID(),P=KalistarOwnership.PARIS;
      let db=await KalistarLocalDB.open(old,{name}),backup=await db.exportBackup();db.close();
      db=await KalistarLocalDB.open(next,{name});
      if(db.registry.owned(P).length!==next.cards.length)throw Error('Incomplete catalogue migration');
      await db.importBackup(backup);
      if(db.registry.owned(P).length!==next.cards.length)throw Error('Old restore lost new cards');
      db.close();db=await KalistarLocalDB.open(next,{name});
      const result={before:old.cards.length,after:db.registry.owned(P).length};db.close();return result;
    },{old,next:data});
    assert.equal(migration.after-migration.before,9);
    const screens=[];
    for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915],['narrow',320,740]]){
      await page.setViewportSize({width,height});
      for(const c of [...set.cards,...set.revisions]){
        const profile=data.cards.find(row=>row.id===c.id),scope=profile.faction==='XMEN'?'xmen':profile.faction==='Batman'?'batman':'witcher';
        await page.locator('.cb-collection-select select').selectOption(scope);
        await page.locator('[data-binder-field=search]').fill(c.id);
        await page.locator('.cb-card[data-id="'+c.id+'"]').click();await page.locator('.cb-reader').waitFor();
        const pane=page.locator('[data-binder-action=pane][data-id=visual]');if(await pane.isVisible())await pane.click();
        await images();
        await page.waitForFunction(()=>{const i=document.querySelector('.cb-hero-image');return i&&i.complete&&i.naturalWidth===797&&i.naturalHeight===1388;});
        assert(await fit(),name+' '+c.key);
        const shot=name+'-'+c.key+'.png';await page.screenshot({path:path.join(out,shot)});screens.push(shot);
        await page.locator('[data-binder-action=back]').click();
      }
      await page.locator('[data-binder-field=search]').fill('');
    }
    await page.locator('.cb-collection-select select').selectOption('witcher');
    await page.locator('[data-binder-field=search]').fill('GERALT DE RIV');
    const geralt=page.locator('.cb-pocket[data-character="geralt-witcher"]');assert.equal(await geralt.count(),1);
    assert.equal(await geralt.locator('.cb-version-count b').innerText(),'2');
    const beforeVersion=await geralt.getAttribute('data-card-id');await geralt.locator('[data-binder-action=cycle-version]').click();
    assert.notEqual(await geralt.getAttribute('data-card-id'),beforeVersion);
    for(const [duel,ids,attacker,target]of [
      ['batman-robin',[...M.decks[0].slice(0,9),'49901511'],'49901509','49901511'],
      ['cyclope-tornade',M.decks[1],'49901606','49901607']
    ]){
      const ac=data.cards.find(c=>c.id===attacker),bc=data.cards.find(c=>c.id===target);
      const as=ac.positions[0]-1,bs=bc.positions[0]-1,left=M.formation(data.cards,ids,attacker,as),right=M.formation(data.cards,ids,target,bs);
      await page.evaluate(({ids,left,right,as,bs,duel})=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.newGame(ids,ids,{seed:duel,mode:'local',kalistel:false,deckCoverage:2});
        for(let side=0;side<2;side++)for(let slot=0;slot<5;slot++){
          const wanted=[left,right][side][slot];E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===wanted).uid,slot);
        }
        E.start(s);E.lock(s,as,bs);E.rollAttack(s,6);E.assertState(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
      },{ids,left,right,as,bs,duel});
      await page.goto(base+'jeu/?crossover-qa='+duel+'#arena');await ready();
      await page.waitForFunction(()=>document.body.classList.contains('arena-view'));
      for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915]]){
        await page.setViewportSize({width,height});await images();assert(await fit(),name+' arena');
        const shot=name+'-'+duel+'.png';await page.screenshot({path:path.join(out,shot)});screens.push(shot);
      }
      await page.reload();await ready();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).seed),duel);
    }
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,base,viewports:[[1440,1000],[412,915],[320,740]],cards:set.cards.map(c=>c.id),screens,persistence,migration,arenaReload:true,errors,failures},null,2));
    console.log('PASS: 15 card readers, three viewports, two duels, old backups and nine-card catalogue upgrade.');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
