'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const modules=process.env.KALISTAR_NODE_MODULES||path.resolve(path.dirname(process.execPath),'../node_modules');
const {chromium}=createRequire(path.join(modules,'__guide_qa__.cjs'))('playwright');
const Guide=require('./guide-scenario.js');
const dist=process.env.KALISTAR_DIST;
const base=dist?'https://kalistar-guide-qa.invalid/jeu/':process.env.KALISTAR_URL||'http://127.0.0.1:4304/jeu/';
const output=process.env.KALISTAR_GUIDE_QA||path.join(os.tmpdir(),'kalistar-guide-qa');
const sleep=page=>page.waitForFunction(()=>!document.querySelector('.kalistar-page-crossing'));
async function geometry(page,name){
  await page.waitForFunction(()=>[...document.querySelectorAll('#app img')].every(i=>i.complete&&i.naturalWidth));
  const report=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.querySelectorAll('#app img')].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),controls:[...document.querySelectorAll('.guide-command,.guide-heading select')].map(n=>{const r=n.getBoundingClientRect();return {height:r.height,overflow:n.scrollWidth>n.clientWidth+2};})}));
  assert(!report.overflow,name+' viewport overflow');assert.deepEqual(report.broken,[],name+' broken images');for(const c of report.controls){assert(!c.overflow,name+' control text');assert(c.height>=36,name+' touch control');}return report;
}
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
  try{for(const [name,width,height,phone,reduced] of [['desktop',1440,1000,false,false],['razr',412,1007,true,false],['compact',320,740,true,true],['landscape',844,390,true,true]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:phone,hasTouch:phone,reducedMotion:reduced?'reduce':'no-preference'}),page=await context.newPage(),errors=[];
    if(dist)await context.route('**/*',async route=>{
      const url=new URL(route.request().url());if(url.origin!==new URL(base).origin)return route.abort();
      const file=path.resolve(dist,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
      if(!file.startsWith(path.resolve(dist)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:url.pathname});
      const types={'.js':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
      return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
    });
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'#collection');await page.waitForFunction(()=>window.KALISTAR_READY);await sleep(page);
    await page.locator('.nav-more').click();await page.locator('#mobile-dialog [data-view="guide"]').click();await page.waitForSelector('.guide-view');await sleep(page);
    assert.equal(await page.locator('.nav-more').getAttribute('aria-current'),'page');
    await page.evaluate(()=>localStorage.setItem('kalistar.v4.game.sentinel','KEEP-ME'));
    const baseline=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.includes('game')||key.includes('deck'))));
    const data=await page.evaluate(()=>window.KALISTAR_DATA),Q=Guide.create(data);
    const chapters=name==='desktop'||name==='razr'?Guide.chapters:Guide.chapters.filter(c=>['formation','equipment','momo'].includes(c.id));
    for(const chapter of chapters){
      const index=Guide.chapters.findIndex(c=>c.id===chapter.id);await page.locator('[data-guide-chapter]').selectOption(String(index));const l=Q.lesson(chapter.id);
      if(index===0||chapter.id==='equipment'||chapter.id==='momo'){
        await geometry(page,name+' '+chapter.id);
        await page.screenshot({path:path.join(output,name+'-'+chapter.id+'-start.png'),fullPage:true});
        await geometry(page,name+' '+chapter.id);
      }
      for(const op of l.ops){
        if(op.method==='lock'){
          const side=l.state.turn;
          await page.locator(`[data-guide-card="${side}:${(op.args[0]+1)%5}"]`).click();assert((await page.locator('.guide-feedback').innerText()).includes('Pas cette carte'));
          await page.locator(`[data-guide-card="${side}:${op.args[0]}"]`).click();await page.locator(`[data-guide-card="${1-side}:${op.args[1]}"]`).click();
        }else if(op.select)await page.locator(`[data-guide-card="${op.side}:${op.slot}"]`).click();
        else await page.locator('[data-guide-action="perform"]').click();
        Q.perform(l.state,op);
      }
      await page.waitForSelector('.guide-check');assert((await page.locator('.guide-feedback').innerText())==='');
      await page.locator('[data-guide-answer="1"]').click();assert.equal(await page.locator('.guide-complete').count(),0);
      await page.locator('[data-guide-answer="0"]').click();await page.waitForSelector('.guide-complete');
      await geometry(page,name+' '+chapter.id);
      if(chapter.id==='equipment'||chapter.id==='momo'||chapter.id==='finale')await page.screenshot({path:path.join(output,name+'-'+chapter.id+'-result.png'),fullPage:true});
      const current=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.includes('game')||key.includes('deck'))));assert.deepEqual(current,baseline,'Guide must not mutate real saved decks or games');
    }
    await page.locator('[data-guide-action="library"]').click();await page.waitForSelector('.kalistar-library');await sleep(page);
    await page.screenshot({path:path.join(output,name+'-library.png')});
    await page.locator('[data-library-open="regles"]').click();await page.waitForSelector('.library-prose');
    await page.waitForFunction(()=>!document.querySelector('.library-unfurl').getAnimations().some(a=>a.playState==='running'));
    assert((await page.locator('.library-prose').innerText()).includes('Jouer à Kalistar'));
    assert.equal(await page.locator('.library-prose a,.library-source').count(),0);
    await page.screenshot({path:path.join(output,name+'-manuscript.png')});
    await page.goBack();await page.waitForFunction(()=>!document.querySelector('.library-dialog').open&&!document.querySelector('.library-inline:not([hidden])'));
    assert.equal(new URL(page.url()).hash,'#library');
    await page.goto(base+'#guide');await page.waitForSelector('.guide-view');await sleep(page);await page.locator('[data-guide-chapter]').selectOption('1');await page.locator('[data-guide-card="0:0"]').click();await page.locator('[data-guide-card="1:0"]').click();await page.locator('[data-guide-action="perform"]').click();
    await page.locator('[data-guide-action="previous"]').click();assert((await page.locator('.guide-coach').innerText()).includes('Lance l’ATK'));
    await page.locator('.main-nav [data-view="decks"]').click();
    try{await page.waitForSelector('#deck-builder-root');}catch(error){await page.screenshot({path:path.join(output,name+'-navigation-failure.png')});console.error(JSON.stringify({url:page.url(),errors,body:await page.locator('#app').innerText()}));throw error;}await sleep(page);
    await page.locator('.nav-more').click();await page.locator('#mobile-dialog [data-view="guide"]').click();await page.waitForSelector('.guide-view');await sleep(page);
    assert.equal(await page.locator('[data-guide-action="perform"]').count(),0,'remount starts the chapter cleanly, without duplicated listeners');
    assert.deepEqual(errors,[]);results.push({name,width,height,chapters:chapters.length,errors});await context.close();
  }}finally{await browser.close();}
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({output,results}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
