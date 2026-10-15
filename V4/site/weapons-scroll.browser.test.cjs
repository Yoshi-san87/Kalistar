'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium} = createRequire(path.join(runtime, '__weapons_scroll__.cjs'))('playwright');
const {weapons} = require('./weapons.js');
const base = process.env.KALISTAR_URL || 'http://127.0.0.1:4304';
const out = process.env.KALISTAR_VERIFICATION_DIR || path.resolve(__dirname, '../revisions/2026-10-04-mobile-weapons-scroll/qa');
const results = [], errors = [];
let browser;

async function ready(surface) {
  await surface.waitForFunction(() => window.KALISTAR_READY);
  await surface.waitForFunction(() => [...document.querySelectorAll('.weapon-card img')].every(n => n.complete && n.naturalWidth > 0));
  await surface.evaluate(() => document.fonts.ready);
}

async function state(surface) {
  return surface.evaluate(() => {
    const app = document.querySelector('#app'), nav = document.querySelector('.main-nav');
    const rect = n => {const r = n.getBoundingClientRect(); return {top:r.top, bottom:r.bottom, width:r.width};};
    return {scrollTop:app.scrollTop, maxScroll:app.scrollHeight-app.clientHeight,
      app:rect(app), nav:rect(nav), last:rect(document.querySelector('.weapon-entry:last-child')),
      count:document.querySelectorAll('.weapon-entry').length,
      horizontalOverflow:document.documentElement.scrollWidth > innerWidth + 1,
      pageScroll:window.scrollY, overflowY:getComputedStyle(app).overflowY};
  });
}

// Real touch events exercise native scrolling even when the gesture starts on a card button.
async function swipe(page, session, direction = 'up') {
  const {width, height} = page.viewportSize();
  const start = direction === 'up' ? height - 100 : 90;
  const end = direction === 'up' ? 90 : height - 100;
  const point = y => [{x:Math.round(width*.45), y:Math.round(y), id:0}];
  await session.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:point(start)});
  for (let step=1; step<=8; step++) {
    await session.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:point(start+(end-start)*step/8)});
    await page.waitForTimeout(12);
  }
  await session.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
  await page.waitForTimeout(220);
}

async function reachEnd(page, session, label) {
  let current = await state(page);
  const limit = Math.ceil(current.maxScroll/Math.max(page.viewportSize().height-190,1))+10;
  for (let step=0; current.maxScroll-current.scrollTop>2 && step<limit; step++) {
    const before = current.scrollTop;
    await swipe(page, session);
    current = await state(page);
    assert(current.scrollTop > before, label+' touch gesture advances the list');
  }
  assert(current.maxScroll-current.scrollTop<=2, label+' last weapon is reachable');
  assert(current.last.bottom<=current.nav.top+1, label+' bottom navigation does not cover the last weapon');
  assert.equal(current.pageScroll, 0, label+' only the content scrolls');
  assert(!current.horizontalOverflow, label+' no sideways overflow');
  return current;
}

async function context(options) {
  const c = await browser.newContext({...options, serviceWorkers:'block'});
  await c.addInitScript(() => {
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function(name, version) {return open.call(this, String(name)+'-weapons-scroll-qa-only', version);};
  });
  return c;
}

async function main() {
  fs.mkdirSync(out, {recursive:true});
  browser = await chromium.launch({channel:'chrome', headless:true});
  for (const [name, width, height] of [['razr50',412,1007], ['phone',360,740], ['compact',320,568], ['landscape',844,390]]) {
    const c = await context({viewport:{width,height}, isMobile:true, hasTouch:true});
    const page = await c.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base+'/jeu/#weapons');
    await ready(page);
    const before = await state(page);
    assert.equal(before.count, weapons.length);
    await page.screenshot({path:path.join(out,name+'-top.png')});
    const session = await c.newCDPSession(page);
    await swipe(page, session);
    const after = await state(page);
    fs.writeFileSync(path.join(out,name+'-gesture.json'), JSON.stringify({before,after},null,2));
    assert(after.scrollTop>80, name+' swipe must scroll the weapons, not clip them');
    assert.equal(after.nav.top, before.nav.top, name+' navigation remains fixed');
    assert.equal(await page.locator('#weapons-dialog').evaluate(n => n.open), false, name+' swipe does not open a weapon');
    const bottom = await reachEnd(page, session, name);
    await page.screenshot({path:path.join(out,name+'-bottom.png')});
    const last = page.locator('.weapon-entry').last().locator('[data-weapon]').first();
    const id = await last.getAttribute('data-weapon');
    await last.tap();
    await page.waitForFunction(() => document.querySelector('#weapons-dialog').open);
    const openedAt = (await state(page)).scrollTop;
    assert.equal(await page.locator('#weapons-dialog [data-weapon-card]').first().getAttribute('data-weapon-card'), id);
    await page.locator('[data-weapon-action=close]').tap();
    assert(Math.abs((await state(page)).scrollTop-openedAt)<2, name+' closing detail preserves the list position');
    await page.locator('.main-nav [data-view=collection]').tap();
    await page.waitForSelector('.cb-page');
    await page.locator('.main-nav [data-view=weapons]').tap();
    await ready(page);
    await page.evaluate(() => document.querySelector('#app').scrollTop=0);
    await page.locator('.weapon-filter').selectOption('stat:DEF');
    const filtered = await reachEnd(page, session, name+' filtered');
    assert(filtered.count>0 && filtered.count<before.count);
    results.push({name,before,after,bottom,filtered});
    await c.close();
  }

  const c = await context({viewport:{width:1440,height:1000}}), page = await c.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base+'/jeu/#weapons');
  await ready(page);
  assert.equal(await page.locator('.weapons-list').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length), 6);
  await page.mouse.move(700,700);
  await page.mouse.wheel(0,650);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.scrollY),0,'desktop arsenal stays inside the viewport');
  await page.locator('[data-weapon-action=page][data-list=collection][data-page="1"]').click();
  assert.equal(await page.locator('[data-weapon-page=collection]').inputValue(),'1');
  await page.screenshot({path:path.join(out,'desktop.png')});
  results.push({name:'desktop',pageScroll:await page.evaluate(() => window.scrollY)});

  await page.goto(base+'/jeu/?phone=razr50#weapons');
  const preview = await (await page.locator('#phone-preview-frame').elementHandle()).contentFrame();
  await ready(preview);
  const frame = await page.locator('#phone-preview-frame').boundingBox();
  await page.mouse.move(frame.x+frame.width*.45, frame.y+frame.height*.65);
  await page.mouse.wheel(0,600);
  await preview.locator('#app').evaluate(n => new Promise((resolve,reject) => {
    const deadline=performance.now()+3000;
    function check() {if(n.scrollTop>80)resolve();else if(performance.now()>deadline)reject(Error('Razr preview wheel is blocked'));else requestAnimationFrame(check);}
    check();
  }));
  results.push({name:'razr50-preview',state:await state(preview)});
  await page.screenshot({path:path.join(out,'razr50-preview.png')});
  await c.close();
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out,'results.json'), JSON.stringify({passed:true,errors,results},null,2));
  console.log(JSON.stringify({passed:true,checks:results.length,out}));
}
main().catch(error => {console.error(error); process.exitCode=1;}).finally(() => browser?.close());
