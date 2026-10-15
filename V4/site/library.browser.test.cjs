'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.resolve(path.dirname(process.execPath),'../node_modules');
const {chromium} = createRequire(path.join(runtime,'__library_qa__.cjs'))('playwright');
const site = __dirname, fallback = path.resolve(site,'../../V3/site');
const output = process.env.KALISTAR_LIBRARY_QA || path.join(os.tmpdir(),'kalistar-library-qa');
const base = 'https://kalistar-library-qa.invalid/jeu/';
const shell = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="navigation.css"><link rel="stylesheet" href="ui-system.css"><link rel="stylesheet" href="library-view.css"></head><body class="kalistar-ui"><header class="masthead"><span>Kalistar</span></header><main id="library-root"></main><script src="assets/lucide.min.js"></script><script src="ui-system.js"></script><script src="dialog-history.js"></script><script src="rules-documents.js"></script><script src="library-view.js"></script><script>window.view=KalistarLibrary.create();view.mount(document.getElementById('library-root'));</script></body></html>`;

async function routeFiles(route) {
  const url = new URL(route.request().url());
  if (url.origin !== new URL(base).origin) return route.abort();
  const relative = decodeURIComponent(url.pathname.slice('/jeu/'.length));
  if (!relative) return route.fulfill({body:shell,contentType:'text/html'});
  for (const directory of [site,fallback]) {
    const file = path.resolve(directory,relative);
    if (!file.startsWith(directory + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    const types = {'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
    return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)] || 'application/octet-stream'});
  }
  return route.fulfill({status:404,body:relative});
}

async function closed(page) {
  await page.waitForFunction(() => !document.querySelector('.library-dialog').open && !document.querySelector('[aria-expanded="true"][data-library-open]'));
  await page.waitForFunction(() => !history.state?.kalistarDialogBack);
}

async function main() {
  fs.mkdirSync(output,{recursive:true});
  console.log('Library screenshots: ' + output);
  const browser = await chromium.launch({channel:'chrome',headless:true}), results = [];
  try {
    for (const [name,width,height,phone,reducedMotion] of [
      ['desktop',1440,900,false,'no-preference'],['wide',2048,1080,false,'reduce'],
      ['tablet',900,1000,false,'reduce'],['razr',412,1007,true,'no-preference'],
      ['compact',320,740,true,'reduce'],['landscape',844,390,true,'reduce']
    ]) {
      const context = await browser.newContext({viewport:{width,height},isMobile:phone,hasTouch:phone,reducedMotion});
      await context.route('**/*',routeFiles);
      const page = await context.newPage(), errors = [], missing = [];
      page.on('pageerror',error => errors.push(error.message));
      page.on('response',response => { if (response.status() >= 400) missing.push(response.url()); });
      await page.goto(base); await page.waitForFunction(() => window.view && document.querySelectorAll('[data-library-open]').length === 6);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.querySelectorAll('[data-lucide]')].every(node => node.tagName.toLowerCase() === 'svg'));
      const geometry = await page.evaluate(() => ({
        overflow:document.documentElement.scrollWidth > innerWidth,
        buttons:[...document.querySelectorAll('.library-preview')].map(node => {
          const rect = node.getBoundingClientRect();
          return {width:rect.width,height:rect.height,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight};
        })
      }));
      assert(!geometry.overflow,name + ' horizontal viewport overflow');
      for (const button of geometry.buttons) {
        assert(button.scrollWidth <= button.clientWidth + 1,name + ' preview text width');
        assert(button.scrollHeight <= button.clientHeight + 1,name + ' preview text height');
        if (!phone) assert(Math.abs(button.width / button.height - 2/3) < .01,'preview artwork ratio');
      }
      await page.screenshot({path:path.join(output,name + '-shelves.png')});
      const first = page.locator('[data-library-open="regles"]');
      await first.focus(); await page.keyboard.press('End');
      assert.equal(await page.locator(':focus').getAttribute('data-library-open'),'performance');
      await page.keyboard.press('Home'); await page.keyboard.press('Enter');
      if (phone) {
        await page.waitForSelector('[data-library-entry="regles"] .library-inline:not([hidden])');
        assert.equal(await page.locator('dialog').evaluate(node => node.open),false);
      } else {
        await page.waitForFunction(() => document.querySelector('.library-dialog').open);
        assert.equal(await page.locator(':focus').evaluate(node => node.tagName),'H2');
        const rect = await page.locator('.library-dialog').boundingBox();
        assert(rect.height > height * .9); assert(rect.width > width * .7);
        for (let i = 0; i < 15; i++) {
          await page.keyboard.press('Tab');
          assert(await page.evaluate(() => document.activeElement === document.body || Boolean(document.activeElement.closest('.library-dialog'))),'native modal does not focus a background control');
        }
      }
      if (reducedMotion === 'reduce') assert.equal(await page.locator('.library-unfurl').evaluate(node => getComputedStyle(node).animationName),'none');
      else await page.waitForFunction(() => !document.querySelector('.library-unfurl').getAnimations().some(animation => animation.playState === 'running'));
      assert((await page.locator('.library-prose').innerText()).includes('Jouer à Kalistar'));
      assert((await page.locator('.library-prose').innerText()).includes('réservistes incompatibles'));
      assert.equal(await page.locator('.library-prose a,.library-source').count(),0,'No technical links or source footer');
      await page.screenshot({path:path.join(output,name + '-open.png')});
      await page.goBack(); await closed(page);
      assert.equal(await page.locator(':focus').getAttribute('data-library-open'),'regles');
      await page.goForward(); await closed(page);
      assert.equal(await page.locator('.library-prose').count(),0,'Forward never resurrects the manuscript');
      if (phone) {
        await first.click();
        await page.locator('.library-inline:not([hidden]) .library-chapter-picker').selectOption({label:'Remplacements et victoire'});
        await page.goBack(); await closed(page);
        const visible = await first.evaluate(node => {
          const button = node.getBoundingClientRect(), shelves = node.closest('.library-shelves').getBoundingClientRect();
          return button.top >= shelves.top - 1 && button.bottom <= shelves.bottom + 1;
        });
        assert(visible,'Back restores a visible trigger after reading the end of a long manuscript');
      } else if (name === 'desktop') {
        await first.click(); await page.mouse.click(3,3); await closed(page);
      }

      await first.click();
      if (phone) {
        await page.locator('[data-library-open="reliques"]').click();
        assert.equal(await page.locator('.library-inline:not([hidden])').count(),1);
        assert.equal(await first.getAttribute('aria-expanded'),'false');
        const picker = page.locator('.library-inline:not([hidden]) .library-chapter-picker');
        await picker.selectOption({label:'Momo : la Boîte des Petits Bonheurs'});
        assert.equal(await page.locator(':focus').getAttribute('id'),'library-reliques-momo-la-boite-des-petits-bonheurs');
        await page.keyboard.press('Escape'); await closed(page);
        assert.equal(await page.locator(':focus').getAttribute('data-library-open'),'reliques');
      } else {
        await page.keyboard.press('Escape'); await closed(page);
        await page.locator('[data-library-open="reliques"]').click();
        const chapter = page.locator('[data-library-heading="library-reliques-momo-la-boite-des-petits-bonheurs"]');
        if (await chapter.isVisible()) await chapter.click();
        else await page.locator('.library-dialog .library-chapter-picker').selectOption({label:'Momo : la Boîte des Petits Bonheurs'});
        assert.equal(await page.locator(':focus').getAttribute('id'),'library-reliques-momo-la-boite-des-petits-bonheurs');
        await page.keyboard.press('Escape'); await closed(page);
        assert.equal(await page.locator(':focus').getAttribute('data-library-open'),'reliques');
      }

      await page.locator('[data-library-open="initiative"]').click();
      await page.locator('[data-library-close]').click(); await closed(page);
      for (const id of ['regles','composition','initiative','equipements','reliques','performance']) {
        await page.locator(`[data-library-open="${id}"]`).click();
        const prose = await page.locator('.library-prose').innerText();
        assert(!/\.test\.cjs|SHA-?256|IndexedDB|\bUID\b|\bRNG\b|snapshot|Implementation actuelle|guide de reprise/i.test(prose),id+' player vocabulary');
        assert.equal(await page.locator('.library-prose a,.library-prose code,.library-source').count(),0,id+' no developer references');
        await page.locator('[data-library-close]').click(); await closed(page);
      }
      await page.locator('[data-library-open="performance"]').click();
      if (name === 'desktop' || name === 'razr') {
        await page.setViewportSize({width:phone ? 1440 : 412,height:phone ? 900 : 1007});
        await page.waitForFunction(expected => document.querySelector('.library-dialog').open === expected,phone);
        assert.equal(await page.locator('[data-library-open][aria-expanded="true"]').count(),1);
        await page.setViewportSize({width,height});
        await page.waitForFunction(expected => document.querySelector('.library-dialog').open === expected,!phone);
        await page.goBack(); await closed(page);
      } else { await page.keyboard.press('Escape'); await closed(page); }

      await page.locator('[data-library-open="regles"]').click();
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
      assert.equal(await page.locator('dialog').evaluate(node => node.open),false);
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
      await page.locator('[data-library-open="composition"]').click();
      assert.equal(await page.locator('[data-library-open="composition"]').getAttribute('aria-expanded'),'true');
      await page.evaluate(() => { view.destroy(); view.destroy(); });
      await closed(page);
      await page.locator('[data-library-open="initiative"]').click();
      assert.equal(await page.locator('[data-library-open="initiative"]').getAttribute('aria-expanded'),'false','destroy removes handlers');
      await page.evaluate(() => view.mount(document.getElementById('library-root')));
      await page.locator('[data-library-open="initiative"]').click();
      assert.equal(await page.locator('[data-library-open="initiative"]').getAttribute('aria-expanded'),'true','remount does not duplicate handlers');
      await page.keyboard.press('Escape'); await closed(page);
      assert.deepEqual(errors,[],name + ' JS errors'); assert.deepEqual(missing,[],name + ' missing resources');
      results.push({name,geometry,errors,missing}); await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({passed:results.map(result => result.name),screenshots:output},null,2));
}
main().catch(error => {console.error(error);process.exitCode = 1;});
