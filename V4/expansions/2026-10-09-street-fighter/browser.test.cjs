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
  assert.equal(data.cards.filter(c=>c.faction==='STREETFIGHTER').length,18);
  const migration=await page.evaluate(async data=>{
   const old=structuredClone(data);old.cards=old.cards.filter(c=>c.faction!=='STREETFIGHTER');
   const name='kalistar-v4-cards-streetfighter-qa-'+crypto.randomUUID(),P=KalistarOwnership.PARIS;
   let db=await KalistarLocalDB.open(old,{name}),backup=await db.exportBackup();db.close();db=await KalistarLocalDB.open(data,{name});
   if(db.registry.owned(P).length!==data.cards.length)throw Error('Missing new cards');await db.importBackup(backup);db.close();
   db=await KalistarLocalDB.open(data,{name});const after=db.registry.owned(P).length;db.close();return {before:old.cards.length,after};
  },data);assert.equal(migration.after-migration.before,18);
  for(const [label,width,height]of [['desktop',1440,1000],['razr50',412,915],['narrow',320,740]]){
   await page.setViewportSize({width,height});await page.locator('.cb-collection-select select').selectOption('street-fighter');
   await page.locator('[data-binder-field=search]').fill('');await shot(label+'-collection');
   for(const c of set.cards){
    await page.locator('[data-binder-field=search]').fill(c.id);await page.locator('.cb-card[data-id="'+c.id+'"]').click();await page.locator('.cb-reader').waitFor();
    const pane=page.locator('[data-binder-action=pane][data-id=visual]');if(await pane.isVisible())await pane.click();
    await page.waitForFunction(()=>{const i=document.querySelector('.cb-hero-image');return i&&i.complete&&i.naturalWidth===797&&i.naturalHeight===1388;});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(label==='desktop'||['chun-li','guile','fei-long','t-hawk'].includes(c.key))await shot(label+'-'+c.key);
    await page.locator('[data-binder-action=back]').click();
   }
  }
  const ids=M.qaDecks()[0],as=1,bs=1,left=M.formation(data.cards,ids,'49901701',as),right=M.formation(data.cards,ids,'49901702',bs);
  await page.evaluate(({ids,left,right,as,bs})=>{
   const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.newGame(ids,ids,{seed:'SF-RELEASE',mode:'local',kalistel:false,deckCoverage:2});
   for(let side=0;side<2;side++)for(let slot=0;slot<5;slot++)E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===[left,right][side][slot]).uid,slot);
   E.start(s);E.lock(s,as,bs);E.rollAttack(s,5);E.assertState(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
  },{ids,left,right,as,bs});
  await page.goto(base+'jeu/?sf-release-qa=1#arena');await ready();await page.waitForFunction(()=>document.body.classList.contains('arena-view'));
  for(const [label,width,height]of [['desktop',1440,1000],['razr50',412,915]]){await page.setViewportSize({width,height});await shot(label+'-ryu-ken-duel');}
  await page.reload();await ready();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).seed),'SF-RELEASE');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,base,readers:54,viewports:[1440,412,320],migration,duelReload:true,screens,errors,failures},null,2)+'\n');
  console.log('PASS: 54 card readers, PC/phone, Ryu-Ken duel, reload and 18-card legacy backup upgrade');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
