'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{inside}=require('../../deploy/build.cjs');
const DIST=path.resolve(process.env.KALISTAR_DIST||require('../../deploy/build.cjs').DIST);
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_tmnt.cjs'))('playwright');
const {formation,qaDecks}=require('./model.cjs'),cards=require('./set.json').cards,ids=cards.map(c=>c.id);
const deckFor=()=>qaDecks()[0];
const sha=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../../work/qa/tortues-ninja/game');
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
  const page=await context.newPage(),errors=[],failures=[],readers=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
  const base=process.env.KALISTAR_PAGES_URL||'http://127.0.0.1:'+server.address().port+'/Kalistar/';
  const ready=()=>page.waitForFunction(()=>window.KALISTAR_READY);
  const images=()=>page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0));
  await page.goto(base+'jeu/#collection');await ready();
  await page.locator('[data-binder-filter=collection]').first().selectOption('tortues-ninja');
  assert.equal(await page.locator('[data-binder-filter=collection]').first().inputValue(),'tortues-ninja');
  assert.equal(await page.evaluate(ids=>KALISTAR_DATA.cards.filter(c=>ids.includes(c.id)).length,ids),10);
  const migration=await page.evaluate(async ids=>{
   const data=KALISTAR_DATA,old=structuredClone(data);old.cards=old.cards.filter(c=>!ids.includes(c.id));
   const name='kalistar-v4-cards-tmnt-'+crypto.randomUUID(),owner=KalistarOwnership.PARIS;
   let db=await KalistarLocalDB.open(old,{name}),backup=await db.exportBackup();db.close();
   db=await KalistarLocalDB.open(data,{name});await db.importBackup(backup);db.close();
   db=await KalistarLocalDB.open(data,{name});const after=db.registry.owned(owner).length;db.close();
   return {before:old.cards.length,after};
  },ids);assert.equal(migration.after-migration.before,10);
  for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915],['narrow',320,740]]){
   await page.setViewportSize({width,height});await page.goto(base+'jeu/?tmnt-reader='+name+'#collection');await ready();
   const sample=name==='desktop'?cards:cards.filter(c=>['shredder','bebop','michelangelo','april-oneil','leonardo'].includes(c.key));
   for(const c of sample){
    await page.locator('[data-binder-field=search]').fill(c.id);
    await page.locator('.cb-card[data-id="'+c.id+'"]').click();await page.locator('.cb-reader').waitFor();
    const pane=page.locator('[data-binder-action=pane][data-id=visual]');if(await pane.isVisible())await pane.click();
    await images();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(out,name+'-'+c.key+'.png')});readers.push({name,id:c.id});
    await page.locator('[data-binder-action=back]').click();
   }
  }
  const data=await page.evaluate(()=>KALISTAR_DATA),a=cards[0],b=cards.find(c=>c.key==='shredder');
  assert(b);const decks=[deckFor(a),deckFor(b)],slots=[formation(data.cards,decks[0],a.id,a.role-1),formation(data.cards,decks[1],b.id,b.role-1)];
  await page.evaluate(({decks,slots,a,b})=>{
   const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.newGame(...decks,{seed:'TMNT-10-VISUAL',mode:'local',kalistel:false,deckCoverage:2});
   for(let side=0;side<2;side++)for(let slot=0;slot<5;slot++)E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===slots[side][slot]).uid,slot);
   E.start(s);E.lock(s,a.role-1,b.role-1);E.rollAttack(s,6);E.assertState(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
  },{decks,slots,a,b});
  await page.goto(base+'jeu/?tmnt-qa=1#arena');await ready();await page.waitForFunction(()=>document.body.classList.contains('arena-view'));
  for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915]]){
   await page.setViewportSize({width,height});await images();
   assert(await page.evaluate(ids=>ids.every(id=>{
    const slot=document.querySelector('.formation .inspect[data-id="'+id+'"]')?.closest('.slot');
    return slot?.querySelector('.slot-card > img')?.naturalWidth>0;
   }),[a.id,b.id]));
   await page.screenshot({path:path.join(out,name+'-arena.png')});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await page.reload();await ready();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).seed),'TMNT-10-VISUAL');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,driverHash:sha(fs.readFileSync(__filename)),buildHash:sha(fs.readFileSync(path.join(DIST,'release.json'))),cards:ids,base,readers,arenaReload:true,migration,errors,failures},null,2));
  console.log('PASS: 10 variants, desktop/mobile readers, duel, migration and restored match.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
