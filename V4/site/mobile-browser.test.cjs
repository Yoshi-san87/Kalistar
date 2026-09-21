'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = createRequire(path.join(runtime, '__mobile_browser__.cjs'))('playwright');
const url = process.env.KALISTAR_URL || 'http://127.0.0.1:4304';
const output = path.join(__dirname, 'verification/mobile-cross');
const failures = [];
let browser;
async function main() {
  fs.mkdirSync(output, { recursive: true });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: process.env.KALISTAR_MOTION === 'full' ? 'no-preference' : 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', e => failures.push(e.message));
  const capture = name => page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
  async function loaded() {
    await page.waitForFunction(() => [...document.images].filter(i => i.getClientRects().length).every(i => i.complete && i.naturalWidth));
  }
  async function withinViewport(selector) {
    const rects = await page.locator(selector).evaluateAll(nodes => nodes.filter(n => n.getClientRects().length).map(n => {
      const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }));
    const { width, height } = page.viewportSize();
    for (const r of rects) assert.ok(r.x >= -1 && r.y >= -1 && r.right <= width + 1 && r.bottom <= height + 1, selector + ': ' + JSON.stringify(r));
  }
  async function settledFormation() {
    await page.waitForFunction(()=>[...document.querySelectorAll('.slot')].every(n=>n.getAnimations().every(a=>a.playState!=='running')));
  }
  async function noCardOverlap() {
    const rects=await page.locator('.slot-card').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
    const controls=await page.locator('.duel-actions,.match-scoreboard,[data-action=arena-menu],.side-heading').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
    const overlaps=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2;
    rects.forEach((r,i)=>{
      for(const other of rects.slice(i+1))assert.ok(!overlaps(r,other),'cards do not overlap');
      for(const control of controls)assert.ok(!overlaps(r,control),'corner controls do not hide cards: '+JSON.stringify({r,control}));
    });
  }
  await page.goto(url + '/jeu/');
  await page.waitForFunction(() => window.KALISTAR_READY === true);
  await page.waitForFunction(() => document.querySelector('.cb-spread')?.dataset.singlePage === 'true');
  await loaded();
  const touch = await context.newCDPSession(page);
  const leaf = await page.locator('.cb-sheet').boundingBox();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: leaf.x+leaf.width*.8, y: leaf.y+leaf.height*.5 }] });
  for(let i=1;i<=8;i++) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: leaf.x+leaf.width*(.8-i*.07), y: leaf.y+leaf.height*.5 }] });
    await page.waitForTimeout(30);
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => document.querySelector('.cb-page-label').textContent.includes('Page 2'));
  await page.waitForTimeout(400);
  const collab = await page.locator('[data-binder-action=scope][data-id=ff7]').boundingBox();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{x:collab.x+collab.width/2,y:collab.y+collab.height/2}] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(()=>document.querySelector('[data-binder-action=scope][data-id=ff7]').getAttribute('aria-pressed')==='true');
  await capture('ff7-after-swipe');
  await touch.detach();
  assert.ok(await page.locator('.cb-pocket').evaluateAll(nodes => nodes.every(n => KALISTAR_DATA.cards.find(c => c.id === n.dataset.cardId).faction === 'FF7')));
  await page.locator('[data-binder-action=next-page]').last().tap();
  await page.waitForFunction(()=>document.querySelector('.cb-page-label').textContent.includes('Page 2'));
  assert.match(await page.locator('.cb-page-label').textContent(), /Page 2/);
  await page.locator('.cb-card').first().tap();
  await loaded(); await capture('reader-card');
  await withinViewport('.cb-hero-image');
  await page.locator('[data-binder-action=pane][data-id=notes]').tap();
  await capture('reader-notes');
  await withinViewport('.cb-reading,.cb-read-content');
  for (const id of ['profile','career','copies','story']) await page.locator('[data-binder-action=tab][data-id=' + id + ']').tap();
  await page.locator('[data-view=arena]').tap();
  await page.waitForSelector('[data-action=start]');
  await loaded(); await capture('arena-setup');
  assert.equal(await page.locator('.brand').isVisible(),false,'no masthead in the phone arena');
  assert.equal(await page.locator('.arena-toolbar h1').isVisible(),false,'no location heading');
  for(const side of [0,1]){
    const r=await page.locator(`.formation[data-player="${side}"] .slot`).evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}));
    assert.ok(Math.abs(r[0].x-r[2].x)<2&&Math.abs(r[4].x-r[2].x)<2,'vertical P1/P3/P5');
    assert.ok(side?r[4].y<r[2].y&&r[2].y<r[0].y:r[0].y<r[2].y&&r[2].y<r[4].y,'mirrored vertical order');
    assert.ok(side?r[3].x<r[2].x&&r[2].x<r[1].x:r[1].x<r[2].x&&r[2].x<r[3].x,'mirrored P2/P4 wings');
  }
  await noCardOverlap();
  await withinViewport('.team-right .slot-card,.team-left .slot-card,.duel-actions,.main-nav');
  const enemy = await page.locator('.team-right').boundingBox(), ally = await page.locator('.team-left').boundingBox();
  assert.ok(enemy.y + enemy.height < ally.y, 'opponent above player');
  await page.locator('.team-left [data-action=reserves]').tap();
  await capture('reserves');
  assert.ok(await page.locator('[data-action=deploy-reserve]').count());
  const deploy = page.locator('[data-action=deploy-reserve]').first();
  const uid = await deploy.getAttribute('data-uid'), slot = Number(await deploy.getAttribute('data-slot'));
  await deploy.tap();
  assert.equal(await page.locator('.team-left .slot').nth(slot).getAttribute('data-unit'), uid);
  await page.locator('[data-action=start]').tap();
  const beforeSelection = await page.locator('.slot-card').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().toJSON()));
  for(const position of [1,2,3,4]){
    await page.locator('.team-left .slot-card').nth(position).tap();
    await page.locator('.team-right .slot-card').nth(position).tap();
    await settledFormation();
    await noCardOverlap();
    await withinViewport('.slot-card,.slot .inspect,.duel-actions');
  }
  await page.locator('.team-left .slot-card').first().tap();
  await page.locator('.team-right .slot-card').first().tap();
  await settledFormation();
  await capture('arena-selection');
  const auras=await page.locator('.element-aura').evaluateAll(nodes=>nodes.map(canvas=>{
    const {width,height,ratio,scale}=canvas._size;
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let visible=0,reach=0;
    for(let i=3;i<pixels.length;i+=4)if(pixels[i]>20){
      const pixel=(i-3)/4,x=(pixel%canvas.width)/ratio,y=Math.floor(pixel/canvas.width)/ratio;
      visible++;
      reach=Math.max(reach,Math.max(24-x,x-(width-24),24-y,y-(height-24),0)*scale);
    }
    const card=canvas.closest('.slot').querySelector('.slot-card');
    return {visible,reach,outline:parseFloat(getComputedStyle(card).outlineWidth)*scale};
  }));
  assert.ok(auras.length,'selected elemental cards retain their aura');
  for(const aura of auras){
    assert.ok(aura.visible>0,'aura canvas is nonblank');
    assert.ok(aura.reach<18,'magic stays close to the card instead of growing with zoom');
    assert.ok(aura.outline<=3,'challenger outline stays thin on screen');
  }
  const afterSelection = await page.locator('.slot-card').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().toJSON()));
  assert.ok(afterSelection[0].width>beforeSelection[0].width*1.5,'player challenger is substantially larger');
  assert.ok(afterSelection[5].width>beforeSelection[5].width*1.5,'opponent challenger is substantially larger');
  for(const side of [0,1]){
    const boxes=await page.locator(`.formation[data-player="${side}"] .slot`).evaluateAll(nodes=>nodes.map(n=>({selected:n.classList.contains('challenger'),...n.getBoundingClientRect().toJSON()})));
    const hero=boxes.find(n=>n.selected);
    assert.ok(boxes.filter(n=>!n.selected).every(n=>side?n.right<hero.left:n.left>hero.right),'hero and four allies occupy opposite sides');
  }
  await noCardOverlap();
  await withinViewport('.slot-card,.slot .inspect,.duel-actions');
  await page.locator('.team-left .challenger .inspect').tap();
  await page.waitForSelector('#detail-dialog[open]');
  await loaded();
  await capture('selected-card-detail');
  await page.locator('#detail-dialog [data-action=close]').tap();
  const dock = await page.locator('.duel-actions').boundingBox();
  assert.ok(dock.x>page.viewportSize().width*.6,'action sits in the lower-right corner');
  assert.ok(await page.locator('.dice-stage canvas').first().evaluate(canvas => {
    const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;
    const ctx=copy.getContext('2d');ctx.drawImage(canvas,0,0);
    return ctx.getImageData(0,0,copy.width,copy.height).data.some((v,i)=>i%4===3&&v>0);
  }), 'mobile dice canvas is nonblank');
  await page.locator('[data-action=lock]').tap();
  await page.locator('[data-action=roll]:enabled').tap();
  await page.waitForFunction(() => document.querySelector('.duel-console')?.dataset.phase !== 'attack', null, { timeout: 30000 });
  for (let i=0; i<20; i++) {
    const phase = await page.locator('.duel-console').getAttribute('data-phase');
    if (phase === 'result') break;
    if (phase === 'kalistel') await page.locator('[data-action="accept-attack"]').tap();
    else if (['guard','clover','heart','potion','physical'].includes(phase)) await page.locator('.trait-eligible .slot-card').first().tap();
    else if (await page.locator('[data-action=roll]:enabled').count()) await page.locator('[data-action=roll]:enabled').tap();
    await page.waitForTimeout(500);
  }
  await page.waitForSelector('[data-action=next]:enabled', { timeout: 30000 });
  await capture('arena-result');
  await page.locator('[data-action=arena-menu]').tap();
  await page.locator('#mobile-dialog [data-action=duel-details]').tap();
  await capture('duel-details');
  await page.locator('#mobile-dialog [data-action=close]').tap();
  assert.equal(await page.locator('.duel-console').getAttribute('data-phase'), 'result', 'result waits for explicit next turn');
  await page.locator('[data-action=arena-menu]').tap();
  await page.locator('#mobile-dialog [data-action=journal]').tap();
  assert.equal(await page.locator('#mobile-dialog').evaluate(d => d.open), false);
  assert.equal(await page.locator('#journal-dialog').evaluate(d => d.open), true);
  await page.locator('#journal-dialog [data-action=close]').tap();
  for (const [width,height] of [[360,740],[375,667],[430,932],[320,568]]) {
    await page.setViewportSize({width,height});
    await settledFormation();
    await capture('arena-' + width);
    assert.ok(await page.evaluate(() => document.querySelector('.battlefield-viewport').scrollWidth <= innerWidth), JSON.stringify(await page.evaluate(()=>({width:innerWidth,scroll:document.querySelector('.battlefield-viewport').scrollWidth,outside:[...document.querySelectorAll('.battlefield *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>({tag:n.className,right:n.getBoundingClientRect().right})).slice(0,12)}))));
    await noCardOverlap();
    if(height>=640)await withinViewport('.slot-card,.duel-actions');
    if(height<700){
      await page.locator('#app').evaluate(n=>{n.scrollTop=n.scrollHeight;});
      await capture('arena-' + width + '-player');
      await withinViewport('.team-left .slot-card,.team-left .inspect');
    }
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await settledFormation();
  await capture('arena-landscape');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('#app').evaluate(n=>{n.scrollTop=0;});
  await page.locator('[data-action=arena-menu]').tap();
  await page.locator('#mobile-dialog [data-view=decks]').tap();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('decks');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('.main-nav [data-view=collection]').tap();
  await page.locator('[data-binder-action=scope][data-id=owned]').tap();
  for (const [width, height] of [[390,844],[360,740],[430,932],[320,568]]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(() => document.querySelector('.cb-spread')?.dataset.singlePage === 'true');
    await loaded(); await capture('collection-' + width);
    assert.equal(await page.locator('.cb-sheet').count(), 1);
    await withinViewport('.cb-card,.cb-caption,.cb-footer,.main-nav');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  assert.deepEqual(failures, []);
  console.log('PASS: phone collection, mirrored crosses, corner controls, enlarged duel cards, reserve deployment, dice pixels, attack, explicit next turn, menu, portrait/landscape and decks.');
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
