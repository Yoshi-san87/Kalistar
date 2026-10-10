'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_sf_browser.cjs'))('playwright');
const M=require('./model.cjs'),set=require('./set.json'),dist=process.env.KALISTAR_DIST||require('../../deploy/build.cjs').DIST;
const out=path.join(__dirname,process.env.KALISTAR_SF_QA||(process.env.KALISTAR_PAGES_URL?'public-browser-proof':'browser-proof'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
 const server=http.createServer((req,res)=>{try{
  const url=new URL(req.url,'http://localhost');assert(url.pathname.startsWith('/Kalistar/'));
  const name=decodeURIComponent(url.pathname.slice('/Kalistar/'.length));assert(!name.includes('..'));
  const f=path.resolve(dist,name.endsWith('/')?name+'index.html':name);assert(f.startsWith(path.resolve(dist)+path.sep));
  res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));
 }catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],failures=[],screens=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
  const base=process.env.KALISTAR_PAGES_URL||'http://127.0.0.1:'+server.address().port+'/Kalistar/';
  const ready=()=>page.waitForFunction(()=>window.KALISTAR_READY);
  const images=()=>page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0));
  const shot=async name=>{await images();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,name+'.png')});screens.push(name+'.png');};
  await page.goto(base+'jeu/#collection');await ready();const data=await page.evaluate(()=>KALISTAR_DATA);M.validateGame(data,set,require('../../site/engine.js').createEngine);
  assert.equal(data.cards.filter(c=>c.faction==='CASTLEVANIA').length,9);
  const migration=await page.evaluate(async data=>{
   const old=structuredClone(data);old.cards=old.cards.filter(c=>c.faction!=='CASTLEVANIA');
   const name='kalistar-v4-cards-castlevania-qa-'+crypto.randomUUID(),P=KalistarOwnership.PARIS;
   let db=await KalistarLocalDB.open(old,{name}),backup=await db.exportBackup();db.close();db=await KalistarLocalDB.open(data,{name});
   if(db.registry.owned(P).length!==data.cards.length)throw Error('Missing new cards');await db.importBackup(backup);db.close();
   db=await KalistarLocalDB.open(data,{name});const after=db.registry.owned(P).length;db.close();return {before:old.cards.length,after};
  },data);assert.equal(migration.after-migration.before,9);
  for(const [label,width,height]of [['desktop',1440,1000],['razr50',412,915],['narrow',320,740]]){
   await page.setViewportSize({width,height});await page.locator('.cb-collection-select select').selectOption('castlevania');
   await page.locator('[data-binder-field=search]').fill('');await shot(label+'-collection');
   await page.locator('[data-binder-field=search]').fill('Dracula');
   assert.equal(await page.locator('.cb-card').count(),1,'Both variants share one binder entry');
   await page.locator('.cb-card').click();await page.locator('.cb-reader').waitFor();
   for(const id of ['49901807','49901809']){
    const notes=page.locator('[data-binder-action=pane][data-id=notes]');if(await notes.isVisible())await notes.click();
    const choice=page.locator('[data-binder-action=version][data-id="'+id+'"]');
    await choice.click();assert.equal(await choice.getAttribute('aria-pressed'),'true');
    assert((await page.locator('.cb-visual figcaption').innerText()).includes(id));
    const visual=page.locator('[data-binder-action=pane][data-id=visual]');if(await visual.isVisible())await visual.click();
    await shot(label+'-variant-'+id);
   }
   await page.locator('[data-binder-action=back]').click();
   for(const c of set.cards){
    await page.locator('[data-binder-field=search]').fill(c.id);await page.locator('.cb-card[data-id="'+c.id+'"]').click();await page.locator('.cb-reader').waitFor();
    const pane=page.locator('[data-binder-action=pane][data-id=visual]');if(await pane.isVisible())await pane.click();
    await page.waitForFunction(()=>{const i=document.querySelector('.cb-hero-image');return i&&i.complete&&i.naturalWidth===797&&i.naturalHeight===1388;});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(label==='desktop'||['trevor-belmont','dracula-feu','dracula-sang','sypha'].includes(c.key))await shot(label+'-'+c.key);
    await page.locator('[data-binder-action=back]').click();
   }
  }
  const decks=M.qaDecks(),as=3,bs=1,left=M.formation(data.cards,decks[0],'49901807',as),right=M.formation(data.cards,decks[1],'49901809',bs);
  await page.evaluate(({decks,left,right,as,bs})=>{
   const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.newGame(decks[0],decks[1],{seed:'CASTLEVANIA-RELEASE',mode:'local',kalistel:false,deckCoverage:2});
   for(let side=0;side<2;side++)for(let slot=0;slot<5;slot++)E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===[left,right][side][slot]).uid,slot);
   E.start(s);E.lock(s,as,bs);E.rollAttack(s,5);E.assertState(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
  },{decks,left,right,as,bs});
  await page.goto(base+'jeu/?sf-release-qa=1#arena');await ready();await page.waitForFunction(()=>document.body.classList.contains('arena-view'));
  for(const [label,width,height]of [['desktop',1440,1000],['razr50',412,915]]){await page.setViewportSize({width,height});await shot(label+'-dracula-variants-duel');}
  await page.reload();await ready();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).seed),'CASTLEVANIA-RELEASE');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,base,readers:27,variantSwitches:6,viewports:[1440,412,320],migration,duelReload:true,screens,errors,failures},null,2)+'\n');
  console.log('PASS: 27 card readers, PC/phone, Dracula Feu/Sang duel, reload and 9-card legacy backup upgrade');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
