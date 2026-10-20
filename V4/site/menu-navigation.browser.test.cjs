'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const runtime = createRequire(path.join(process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE,
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'), '_menu_qa.cjs'));
const dist = path.resolve(process.env.KALISTAR_DIST || path.join(__dirname, '../deploy/dist'));
const out = path.resolve(process.env.KALISTAR_VERIFICATION_DIR || path.join(__dirname, '../../work/qa/menu-navigation'));
const base = 'https://kalistar-menu-qa.invalid';
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const profiles = [
  {name:'desktop',width:1440,height:1000},
  {name:'razr',width:412,height:1007,mobile:true},
  {name:'compact',width:320,height:568,mobile:true},
  {name:'landscape',width:1007,height:412,mobile:true},
  {name:'reduced',width:412,height:1007,mobile:true,reduced:true}
];
async function ready(page) {
  await page.waitForFunction(() => window.KALISTAR_READY);
  await page.evaluate(() => document.fonts.ready);
}
async function inspect(page, label) {
  await page.waitForFunction(() => [...document.querySelectorAll('#mobile-dialog img')].every(i => i.complete && i.naturalWidth));
  await page.waitForTimeout(250);
  const layout = await page.locator('#mobile-dialog').evaluate(d => {
    const box = el => {const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const rows=[...d.querySelectorAll('.kalistar-menu-item')];
    const scroller=d.querySelector('.mobile-menu'),close=d.querySelector('[data-action=close]'),r=close.getBoundingClientRect();
    return {viewport:[innerWidth,innerHeight],dialog:box(d),close:box(close),
      closeHit:close.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),
      horizontal:scroller.scrollWidth<=scroller.clientWidth+1,scrolls:scroller.scrollHeight>scroller.clientHeight,
      onlyRows:rows.length===d.querySelectorAll('.mobile-menu button').length,
      labelsFit:rows.every(b=>b.scrollWidth<=b.clientWidth+1),
      rows:rows.map(b=>({box:box(b),columns:getComputedStyle(b).gridTemplateColumns,
        font:getComputedStyle(b).font,background:getComputedStyle(b).backgroundColor})),
      fragment:d.querySelector('[data-view=journeys] img').getAttribute('src'),
      labelled:d.querySelector('#'+d.getAttribute('aria-labelledby'))?.textContent,
      skin:{background:getComputedStyle(d).backgroundImage,border:getComputedStyle(d).borderColor,
        rowFont:getComputedStyle(rows[0]).font,iconWidth:getComputedStyle(rows[0].querySelector('.kalistar-menu-symbol')).width}};
  });
  assert(layout.labelled, label+': labelled dialog');
  assert(layout.onlyRows && layout.labelsFit && layout.horizontal, label+': all rows fit the shared component');
  assert(layout.closeHit && layout.close.width>=44 && layout.close.height>=44, label+': close always accessible');
  const r=layout.dialog;assert(r.x>=0&&r.right<=layout.viewport[0]&&r.y>=0&&r.bottom<=layout.viewport[1],label+': bounded dialog');
  assert(layout.rows.every(r=>r.box.height>=60),label+': comfortable targets');
  assert(layout.fragment.endsWith('kalistel-rainbow-v2.webp'),label+': Fragment uses approved crystal');
  await page.screenshot({path:path.join(out,label+'.png')});
  return layout;
}
async function main() {
  fs.mkdirSync(out,{recursive:true});
  const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),results=[];
  try {
    for(const p of profiles) {
      const context=await browser.newContext({viewport:{width:p.width,height:p.height},isMobile:!!p.mobile,hasTouch:!!p.mobile,
        reducedMotion:p.reduced?'reduce':'no-preference',serviceWorkers:'block'});
      const errors=[];
      await context.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(url.origin!==base){errors.push('Unexpected origin '+url.origin);return route.abort();}
        let relative=decodeURIComponent(url.pathname).slice(1);if(relative.endsWith('/'))relative+='index.html';
        const file=path.resolve(dist,relative);
        if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)){errors.push('Missing '+relative);return route.fulfill({status:404,body:'Missing QA asset'});}
        return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
      });
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      if(p.name==='razr')await (await context.newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride',{insets:{top:24,bottom:24,left:0,right:0}});
      await page.goto(base+'/jeu/#home');await ready(page);
      await page.locator('.nav-more').click();
      assert.equal(await page.locator('.nav-more').getAttribute('aria-expanded'),'true');
      const general=await inspect(page,p.name+'-general');
      await page.keyboard.press('Tab');
      assert(await page.locator('#mobile-dialog').evaluate(d=>d.contains(document.activeElement)),'keyboard focus stays in the dialog');
      await page.keyboard.press('Escape');await page.locator('#mobile-dialog').waitFor({state:'hidden'});
      assert.equal(await page.locator('.nav-more').getAttribute('aria-expanded'),'false');
      await page.locator('.nav-more').click();await page.goBack();await page.locator('#mobile-dialog').waitFor({state:'hidden'});
      assert(page.url().endsWith('#home'),'Back closes menu without leaving home');
      await page.locator('.nav-more').click();
      await page.locator('#mobile-dialog [data-view=journeys]').click();await page.locator('#journey-root').waitFor();
      await page.evaluate(async()=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),team=KalistarTeamComposition.create(E).fromPreset({name:'Menu QA',cards:KALISTAR_DATA.decks.player});
        const state=E.newGame(team,team,{seed:'MENU-QA',mode:'local',turnOrder:'ABBA'});E.rollInitiative(state,[6,1]);
        await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(state);localStorage.setItem('kalistar.v4.game',JSON.stringify(state));
      });
      // A new document must load the fixture before the router reads it.
      await page.goto(base+'/jeu/?menu-qa#arena');await ready(page);
      try { await page.locator('.arena-toolbar [data-action=arena-menu]').waitFor({timeout:8000}); }
      catch(error) { await page.screenshot({path:path.join(out,p.name+'-failure.png')});console.error({errors,url:page.url(),body:(await page.locator('body').innerText()).slice(0,800)});throw error; }
      const saved=await page.evaluate(()=>localStorage.getItem('kalistar.v4.game'));
      const trigger=page.locator('.arena-toolbar [data-action=arena-menu]');await trigger.click();
      const arena=await inspect(page,p.name+'-arena');
      assert.deepEqual(arena.skin,general.skin,p.name+': same visual grammar across both menus');
      assert(arena.scrolls,p.name+': long menu scrolls internally');
      assert.equal(await page.locator('#mobile-dialog .kalistar-menu-group h3').first().innerText(),'Combat');
      assert(await page.locator('#mobile-dialog [data-action=arena-picker]').isDisabled());
      for(const action of ['duel-details','match-stats','journal','reserves','grave','fullscreen','rules','save-game','load-game','new-game'])
        assert.equal(await page.locator('#mobile-dialog [data-action='+action+']').count(),1,action+' retained');
      assert.equal(await trigger.getAttribute('aria-expanded'),'true');
      await page.locator('#mobile-dialog [data-action=journal]').click();await page.locator('#journal-dialog[open]').waitFor();
      assert.equal(await trigger.getAttribute('aria-expanded'),'false');
      await page.goBack();await page.locator('#journal-dialog').waitFor({state:'hidden'});
      await trigger.click();await page.locator('#mobile-dialog [data-view=library]').scrollIntoViewIfNeeded();
      assert(await page.locator('#mobile-dialog .mobile-menu').evaluate(n=>n.scrollTop>0));
      await inspect(page,p.name+'-arena-scrolled');
      await page.keyboard.press('Escape');await page.locator('#mobile-dialog').waitFor({state:'hidden'});
      await trigger.click();await page.locator('#mobile-dialog [data-action=duel-details]').click();
      await page.waitForFunction(()=>!document.querySelector('#mobile-dialog').classList.contains('navigation-sheet'));
      assert.equal(await page.locator('#mobile-dialog .kalistar-menu-item').count(),0,'details do not inherit menu rows');
      assert(await page.locator('#mobile-dialog').getAttribute('aria-label'),'non-menu dialog keeps its accessible name');
      await page.keyboard.press('Escape');await page.locator('#mobile-dialog').waitFor({state:'hidden'});
      assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v4.game')),saved,'menus do not modify the game');
      if(p.name==='razr'){
        await page.evaluate(async()=>{
          const state=JSON.parse(localStorage.getItem('kalistar.v4.game'));
          state.journey={version:1,attemptId:'menu-preview',bookId:'momo-petits-bonheurs',stage:0,revision:1,sequence:1,preview:true};
          await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(state);localStorage.setItem('kalistar.v4.game',JSON.stringify(state));
        });
        await page.reload();await ready(page);await trigger.click();
        await inspect(page,p.name+'-fragment');
        assert.equal(await page.locator('#mobile-dialog .kalistar-menu-group h3').first().innerText(),'Fragment');
        assert((await page.locator('#mobile-dialog [data-action=journey-return] img').getAttribute('src')).endsWith('kalistel-rainbow-v2.webp'));
        await page.keyboard.press('Escape');await page.locator('#mobile-dialog').waitFor({state:'hidden'});
      }
      await trigger.click();await page.locator('#mobile-dialog [data-view=collection]').click();await page.locator('.cb-page').waitFor();
      assert.deepEqual(errors,[],p.name+': no script or asset errors');
      results.push({profile:p.name,general,arena});await context.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,results},null,2));
    console.log('PASS menus: desktop, Razr, compact, landscape, reduced; shared skin, crystal, actions, scroll, Back, Escape, unchanged save.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
