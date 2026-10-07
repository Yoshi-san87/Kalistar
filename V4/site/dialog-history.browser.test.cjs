'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {createRequire} = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium} = createRequire(path.join(runtime, '__dialog_back__.cjs'))('playwright');
const base = process.env.KALISTAR_URL || 'http://127.0.0.1:4304';
const output = process.env.KALISTAR_VERIFICATION_DIR || path.join(__dirname, 'verification/dialog-back');
const checks = [], errors = [];
let browser,currentPage;
async function back(page, selector) {
  await page.evaluate(() => history.back());
  await page.waitForFunction(selector => !document.querySelector(selector)?.open, selector);
}
async function settled(page) {
  await page.waitForFunction(() => !document.querySelector('dialog[open]') && !history.state?.kalistarDialogBack);
}
async function fixture() {
  const context = await browser.newContext(), page = await context.newPage();
  context.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  await context.route('http://127.0.0.1:43199/**', route => route.fulfill({contentType:'text/html',body:
    '<!doctype html><title>Back fixture</title><button id="open">Open</button><dialog id="one"><button id="nested">Nested</button><button id="close">Close</button></dialog><dialog id="two">Second</dialog>'}));
  await page.goto('http://127.0.0.1:43199/before');
  await page.goto('http://127.0.0.1:43199/game#decks');
  await page.addScriptTag({path:path.join(__dirname, 'dialog-history.js')});
  await page.evaluate(() => {
    window.token = crypto.randomUUID(); window.pops = 0;
    window.addEventListener('popstate', () => pops++);
    document.querySelector('#open').onclick = () => KalistarDialogHistory.open(document.querySelector('#one'));
    document.querySelector('#nested').onclick = () => KalistarDialogHistory.open(document.querySelector('#two'));
    document.querySelector('#close').onclick = () => document.querySelector('#one').close();
    history.replaceState({preserved:42}, '', location.href);
  });
  const token = await page.evaluate(() => token), initial = await page.evaluate(() => history.length);
  await page.click('#open'); await back(page, '#one'); await settled(page);
  assert.equal(await page.evaluate(() => token), token);
  assert.equal(await page.evaluate(() => history.state.preserved), 42);
  assert.equal(new URL(page.url()).hash, '#decks');
  checks.push('Back closes the popup without reload, hash change or losing unrelated history state');
  for (let i = 0; i < 5; i++) { await page.click('#open'); await page.click('#close'); await settled(page); }
  assert.equal(await page.evaluate(() => history.length), initial + 1);
  await page.click('#open'); await page.keyboard.press('Escape'); await settled(page);
  checks.push('Repeated X/Escape closures clean up the history guard');
  await page.click('#open'); await page.click('#nested'); await back(page, '#two');
  assert(await page.locator('#one').evaluate(n => n.open));
  await back(page, '#one'); await settled(page);
  checks.push('Two nested popups close in visual order, one per Back');
  await page.click('#open'); await page.click('#nested');
  await page.evaluate(() => KalistarDialogHistory.replace('#story'));
  await back(page,'#two'); assert.equal(new URL(page.url()).hash,'#story');
  await back(page,'#one'); await settled(page); assert.equal(new URL(page.url()).hash,'#story');
  checks.push('Changing views underneath nested popups never rolls the route back');
  await page.click('#open');
  for (let i = 0; i < 6; i++) await page.evaluate(() => {
    const old = document.querySelector('#one'), replacement = old.cloneNode(true);
    replacement.removeAttribute('open'); old.replaceWith(replacement); KalistarDialogHistory.open(replacement);
  });
  await back(page, '#one'); await settled(page);
  assert.equal(await page.evaluate(() => history.length), initial + 1);
  checks.push('DOM replacement/resize reuses the logical popup, with no duplicate history steps');
  await page.click('#open');
  await page.evaluate(() => { one.addEventListener('cancel', e => e.preventDefault(), {once:true}); history.back(); });
  await page.waitForFunction(() => one.open && history.state?.kalistarDialogBack);
  await back(page, '#one'); await settled(page);
  checks.push('Cancelable dismissal respects a busy operation, then allows Back after completion');
  await page.click('#open');
  await page.evaluate(() => { one.requestClose = undefined; });
  await back(page, '#one'); await settled(page);
  checks.push('Older browsers without requestClose use the same cancel/close contract');
  await page.click('#open');
  await page.evaluate(() => { one.close(); KalistarDialogHistory.refresh(); KalistarDialogHistory.open(two); });
  await page.waitForFunction(() => two.open && history.state?.kalistarDialogBack);
  await back(page, '#two'); await settled(page);
  checks.push('Closing and immediately opening another popup during history traversal remains safe');
  await page.click('#open');
  await page.evaluate(() => { one.close(); KalistarDialogHistory.refresh(); KalistarDialogHistory.replace('#weapons'); });
  await settled(page); assert.equal(new URL(page.url()).hash, '#weapons');
  await page.evaluate(() => history.forward());
  await page.waitForFunction(() => !history.state?.kalistarDialogBack);
  assert.equal(await page.locator('dialog[open]').count(), 0);
  checks.push('Menu navigation keeps the new view; Forward never resurrects a stale popup');
  await page.evaluate(() => history.back());
  await page.waitForURL('**/game#weapons');
  await page.goBack(); await page.waitForURL('**/before');
  checks.push('With no popup, real Back still leaves the game normally');
  await context.close();
}
async function realSite() {
  for (const [name,width,height] of [['desktop',1440,1000],['razr50',412,1007],['compact',360,800]]) {
    const context = await browser.newContext({viewport:{width,height},isMobile:name!=='desktop',hasTouch:name!=='desktop',reducedMotion:'reduce',serviceWorkers:'block'});
    context.setDefaultTimeout(15000);
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    currentPage=page;
    page.on('dialog', dialog => dialog.accept());
    await page.addInitScript(() => {
      const open = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function(name, version) { return open.call(this, name + '-dialog-back-qa-only', version); };
      window.backTestDocument = crypto.randomUUID();
    });
    await page.goto(base + '/jeu/#collection'); await page.waitForFunction(() => window.KALISTAR_READY);
    const token = await page.evaluate(() => backTestDocument);
    await page.locator('[data-binder-action=filters]').click();
    const filter = page.locator('.cb-overlay[open]'); await filter.waitFor();
    await filter.locator('[data-binder-filter=weapon]').selectOption('Instrument');
    await page.setViewportSize({width:width+4,height});
    await page.waitForFunction(() => !!document.querySelector('.cb-overlay[open]'));
    await page.screenshot({path:path.join(output,name+'-filters.png')});
    await back(page, '.cb-overlay'); await settled(page);
    await page.setViewportSize({width,height});
    assert.equal(await page.locator('.cb-overlay[open]').count(), 0);
    assert(await page.locator('.cb-pocket').count()>0);
    assert(await page.locator('.cb-pocket').evaluateAll(nodes=>nodes.every(n=>KALISTAR_DATA.cards.find(c=>c.id===n.dataset.cardId)?.weapon==='Instrument')));
    await page.locator('[data-binder-action=filters]').click();
    await page.locator('.cb-overlay[open] [data-binder-action=reset]').click();
    await back(page, '.cb-overlay'); await settled(page);
    await page.locator('[data-binder-action=pages]').click(); await back(page, '.cb-overlay'); await settled(page);
    checks.push(name+': filters, repaint, resize and page index close cleanly and keep the selected filters');
    await page.locator('.main-nav [data-view=weapons]').click();
    await page.locator('[data-weapon]').first().click(); await page.waitForFunction(() => document.querySelector('#weapons-dialog').open);
    await page.screenshot({path:path.join(output,name+'-equipment.png')});
    const card = page.locator('#weapons-dialog [data-weapon-action=card]').first();
    await card.click(); await back(page, '#detail-dialog');
    assert(await page.locator('#weapons-dialog').evaluate(n => n.open));
    await back(page, '#weapons-dialog'); await settled(page);
    checks.push(name+': equipment + character detail keep the underlying popup after the first Back');
    await page.locator('.main-nav [data-view=decks]').click();
    await page.locator('[data-deck-action=captain][data-slot="0"]').click();
    console.log(name+': '+await page.locator('.kdb-validation').innerText());
    if(name!=='desktop') {
      await page.locator('[data-deck-action=manage]').first().click();
      await page.locator('.team-management [data-deck-action=name]').fill('Retour sans perte');
      await page.screenshot({path:path.join(output,name+'-team-management.png')});
      await back(page,'.team-management'); await settled(page);
      assert.match(await page.locator('.team-current-name').innerText(), /Retour sans perte/);
      await page.locator('[data-deck-action=manage]').first().click();
      assert.equal(await page.locator('.team-management [data-deck-action=name]').inputValue(),'Retour sans perte');
      await back(page,'.team-management'); await settled(page);
      checks.push(name+': team management closes with Back without losing an unsaved team name');
    }
    await page.locator('.kdb-slot [data-deck-action=detail]').first().click(); await back(page,'#detail-dialog'); await settled(page);
    await page.locator('.main-nav [data-view=arena]').click();
    await page.waitForFunction(() => !!document.querySelector('.battlefield'));
    if(await page.locator('.li-skip').isVisible())await page.locator('.li-skip').click();
    if(name!=='desktop')await page.locator('[data-action=arena-menu]').click();
    await page.locator(name==='desktop'?'.arena-toolbar [data-action=new-game]':'#mobile-dialog [data-action=new-game]').click();
    await page.waitForFunction(() => document.querySelector('#new-game-dialog').open);
    await back(page,'#new-game-dialog'); await settled(page);
    if(name!=='desktop')await page.locator('[data-action=arena-menu]').click();
    await page.locator(name==='desktop'?'.arena-toolbar [data-action=new-game]':'#mobile-dialog [data-action=new-game]').click();
    await page.locator('#game-mode').selectOption('local');
    await page.locator('#new-game-form [type=submit]').click(); await settled(page);
    await page.waitForFunction(() => !!document.querySelector('.battlefield'));
    if(await page.locator('.li-skip').isVisible())await page.locator('.li-skip').click();
    const saved = await page.evaluate(() => localStorage.getItem('kalistar.v4.game'));
    assert(saved);
    await page.locator('.slot .inspect').first().click(); await back(page,'#detail-dialog'); await settled(page);
    assert.equal(await page.evaluate(() => localStorage.getItem('kalistar.v4.game')),saved);
    if(name!=='desktop') {
      await page.locator('[data-action=arena-menu]').click(); await page.screenshot({path:path.join(output,name+'-arena-menu.png')});
      await back(page,'#mobile-dialog'); await settled(page);
    } else {
      await page.locator('.arena-toolbar [data-action=combat-reference]').first().click(); await back(page,'#combat-reference-dialog'); await settled(page);
    }
    assert.equal(await page.evaluate(() => backTestDocument),token);
    checks.push(name+': deck preview, match preparation and arena popups retain the same document and saved match');
    await page.locator('.slot .inspect').first().click();
    await page.reload(); await page.waitForFunction(() => window.KALISTAR_READY); await settled(page);
    assert.equal(await page.evaluate(() => localStorage.getItem('kalistar.v4.game')),saved);
    checks.push(name+': reload consumes the stale popup history entry without losing the match');
    if(name!=='desktop') {
      await page.locator('[data-action=arena-menu]').click();
      await page.locator('#mobile-dialog [data-view=collection]').click(); await settled(page);
    }
    const storyNavigation=page.locator('.main-nav [data-view=story]');
    if(await storyNavigation.isVisible())await storyNavigation.click();
    else{await page.locator('[data-action=nav-more]').click();await page.locator('#mobile-dialog [data-view=story]').click();}
    await page.locator('[data-story-action=open-book]').click();
    const illustrated = await page.evaluate(async()=>{
      const content=await(await fetch(KalistarSite.url('story-content.json'))).json();
      return content.sections.findIndex(section=>section.illustrations?.length);
    });
    if(name==='desktop')await page.locator(`[data-story-section="${illustrated}"]`).click();
    else await page.locator('[data-story-select]').selectOption(String(illustrated));
    await page.locator('[data-story-preview]').first().click();
    await back(page,'[data-story-dialog]'); await settled(page);
    assert.equal(await page.locator('.story-reader').count(),1);
    checks.push(name+': Story card preview closes without closing the book or changing the chapter');
    await context.close();
  }
}
async function main() {
  fs.mkdirSync(output,{recursive:true}); browser = await chromium.launch({channel:'chrome',headless:true});
  await fixture(); await realSite(); assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');
  console.log(JSON.stringify({checks:checks.length,details:checks,output},null,2));
}
main().catch(async error => {
  console.error(error);
  if(currentPage&&!currentPage.isClosed()){
    console.error(await currentPage.evaluate(()=>({url:location.href,classes:document.body.className,history:history.state,dialogs:[...document.querySelectorAll('dialog[open]')].map(n=>n.id||n.className),app:document.querySelector('#app')?.innerText.slice(0,800)})));
    await currentPage.screenshot({path:path.join(output,'failure.png')});
  }
  process.exitCode=1;
}).finally(async () => { await browser?.close(); });
