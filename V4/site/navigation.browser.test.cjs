'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__navigation_browser__.cjs'))('playwright');
const dist=path.resolve(__dirname,'../deploy/dist'),local=process.env.KALISTAR_NAV_LOCAL==='1',base=local?'http://127.0.0.1:4304':'https://kalistar-nav-qa.invalid/Kalistar';
const out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-03-menu-identity/qa/navigation');
const results=[],errors=[];let browser;
async function capture(page,name){
  await page.waitForFunction(()=>[...document.images].filter(n=>{
    const r=n.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0&&getComputedStyle(n).visibility!=='hidden';
  }).every(n=>n.complete&&n.naturalWidth>0));
  await page.screenshot({path:path.join(out,name+'.png')});
}
async function checks(page,label,phone){
  await page.evaluate(()=>document.fonts.load('600 14px Cinzel'));
  await page.waitForFunction(()=>[...document.querySelectorAll('.main-nav .kalistar-nav-icon')].every(i=>i.complete&&i.naturalWidth===128));
  await page.waitForTimeout(220);
  const sample=await page.evaluate(()=>{
    const nav=document.querySelector('.main-nav'),header=document.querySelector('.masthead'),actions=document.querySelector('.header-actions');
    const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const buttons=[...nav.querySelectorAll('button')].filter(n=>getComputedStyle(n).display!=='none');
    return {font:document.fonts.check('600 14px Cinzel'),family:getComputedStyle(buttons[0]).fontFamily,header:box(header),nav:box(nav),actions:box(actions),viewport:innerWidth,
      buttons:buttons.map(n=>({view:n.dataset.view||'more',...box(n),label:box(n.querySelector('span')),icon:box(n.querySelector('.kalistar-nav-icon,.lucide')),current:n.getAttribute('aria-current')})),
      overflow:document.documentElement.scrollWidth>innerWidth,
      bodyFont:getComputedStyle(document.body).fontFamily};
  });
  assert(sample.font&&sample.family.includes('Cinzel'),label+' loads the real display font');
  assert(!sample.bodyFont.includes('Cinzel'),'body text stays readable');
  assert.equal(sample.buttons.length,phone?5:local?7:6,label+' comfortable visible destinations');
  assert.equal(sample.buttons.filter(n=>n.current==='page').length,1,label+' exactly one visible current section');
  assert(!sample.overflow,label+' no horizontal overflow');
  for(const b of sample.buttons){
    assert(b.width>=44&&b.height>=44,label+' touch target '+b.view);
    assert(b.label.x>=b.x-.5&&b.label.right<=b.right+.5,label+' label contained '+b.view);
    assert(b.icon.x>=b.x-.5&&b.icon.right<=b.right+.5,label+' icon contained '+b.view);
    assert(b.right<=sample.viewport+.5,label+' item within viewport '+b.view);
  }
  if(!phone&&sample.nav.y<sample.actions.bottom)assert(sample.nav.right<=sample.actions.x+.5,label+' header controls do not overlap navigation');
  if(phone)assert(sample.nav.y>sample.header.bottom,label+' bottom navigation');
  results.push({label,sample});
}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,viewport,motion,phone]of [
    ['desktop',{width:1920,height:1080},'no-preference',false],['laptop',{width:1440,height:900},'no-preference',false],
    ['small-laptop',{width:1280,height:800},'no-preference',false],
    ['tablet',{width:800,height:1000},'no-preference',false],['razr50',{width:412,height:1007},'no-preference',true],
    ['compact',{width:320,height:568},'no-preference',true],['reduced',{width:390,height:844},'reduce',true],
    ['landscape',{width:844,height:390},'no-preference',true]]){
    const context=await browser.newContext({viewport,reducedMotion:motion,serviceWorkers:'block'});
    await context.route('**/*',async route=>{
      if(local)return new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort();
      const url=new URL(route.request().url());if(url.origin!==new URL(base).origin||!url.pathname.startsWith('/Kalistar/'))return route.abort();
      let relative=decodeURIComponent(url.pathname.slice('/Kalistar/'.length));if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),'built resource '+relative);
      const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      await route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,String(name)+'-navigation-qa-only',version);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
    await page.goto(base+'/jeu/#weapons');await page.waitForFunction(()=>window.KALISTAR_READY);
    await checks(page,name+' weapons',phone);await capture(page,name+'-weapons');
    await page.locator('.main-nav [data-view=decks]').click();await page.waitForFunction(()=>document.body.classList.contains('decks-view'));
    await checks(page,name+' decks',phone);await capture(page,name+'-decks');
    if(local){await context.close();continue;}
    if(phone){
      await page.locator('.nav-more').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.querySelector('#mobile-dialog').open);
      assert.equal(await page.locator('.nav-more').getAttribute('aria-expanded'),'true');
      assert.equal(await page.locator('#mobile-dialog [data-view]').count(),2,'Plus contains only destinations outside the bottom bar');
      await page.waitForFunction(()=>[...document.querySelectorAll('#mobile-dialog .kalistar-nav-icon')].every(i=>i.complete&&i.naturalWidth===128));
      const sheet=await page.locator('#mobile-dialog [data-view]').evaluateAll(nodes=>nodes.map(n=>{
        const p=n.parentElement,s=getComputedStyle(p);return {width:n.clientWidth,parent:p.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)};
      }));
      assert(sheet.every(n=>Math.abs(n.width-n.parent)<=2),'navigation sheet uses its full width');
      await capture(page,name+'-more');
      await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#mobile-dialog').open);
      assert.equal(await page.locator('.nav-more').getAttribute('aria-expanded'),'false');
      await page.locator('.nav-more').click();await page.locator('#mobile-dialog [data-view=statistics]').click();
      await page.waitForFunction(()=>document.body.classList.contains('statistics-view'));
      assert.equal(await page.locator('.nav-more').getAttribute('aria-current'),'page');
      assert.equal(await page.locator('.nav-more').getAttribute('aria-expanded'),'false');
      await checks(page,name+' statistics',phone);
      await page.locator('.nav-more').click();await page.locator('#mobile-dialog [data-view=story]').click();
    }else await page.locator('.main-nav [data-view=story]').click();
    await page.waitForFunction(()=>document.body.classList.contains('story-view'));
    await checks(page,name+' story',phone);await capture(page,name+'-story');
    await page.locator('.main-nav [data-view=collection]').click();await page.waitForFunction(()=>document.body.classList.contains('collection-view'));
    await checks(page,name+' collection',phone);await capture(page,name+'-collection');
    if(motion==='reduce')assert.equal(await page.locator('.main-nav .kalistar-nav-icon').first().evaluate(n=>getComputedStyle(n).transitionDuration),'0s');
    if(name==='razr50'){
      await page.locator('.nav-more').click();await page.locator('#mobile-dialog [data-view=story]').click();
      await page.setViewportSize({width:800,height:1000});await checks(page,'resize to tablet',false);
      assert.equal(await page.locator('.nav-more').getAttribute('aria-current'),'false');
      await page.setViewportSize(viewport);await checks(page,'resize back to phone',true);
      assert.equal(await page.locator('.nav-more').getAttribute('aria-current'),'page');
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,errors,results},null,2));
  console.log(JSON.stringify({passed:true,checks:results.length,viewports:8,local,out}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
