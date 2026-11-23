'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { buildCatalog } = require('../atelier/game-catalog.cjs');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = createRequire(path.join(runtime, '__v4_browser__.cjs'))('playwright');
const ROOT = path.resolve(__dirname, '../..');
const references = require('../atelier/data/references.json');
const approvedCount = references.cards.length;
const persistedPublications = require('../donnees/catalogue.json').cards.filter(card => card.kind === 'created');
const initialCount = approvedCount + persistedPublications.length;
const url = process.env.KALISTAR_URL || 'http://127.0.0.1:43874';
const live = !!process.env.KALISTAR_URL;
const output = process.env.KALISTAR_VERIFICATION_DIR || path.join(ROOT, 'work/qa/collection-fixed-browser');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const checks = [], errors = [], badResponses = [];
let browser;
async function main() {
  fs.mkdirSync(output, { recursive: true });
  let catalog = await buildCatalog({ published: persistedPublications }), overrideCatalog = false;
  browser = await chromium.launch({ channel: process.env.KALISTAR_BROWSER || 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  if (!live) await context.route(url + '/**', async route => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname);
    if (p === '/api/game/catalogue') return route.fulfill({ json: catalog });
    if (p === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Atelier embedded fixture</title><h1>Atelier</h1><input id="draft" aria-label="Draft">' });
    let file;
    if (p.startsWith('/media/reference/')) {
      const ref = references.cards.find(c => p === '/media/reference/' + c.key + '.png');
      if (ref) file = path.join(ROOT, ref.png);
    } else if (/^\/media\/created\/4\d{7}\.(png|psd)$/.test(p)) {
      const [, id, extension] = p.match(/^\/media\/created\/(4\d{7})\.(png|psd)$/);
      const publication = persistedPublications.find(card => card.id === id);
      if (publication) file = path.join(ROOT, extension === 'png' ? publication.png : publication.psd);
    } else if (p.startsWith('/jeu/shared/')) file = path.join(ROOT, 'V3/assets', p.slice('/jeu/shared/'.length));
    else if (p.startsWith('/jeu/')) {
      file = path.join(__dirname, p.slice('/jeu/'.length) || 'index.html');
      if (!fs.existsSync(file) && p.startsWith('/jeu/assets/')) file = path.join(ROOT, 'V3/site', p.slice('/jeu/'.length));
    }
    if (!file || !fs.existsSync(file)) return route.fulfill({ status: 404, body: p });
    return route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });
  if (live) await context.route(url + '/api/game/catalogue', route => overrideCatalog ? route.fulfill({ json: catalog }) : route.continue());
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) badResponses.push(response.url() + ': ' + response.status()); });
  async function fixedGallery(){
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const layout=await page.locator('.cb-spread').evaluate(n=>{
      const rect=n=>n.getBoundingClientRect(),within=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
      const separate=(a,b)=>a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1;
      const r=rect(n),leaves=[...n.querySelectorAll(':scope > .cb-gallery-leaf')],cards=[...n.querySelectorAll('.cb-pocket')],work=n.closest('.cb-workbench'),viewport={left:0,top:0,right:innerWidth,bottom:innerHeight};
      const single=getComputedStyle(n.closest('.cb-album')).getPropertyValue('--cb-single-leaf').trim()==='1';
      const grids=leaves.map(leaf=>({side:leaf.dataset.leaf,count:leaf.querySelectorAll(':scope > .cb-pocket').length,columns:getComputedStyle(single?n:leaf).gridTemplateColumns.split(' ').length,rows:getComputedStyle(single?n:leaf).gridTemplateRows.split(' ').length}));
      return {grids,single,columns:grids[0]?.columns,rows:grids[0]?.rows,capacity:12,count:cards.length,filled:cards.filter(c=>c.dataset.cardId).length,empty:cards.filter(c=>c.classList.contains('is-empty')).length,
        balanced:leaves.length===2&&(single||Math.abs(rect(leaves[0]).width-rect(leaves[1]).width)<1&&Math.abs((rect(leaves[0]).left+rect(leaves[1]).right)/2-(r.left+r.right)/2)<2),
        contained:within(r,rect(work))&&within(rect(work),viewport)&&leaves.every(leaf=>single||within(rect(leaf),r))&&cards.every(c=>{
          const box=rect(c),slot=c.querySelector('.cb-slot'),face=c.querySelector('.cb-card'),caption=c.querySelector('.cb-caption');
          return !!slot&&within(box,rect(single?n:c.parentElement))&&within(box,viewport)&&within(rect(slot),box)&&rect(slot).height>0&&(!face||caption&&within(rect(face),rect(slot))&&caption.querySelector('h2').textContent===KALISTAR_DATA.cards.find(model=>model.id===c.dataset.cardId).name&&rect(face).height>0&&Math.abs(rect(face).width/rect(face).height-797/1388)<.01);
        }),overflow:document.documentElement.scrollWidth-innerWidth,
        scroll:[document.documentElement,document.body,document.querySelector('#app'),work,n.closest('.cb-album')].map(c=>({node:c.id||c.className||c.tagName,overflow:c.scrollHeight-c.clientHeight,top:c.scrollTop}))};
    });
    assert.deepEqual(layout.grids.map(leaf=>leaf.side),['left','right']);
    assert(layout.grids.every(leaf=>leaf.count===6&&leaf.columns*leaf.rows===(layout.single?12:6)),JSON.stringify(layout));
    assert.equal(layout.capacity,12);assert.equal(layout.count,12);assert.equal(layout.filled+layout.empty,12);
    assert(layout.contained&&layout.balanced&&layout.overflow<=1,JSON.stringify(layout));
    assert(layout.scroll.every(c=>c.overflow<=1&&c.top===0),'fixed gallery/document: '+JSON.stringify(layout.scroll));
    return layout;
  }
  async function fixedReader(){
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const layout=await page.locator('.cb-reader').evaluate(album=>{
      const rect=n=>n.getBoundingClientRect(),within=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
      const leaves=[...album.querySelectorAll('.cb-spread > .cb-leaf')],visual=album.querySelector('.cb-visual'),reading=album.querySelector('.cb-reading'),window=album.querySelector('.cb-read-window'),content=album.querySelector('.cb-read-content'),work=album.closest('.cb-workbench');
      return {sides:leaves.map(n=>n.dataset.leaf),leftRight:rect(visual).right<rect(reading).left,
        contained:[...leaves,visual.querySelector('.cb-hero-image')].every(n=>within(rect(n),rect(album)))&&within(rect(window),rect(reading)),
        clipped:getComputedStyle(window).overflow==='hidden',page:album.querySelector('[data-reading-page]').textContent,
        scroll:[document.documentElement,document.body,document.querySelector('#app'),work,album,window].map(n=>({node:n.className||n.id||n.tagName,overflow:n.scrollHeight-n.clientHeight,top:n.scrollTop,left:n.scrollLeft})),
        nativeScroll:getComputedStyle(work).overflowY};
    });
    assert.deepEqual(layout.sides,['left','right']);assert(layout.leftRight&&layout.contained&&layout.clipped,JSON.stringify(layout));
    assert.equal(layout.nativeScroll,'clip');assert(layout.scroll.every(n=>n.overflow<=1&&n.top===0&&n.left===0),JSON.stringify(layout.scroll));
    assert.match(layout.page,/^[1-9]\d* \/ [1-9]\d*$/);
    const [current,total]=layout.page.split('/').map(Number);assert(current<=total);
    assert.equal(await page.locator('[data-binder-action=read-previous]').isDisabled(),current===1);
    return layout;
  }
  await page.addInitScript(() => { if (!localStorage.getItem('kalistar.v3.sentinel')) localStorage.setItem('kalistar.v3.sentinel', 'preserved'); });
  await page.goto(url + '/jeu/#collection');
  await page.locator('[data-startup-enter]:enabled').click();
  await page.waitForFunction(() => window.KALISTAR_READY === true);
  assert.equal(await page.title(), fs.readFileSync(path.join(__dirname,'index.html'),'utf8').match(/<title>(.*?)<\/title>/)[1]);
  assert.deepEqual(await page.evaluate(() => [KALISTAR_DATA.cards.length, KALISTAR_DB.name, KALISTAR_DB.registry.owned('user-paris').length, KALISTAR_DB.registry.owned('user-tokyo').length]), [initialCount, 'kalistar-v4-cards', initialCount, 0]);
  assert.deepEqual(await page.evaluate(() => KALISTAR_DATA.cards.map(c => c.id).sort()), catalog.cards.map(c => c.id).sort());
  checks.push('HTTP boot: approved catalogue, independent IndexedDB and explicit reading gate');
  await page.waitForFunction(() => [...document.querySelectorAll('.cb-card img')].filter(img => {const r=img.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}).every(img => img.complete && img.naturalWidth > 0 && !img.src.includes('#v4-')));
  const ff7Count=catalog.cards.filter(c=>c.faction==='FF7').length;
  await page.locator('.cb-toolbar [data-binder-filter=collection]').selectOption('final-fantasy');
  await page.locator('[data-binder-action=filters]').click();
  await page.locator('.cb-overlay[open] [data-binder-filter=faction]').selectOption('FF7');
  await page.locator('.cb-overlay[open] [data-binder-action=close-overlay]').first().click();
  assert.ok((await page.locator('.cb-filter-actions [data-binder-action=close-overlay]').textContent()).includes('Voir '+ff7Count+' cartes'));
  assert.ok(await page.locator('.cb-pocket[data-card-id]').evaluateAll((nodes,ids)=>nodes.length>0&&nodes.every(node=>ids.includes(node.dataset.cardId)),catalog.cards.filter(c=>c.faction==='FF7').map(c=>c.id)));
  await page.locator('.cb-toolbar [data-binder-action=reset]').click();
  await fixedGallery();
  const collectionLabel=page.locator('.cb-page-label');
  const collectionPages=Math.ceil(catalog.cards.length/12);
  assert.equal((await collectionLabel.textContent()).trim(),'01 / '+collectionPages);
  assert.equal(await page.locator('.cb-sheet,.cb-page-edge,.cb-turn-leaf').count(),0);
  assert.equal(await page.locator('.cb-spread').evaluate(n=>getComputedStyle(n).display),'grid');
  assert(await page.locator('.cb-slot').first().evaluate(n=>getComputedStyle(n,'::after').backgroundImage.includes('linear-gradient')&&!getComputedStyle(n,'::after').backgroundImage.includes('url(')),'sleeve sheen has no white bitmap frame');
  await page.locator('[data-binder-action=next-page]').click();
  assert.equal((await collectionLabel.textContent()).trim(),'02 / '+collectionPages);
  assert.equal(await page.locator('.cb-pocket').first().evaluate(n=>getComputedStyle(n).animationName),'none');
  await page.locator('[data-binder-action=previous-page]').click();
  assert.equal((await collectionLabel.textContent()).trim(),'01 / '+collectionPages);
  let dragCard=await page.locator('.cb-card').first().boundingBox();
  await page.mouse.move(dragCard.x+dragCard.width/2,dragCard.y+dragCard.height/2);
  await page.mouse.down();await page.mouse.move(dragCard.x+dragCard.width/2-130,dragCard.y+dragCard.height/2,{steps:6});await page.mouse.up();
  await page.waitForFunction(pages=>document.querySelector('.cb-page-label')?.textContent.includes('02 / '+pages),collectionPages);
  assert.equal(await page.locator('.cb-reader').count(),0,'dragging must not open a card');
  await page.waitForTimeout(350);
  await page.locator('[data-binder-action=previous-page]').click();
  await page.locator('.cb-card').first().click();
  await page.locator('.cb-reader').waitFor();
  assert.equal(await page.locator('.cb-card-heading h2').textContent(),'MOMO');
  assert.equal(await page.locator('.cb-search').count(),0);
  assert.equal(await page.locator('.cb-workbench').evaluate(n=>getComputedStyle(n).backgroundImage),'none');
  await fixedReader();
  await page.screenshot({path:path.join(output,'desktop-collection-reader.png')});
  await page.locator('[data-binder-action=back]').click();
  await page.screenshot({path:path.join(output,'desktop-collection.png')});
  checks.push('gallery, grouped universe filters, page controls, drag and reduced motion');
  await page.setViewportSize({width:2560,height:1375});
  const wide=await fixedGallery();assert.equal(wide.rows,2);assert.equal(wide.count,wide.capacity);
  await page.screenshot({path:path.join(output,'wide-collection.png')});
  const widePages=Math.ceil(catalog.cards.length/wide.capacity);
  await page.locator('[data-binder-action=pages]').click();
  await page.locator('[data-binder-action=jump-page][data-id="'+(widePages-1)+'"]').click();
  assert.equal(await page.locator('.cb-card').count(),catalog.cards.length-wide.capacity*(widePages-1));
  assert.equal(await page.locator('.cb-pocket.is-empty').count(),12-(catalog.cards.length-wide.capacity*(widePages-1)));
  await fixedGallery();
  assert.equal(await page.locator('[data-binder-action=next-page]').isDisabled(),true);
  await page.locator('[data-binder-action=pages]').click();
  await page.locator('[data-binder-action=jump-page][data-id="0"]').click();
  await page.locator('.cb-card').first().click();
  assert.ok(await page.evaluate(()=>{
    const card=document.querySelector('.cb-visual').getBoundingClientRect(),text=document.querySelector('.cb-reading').getBoundingClientRect(),content=document.querySelector('.cb-read-content').getBoundingClientRect();
    return card.right<text.left&&content.right<=text.right+1&&content.left>=text.left-1;
  }),'card and narrative have separate readable columns');
  await page.screenshot({path:path.join(output,'wide-collection-reader.png')});
  await page.locator('[data-binder-action=back]').click();
  await page.setViewportSize({width:2560,height:800});
  const short=await fixedGallery();assert.equal(short.rows,2);assert.equal(short.capacity,wide.capacity,'height never changes the twelve album slots');
  assert.equal((await collectionLabel.textContent()).trim(),'01 / '+collectionPages);
  await page.screenshot({path:path.join(output,'short-collection.png')});
  checks.push('two album leaves hold twelve fixed slots including empty final slots, preserve artwork ratio and never scroll');
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-view=decks]').click();
  await page.waitForSelector('#deck-builder-root');
  await page.screenshot({ path: path.join(output, 'desktop-decks.png') });
  await page.locator('[data-deck-action=captain][data-slot="0"]').click();
  await page.locator('#deck-builder-root .kdb-play').click();
  await page.locator('#game-mode').selectOption('local');
  await page.locator('#new-game-dialog [type=submit]').click();
  await page.locator('.li-skip').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v4.game'))?.phase === 'choose');
  assert.equal(await page.locator('[data-action=start]').count(),0,'composed teams start without a setup screen');
  const savedGame = await page.evaluate(() => localStorage.getItem('kalistar.v4.game'));
  await page.screenshot({ path: path.join(output, 'desktop-arena.png') });
  const canvas = await page.locator('.dice-stage canvas').count();
  assert.ok(canvas >= 2, 'elemental crystal canvases mounted');
  const dicePixels = async () => page.evaluate(() => [...document.querySelectorAll('.dice-stage canvas')].map(source => {
    const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(source, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonblank = 0, hash = 0;
    for (let i = 0; i < pixels.length; i += 4) { if (pixels[i + 3]) nonblank++; hash = (Math.imul(hash, 31) + pixels[i] + pixels[i + 1] + pixels[i + 2]) >>> 0; }
    return { nonblank, hash };
  }));
  const initialDice = await dicePixels(); assert.ok(initialDice.every(c => c.nonblank > 100));
  await page.evaluate(() => { window.testDiceAnimation = KalistarDice.play(0, 1, false); });
  await page.waitForFunction(() => document.querySelector('.dice-stage[data-player="0"]').classList.contains('is-awakening'));
  await page.evaluate(async () => { await window.testDiceAnimation; await KalistarDice.play(0, 6, true); });
  checks.push('elemental crystals have nonblank pixels and reveal rolls on interaction');
  await page.locator('[data-action=exit-arena]').click();
  await page.locator('[data-view=atelier]').first().click();
  const frame = page.frameLocator('#atelier-frame');
  await frame.locator('body').waitFor();
  await frame.locator('body').evaluate(el => { el.dataset.testDraft = 'persistent'; });
  const panel = await page.locator('#atelier-panel').boundingBox();
  assert.ok(panel.width >= 1438 && panel.height > 600);
  await page.screenshot({ path: path.join(output, 'desktop-atelier.png') });
  await page.locator('[data-view=arena]').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('kalistar.v4.game')), savedGame);
  await page.locator('[data-action=exit-arena]').click();
  await page.locator('[data-view=atelier]').first().click();
  assert.equal(await frame.locator('body').getAttribute('data-test-draft'), 'persistent');
  checks.push('Atelier tab is full-width, persistent, and leaves active game unchanged');
  const item = { id: '40000099', profile: { ...references.cards[4].card, name: 'TEST PUBLICATION', description: 'Publication de test.' }, pngUrl: '/media/reference/rikka.png', psdUrl: '/exports/test/card.psd' };
  catalog = await buildCatalog({ published: [...persistedPublications, item] }); overrideCatalog = true;
  await frame.locator('body').evaluate((el, id) => window.parent.postMessage({ type: 'kalistar:card-published', id }, location.origin), item.id);
  await page.locator('#catalogue-refresh').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => KALISTAR_DATA.cards.length), initialCount, 'engine not swapped during match');
  await page.locator('#catalogue-refresh').click();
  await page.locator('[data-startup-enter]:enabled').click();
  await page.waitForFunction(count => window.KALISTAR_READY && KALISTAR_DATA.cards.length === count, initialCount + 1);
  assert.equal(await page.evaluate(() => localStorage.getItem('kalistar.v4.game')), savedGame);
  assert.deepEqual(await page.evaluate(() => [KALISTAR_DB.registry.owned('user-paris').length, KALISTAR_DB.registry.owned('user-tokyo').length, localStorage.getItem('kalistar.v3.sentinel')]), [initialCount + 1, 0, 'preserved']);
  await page.reload();await page.locator('[data-startup-enter]:enabled').click();await page.waitForFunction(() => window.KALISTAR_READY);
  assert.equal(await page.evaluate(() => KALISTAR_DB.registry.owned('user-paris').length), initialCount + 1);
  checks.push('publication + reload preserves active match and V3 preferences, seeds once');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(()=>location.hash='collection');
  await page.locator('.cb-spread').waitFor();
  const mobile=await fixedGallery();assert.equal(mobile.columns,3);assert.equal(mobile.rows,4);assert.equal(mobile.capacity,wide.capacity,'portrait keeps twelve slots in one fitted folio');
  await page.screenshot({ path: path.join(output, 'mobile-collection.png') });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile collection has no page overflow');
  await page.locator('.cb-card').first().click();
  await page.locator('.cb-reader').waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(output, 'mobile-collection-reader.png') });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile reader has no page overflow');
  await fixedReader();
  await page.locator('[data-binder-action=back]').click();
  await page.evaluate(()=>location.hash='atelier');
  await frame.locator('body').waitFor();
  await page.screenshot({ path: path.join(output, 'mobile-atelier.png') });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile atelier has no page overflow');
  await page.evaluate(()=>location.hash='arena');
  await page.screenshot({ path: path.join(output, 'mobile-arena.png') });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile arena has no page overflow');
  assert.ok((await dicePixels()).every(c => c.nonblank > 100), 'mobile elemental crystals are nonblank');
  const broken = await page.evaluate(() => [...document.images].filter(img => img.complete && img.naturalWidth === 0).map(img => img.src));
  assert.deepEqual(broken, []); assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
  checks.push('desktop/mobile images, scripts, layout and elemental crystals have no failures');
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify({ passed: true, mode: live ? 'live-parent-server' : 'isolated-http-route-fixture', url, checks, errors, badResponses }, null, 2));
  for (const check of checks) console.log('PASS ' + check);
  await context.close();
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
